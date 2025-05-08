<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, isToday, isSameMonth, set, addHours, differenceInMinutes, addMonths, addMinutes, startOfMonth, endOfMonth, isWithinInterval, differenceInHours } from 'date-fns';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import ProgressBar from 'primevue/progressbar';
import Calendar from 'primevue/calendar';
import { useQuery } from '@vue/apollo-composable';
import { GET_EMPLOYEES, GET_PROJECTS_FOR_EMPLOYEE, GET_TACHES, SUIVIS_DE_TEMP } from '@/graphql';
import debounce from 'lodash-es/debounce';

interface Employee {
  idEmployee: string;
  nomEmployee: string;
  role: string;
  emailEmployee: string;
  avatar?: string;
  capacity?: number;
}

interface Project {
  idProjet: string;
  nom_projet: string;
  description_projet: string;
  statut_projet: string;
  date_debut_projet: string;
  date_fin_projet: string;
}

interface Task {
  idTache: string;
  titreTache: string;
  statutTache: string;
  idProjet: string;
  duration: number;
}

interface TimeEntry {
  idsuivi: string;
  heure_debut_suivi: string;
  heure_fin_suivi: string;
  duree_suivi: number;
  description?: string;
  tache: {
    idTache: string;
    titreTache: string;
    idProjet: string;
    projet?: {
      nom_projet: string;
    }
  };
  employee: {
    idEmployee: string;
    nomEmployee: string;
  };
}

const toast = useToast();
const currentDate = ref(new Date());
const selectedProject = ref<Project | null>(null);
const showDetails = ref(false);
const selectedEntry = ref<TimeEntry | null>(null);
const showNewEntryDialog = ref(false);
const draggingEntry = ref<TimeEntry | null>(null);
const visible = ref(false);
const saving = ref(false);
const entry = ref<TimeEntry>({
  idsuivi: '',
  heure_debut_suivi: '',
  heure_fin_suivi: '',
  duree_suivi: 0,
  description: '',
  tache: {
    idTache: '',
    titreTache: '',
    idProjet: '',
    projet: {
      nom_projet: ''
    }
  },
  employee: {
    idEmployee: '',
    nomEmployee: ''
  }
});

const FILTER_TYPES = [
  { label: 'Day', value: 'day', icon: 'pi pi-calendar' },
  { label: 'Week', value: 'week', icon: 'pi pi-list' },
  { label: 'Month', value: 'month', icon: 'pi pi-table' },
  { label: 'Year', value: 'year', icon: 'pi pi-chart-bar' },
  { label: 'Timeline', value: 'timeline', icon: 'pi pi-sliders-h' }
];

const filterType = ref('week');

const employee = JSON.parse(localStorage.getItem('employee') || '{}');
const EMPLOYEE_ID = employee?.idEmployee;

// Compute date range based on filterType
const dateRange = computed(() => {
  if (filterType.value === 'day') {
    return {
      startDate: format(currentDate.value, 'yyyy-MM-dd'),
      endDate: format(currentDate.value, 'yyyy-MM-dd'),
    };
  } else if (filterType.value === 'week') {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate.value, { weekStartsOn: 1 });
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  } else if (filterType.value === 'month') {
    const start = startOfMonth(currentDate.value);
    const end = endOfMonth(currentDate.value);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  } else if (filterType.value === 'year') {
    const start = new Date(currentDate.value.getFullYear(), 0, 1);
    const end = new Date(currentDate.value.getFullYear(), 11, 31);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }
  // Default to week
  const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate.value, { weekStartsOn: 1 });
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
});

// Apollo queries
const { result: employeesResult, loading: employeesLoading } = useQuery(GET_EMPLOYEES);
const { result: projectsResult, loading: projectsLoading } = useQuery(GET_PROJECTS_FOR_EMPLOYEE, { idEmploye: EMPLOYEE_ID });
const { result: tasksResult, loading: tasksLoading } = useQuery(GET_TACHES);
const { result: timeEntriesResult, loading: timeEntriesLoading, refetch: refetchTimeEntries } = useQuery(
  SUIVIS_DE_TEMP,
  () => ({
    filters: {
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
    }
  }),
  { fetchPolicy: 'cache-and-network' }
);

