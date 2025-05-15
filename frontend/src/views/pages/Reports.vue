<script setup>
import { useLayout } from '@/layout/composables/layout';
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { format } from 'date-fns';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const employeeData = ref([]);
const timeTrackingData = ref([]);
const lineData = ref(null);
const pieData = ref(null);
const barData = ref(null);
const lineOptions = ref(null);
const pieOptions = ref(null);
const barOptions = ref(null);
const loading = ref(true);
const selectedRole = ref('all');
const currentWeek = ref(new Date());

// Function to fetch employee data
const fetchEmployeeData = async () => {
  try {
    const query = `
      query {
        employees {
          employees {
            idEmployee
            nomEmployee
            role
            disabledUntil
          }
        }
      }
    `;
    const response = await axios.post('http://localhost:3000/graphql', { query });
    return response.data.data.employees.employees;
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return [];
  }
};

// Function to fetch time tracking data
const fetchTimeTrackingData = async () => {
  try {
    const query = `
      query {
        suivisDeTemp {
          idsuivi
          heure_debut_suivi
          heure_fin_suivi
          duree_suivi
          employee {
            idEmployee
            nomEmployee
          }
        }
      }
    `;
    const response = await axios.post('http://localhost:3000/graphql', { query });
    const data = response.data.data.suivisDeTemp;
    console.log('Raw time tracking data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching time tracking data:', error);
    return [];
  }
};

// Create a computed property for the days of the week
const displayedDays = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeek.value);
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    return { date };
  });
});

// Add computed property for roles
const availableRoles = computed(() => {
  const roles = ['all', ...new Set(employeeData.value.map(emp => emp.role))];
  return roles.map(role => ({
    label: role === 'all' ? 'Tous les rôles' : role,
    value: role
  }));
});

