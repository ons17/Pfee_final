<script setup>
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useToast } from 'primevue/usetoast';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  addDays,
  addWeeks, 
  addMonths, 
  addYears, 
  isToday, 
  isSameDay
} from 'date-fns';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { SUIVIS_DE_TEMP, CREATE_SUIVI, STOP_ACTIVE_SUIVI, DELETE_SUIVI, GET_PROJECTS_FOR_EMPLOYEE, GET_TACHES, GET_ACTIVE_SUIVI } from '@/graphql';
import { useTimer } from '@/views/uikit/timer';
import debounce from 'lodash-es/debounce';
import { useRouter } from 'vue-router';
import { validatePassword } from '@/utils/authUtils';

const DataTable = defineAsyncComponent(() => import('primevue/datatable'));
const Dropdown = defineAsyncComponent(() => import('primevue/dropdown'));

// Constants
const WEEK_START_DAY = 1; // Monday
const WEEKLY_GOAL_MINUTES = 40 * 60;
const FILTER_TYPES = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' }
];

// Employee data
const employee = JSON.parse(localStorage.getItem('employee'));
const EMPLOYEE_ID = employee?.idEmployee;
const EMPLOYEE_NAME = employee?.nomEmployee || 'Unknown Employee';
const router = useRouter();

if (!employee || !employee.idEmployee) {
  router.push({ name: 'EmployeeLogin' });
}

if (!EMPLOYEE_ID) {
  console.error('Employee ID not found. Please log in.');
}

// Composables
const toast = useToast();
const { timer, isRunning, startTimer, stopTimer, formatTime, restoreTimerState } = useTimer();

// Component State
const currentDate = ref(new Date());
const filterType = ref('week');
const selectedProject = ref(null);
const selectedTask = ref(null);
const description = ref('');
const loading = ref(false);
const showDeleteDialog = ref(false);
const activeEntry = ref(null);
const showResumeNotice = ref(false);
const resumedSessionStart = ref(null);
const isTrackingLoading = ref(false);
const isDeletingLoading = ref(false);
const isExportingLoading = ref(false);
const password = ref(localStorage.getItem('password') || '');

if (!FILTER_TYPES.some((type) => type.value === filterType.value)) {
    filterType.value = 'week'; // Default to 'week'
}

// GraphQL Operations
const { result: projectsResult } = useQuery(GET_PROJECTS_FOR_EMPLOYEE, { idEmploye: EMPLOYEE_ID });
const { result: tasksResult } = useQuery(GET_TACHES);
const { result: activeEntryResult, onResult: onActiveEntryResult } = useQuery(GET_ACTIVE_SUIVI, {
  employeeId: EMPLOYEE_ID,
  fetchPolicy: 'network-only'
});

const getDateRange = () => {
  const date = currentDate.value;
  switch (filterType.value) {
    case 'day':
      return {
        startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        endDate: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      };
    case 'week':
      return {
        startDate: startOfWeek(date, { weekStartsOn: WEEK_START_DAY }),
        endDate: endOfWeek(date, { weekStartsOn: WEEK_START_DAY })
      };
    case 'month':
      return {
        startDate: startOfMonth(date),
        endDate: endOfMonth(date)
      };
    case 'year':
      return {
        startDate: startOfYear(date),
        endDate: endOfYear(date)
      };
    default:
      return {
        startDate: startOfWeek(date, { weekStartsOn: WEEK_START_DAY }),
        endDate: endOfWeek(date, { weekStartsOn: WEEK_START_DAY })
      };
  }
};

const { 
  result: timeEntriesResult, 
  loading: entriesLoading, 
  refetch: refetchTimeEntries,
  error: entriesError
} = useQuery(
  SUIVIS_DE_TEMP,
  () => {
    const { startDate, endDate } = getDateRange();
    return {
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        employeeId: EMPLOYEE_ID
      }
    };
  },
  { fetchPolicy: 'cache-and-network' }
);

