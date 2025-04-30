<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, isToday, 
         isSameMonth, isSameDay, getHours, getMinutes, parseISO, addHours, differenceInMinutes, set } from 'date-fns';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import { useQuery } from '@vue/apollo-composable'; // Import useQuery
import { GET_TACHES } from '@/graphql'; // Import your GraphQL query
import Card from 'primevue/card'; // Import Card component
import Tooltip from 'primevue/tooltip'; // Import Tooltip directive

// Add these before your component state declarations
interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  capacity: number;
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
}

interface TimeEntry {
  id: string;
  taskId: string;
  employeeId: string;
  start: Date;
  end: Date;
  description?: string;
}

// Add to your interfaces
interface TimeTracking {
  entryId: string;
  startTime: Date;
  elapsed: number;
  isRunning: boolean;
}

// States
const toast = useToast();
const currentDate = ref(new Date());
const currentView = ref('week');
const selectedProject = ref(null);
const selectedEmployee = ref(null);
const selectedTask = ref(null);
const showDetails = ref(false);
const selectedEntry = ref(null);
const isLoading = ref(false);
const showNewEntryDialog = ref(false);

// Add this with your other ref declarations

// View options
const viewOptions = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' }
];

// Update mock data with more realistic entries
const employees = ref<Employee[]>([
  { id: 'e1', name: 'John Developer', role: 'Full Stack Dev', avatar: 'JD', capacity: 40 },
  { id: 'e2', name: 'Sarah Designer', role: 'UI/UX Designer', avatar: 'SD', capacity: 35 },
  { id: 'e3', name: 'Mike Frontend', role: 'Frontend Dev', avatar: 'MF', capacity: 40 },
  { id: 'e4', name: 'Lisa Backend', role: 'Backend Dev', avatar: 'LB', capacity: 40 },
  { id: 'e5', name: 'David QA', role: 'QA Engineer', avatar: 'DQ', capacity: 35 }
]);

const projects = ref<Project[]>([
  { id: 'p1', name: 'E-commerce Platform', color: '#4CAF50', budget: 160 },
  { id: 'p2', name: 'Mobile App', color: '#2196F3', budget: 120 },
  { id: 'p3', name: 'CRM System', color: '#FF9800', budget: 200 },
  { id: 'p4', name: 'Analytics Dashboard', color: '#9C27B0', budget: 80 },
  { id: 'p5', name: 'API Integration', color: '#F44336', budget: 100 }
]);

const tasks = ref<Task[]>([
  // E-commerce Platform Tasks
  { id: 't1', name: 'Shopping Cart Implementation', projectId: 'p1', status: 'in-progress' },
  { id: 't2', name: 'Payment Gateway Integration', projectId: 'p1', status: 'planned' },
  { id: 't3', name: 'Product Catalog Design', projectId: 'p1', status: 'completed' },
  
  // Mobile App Tasks
  { id: 't4', name: 'User Authentication', projectId: 'p2', status: 'in-progress' },
  { id: 't5', name: 'Push Notifications', projectId: 'p2', status: 'planned' },
  
  // CRM System Tasks
  { id: 't6', name: 'Contact Management', projectId: 'p3', status: 'in-progress' },
  { id: 't7', name: 'Sales Pipeline', projectId: 'p3', status: 'planned' },
  
  // Analytics Dashboard Tasks
  { id: 't8', name: 'Data Visualization', projectId: 'p4', status: 'in-progress' },
  { id: 't9', name: 'Report Generation', projectId: 'p4', status: 'planned' },
  
  // API Integration Tasks
  { id: 't10', name: 'REST API Development', projectId: 'p5', status: 'in-progress' }
]);

// Computed Properties
const filteredTasks = computed(() => {
  if (!selectedProject.value) return tasks.value;
  return tasks.value.filter(task => task.projectId === selectedProject.value.id);
});

const weekDays = computed(() => {
  const days = [];
  const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    days.push({
      full: format(date, 'EEEE'),
      short: format(date, 'EEE'),
      date: date,
      isToday: isToday(date)
    });
  }
  return days;
});