// Initialize charts after data is loaded
const initializeCharts = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

  // Chart 1: Employee role distribution
  pieData.value = {
    labels: ['Développeur', 'Chef de projet', 'Designer', 'Testeur'],
    datasets: [
      {
        data: [
          employeeData.value.filter(emp => emp.role === 'Développeur').length,
          employeeData.value.filter(emp => emp.role === 'Chef de projet').length,
          employeeData.value.filter(emp => emp.role === 'Designer').length,
          employeeData.value.filter(emp => emp.role === 'Testeur').length
        ],
        backgroundColor: [
          documentStyle.getPropertyValue('--p-indigo-500'),
          documentStyle.getPropertyValue('--p-purple-500'),
          documentStyle.getPropertyValue('--p-teal-500'),
          documentStyle.getPropertyValue('--p-orange-500')
        ],
        hoverBackgroundColor: [
          documentStyle.getPropertyValue('--p-indigo-400'),
          documentStyle.getPropertyValue('--p-purple-400'),
          documentStyle.getPropertyValue('--p-teal-400'),
          documentStyle.getPropertyValue('--p-orange-400')
        ]
      }
    ]
  };

  // Chart 2: Employee status by role
  const roles = ['Développeur', 'Chef de projet', 'Designer', 'Testeur'];
  barData.value = {
    labels: roles,
    datasets: [
      {
        label: 'Employés Actifs',
        backgroundColor: documentStyle.getPropertyValue('--p-primary-500'),
        data: roles.map(role => 
          employeeData.value.filter(emp => emp.role === role && !emp.disabledUntil).length
        )
      },
      {
        label: 'Employés Désactivés',
        backgroundColor: documentStyle.getPropertyValue('--p-primary-200'),
        data: roles.map(role => 
          employeeData.value.filter(emp => emp.role === role && emp.disabledUntil).length
        )
      }
    ]
  };

  // Chart 3: Time tracking by day of week
  lineData.value = {
    labels: displayedDays.value.map(day => format(day.date, 'EEE')),
    datasets: [
      {
        label: 'Heures travaillées',
        data: displayedDays.value.map(day => {
          const dayEntries = timeTrackingData.value
            .filter(entry => {
              if (!entry.heure_debut_suivi) return false;
              const entryDate = new Date(entry.heure_debut_suivi);
              const dayDate = day.date;
              // Add role filtering
              const matchesRole = selectedRole.value === 'all' || 
                employeeData.value.find(emp => 
                  emp.idEmployee === entry.employee.idEmployee && 
                  emp.role === selectedRole.value
                );
              return (
                entryDate.getDate() === dayDate.getDate() &&
                entryDate.getMonth() === dayDate.getMonth() &&
                entryDate.getFullYear() === dayDate.getFullYear() &&
                matchesRole
              );
            });

          const totalHours = dayEntries.reduce((total, entry) => {
            // Make sure duree_suivi is a number and convert from seconds to hours
            const duration = entry.duree_suivi ? Number(entry.duree_suivi) / 3600 : 0;
            return total + duration;
          }, 0);

          console.log(`Day ${format(day.date, 'EEE')}: ${totalHours.toFixed(2)} hours`);
          return totalHours.toFixed(2);
        }),
        fill: false,
        backgroundColor: documentStyle.getPropertyValue('--p-primary-500'),
        borderColor: documentStyle.getPropertyValue('--p-primary-500'),
        tension: 0.4
      }
    ]
  };

  // Chart options
  pieOptions.value = {
    plugins: {
      legend: {
        labels: { color: textColor }
      },
      title: { 
        display: true,
        text: 'Distribution des Rôles',
        color: textColor 
      }
    }
  };

  barOptions.value = {
    plugins: {
      legend: {
        labels: { color: textColor }
      },
      title: {
        display: true,
        text: 'Statut des Employés par Rôle',
        color: textColor
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          color: textColorSecondary,
          stepSize: 1
        },
        grid: {
          color: surfaceBorder
        }
      },
      x: {
        ticks: { 
          color: textColorSecondary 
        },
        grid: {
          display: false
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  lineOptions.value = {
    plugins: {
      legend: {
        labels: {
          color: textColor
        }
      },
      title: {
        display: true,
        text: 'Heures Travaillées par Jour',
        color: textColor
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary,
          font: {
            size: 14 // Increased font size
          }
        },
        grid: {
          color: surfaceBorder,
          drawBorder: false
        }
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        min: 0,
        max: 24,
        ticks: {
          color: textColorSecondary,
          stepSize: 1,
          callback: function(value) {
            return value + 'h';
          },
          font: {
            size: 14 // Increased font size
          },
          autoSkip: false,
          maxRotation: 0,
          padding: 10 // Added padding for better visibility
        },
        grid: {
          color: surfaceBorder,
          drawBorder: false,
          lineWidth: 1
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 14
        }
      }
    }
  };
};

// Navigation functions
const navigateWeek = (direction) => {
  const newDate = new Date(currentWeek.value);
  newDate.setDate(newDate.getDate() + (direction * 7));
  currentWeek.value = newDate;
  initializeCharts();
};

// Computed for period display
const weekPeriod = computed(() => {
  const firstDay = displayedDays.value[0].date;
  const lastDay = displayedDays.value[6].date;
  return `${format(firstDay, 'dd/MM')} - ${format(lastDay, 'dd/MM/yyyy')}`;
});

onMounted(async () => {
  try {
    // Fetch data in parallel
    const [employees, timeTracking] = await Promise.all([
      fetchEmployeeData(),
      fetchTimeTrackingData()
    ]);
    
    employeeData.value = employees;
    timeTrackingData.value = timeTracking;
    
    // Log data for debugging
    console.log('Employee data:', employeeData.value);
    console.log('Time tracking data:', timeTrackingData.value);
    
    // Initialize charts after data is loaded
    initializeCharts();
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Fluid class="grid grid-cols-12 gap-8">
    <div v-if="loading" class="col-span-12 flex justify-center items-center p-8">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <span class="ml-3 font-medium">Chargement des données...</span>
    </div>
    
    <template v-else>
      <!-- Pie chart for roles -->
      <div class="col-span-12 xl:col-span-6">
        <div class="card flex flex-col items-center">
          <div class="font-semibold text-xl mb-4">Distribution des Rôles</div>
          <Chart type="pie" :data="pieData" :options="pieOptions"></Chart>
        </div>
      </div>
      
      <!-- Bar chart for employee status -->
      <div class="col-span-12 xl:col-span-6">
        <div class="card">
          <div class="font-semibold text-xl mb-4">Statut des Employés</div>
          <Chart type="bar" :data="barData" :options="barOptions"></Chart>
        </div>
      </div>

      <!-- Line chart for time tracking -->
      <div class="col-span-12">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Suivi du Temps par Jour</div>
            <div class="flex items-center gap-4">
              <Dropdown
                v-model="selectedRole"
                :options="availableRoles"
                optionLabel="label"
                optionValue="value"
                placeholder="Sélectionner un rôle"
                class="w-48"
                @change="initializeCharts"
              />
              <div class="flex items-center gap-2">
                <Button
                  icon="pi pi-chevron-left"
                  @click="navigateWeek(-1)"
                  class="p-button-text"
                />
                <span class="font-medium">{{ weekPeriod }}</span>
                <Button
                  icon="pi pi-chevron-right"
                  @click="navigateWeek(1)"
                  class="p-button-text"
                />
              </div>
            </div>
          </div>
          <div class="chart-container">
            <Chart 
              type="line" 
              :data="lineData" 
              :options="lineOptions"
              style="height: 600px;" 
            />
          </div>
        </div>
      </div>
    </template>
  </Fluid>
</template>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  min-height: 600px;
  margin: 20px 0;
}

.card {
  padding: 1.5rem;
}

/* Make sure labels are visible */
:deep(.p-chart) {
  .p-chart-label {
    font-size: 14px;
  }
}

:deep(.p-dropdown) {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

:deep(.p-dropdown:not(.p-disabled):hover) {
  border-color: var(--primary-color);
}

:deep(.p-dropdown-label) {
  padding-right: 2.5rem;
}

:deep(.p-button-text) {
  padding: 0.5rem;
  color: var(--primary-color);
}

:deep(.p-button-text:hover) {
  background: var(--surface-hover);
}

:deep(.p-button-text .p-button-icon) {
  font-size: 1rem;
}
</style>