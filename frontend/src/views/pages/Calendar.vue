<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue';
import { 
format, 
addDays, 
startOfWeek, 
endOfWeek, 
addWeeks, 
isToday, 
isSameMonth, 
set, 
addHours, 
differenceInMinutes, 
addMonths, 
addMinutes, 
startOfMonth, 
endOfMonth, 
isWithinInterval, 
differenceInHours, 
isSameDay,
startOfYear,
endOfYear,
startOfDay,
endOfDay
} from 'date-fns';
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
import { GET_EMPLOYEES, GET_PROJECTS, GET_PROJECTS_FOR_EMPLOYEE, GET_TACHES, SUIVIS_DE_TEMP } from '@/graphql';
import debounce from 'lodash-es/debounce';
import { isAdmin } from '@/utils/authUtils';

// Initialize with a default date
const currentDate = ref(new Date());

// Add a loading state
const isLoading = ref(true);

// Add mounted hook to ensure initialization
onMounted(() => {
const now = new Date();
if (!currentDate.value || isNaN(currentDate.value.getTime())) {
currentDate.value = now;
}
isLoading.value = false;
});

const toast = useToast();
const selectedProject = ref<Project | null>(null);
const selectedEmployee = ref<string | null>(null);
const filterType = ref('week');
const selectedEntry = ref<TimeEntry | null>(null);
const draggingEntry = ref<TimeEntry | null>(null);

// Add this with your other refs at the top of the script
const showDetails = ref(false);

// Template for new entries
const entryTemplate = ref<TimeEntry>({
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
];

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

// Split the projects query based on user role
const { result: projectsResult, loading: projectsLoading } = useQuery(
GET_PROJECTS_FOR_EMPLOYEE,
() => ({ idEmploye: EMPLOYEE_ID }),
{
enabled: !isAdmin()
}
);

const { result: adminProjectsResult, loading: adminProjectsLoading } = useQuery(
GET_PROJECTS,
null,
{
enabled: isAdmin()
}
);

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

const projects = computed(() => {
if (isAdmin()) {
return adminProjectsResult.value?.projets || [];
}
return projectsResult.value?.getProjetsForEmployee || [];
}
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

// Reset filters when data changes
watch([employees, projects, tasks], () => {
if (selectedProject.value && !projects.value.find(p => p.idProjet === selectedProject.value?.idProjet)) {
selectedProject.value = null;
}
if (selectedEmployee.value && !employees.value.find(e => e.idEmployee === selectedEmployee.value)) {
selectedEmployee.value = null;
}
});

watch([selectedProject, selectedEmployee], () => {
// This will trigger recomputation of filteredEntries
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

// Add new computed properties
const isNavigating = ref(false);

const isCurrentWeek = computed(() => {
const today = new Date();
const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
const selectedWeekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 });
return isSameDay(currentWeekStart, selectedWeekStart);
});

// Add new methods
const goToToday = () => {
currentDate.value = new Date();
};

// Update navigatePeriod with loading state
const navigatePeriod = async (direction: number) => {
isNavigating.value = true;
try {
if (filterType.value === 'day') {
currentDate.value = addDays(currentDate.value, direction);
} else if (filterType.value === 'week') {
currentDate.value = addWeeks(currentDate.value, direction);
} else if (filterType.value === 'month') {
currentDate.value = addMonths(currentDate.value, direction);
} else if (filterType.value === 'year') {
currentDate.value = new Date(currentDate.value.getFullYear() + direction, 0, 1);
}
await refetchTimeEntries();
} finally {
isNavigating.value = false;
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
let result = [...timeEntries.value];

// Project filter
if (selectedProject.value) {
result = result.filter(entry => {
const projectId = entry.tache?.projet?.idProjet || entry.tache.idProjet;
return projectId === selectedProject.value.idProjet;
});
}

// Employee filter
if (selectedEmployee.value) {
result = result.filter(e => e.employee.idEmployee === selectedEmployee.value);
}

return result;
});

// First, update the computed property for filtered employees
const filteredEmployees = computed(() => {
  let result = [...employees.value];
  
  // If not admin, only show the connected employee
  if (!isAdmin()) {
    result = result.filter(emp => emp.idEmployee === EMPLOYEE_ID);
  }
  
  // If there's a selected employee (for admin only)
  if (isAdmin() && selectedEmployee.value) {
    result = result.filter(emp => emp.idEmployee === selectedEmployee.value);
  }
  
  return result;
});

const timelineEntries = computed(() => {
return filteredEntries.value.sort((a, b) => new Date(a.heure_debut_suivi).getTime() - new Date(b.heure_debut_suivi).getTime());
});

// Update the openDetails function
const openDetails = (entry: TimeEntry) => {
selectedEntry.value = entry;
showDetails.value = true;
};

// Add a close function
const closeDetails = () => {
showDetails.value = false;
selectedEntry.value = null;
};

const formatEntryTime = (entry: TimeEntry) => {
const start = format(new Date(entry.heure_debut_suivi), 'HH:mm');
const end = entry.heure_fin_suivi
? format(new Date(entry.heure_fin_suivi), 'HH:mm')
: 'In Progress';
return `${start} - ${end}`;
};

// Replace the current formatDuration function with the original version
const formatDuration = (seconds: number) => {
if (!seconds) return '0s';
const hours = Math.floor(seconds / 3600);
const mins = Math.floor((seconds % 3600) / 60);
return hours > 0
? `${hours}h ${mins}m`
: mins > 0
? `${mins}m`
: `${seconds}s`;
};


// Update getTotalHours to return seconds instead of formatted string
const getTotalHours = (employeeId: string) => {
return filteredEntries.value
.filter(e => e.employee.idEmployee === employeeId)
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

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

// Update the employeeUtilization function to not limit to 100%
const employeeUtilization = (employeeId: string) => {
const totalHours = Math.floor(getTotalHours(employeeId) / 3600);
const capacity = employees.value.find(e => e.idEmployee === employeeId)?.capacity || 40;
return Math.round((totalHours / capacity) * 100); // Remove the Math.min
};

// Update the getUtilizationClass function
const getUtilizationClass = (utilization: number) => {
if (utilization < 50) return 'low-utilization';
if (utilization < 80) return 'medium-utilization';
if (utilization <= 100) return 'high-utilization';
return 'over-utilization'; // Add this for over 100%
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

// Update getWeeklyHours
// Removed duplicate declaration of getWeeklyHours

// Update getMonthHours
const getMonthHours = () => {
const monthStart = startOfMonth(currentDate.value);
const monthEnd = endOfMonth(currentDate.value);
const totalSeconds = filteredEntries.value
.filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { start: monthStart, end: monthEnd }))
.reduce((sum, e) => sum + e.duree_suivi, 0);
return `${Math.floor(totalSeconds / 3600)}h`;
};

// Update getDailyAverage
const getDailyAverage = () => {
const weekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 });
const weekEnd = endOfWeek(currentDate.value, { weekStartsOn: 1 });
const totalSeconds = filteredEntries.value
.filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { start: weekStart, end: weekEnd }))
.reduce((sum, e) => sum + e.duree_suivi, 0);
return `${Math.floor((totalSeconds / 5) / 3600)}h`; // Assuming 5 working days
};

