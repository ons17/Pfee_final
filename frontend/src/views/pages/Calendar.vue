<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, addMonths, isToday, isSameDay, isSameMonth,
  getHours, getMinutes, parseISO, addHours, differenceInMinutes, set,
  differenceInHours, formatDistance
} from 'date-fns';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import Calendar from 'primevue/calendar';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import Tooltip from 'primevue/tooltip';
import ConfirmDialog from 'primevue/confirmdialog';
import { useQuery } from '@vue/apollo-composable';
import { GET_TACHES } from '@/graphql';
import Card from 'primevue/card';

// Interfaces
interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  capacity: number;
  color: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  budget: number;
}

interface Task {
  id: string;
  name: string;
  projectId: string;
  status: 'planned' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface TimeEntry {
  id: string;
  taskId: string;
  employeeId: string;
  start: Date;
  end: Date;
  description?: string;
}

interface TimeTracking {
  entryId: string;
  startTime: Date;
  elapsed: number;
  isRunning: boolean;
}

// Toast notifications
const toast = useToast();

// State management
const currentDate = ref(new Date());
const currentView = ref('week');
const selectedProject = ref(null);
const selectedEmployee = ref(null);
const selectedTask = ref(null);
const showDetails = ref(false);
const selectedEntry = ref(null);
const isLoading = ref(false);
const showNewEntryDialog = ref(false);
const newEntryData = ref({
  taskId: '',
  employeeId: '',
  start: new Date(),
  end: addHours(new Date(), 2),
  description: ''
});
const draggableTask = ref(null);
const isResizing = ref(false);
const resizeEntryId = ref(null);
const resizeType = ref(null);
const resizeInitialX = ref(0);
const resizeInitialWidth = ref(0);

// View options
const viewOptions = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' }
];

// Employees data with colors
const employees = ref<Employee[]>([
  { id: 'e1', name: 'John Developer', role: 'Full Stack Dev', avatar: 'JD', capacity: 40, color: '#4CAF50' },
  { id: 'e2', name: 'Sarah Designer', role: 'UI/UX Designer', avatar: 'SD', capacity: 35, color: '#2196F3' },
  { id: 'e3', name: 'Mike Frontend', role: 'Frontend Dev', avatar: 'MF', capacity: 40, color: '#FF9800' },
  { id: 'e4', name: 'Lisa Backend', role: 'Backend Dev', avatar: 'LB', capacity: 40, color: '#9C27B0' },
  { id: 'e5', name: 'David QA', role: 'QA Engineer', avatar: 'DQ', capacity: 35, color: '#F44336' }
]);

// Projects data
const projects = ref<Project[]>([
  { id: 'p1', name: 'E-commerce Platform', color: '#4CAF50', budget: 160 },
  { id: 'p2', name: 'Mobile App', color: '#2196F3', budget: 120 },
  { id: 'p3', name: 'CRM System', color: '#FF9800', budget: 200 },
  { id: 'p4', name: 'Analytics Dashboard', color: '#9C27B0', budget: 80 },
  { id: 'p5', name: 'API Integration', color: '#F44336', budget: 100 }
]);

// Tasks data
const tasks = ref<Task[]>([
  // E-commerce Platform Tasks
  { id: 't1', name: 'Shopping Cart Implementation', projectId: 'p1', status: 'in-progress', priority: 'high' },
  { id: 't2', name: 'Payment Gateway Integration', projectId: 'p1', status: 'planned', priority: 'medium' },
  { id: 't3', name: 'Product Catalog Design', projectId: 'p1', status: 'completed', priority: 'medium' },
  
  // Mobile App Tasks
  { id: 't4', name: 'User Authentication', projectId: 'p2', status: 'in-progress', priority: 'high' },
  { id: 't5', name: 'Push Notifications', projectId: 'p2', status: 'planned', priority: 'low' },
  
  // CRM System Tasks
  { id: 't6', name: 'Contact Management', projectId: 'p3', status: 'in-progress', priority: 'medium' },
  { id: 't7', name: 'Sales Pipeline', projectId: 'p3', status: 'planned', priority: 'high' },
  
  // Analytics Dashboard Tasks
  { id: 't8', name: 'Data Visualization', projectId: 'p4', status: 'in-progress', priority: 'medium' },
  { id: 't9', name: 'Report Generation', projectId: 'p4', status: 'planned', priority: 'low' },
  
  // API Integration Tasks
  { id: 't10', name: 'REST API Development', projectId: 'p5', status: 'in-progress', priority: 'high' }
]);

// Initialize time entries with generated data
function generateTimeEntries() {
  const entries: TimeEntry[] = [];
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  // Generate entries for each day of the week
  for (let day = 0; day < 5; day++) { // Monday to Friday
    const currentDay = addDays(weekStart, day);
    
    // Morning entries
    entries.push({
      id: `te-${day}-1`,
      taskId: 't1',
      employeeId: 'e1',
      start: set(currentDay, { hours: 9, minutes: 0 }),
      end: set(currentDay, { hours: 11, minutes: 30 }),
      description: 'Shopping cart development'
    });

    entries.push({
      id: `te-${day}-2`,
      taskId: 't4',
      employeeId: 'e2',
      start: set(currentDay, { hours: 9, minutes: 0 }),
      end: set(currentDay, { hours: 19, minutes: 0 }),
      description: 'Mobile app UI design'
    });

    // Afternoon entries
    entries.push({
      id: `te-${day}-3`,
      taskId: 't6',
      employeeId: 'e3',
      start: set(currentDay, { hours: 13, minutes: 0 }),
      end: set(currentDay, { hours: 15, minutes: 30 }),
      description: 'CRM frontend implementation'
    });

    entries.push({
      id: `te-${day}-4`,
      taskId: 't8',
      employeeId: 'e4',
      start: set(currentDay, { hours: 14, minutes: 0 }),
      end: set(currentDay, { hours: 16, minutes: 0 }),
      description: 'Analytics backend work'
    });

    // Late afternoon entries
    entries.push({
      id: `te-${day}-5`,
      taskId: 't10',
      employeeId: 'e5',
      start: set(currentDay, { hours: 15, minutes: 30 }),
      end: set(currentDay, { hours: 17, minutes: 0 }),
      description: 'API testing and documentation'
    });
  }

  return entries;
}