const calendarData = computed(() => {
  const weeks = [];
  const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  
  for (let week = 0; week < 6; week++) {
    const weekDays = [];
    for (let day = 0; 7; day++) {
      const date = addDays(start, week * 7 + day);
      weekDays.push({
        date,
        entries: getMockEntries(date), // Replace with actual data
        totalHours: Math.random() * 8, // Replace with actual calculation
        isCurrentMonth: isSameMonth(date, currentDate.value)
      });
    }
    weeks.push(weekDays);
  }
  return weeks;
});

const timeRange = computed(() => {
  const today = currentDate.value;
  return {
    start: set(today, { hours: 8, minutes: 0 }),  // Start at 8 AM
    end: set(today, { hours: 20, minutes: 0 })    // End at 8 PM
  };
});

// Add hour lines computed property
const hourLines = computed(() => {
  const lines = [];
  const start = timeRange.value.start;
  const end = timeRange.value.end;
  let current = start;
  
  while (current <= end) {
    lines.push({
      time: format(current, 'HH:mm'),
      position: calculatePosition(current)
    });
    current = addHours(current, 1);
  }
  return lines;
});

const timeSlots = computed(() => {
  const slots = [];
  let current = new Date(timeRange.value.start);
  const end = timeRange.value.end;
  
  while (current < end) {
    slots.push(new Date(current));
    current = addHours(current, 1);
  }
  return slots;
});

// Methods
const handleViewChange = (view) => {
  currentView.value = view;
  toast.add({
    severity: 'info',
    summary: 'View Changed',
    detail: `Calendar view changed to ${view}`,
    life: 3000
  });
};

const handleProjectChange = (event) => {
  selectedTask.value = null;
  // Additional logic for project change
};

const handleTimeEntryClick = (entry) => {
  selectedEntry.value = entry;
  showDetails.value = true;
};

const formatDate = (date, formatStr) => format(date, formatStr);

const formatTimeRange = (start, end) => {
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
};

const formatHours = (hours) => {
  return hours.toFixed(1) + 'h';
};

const formatPeriodLabel = () => {
  const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate.value, { weekStartsOn: 1 });
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};

const navigatePeriod = (direction) => {
  currentDate.value = addWeeks(currentDate.value, direction);
};

const getDayClasses = (day) => ({
  'current-month': day.isCurrentMonth,
  'today': isToday(day.date),
  'weekend': [6, 0].includes(day.date.getDay())
});

const getEntryStyle = (entry: TimeEntry) => {
  const project = projects.value.find(p => p.name === entry.project);
  const color = project?.color || '#999999';
  return {
    borderLeft: `3px solid ${color}`,
    backgroundColor: `${color}15`,
    border: `1px solid ${color}30`
  };
};

const getStatusSeverity = (status) => {
  const severityMap = {
    'completed': 'success',
    'in-progress': 'info',
    'paused': 'warning'
  };
  return severityMap[status] || 'info';
};

const showEntryDetails = (entry) => {
  selectedEntry.value = entry;
  showDetails.value = true;
};

const getProgressColor = (spent, budget) => {
  const percentage = (parseInt(spent) / parseInt(budget)) * 100;
  if (percentage > 90) return 'var(--red-500)';
  if (percentage > 70) return 'var(--orange-500)';
  return 'var(--green-500)';
};

// Fetch time entries using GraphQL
const { result, loading, error } = useQuery(GET_TACHES);

// Mock data generator - replace with actual data fetching
const getMockEntries = (date) => {
    if (loading.value) return [];
    if (error.value) {
        console.error("GraphQL error:", error.value);
        return [];
    }

    const taches = result.value?.taches || [];

    return taches.map(task => ({
        id: task.idTache,
        taskId: task.idTache,
        employeeId: employees.value[0].id, // Default employee
        start: new Date(date),
        end: addHours(new Date(date), 2)
    }));
};

const openNewTimeEntryDialog = () => {
    showNewEntryDialog.value = true;
};

const saveNewTimeEntry = () => {
    // Implement your save logic here
    showNewEntryDialog.value = false;
};

const getEmployeeAvatar = (employeeName: string) => {
  const employee = employees.value.find(e => e.name === employeeName);
  return employee ? employee.avatar : '';
};

// Add drag and drop functionality
const draggableTask = ref<Task | null>(null);

const handleDragStart = (task: Task) => {
  draggableTask.value = task;
};

