<script setup>
import { ref, onMounted, computed, watchEffect } from 'vue';
import { format } from 'date-fns';
import Chart from 'primevue/chart';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { useQuery } from '@vue/apollo-composable';
import { GET_EMPLOYEES, SUIVIS_DE_TEMP } from '@/graphql/index.js';

// State
const selectedRole = ref('all');
const selectedEmployee = ref('all');
const selectedPeriod = ref('week');
const currentDate = ref(new Date());

// Apollo queries
const { result: employeesResult, loading: employeesLoading } = useQuery(GET_EMPLOYEES);
const { result: timeEntriesResult, loading: timeEntriesLoading, refetch: refetchTimeEntries } = useQuery(SUIVIS_DE_TEMP, {
  filters: {}
});

// Data
const employeeData = computed(() => employeesResult.value?.employees?.employees || []);
const timeTrackingData = computed(() => timeEntriesResult.value?.suivisDeTemp || []);

// Filters
const availableRoles = computed(() => [
  { label: 'All Roles', value: 'all' },
  ...[...new Set(employeeData.value.map(emp => emp.role))].map(role => ({ label: role, value: role }))
]);
const availableEmployees = computed(() => [
  { label: 'All Employees', value: 'all' },
  ...employeeData.value.map(emp => ({ label: emp.nomEmployee, value: emp.idEmployee }))
]);
const availablePeriods = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' }
];

// Date range calculation
const periodRange = computed(() => {
  const date = new Date(currentDate.value);
  if (selectedPeriod.value === 'week') {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  if (selectedPeriod.value === 'month') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
  }
  if (selectedPeriod.value === 'year') {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    return { start, end };
  }
  return { start: date, end: date };
});

// Filtered data
const filteredEmployees = computed(() =>
  selectedRole.value === 'all'
    ? employeeData.value
    : employeeData.value.filter(emp => emp.role === selectedRole.value)
);
const filteredTimeEntries = computed(() =>
  timeTrackingData.value.filter(e => {
    const entryDate = new Date(e.heure_debut_suivi);
    return (
      entryDate >= periodRange.value.start &&
      entryDate <= periodRange.value.end &&
      (selectedEmployee.value === 'all' || e.employee.idEmployee === selectedEmployee.value)
    );
  })
);

// KPI Cards
const totalEmployees = computed(() => employeeData.value.length);
const totalActive = computed(() => employeeData.value.filter(e => !e.disabledUntil).length);
const totalInactive = computed(() => employeeData.value.filter(e => e.disabledUntil).length);
const totalTrackedHours = computed(() =>
  filteredTimeEntries.value.reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0).toFixed(1)
);

// Pie: Role Distribution
const rolePieData = computed(() => {
  const roles = [...new Set(employeeData.value.map(emp => emp.role))];
  const total = employeeData.value.length;
  return {
    labels: roles,
    datasets: [{
      data: roles.map(role => employeeData.value.filter(emp => emp.role === role).length),
      backgroundColor: ['#6366f1', '#10b981', '#f59e42', '#f43f5e', '#3b82f6', '#a21caf']
    }]
  };
});

// Bar: Employee Status by Role
const statusBarData = computed(() => {
  const roles = [...new Set(employeeData.value.map(emp => emp.role))];
  return {
    labels: roles,
    datasets: [
      {
        label: 'Active',
        backgroundColor: '#10b981',
        data: roles.map(role => employeeData.value.filter(emp => emp.role === role && !emp.disabledUntil).length)
      },
      {
        label: 'Inactive',
        backgroundColor: '#f43f5e',
        data: roles.map(role => employeeData.value.filter(emp => emp.role === role && emp.disabledUntil).length)
      }
    ]
  };
});

// Line: Team Hours Trend
const lineLabels = computed(() => {
  const days = [];
  let d = new Date(periodRange.value.start);
  while (d <= periodRange.value.end) {
    days.push(format(new Date(d), 'dd/MM'));
    d.setDate(d.getDate() + 1);
  }
  return days;
});
const lineData = computed(() => {
  const days = [];
  let d = new Date(periodRange.value.start);
  while (d <= periodRange.value.end) {
    days.push(format(new Date(d), 'yyyy-MM-dd'));
    d.setDate(d.getDate() + 1);
  }
  return {
    labels: lineLabels.value,
    datasets: [{
      label: 'Total Hours',
      data: days.map(day =>
        filteredTimeEntries.value
          .filter(e => format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === day)
          .reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0)
      ),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.3,
      fill: true
    }]
  };
});