const timeEntries = ref<TimeEntry[]>(generateTimeEntries());
const activeTracking = ref<TimeTracking | null>(null);
const timerInterval = ref<number | null>(null);

// Computed properties
const filteredTasks = computed(() => {
  if (!selectedProject.value) return tasks.value;
  return tasks.value.filter(task => task.projectId === selectedProject.value.id);
});

const timeRange = computed(() => {
  const today = currentDate.value;
  return {
    start: set(today, { hours: 8, minutes: 0 }),  // Start at 8 AM
    end: set(today, { hours: 20, minutes: 0 })    // End at 8 PM
  };
});

const hourLines = computed(() => {
  const lines = [];
  const start = timeRange.value.start;
  const end = timeRange.value.end;
  
  let current = new Date(start);
  while (current <= end) {
    lines.push({
      time: format(current, 'HH:mm'),
      position: calculatePosition(current),
      isLunchHour: getHours(current) === 12
    });
    current = addHours(current, 1);
  }
  
  return lines;
});

const weekDays = computed(() => {
  const days = [];
  const startDay = currentView.value === 'day' 
    ? currentDate.value 
    : startOfWeek(currentDate.value, { weekStartsOn: 1 });
  
  const numDays = currentView.value === 'day' 
    ? 1 
    : currentView.value === 'week' ? 7 : 31;
  
  for (let i = 0; i < numDays; i++) {
    const date = addDays(startDay, i);
    days.push({
      full: format(date, 'EEEE'),
      short: format(date, 'EEE'),
      date: date,
      isToday: isToday(date),
      isWeekend: [0, 6].includes(date.getDay())
    });
  }
  
  return days;
});

const visibleTimeEntries = computed(() => {
  if (currentView.value === 'day') {
    return timeEntries.value.filter(entry => 
      isSameDay(entry.start, currentDate.value)
    );
  } else if (currentView.value === 'week') {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate.value, { weekStartsOn: 1 });
    
    return timeEntries.value.filter(entry => 
      entry.start >= start && entry.start <= end
    );
  } else {
    const start = startOfMonth(currentDate.value);
    const end = endOfMonth(currentDate.value);
    
    return timeEntries.value.filter(entry => 
      entry.start >= start && entry.start <= end
    );
  }
});

const periodLabel = computed(() => {
  if (currentView.value === 'day') {
    return format(currentDate.value, 'MMMM d, yyyy');
  } else if (currentView.value === 'week') {
    const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate.value, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  } else {
    return format(currentDate.value, 'MMMM yyyy');
  }
});

// Watch for view changes to properly refresh the calendar
watch(currentView, () => {
  refreshCalendarView();
});

// Methods
function handleViewChange(view) {
  currentView.value = view;
  toast.add({
    severity: 'info',
    summary: 'View Changed',
    detail: `Calendar view changed to ${view}`,
    life: 3000
  });
}

function handleProjectChange() {
  selectedTask.value = null;
  refreshCalendarView();
}

function handleEmployeeChange() {
  refreshCalendarView();
}

function refreshCalendarView(showToast = false) {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
    if (showToast) {
      toast.add({
        severity: 'info',
        summary: 'Calendar Refreshed',
        detail: 'Calendar view has been updated',
        life: 2000
      });
    }
  }, 500);
}

function navigatePeriod(direction) {
  if (currentView.value === 'day') {
    currentDate.value = addDays(currentDate.value, direction);
  } else if (currentView.value === 'week') {
    currentDate.value = addWeeks(currentDate.value, direction);
  } else {
    currentDate.value = addMonths(currentDate.value, direction);
  }
}

function goToToday() {
  currentDate.value = new Date();
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
}

function showEntryDetails(entry) {
  selectedEntry.value = entry;
  showDetails.value = true;
}

function calculatePosition(date) {
  const start = timeRange.value.start;
  const totalMinutes = 12 * 60; // 12 hours (8am - 8pm) = 720 minutes
  const minutes = differenceInMinutes(date, start);
  return (minutes / totalMinutes) * 100;
}

function calculateWidth(start, end) {
  const minutes = differenceInMinutes(end, start);
  const totalMinutes = 12 * 60; // 12 hours (8am - 8pm) = 720 minutes
  return (minutes / totalMinutes) * 100;
}

function getProjectColor(entry) {
  const task = tasks.value.find(t => t.id === entry.taskId);
  if (!task) return 'rgba(150, 150, 150, 0.2)';
  
  const project = projects.value.find(p => p.id === task.projectId);
  if (!project) return 'rgba(150, 150, 150, 0.2)';
  
  return `${project.color}20`; // 20% opacity
}

function getProjectBorderColor(entry) {
  const task = tasks.value.find(t => t.id === entry.taskId);
  if (!task) return '#999';
  
  const project = projects.value.find(p => p.id === task.projectId);
  if (!project) return '#999';
  
  return project.color;
}

function getTaskName(entry) {
  const task = tasks.value.find(t => t.id === entry.taskId);
  return task ? task.name : 'Unknown Task';
}

function getProjectName(entry) {
  const task = tasks.value.find(t => t.id === entry.taskId);
  if (!task) return 'Unknown Project';
  
  const project = projects.value.find(p => p.id === task.projectId);
  return project ? project.name : 'Unknown Project';
}

function getEmployeeName(entry) {
  const employee = employees.value.find(e => e.id === entry.employeeId);
  return employee ? employee.name : 'Unknown Employee';
}

function getStatusSeverity(status) {
  switch (status) {
    case 'planned': return 'info';
    case 'in-progress': return 'warning';
    case 'completed': return 'success';
    default: return 'info';
  }
}

function getPrioritySeverity(priority) {
  const severityMap = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'info'
  };
  return severityMap[priority] || 'info';
}