const goToThisWeek = () => {
currentDate.value = startOfWeek(new Date(), { weekStartsOn: 1 });
};

const getProgressClass = (hours: number) => {
if (hours < 20) return 'low-progress';
if (hours < 35) return 'medium-progress';
return 'high-progress';
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

const hoursInDay = Array.from({ length: 24 }, (_, i) => i);

const getEntryPosition = (entry: TimeEntry) => {
const start = new Date(entry.heure_debut_suivi);
const end = entry.heure_fin_suivi ? new Date() : new Date();
const startMinutes = start.getHours() * 60 + start.getMinutes();
const endMinutes = end.getHours() * 60 + end.getMinutes();
const duration = Math.max(endMinutes - startMinutes, 30); // min 30min block
return {
top: `${(startMinutes / 1440) * 100}%`,
height: `${(duration / 1440) * 100}%`,
isActive: !entry.heure_fin_suivi
};
};

const currentTimePosition = computed(() => {
const nowDate = new Date();
return `${((nowDate.getHours() * 60 + nowDate.getMinutes()) / 1440) * 100}%`;
});

const teams = computed(() => {
const uniqueTeams = new Map();
employees.value.forEach(emp => {
if (emp.equipe?.idEquipe && emp.equipe?.nom_equipe) { // Add null check
uniqueTeams.set(emp.equipe.idEquipe, {
label: emp.equipe.nom_equipe,
value: emp.equipe.idEquipe
});
}
});

return Array.from(uniqueTeams.values());
});

const clearAllFilters = () => {
  selectedProject.value = null;
  if (isAdmin()) {
    selectedEmployee.value = null;
  }
};

const getProjectEntryCount = (projectId: string) => {
return filteredEntries.value.filter(entry => entry.tache.idProjet === projectId).length;
};

const getEmployeeMonthHours = (employeeId: string, monthIdx: number) => {
if (!currentDate.value) return 0;
const year = currentDate.value.getFullYear();
return filteredEntries.value
.filter(e => {
const entryDate = new Date(e.heure_debut_suivi);
return !isNaN(entryDate.getTime()) && 
entryDate.getFullYear() === year &&
entryDate.getMonth() === monthIdx &&
e.employee.idEmployee === employeeId;
})
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

const getMonthHoursSeverity = (hours: number) => {
if (hours < 20 * 3600) return 'danger'; // less than 20h
if (hours < 80 * 3600) return 'warning'; // less than 80h
return 'success';
};

// Add this computed property
const isCalendarReady = computed(() => {
return !isLoading.value && 
currentDate.value && 
filteredEmployees.value.length > 0;
});

// Fix getTotalYearHours function
const getTotalYearHours = () => {
if (!currentDate.value) return 0;
const year = currentDate.value.getFullYear();
return filteredEntries.value
.filter(e => {
const entryDate = new Date(e.heure_debut_suivi);
return !isNaN(entryDate.getTime()) && entryDate.getFullYear() === year;
})
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

// Fix getEmployeeYearHours function
const getEmployeeYearHours = (employeeId: string) => {
if (!currentDate.value) return 0;
const year = currentDate.value.getFullYear();
return filteredEntries.value
.filter(e => {
const entryDate = new Date(e.heure_debut_suivi);
return !isNaN(entryDate.getTime()) && 
entryDate.getFullYear() === year &&
e.employee.idEmployee === employeeId;
})
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

const getAverageMonthHours = () => {
return Math.floor(getTotalYearHours() / 12);
};

const getMonthCellClass = (hours: number) => {
const monthHours = Math.floor(hours / 3600);
if (monthHours === 0) return 'empty-month';
if (monthHours < 80) return 'low-hours';
if (monthHours < 140) return 'medium-hours';
return 'high-hours';
};

const getMonthProgressStyle = (hours: number) => {
const monthHours = Math.floor(hours / 3600);
const percentage = Math.min((monthHours / 160) * 100, 100);
return {
width: `${percentage}%`
};
};

// Update the formatMonth function with better validation
const formatMonth = (monthIndex: number) => {
try {
if (!currentDate.value) {
currentDate.value = new Date();
}
// Create a new date safely
const date = new Date();
date.setFullYear(currentDate.value.getFullYear());
date.setMonth(monthIndex);
date.setDate(1); // Set to first day of month to avoid invalid dates
if (isNaN(date.getTime())) {
console.error('Invalid date created for month:', monthIndex);
return '';
}
return format(date, 'MMM');
} catch (error) {
console.error('Error formatting month:', error);
return '';
}
};

// Add new functions for stats
const getCurrentPeriodHours = () => {
switch (filterType.value) {
case 'day':
return getDailyHours();
case 'week':
return getWeeklyHours();
case 'month':
return getMonthlyHours();
case 'year':
return getYearlyHours();
default:
return 0;
}
};

const getTargetHours = () => {
switch (filterType.value) {
case 'day':
return 8; // 8 hours per day
case 'week':
return 40; // 40 hours per week
case 'month':
return 160; // ~160 hours per month
case 'year':
return 1920; // ~1920 hours per year
default:
return 0;
}
};

const getAverageLabel = computed(() => {
switch (filterType.value) {
case 'day': return 'Hour';
case 'week': return 'Day';
case 'month': return 'Week';
case 'year': return 'Month';
default: return '';
}
});

const getAverageHours = () => {
const total = getCurrentPeriodHours();
if (filterType.value === 'day') {
// Average per hour in the day (not very useful, but for consistency)
return Math.floor(total / 8); // 8 working hours
}
if (filterType.value === 'week') {
// Average per day in the week (Mon-Fri)
return Math.floor(total / 5);
}
if (filterType.value === 'month') {
// Average per week in the month
const monthStart = startOfMonth(currentDate.value);
const monthEnd = endOfMonth(currentDate.value);
// Count number of weeks in the month
const weeks = Math.ceil(
(monthEnd.getDate() - monthStart.getDate() + 1) / 7
);
return weeks > 0 ? Math.floor(total / weeks) : 0;
}
if (filterType.value === 'year') {
// Average per month in the year
return Math.floor(total / 12);
}
return 0;
};

const getStatsSeverity = (hours: number) => {
const target = getTargetHours() * 3600;
const percentage = (hours / target) * 100;
if (percentage < 70) return 'danger';
if (percentage < 90) return 'warning';
return 'success';
};

const getTeamUtilization = () => {
if (!filteredEmployees.value.length) return 0;
return Math.floor(
filteredEmployees.value.reduce((sum, emp) => 
sum + employeeUtilization(emp.idEmployee), 0
) / filteredEmployees.value.length
);
};

const getUtilizationSeverity = (utilization: number) => {
if (utilization < 50) return 'danger';
if (utilization < 80) return 'warning';
return 'success';
};

const getHoursTrend = () => {
// Mock trend calculation - replace with actual trend calculation
return Math.floor(Math.random() * 20) - 10;
};

const getTrendClass = (trend: number) => {
return trend >= 0 ? 'trend-up' : 'trend-down';
};

// Add these time period calculation functions
const getDailyHours = () => {
const dayStart = startOfDay(currentDate.value);
const dayEnd = endOfDay(currentDate.value);
return filteredEntries.value
.filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { 
start: dayStart, 
end: dayEnd 
}))
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

const getWeeklyHours = () => {
const weekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 });
const weekEnd = endOfWeek(currentDate.value, { weekStartsOn: 1 });
return filteredEntries.value
.filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { 
start: weekStart, 
end: weekEnd 
}))
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

