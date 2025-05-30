<script setup>
import { ref, computed } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { GET_EMPLOYEES,GET_PROJECTS, GET_TACHES,  SUIVIS_DE_TEMP, CREATE_TEAM, CREATE_PROJECT, CREATE_TACHE, CREATE_SUIVI, ADD_TEAM_TO_PROJECT, STOP_ACTIVE_SUIVI, UPDATE_SUIVI } from '@/graphql';
import { format, startOfMonth, endOfMonth, differenceInDays, startOfWeek, endOfWeek, addWeeks, differenceInBusinessDays } from 'date-fns';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Avatar from 'primevue/avatar';
import Timeline from 'primevue/timeline';
import { useRouter } from 'vue-router';
import { faker } from '@faker-js/faker';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// Data Fetching
const { result: employeesResult, loading: employeesLoading } = useQuery(GET_EMPLOYEES);
const { result: timeEntriesResult, loading: timeEntriesLoading } = useQuery(SUIVIS_DE_TEMP, { filters: {} });
const { result: tasksResult } = useQuery(GET_TACHES);
const { result: projectsResult } = useQuery(GET_PROJECTS);

// Date Range Selection
const dateRange = ref([startOfMonth(new Date()), endOfMonth(new Date())]);

// Data
const employeeData = computed(() => employeesResult.value?.employees?.employees || []);
const timeTrackingData = computed(() => timeEntriesResult.value?.suivisDeTemp || []);

// Filtered Time Entries based on Date Range
const filteredTimeEntries = computed(() => {
  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) return timeTrackingData.value;
  const start = new Date(dateRange.value[0]);
  const end = new Date(dateRange.value[1]);
  return timeTrackingData.value.filter(e => {
    const d = new Date(e.heure_debut_suivi);
    return d >= start && d <= end;
  });
});

// KPI Stats
const totalEmployees = computed(() => employeeData.value.length);
const totalActive = computed(() => employeeData.value.filter(e => !e.disabledUntil).length);
const totalInactive = computed(() => employeeData.value.filter(e => e.disabledUntil).length);
const totalTrackedHours = computed(() =>
  filteredTimeEntries.value.reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0).toFixed(1)
);
const overtimeCount = computed(() => {
  // Map: { employeeId: { 'yyyy-MM-dd': totalHours } }
  const dailyHours = {};
  filteredTimeEntries.value.forEach(e => {
    const empId = e.employee?.idEmployee;
    if (!empId) return;
    const day = format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd');
    if (!dailyHours[empId]) dailyHours[empId] = {};
    if (!dailyHours[empId][day]) dailyHours[empId][day] = 0;
    dailyHours[empId][day] += e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0;
  });
  // Count how many days (across all employees) are over 8h
  let count = 0;
  Object.values(dailyHours).forEach(days =>
    Object.values(days).forEach(hours => {
      if (hours > 8) count++;
    })
  );
  return count;
});
const absenceCount = computed(() => {
  const ids = new Set(filteredTimeEntries.value.map(e => e.employee?.idEmployee));
  return employeeData.value.filter(e => !e.disabledUntil && !ids.has(e.idEmployee)).length;
});

// Trends
const averageHoursPerDay = computed(() => {
  const days = differenceInDays(dateRange.value[1], dateRange.value[0]) + 1;
  return (Number(totalTrackedHours.value) / days).toFixed(1);
});
const productivityTrend = computed(() => {
  const data = [];
  const labels = [];
  const today = new Date();

  // Get last 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    // Create a new date object for each day
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);
    
    // Format the label
    const label = format(currentDate, 'MMM dd');
    labels.push(label);

    // Calculate hours for this day
    const hours = filteredTimeEntries.value
      .filter(e => format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd'))
      .reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0);

    data.push(Number(hours.toFixed(1)));
  }

  return {
    labels,
    datasets: [{
      label: 'Hours Tracked',
      data,
      borderColor: '#6366F1',
      tension: 0.4,
      fill: true,
      backgroundColor: 'rgba(99, 102, 241, 0.1)'
    }]
  };
});