const handleDrop = (event: DragEvent, employee: Employee, date: Date) => {
  if (!draggableTask.value) return;
  
  const newEntry: TimeEntry = {
    id: `te-${Date.now()}`,
    taskId: draggableTask.value.id,
    employeeId: employee.id,
    start: new Date(date),
    end: addHours(new Date(date), 2)
  };
  
  timeEntries.value.push(newEntry);
  draggableTask.value = null;
};

// Add timeline helpers
const calculatePosition = (date: Date) => {
  const minutes = differenceInMinutes(date, timeRange.value.start);
  return (minutes / 60) * 100;
};

const calculateWidth = (start: Date, end: Date) => {
  const minutes = differenceInMinutes(end, start);
  return (minutes / 60) * 100;
};

const getProjectColor = (entry: TimeEntry) => {
  const task = tasks.value.find(t => t.id === entry.taskId);
  const project = projects.value.find(p => p.id === task?.projectId);
  return project ? `${project.color}33` : '#00000033';
};

const getTaskName = (entry: TimeEntry) => {
  return tasks.value.find(t => t.id === entry.taskId)?.name || 'Unknown Task';
};

const getProjectColorByTask = (task: Task) => {
  return projects.value.find(p => p.id === task.projectId)?.color;
};

// Add comprehensive time entries for the current week
const generateTimeEntries = () => {
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
      start: set(currentDay, { hours: 7, minutes: 0 }),
      end: set(currentDay, { hours: 12, minutes: 0 }),
      description: 'Mobile app UI design'
    });

    // Afternoon entries
    entries.push({
      id: `te-${day}-3`,
      taskId: 't6',
      employeeId: 'e3',
      start: set(currentDay, { hours: 2, minutes: 0 }),
      end: set(currentDay, { hours: 10, minutes: 30 }),
      description: 'CRM frontend implementation'
    });

    entries.push({
      id: `te-${day}-4`,
      taskId: 't8',
      employeeId: 'e4',
      start: set(currentDay, { hours: 8, minutes: 0 }),
      end: set(currentDay, { hours: 10, minutes: 0 }),
      description: 'Analytics backend work'
    });

    // Late afternoon entries
    entries.push({
      id: `te-${day}-5`,
      taskId: 't10',
      employeeId: 'e5',
      start: set(currentDay, { hours: 8, minutes: 30 }),
      end: set(currentDay, { hours: 10, minutes: 0 }),
      description: 'API testing and documentation'
    });
  }

  return entries;
};

// Initialize time entries with generated data
const timeEntries = ref<TimeEntry[]>(generateTimeEntries());

// Add a function to calculate weekly totals per employee
const getEmployeeWeeklyHours = (employeeId: string) => {
  return timeEntries.value
    .filter(entry => entry.employeeId === employeeId)
    .reduce((total, entry) => {
      return total + differenceInMinutes(entry.end, entry.start) / 60;
    }, 0);
};

// Add a function to calculate project progress
const getProjectProgress = (projectId: string) => {
  const projectTasks = tasks.value.filter(task => task.projectId === projectId);
  const completedTasks = projectTasks.filter(task => task.status === 'completed');
  return (completedTasks.length / projectTasks.length) * 100;
};

// Add to your component state
const activeTracking = ref<TimeTracking | null>(null);
const timerInterval = ref<number | null>(null);

// Add these methods to your component
const startTimeTracking = (entry: TimeEntry) => {
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
};

const stopTimeTracking = () => {
  if (activeTracking.value && timerInterval.value) {
    const { entryId, startTime, elapsed } = activeTracking.value;
    const entry = timeEntries.value.find(e => e.id === entryId);
    
    if (entry) {
      entry.end = new Date();
      // Here you would typically save the updated entry to your backend
    }
    
    clearInterval(timerInterval.value);
    activeTracking.value = null;
    timerInterval.value = null;
  }
};

const pauseTimeTracking = () => {
  if (activeTracking.value && timerInterval.value) {
    clearInterval(timerInterval.value);
    activeTracking.value.isRunning = false;
    timerInterval.value = null;
  }
};

const resumeTimeTracking = () => {
  if (activeTracking.value && !activeTracking.value.isRunning) {
    activeTracking.value.isRunning = true;
    activeTracking.value.startTime = new Date();
    
    timerInterval.value = window.setInterval(() => {
      if (activeTracking.value) {
        const now = new Date();
        activeTracking.value.elapsed = differenceInMinutes(now, activeTracking.value.startTime);
      }
    }, 1000);
  }
};
</script>