const getMonthlyHours = () => {
const monthStart = startOfMonth(currentDate.value);
const monthEnd = endOfMonth(currentDate.value);
return filteredEntries.value
.filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { 
start: monthStart, 
end: monthEnd 
}))
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

const getYearlyHours = () => {
const yearStart = startOfYear(currentDate.value);
const yearEnd = endOfYear(currentDate.value);
return filteredEntries.value
.filter(e => isWithinInterval(new Date(e.heure_debut_suivi), { 
start: yearStart, 
end: yearEnd 
}))
.reduce((sum, e) => sum + e.duree_suivi, 0);
};

const getMonthEntries = (employeeId: string, monthIndex: number) => {
return filteredEntries.value.filter(e => {
const entryDate = new Date(e.heure_debut_suivi);
return !isNaN(entryDate.getTime()) && 
entryDate.getFullYear() === currentDate.value.getFullYear() &&
entryDate.getMonth() === monthIndex &&
e.employee.idEmployee === employeeId;
});
};

// Get hours for the current period for an employee
const getPeriodHours = (employeeId: string) => {
  switch (filterType.value) {
    case 'day':
      return filteredEntries.value
        .filter(e => e.employee.idEmployee === employeeId && isSameDay(new Date(e.heure_debut_suivi), currentDate.value))
        .reduce((sum, e) => sum + e.duree_suivi, 0);
    case 'week':
      const weekStart = startOfWeek(currentDate.value, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate.value, { weekStartsOn: 1 });
      return filteredEntries.value
        .filter(e => e.employee.idEmployee === employeeId && isWithinInterval(new Date(e.heure_debut_suivi), { start: weekStart, end: weekEnd }))
        .reduce((sum, e) => sum + e.duree_suivi, 0);
    case 'month':
      const monthStart = startOfMonth(currentDate.value);
      const monthEnd = endOfMonth(currentDate.value);
      return filteredEntries.value
        .filter(e => e.employee.idEmployee === employeeId && isWithinInterval(new Date(e.heure_debut_suivi), { start: monthStart, end: monthEnd }))
        .reduce((sum, e) => sum + e.duree_suivi, 0);
    case 'year':
      const yearStart = startOfYear(currentDate.value);
      const yearEnd = endOfYear(currentDate.value);
      return filteredEntries.value
        .filter(e => e.employee.idEmployee === employeeId && isWithinInterval(new Date(e.heure_debut_suivi), { start: yearStart, end: yearEnd }))
        .reduce((sum, e) => sum + e.duree_suivi, 0);
    default:
      return 0;
  }
};