watch(entriesError, (err) => {
  if (err) {
    showError('Failed to fetch time entries. Please try again.');
  }
});

const { mutate: createTimeEntry } = useMutation(CREATE_SUIVI);
const { mutate: stopActiveTracking } = useMutation(STOP_ACTIVE_SUIVI);
const { mutate: deleteTimeEntry } = useMutation(DELETE_SUIVI);

// Computed Properties
const projects = computed(() => {
  if (!projectsResult.value || !projectsResult.value.getProjetsForEmployee) {
    return [];
  }
  return projectsResult.value.getProjetsForEmployee
    .filter((project) => project.statut_projet === "in_progress")
    .map((project) => ({
      id: project.idProjet || null,
      name: project.nom_projet || "Unnamed Project",
      status: project.statut_projet || "Unknown Status",
    }));
});

const tasks = computed(() => {
  return (
    tasksResult.value?.taches
      ?.filter((task) => task.statutTache === "IN_PROGRESS")
      .map((task) => ({
        id: task.idTache,
        projectId: task.idProjet,
        title: task.titreTache,
        status: task.statutTache,
      })) || []
  );
});

const filteredTasks = computed(() => {
  return selectedProject.value ? tasks.value.filter((task) => task.projectId === selectedProject.value.id) : [];
});

const timeEntries = computed(() => {
  if (!timeEntriesResult.value?.suivisDeTemp) return [];

  const { startDate, endDate } = getDateRange();
  const projectMap = projects.value.reduce((acc, project) => {
    acc[project.id] = project.name;
    return acc;
  }, {});

  return timeEntriesResult.value.suivisDeTemp
    .filter((entry) => {
      const entryDate = new Date(entry.heure_debut_suivi);
      return entryDate >= startDate && entryDate < endDate;
    })
    .map((entry) => ({
      id: entry.idsuivi,
      task: entry.tache?.titreTache || 'N/A',
      project: projectMap[entry.tache?.idProjet] || 'N/A',
      startTime: entry.heure_debut_suivi,
      endTime: entry.heure_fin_suivi,
      duration: entry.duree_suivi,
      employee: entry.employee?.nomEmployee || 'N/A',
      description: entry.description || 'N/A'
    }));
});

const totalWeekHours = computed(() => {
  const totalMinutes = timeEntries.value.reduce((total, entry) => total + (entry.duration || 0), 0);
  return (totalMinutes / 60).toFixed(1);
});

const totalWeekMinutes = computed(() => {
  return timeEntries.value.reduce((total, entry) => total + (entry.duration || 0), 0);
});

const weeklyHours = computed(() => {
  if (filterType.value !== 'week') return [];
  
  const days = [];
  const start = startOfWeek(currentDate.value, { weekStartsOn: WEEK_START_DAY });

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + i);

    const dayEntries = timeEntries.value.filter((entry) => {
      return entry.startTime && isSameDay(new Date(entry.startTime), currentDay);
    });

    const totalMinutes = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    days.push({
      date: currentDay,
      minutes: totalMinutes > 0 ? totalMinutes : 0,
      entries: dayEntries.map((entry) => ({
        id: entry.id,
        task: entry.task,
        minutes: entry.duration || 0
      }))
    });
  }

  return days;
});

// Methods
const handleFilterChange = () => {
  currentDate.value = new Date();
  refetchTimeEntries();
};

const debouncedHandleFilterChange = debounce(() => {
    handleFilterChange();
}, 300);

const navigatePeriod = (direction) => {
  switch (filterType.value) {
    case 'day':
      currentDate.value = addDays(currentDate.value, direction);
      break;
    case 'week':
      currentDate.value = addWeeks(currentDate.value, direction);
      break;
    case 'month':
      currentDate.value = addMonths(currentDate.value, direction);
      break;
    case 'year':
      currentDate.value = addYears(currentDate.value, direction);
      break;
  }
  refetchTimeEntries();
};