// Time tracking functions
function startTimeTracking(entry) {
  if (activeTracking.value) {
    stopTimeTracking();
  }
  
  activeTracking.value = {
    entryId: entry.id,
    startTime: new Date(),
    elapsed: 0,
    isRunning: true
  };

  timerInterval.value = window.setInterval(() => {
    if (activeTracking.value) {
      const now = new Date();
      activeTracking.value.elapsed = differenceInMinutes(now, activeTracking.value.startTime);
    }
  }, 1000);
  
  toast.add({
    severity: 'success',
    summary: 'Time Tracking Started',
    detail: `Now tracking: ${getTaskName(entry)}`,
    life: 3000
  });
}

function stopTimeTracking() {
  if (activeTracking.value && timerInterval.value) {
    const { entryId, elapsed } = activeTracking.value;
    const entry = timeEntries.value.find(e => e.id === entryId);
    
    if (entry) {
      // Update the entry end time based on elapsed time
      entry.end = new Date();
      
      toast.add({
        severity: 'info',
        summary: 'Time Tracking Stopped',
        detail: `Tracked: ${formatDuration(elapsed)}`,
        life: 3000
      });
    }
    
    clearInterval(timerInterval.value);
    activeTracking.value = null;
    timerInterval.value = null;
  }
}

function pauseTimeTracking() {
  if (activeTracking.value && timerInterval.value) {
    clearInterval(timerInterval.value);
    activeTracking.value.isRunning = false;
    timerInterval.value = null;
    
    toast.add({
      severity: 'info',
      summary: 'Time Tracking Paused',
      detail: `Paused after: ${formatDuration(activeTracking.value.elapsed)}`,
      life: 3000
    });
  }
}

function resumeTimeTracking() {
  if (activeTracking.value && !activeTracking.value.isRunning) {
    activeTracking.value.isRunning = true;
    
    timerInterval.value = window.setInterval(() => {
      if (activeTracking.value) {
        const now = new Date();
        activeTracking.value.elapsed += differenceInMinutes(now, new Date());
      }
    }, 1000);
    
    toast.add({
      severity: 'success',
      summary: 'Time Tracking Resumed',
      detail: 'Continuing time tracking',
      life: 3000
    });
  }
}

// Drag and drop functionality
function handleDragStart(task) {
  draggableTask.value = task;
}

function handleDragOver(event, employee, date) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event, employee, date) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  
  if (!draggableTask.value) return;
  
  // Calculate the time for the drop position
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const totalWidth = rect.width;
  const percentage = relativeX / totalWidth;
  
  // Assuming work day from 8am to 8pm (12 hours)
  const totalMinutes = 12 * 60;
  const minutesFromStart = percentage * totalMinutes;
  
  let startTime = new Date(date);
  startTime = set(startTime, { 
    hours: timeRange.value.start.getHours(),
    minutes: timeRange.value.start.getMinutes() 
  });
  startTime = addMinutes(startTime, minutesFromStart);
  
  // Round to nearest 15 minutes
  const minutes = getMinutes(startTime);
  const roundedMinutes = Math.round(minutes / 15) * 15;
  startTime = set(startTime, { minutes: roundedMinutes });
  
  const endTime = addHours(startTime, 2); // Default 2 hour duration
  
  const newEntry = {
    id: `te-${Date.now()}`,
    taskId: draggableTask.value.id,
    employeeId: employee.id,
    start: startTime,
    end: endTime,
    description: `Working on ${draggableTask.value.name}`
  };
  
  timeEntries.value.push(newEntry);
  draggableTask.value = null;
  
  toast.add({
    severity: 'success',
    summary: 'Task Scheduled',
    detail: `${getTaskName(newEntry)} added to calendar`,
    life: 3000
  });
}

// Function to add minutes (missing in the original)
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// Resize entry
function startResize(event, entry, type) {
  event.preventDefault();
  event.stopPropagation();
  
  isResizing.value = true;
  resizeEntryId.value = entry.id;
  resizeType.value = type; // 'start' or 'end'
  resizeInitialX.value = event.clientX;
  
  const entryElement = event.currentTarget.parentElement;
  resizeInitialWidth.value = entryElement.offsetWidth;
  
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', stopResize);
}

function handleResizeMove(event) {
  if (!isResizing.value) return;
  
  const entry = timeEntries.value.find(e => e.id === resizeEntryId.value);
  if (!entry) return;
  
  const deltaX = event.clientX - resizeInitialX.value;
  const hourWidth = document.querySelector('.timeline-grid').offsetWidth / 12; // Width per hour
  const deltaHours = deltaX / hourWidth;
  
  // Round to nearest 15 minutes (0.25 hours)
  const roundedDeltaHours = Math.round(deltaHours * 4) / 4;
  
  if (resizeType.value === 'start') {
    const newStart = addHours(entry.start, roundedDeltaHours);
    if (newStart < entry.end) {
      entry.start = newStart;
    }
  } else {
    const newEnd = addHours(entry.end, roundedDeltaHours);
    if (newEnd > entry.start) {
      entry.end = newEnd;
    }
  }
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', stopResize);
  
  const entry = timeEntries.value.find(e => e.id === resizeEntryId.value);
  if (entry) {
    toast.add({
      severity: 'info',
      summary: 'Entry Updated',
      detail: `Duration: ${formatDistance(entry.start, entry.end)}`,
      life: 3000
    });
  }
}

// New entry dialog
function openNewTimeEntryDialog() {
  newEntryData.value = {
    taskId: '',
    employeeId: '',
    start: new Date(),
    end: addHours(new Date(), 2),
    description: ''
  };
  showNewEntryDialog.value = true;
}

function saveNewTimeEntry() {
  const { taskId, employeeId, start, end, description } = newEntryData.value;
  
  if (!taskId || !employeeId || !start || !end) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill all required fields',
      life: 3000
    });
    return;
  }
  
  const newEntry = {
    id: `te-${Date.now()}`,
    taskId,
    employeeId,
    start,
    end,
    description
  };
  
  timeEntries.value.push(newEntry);
  showNewEntryDialog.value = false;
  
  toast.add({
    severity: 'success',
    summary: 'Entry Created',
    detail: `${getTaskName(newEntry)} scheduled successfully`,
    life: 3000
  });
}