// Project Stats (top 5 by hours)
const projectStats = computed(() => {
  const allProjects = projectsResult.value?.projets || [];
  const allTasks = tasksResult.value?.taches || [];
  const timeEntries = filteredTimeEntries.value;

  return allProjects
    .filter(p => p.statut_projet === 'in_progress')
    .map(project => {
      // All tasks for this project
      const projectTasks = allTasks.filter(
        t => String(t.idProjet) === String(project.idProjet)
      );
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(
        t => t.statutTache === 'END'
      ).length;

      // All time entries for this project (use e.tache.idProjet)
      const projectEntries = timeEntries.filter(
        e =>
          e.tache &&
          String(e.tache.idProjet) === String(project.idProjet)
      );
      const hours = projectEntries.reduce(
        (sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0),
        0
      );
      // Only count employees with time tracked on this project
      const employees = new Set(
        projectEntries.map(e => e.employee?.idEmployee).filter(Boolean)
      ).size;

      return {
        name: project.nom_projet,
        hours: Number(hours.toFixed(1)),
        tasks: totalTasks,
        employees,
        progress: totalTasks
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0,
        status: project.statut_projet,
        deadline: project.date_fin_projet
      };
    })
    .sort((a, b) => b.hours - a.hours);
});

// Team Performance Table
const teamPerformance = computed(() => {
  return employeeData.value.map(emp => {
    const entries = filteredTimeEntries.value.filter(e => e.employee?.idEmployee === emp.idEmployee);
    const totalHours = entries.reduce((sum, e) => sum + (e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0), 0);
    const projects = new Set(entries.map(e => e.tache?.projet?.nom_projet)).size;
    return {
      id: emp.idEmployee,
      name: emp.nomEmployee,
      role: emp.role,
      hours: Number(totalHours.toFixed(1)),
      projects,
      utilization: expectedHours.value ? Number(((totalHours / expectedHours.value) * 100).toFixed(0)) : 0,
      status: emp.disabledUntil ? 'Inactive' : 'Active',
      trend: entries.map(e => e.duree_suivi ? Number(e.duree_suivi) / 3600 : 0)
    };
  }).sort((a, b) => b.hours - a.hours);
});

// Recent Activity Timeline
const recentActivity = computed(() =>
  filteredTimeEntries.value
    .slice()
    .sort((a, b) => new Date(b.heure_debut_suivi) - new Date(a.heure_debut_suivi))
    .slice(0, 10)
    .map(entry => ({
      employee: entry.employee?.nomEmployee || 'Unknown',
      project: entry.tache?.projet?.nom_projet || 'N/A',
      task: entry.tache?.titreTache || 'N/A',
      startTime: format(new Date(entry.heure_debut_suivi), 'MMM dd, HH:mm'),
      duration: entry.duree_suivi ? Number(entry.duree_suivi / 3600).toFixed(1) : '0',
      status: entry.heure_fin_suivi ? 'Completed' : 'Active'
    }))
);

// Helper Functions
const getUtilizationClass = (value) => {
  if (value >= 90) return 'bg-green-100 text-green-800';
  if (value >= 70) return 'bg-blue-100 text-blue-800';
  if (value >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};
const getEmployeeInitials = (name) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
};
const getHoursSeverity = (hours) => {
  if (hours >= 40) return 'success';
  if (hours >= 30) return 'info';
  if (hours >= 20) return 'warn';
  return 'danger';
};
const getEmployeeStatusSeverity = (status) => {
  if (!status) return 'info';
  const s = status.toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'inactive') return 'danger';
  if (s === 'on_leave') return 'warn';
  return 'info';
};
const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '';
  try {
    return typeof date === 'string'
      ? format(new Date(date), formatStr)
      : format(date, formatStr);
  } catch {
    return '';
  }
};

// Export CSV
const exportDashboardReport = () => {
  const headers = ['Employee', 'Project', 'Task', 'Start Time', 'Duration', 'Status'];
  const rows = recentActivity.value.map(a => [
    a.employee, a.project, a.task, a.startTime, a.duration, a.status
  ]);
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'dashboard_report.csv';
  link.click();
};