const formatDateRange = () => {
  const { startDate, endDate } = getDateRange();
  switch (filterType.value) {
    case 'day':
      return format(startDate, 'MMM dd, yyyy');
    case 'week':
      return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
    case 'month':
      return format(startDate, 'MMMM yyyy');
    case 'year':
      return format(startDate, 'yyyy');
    default:
      return '';
  }
};

const handleProjectChange = () => {
  selectedTask.value = null;
};

const handleTrackingAction = async () => {
  if (isRunning.value) {
    await stopTracking();
  } else {
    await startTracking();
  }
};

const startTracking = async () => {
  if (!selectedTask.value) {
    showError('Please select a task first');
    return;
  }

  try {
    const { data } = await createTimeEntry({
      input: {
        heure_debut_suivi: new Date().toISOString(),
        idEmployee: EMPLOYEE_ID,
        idTache: selectedTask.value.id,
        description: description.value
      }
    });

    if (!data?.createSuiviDeTemp?.idsuivi) {
      throw new Error('Invalid response from server');
    }

    activeEntry.value = data.createSuiviDeTemp;
    showSuccess('Tracking started');
    startTimer(data.createSuiviDeTemp.idsuivi);
    await refetchTimeEntries();
  } catch (error) {
    handleGqlError(error, 'start tracking');
  }
};

const stopTracking = async () => {
  try {
    loading.value = true;
    const { data } = await stopActiveTracking({
      idEmployee: EMPLOYEE_ID,
      description: description.value
    });

    if (data?.stopActiveSuivi?.success) {
      showSuccess(data.stopActiveSuivi.message);
      stopTimer();
      timer.value = 0;
      showResumeNotice.value = false;
      await refetchTimeEntries();
    } else {
      showError('Failed to stop tracking. Please try again.');
    }
  } catch (error) {
    showError('An error occurred while stopping tracking.');
  } finally {
    loading.value = false;
  }
};

const confirmDelete = (entry) => {
  activeEntry.value = entry;
  password.value = '';
  showDeleteDialog.value = true;
};

const deleteEntry = async () => {
  if (!password.value) {
    showError('Please enter your password to confirm deletion.');
    return;
  }

  try {
    isDeletingLoading.value = true;

    const isPasswordValid = validatePassword(password.value);
    if (!isPasswordValid) {
      showError('Invalid password. Please try again.');
      return;
    }

    if (activeEntry.value.employee !== EMPLOYEE_NAME) {
      showError('You can only delete your own time entries.');
      return;
    }

    await deleteTimeEntry({ id: activeEntry.value.id });
    showSuccess('Entry deleted successfully');
    await refetchTimeEntries();
  } catch (error) {
    handleGqlError(error, 'delete entry');
  } finally {
    isDeletingLoading.value = false;
    showDeleteDialog.value = false;
  }
};