// Computed properties for backend data
const employees = computed(() =>
  employeesResult.value?.employees?.employees?.map(emp => ({
    ...emp,
    avatar: emp.nomEmployee?.split(' ').map(n => n[0]).join(''),
    capacity: emp.capacity || 40
  })) || []
);

const projects = computed(() =>
  projectsResult.value?.getProjetsForEmployee || []
);

const tasks = computed(() =>
  tasksResult.value?.taches || []
);

const timeEntries = computed(() =>
  timeEntriesResult.value?.suivisDeTemp || []
);

// Optionally, refetch time entries when filterType or currentDate changes
watch([filterType, currentDate], () => {
  refetchTimeEntries();
});

watch([employeesResult, projectsResult, tasksResult, timeEntriesResult], ([emp, proj, task, time]) => {
  if (emp?.error || proj?.error || task?.error || time?.error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load data from server.', life: 5000 });
  }
});

const displayedDays = computed(() => {
  switch (filterType.value) {
    case 'day':
      return [{
        label: format(currentDate.value, 'EEE'),
        date: currentDate.value,
        isToday: isToday(currentDate.value)
      }];
    case 'week':
      const weekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return {
          label: format(date, 'EEE'),
          date,
          isToday: isToday(date),
          isWeekend: [0, 6].includes(date.getDay())
        };
      });
    case 'month':
      const monthStart = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
      const daysInMonth = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const date = addDays(monthStart, i);
        return {
          label: format(date, 'd'),
          date,
          isToday: isToday(date),
          isCurrentMonth: isSameMonth(date, currentDate.value)
        };
      });
    case 'year':
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentDate.value.getFullYear(), i, 1);
        return {
          label: format(date, 'MMM'),
          date,
          isCurrentMonth: isSameMonth(date, currentDate.value)
        };
      });
    default:
      return [];
  }
});

const navigatePeriod = (direction: number) => {
  if (filterType.value === 'day') {
    currentDate.value = addDays(currentDate.value, direction);
  } else if (filterType.value === 'week') {
    currentDate.value = addWeeks(currentDate.value, direction);
  } else if (filterType.value === 'month') {
    currentDate.value = addMonths(currentDate.value, direction);
  } else if (filterType.value === 'year') {
    currentDate.value = new Date(currentDate.value.getFullYear() + direction, 0, 1);
  }
};

const periodLabel = computed(() => {
  if (filterType.value === 'day') {
    return format(currentDate.value, 'MMM d, yyyy');
  } else if (filterType.value === 'week') {
    const days = displayedDays.value;
    return `${format(days[0].date, 'MMM d')} - ${format(days[days.length - 1].date, 'MMM d, yyyy')}`;
  } else if (filterType.value === 'month') {
    return format(currentDate.value, 'MMMM yyyy');
  } else if (filterType.value === 'year') {
    return format(currentDate.value, 'yyyy');
  }
  return '';
});

const getProject = (taskId: string) => {
  const task = tasks.value.find(t => t.idTache === taskId);
  return projects.value.find(p => p.idProjet === task?.idProjet);
};

const getTask = (taskId: string) => tasks.value.find(t => t.idTache === taskId);

const getEmployee = (employeeId: string) => employees.value.find(e => e.idEmployee === employeeId);

const getEntryColor = (entry: TimeEntry) => '#888';

const filteredEntries = computed(() => {
  if (!selectedProject.value) return timeEntries.value;
  const projectTasks = tasks.value.filter(t => t.idProjet === selectedProject.value.idProjet).map(t => t.idTache);
  return timeEntries.value.filter(e => projectTasks.includes(e.tache.idTache));
});

const timelineEntries = computed(() => {
  return filteredEntries.value.sort((a, b) => new Date(a.heure_debut_suivi).getTime() - new Date(b.heure_debut_suivi).getTime());
});