// Add these computed properties
const taskAnalysis = computed(() => {
  // Get all unique task types from backend time entries
  const taskTypes = new Set(
    filteredTimeEntries.value
      .filter(e => e.tache?.type)
      .map(e => e.tache.type)
  );

  // Calculate hours per task type per project
  const projectTaskData = {};
  filteredTimeEntries.value.forEach(entry => {
    const project = entry.tache?.projet?.nom_projet || 'Unassigned';
    const taskType = entry.tache?.type || 'Other';
    const hours = entry.duree_suivi ? Number(entry.duree_suivi) / 3600 : 0;

    if (!projectTaskData[project]) {
      projectTaskData[project] = {
        totalHours: 0,
        taskTypes: {}
      };
    }

    projectTaskData[project].totalHours += hours;
    projectTaskData[project].taskTypes[taskType] =
      (projectTaskData[project].taskTypes[taskType] || 0) + hours;
  });

  return {
    taskTypes: Array.from(taskTypes),
    projectData: projectTaskData
  };
});

const taskDistributionData = computed(() => ({
  labels: taskAnalysis.value.taskTypes,
  datasets: Object.entries(taskAnalysis.value.projectData)
    .map(([project, data], index) => ({
      label: project,
      data: taskAnalysis.value.taskTypes.map(type =>
        data.taskTypes[type] || 0
      ),
      backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.7)`
    }))
}));

const projectWorkloadPie = computed(() => {
  const projects = {};
  filteredTimeEntries.value.forEach(e => {
    const project = e.tache?.projet?.nom_projet || 'Unassigned';
    projects[project] = (projects[project] || 0) + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0);
  });
  const labels = Object.keys(projects);
  const data = Object.values(projects);
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: labels.map((_, i) => `hsla(${i * 60}, 70%, 50%, 0.7)`)
    }]
  };
});

const employeeUtilizationData = computed(() => {
  // Assume 40h/week, 160h/month, 1920h/year as expected hours
  const expected = {
    week: 40,
    month: 160,
    year: 1920
  };
  const period = selectedPeriod.value;
  const employees = filteredEmployees.value;
  return {
    labels: employees.map(e => e.nomEmployee),
    datasets: [
      {
        label: 'Actual Hours',
        backgroundColor: '#6366f1',
        data: employees.map(emp => 
          filteredTimeEntries.value
            .filter(e => e.employee.idEmployee === emp.idEmployee)
            .reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0)
        )
      },
      {
        label: 'Expected Hours',
        backgroundColor: '#f59e42',
        data: employees.map(() => expected[period] || 40)
      }
    ]
  };
});

const projectTaskCompletion = computed(() => {
  const projects = {};
  filteredTimeEntries.value.forEach(e => {
    const project = e.tache?.projet?.nom_projet || 'Unassigned';
    if (!projects[project]) projects[project] = { completed: 0, total: 0 };
    // If you have statutTache on tache, use it:
    if (e.tache?.statutTache === 'COMPLETED') projects[project].completed += 1;
    projects[project].total += 1;
  });
  return Object.entries(projects).map(([project, data]) => ({
    project,
    completed: data.completed,
    total: data.total,
    percent: data.total ? ((data.completed / data.total) * 100).toFixed(1) : '0'
  }));
});

const topProjectsData = computed(() => {
  // Aggregate total hours per project
  const projectMap = {};
  filteredTimeEntries.value.forEach(e => {
    const project = e.tache?.projet?.nom_projet || 'Unassigned';
    projectMap[project] = (projectMap[project] || 0) + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0);
  });
  // Sort and take top 5
  const sorted = Object.entries(projectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return {
    labels: sorted.map(([name]) => name),
    datasets: [{
      label: 'Total Hours',
      data: sorted.map(([, hours]) => hours),
      backgroundColor: sorted.map((_, i) => `hsla(${i * 60}, 70%, 50%, 0.7)`)
    }]
  };
});

const absenceOvertimeReport = computed(() => {
  // Get all days in the period
  const days = [];
  let d = new Date(periodRange.value.start);
  while (d <= periodRange.value.end) {
    days.push(format(new Date(d), 'yyyy-MM-dd'));
    d.setDate(d.getDate() + 1);
  }
  return filteredEmployees.value.map(emp => {
    let absenceDays = 0;
    let overtimeDays = 0;
    days.forEach(day => {
      const entries = filteredTimeEntries.value.filter(e =>
        e.employee.idEmployee === emp.idEmployee &&
        format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === day
      );
      const totalHours = entries.reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0);
      if (totalHours === 0) absenceDays++;
      if (totalHours > 8) overtimeDays++;
    });
    return { name: emp.nomEmployee, absenceDays, overtimeDays };
  });
});

const aiInsights = computed(() => {
  const insights = [];
  // Example: Detect sudden drop in tracked hours
  const hours = lineData.value.datasets[0]?.data || [];
  if (hours.length > 2) {
    const last = hours[hours.length - 1];
    const prev = hours[hours.length - 2];
    if (prev > 0 && last < prev * 0.5) {
      insights.push('⚠️ Sudden drop in team tracked hours detected.');
    }
  }
  // Example: High overtime
  const highOvertime = absenceOvertimeReport.value.filter(e => e.overtimeDays > 2);
  if (highOvertime.length) {
    insights.push(`⚠️ ${highOvertime.length} employee(s) have frequent overtime this period.`);
  }
  // Example: No data
  if (totalTrackedHours.value == 0) {
    insights.push('No tracked hours for the selected period.');
  }
  return insights;
});

watchEffect(() => {
  console.log('Task Distribution Data:', taskDistributionData.value);
});

// Table: Raw Time Entries
const timeEntryColumns = [
  { field: 'employee', header: 'Employee' },
  { field: 'project', header: 'Project' },
  { field: 'start', header: 'Start' },
  { field: 'end', header: 'End' },
  { field: 'duration', header: 'Duration (h)' },
  { field: 'description', header: 'Description' }
];
const timeEntryRows = computed(() =>
  filteredTimeEntries.value.map(e => ({
    employee: e.employee?.nomEmployee || 'N/A',
    project: e.tache?.projet?.nom_projet || 'N/A',
    start: e.heure_debut_suivi ? format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd HH:mm') : '',
    end: e.heure_fin_suivi ? format(new Date(e.heure_fin_suivi), 'yyyy-MM-dd HH:mm') : '',
    duration: e.duree_suivi ? (Number(e.duree_suivi) / 3600).toFixed(2) : '0',
    description: e.description || ''
  }))
);

// Export CSV
const exportTableToCSV = () => {
  const headers = timeEntryColumns.map(col => col.header);
  const rows = timeEntryRows.value.map(row => timeEntryColumns.map(col => row[col.field]));
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'report_time_entries.csv';
  link.click();
};

// Navigation
const navigatePeriod = (direction) => {
  const date = new Date(currentDate.value);
  if (selectedPeriod.value === 'week') date.setDate(date.getDate() + direction * 7);
  else if (selectedPeriod.value === 'month') date.setMonth(date.getMonth() + direction);
  else if (selectedPeriod.value === 'year') date.setFullYear(date.getFullYear() + direction);
  currentDate.value = date;
};

// Load filters from localStorage on mount
onMounted(() => {
  const savedRole = localStorage.getItem('reports_selectedRole');
  const savedEmployee = localStorage.getItem('reports_selectedEmployee');
  const savedPeriod = localStorage.getItem('reports_selectedPeriod');
  if (savedRole) selectedRole.value = savedRole;
  if (savedEmployee) selectedEmployee.value = savedEmployee;
  if (savedPeriod) selectedPeriod.value = savedPeriod;
});

// Watch and save filters to localStorage
watchEffect(() => {
  localStorage.setItem('reports_selectedRole', selectedRole.value);
  localStorage.setItem('reports_selectedEmployee', selectedEmployee.value);
  localStorage.setItem('reports_selectedPeriod', selectedPeriod.value);
});
</script>

<template>
  <div class="reports-dashboard">
    <div v-if="employeesLoading || timeEntriesLoading" class="flex justify-center items-center p-8">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <span class="ml-3 font-medium">Loading data...</span>
    </div>
    <div v-else>
      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-8">
        <Dropdown v-model="selectedRole" :options="availableRoles" optionLabel="label" optionValue="value" placeholder="Filter by role" class="w-56" />
        <Dropdown v-model="selectedEmployee" :options="availableEmployees" optionLabel="label" optionValue="value" placeholder="Filter by employee" class="w-56" />
        <Dropdown v-model="selectedPeriod" :options="availablePeriods" optionLabel="label" optionValue="value" placeholder="Period" class="w-56" />
        <Button label="Export CSV" icon="pi pi-file" class="p-button-success" @click="exportTableToCSV" />
        <Button icon="pi pi-chevron-left" class="p-button-text" @click="navigatePeriod(-1)" />
        <span class="font-medium">{{ format(periodRange.start, 'dd/MM/yyyy') }} - {{ format(periodRange.end, 'dd/MM/yyyy') }}</span>
        <Button icon="pi pi-chevron-right" class="p-button-text" @click="navigatePeriod(1)" />
      </div>

      <h2 class="text-2xl font-bold mb-4 mt-8 border-b pb-2">KPI Overview</h2>
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <template #content>
            <div class="text-3xl font-bold text-blue-600">{{ totalEmployees }}</div>
            <div class="text-gray-500 mt-2">Total Employees</div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="text-3xl font-bold text-green-600">{{ totalActive }}</div>
            <div class="text-gray-500 mt-2">Active Employees</div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="text-3xl font-bold text-red-600">{{ totalInactive }}</div>
            <div class="text-gray-500 mt-2">Inactive Employees</div>
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="text-3xl font-bold text-purple-600">{{ totalTrackedHours }}</div>
            <div class="text-gray-500 mt-2">Tracked Hours (Period)</div>
          </template>
        </Card>
      </div>

      <h2 class="text-2xl font-bold mb-4 mt-8 border-b pb-2">Analytics</h2>
      <!-- Charts -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <Card>
  <template #content>
    <div class="font-semibold text-xl mb-4 text-center">Role Distribution</div>
    <div class="flex justify-center items-center" style="min-height:320px;">
      <Chart type="pie" :data="rolePieData" style="height:260px; max-width:260px;" />
    </div>
  </template>
</Card>

<Card>
  <template #content>
    <div class="font-semibold text-xl mb-4 text-center">Project Workload</div>
    <div class="flex justify-center items-center" style="min-height:320px;">
      <Chart type="pie" :data="projectWorkloadPie" style="height:260px; max-width:260px;" />
    </div>
  </template>
</Card>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <Card>
          <template #content>
            <div class="font-semibold text-xl mb-4">Team Hours Trend</div>
            <Chart type="line" :data="lineData" style="height: 320px;" />
          </template>
        </Card>
        <Card>
  <template #content>
    <div class="font-semibold text-xl mb-4">Employee Absence & Overtime</div>
    <table class="min-w-full border text-sm rounded-lg overflow-hidden shadow bg-white">
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-2 py-1">Employee</th>
          <th class="border px-2 py-1">Absence Days</th>
          <th class="border px-2 py-1">Overtime Days (&gt;8h)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in absenceOvertimeReport" :key="row.name">
          <td class="border px-2 py-1">{{ row.name }}</td>
          <td class="border px-2 py-1 text-center">{{ row.absenceDays }}</td>
          <td class="border px-2 py-1 text-center">{{ row.overtimeDays }}</td>
        </tr>
      </tbody>
    </table>
  </template>
</Card>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <Card>
          <template #content>
            <div class="font-semibold text-xl mb-4">Employee Status by Role</div>
            <Chart type="bar" :data="statusBarData" />
          </template>
        </Card>
        <Card>
          <template #content>
            <div class="font-semibold text-xl mb-4">Employee Utilization Rate</div>
            <Chart type="bar" :data="employeeUtilizationData" :options="{
              responsive: true,
              plugins: { legend: { display: true } },
              scales: {
                x: { title: { display: true, text: 'Employee' } },
                y: { title: { display: true, text: 'Hours' }, beginAtZero: true }
              }
            }" style="height: 320px;" />
          </template>
        </Card>
        
      </div>

      <div v-if="aiInsights.length" class="mb-6">
        <Card>
          <template #content>
            <div class="font-semibold text-lg mb-2 text-yellow-700">AI Insights & Anomalies</div>
            <ul class="list-disc pl-5 space-y-1">
              <li v-for="(insight, idx) in aiInsights" :key="idx" class="text-yellow-800">{{ insight }}</li>
            </ul>
          </template>
        </Card>
      </div>

      <h2 class="text-2xl font-bold mb-4 mt-8 border-b pb-2">Raw Data</h2>
      <!-- Raw Data Table -->
      <Card>
        <template #content>
          <div class="font-semibold text-xl mb-4">Raw Time Entries</div>
          <DataTable :value="timeEntryRows" scrollable scrollHeight="400px" class="mb-4">
            <Column v-for="col in timeEntryColumns" :key="col.field" :field="col.field" :header="col.header" />
          </DataTable>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.reports-dashboard {
  padding: 2rem 1rem;
}
</style>