function deleteTimeEntry(entryId) {
  const index = timeEntries.value.findIndex(e => e.id === entryId);
  if (index !== -1) {
    timeEntries.value.splice(index, 1);
    showDetails.value = false;
    
    toast.add({
      severity: 'success',
      summary: 'Entry Deleted',
      detail: 'Time entry has been removed',
      life: 3000
    });
  }
}

// Calculate total hours
function getEmployeeWeeklyHours(employeeId) {
  const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate.value, { weekStartsOn: 1 });
  
  return timeEntries.value
    .filter(entry => 
      entry.employeeId === employeeId && 
      entry.start >= start &&
      entry.start <= end
    )
    .reduce((total, entry) => {
      return total + differenceInHours(entry.end, entry.start);
    }, 0);
}

function getEmployeeUtilization(employeeId) {
  const employee = employees.value.find(e => e.id === employeeId);
  if (!employee) return 0;
  
  const hoursLogged = getEmployeeWeeklyHours(employeeId);
  return (hoursLogged / employee.capacity) * 100;
}

// GraphQL query
const { result, loading } = useQuery(GET_TACHES);

// Lifecycle hooks
onMounted(() => {
  refreshCalendarView();
});

// Add these to your script setup section
const showFiltersPanel = ref(false);
const showSettingsDialog = ref(false);
const isEditMode = ref(false);

// Settings
const settings = ref({
  workDayStart: 8,
  workDayEnd: 20,
  defaultView: 'week',
  weekStartsOn: 1,
  showWeekends: true
});

// Hour options for settings
const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  label: `${i.toString().padStart(2, '0')}:00`,
  value: i
}));

// Week start options
const weekStartOptions = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Saturday', value: 6 }
];

// Status options for filtering
const statusOptions = [
  { label: 'Planned', value: 'planned', severity: 'info' },
  { label: 'In Progress', value: 'in-progress', severity: 'warning' },
  { label: 'Completed', value: 'completed', severity: 'success' }
];

// Filters
const filters = ref({
  projects: [],
  employees: [],
  statuses: []
});

// Computed property to check if any filters are active
const hasActiveFilters = computed(() => {
  return filters.value.projects.length > 0 || 
         filters.value.employees.length > 0 || 
         filters.value.statuses.length > 0;
});

// Methods for new functionality
function toggleFiltersPanel() {
  showFiltersPanel.value = !showFiltersPanel.value;
}

function clearFilters() {
  filters.value = {
    projects: [],
    employees: [],
    statuses: []
  };
}

function applyFilters() {
  refreshCalendarView(true);
  showFiltersPanel.value = false;
}

function saveSettings() {
  // Update timeRange based on new work hours
  timeRange.value = {
    start: set(currentDate.value, { hours: settings.value.workDayStart, minutes: 0 }),
    end: set(currentDate.value, { hours: settings.value.workDayEnd, minutes: 0 })
  };
  
  // Apply other settings
  currentView.value = settings.value.defaultView;
  
  // Close dialog and refresh view
  showSettingsDialog.value = false;
  refreshCalendarView(true);
  
  toast.add({
    severity: 'success',
    summary: 'Settings Saved',
    detail: 'Calendar settings have been updated',
    life: 3000
  });
}

function editTimeEntry(entry) {
  // Set up edit mode
  isEditMode.value = true;
  newEntryData.value = {
    taskId: entry.taskId,
    employeeId: entry.employeeId,
    start: new Date(entry.start),
    end: new Date(entry.end),
    description: entry.description || ''
  };
  
  // Close details dialog and open edit dialog
  showDetails.value = false;
  showNewEntryDialog.value = true;
}

function confirmDeleteEntry(entryId) {
  // Use PrimeVue's confirm dialog
  confirm.require({
    message: 'Are you sure you want to delete this time entry?',
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      deleteTimeEntry(entryId);
    }
  });
}

// Helper methods for the enhanced UI
function getTaskStatus(entry) {
  const task = tasks.value.find(t => t.id === entry.taskId);
  return task ? task.status : 'planned';
}

function getEmployeeAvatar(entry) {
  const employee = employees.value.find(e => e.id === entry.employeeId);
  return employee ? employee.avatar : '?';
}

function getEmployeeColor(entry) {
  const employee = employees.value.find(e => e.id === entry.employeeId);
  return employee ? employee.color : '#ccc';
}

function calcEventLeft(start: Date) {
  // Returns a percentage string for left offset based on start time (8:00-20:00)
  const minutes = (start.getHours() - 8) * 60 + start.getMinutes();
  return `calc(${(minutes / (12 * 60)) * 100}% )`;
}
function calcEventWidth(start: Date, end: Date) {
  const minutes = (end.getTime() - start.getTime()) / 60000;
  return `calc(${(minutes / (12 * 60)) * 100}% )`;
}
function calcCurrentTimeLeft() {
  const now = new Date();
  const minutes = (now.getHours() - 8) * 60 + now.getMinutes();
  return `calc(${(minutes / (12 * 60)) * 100}% )`;
}
</script>