<template>
  <div class="scheduler-container">
    <!-- Header -->
    <div class="scheduler-header">
      <div class="header-left">
        <h1>Time Scheduler</h1>
        <Dropdown 
          v-model="selectedProject"
          :options="projects" 
          optionLabel="name" 
          placeholder="Filter by Project"
          class="project-filter"
        >
          <template #value="slotProps">
            <span 
              v-if="slotProps.value" 
              class="project-badge" 
              :style="{ backgroundColor: slotProps.value.color }"
            >
              {{ slotProps.value.name }}
            </span>
          </template>
        </Dropdown>
      </div>
      
      <div class="time-range">
        {{ format(timeRange.start, 'MMM dd') }} - {{ format(timeRange.end, 'MMM dd') }}
      </div>
      
      <div class="header-right">
        <Button icon="pi pi-plus" label="New Task" severity="success" @click="openNewTimeEntryDialog" />
        <Button icon="pi pi-filter" label="Filters" severity="secondary" />
      </div>
    </div>

    <!-- Main Grid -->
    <div class="scheduler-grid">
      <!-- Resource Column -->
      <div class="resource-column">
        <div class="resource-header">Team Members</div>
        <div 
          v-for="employee in employees" 
          :key="employee.id" 
          class="resource-row"
        >
          <Avatar :label="employee.avatar" size="large" shape="circle" />
          <div class="employee-info">
            <div class="employee-name">{{ employee.name }}</div>
            <div class="employee-role">{{ employee.role }}</div>
          </div>
        </div>
      </div>

      <!-- Timeline Grid -->
      <div class="timeline-column">
        <!-- Time Header -->
        <div class="time-header">
          <div v-for="line in hourLines" :key="line.time" class="time-slot">
            {{ line.time }}
          </div>
        </div>

        <!-- Timeline Grid -->
        <div class="timeline-grid">
          <!-- Hour Lines -->
          <div class="hour-lines">
            <div 
              v-for="line in hourLines" 
              :key="line.time" 
              class="hour-line"
              :style="{ left: `${line.position}%` }"
            />
          </div>

          <!-- Timeline Rows -->
          <div 
            v-for="employee in employees" 
            :key="employee.id" 
            class="timeline-row"
            @dragover.prevent
            @drop="handleDrop($event, employee, currentDate)"
          >
            <!-- Current Hour Indicator -->
            <div 
              v-if="isToday(currentDate)"
              class="current-hour-indicator"
              :style="{ left: `${calculatePosition(new Date())}%` }"
            />

            <!-- Time Entries -->
            <div 
              v-for="entry in timeEntries.filter(e => e.employeeId === employee.id)"
              :key="entry.id"
              class="time-entry"
              :class="{
                'is-tracking': activeTracking?.entryId === entry.id,
                'is-paused': activeTracking?.entryId === entry.id && !activeTracking.isRunning
              }"
              :style="{
                left: `${calculatePosition(entry.start)}%`,
                width: `${calculateWidth(entry.start, entry.end)}%`,
                backgroundColor: getProjectColor(entry)
              }"
              @click.stop="showEntryDetails(entry)"
            >
              <div class="entry-content">
                <div class="entry-header">
                  <div class="entry-title">{{ getTaskName(entry) }}</div>
                  <div class="tracking-controls">
                    <Button
                      v-if="!activeTracking || activeTracking.entryId !== entry.id"
                      icon="pi pi-play"
                      class="p-button-rounded p-button-sm p-button-text"
                      @click.stop="startTimeTracking(entry)"
                    />
                    <template v-else>
                      <Button
                        v-if="activeTracking.isRunning"
                        icon="pi pi-pause"
                        class="p-button-rounded p-button-sm p-button-text"
                        @click.stop="pauseTimeTracking()"
                      />
                      <Button
                        v-else
                        icon="pi pi-play"
                        class="p-button-rounded p-button-sm p-button-text"
                        @click.stop="resumeTimeTracking()"
                      />
                      <Button
                        icon="pi pi-stop"
                        class="p-button-rounded p-button-sm p-button-text"
                        @click.stop="stopTimeTracking()"
                      />
                    </template>
                  </div>
                </div>
                <div class="entry-info">
                  <div class="entry-time">
                    {{ format(entry.start, 'HH:mm') }} - {{ format(entry.end, 'HH:mm') }}
                  </div>
                  <div v-if="activeTracking?.entryId === entry.id" class="tracking-time">
                    {{ formatDuration(activeTracking.elapsed) }}
                  </div>
                </div>
              </div>
              <div class="resize-handle"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Pool -->
      <div class="task-pool">
        <div class="task-header">Available Tasks</div>
        <div 
          v-for="task in tasks" 
          :key="task.id" 
          class="task-item"
          draggable="true"
          @dragstart="handleDragStart(task)"
        >
          <div 
            class="task-color" 
            :style="{ backgroundColor: getProjectColorByTask(task) }"
          ></div>
          <div class="task-info">
            <div class="task-name">{{ task.name }}</div>
            <Tag :value="task.status" :severity="getStatusSeverity(task.status)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Current Time Indicator -->
    <div 
      class="current-time" 
      :style="{ left: `${calculatePosition(new Date())}%` }"
    >
      <div class="time-line"></div>
      <div class="time-label">{{ format(new Date(), 'HH:mm') }}</div>
    </div>

    <!-- Existing dialogs -->
    <!-- Entry Details Dialog -->
    <Dialog v-model:visible="showDetails" :header="selectedEntry?.task" modal>
      <div v-if="selectedEntry">
        <div class="flex items-center gap-2 mb-2">
          <Avatar :image="getEmployeeAvatar(selectedEntry.employee)" size="large" shape="circle" />
          <span>{{ selectedEntry.employee }}</span>
        </div>
        <div><b>Project:</b> {{ selectedEntry.project }}</div>
        <div><b>Time:</b> {{ formatTimeRange(selectedEntry.startTime, selectedEntry.endTime) }}</div>
        <div><b>Status:</b> <Tag :value="selectedEntry.status" :severity="getStatusSeverity(selectedEntry.status)" /></div>
        <div class="mt-2"><b>Description:</b> {{ selectedEntry.description }}</div>
      </div>
    </Dialog>

    <!-- New Time Entry Dialog -->
    <Dialog v-model:visible="showNewEntryDialog" header="New Time Entry" :modal="true" :style="{ width: '600px' }">
        <!-- Add your form elements here -->
        <template #footer>
            <Button label="Cancel" icon="pi pi-times" @click="showNewEntryDialog = false" class="p-button-text" />
            <Button label="Save" icon="pi pi-check" @click="saveNewTimeEntry" class="p-button-success" />
        </template>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.scheduler-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-ground);
}