const exportToCSV = () => {
  const headers = ['Task', 'Project', 'Start Time', 'End Time', 'Duration', 'Description'];
  const rows = timeEntries.value.map((entry) => [
    entry.task, 
    entry.project, 
    formatDateTime(entry.startTime), 
    entry.endTime ? formatDateTime(entry.endTime) : 'Active', 
    formatDuration(entry.duration), 
    entry.description
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'time_entries.csv';
  link.click();
};

const resumeTracking = (startTime, taskId, projectId) => {
  const now = new Date();
  const start = new Date(startTime);

  if (isNaN(start.getTime())) {
    console.error('Invalid start time format:', startTime);
    return;
  }

  const elapsedSeconds = Math.floor((now - start) / 1000);

  timer.value = elapsedSeconds;
  startTimer();
  resumedSessionStart.value = startTime;
  showResumeNotice.value = true;

  const task = tasks.value.find((t) => t.id === taskId);
  if (task) {
    selectedTask.value = task;
    selectedProject.value = projects.value.find((p) => p.id === projectId);
  }

  toast.add({
    severity: 'info',
    summary: 'Session Resumed',
    detail: `Continuing from ${formatDateTime(startTime)}`,
    life: 5000
  });
};

const verifyActiveTracking = async () => {
  try {
    const { data } = await useQuery(GET_ACTIVE_SUIVI, {
      employeeId: EMPLOYEE_ID,
    }).refetch();

    return data?.getActiveSuivi || null;
  } catch (error) {
    console.error('Failed to verify active tracking:', error);
    return null;
  }
};

// Helpers
const showError = (message) => {
  toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
};

const showWarning = (message) => {
  toast.add({ severity: 'warn', summary: 'Warning', detail: message, life: 4000 });
};

const showSuccess = (message) => {
  toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
};

const handleGqlError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);
  const message = error.message?.replace('GraphQL error: ', '') || 'An unexpected error occurred';
  toast.add({
    severity: 'error',
    summary: 'Error',
    detail: message,
    life: 5000
  });
};

const formatDate = (date, formatString = 'yyyy-MM-dd') => {
  return date && !isNaN(new Date(date)) ? format(new Date(date), formatString) : 'N/A';
};

const formatDateTime = (dateString) => {
  return dateString ? format(new Date(dateString), 'MMM dd, yyyy HH:mm') : 'N/A';
};

const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

// Initialize
onMounted(() => {
  restoreTimerState(verifyActiveTracking);

  onActiveEntryResult((result) => {
    if (result.data?.getActiveSuivi) {
      activeEntry.value = result.data.getActiveSuivi;
      resumeTracking(activeEntry.value.heureDebutSuivi, activeEntry.value.tache.idTache, activeEntry.value.tache.idProjet);
    } else {
      stopTimer();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (isRunning.value) {
      stopTimer();
    }
  });

  const savedDescription = localStorage.getItem('description');
  if (savedDescription) {
    description.value = savedDescription;
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', () => {
    if (isRunning.value) {
      stopTimer();
    }
  });
});

// Watchers
const debouncedRefetch = debounce(() => {
  refetchTimeEntries();
}, 300);

watchEffect(() => {
  debouncedRefetch();
});

watch([projects, tasks], () => {
  if (!selectedProject.value?.id && projects.value.length > 0) {
    selectedProject.value = null;
  }
  if (!selectedTask.value?.id && tasks.value.length > 0) {
    selectedTask.value = null;
  }
});

watch(entriesLoading, (newVal) => {
  loading.value = newVal;
});

watch(totalWeekMinutes, (newVal) => {
  if (newVal >= WEEKLY_GOAL_MINUTES) {
    toast.add({
      severity: 'success',
      summary: 'Goal Reached',
      detail: 'You have reached your weekly goal of 40 hours!',
      life: 5000
    });
  }
});

watch(description, (newDescription) => {
  localStorage.setItem('description', newDescription || '');
});
</script>

