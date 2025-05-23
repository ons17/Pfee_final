<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Chart from 'primevue/chart';
import Dropdown from 'primevue/dropdown';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { useQuery } from '@vue/apollo-composable';
import { GET_EMPLOYEES, SUIVIS_DE_TEMP } from '@/graphql/index.js';

// State
const radarData = ref(null);
const radarOptions = ref(null);
const barData = ref(null);
const barOptions = ref(null);
const projectBarData = ref(null);
const projectBarOptions = ref(null);
const loading = ref(true);
const selectedRole = ref('all');
const selectedPeriod = ref('month');
const selectedProject = ref('all');
const aiInsights = ref([]);
const currentDate = ref(new Date());
const selectedEmployees = ref([]);

// Apollo queries
const { result: employeesResult, loading: employeesLoading, error: employeesError } = useQuery(GET_EMPLOYEES);
const { result: timeEntriesResult, loading: timeEntriesLoading, error: timeEntriesError } = useQuery(SUIVIS_DE_TEMP, {
  filters: {}
});

const employeeData = computed(() => employeesResult.value?.employees?.employees || []);
const timeTrackingData = computed(() => timeEntriesResult.value?.suivisDeTemp || []);

// Dropdowns
const availableRoles = computed(() => {
  const roles = ['all', ...new Set(employeeData.value.map(emp => emp.role))];
  return roles.map(role => ({
    label: role === 'all' ? 'All Roles' : role,
    value: role
  }));
});
const availableProjects = computed(() => {
  const projects = ['all', ...new Set(timeTrackingData.value.map(e => e.tache?.projet?.nom_projet || 'N/A'))];
  return projects.map(project => ({
    label: project === 'all' ? 'All Projects' : project,
    value: project
  }));
});
const availablePeriods = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' }
];

// Date range for period
const periodRange = computed(() => {
  const date = currentDate.value;
  if (selectedPeriod.value === 'week') {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 })
    };
  }
  if (selectedPeriod.value === 'month') {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  if (selectedPeriod.value === 'year') {
    return { start: startOfYear(date), end: endOfYear(date) };
  }
  return { start: date, end: date };
});

// Filtered employees and entries
const filteredEmployees = computed(() =>
  employeeData.value.filter(emp => selectedRole.value === 'all' || emp.role === selectedRole.value)
);
const filteredTimeEntries = computed(() =>
  timeTrackingData.value.filter(e =>
    (selectedRole.value === 'all' || e.employee.role === selectedRole.value) &&
    (selectedProject.value === 'all' || (e.tache?.projet?.nom_projet || 'N/A') === selectedProject.value) &&
    isWithinInterval(new Date(e.heure_debut_suivi), { start: periodRange.value.start, end: periodRange.value.end })
  )
);