const openDetails = (entry: TimeEntry) => {
  selectedEntry.value = entry;
  showDetails.value = true;
};

const formatEntryTime = (entry: TimeEntry) => {
  const start = format(new Date(entry.heure_debut_suivi), 'HH:mm');
  const end = entry.heure_fin_suivi
    ? format(new Date(entry.heure_fin_suivi), 'HH:mm')
    : 'In Progress';
  return `${start} - ${end}`;
};

const formatDuration = (seconds: number) => {
  if (!seconds) return '0s';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60) % 60;
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}h ${mins}m`
    : mins > 0
      ? `${mins}m`
      : `${secs}s`;
};

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'in-progress': return 'info';
    case 'planned': return 'warning';
    default: return 'info';
  }
};

const getTotalHours = (employeeId: string) => {
  return filteredEntries.value
    .filter(e => e.employee.idEmployee === employeeId)
    .reduce((sum, e) => sum + e.duree_suivi, 0)
    .toFixed(1);
};
/** const getTotalHours = (employeeId: string) => {
  const totalSeconds = filteredEntries.value
    .filter(e => e.employee.idEmployee === employeeId)
    .reduce((sum, e) => sum + e.duree_suivi, 0);
  return formatDuration(totalSeconds);
};*/

const getEmployeeDayHours = (employeeId: string, day: Date) => {
  return filteredEntries.value
    .filter(e => e.employee.idEmployee === employeeId && format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
    .reduce((sum, e) => {
      // If entry is active, use live duration
      if (!e.heure_fin_suivi) {
        const start = new Date(e.heure_debut_suivi).getTime();
        const liveSeconds = Math.floor((now.value - start) / 1000);
        return sum + liveSeconds;
      }
      return sum + e.duree_suivi;
    }, 0);
};

const employeeUtilization = (employeeId: string) => {
  const totalHours = Number(getTotalHours(employeeId));
  const capacity = employees.value.find(e => e.idEmployee === employeeId)?.capacity || 40;
  return Math.min((totalHours / capacity) * 100, 100);
};

const startDrag = (entry: TimeEntry, event: DragEvent) => {
  draggingEntry.value = entry;
  event.dataTransfer?.setData('text/plain', entry.idsuivi);
};

const onDrop = (date: Date, employeeId: string) => {
  if (!draggingEntry.value) return;
  const duration = draggingEntry.value.duree_suivi;
  const newEntry = {
    ...draggingEntry.value,
    heure_debut_suivi: set(date, { 
      hours: new Date(draggingEntry.value.heure_debut_suivi).getHours(),
      minutes: new Date(draggingEntry.value.heure_debut_suivi).getMinutes()
    }).toISOString(),
    heure_fin_suivi: addMinutes(set(date, { 
      hours: new Date(draggingEntry.value.heure_debut_suivi).getHours(),
      minutes: new Date(draggingEntry.value.heure_debut_suivi).getMinutes()
    }), duration * 60).toISOString(),
    employee: {
      ...draggingEntry.value.employee,
      idEmployee: employeeId
    }
  };
  timeEntries.value = timeEntries.value
    .filter(e => e.idsuivi !== draggingEntry.value?.idsuivi)
    .concat(newEntry);
  draggingEntry.value = null;
};

const getProjectMonthWidth = (projectId: string, monthDate: Date) => {
  const total = filteredEntries.value.filter(e => isSameMonth(new Date(e.heure_debut_suivi), monthDate)).length;
  if (total === 0) return '0%';
  const projectCount = filteredEntries.value.filter(
    e => e.tache.projet?.nom_projet === getProject(projectId)?.nom_projet && isSameMonth(new Date(e.heure_debut_suivi), monthDate)
  ).length;
  return `${(projectCount / total) * 100}%`;
};

const getWeeklyHours = () => {
  const weekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate.value, { weekStartsOn: 1 });
  
  return filteredEntries.value
    .filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { start: weekStart, end: weekEnd }))
    .reduce((sum, e) => sum + e.duree_suivi, 0)
    .toFixed(1);
};

const getMonthHours = () => {
  const monthStart = startOfMonth(currentDate.value);
  const monthEnd = endOfMonth(currentDate.value);
  
  return filteredEntries.value
    .filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { start: monthStart, end: monthEnd }))
    .reduce((sum, e) => sum + e.duree_suivi, 0)
    .toFixed(1);
};

const getDailyAverage = () => {
  const hours = Number(getWeeklyHours());
  return (hours / 5).toFixed(1); // Assuming 5 working days
};

const goToThisWeek = () => {
  currentDate.value = startOfWeek(new Date(), { weekStartsOn: 1 });
};

const getProgressClass = (hours: number) => {
  if (hours < 20) return 'low-progress';
  if (hours < 35) return 'medium-progress';
  return 'high-progress';
};

const getUtilizationClass = (utilization: number) => {
  if (utilization < 50) return 'low-utilization';
  if (utilization < 80) return 'medium-utilization';
  return 'high-utilization';
};

const close = () => {
  visible.value = false;
};

const save = () => {
  saving.value = true;
  setTimeout(() => {
    timeEntries.value.push({ ...entry.value });
    saving.value = false;
    visible.value = false;
  }, 1000);
};

const filteredTasks = computed(() => {
  if (!entry.value.tache.idProjet) return [];
  return tasks.value.filter(task => task.idProjet === entry.value.tache.idProjet);
});

const searchQuery = ref('');
const debouncedSearch = ref('');
watch(searchQuery, debounce((val) => {
  debouncedSearch.value = val;
}, 300));

const searchResults = computed(() => {
  if (!debouncedSearch.value) return filteredEntries.value;
  const query = debouncedSearch.value.toLowerCase();
  return filteredEntries.value.filter(entry =>
    entry.tache.titreTache.toLowerCase().includes(query) ||
    entry.tache.projet?.nom_projet.toLowerCase().includes(query) ||
    entry.description?.toLowerCase().includes(query)
  );
});

const getActiveEntryId = (employeeId: string) => {
  const active = timeEntries.value.find(
    e => e.employee.idEmployee === employeeId && !e.heure_fin_suivi
  );
  return active ? active.idsuivi : null;
};

const now = ref(Date.now());
let intervalId: number | undefined;

onMounted(() => {
  intervalId = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

const getLiveDuration = (entry: TimeEntry) => {
  if (entry.heure_fin_suivi) return entry.duree_suivi;
  // If still running, calculate duration up to now
  const start = new Date(entry.heure_debut_suivi).getTime();
  return Math.floor((now.value - start) / 1000);
};
</script>

<template>
  <div class="calendar-root-pro">
    <!-- Header -->
    <div class="calendar-header-pro">
      <div class="calendar-header-left">
        <i class="pi pi-calendar calendar-icon"></i>
        <span class="calendar-title-pro">Team Timesheet</span>
        <Dropdown
          v-model="selectedProject"
          :options="projects"
          optionLabel="nom_projet"
          placeholder="All Projects"
          class="project-filter-pro"
        >
          <template #value="slotProps">
            <span v-if="slotProps.value" class="project-badge-pro">
              <i class="pi pi-briefcase mr-2"></i>
              {{ slotProps.value.nom_projet }}
            </span>
          </template>
        </Dropdown>
      </div>
      <div class="calendar-header-center">
        <SelectButton
          v-model="filterType"
          :options="FILTER_TYPES"
          optionLabel="label"
          optionValue="value"
          class="filter-buttons-pro"
        />
        <div class="period-navigation-pro">
          <Button icon="pi pi-chevron-left" @click="navigatePeriod(-1)" class="p-button-rounded p-button-text" />
          <span class="period-label-pro">{{ periodLabel }}</span>
          <Button icon="pi pi-chevron-right" @click="navigatePeriod(1)" class="p-button-rounded p-button-text" />
        </div>
      </div>
      

      <!-- Quick Navigation -->
      <div class="quick-nav-pro">
        <Button 
          label="Today" 
          icon="pi pi-calendar" 
          @click="currentDate = new Date()" 
          class="p-button-sm" 
        />
        <Button 
          label="This Week" 
          icon="pi pi-calendar-plus" 
          @click="goToThisWeek" 
          class="p-button-sm" 
        />
      </div>
    </div>

    <div class="calendar-body-pro">
      <!-- Sidebar: Employees -->
      <aside class="calendar-sidebar-pro">
        <div class="sidebar-header-pro">Team</div>
        <div v-if="employeesLoading" class="flex justify-center my-8">
          <ProgressBar mode="indeterminate" style="height: 6px" />
        </div>
        <div v-else-if="employees.length === 0" class="text-center text-muted">No employees found.</div>
        <div v-else v-for="emp in employees" :key="emp.idEmployee" class="sidebar-employee-pro">
          <Avatar :label="emp.avatar" shape="circle" size="large" class="emp-avatar-pro" />
          <div class="emp-info-pro">
            <div class="emp-name-pro">{{ emp.nomEmployee }}</div>
            <div class="emp-role-pro">{{ emp.role }}</div>
            <div class="emp-hours-pro">
              <i class="pi pi-clock"></i>
              <span>{{ getTotalHours(emp.idEmployee) }}h</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Calendar Grid -->
      <section class="calendar-main-pro">
        <div v-if="timeEntriesLoading || projectsLoading || tasksLoading" class="flex justify-center my-8">
          <ProgressBar mode="indeterminate" style="height: 6px" />
        </div>
        <template v-else>
          <!-- Days Header -->
          <div class="calendar-days-row-pro">
            <div class="calendar-cell-pro calendar-cell-header-pro"></div>
            <div
              v-for="day in displayedDays"
              :key="day.label + day.date"
              class="calendar-cell-pro calendar-cell-header-pro"
              :class="{ today: day.isToday, weekend: [0,6].includes(day.date.getDay()) }"
            >
              <span class="day-label-pro">{{ day.label }}</span>
              <span class="calendar-date-pro">{{ format(day.date, filterType === 'month' ? 'EEE' : 'dd/MM') }}</span>
            </div>
          </div>
          <!-- Employee Rows -->
          <div v-for="emp in employees" :key="emp.idEmployee" class="calendar-row-pro">
            <div class="calendar-cell-pro calendar-cell-emp-pro">
              <Avatar :label="emp.avatar" shape="circle" size="large" />
            </div>
            <div
              v-for="day in displayedDays"
              :key="day.label + day.date"
              class="calendar-cell-pro calendar-cell-day-pro"
              :class="{ today: day.isToday }"
              @drop="onDrop(day.date, emp.idEmployee)"
              @dragover.prevent
            >
              <div class="cell-entries-pro">
                <!-- Daily total badge -->
                <div v-if="filterType === 'month'" class="month-cell-content">
                  <div class="month-day-hours">
                    <Tag :value="formatDuration(getEmployeeDayHours(emp.idEmployee, day.date))" severity="info" />
                  </div>
                  <div class="month-day-tasks">
                    <span v-for="entry in filteredEntries.filter(
                      (e) => e.employee.idEmployee === emp.idEmployee && format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                    )" :key="entry.idsuivi" class="mini-task-dot"></span>
                  </div>
                </div>
                <div v-if="getEmployeeDayHours(emp.idEmployee, day.date) > 0" class="day-hours-badge-pro">
                  <Tag :value="formatDuration(Number(getEmployeeDayHours(emp.idEmployee, day.date)))" severity="info" />
                </div>
                <!-- Entries -->
                <div
                  v-for="entry in filteredEntries.filter(
                    (e) => e.employee.idEmployee === emp.idEmployee && format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                  )"
                  :key="entry.idsuivi"
                  class="entry-block-pro"
                  :class="{ 'active-entry-pro': entry.idsuivi === getActiveEntryId(emp.idEmployee) }"
                  @click="openDetails(entry)"
                  @dragstart="startDrag(entry, $event)"
                  draggable="true"
                  tabindex="0"
                >
                  <div class="entry-title-pro">
                    {{ entry.tache.titreTache }}
                    <Tag v-if="entry.idsuivi === getActiveEntryId(emp.idEmployee)" value="Current" severity="warning" style="margin-left: 0.5rem;" />
                  </div>
                  <div class="entry-time-pro">{{ formatEntryTime(entry) }}</div>
                  <Tag
                    :value="formatDuration(entry.idsuivi === getActiveEntryId(emp.idEmployee) ? getLiveDuration(entry) : entry.duree_suivi)"
                    :severity="entry.idsuivi === getActiveEntryId(emp.idEmployee) ? 'warning' : 'info'"
                  />
                </div>
                <div v-if="filteredEntries.filter(
                    (e) => e.employee.idEmployee === emp.idEmployee && format(new Date(e.heure_debut_suivi), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                  ).length === 0" class="no-entry-pro">
                  <span class="no-entry-text-pro">—</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- Entry Details Dialog -->
    <Dialog v-model:visible="showDetails" header="Entry Details" modal class="entry-details-dialog-pro">
      <div v-if="selectedEntry" class="entry-details-content-pro">
        <div class="details-header-pro flex items-center gap-3 mb-3">
          <Avatar
            :label="selectedEntry.employee.nomEmployee.split(' ').map(n => n[0]).join('')"
            size="large"
            shape="circle"
          />
          <div>
            <div class="font-bold text-lg">{{ selectedEntry.employee.nomEmployee }}</div>
            <div class="text-muted text-sm">{{ selectedEntry.employee.emailEmployee }}</div>
          </div>
        </div>
        <div class="details-section-pro">
          <i class="pi pi-briefcase mr-2 text-primary"></i>
          <b>Project:</b>
          <span class="ml-1">{{ selectedEntry.tache.projet?.nom_projet || '—' }}</span>
        </div>
        <div class="details-section-pro">
          <i class="pi pi-check-square mr-2 text-primary"></i>
          <b>Task:</b>
          <span class="ml-1">{{ selectedEntry.tache.titreTache }}</span>
        </div>
        <div class="details-section-pro">
          <i class="pi pi-clock mr-2 text-primary"></i>
          <b>Time:</b>
          <span class="ml-1">{{ formatEntryTime(selectedEntry) }}</span>
        </div>
        <div class="details-section-pro">
          <i class="pi pi-hourglass mr-2 text-primary"></i>
          <b>Duration:</b>
          <Tag
            :value="formatDuration(selectedEntry.idsuivi === getActiveEntryId(selectedEntry.employee.idEmployee) ? getLiveDuration(selectedEntry) : selectedEntry.duree_suivi)"
            :severity="selectedEntry.idsuivi === getActiveEntryId(selectedEntry.employee.idEmployee) ? 'warning' : 'info'"
            class="ml-2"
          />
          <span v-if="selectedEntry.idsuivi === getActiveEntryId(selectedEntry.employee.idEmployee)" class="ml-2 text-warning">(Current)</span>
        </div>
        <div class="details-section-pro">
          <i class="pi pi-align-left mr-2 text-primary"></i>
          <b>Description:</b>
          <span class="ml-1">{{ selectedEntry.description || '—' }}</span>
        </div>
      </div>
    </Dialog>

    
    <!-- Stats Section -->
    <div class="calendar-stats-pro">
      <div class="stat-card">
        <div class="stat-label">Weekly Hours</div>
        <div class="stat-value">{{ getWeeklyHours() }}h</div>
        <ProgressBar 
          :value="(getWeeklyHours() / 40) * 100" 
          :class="getProgressClass(getWeeklyHours())" 
        />
      </div>
      <div class="stat-card">
        <div class="stat-label">Month to Date</div>
        <div class="stat-value">{{ getMonthHours() }}h</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Daily Average</div>
        <div class="stat-value">{{ getDailyAverage() }}h</div>
      </div>
    </div>

    <!-- Workload Chart -->
    <div class="workload-chart">
      <div v-for="emp in employees" :key="emp.idEmployee" class="workload-bar">
        <div class="bar-label">{{ emp.nomEmployee }}</div>
        <ProgressBar 
          :value="employeeUtilization(emp.idEmployee)" 
          :class="getUtilizationClass(employeeUtilization(emp.idEmployee))"
        />
        <div class="bar-value">{{ getTotalHours(emp.idEmployee) }}h / {{ emp.capacity }}h</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Colors
$sidebar-bg: #f8fafc;
$main-bg: #fff;
$header-bg: #f4f6fb;
$border: #e5e7eb;
$today-bg: #e0e7ff;
$entry-hover: #f1f5f9;
$primary: var(--primary-color, #6366f1);

.calendar-root-pro {
  min-height: 100vh;
  background: $sidebar-bg;
  padding: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
}

.calendar-header-pro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $header-bg;
  padding: 1.5rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid $border;
  gap: 2rem;

  .calendar-header-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;

    .calendar-icon {
      font-size: 2rem;
      color: $primary;
    }
    .calendar-title-pro {
      font-size: 1.6rem;
      font-weight: 700;
      color: $primary;
      letter-spacing: -1px;
    }
    .project-filter-pro {
      min-width: 180px;
    }
    .project-badge-pro {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      color: #fff;
      font-weight: 600;
    }
  }

  .calendar-header-center {
    display: flex;
    align-items: center;
    gap: 2rem;

    .filter-buttons-pro {
      .p-button {
        min-width: 80px;
        font-weight: 600;
      }
    }
    .period-navigation-pro {
      display: flex;
      align-items: center;
      gap: 1rem;
      .period-label-pro {
        font-weight: 600;
        min-width: 180px;
        text-align: center;
        font-size: 1.1rem;
        color: $primary;
      }
    }
  }

  .calendar-header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .quick-nav-pro {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    justify-content: flex-end; // Align to the right
  }
}

.calendar-body-pro {
  display: flex;
  gap: 0;
  min-height: 80vh;
}

.calendar-sidebar-pro {
  width: 260px;
  background: $sidebar-bg;
  border-right: 1px solid $border;
  padding: 2rem 1.5rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  .sidebar-header-pro {
    font-weight: 700;
    color: $primary;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    letter-spacing: 0.5px;
  }

  .sidebar-employee-pro {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    .emp-avatar-pro {
      border: 2px solid $primary;
    }
    .emp-info-pro {
      .emp-name-pro {
        font-weight: 600;
        font-size: 1.05rem;
      }
      .emp-role-pro {
        font-size: 0.92rem;
        color: #64748b;
      }
      .emp-hours-pro {
        font-size: 0.92rem;
        color: $primary;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        margin-top: 0.2rem;
      }
    }
  }
}

.calendar-main-pro {
  flex: 1;
  background: $main-bg;
  padding: 2rem 2rem 2rem 1.5rem;
  overflow-x: auto;
  border-radius: 0 0.5rem 0.5rem 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.calendar-days-row-pro {
  display: flex;
  .calendar-cell-header-pro {
    flex: 1;
    text-align: center;
    font-weight: 700;
    color: #64748b;
    padding: 0.5rem 0;
    background: transparent;
    border-bottom: 2px solid $border;
    &.today {
      color: $primary;
      border-bottom: 2px solid $primary;
      background: $today-bg;
    }
    .day-label-pro {
      font-size: 1.08rem;
    }
    .calendar-date-pro {
      display: block;
      font-size: 0.85rem;
      color: #94a3b8;
    }
  }
  .calendar-cell-pro {
    min-width: 120px;
  }
}

.calendar-row-pro {
  display: flex;
  min-height: 90px;
  .calendar-cell-pro {
    flex: 1;
    min-width: 120px;
    min-height: 90px;
    border-bottom: 1px solid $border;
    background: transparent;
    position: relative;
    &.calendar-cell-emp-pro {
      min-width: 60px;
      background: $sidebar-bg;
      border-right: 1px solid $border;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    &.today {
      background: $today-bg;
    }
  }
  .cell-entries-pro {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0.25rem 0.25rem 0.25rem;
    min-height: 80px;
    .day-hours-badge-pro {
      margin-bottom: 0.2rem;
      .p-tag {
        font-size: 0.95rem;
        font-weight: 600;
        background: $primary;
        color: #fff;
      }
    }
    .entry-block-pro {
      background: #fff;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      border-left: 4px solid $primary;
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      margin-bottom: 0.1rem;
      outline: none;
      &:hover, &:focus {
        background: $entry-hover;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        transform: translateY(-2px) scale(1.02);
      }
      .entry-title-pro {
        font-weight: 600;
        font-size: 1.01rem;
        color: $primary;
      }
      .entry-time-pro {
        font-size: 0.93rem;
        color: #64748b;
      }
    }
    .no-entry-pro {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 2.2rem;
      .no-entry-text-pro {
        color: #cbd5e1;
        font-size: 1.5rem;
        font-weight: 400;
      }
    }
  }
}

.calendar-cell-header-pro,
.calendar-cell-day-pro {
  &.weekend {
    background: #f3f4f6;
    color: #a1a1aa;
  }
}

.time-grid-pro {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;

  .time-slot {
    height: 30px; // 30-minute slots
    border-bottom: 1px dashed rgba(100,116,139,0.1);
  }

  .hour-marker {
    position: absolute;
    left: 0;
    font-size: 0.75rem;
    color: #64748b;
    transform: translateY(-50%);
    padding-right: 0.5rem;
  }
}

.calendar-stats-pro {
  display: flex;
  gap: 1.5rem;
  margin: 2rem 0;
  .stat-card {
    flex: 1;
    background: $main-bg;
    border: 1px solid $border;
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    .stat-label {
      font-size: 1rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: $primary;
    }
    .low-progress {
      background-color: #f59e0b;
    }
    .medium-progress {
      background-color: #10b981;
    }
    .high-progress {
      background-color: #6366f1;
    }
  }
}

.workload-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
  .workload-bar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    .bar-label {
      font-weight: 600;
      font-size: 1rem;
      color: #64748b;
    }
    .bar-value {
      font-size: 0.9rem;
      color: #64748b;
    }
    .low-utilization {
      background-color: #f59e0b;
    }
    .medium-utilization {
      background-color: #10b981;
    }
    .high-utilization {
      background-color: #6366f1;
    }
  }
}

.quick-nav-pro {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  justify-content: flex-end; // Align to the right
}

.entry-details-dialog-pro .p-dialog-content {
  background: #f9fafb;
  border-radius: 1rem;
  padding: 2rem 1.5rem;
}
.entry-details-content-pro {
  .details-header-pro {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }
  .details-section-pro {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
    font-size: 1.05rem;
    .text-primary {
      color: var(--primary-color, #6366f1);
    }
    .text-muted {
      color: #64748b;
    }
    .ml-1 { margin-left: 0.25rem; }
    .ml-2 { margin-left: 0.5rem; }
  }
}

@media (max-width: 1100px) {
  .calendar-sidebar-pro {
    display: none;
  }
  .calendar-main-pro {
    padding-left: 2rem;
    border-radius: 0.5rem;
  }
}

@media (max-width: 900px) {
  .calendar-header-pro {
    flex-direction: column;
    gap: 1.2rem;
    align-items: flex-start;
    padding: 1.2rem 1rem;
  }
  .calendar-main-pro {
    padding: 1rem;
  }
}

@media (max-width: 700px) {
  .calendar-main-pro {
    padding: 0.5rem;
  }
  .calendar-header-pro {
    padding: 0.7rem 0.5rem;
  }
}

.active-entry-pro {
  border-left: 4px solid #f59e0b !important;
  background: #fffbe6 !important;
}
</style>