<template>
  <div class="scheduler-container">
    <!-- Header Section -->
    <div class="scheduler-header p-card p-4">
      <div class="flex justify-content-between align-items-center flex-wrap">
        <!-- Left Side: Title and Filters -->
        <div class="header-left flex align-items-center gap-4 mb-2 md:mb-0">
          <h1 class="text-xl font-bold m-0">Professional Time Scheduler</h1>
          <div class="flex gap-2">
            <Dropdown 
              v-model="selectedProject" 
              :options="projects" 
              optionLabel="name" 
              placeholder="Filter by Project"
              class="w-12rem"
              @change="handleProjectChange"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex align-items-center">
                  <div 
                    :style="{ backgroundColor: slotProps.value.color }" 
                    class="w-1rem h-1rem border-round mr-2"
                  ></div>
                  <span>{{ slotProps.value.name }}</span>
                </div>
                <span v-else>Select Project</span>
              </template>
              <template #option="slotProps">
                <div class="flex align-items-center">
                  <div 
                    :style="{ backgroundColor: slotProps.option.color }" 
                    class="w-1rem h-1rem border-round mr-2"
                  ></div>
                  <span>{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Dropdown>
            
            <Dropdown 
              v-model="selectedEmployee" 
              :options="employees" 
              optionLabel="name" 
              placeholder="Filter by Employee"
              class="w-12rem"
              @change="handleEmployeeChange"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex align-items-center">
                  <Avatar 
                    :label="slotProps.value.avatar" 
                    size="small" 
                    shape="circle" 
                    class="mr-2"
                    :style="{ backgroundColor: slotProps.value.color }"
                  />
                  <span>{{ slotProps.value.name }}</span>
                </div>
                <span v-else>Select Employee</span>
              </template>
              <template #option="slotProps">
                <div class="flex align-items-center">
                  <Avatar 
                    :label="slotProps.option.avatar" 
                    size="small" 
                    shape="circle" 
                    class="mr-2"
                    :style="{ backgroundColor: slotProps.option.color }"
                  />
                  <span>{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Dropdown>
          </div>
        </div>
        
        <!-- Right Side: Actions -->
        <div class="header-right flex align-items-center gap-2">
          <div class="view-controls flex align-items-center p-2 border-round bg-gray-100">
            <Button 
              v-for="option in viewOptions" 
              :key="option.value"
              :label="option.label"
              :outlined="currentView !== option.value"
              :text="currentView !== option.value"
              :severity="currentView === option.value ? 'primary' : 'secondary'"
              class="p-button-sm"
              @click="handleViewChange(option.value)"
            />
          </div>
          
          <Button 
            icon="pi pi-plus" 
            label="New Entry" 
            severity="success" 
            @click="openNewTimeEntryDialog"
          />
        </div>
      </div>
      
     <!-- Continuing from where the template was cut off... -->

      <!-- Navigation Bar -->
      <div class="navigation-bar flex justify-content-between align-items-center mt-4">
        <div class="period-navigation flex align-items-center gap-2">
          <Button 
            icon="pi pi-chevron-left" 
            text 
            @click="navigatePeriod(-1)"
            v-tooltip="'Previous ' + currentView"
          />
          <h2 class="period-label m-0">{{ periodLabel }}</h2>
          <Button 
            icon="pi pi-chevron-right" 
            text 
            @click="navigatePeriod(1)"
            v-tooltip="'Next ' + currentView"
          />
          <Button 
            label="Today" 
            text 
            @click="goToToday"
            class="ml-2"
          />
        </div>
      </div>
    </div>
    
    <!-- Calendar Body -->
    <div class="calendar-container p-card mt-3">
      <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 4px" />
      
      <div class="calendar-header flex">
        <!-- Time scale header (empty for alignment) -->
        <div class="time-scale-header" style="width: 60px"></div>
        
        <!-- Day headers -->
        <div class="days-container flex flex-grow-1">
          <div 
            v-for="day in weekDays" 
            :key="day.date" 
            class="day-header" 
            :class="{ 'today': day.isToday, 'weekend': day.isWeekend }"
          >
            <div class="day-name">{{ day.short }}</div>
            <div class="day-date">{{ format(day.date, 'd') }}</div>
          </div>
        </div>
      </div>
      
      <!-- Calendar Grid -->
      <div class="calendar-body flex">
        <!-- Time scale (vertical) -->
        <div class="time-scale-vertical">
          <div v-for="line in hourLines" :key="line.time" class="time-scale-cell">
            {{ line.time }}
          </div>
        </div>
        <!-- Timeline grid -->
        <div class="timeline-grid-horizontal">
          <div class="timeline-row" v-for="employee in employees" :key="employee.id">
            <div class="employee-label">
              <Avatar :label="employee.avatar" :style="{ backgroundColor: employee.color }" />
              <span>{{ employee.name }}</span>
            </div>
            <div class="timeline-cells">
              <div
                v-for="day in weekDays"
                :key="day.date"
                class="timeline-day-cell"
              >
                <!-- Render events as horizontal bars -->
                <div
                  v-for="entry in visibleTimeEntries.filter(e => e.employeeId === employee.id && isSameDay(e.start, day.date))"
                  :key="entry.id"
                  class="event-bar"
                  :style="{
                    left: calcEventLeft(entry.start),
                    width: calcEventWidth(entry.start, entry.end),
                    backgroundColor: getProjectColor(entry),
                    borderColor: getProjectBorderColor(entry)
                  }"
                  @click="showEntryDetails(entry)"
                  v-tooltip="getTaskName(entry)"
                >
                  <span class="event-title">{{ getTaskName(entry) }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Current time indicator -->
          <div class="current-time-indicator" :style="{ left: calcCurrentTimeLeft() }"></div>
        </div>
      </div>
    </div>
    
    <!-- Task List -->
    <div class="task-list-container p-card mt-3">
      <h2 class="task-list-header p-3 m-0 text-lg font-medium">
        Available Tasks
        <span v-if="selectedProject"> for {{ selectedProject.name }}</span>
      </h2>
      
      <div class="task-list p-3 flex flex-wrap gap-2">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          class="task-item p-card p-2"
          draggable="true"
          @dragstart="handleDragStart(task)"
        >
          <div class="task-header flex align-items-center justify-content-between">
            <h3 class="task-name m-0 text-base">{{ task.name }}</h3>
            <div class="task-badges flex gap-1">
              <Tag :severity="getStatusSeverity(task.status)" :value="task.status" />
              <Tag :severity="getPrioritySeverity(task.priority)" :value="task.priority" />
            </div>
          </div>
          <div class="task-project mt-1">
            <div 
              class="project-indicator" 
              :style="{ 
                backgroundColor: projects.find(p => p.id === task.projectId)?.color || '#ccc' 
              }"
            ></div>
            <span>{{ projects.find(p => p.id === task.projectId)?.name || 'Unknown Project' }}</span>
          </div>
          <div class="task-action mt-2">
            <small class="text-gray-500">Drag to schedule</small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Resource Utilization -->
    <div class="resource-utilization p-card mt-3">
      <h2 class="utilization-header p-3 m-0 text-lg font-medium">Weekly Resource Utilization</h2>
      
      <div class="utilization-grid p-3">
        <div 
          v-for="employee in employees" 
          :key="employee.id"
          class="employee-utilization p-2"
        >
          <div class="employee-info flex align-items-center">
            <Avatar 
              :label="employee.avatar" 
              shape="circle" 
              :style="{ backgroundColor: employee.color }"
            />
            <div class="employee-details ml-2">
              <h3 class="employee-name m-0">{{ employee.name }}</h3>
              <div class="employee-role text-gray-500">{{ employee.role }}</div>
            </div>
          </div>
          
          <div class="utilization-stats mt-2">
            <div class="hours-logged">
              <span class="font-medium">{{ getEmployeeWeeklyHours(employee.id) }}</span> / {{ employee.capacity }} hours
            </div>
            <ProgressBar 
              :value="getEmployeeUtilization(employee.id)" 
              :class="{ 
                'warning': getEmployeeUtilization(employee.id) > 85,
                'danger': getEmployeeUtilization(employee.id) > 100
              }"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Time Entry Details Dialog -->
    <Dialog 
      v-model:visible="showDetails" 
      header="Time Entry Details" 
      :style="{ width: '500px' }"
      :modal="true"
    >
      <div v-if="selectedEntry" class="entry-details">
        <div class="entry-title text-xl font-medium mb-3">
          {{ getTaskName(selectedEntry) }}
        </div>
        
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Project</div>
            <div class="detail-value flex align-items-center">
              <div 
                class="color-indicator mr-2" 
                :style="{ backgroundColor: getProjectBorderColor(selectedEntry) }"
              ></div>
              {{ getProjectName(selectedEntry) }}
            </div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Employee</div>
            <div class="detail-value flex align-items-center">
              <Avatar 
                :label="employees.find(e => e.id === selectedEntry.employeeId)?.avatar || '?'" 
                size="small"
                shape="circle" 
                :style="{ 
                  backgroundColor: employees.find(e => e.id === selectedEntry.employeeId)?.color 
                }"
                class="mr-2"
              />
              {{ getEmployeeName(selectedEntry) }}
            </div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">
              {{ format(selectedEntry.start, 'EEEE, MMMM d, yyyy') }}
            </div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Time</div>
            <div class="detail-value">
              {{ format(selectedEntry.start, 'HH:mm') }} - {{ format(selectedEntry.end, 'HH:mm') }}
              ({{ formatDistance(selectedEntry.start, selectedEntry.end) }})
            </div>
          </div>
          
          <div class="detail-item col-span-2">
            <div class="detail-label">Description</div>
            <div class="detail-value">
              {{ selectedEntry.description || 'No description provided' }}
            </div>
          </div>
        </div>
        
        <div class="time-tracking-controls mt-4 flex gap-2">
          <Button 
            v-if="!activeTracking || activeTracking.entryId !== selectedEntry.id"
            icon="pi pi-play" 
            label="Start Tracking" 
            @click="startTimeTracking(selectedEntry)"
          />
          <Button 
            v-else-if="activeTracking.isRunning"
            icon="pi pi-pause" 
            label="Pause" 
            @click="pauseTimeTracking"
          />
          <Button 
            v-else
            icon="pi pi-play" 
            label="Resume" 
            @click="resumeTimeTracking"
          />
          <Button 
            v-if="activeTracking && activeTracking.entryId === selectedEntry.id"
            icon="pi pi-stop" 
            label="Stop" 
            severity="secondary"
            @click="stopTimeTracking"
          />
          <div 
            v-if="activeTracking && activeTracking.entryId === selectedEntry.id" 
            class="time-elapsed ml-auto flex align-items-center"
          >
            <i class="pi pi-clock mr-2"></i>
            {{ formatDuration(activeTracking.elapsed) }}
          </div>
        </div>
      </div>
      
      <template #footer>
        <Button 
          label="Edit" 
          icon="pi pi-pencil" 
          @click="showDetails = false"
        />
        <Button 
          label="Delete" 
          icon="pi pi-trash" 
          severity="danger" 
          @click="deleteTimeEntry(selectedEntry?.id)"
        />
        <Button 
          label="Close" 
          icon="pi pi-times" 
          text 
          @click="showDetails = false"
        />
      </template>
    </Dialog>
    
    <!-- New Time Entry Dialog -->
    <Dialog 
      v-model:visible="showNewEntryDialog" 
      header="Create New Time Entry" 
      :style="{ width: '600px' }"
      :modal="true"
    >
      <div class="new-entry-form grid">
        <div class="col-12 md:col-6 field">
          <label for="project" class="font-medium">Project</label>
          <Dropdown 
            id="project"
            v-model="selectedProject" 
            :options="projects" 
            optionLabel="name" 
            placeholder="Select Project"
            class="w-full"
          />
        </div>
        
        <div class="col-12 md:col-6 field">
          <label for="task" class="font-medium">Task</label>
          <Dropdown 
            id="task"
            v-model="newEntryData.taskId" 
            :options="filteredTasks" 
            optionLabel="name" 
            optionValue="id"
            placeholder="Select Task"
            class="w-full"
          />
        </div>
        
        <div class="col-12 md:col-6 field">
          <label for="employee" class="font-medium">Employee</label>
          <Dropdown 
            id="employee"
            v-model="newEntryData.employeeId" 
            :options="employees" 
            optionLabel="name" 
            optionValue="id"
            placeholder="Assign to"
            class="w-full"
          >
            <template #option="slotProps">
              <div class="flex align-items-center">
                <Avatar 
                  :label="slotProps.option.avatar" 
                  size="small" 
                  shape="circle" 
                  class="mr-2"
                  :style="{ backgroundColor: slotProps.option.color }"
                />
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </Dropdown>
        </div>
        
        <div class="col-12 md:col-6 field">
          <label for="date" class="font-medium">Date</label>
          <Calendar 
            id="date" 
            v-model="newEntryData.start" 
            showTime 
            hourFormat="24"
            class="w-full"
            @update:modelValue="newEntryData.end = addHours(newEntryData.start, 2)"
          />
        </div>
        
        <div class="col-12 md:col-6 field">
          <label for="start" class="font-medium">Start Time</label>
          <Calendar 
            id="start" 
            v-model="newEntryData.start" 
            timeOnly 
            hourFormat="24"
            class="w-full" 
          />
        </div>
        
        <div class="col-12 md:col-6 field">
          <label for="end" class="font-medium">End Time</label>
          <Calendar 
            id="end" 
            v-model="newEntryData.end" 
            timeOnly 
            hourFormat="24"
            class="w-full" 
          />
        </div>
        
        <div class="col-12 field">
          <label for="description" class="font-medium">Description</label>
          <Textarea 
            id="description" 
            v-model="newEntryData.description" 
            rows="3" 
            class="w-full" 
            placeholder="Add details about this work entry"
          />
        </div>
      </div>
      
      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          text 
          @click="showNewEntryDialog = false"
        />
        <Button 
          label="Save" 
          icon="pi pi-check" 
          @click="saveNewTimeEntry"
        />
      </template>
    </Dialog>
    
    <!-- Confirmation Dialog -->
    <ConfirmDialog />
    
    <!-- Add a settings dialog -->
    <Dialog 
      v-model:visible="showSettingsDialog" 
      header="Calendar Settings" 
      :style="{ width: '500px' }"
      :modal="true"
    >
      <div class="calendar-settings p-3">
        <div class="field mb-4">
          <label class="font-medium block mb-2">Working Hours</label>
          <div class="flex align-items-center gap-2">
            <Dropdown 
              v-model="settings.workDayStart" 
              :options="hourOptions" 
              optionLabel="label" 
              optionValue="value"
              placeholder="Start time" 
              class="w-full"
            />
            <span>to</span>
            <Dropdown 
              v-model="settings.workDayEnd" 
              :options="hourOptions" 
              optionLabel="label" 
              optionValue="value"
              placeholder="End time" 
              class="w-full"
            />
          </div>
        </div>
        
        <div class="field mb-4">
          <label class="font-medium block mb-2">Default View</label>
          <Dropdown 
            v-model="settings.defaultView" 
            :options="viewOptions" 
            optionLabel="label" 
            optionValue="value"
            placeholder="Select default view" 
            class="w-full"
          />
        </div>
        
        <div class="field mb-4">
          <label class="font-medium block mb-2">Week Starts On</label>
          <Dropdown 
            v-model="settings.weekStartsOn" 
            :options="weekStartOptions" 
            optionLabel="label" 
            optionValue="value"
            placeholder="Select first day of week" 
            class="w-full"
          />
        </div>
        
        <div class="field-checkbox mb-4">
          <Checkbox v-model="settings.showWeekends" :binary="true" id="show-weekends" />
          <label for="show-weekends" class="ml-2">Show weekends</label>
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="showSettingsDialog = false" />
        <Button label="Save" icon="pi pi-check" @click="saveSettings" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Main container */
