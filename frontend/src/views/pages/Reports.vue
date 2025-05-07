<script setup>
import { useLayout } from '@/layout/composables/layout';
import { ref, onMounted } from 'vue';
import axios from 'axios';

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const employeeData = ref([]); // Pour stocker les données des employés
const lineData = ref(null);
const pieData = ref(null);
const polarData = ref(null);
const barData = ref(null);
const radarData = ref(null);
const lineOptions = ref(null);
const pieOptions = ref(null);
const polarOptions = ref(null);
const barOptions = ref(null);
const radarOptions = ref(null);

// Fonction pour récupérer les données des employés
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

// Ajoutez cette fonction pour récupérer les données de suivi de temps
const fetchTimeTrackingData = async () => {
  try {
    const query = `
      query {
        suivisDeTemp {
          idEmployee
          employee {
            nomEmployee
          }
          duree_suivi
        }
      }
    `;
    const response = await axios.post('http://localhost:3000/graphql', { query });
    return response.data.data.suivisDeTemp;
  } catch (error) {
    console.error('Error fetching time tracking data:', error);
    return [];
  }
};

onMounted(async () => {
  employeeData.value = await fetchEmployeeData();
  timeTrackingData.value = await fetchTimeTrackingData();
  setColorOptions();
});

const timeTrackingData = ref([]);

// Dans la fonction setColorOptions, modifiez lineOptions.value
function setColorOptions() {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--text-color');
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

  // Graphique 1: Distribution des rôles des employés
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

  // Graphique 2: Statut des employés (Actifs vs Désactivés)
  const roles = ['Développeur', 'Chef de projet', 'Designer', 'Testeur'];

  barData.value = {
    labels: roles, // Utiliser les rôles comme labels sur l'axe X
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

  // Modifiez la configuration du graphique linéaire
  lineData.value = {
    labels: employeeData.value
      .slice(0, 7)
      .map(emp => emp.nomEmployee),
    datasets: [
      {
        label: 'Heures travaillées',
        data: employeeData.value
          .slice(0, 7)
          .map(emp => {
            // Calculer le total des heures pour chaque employé
            const employeeEntries = timeTrackingData.value
              .filter(entry => entry.employee?.nomEmployee === emp.nomEmployee);
            
            const totalMinutes = employeeEntries
              .reduce((sum, entry) => sum + (parseInt(entry.duree_suivi) || 0), 0);
            
            console.log(`Employee ${emp.nomEmployee}: ${totalMinutes} minutes`); // Debug
            return (totalMinutes / 60).toFixed(2);
          }),
        fill: false,
        backgroundColor: documentStyle.getPropertyValue('--p-primary-500'),
        borderColor: documentStyle.getPropertyValue('--p-primary-500'),
        tension: 0.4
      },
      {
        label: 'Moyenne des heures',
        data: employeeData.value
          .slice(0, 7)
          .map(() => {
            const totalMinutes = timeTrackingData.value
              .reduce((sum, entry) => sum + (parseInt(entry.duree_suivi) || 0), 0);
            const average = totalMinutes / employeeData.value.length;
            return (average / 60).toFixed(2);
          }),
        fill: false,
        backgroundColor: documentStyle.getPropertyValue('--p-primary-200'),
        borderColor: documentStyle.getPropertyValue('--p-primary-200'),
        tension: 0.4
      }
    ]
  };

  lineOptions.value = {
    plugins: {
      legend: {
        labels: {
          color: textColor
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder,
          drawBorder: false
        }
      },
      y: {
        beginAtZero: true, // Forcer l'axe Y à commencer à zéro
        min: 0, // Définir la valeur minimale à 0
        ticks: {
          color: textColorSecondary,
          callback: (value) => `${value}h`,
          stepSize: 2 // Définir l'intervalle entre les valeurs
        },
        grid: {
          color: surfaceBorder,
          drawBorder: false
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  // Options des graphiques
  pieOptions.value = {
    plugins: {
      legend: {
        labels: { color: textColor },
        title: { 
          display: true,
          text: 'Distribution des Rôles',
          color: textColor 
        }
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
          stepSize: 1 // Pour avoir des nombres entiers sur l'axe Y
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
}
</script>

<template>
  <Fluid class="grid grid-cols-12 gap-8">
    <!-- Graphique en secteurs pour les rôles -->
    <div class="col-span-12 xl:col-span-6">
      <div class="card flex flex-col items-center">
        <div class="font-semibold text-xl mb-4">Distribution des Rôles</div>
        <Chart type="pie" :data="pieData" :options="pieOptions"></Chart>
      </div>
    </div>
    
    <!-- Graphique en barres pour le statut des employés -->
    <div class="col-span-12 xl:col-span-6">
      <div class="card">
        <div class="font-semibold text-xl mb-4">Statut des Employés</div>
        <Chart type="bar" :data="barData" :options="barOptions"></Chart>
      </div>
    </div>

    <!-- Graphique de suivi du temps -->
    <div class="col-span-12">
      <div class="card">
        <div class="font-semibold text-xl mb-4">Suivi du Temps par Employé</div>
        <Chart type="line" :data="lineData" :options="lineOptions"></Chart>
      </div>
    </div>
  </Fluid>
</template>