// Get workload share (%) for an employee in the current period
const getWorkloadShare = (employeeId: string) => {
  const total = filteredEmployees.value
    .reduce((sum, emp) => sum + getPeriodHours(emp.idEmployee), 0);
  if (total === 0) return 0;
  return (getPeriodHours(employeeId) / total) * 100;
};
</script>

<template>
<div class="calendar-root-pro">
<div v-if="!isCalendarReady" class="flex justify-center my-8">
<ProgressBar mode="indeterminate" style="height: 6px" />
</div>
<template v-else>
<!-- Header -->
<div class="calendar-header-pro">
<!-- Left Section -->
<div class="calendar-header-left">
<i class="pi pi-calendar calendar-icon"></i>
<span class="calendar-title-pro">Team Timesheet</span>
<!-- Combined Filter Group -->
<div class="filter-group">
<!-- Project Filter -->
<Dropdown
v-model="selectedProject"
:options="projects"
optionLabel="nom_projet"
placeholder="All Projects"
class="project-filter-pro"
:disabled="!projects.length"
showClear
>
<template #value="slotProps">
<div class="selected-project" v-if="slotProps.value">
<i class="pi pi-briefcase"></i>
<span>{{ slotProps.value.nom_projet }}</span>
</div>
<div v-else>
<i class="pi pi-briefcase"></i>
<span>All Projects</span>
</div>
</template>
<template #option="slotProps">
<div class="project-option">
<span>{{ slotProps.option.nom_projet }}</span>
<Tag 
:value="getProjectEntryCount(slotProps.option.idProjet)" 
severity="info" 
class="project-count"
/>
</div>
</template>
</Dropdown>

<!-- Employee Filter (only for admins) -->
<Dropdown
v-if="isAdmin()"
v-model="selectedEmployee"
:options="employees"
optionLabel="nomEmployee"
optionValue="idEmployee"
placeholder="All Employees"
class="employee-filter-pro"
:disabled="!employees.length"
showClear
>
<template #value="slotProps">
<div class="selected-employee" v-if="slotProps.value">
<Avatar 
:label="getEmployee(slotProps.value)?.avatar" 
shape="circle" 
size="small" 
/>
<span>{{ getEmployee(slotProps.value)?.nomEmployee }}</span>
</div>
<div v-else>
<i class="pi pi-users"></i>
<span>All Employees</span>
</div>
</template>
</Dropdown>