.scheduler-grid {
  display: grid;
  grid-template-columns: 300px 1fr 250px;
  flex: 1;
  overflow: auto;
}

.scheduler-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--surface-ground);
  padding: 1.5rem;

  .scheduler-header {
    background: var(--surface-card);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: var(--card-shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 2rem;

      h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-color);
      }
    }

    .time-range {
      font-size: 1rem;
      color: var(--text-color-secondary);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
  }

  .scheduler-grid {
    display: flex;
    flex: 1;
    gap: 1rem;

    .resource-column {
      width: 200px;
      background: var(--surface-card);
      border-radius: 0.5rem;
      box-shadow: var(--card-shadow);
      overflow: hidden;

      .resource-header {
        padding: 1rem;
        font-weight: 600;
        background: var(--surface-section);
        border-bottom: 1px solid var(--surface-border);
      }

      .resource-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--surface-border);

        .employee-info {
          .employee-name {
            font-weight: 600;
          }

          .employee-role {
            font-size: 0.875rem;
            color: var(--text-color-secondary);
          }
        }
      }
    }

    .timeline-column {
      flex: 1;
      background: var(--surface-card);
      border-radius: 0.5rem;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      position: relative;

      .time-header {
        display: flex;
        background: var(--surface-section);
        border-bottom: 1px solid var(--surface-border);

        .time-slot {
          flex: 1;
          padding: 0.5rem;
          text-align: center;
          font-weight: 600;
          color: var(--text-color-secondary);
        }
      }

      .timeline-grid {
        position: relative;
        height: calc(100% - 50px); // Subtract header height

        .hour-lines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;

          .hour-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: var(--surface-border);
          }
        }

        .timeline-row {
          position: relative;
          height: 60px;
          border-bottom: 1px solid var(--surface-border);

          .current-hour-indicator {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--primary-color);
            z-index: 1;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: -4px;
              width: 10px;
              height: 10px;
              background: var(--primary-color);
              border-radius: 50%;
            }
          }

          &:hover {
            background: var(--surface-hover);
          }
        }
      }

      .time-entry {
        min-width: 60px;
        z-index: 2;

        &:hover {
          transform: translateY(-2px);
        }
      }
    }

    .task-pool {
      width: 200px;
      background: var(--surface-card);
      border-radius: 0.5rem;
      box-shadow: var(--card-shadow);
      overflow: hidden;

      .task-header {
        padding: 1rem;
        font-weight: 600;
        background: var(--surface-section);
        border-bottom: 1px solid var(--surface-border);
      }

      .task-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--surface-border);
        cursor: grab;

        .task-color {
          width: 8px;
          height: 40px;
          border-radius: 0.25rem;
        }

        .task-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          .task-name {
            font-weight: 600;
          }
        }
      }
    }
  }

  .current-time {
    position: absolute;
    top: 0;
    height: 100%;
    width: 2px;
    background: var(--primary-color);
    z-index: 1;

    .time-line {
      position: absolute;
      top: 0;
      left: -1px;
      width: 2px;
      height: 100%;
      background: var(--primary-color);
    }

    .time-label {
      position: absolute;
      top: -1.5rem;
      left: -1rem;
      background: var(--primary-color);
      color: var(--surface-card);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
  }
}

