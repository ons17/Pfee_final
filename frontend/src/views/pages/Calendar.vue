<script setup lang="ts">
import { ref, computed } from 'vue';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, isSameMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

// State
const currentDate = ref(new Date());
const currentView = ref('week');
const selectedProject = ref(null);
const showEventDetails = ref(false);
const selectedEvent = ref(null);

// Mock Data
const projects = ref([
  { id: 1, name: 'Project A', color: '#4CAF50', progress: 75 },
  { id: 2, name: 'Project B', color: '#2196F3', progress: 45 },
  { id: 3, name: 'Project C', color: '#FF9800', progress: 30 }
]);

const events = ref([
  {
    id: 1,
    title: 'Project A Development',
    startDate: new Date(2025, 3, 29, 9, 0),
    endDate: new Date(2025, 3, 29, 17, 0),
    projectId: 1,
    status: 'In Progress',
    assignee: 'John Doe',
    completion: 75
  },
  {
    id: 2,
    title: 'Bug Fixing Session',
    startDate: new Date(2025, 3, 29, 13, 0),
    endDate: new Date(2025, 3, 29, 15, 30),
    projectId: 2,
    status: 'Critical',
    assignee: 'Jane Smith',
    completion: 45
  }
]);

// Computed
const weeks = computed(() => {
  const start = startOfWeek(startOfMonth(currentDate.value), { weekStartsOn: 1 });
  const end = endOfMonth(currentDate.value);
  const weeks = [];
  let currentWeek = [];
  let currentDay = start;

  while (currentDay <= end) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push({
      date: currentDay,
      isCurrentMonth: isSameMonth(currentDay, currentDate.value),
      isToday: isSameDay(currentDay, new Date()),
      events: events.value.filter(event => isSameDay(currentDay, event.startDate))
    });

    currentDay = addDays(currentDay, 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
});

// Methods
const formatTime = (date: Date) => format(date, 'HH:mm');

const getEventColor = (projectId: number) => {
  const project = projects.value.find(p => p.id === projectId);
  return project?.color || '#999999';
};

const getEventStyles = (event) => {
  const color = getEventColor(event.projectId);
  return {
    backgroundColor: `${color}15`,
    borderLeft: `3px solid ${color}`,
    color: color
  };
};

const navigatePeriod = (direction: number) => {
  currentDate.value = addDays(currentDate.value, direction * (currentView.value === 'week' ? 7 : 30));
};

const showEventInfo = (event) => {
  selectedEvent.value = event;
  showEventDetails.value = true;
};
</script>

<template>
  <div class="calendar-container">
    <!-- Header -->
    <div class="calendar-header">
      <div class="header-left">
        <h1>Calendar</h1>
        <div class="view-controls">
          <Button 
            v-for="view in ['week', 'month']" 
            :key="view"
            :class="{ active: currentView === view }"
            class="p-button-text"
            @click="currentView = view"
          >
            {{ view.charAt(0).toUpperCase() + view.slice(1) }}
          </Button>
        </div>
      </div>

      <div class="header-right">
        <div class="navigation-controls">
          <Button 
            icon="pi pi-chevron-left" 
            class="p-button-text" 
            @click="navigatePeriod(-1)"
          />
          <span class="current-date">{{ format(currentDate, 'MMMM yyyy', { locale: fr }) }}</span>
          <Button 
            icon="pi pi-chevron-right" 
            class="p-button-text" 
            @click="navigatePeriod(1)"
          />
        </div>

        <Dropdown
          v-model="selectedProject"
          :options="projects"
          optionLabel="name"
          placeholder="Filter by Project"
          class="project-filter"
        >
          <template #value="slotProps">
            <div class="project-option" v-if="slotProps.value">
              <div class="color-dot" :style="{ backgroundColor: slotProps.value.color }"></div>
              <span>{{ slotProps.value.name }}</span>
            </div>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="project-option">
              <div class="color-dot" :style="{ backgroundColor: slotProps.option.color }"></div>
              <span>{{ slotProps.option.name }}</span>
              <ProgressBar 
                :value="slotProps.option.progress" 
                :showValue="false"
                class="project-progress"
              />
            </div>
          </template>
        </Dropdown>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid">
      <!-- Weekday Headers -->
      <div class="weekdays-header">
        <div v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" 
             :key="day" 
             class="weekday-header"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Body -->
      <div class="calendar-body">
        <div v-for="(week, weekIndex) in weeks" 
             :key="weekIndex" 
             class="calendar-week"
        >
          <div v-for="day in week" 
               :key="day.date.toISOString()"
               class="calendar-day"
               :class="{
                 'current-month': day.isCurrentMonth,
                 'today': day.isToday,
                 'weekend': [6, 0].includes(day.date.getDay())
               }"
          >
            <div class="day-header">
              <span class="day-number">{{ format(day.date, 'd') }}</span>
              <span v-if="day.isToday" class="today-badge">Today</span>
            </div>

            <div class="day-events">
              <div v-for="event in day.events" 
                   :key="event.id"
                   class="event-item"
                   :style="getEventStyles(event)"
                   @click="showEventInfo(event)"
              >
                <div class="event-time">{{ formatTime(event.startDate) }}</div>
                <div class="event-title">{{ event.title }}</div>
                <div class="event-details">
                  <span class="event-assignee">{{ event.assignee }}</span>
                  <Tag :value="event.status" 
                       :severity="event.status === 'Critical' ? 'danger' : 'info'" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Details Dialog -->
    <Dialog 
      v-model:visible="showEventDetails"
      :header="selectedEvent?.title"
      modal
      :style="{ width: '450px' }"
    >
      <div class="event-details-content" v-if="selectedEvent">
        <div class="detail-row">
          <i class="pi pi-calendar"></i>
          <div>{{ format(selectedEvent.startDate, 'MMM dd, yyyy') }}</div>
        </div>
        <div class="detail-row">
          <i class="pi pi-clock"></i>
          <div>{{ formatTime(selectedEvent.startDate) }} - {{ formatTime(selectedEvent.endDate) }}</div>
        </div>
        <div class="detail-row">
          <i class="pi pi-user"></i>
          <div>{{ selectedEvent.assignee }}</div>
        </div>
        <div class="detail-row">
          <i class="pi pi-chart-bar"></i>
          <div class="progress-info">
            <ProgressBar :value="selectedEvent.completion" />
            <small>{{ selectedEvent.completion }}% Complete</small>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.calendar-container {
  padding: 2rem;
  height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--surface-ground);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
}

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

