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
const radarData = ref(null);
const lineOptions = ref(null);
const pieOptions = ref(null);
const barOptions = ref(null);
const radarOptions = ref(null);
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
  const date = new Date(currentWeek.value);
  // Get Monday of current week
  const firstDay = new Date(date);
  firstDay.setDate(date.getDate() - date.getDay() + 1);
  
  return Array.from({ length: 7 }, (_, i) => {
    const currentDate = new Date(firstDay);
    currentDate.setDate(firstDay.getDate() + i);
    return { date: currentDate };
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
  const uniqueRoles = computed(() => {
    return [...new Set(employeeData.value.map(emp => emp.role))];
  });

  // Calculate total employees for percentage
  const totalEmployees = employeeData.value.length;

  pieData.value = {
    labels: uniqueRoles.value.map(role => {
      const count = employeeData.value.filter(emp => emp.role === role).length;
      const percentage = ((count / totalEmployees) * 100).toFixed(1);
      return `${role} (${percentage}%)`;
    }),
    datasets: [
      {
        data: uniqueRoles.value.map(role => 
          employeeData.value.filter(emp => emp.role === role).length
        ),
        backgroundColor: uniqueRoles.value.map((_, index) => {
          const colors = [
            documentStyle.getPropertyValue('--p-indigo-500'),
            documentStyle.getPropertyValue('--p-purple-500'),
            documentStyle.getPropertyValue('--p-teal-500'),
            documentStyle.getPropertyValue('--p-orange-500'),
            documentStyle.getPropertyValue('--p-blue-500'),
            documentStyle.getPropertyValue('--p-green-500')
          ];
          return colors[index % colors.length];
        }),
        hoverBackgroundColor: uniqueRoles.value.map((_, index) => {
          const colors = [
            documentStyle.getPropertyValue('--p-indigo-400'),
            documentStyle.getPropertyValue('--p-purple-400'),
            documentStyle.getPropertyValue('--p-teal-400'),
            documentStyle.getPropertyValue('--p-orange-400'),
            documentStyle.getPropertyValue('--p-blue-400'),
            documentStyle.getPropertyValue('--p-green-400')
          ];
          return colors[index % colors.length];
        })
      }
    ]
  };

  // Chart 2: Employee status by role
  const roles = uniqueRoles.value;
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

  // Chart 3: Time tracking by day of week with individual employee curves
  lineData.value = {
    labels: displayedDays.value.map(day => format(day.date, 'EEE dd/MM')), // Add day/month to labels
    datasets: employeeData.value
      .filter(emp => selectedRole.value === 'all' || emp.role === selectedRole.value)
      .map((employee, index) => ({
        label: employee.nomEmployee,
        data: displayedDays.value.map(day => {
          const dayStart = new Date(day.date);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(day.date);
          dayEnd.setHours(23, 59, 59, 999);

          const dayEntries = timeTrackingData.value
            .filter(entry => {
              if (!entry.heure_debut_suivi) return false;
              const entryDate = new Date(entry.heure_debut_suivi);
              return (
                entry.employee.idEmployee === employee.idEmployee &&
                entryDate >= dayStart &&
                entryDate <= dayEnd
              );
            });

          const totalHours = dayEntries.reduce((total, entry) => {
            // Convert duration from seconds to hours
            const duration = entry.duree_suivi ? Number(entry.duree_suivi) / 3600 : 0;
            return Math.min(total + duration, 9); // Cap at 9 hours
          }, 0);

          return Number(totalHours.toFixed(2));
        }),
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
        backgroundColor: `hsla(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%, 0.1)`,
        pointBackgroundColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle'
      }))
  };

  // Radar Chart Configuration
  radarData.value = {
    labels: ['Time Management', 'Team Collaboration', 'Task Completion', 'Communication', 'Technical Skills', 'Problem Solving', 'Productivity'],
    datasets: employeeData.value
      .filter(emp => selectedRole.value === 'all' || emp.role === selectedRole.value)
      .map((employee, index) => ({
        label: employee.nomEmployee,
        borderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
        pointBackgroundColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
        pointBorderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
        pointHoverBackgroundColor: textColor,
        pointHoverBorderColor: `hsl(${142 + (index * 20)}, 70%, ${45 + (index * 5)}%)`,
        data: [
          calculateMetric('timeManagement', employee),
          calculateMetric('teamCollaboration', employee),
          calculateMetric('taskCompletion', employee),
          calculateMetric('communication', employee),
          calculateMetric('technicalSkills', employee),
          calculateMetric('problemSolving', employee),
          calculateMetric('productivity', employee)
        ]
      }))
  };

  // Chart options
  pieOptions.value = {
    plugins: {
      legend: {
        labels: { 
          color: textColor,
          generateLabels: (chart) => {
            const data = chart.data;
            return data.labels.map((label, index) => ({
              text: label,
              fillStyle: data.datasets[0].backgroundColor[index],
              strokeStyle: data.datasets[0].backgroundColor[index],
              lineWidth: 1,
              hidden: false,
              index: index
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      title: { 
        display: true,
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
        position: 'bottom',
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 600
          },
          generateLabels: function(chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.backgroundColor,
              strokeStyle: dataset.borderColor,
              lineWidth: 2,
              pointStyle: 'circle',
              fontColor: textColor,
              datasetIndex: i
            }));
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#000',
        bodyColor: '#000',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (tooltipItems) => {
            const date = displayedDays.value[tooltipItems[0].dataIndex].date;
            return format(date, 'EEEE dd/MM/yyyy');
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y}h`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: surfaceBorder,
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          color: textColorSecondary,
          font: {
            size: 12,
            weight: '600'
          },
          maxRotation: 45, // Allow rotation for better readability
          minRotation: 45
        }
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        min: 0,
        max: 9,
        grid: {
          color: surfaceBorder,
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          color: textColorSecondary,
          stepSize: 1,
          font: {
            size: 14,
            weight: '600'
          },
          callback: function(value) {
            return value + 'h';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    responsive: true,
    maintainAspectRatio: false
  };

  radarOptions.value = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 600
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.r}/100`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          color: textColorSecondary,
          font: {
            size: 12
          }
        },
        grid: {
          color: surfaceBorder
        },
        pointLabels: {
          color: textColor,
          font: {
            size: 14,
            weight: '500'
          }
        }
      }
    },
    maintainAspectRatio: false
  };
};

// Navigation functions
const navigateWeek = (direction) => {
  const newDate = new Date(currentWeek.value);
  newDate.setHours(0, 0, 0, 0); // Reset time part
  newDate.setDate(newDate.getDate() + (direction * 7));
  currentWeek.value = newDate;
  initializeCharts();
};

// Computed for period display
const weekPeriod = computed(() => {
  const firstDay = displayedDays.value[0].date;
  const lastDay = displayedDays.value[6].date;
  
  // Show full date for both days if they're in different months or years
  if (firstDay.getMonth() !== lastDay.getMonth() || 
      firstDay.getFullYear() !== lastDay.getFullYear()) {
    return `${format(firstDay, 'dd/MM/yyyy')} - ${format(lastDay, 'dd/MM/yyyy')}`;
  }
  
  // Otherwise just show day/month for first date and full date for last
  return `${format(firstDay, 'dd/MM')} - ${format(lastDay, 'dd/MM/yyyy')}`;
});

// Add this helper function to calculate metrics
const calculateMetric = (metricType, employee) => {
  // This is where you would implement your actual metric calculations
  // For now, returning random values between 60 and 95
  return Math.floor(Math.random() * (95 - 60 + 1)) + 60;
};

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

      <!-- Radar chart for employee skills -->
      <div class="col-span-12 xl:col-span-6">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <div class="font-semibold text-xl">Performance Metrics</div>
            <Dropdown
              v-model="selectedRole"
              :options="availableRoles"
              optionLabel="label"
              optionValue="value"
              placeholder="Sélectionner un rôle"
              class="w-48"
              @change="initializeCharts"
            />
          </div>
          <div class="chart-container">
            <Chart 
              type="radar" 
              :data="radarData" 
              :options="radarOptions"
              style="height: 400px;" 
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