<!-- Clear Filters Button -->
<Button 
v-if="isAdmin()"
icon="pi pi-filter-slash"
class="p-button-secondary p-button-sm clear-filters-btn" 
@click="clearAllFilters"
:disabled="!selectedProject && !selectedEmployee"
tooltip="Clear all filters"
/>
</div>
</div>

<!-- Center Section -->
<div class="calendar-header-center">
<SelectButton
v-model="filterType"
:options="FILTER_TYPES"
optionLabel="label"
optionValue="value"
class="filter-buttons-pro"
>
<template #option="slotProps">
<i :class="slotProps.option.icon"></i>
<span>{{ slotProps.option.label }}</span>
</template>
</SelectButton>

<div class="period-navigation-pro">
<Button 
icon="pi pi-chevron-left" 
@click="navigatePeriod(-1)" 
class="p-button-rounded p-button-text"
:disabled="isNavigating"
/>
<span class="period-label-pro">{{ periodLabel }}</span>
<Button 
icon="pi pi-chevron-right" 
@click="navigatePeriod(1)" 
class="p-button-rounded p-button-text"
:disabled="isNavigating"
/>
</div>
</div>

<!-- Right Section -->
<div class="quick-nav-pro">
<Button 
label="Today" 
icon="pi pi-calendar" 
@click="goToToday" 
class="p-button-sm" 
:disabled="isToday(currentDate.value)"
/>
<Button 
label="This Week" 
icon="pi pi-calendar-plus" 
@click="goToThisWeek" 
class="p-button-sm"
:disabled="isCurrentWeek"
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
<div v-else v-for="emp in filteredEmployees" :key="emp.idEmployee" class="sidebar-employee-pro">
<Avatar :label="emp.avatar" shape="circle" size="large" class="emp-avatar-pro" />
<div class="emp-info-pro">
<div class="emp-name-pro">{{ emp.nomEmployee }}</div>
<div class="emp-role-pro">{{ emp.role }}</div>
<div class="emp-hours-pro">
<i class="pi pi-clock"></i>
<span>{{ formatDuration(getTotalHours(emp.idEmployee)) }}</span>
</div>
</div>
</div>
</aside>

<!-- Main Calendar Grid -->
<section class="calendar-main-pro">
<!-- Day View -->
<template v-if="filterType === 'day'">
<div class="agenda-day-view">
<div v-for="emp in filteredEmployees" :key="emp.idEmployee" class="agenda-emp-block">
<div class="agenda-emp-header">
<Avatar :label="emp.avatar" shape="circle" size="large" class="emp-avatar-pro" />
<span class="agenda-emp-name">{{ emp.nomEmployee }}</span>
</div>
<div v-if="filteredEntries.filter(e => e.employee.idEmployee === emp.idEmployee && isSameDay(new Date(e.heure_debut_suivi), currentDate)).length === 0" class="agenda-no-entry">
<span>No entries</span>
</div>
<div class="agenda-emp-entries-row">
<div
v-for="entry in filteredEntries
.filter(e => e.employee.idEmployee === emp.idEmployee && isSameDay(new Date(e.heure_debut_suivi), currentDate))
.sort((a, b) => new Date(a.heure_debut_suivi) - new Date(b.heure_debut_suivi))"
:key="entry.idsuivi"
class="agenda-entry-card"
:class="{ 'active-entry-pro': entry.idsuivi === getActiveEntryId(emp.idEmployee) }"
@click="openDetails(entry)"
@dragstart="startDrag(entry, $event)"
draggable="true"
tabindex="0"
>
<div class="agenda-entry-title">
{{ entry.tache.titreTache }}
<Tag
v-if="entry.idsuivi === getActiveEntryId(emp.idEmployee)"
value="Current"
severity="warning"
style="margin-left: 0.5rem;"
/>
</div>
<div class="agenda-entry-time">{{ formatEntryTime(entry) }}</div>
<Tag
:value="formatDuration(entry.idsuivi === getActiveEntryId(emp.idEmployee) ? getLiveDuration(entry) : entry.duree_suivi)"
:severity="entry.idsuivi === getActiveEntryId(emp.idEmployee) ? 'warning' : 'info'"
/>
<div v-if="entry.description" class="agenda-entry-desc">{{ entry.description }}</div>
</div>
</div>
</div>
</div>
</template>

<!-- Year View -->
<template v-else-if="filterType === 'year'">
<div class="calendar-days-row-pro">
<div class="calendar-cell-pro calendar-cell-header-pro"></div>
<div
v-for="month in displayedDays"
:key="month.label"
class="calendar-cell-pro calendar-cell-header-pro"
:class="{ today: month.isCurrentMonth }"
>
<span class="day-label-pro">{{ month.label }}</span>
</div>
</div>