// Navigation
const router = useRouter();
const navigateTo = (name) => router.push({ name });

// Button Handlers
const handleDownloadReport = () => exportDashboardReport();
const handleViewAllProjects = () => navigateTo('Project');
const handleViewAllTeams = () => navigateTo('Teams');
const handleViewAllTasks = () => navigateTo('Task');
const handleViewAllReports = () => navigateTo('Reports');
const handleViewAllPerformance = () => navigateTo('Performance');
const handleViewAllCalendar = () => navigateTo('Calendar');

// Workload Distribution
const workloadDistribution = computed(() => {
  // Get all employees with their total hours
  const employeeHours = {};
  
  // Calculate working days (excluding weekends)
  const start = new Date(new Date().getFullYear(), 4, 19); // May 19
  const end = new Date(new Date().getFullYear(), 4, 29);   // May 29
  let workingDays = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      workingDays++;
    }
  }

  const expectedDailyHours = 8; // Standard 8-hour workday
  const expectedTotalHours = workingDays * expectedDailyHours;

  // Calculate total hours per employee
  filteredTimeEntries.value.forEach(entry => {
    const employeeId = entry.employee?.idEmployee;
    if (!employeeId) return;
    
    if (!employeeHours[employeeId]) {
      employeeHours[employeeId] = 0;
    }
    employeeHours[employeeId] += entry.duree_suivi ? Number(entry.duree_suivi) / 3600 : 0;
  });

  // Calculate utilization categories based on actual working days
  const distribution = {
    under: 0,    // < 70% of expected hours
    optimal: 0,  // 70-90% of expected hours
    high: 0,     // 90-110% of expected hours
    over: 0      // > 110% of expected hours
  };

  Object.values(employeeHours).forEach(hours => {
    const utilization = (hours / expectedTotalHours) * 100;
    if (utilization < 70) distribution.under++;
    else if (utilization < 90) distribution.optimal++;
    else if (utilization <= 110) distribution.high++;
    else distribution.over++;
  });

  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0) || 1;

  return [
    {
      label: 'Under Utilized',
      percentage: Math.round((distribution.under / total) * 100),
      class: 'under'
    },
    {
      label: 'Optimal',
      percentage: Math.round((distribution.optimal / total) * 100),
      class: 'optimal'
    },
    {
      label: 'High',
      percentage: Math.round((distribution.high / total) * 100),
      class: 'high'
    },
    {
      label: 'Over Utilized',
      percentage: Math.round((distribution.over / total) * 100),
      class: 'over'
    }
  ].filter(item => item.percentage > 0);
});

// Refresh Data
const refreshDashboardData = () => {
  employeesResult.refetch && employeesResult.refetch();
  timeEntriesResult.refetch && timeEntriesResult.refetch();
};

// Add these constants and function
const MAX_BAR_HEIGHT = 120; // Maximum height in pixels for the tallest bar

const normalizeHeight = (value) => {
  const maxValue = Math.max(...productivityTrend.value.datasets[0].data, 1); // Avoid division by zero
  return (value / maxValue) * MAX_BAR_HEIGHT;
};

// Add these computed properties after your existing ones
const onTrackProjects = computed(() => 
  projectStats.value.filter(p => p.status === 'in_progress' && isOnTrack(p)).length
);

const atRiskProjects = computed(() => 
  projectStats.value.filter(p => p.status === 'in_progress' && isAtRisk(p)).length
);

const delayedProjects = computed(() => 
  projectStats.value.filter(p => p.status === 'in_progress' && isDelayed(p)).length
);

// Helper function to determine project status
const isOnTrack = (project) => {
  if (!project.deadline) return true;
  const deadline = new Date(project.deadline);
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return daysUntilDeadline > 14; // More than 2 weeks until deadline
};

const isAtRisk = (project) => {
  if (!project.deadline) return false;
  const deadline = new Date(project.deadline);
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return daysUntilDeadline <= 14 && daysUntilDeadline > 0; // Less than 2 weeks until deadline
};