<template>
  <div class="time-tracking-container">
    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <ProgressSpinner />
    </div>

    <!-- Resume Notification -->
    <Toast position="top-right" />
    <div v-if="showResumeNotice" class="resume-notice">
      <Tag severity="info" icon="pi pi-history"> Resumed previous session ({{ formatDateTime(resumedSessionStart) }}) </Tag>
    </div>

    <!-- Header Section -->
    <div class="header">
      <h1>Time Tracking</h1>
      <div class="employee-info">
        <p class="employee-name">Welcome, <strong>{{ EMPLOYEE_NAME }}</strong></p>
      </div>
      <div class="filter-controls">
        <Dropdown 
          v-model="filterType" 
          :options="FILTER_TYPES" 
          optionLabel="label" 
          optionValue="value" 
          @change="debouncedHandleFilterChange"
          class="filter-dropdown"
        />
        <div class="period-navigation">
          <Button icon="pi pi-chevron-left" aria-label="Previous Period" @click="navigatePeriod(-1)" class="p-button-text" />
          <span class="period-range">{{ formatDateRange() }}</span>
          <Button icon="pi pi-chevron-right" @click="navigatePeriod(1)" class="p-button-text" />
        </div>
      </div>
    </div>

    <!-- Tracking Controls -->
    <div class="tracker-section">
      <Card>
        <template #content>
          <div class="tracker-controls">
            <div class="control-group">
              <div class="dropdown-group">
                <label class="control-label">Project</label>
                <Dropdown
                  v-model="selectedProject"
                  :options="projects"
                  optionLabel="name"
                  placeholder="Select Project"
                  :filter="true"
                  :disabled="isRunning"
                  class="dropdown"
                  @change="handleProjectChange"
                />
              </div>

              <div class="dropdown-group">
                <label class="control-label">Task</label>
                <Dropdown
                  v-model="selectedTask"
                  :options="filteredTasks"
                  optionLabel="title"
                  placeholder="Select Task"
                  :disabled="!selectedProject || isRunning"
                  class="dropdown"
                />
              </div>

              <div class="input-group">
                <label class="control-label">Description</label>
                <InputText
                  v-model="description"
                  placeholder="Add a description"
                />
              </div>
            </div>

            <div class="timer-group">
              <Button
                type="button"
                :label="isRunning ? 'Stop Tracking' : 'Start Tracking'"
                :icon="isRunning ? 'pi pi-stop' : 'pi pi-play'"
                :class="isRunning ? 'p-button-danger' : 'p-button-success'"
                @click="handleTrackingAction"
                :disabled="(!selectedTask && !isRunning) || loading"
                class="track-button"
              />
              <Button 
                type="button" 
                label="Export to CSV" 
                icon="pi pi-file" 
                class="p-button-success" 
                @click="exportToCSV" 
                :disabled="timeEntries.length === 0"
              />
              <div class="current-timer">
                <span class="timer-label">Current Session:</span>
                {{ formatTime(timer) }}
                <Tag 
                  :severity="isRunning ? 'success' : 'info'" 
                  :value="isRunning ? 'Active' : 'Ready'" 
                />
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Weekly Summary (only shown in week view) -->
    <div v-if="filterType === 'week'" class="weekly-summary">
      <Card>
        <template #title>
          <div class="card-header">
            Weekly Summary
            <Badge :value="`${Math.floor(totalWeekMinutes / 60)}h ${totalWeekMinutes % 60}m`" severity="info" class="summary-badge" />
          </div>
        </template>
        <template #content>
          <ProgressBar :value="((totalWeekMinutes / WEEKLY_GOAL_MINUTES) * 100).toFixed(2)" class="weekly-progress-bar" />
          <div class="week-days">
            <div v-for="day in weeklyHours" :key="day.date" class="day-card" :class="{ 'active-day': isToday(day.date) }">
              <h4>{{ formatDate(day.date, 'EEE') }}</h4>
              <p class="day-total">{{ Math.floor(day.minutes / 60) }}h {{ day.minutes % 60 }}m</p>
              <div class="day-entries">
                <div v-for="entry in day.entries" :key="entry.id" class="entry-item">
                  <span class="entry-task">{{ entry.task }}</span>
                  <span class="entry-duration">{{ entry.minutes }}m</span>
                </div>
                <div v-if="day.entries.length === 0" class="no-entries">
                  <i class="pi pi-info-circle"></i>
                  No time entries
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Time Entries Table -->
    <div class="time-entries">
      <Card>
        <template #title>Time Entries</template>
        <template #content>
          <DataTable
            v-if="timeEntries.length > 0"
            :value="timeEntries"
            :paginator="true"
            :rows="10"
            :loading="entriesLoading"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          >
            <Column field="task" header="Task">
              <template #body="{ data }">
                <span class="task-name">{{ data.task }}</span>
                <span class="project-name">{{ data.project }}</span>
              </template>
            </Column>
            <Column header="Time" class="time-column">
              <template #body="{ data }">
                <div class="time-range">
                  {{ formatDateTime(data.startTime) }}
                  <span class="time-separator">-</span>
                  {{ data.endTime ? formatDateTime(data.endTime) : 'Active' }}
                </div>
              </template>
            </Column>
            <Column header="Duration" class="duration-column">
              <template #body="{ data }">
                <Tag :severity="data.endTime ? 'success' : 'warning'">
                  {{ formatDuration(data.duration) }}
                </Tag>
              </template>
            </Column>
            <Column field="description" header="Description">
              <template #body="{ data }">
                <span :title="data.description">
                  {{ data.description.length > 50 ? data.description.slice(0, 50) + '...' : data.description }}
                </span>
              </template>
            </Column>
            <Column header="Actions" class="actions-column">
              <template #body="{ data }">
                <Button icon="pi pi-trash" class="p-button-rounded p-button-text p-button-danger" @click="confirmDelete(data)" :disabled="!data.endTime" />
              </template>
            </Column>
          </DataTable>
          <div v-else class="no-entries">No time entries found.</div>
        </template>
      </Card>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:visible="showDeleteDialog" header="Confirm Delete" :modal="true" :style="{ width: '450px' }">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle p-mr-3" style="font-size: 2rem" />
        <span>Are you sure you want to delete this time entry?</span>
      </div>
      <div class="password-input">
        <label for="password">Enter Password:</label>
        <InputText v-model="password" id="password" type="password" placeholder="Password" />
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="showDeleteDialog = false" class="p-button-text" />
        <Button label="Delete" icon="pi pi-check" @click="deleteEntry" class="p-button-danger" :loading="isDeletingLoading" autofocus />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.time-tracking-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: var(--surface-card);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.employee-name {
  font-size: 1.1rem;
  color: var(--text-color);
  font-weight: 500;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.filter-dropdown {
  width: 120px;
}

.period-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.period-range {
  font-weight: 600;
  min-width: 200px;
  text-align: center;
}

.tracker-section {
  margin-bottom: 1.5rem;
}

.tracker-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.dropdown-group, .input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: 600;
  color: var(--text-color-secondary);
}