.scheduler-container {
  font-family: var(--font-family);
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header styles */
.scheduler-header {
  border-radius: 8px;
  background: var(--surface-0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.header-left {
  position: relative;
  
  h1 {
    font-size: 1.5rem;
    color: var(--surface-900);
    letter-spacing: -0.5px;
  }
}

.header-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--surface-200);

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.view-controls {
  padding: 0.25rem;
  background: var(--surface-100);
  border-radius: 8px;
  
  .p-button {
    min-width: 80px;
    
    &.p-button-sm {
      padding: 0.4rem 1rem;
    }
  }
}

.navigation-bar {
  padding-top: 0.5rem;
  border-top: 1px solid var(--surface-200);
}

.period-label {
  min-width: 160px;
  text-align: center;
  font-size: 1.1rem;
}

/* Calendar header */
.calendar-header {
  border-bottom: 1px solid var(--surface-200);
  position: sticky;
  top: 0;
  background-color: var(--surface-0);
  z-index: 2;
}

.time-scale-header {
  border-right: 1px solid var(--surface-200);
}

.days-container {
  display: flex;
}

.day-header {
  flex: 1;
  padding: 8px;
  text-align: center;
  border-right: 1px solid var(--surface-100);
}

.day-header.today {
  background-color: var(--primary-50);
}

.day-header.weekend {
  background-color: var(--surface-100);
}

.day-name {
  font-weight: 600;
}

.day-date {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

/* Calendar body */
.calendar-body {
  position: relative;
  min-height: 600px;
  height: 70vh;
  overflow-y: auto;
}

/* Time scale */
.time-scale {
  width: 60px;
  position: relative;
  border-right: 1px solid var(--surface-200);
  z-index: 2;
  background-color: var(--surface-0);
  padding-right: 10px;
}

.time-label {
  position: absolute;
  right: 10px;
  transform: translateY(-50%);
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

/* Timeline grid */
.timeline-grid {
  position: relative;
  display: flex;
  flex-grow: 1;
}

.day-column {
  flex: 1;
  position: relative;
  border-right: 1px solid var(--surface-100);
  height: 100%;
}

.day-column.today {
  background-color: var(--primary-50);
}

.day-column.weekend {
  background-color: var(--surface-100);
}

.hour-line {
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: var(--surface-200);
}

.hour-line.lunch-hour {
  background-color: var(--orange-200);
  height: 2px;
}

/* Employee rows */
.employee-row {
  position: relative;
  width: 100%;
  height: 20%; /* Default - will be overridden dynamically */
  border-bottom: 1px dashed var(--surface-200);
}

.employee-indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 1;
}

/* Time entries */
.time-entry {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 2px;
  border-radius: 4px;
  border-left-width: 4px;
  border-style: solid;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    z-index: 5;
  }
  
  .time-entry-content {
    padding: 0.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .time-entry-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }
  
  .time-entry-title {
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.2;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .time-entry-project {
    font-size: 0.75rem;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* Animation for time entries */
.time-entry-animation-enter-active,
.time-entry-animation-leave-active {
  transition: transform 0.2s, opacity 0.2s;
}

.time-entry-animation-enter-from,
.time-entry-animation-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  height: 6px;
  width: 100%;
  left: 0;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: row-resize;
  z-index: 4;
}

.resize-handle-start {
  top: 0;
}

.resize-handle-end {
  bottom: 0;
}

/* Task list */
.task-list-container {
  background: var(--surface-0);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);

  .task-item {
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--surface-0);
      border-color: var(--primary-200);
    }
    
    &:active {
      transform: scale(0.98);
    }
    
    .task-badges {
      .p-tag {
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
      }
    }
  }
}

/* Resource utilization */
.resource-utilization {
  .employee-utilization {
    background: var(--surface-50);
    border-radius: 8px;
    padding: 1rem;
    transition: transform 0.2s;
    
    &:hover {
      transform: translateY(-2px);
    }
    
    .p-progressbar {
      height: 8px;
      border-radius: 4px;
      
      &.warning .p-progressbar-value {
        background: linear-gradient(90deg, var(--orange-500), var(--orange-600));
      }
      
      &.danger .p-progressbar-value {
        background: linear-gradient(90deg, var(--red-500), var(--red-600));
      }
    }
  }
}

.utilization-header {
  border-bottom: 1px solid var(--surface-200);
}

.utilization-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.employee-utilization {
  width: calc(20% - 1rem);
  min-width: 200px;
}

.employee-details {
  flex-grow: 1;
}

.employee-name {
  font-size: 1rem;
  font-weight: 500;
}

.hours-logged {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.p-progressbar.warning .p-progressbar-value {
  background-color: var(--orange-500) !important;
}

.p-progressbar.danger .p-progressbar-value {
  background-color: var(--red-500) !important;
}

/* Entry details */
.entry-details {
  padding: 1rem 0;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.col-span-2 {
  grid-column: span 2;
}

.detail-label {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  margin-bottom: 3px;
}

.detail-value {
  font-weight: 500;
}

.color-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* Drag and drop */
.drag-over {
  background-color: var(--primary-100) !important;
}

/* Media queries */
@media (max-width: 992px) {
  .task-item {
    width: calc(33.33% - 0.5rem);
  }
  
  .employee-utilization {
    width: calc(33.33% - 1rem);
  }
}

@media (max-width: 768px) {
  .task-item {
    width: calc(50% - 0.5rem);
  }
  
  .employee-utilization {
    width: calc(50% - 1rem);
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .col-span-2 {
    grid-column: span 1;
  }
  
  .scheduler-header {
    .header-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      
      h1 {
        font-size: 1.25rem;
      }
    }
    
    .header-controls {
      flex-direction: column;
      
      .control-group {
        width: 100%;
        
        .p-dropdown {
          width: 100%;
        }
      }
    }
  }
  
  .calendar-body {
    height: auto;
    min-height: 400px;
  }
  
  .time-entry {
    padding: 4px;
    
    .time-entry-content {
      padding: 2px;
    }
    
    .time-entry-title {
      font-size: 0.8rem;
    }
  }
}

@media (max-width: 576px) {
  .task-item, .employee-utilization {
    width: 100%;
  }
  
  .calendar-body {
    min-height: 500px;
    height: 85vh;
  }
}

.calendar-container {
  border-radius: 8px;
  background: var(--surface-0);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  
  .calendar-header {
    background: var(--surface-50);
  }
  
  .day-header {
    padding: 1rem;
    transition: background-color 0.2s;
    
    &.today {
      background: var(--primary-50);
      font-weight: 600;
      
      .day-date {
        color: var(--primary-600);
      }
    }
    
    &:hover {
      background: var(--surface-100);
    }
  }
}

.time-entry {
  backdrop-filter: blur(8px);
  border-width: 1px;
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    z-index: 5;
  }
  
  .time-entry-content {
    padding: 0.5rem;
  }
  
  .time-entry-title {
    font-size: 0.9rem;
    line-height: 1.2;
  }
}

/* Custom scrollbar */
.calendar-body {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--surface-100);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--surface-300);
    border-radius: 4px;
    
    &:hover {
      background: var(--surface-400);
    }
  }
}