const isDelayed = (project) => {
  if (!project.deadline) return false;
  const deadline = new Date(project.deadline);
  const today = new Date();
  return deadline < today; // Past deadline
};

// expectedHours computed property
const expectedHours = computed(() => {
  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) return 40;
  return differenceInBusinessDays(dateRange.value[1], dateRange.value[0]) * 8;
});
</script>

<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p class="text-gray-500">Monitor your teams, projects, and productivity at a glance.</p>
      </div>
      <div class="header-actions">
       <!-- <Button label="Seed All Data" icon="pi pi-database" @click="seedAllData" class="mb-4" />  -->
        <Calendar v-model="dateRange" selectionMode="range" :showIcon="true" inputClass="p-inputtext-sm" />
        <Button label="Export CSV" icon="pi pi-download" class="p-button-outlined" @click="handleDownloadReport" />
        <!-- <Button label="Generate SuiviDeTemp (19-28 May)" icon="pi pi-clock" @click="generateSuiviDeTempForRange" class="mb-4" /> -->
        <div class="quick-nav-header flex gap-2 ml-4">
          <Button icon="pi pi-briefcase" class="p-button-info" @click="handleViewAllProjects" tooltip="Projects" />
          <Button icon="pi pi-users" class="p-button-success" @click="handleViewAllTeams" tooltip="Teams" />
          <Button icon="pi pi-list" class="p-button-warning" @click="handleViewAllTasks" tooltip="Tasks" />
          <Button icon="pi pi-calendar" class="p-button-help" @click="handleViewAllCalendar" tooltip="Calendar" />
          <Button icon="pi pi-chart-bar" class="p-button-secondary" @click="handleViewAllReports" tooltip="Reports" />
          <Button icon="pi pi-chart-line" class="p-button-primary" @click="handleViewAllPerformance" tooltip="Performance" />
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-700">Employees</h3>
              <div class="text-3xl font-bold text-indigo-600">{{ totalEmployees }}</div>
              <div class="text-sm text-gray-500">Active: {{ totalActive }} | Inactive: {{ totalInactive }}</div>
            </div>
            <div class="p-3 bg-indigo-100 rounded-full">
              <i class="pi pi-users text-xl text-indigo-600"></i>
            </div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-700">Tracked Hours</h3>
              <div class="text-3xl font-bold text-green-600">{{ totalTrackedHours }}h</div>
              <div class="text-sm text-gray-500">Avg: {{ averageHoursPerDay }}h/day</div>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <i class="pi pi-clock text-xl text-green-600"></i>
            </div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-700">Overtime Entries</h3>
              <div class="text-3xl font-bold text-orange-600">{{ overtimeCount }}</div>
              <div class="text-sm text-gray-500">Absence: {{ absenceCount }}</div>
            </div>
            <div class="p-3 bg-orange-100 rounded-full">
              <i class="pi pi-exclamation-triangle text-xl text-orange-600"></i>
            </div>
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-700">Active Projects</h3>
              <div class="text-3xl font-bold text-blue-600">{{ projectStats.length }}</div>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <i class="pi pi-briefcase text-xl text-blue-600"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Trends & Analytics -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Productivity Trend</h2>
          </div>
        </template>
        <template #content>
          <Chart type="line" :data="productivityTrend" :options="{ responsive: true, plugins: { legend: { labels: { color: '#64748B' } } } }" height="300" />
        </template>
      </Card>
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Top Projects</h2>
            <Button label="View All" class="p-button-text" @click="handleViewAllProjects" />
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div v-for="project in projectStats" :key="project.name" class="project-stats-item">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-700">{{ project.name }}</span>
                  <Tag :value="project.status" class="ml-2" />
                </div>
                <Tag :value="`${project.hours}h`" severity="info" />
              </div>
              <ProgressBar :value="project.progress" class="project-progress" />
              <div class="flex justify-between mt-2 text-sm text-gray-500">
                <span>{{ project.tasks }} {{ project.tasks === 1 ? 'task' : 'tasks' }}</span>
                <span>{{ project.employees }} {{ project.employees === 1 ? 'member' : 'members' }}</span>
                <span>{{ project.deadline ? formatDate(project.deadline) : 'No deadline' }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Team Performance Table -->
    <Card class="mb-6">
      <template #title>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Team Performance</h2>
          <Button label="View All" class="p-button-text" @click="handleViewAllTeams" />
        </div>
      </template>
      <template #content>
        <DataTable :value="teamPerformance" :paginator="true" :rows="5" class="p-datatable-sm" responsiveLayout="scroll">
          <Column field="name" header="Employee" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <Avatar class="w-8 h-8" :label="getEmployeeInitials(slotProps.data.name)" />
                <div>
                  <div class="font-medium">{{ slotProps.data.name }}</div>
                  <div class="text-gray-500 text-sm">{{ slotProps.data.role }}</div>
                </div>
              </div>
            </template>
          </Column>
          <Column field="hours" header="Hours" sortable>
            <template #body="slotProps">
              <Tag :value="`${slotProps.data.hours}h`" :severity="getHoursSeverity(slotProps.data.hours)" />
            </template>
          </Column>
          <Column field="projects" header="Projects" sortable>
            <template #body="slotProps">
              <span class="font-medium">{{ slotProps.data.projects }}</span>
            </template>
          </Column>
          <Column field="utilization" header="Utilization" sortable>
            <template #body="slotProps">
              <span :class="['px-2 py-1 rounded text-sm', getUtilizationClass(slotProps.data.utilization)]">
                {{ slotProps.data.utilization }}%
              </span>
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="slotProps">
              <Tag :value="slotProps.data.status" :severity="getEmployeeStatusSeverity(slotProps.data.status)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Recent Activity & Quick Navigation -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Recent Activity</h2>
            <Button label="View All" class="p-button-text" @click="handleViewAllReports" />
          </div>
        </template>
        <template #content>
          <Timeline :value="recentActivity" class="activity-timeline">
            <template #content="slotProps">
              <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div class="flex items-center gap-4">
                  <Avatar :label="getEmployeeInitials(slotProps.item.employee)" class="w-10 h-10" />
                  <div>
                    <div class="font-medium">{{ slotProps.item.employee }}</div>
                    <div class="text-sm text-gray-500">
                      {{ slotProps.item.task }} ({{ slotProps.item.project }})
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-medium">{{ slotProps.item.startTime }}</div>
                  <Tag :severity="slotProps.item.status === 'Completed' ? 'success' : 'info'" :value="slotProps.item.status" />
                </div>
              </div>
            </template>
          </Timeline>
        </template>
      </Card>
      <Card class="insights-dashboard">
        <template #title>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Team Analytics & Insights</h2>
            <Button icon="pi pi-sync" class="p-button-text p-button-sm" tooltip="Refresh Data" @click="refreshDashboardData" />
          </div>
        </template>
        <template #content>
          <div class="insights-grid">
            <!-- Key Performance Stats -->
            <div class="performance-stats">
              <div class="metric-circle" :style="{ '--percentage': (totalActive/totalEmployees) * 100 + '%' }">
                <div class="metric-value">
                  <h4>{{ Math.round((totalActive/totalEmployees) * 100) }}%</h4>
                  <p>Team Active</p>
                </div>
              </div>
              <div class="metric-details">
                <div class="metric-item">
                  <i class="pi pi-users text-blue-500"></i>
                  <div>
                    <h5>{{ totalActive }}/{{ totalEmployees }}</h5>
                    <p>Active Members</p>
                  </div>
                </div>
                <div class="metric-item">
                  <i class="pi pi-clock text-green-500"></i>
                  <div>
                    <h5>{{ averageHoursPerDay }}h</h5>
                    <p>Avg. Daily Hours</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Workload Distribution -->
            <div class="workload-chart">
              <h3>Workload Distribution</h3>
              <div class="workload-bars">
                <div v-for="item in workloadDistribution" 
                     :key="item.class"
                     class="workload-bar"
                     :class="item.class"
                     :style="{ width: item.percentage + '%' }">
                  {{ item.percentage }}%
                </div>
              </div>
              <div class="workload-legend">
                <span v-for="item in workloadDistribution" :key="item.class">
                  <i :class="['dot', item.class]"></i>
                  {{ item.label }} ({{ item.percentage }}%)
                </span>
              </div>
            </div>

            <!-- Project Health -->
            <div class="project-health">
              <h3>Project Health</h3>
              <div class="health-metrics">
                <div class="health-item success">
                  <span class="health-number">{{ onTrackProjects }}</span>
                  <span class="health-label">On Track</span>
                </div>
                <div class="health-item warning">
                  <span class="health-number">{{ atRiskProjects }}</span>
                  <span class="health-label">At Risk</span>
                </div>
                <div class="health-item danger">
                  <span class="health-number">{{ delayedProjects }}</span>
                  <span class="health-label">Delayed</span>
                </div>
              </div>
            </div>

            <!-- Team Productivity Trend -->
            <div class="productivity-trend">
              <h3>Productivity Trend</h3>
              <div class="trend-chart">
                <div
                  v-for="(value, idx) in productivityTrend.datasets[0].data"
                  :key="idx"
                  class="trend-bar"
                  :style="{ height: normalizeHeight(value) + 'px' }"
                  :title="`${productivityTrend.labels[idx]}: ${value}h`"
                ></div>
              </div>
              <div class="trend-labels">
                <span v-for="label in productivityTrend.labels" :key="label">{{ label }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 1.5rem;
  max-width: 1440px;
  margin: 0 auto;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.header-actions {
  display: flex;
  gap: 1rem;
}
.project-stats-item {
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: #f8fafc;
  transition: all 0.3s ease;
}
.project-stats-item:hover {
  background-color: #f1f5f9;
}
.project-progress {
  height: 0.5rem !important;
}
.activity-timeline {
  --timeline-color: #6366f1;
}
.insights-dashboard {
  margin-top: 2rem;
}
.insights-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  padding: 1rem;
}
.performance-stats {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem;
  background: linear-gradient(145deg, #ffffff, #f3f4f6);
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.metric-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    #4f46e5 var(--percentage),
    #e5e7eb var(--percentage)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.metric-circle::before {
  content: '';
  width: 90px;
  height: 90px;
  background: white;
  border-radius: 50%;
  position: absolute;
}
.metric-value {
  position: relative;
  text-align: center;
  z-index: 1;
}
.workload-chart {
  padding: 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.workload-bars {
  display: flex;
  height: 30px;
  border-radius: 15px;
  overflow: hidden;
  margin: 1rem 0;
}
.workload-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}
.workload-bar:nth-child(1) { background: #ef4444; }
.workload-bar:nth-child(2) { background: #22c55e; }
.workload-bar:nth-child(3) { background: #eab308; }
.workload-bar:nth-child(4) { background: #f97316; }
.workload-legend {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #666;
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}
.dot.under { background: #ef4444; }
.dot.optimal { background: #22c55e; }
.dot.high { background: #eab308; }
.dot.over { background: #f97316; }
.project-health {
  padding: 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.health-metrics {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
.health-item {
  text-align: center;
  padding: 1rem;
  border-radius: 0.5rem;
}
.health-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.health-item.success { background: #dcfce7; color: #166534; }
.health-item.warning { background: #fef3c7; color: #92400e; }
.health-item.danger { background: #fee2e2; color: #991b1b; }
.productivity-trend {
  padding: 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.trend-chart {
  height: 150px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 1rem 0;
  gap: 0.5rem;
}
.trend-bar {
  width: 12px;
  background: linear-gradient(to top, #4f46e5, #818cf8);
  border-radius: 6px;
  transition: height 0.3s ease;
}
.trend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.75rem;
}
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
  }
  .header-actions {
    width: 100%;
    justify-content: stretch;
  }
}
</style>