// Productivity metrics
const productivityByEmployee = computed(() => {
  const map = {};
  filteredEmployees.value.forEach(emp => {
    map[emp.idEmployee] = {
      id: emp.idEmployee,
      name: emp.nomEmployee,
      totalHours: 0,
      entries: 0,
      daysWorked: new Set()
    };
  });
  filteredTimeEntries.value.forEach(e => {
    if (map[e.employee.idEmployee]) {
      map[e.employee.idEmployee].totalHours += e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0;
      map[e.employee.idEmployee].entries += 1;
      map[e.employee.idEmployee].daysWorked.add(format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd'));
    }
  });
  return Object.values(map);
});
const productivityByProject = computed(() => {
  const map = {};
  filteredTimeEntries.value.forEach(e => {
    const project = e.tache?.projet?.nom_projet || 'N/A';
    if (!map[project]) map[project] = 0;
    map[project] += e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0;
  });
  return Object.entries(map).map(([name, hours]) => ({ name, hours }));
});

// Top/under performer
const topPerformer = computed(() =>
  productivityByEmployee.value.reduce((max, emp) => emp.totalHours > (max?.totalHours || 0) ? emp : max, null)
);
const underPerformer = computed(() =>
  productivityByEmployee.value.reduce((min, emp) => emp.totalHours < (min?.totalHours || Infinity) ? emp : min, null)
);
const averageProductivity = computed(() => {
  if (!productivityByEmployee.value.length) return 0;
  return (
    productivityByEmployee.value.reduce((sum, emp) => sum + emp.totalHours, 0) /
    productivityByEmployee.value.length
  ).toFixed(2);
});

// Utilization calculation
const targetHours = computed(() => {
  if (selectedPeriod.value === 'week') return 40;
  if (selectedPeriod.value === 'month') return 160;
  if (selectedPeriod.value === 'year') return 1920;
  return 8;
});

// Radar chart metrics (all calculated)
const radarMetrics = [
  {
    label: 'Time Management',
    calc: emp => emp.entries > 0 ? Math.min(100, Math.round((emp.totalHours / emp.entries) * 12)) : 0
  },
  {
    label: 'Presence',
    calc: emp => emp.daysWorked ? Math.min(100, Math.round((emp.daysWorked.size / 22) * 100)) : 0
  },
  {
    label: 'Volume',
    calc: emp => Math.min(100, Math.round((emp.totalHours / targetHours.value) * 100))
  },
  {
    label: 'Regularity',
    calc: emp => emp.daysWorked ? Math.round((emp.daysWorked.size / (periodRange.value.end.getDate() - periodRange.value.start.getDate() + 1)) * 100) : 0
  },
  {
    label: 'Tasks',
    calc: emp => Math.min(100, emp.entries * 10)
  },
  {
    label: 'Project Diversity',
    calc: emp => {
      // Count number of unique projects this employee worked on in the period
      const projects = new Set();
      filteredTimeEntries.value.forEach(e => {
        if (e.employee.idEmployee === emp.id && e.tache?.projet?.nom_projet) {
          projects.add(e.tache.projet.nom_projet);
        }
      });
      // Normalize: if max is 5 projects, 5 = 100
      return Math.min(100, projects.size * 20);
    }
  },
  {
    label: 'Productivity',
    calc: emp => Math.min(100, Math.round((emp.totalHours / targetHours.value) * 100))
  }
];

// AI Insights (all calculated, no static)
const generateAIInsights = () => {
  // Productivity trend
  const currentTotal = productivityByEmployee.value.reduce((sum, emp) => sum + emp.totalHours, 0);
  // Previous period
  const prevStart = new Date(periodRange.value.start);
  const prevEnd = new Date(periodRange.value.end);
  if (selectedPeriod.value === 'week') {
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd.setDate(prevEnd.getDate() - 7);
  } else if (selectedPeriod.value === 'month') {
    prevStart.setMonth(prevStart.getMonth() - 1);
    prevEnd.setMonth(prevEnd.getMonth() - 1);
  } else if (selectedPeriod.value === 'year') {
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    prevEnd.setFullYear(prevEnd.getFullYear() - 1);
  }
  const prevEntries = timeTrackingData.value.filter(e =>
    isWithinInterval(new Date(e.heure_debut_suivi), { start: prevStart, end: prevEnd })
  );
  const prevTotal = prevEntries.reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0);
  const trend = prevTotal > 0 ? (((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1) : 'N/A';

  aiInsights.value = [
    {
      type: 'trend',
      message: trend !== 'N/A'
        ? `Productivity changed by ${trend}% compared to previous period.`
        : 'Not enough data for trend analysis.'
    },
    {
      type: 'suggestion',
      message: averageProductivity.value < 6
        ? 'Consider investigating low average productivity.'
        : 'Average productivity is healthy.'
    },
    {
      type: 'anomaly',
      message: detectAnomaly()
    }
  ];
};

// Simple anomaly detection
function detectAnomaly() {
  const dailyTotals = {};
  filteredTimeEntries.value.forEach(e => {
    const day = format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd');
    dailyTotals[day] = (dailyTotals[day] || 0) + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0);
  });
  const values = Object.values(dailyTotals);
  if (!values.length) return 'No activity data available.';
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  if (max > avg * 2) {
    const anomalyDay = Object.keys(dailyTotals).find(day => dailyTotals[day] === max);
    return `Unusual activity spike detected on ${anomalyDay}.`;
  }
  return 'No anomalies detected.';
}

// Chart initialization
const initializeCharts = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

  // Radar Chart
  radarData.value = {
    labels: radarMetrics.map(m => m.label),
    datasets: productivityByEmployee.value.map((employee, index) => ({
      label: employee.name,
      borderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
      pointBackgroundColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
      pointBorderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
      pointHoverBackgroundColor: textColor,
      pointHoverBorderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
      data: radarMetrics.map(m => m.calc(employee))
    }))
  };
  radarOptions.value = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: 20,
          font: { size: 13, weight: 600 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.r}/100`
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: { stepSize: 20, color: textColorSecondary, font: { size: 12 } },
        grid: { color: surfaceBorder },
        pointLabels: { color: textColor, font: { size: 14, weight: '500' } }
      }
    },
    maintainAspectRatio: false
  };

  // Productivity by Employee
  const employeeLabels = productivityByEmployee.value.map(emp => emp.name);
  const employeeDataArr = productivityByEmployee.value.map(emp => Number(emp.totalHours.toFixed(2)));
  barData.value = {
    labels: employeeLabels,
    datasets: [
      {
        label: 'Worked Hours',
        backgroundColor: documentStyle.getPropertyValue('--p-primary-500'),
        data: employeeDataArr
      }
    ]
  };
  barOptions.value = {
    plugins: {
      legend: { labels: { color: textColor } },
      title: { display: true, text: 'Productivity by Employee', color: textColor }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
      x: { ticks: { color: textColorSecondary } }
    }
  };

  // Hours by Project
  const projectLabels = productivityByProject.value.map(p => p.name);
  const projectDataArr = productivityByProject.value.map(p => Number(p.hours.toFixed(2)));
  projectBarData.value = {
    labels: projectLabels,
    datasets: [
      {
        label: 'Hours by Project',
        backgroundColor: documentStyle.getPropertyValue('--p-teal-500'),
        data: projectDataArr
      }
    ]
  };
  projectBarOptions.value = {
    plugins: {
      legend: { labels: { color: textColor } },
      title: { display: true, text: 'Hours by Project', color: textColor }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: textColorSecondary } },
      x: { ticks: { color: textColorSecondary } }
    }
  };
};

// Export CSV
const exportTableToCSV = () => {
  const headers = ['Employee', 'Project', 'Start', 'End', 'Duration (h)', 'Description'];
  const rows = filteredTimeEntries.value.map(e => [
    e.employee?.nomEmployee || 'N/A',
    e.tache?.projet?.nom_projet || 'N/A',
    e.heure_debut_suivi ? format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd HH:mm') : '',
    e.heure_fin_suivi ? format(new Date(e.heure_fin_suivi), 'yyyy-MM-dd HH:mm') : '',
    e.duree_suivi ? (Number(e.duree_suivi) / 3600).toFixed(2) : '0',
    e.description || ''
  ]);
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'performance_report.csv';
  link.click();
};

// Computed: Employees for comparison
const comparisonEmployees = computed(() =>
  productivityByEmployee.value.filter(emp =>
    (selectedEmployees.value ?? []).includes(emp.id)
  )
);

// Computed: Radar data for comparison
const comparisonRadarData = computed(() => ({
  labels: radarMetrics.map(m => m.label),
  datasets: comparisonEmployees.value.map((employee, index) => ({
    label: employee.name,
    borderColor: `hsl(${142 + (index * 60)}, 70%, 50%)`,
    backgroundColor: `hsla(${142 + (index * 60)}, 70%, 50%, 0.2)`,
    pointBackgroundColor: `hsl(${142 + (index * 60)}, 70%, 50%)`,
    data: radarMetrics.map(m => m.calc(employee))
  }))
})); // <-- Only one closing parenthesis and curly brace here

const employeeComparisonOptions = computed(() =>
  productivityByEmployee.value.map(emp => ({
    label: emp.name,
    value: emp.id // use id everywhere
  }))
);

const productivityTrend = computed(() => {
  // Group by day in the current period
  const trend = {};
  filteredTimeEntries.value.forEach(e => {
    const day = format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd');
    trend[day] = (trend[day] || 0) + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0);
  });
  // Fill missing days with 0
  const days = [];
  let d = new Date(periodRange.value.start);
  while (d <= periodRange.value.end) {
    const key = format(d, 'yyyy-MM-dd');
    days.push(key);
    if (!(key in trend)) trend[key] = 0;
    d.setDate(d.getDate() + 1);
  }
  // Sort days
  days.sort();
  return {
    labels: days,
    data: days.map(day => trend[day])
  };
});

// Watchers
watch([selectedRole, selectedPeriod, selectedProject, currentDate, employeesResult, timeEntriesResult], () => {
  initializeCharts();
  generateAIInsights();
});

watch(
  [selectedRole, selectedProject, selectedPeriod, selectedEmployees],
  ([role, project, period, employees]) => {
    localStorage.setItem('perf_selectedRole', role);
    localStorage.setItem('perf_selectedProject', project);
    localStorage.setItem('perf_selectedPeriod', period);
    localStorage.setItem('perf_selectedEmployees', JSON.stringify(employees));
  },
  { deep: true }
);

// Navigation for period
const navigatePeriod = (direction) => {
  const date = new Date(currentDate.value);
  if (selectedPeriod.value === 'week') {
    date.setDate(date.getDate() + direction * 7);
  } else if (selectedPeriod.value === 'month') {
    date.setMonth(date.getMonth() + direction);
  } else if (selectedPeriod.value === 'year') {
    date.setFullYear(date.getFullYear() + direction);
  }
  currentDate.value = date;
};

onMounted(() => {
  // Restore filters
  const savedRole = localStorage.getItem('perf_selectedRole');
  const savedProject = localStorage.getItem('perf_selectedProject');
  const savedPeriod = localStorage.getItem('perf_selectedPeriod');
  const savedEmployees = localStorage.getItem('perf_selectedEmployees');
  if (savedRole) selectedRole.value = savedRole;
  if (savedProject) selectedProject.value = savedProject;
  if (savedPeriod) selectedPeriod.value = savedPeriod;
  if (savedEmployees) selectedEmployees.value = JSON.parse(savedEmployees);

  loading.value = true;
  initializeCharts();
  generateAIInsights();
  loading.value = false;
});
</script>

<template>
  <div class="performance-dashboard">
    <div v-if="loading || employeesLoading || timeEntriesLoading" class="flex justify-center items-center p-8">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <span class="ml-3 font-medium">Loading data...</span>
    </div>
    <div v-else>
      <h2 class="text-2xl font-bold mb-4 mt-8 border-b pb-2">Summary</h2>
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <template #content>
            <div class="summary-card">
              <div class="summary-label">Top Performer</div>
              <div class="summary-value">{{ topPerformer?.name || '—' }}</div>
              <Tag severity="success" v-if="topPerformer"> {{ topPerformer.totalHours.toFixed(2) }} h </Tag>
            </div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="summary-card">
              <div class="summary-label">Lowest Performer</div>
              <div class="summary-value">{{ underPerformer?.name || '—' }}</div>
              <Tag severity="danger" v-if="underPerformer"> {{ underPerformer.totalHours.toFixed(2) }} h </Tag>
            </div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="summary-card">
              <div class="summary-label">Average Productivity</div>
              <div class="summary-value">{{ averageProductivity }} h</div>
            </div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="summary-card">
              <div class="summary-label">Global Trend</div>
              <div class="summary-value flex items-center justify-center">
                <template v-if="aiInsights.length && aiInsights[0].type === 'trend' && aiInsights[0].message.includes('%')">
                  <i
                    :class="{
                      'pi pi-arrow-up text-green-500': parseFloat(aiInsights[0].message.match(/-?\d+(\.\d+)?/)[0]) > 0,
                      'pi pi-arrow-down text-red-500': parseFloat(aiInsights[0].message.match(/-?\d+(\.\d+)?/)[0]) < 0
                    }"
                    style="font-size: 1.5rem"
                  ></i>
                  <span class="ml-2">
                    {{
                      aiInsights[0].message.match(/-?\d+(\.\d+)?%/)
                        ? aiInsights[0].message.match(/-?\d+(\.\d+)?%/)[0]
                        : aiInsights[0].message
                    }}
                  </span>
                </template>
                <template v-else>
                  <span>{{ aiInsights[0]?.message || 'No data' }}</span>
                </template>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <h2 class="text-2xl font-bold mb-4 mt-8 border-b pb-2">Filters</h2>
      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <Dropdown
          v-model="selectedRole"
          :options="availableRoles"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by role"
          class="w-56"
        />
        <Dropdown
          v-model="selectedProject"
          :options="availableProjects"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by project"
          class="w-56"
        />
        <Dropdown
          v-model="selectedPeriod"
          :options="availablePeriods"
          optionLabel="label"
          optionValue="value"
          placeholder="Period"
          class="w-56"
        />
        <Button label="Export CSV" icon="pi pi-file" class="p-button-success" @click="exportTableToCSV" />
        <Button icon="pi pi-chevron-left" class="p-button-text" @click="navigatePeriod(-1)" />
        <span class="font-medium">{{ format(periodRange.start, 'dd/MM/yyyy') }} - {{ format(periodRange.end, 'dd/MM/yyyy') }}</span>
        <Button icon="pi pi-chevron-right" class="p-button-text" @click="navigatePeriod(1)" />
      </div>

      <!-- AI Insights -->
      <div class="mb-8">
        <Card>
          <template #content>
            <div class="ai-insights">
              <div class="font-semibold mb-2">AI Insights</div>
              <ul>
                <li v-for="(insight, idx) in aiInsights" :key="idx">
                  <Tag :severity="insight.type === 'trend' ? 'info' : insight.type === 'suggestion' ? 'success' : 'warning'">
                    {{ insight.type.toUpperCase() }}
                  </Tag>
                  <span class="ml-2">{{ insight.message }}</span>
                </li>
              </ul>
            </div>
          </template>
        </Card>
      </div>

      <!-- Improved Chart Layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <!-- Radar Chart -->
        

        <!-- Productivity by Employee -->
        <Card>
          <template #content>
            <div class="font-semibold text-xl mb-4">Productivity by Employee</div>
            <Chart v-if="barData.labels.length" type="bar" :data="barData" :options="barOptions" style="height: 400px;" />
            <div v-else class="text-center text-gray-400 py-8">No employee data available.</div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="font-semibold text-xl mb-4">Hours by Project</div>
            <Chart v-if="projectBarData.labels.length" type="bar" :data="projectBarData" :options="projectBarOptions" style="height: 400px;" />
            <div v-else class="text-center text-gray-400 py-8">No project data available.</div>
          </template>
        </Card>
      </div>

      <Card class="mb-8">
        <template #content>
          <div class="font-semibold text-xl mb-4">Productivity Trend</div>
          <Chart
            type="line"
            :data="{
              labels: productivityTrend.labels,
              datasets: [{
                label: 'Total Hours',
                data: productivityTrend.data,
                fill: false,
                borderColor: '#3b82f6',
                tension: 0.3
              }]
            }"
            :options="{
              plugins: {
                legend: { display: true },
                title: { display: false }
              },
              scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Hours' }, beginAtZero: true }
              },
              responsive: true,
              maintainAspectRatio: false
            }"
            style="min-height: 320px; height: 320px;"
          />
        </template>
      </Card>

      <!-- Employee Comparison Section -->
      <div class="mb-8">
        <Card>
          <template #content>
            <div class="font-semibold text-xl mb-4">Compare Employees</div>
            <MultiSelect
              v-model="selectedEmployees"
              :options="employeeComparisonOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select employees"
              class="w-96 mb-4"
              display="chip"
            />
            <div v-if="comparisonEmployees.length >= 2">
              <Chart type="radar" :data="comparisonRadarData" :options="radarOptions" style="height: 400px;" />
              <table class="min-w-full mt-6 border text-sm">
                <thead>
                  <tr>
                    <th class="border px-2 py-1">Metric</th>
                    <th v-for="emp in comparisonEmployees" :key="emp.id" class="border px-2 py-1">{{ emp.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="metric in radarMetrics" :key="metric.label">
                    <td class="border px-2 py-1">{{ metric.label }}</td>
                    <td v-for="emp in comparisonEmployees" :key="emp.id" class="border px-2 py-1">
                      {{ metric.calc(emp) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-gray-400 py-4">Select at least two employees to compare.</div>
          </template>
        </Card>
      </div>
      <div v-if="productivityByEmployee.length">
        <!-- Comparison Card here -->
      </div>
      <!-- Employee Leaderboard Section -->
      <div class="mb-12">
        <Card>
          <template #content>
            <h2 class="text-2xl font-bold mb-4 border-b pb-2">Employee Leaderboard</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full border text-sm rounded-lg overflow-hidden shadow bg-white">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="border px-2 py-1">Rank</th>
                    <th class="border px-2 py-1">Employee</th>
                    <th class="border px-2 py-1">Total Hours</th>
                    <th class="border px-2 py-1">Projects</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(emp, idx) in productivityByEmployee.slice().sort((a, b) => b.totalHours - a.totalHours)"
                    :key="emp.id"
                    :class="{
                      'bg-yellow-100': idx === 0,
                      'bg-gray-100': idx === 1,
                      'bg-orange-100': idx === 2
                    }"
                  >
                    <td class="border px-2 py-1 font-bold text-center">
                      <span v-if="idx === 0" class="text-yellow-600">🥇</span>
                      <span v-else-if="idx === 1" class="text-gray-500">🥈</span>
                      <span v-else-if="idx === 2" class="text-orange-500">🥉</span>
                      <span v-else>{{ idx + 1 }}</span>
                    </td>
                    <td class="border px-2 py-1 flex items-center gap-2">
                      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-200 text-blue-800 font-bold">
                        {{ emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) }}
                      </span>
                      {{ emp.name }}
                    </td>
                    <td class="border px-2 py-1 text-center">{{ emp.totalHours.toFixed(2) }}</td>
                    <td class="border px-2 py-1 text-center">
                      {{ [...new Set(filteredTimeEntries.filter(e => e.employee.idEmployee === emp.id).map(e => e.tache?.projet?.nom_projet))].length }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance-dashboard {
  padding: 2rem;
}
.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.summary-label {
  font-size: 1rem;
  color: #64748b;
}
.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}
.ai-insights ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ai-insights li {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
</style>