// Add to your existing .time-entry styles
.time-entry {
  &.is-tracking {
    border: 2px solid var(--primary-color);
    
    .tracking-controls {
      opacity: 1;
    }
  }
  
  &.is-paused {
    border-style: dashed;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .tracking-controls {
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      gap: 0.25rem;
      
      .p-button {
        width: 1.5rem;
        height: 1.5rem;
        
        .p-button-icon {
          font-size: 0.75rem;
        }
      }
    }
  }

  &:hover .tracking-controls {
    opacity: 1;
  }

  .entry-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .tracking-time {
      font-weight: 600;
      color: var(--primary-color);
    }
  }
}

// Responsive styles
@media (max-width: 1024px) {
  .scheduler-container {
    .scheduler-header {
      flex-direction: column;
      gap: 1rem;
    }

    .scheduler-grid {
      flex-direction: column;
    }
  }
}

@media (max-width: 768px) {
  .scheduler-container {
    padding: 0.5rem;

    .scheduler-header {
      .header-left {
        flex-direction: column;
        gap: 0.5rem;
      }

      .header-right {
        flex-direction: column;
        gap: 0.5rem;
      }
    }

    .scheduler-grid {
      .resource-column,
      .task-pool {
        width: 100%;
      }

      .timeline-column {
        .timeline-row {
          height: 40px;
        }
      }
    }
  }
}

.timeline-column {
  .timeline-header {
    .date-navigation {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-bottom: 1px solid var(--surface-border);
      
      .current-date {
        font-weight: 600;
        padding: 0 1rem;
      }
    }
    
    .time-slots {
      display: flex;
      background: var(--surface-section);
      
      .time-slot {
        flex: 1;
        text-align: center;
        padding: 0.5rem;
        border-right: 1px solid var(--surface-border);
        
        .hour {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-color-secondary);
        }
      }
    }
  }
  
  .timeline-grid {
    .hour-line {
      &.lunch-hour {
        background: var(--surface-hover);
      }
    }
    
    .timeline-row {
      &.is-dragging-over {
        background: var(--primary-50);
      }
    }
    
    .time-entry {
      position: absolute;
      height: calc(100% - 8px);
      margin: 4px 0;
      border-radius: 4px;
      transition: transform 0.2s, box-shadow 0.2s;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      &.has-conflict {
        border: 2px dashed var(--red-500);
      }
      
      .resize-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: ew-resize;
        
        &.left { left: 0; }
        &.right { right: 0; }
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }
}

// Add entry transitions
.entry-move {
  transition: transform 0.3s ease;
}

.entry-enter-active,
.entry-leave-active {
  transition: all 0.3s ease;
}

.entry-enter-from,
.entry-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>