<!-- Employee Rows -->
<div v-for="emp in filteredEmployees" :key="emp.idEmployee" class="calendar-row-pro">
<div class="calendar-cell-pro calendar-cell-emp-pro">
<Avatar :label="emp.avatar" shape="circle" size="large" />
</div>
<div
v-for="(month, index) in displayedDays"
:key="month.label"
class="calendar-cell-pro calendar-cell-day-pro"
:class="[
getMonthCellClass(getEmployeeMonthHours(emp.idEmployee, index)),
{ today: month.isCurrentMonth }
]"
>
<div class="cell-entries-pro">
<div class="month-cell-content">
<div class="month-total">
<Tag 
:value="formatDuration(getEmployeeMonthHours(emp.idEmployee, index))"
:severity="getMonthHoursSeverity(getEmployeeMonthHours(emp.idEmployee, index))"
/>
</div>
<div class="month-progress">
<ProgressBar 
:value="((getEmployeeMonthHours(emp.idEmployee, index) / (160 * 3600)) * 100).toFixed(2)"
:class="getMonthCellClass(getEmployeeMonthHours(emp.idEmployee, index))"
/>
</div>
</div>
</div>
</div>
</div>
</template>

<!-- Week/Month View -->
<template v-else>
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
<div v-for="emp in filteredEmployees" :key="emp.idEmployee" class="calendar-row-pro">
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
</template>
</section>
</div>

<!-- Entry Details Dialog -->
<Dialog 
v-model:visible="showDetails" 
header="Entry Details" 
modal 
:closable="true"
@hide="closeDetails"
class="entry-details-dialog-pro"
>
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
<div class="stats-dashboard">
<!-- Summary Stats -->
<div class="calendar-stats-pro">
<div class="stat-card">
<div class="stat-header">
<div class="stat-label">
<i class="pi pi-clock"></i>
<span>{{ filterType === 'week' ? 'Weekly' : filterType === 'month' ? 'Monthly' : filterType === 'year' ? 'Yearly' : 'Daily' }} Hours</span>
</div>
<Tag :severity="getStatsSeverity(getCurrentPeriodHours())" />
</div>
<div class="stat-value">{{ formatDuration(getCurrentPeriodHours()) }}</div>
<ProgressBar 
:value="((getCurrentPeriodHours() / (getTargetHours() * 3600)) * 100).toFixed(2)" 
:class="getProgressClass(getCurrentPeriodHours() / 3600)" 
/>
<div class="stat-footer">
<!--Target: {{ formatDuration(getTargetHours() * 3600) }}-->
</div>
</div>

<div class="stat-card">
<div class="stat-header">
<div class="stat-label">
<i class="pi pi-chart-line"></i>
<span>Average per {{ getAverageLabel }}</span>
</div>
</div>
<div class="stat-value">{{ formatDuration(getAverageHours()) }}</div>
<div class="stat-trend" :class="getTrendClass(getHoursTrend())">
<i :class="getHoursTrend() > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
{{ Math.abs(getHoursTrend()) }}% vs previous period
</div>
</div>

<div class="stat-card">
<div class="stat-header">
<div class="stat-label">
<i class="pi pi-users"></i>
<span>Team Utilization</span>
</div>
<Tag :severity="getUtilizationSeverity(getTeamUtilization())">
{{ getTeamUtilization() }}%
</Tag>
</div>
<ProgressBar 
:value="getTeamUtilization()" 
:class="getUtilizationClass(getTeamUtilization())"
/>
</div>


</div>