.timer-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.track-button {
  min-width: 160px;
}

.current-timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
}

.timer-label {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.timer-status-badge {
  margin-left: 0.5rem;
}

.weekly-summary {
  margin-bottom: 1.5rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-badge {
  font-size: 1rem;
}

.weekly-progress-bar {
  margin: 1rem 0;
  height: 1rem;
  border-radius: 8px;
}

.week-days {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.day-card {
  background: var(--surface-card);
  border-radius: 8px;
  padding: 1rem;
  transition: transform 0.2s;
}

.day-card:hover {
  transform: translateY(-2px);
}

.active-day {
  border: 2px solid var(--primary-color);
}

.day-total {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0.5rem 0;
}

.day-entries {
  margin-top: 1rem;
}

.entry-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.entry-task {
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-duration {
  font-weight: 600;
  color: var(--text-color-secondary);
}

.no-entries {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color-secondary);
  font-style: italic;
  padding: 1rem 0;
}

.time-entries {
  margin-top: 1.5rem;
}

.task-name {
  display: block;
  font-weight: 600;
}

.project-name {
  display: block;
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.time-range {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-separator {
  color: var(--text-color-secondary);
  margin: 0 0.5rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.confirmation-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.resume-notice {
  margin: 1rem 0;
  animation: fadeIn 0.5s;
}

.password-input {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.password-input label {
  font-weight: 600;
  color: var(--text-color-secondary);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .filter-controls {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .control-group {
    grid-template-columns: 1fr;
  }

  .timer-group {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .week-days {
    grid-template-columns: 1fr;
  }

  .track-button {
    width: 100%;
  }
}
</style>