/* Dialog improvements */
::v-deep(.p-dialog) {
  .p-dialog-header {
    padding: 1.5rem;
    background: var(--surface-50);
    border-bottom: 1px solid var(--surface-200);
  }
  
  .p-dialog-content {
    padding: 1.5rem;
  }
  
  .p-dialog-footer {
    padding: 1.25rem 1.5rem;
    background: var(--surface-50);
    border-top: 1px solid var(--surface-200);
  }
}

.entry-details {
  .detail-item {
    background: var(--surface-50);
    padding: 1rem;
    border-radius: 6px;
    
    &:hover {
      background: var(--surface-100);
    }
  }
}

/* Loading states and transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loading-overlay {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  
  .p-progress-spinner {
    width: 50px;
    height: 50px;
  }
}

.skeleton-loader {
  background: linear-gradient(
    90deg,
    var(--surface-100) 25%,
    var(--surface-200) 37%,
    var(--surface-100) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.time-scale-vertical {
  width: 60px;
  display: flex;
  flex-direction: column;
}
.time-scale-cell {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}
.timeline-grid-horizontal {
  flex: 1;
  overflow-x: auto;
  position: relative;
}
.timeline-row {
  display: flex;
  align-items: center;
  min-height: 48px;
  border-bottom: 1px solid var(--surface-200);
}
.employee-label {
  width: 140px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  padding-left: 8px;
}
.timeline-cells {
  flex: 1;
  display: flex;
  position: relative;
  height: 48px;
}
.timeline-day-cell {
  flex: 1;
  border-right: 1px solid var(--surface-100);
  position: relative;
  height: 100%;
}
.event-bar {
  position: absolute;
  top: 6px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid;
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
  z-index: 2;
}
.event-bar:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.current-time-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e53935;
  z-index: 10;
  pointer-events: none;
}
</style>