.view-controls {
  display: flex;
  gap: 0.5rem;

  .p-button {
    &.active {
      background: var(--primary-color);
      color: var(--primary-color-text);
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.navigation-controls {
  display: flex;
  align-items: center;
  gap: 1rem;

  .current-date {
    min-width: 150px;
    text-align: center;
    font-weight: 600;
  }
}

.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.weekdays-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
}

.weekday-header {
  padding: 1rem;
  text-align: center;
  font-weight: 600;
  color: var(--text-color-secondary);
}

.calendar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.calendar-week {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--surface-border);

  &:last-child {
    border-bottom: none;
  }
}

.calendar-day {
  padding: 0.5rem;
  border-right: 1px solid var(--surface-border);
  min-height: 120px;
  display: flex;
  flex-direction: column;

  &:last-child {
    border-right: none;
  }

  &.weekend {
    background: var(--surface-section);
  }

  &.today {
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
  }
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;

  .day-number {
    font-weight: 600;
  }

  .today-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    background: var(--primary-color);
    color: var(--primary-color-text);
  }
}

.day-events {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
}

.event-item {
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateX(2px);
  }

  .event-time {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .event-title {
    font-weight: 500;
    margin: 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.25rem;
  }

  .event-assignee {
    font-size: 0.75rem;
    opacity: 0.8;
  }
}

.project-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;

  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .project-progress {
    width: 60px;
    height: 4px;
  }
}

.event-details-content {
  padding: 1rem;

  .detail-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;

    i {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-ground);
      border-radius: 50%;
      color: var(--primary-color);
    }

    .progress-info {
      flex: 1;

      small {
        display: block;
        margin-top: 0.25rem;
        color: var(--text-color-secondary);
      }
    }
  }
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 1rem;
  }

  .calendar-header {
    flex-direction: column;
    gap: 1rem;

    .header-left, .header-right {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