<!-- Workload Chart -->
<div class="workload-chart">
<div class="chart-header">
<h3>Team Workload Distribution</h3>
<div class="chart-legend">
<span class="legend-item"><i class="pi pi-circle-fill low"></i> Under Utilized</span>
<span class="legend-item"><i class="pi pi-circle-fill medium"></i> Optimal</span>
<span class="legend-item"><i class="pi pi-circle-fill high"></i> Normal</span>
<span class="legend-item"><i class="pi pi-circle-fill over"></i> Over Utilized</span>
</div>
</div>
<div class="workload-bars">
<div v-for="emp in filteredEmployees" :key="emp.idEmployee" class="workload-bar">
<div class="bar-header">
<div class="bar-label">
<Avatar :label="emp.avatar" shape="circle" size="small" />
<span>{{ emp.nomEmployee }}</span>
</div>
<Tag :severity="getUtilizationSeverity(employeeUtilization(emp.idEmployee))">
{{ employeeUtilization(emp.idEmployee) }}%
</Tag>
</div>
<ProgressBar 
:value="employeeUtilization(emp.idEmployee)" 
:class="getUtilizationClass(employeeUtilization(emp.idEmployee))"
/>
<div class="bar-footer">
<span>{{ formatDuration(getTotalHours(emp.idEmployee)) }}</span>
<span class="divider">/</span>
<span class="target">
{{
formatDuration(
filterType === 'day'
? (emp.capacity / 5) * 3600
: filterType === 'week'
? emp.capacity * 3600
: filterType === 'month'
? emp.capacity * 4 * 3600
: filterType === 'year'
? emp.capacity * 52 * 3600
: emp.capacity * 3600
)
}}
</span>
</div>
</div>
</div>
</div>
</div>
</template>
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
min-width: 200px;
:deep(.project-option) {
display: flex;
align-items: center;
justify-content: space-between;
gap: 1rem;
.project-count {
font-size: 0.8rem;
padding: 0.2rem 0.5rem;
}
}
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
:deep(.p-selectbutton) {
border-radius: 8px;
overflow: hidden;
.p-button {
display: flex;
align-items: center;
gap: 0.5rem;
padding: 0.5rem 1rem;
i {
font-size: 1rem;
}
&.p-highlight {
background: var(--primary-color);
border-color: var(--primary-color);
}
}
}
}
.period-navigation-pro {
background: #f8fafc;
padding: 0.5rem;
border-radius: 8px;
display: flex;
align-items: center;
gap: 0.5rem;
.period-label-pro {
min-width: 180px;
text-align: center;
font-weight: 600;
color: var(--primary-color);
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

.agenda-day-view {
display: flex;
flex-direction: column;
gap: 2rem;
padding: 2rem 0;
}
.agenda-emp-block {
background: #fff;
border-radius: 10px;
box-shadow: 0 2px 8px rgba(0,0,0,0.04);
padding: 1.5rem;
border: 1px solid #e5e7eb; // Add this line for consistency
}
.agenda-emp-header {
display: flex;
align-items: center;
gap: 0.7rem;
font-weight: 600;
margin-bottom: 1rem;
font-size: 1.1rem;
}
.agenda-no-entry {
color: #cbd5e1;
font-size: 1.1rem;
margin-bottom: 1rem;
}
.agenda-emp-entries-row {
display: flex;
flex-direction: row;
gap: 1rem;
flex-wrap: wrap;
margin-bottom: 1rem;
}
.agenda-entry-card {
min-width: 220px;
max-width: 260px;
flex: 1 1 220px;
background: #f8fafc;
border-left: 4px solid #6366f1;
border-radius: 6px;
margin-bottom: 1rem;
padding: 0.7rem 1rem;
cursor: pointer;
transition: box-shadow 0.2s, background 0.2s;
&:hover, &:focus {
background: #e0e7ff;
box-shadow: 0 4px 16px rgba(99,102,241,0.10);
}
.agenda-entry-title {
font-weight: 600;
color: #6366f1;
margin-bottom: 0.2rem;
}
.agenda-entry-time {
font-size: 0.93rem;
color: #64748b;
margin-bottom: 0.3rem;
}
.agenda-entry-desc {
font-size: 0.92rem;
color: #64748b;
margin-top: 0.3rem;
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

.timeline-view {
display: grid;
grid-template-columns: 72px 1fr;
height: 80vh;
min-height: 600px;
position: relative;
background: #fff;
border-radius: 12px;
box-shadow: 0 4px 24px rgba(0,0,0,0.05);
}

.time-column {
padding: 0 1rem;
height: 60px;
font-size: 0.95rem;
color: #64748b;
display: flex;
align-items: flex-start;
position: relative;
&::after {
content: '';
position: absolute;
left: 0;
right: 0;
bottom: 0;
border-bottom: 1px solid #e2e8f0;
}
}

.day-columns {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
gap: 1px;
background: #e2e8f0;
position: relative;
}

.day-column {
background: #fff;
position: relative;
min-height: 1440px;
border-right: 1px solid #e2e8f0;
&:last-child { border-right: none; }
}

.current-time-indicator {
position: absolute;
left: 0;
right: 0;
height: 2px;
background: #ef4444;
z-index: 2;
&::before {
content: '';
position: absolute;
left: -6px;
top: -3px;
width: 10px;
height: 10px;
background: #ef4444;
border-radius: 50%;
border: 2px solid #fff;
}
}

.timeline-entry {
position: absolute;
left: 8px;
right: 8px;
background: #f1f5f9;
border-left: 4px solid #6366f1;
border-radius: 6px;
padding: 0.7rem 1rem;
cursor: pointer;
transition: box-shadow 0.2s, transform 0.2s;
box-shadow: 0 2px 8px rgba(0,0,0,0.06);
z-index: 3;
&:hover {
background: #e0e7ff;
box-shadow: 0 4px 16px rgba(99,102,241,0.10);
transform: translateY(-2px) scale(1.01);
}
&.active-entry {
background: #fffbe6;
border-color: #f59e0b;
}
}

.entry-content {
.entry-title {
font-weight: 600;
color: #6366f1;
margin-bottom: 0.2rem;
}
.entry-time {
font-size: 0.93rem;
color: #64748b;
margin-bottom: 0.3rem;
}
.p-tag {
font-size: 0.85rem;
padding: 0.2rem 0.7rem;
border-radius: 1rem;
}
}

@media (max-width: 900px) {
.timeline-view {
grid-template-columns: 48px 1fr;
}
.day-columns {
grid-template-columns: 1fr;
}
}

.calendar-stats-pro {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 1.5rem;
.stat-card {
background: white;
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
.stat-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 1rem;
.stat-label {
display: flex;
align-items: center;
gap: 0.5rem;
color: #64748b;
font-size: 0.95rem;
i {
color: var(--primary-color);
}
}
}
.stat-value {
font-size: 2rem;
font-weight: 700;
color: #1e293b;
margin-bottom: 1rem;
}
.stat-footer {
margin-top: 0.5rem;
font-size: 0.9rem;
color: #64748b;
}
.stat-trend {
display: flex;
align-items: center;
gap: 0.5rem;
font-size: 0.9rem;
&.trend-up {
color: #10b981;
}
&.trend-down {
color: #ef4444;
}
}
}
}

.workload-chart {
background: white;
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
.chart-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 2rem;
h3 {
font-size: 1.2rem;
color: #1e293b;
font-weight: 600;
}
.chart-legend {
display: flex;
gap: 1.5rem;
.legend-item {
display: flex;
align-items: center;
gap: 0.5rem;
font-size: 0.9rem;
color: #64748b;
i {
font-size: 0.8rem;
&.low { color: #ef4444; }
&.medium { color: #10b981; }
&.high { color: #6366f1; }
&.over { color: #7c3aed; } // Add color for over-utilization
}
}
}
}
.workload-bars {
display: flex;
flex-direction: column;
gap: 1.5rem;
.workload-bar {
.bar-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 0.5rem;
.bar-label {
display: flex;
align-items: center;
gap: 0.75rem;
font-weight: 500;
}
}
.bar-footer {
display: flex;
align-items: center;
gap: 0.5rem;
margin-top: 0.5rem;
font-size: 0.9rem;
color: #64748b;
.divider {
color: #cbd5e1;
}
.target {
color: #94a3b8;
}
}
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

// Update the year view cell styles
.calendar-cell-pro {
&.calendar-cell-day-pro {
.cell-entries-pro {
.month-cell-content {
display: flex;
flex-direction: column;
gap: 0.75rem;
padding: 0.75rem;
height: 100%;
.month-total {
text-align: center;
margin-bottom: 0.5rem;
.p-tag {
font-size: 0.9rem;
font-weight: 600;
}
}
.month-progress {
padding: 0 0.5rem;
margin-bottom: 0.5rem;
.p-progressbar {
height: 6px;
background: #f1f5f9;
border-radius: 3px;
&.low-hours .p-progressbar-value {
background: #f59e0b;
}
&.medium-hours .p-progressbar-value {
background: #10b981;
}
&.high-hours .p-progressbar-value {
background: #6366f1;
}
}
}
.entries-summary {
display: flex;
flex-wrap: wrap;
gap: 3px;
justify-content: center;
padding: 0.25rem;
min-height: 24px;
.entry-indicator {
width: 6px;
height: 6px;
border-radius: 50%;
background-color: var(--primary-color);
opacity: 0.6;
}
}
}
}
&.today {
background: #e0e7ff;
}
&.empty-month {
background: #f8fafc;
.p-tag {
background: #e2e8f0 !important;
color: #94a3b8 !important;
}
}
}
}

.calendar-cell-emp-pro {
display: flex;
align-items: center;
gap: 0.75rem;
padding: 1rem;
background: #f8fafc;
border-right: 1px solid #e5e7eb;
.emp-info-pro {
.emp-name-pro {
font-weight: 600;
font-size: 0.95rem;
color: #1e293b;
}
}
}

// Remove the old year-view-pro styles that conflict with the new design
.year-view-pro {
.year-grid {
// Remove or comment out the old styles
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

.p-dropdown-item {
padding: 0.75rem 1rem;
}

// Update ProgressBar classes
:deep(.p-progressbar) {
&.low-utilization {
.p-progressbar-value {
background: #ef4444;
}
}
&.medium-utilization {
.p-progressbar-value {
background: #10b981;
}
}
&.high-utilization {
.p-progressbar-value {
background: #6366f1;
}
}
&.over-utilization {
.p-progressbar-value {
background: #7c3aed;
}
}
}

.filter-group {
display: flex;
align-items: center;
gap: 0.75rem;
background: #f8fafc;
padding: 0.5rem;
border-radius: 8px;
.project-filter-pro,
.employee-filter-pro {
min-width: 200px;
:deep(.p-dropdown-label) {
display: flex;
align-items: center;
gap: 0.5rem;
i {
color: var(--primary-color);
}
}
}
.clear-filters-btn {
border-radius: 6px;
&:disabled {
opacity: 0;
pointer-events: none;
}
}
}

.selected-project,
.selected-employee {
display: flex;
align-items: center;
gap: 0.5rem;
i {
color: var(--primary-color);
}
.p-avatar {
width: 24px;
height: 24px;
font-size: 0.8rem;
}
}
</style>
