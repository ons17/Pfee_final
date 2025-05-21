<script setup>
import { useLayout } from '@/layout/composables/layout';
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import Chart from 'primevue/chart';
import Dropdown from 'primevue/dropdown';

const { getPrimary } = useLayout();
const employeeData = ref([]);
const radarData = ref(null);
const radarOptions = ref(null);
const loading = ref(true);
const selectedRole = ref('all');

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

// Add computed property for roles
const availableRoles = computed(() => {
  const roles = ['all', ...new Set(employeeData.value.map(emp => emp.role))];
  return roles.map(role => ({
    label: role === 'all' ? 'Tous les rôles' : role,
    value: role
  }));
});

const calculateMetric = (metricType, employee) => {
  // This is where you would implement your actual metric calculations
  return Math.floor(Math.random() * (95 - 60 + 1)) + 60;
};

const initializeChart = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

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

onMounted(async () => {
  try {
    employeeData.value = await fetchEmployeeData();
    initializeChart();
  } catch (error) {
    console.error('Error initializing performance chart:', error);
  } finally {
    loading.value = false;
  }
});

// Watch for role changes
watch(selectedRole, () => {
  initializeChart();
});
</script>

<template>
  <div class="card">
    <div v-if="loading" class="flex justify-content-center align-items-center p-4">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
      <span class="ml-3 font-medium">Chargement des données...</span>
    </div>
    
    <template v-else>
      <div class="flex justify-between items-center mb-4">
        <div class="font-semibold text-xl">Performance Metrics</div>
        <Dropdown
          v-model="selectedRole"
          :options="availableRoles"
          optionLabel="label"
          optionValue="value"
          placeholder="Sélectionner un rôle"
          class="w-48"
          @change="initializeChart"
        />
      </div>
      
      <div class="chart-container">
        <Chart 
          type="radar" 
          :data="radarData" 
          :options="radarOptions"
          style="height: 600px;" 
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.card {
  padding: 1.5rem;
  border-radius: 6px;
  background: var(--surface-card);
}

.chart-container {
  position: relative;
  margin: 20px 0;
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
</style>