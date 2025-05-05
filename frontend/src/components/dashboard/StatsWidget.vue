<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const totalEmployees = ref(0);
const activeEmployees = ref(0);
const todoProjects = ref(0);
const inProgressProjects = ref(0);

const fetchEmployeeStats = async () => {
    try {
        const employeeQuery = `
            query {
                employees {
                    employees {
                        idEmployee
                        disabledUntil
                    }
                }
            }
        `;
        const projectQuery = `
            query {
                projets {
                    statut_projet
                }
            }
        `;

        const employeeResponse = await axios.post('http://localhost:3000/graphql', { query: employeeQuery });
        const projectResponse = await axios.post('http://localhost:3000/graphql', { query: projectQuery });

        const employees = employeeResponse.data?.data?.employees?.employees || [];
        const projects = projectResponse.data?.data?.projets || [];

        totalEmployees.value = employees.length;
        activeEmployees.value = employees.filter(employee => !employee.disabledUntil).length;
        todoProjects.value = projects.filter(project => project.statut_projet === 'todo').length;
        inProgressProjects.value = projects.filter(project => project.statut_projet === 'in_progress').length;

    } catch (error) {
        console.error("Error fetching data:", error);
    }
};
onMounted(() => {
    fetchEmployeeStats();
});
</script>

<template>
    <!-- Total Employees -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 p-4">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-gray-500 font-medium mb-2">Total Employees</span>
            <div class="text-gray-900 dark:text-white font-semibold text-xl">{{ totalEmployees }}</div>
          </div>
          <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-lg w-10 h-10">
            <i class="pi pi-users text-blue-500 text-xl"></i>
          </div>
        </div>
        <span class="text-green-600 font-medium">{{ activeEmployees }}</span>
        <span class="text-gray-500 ml-2">active employees</span>
      </div>
    </div>
  
    <!-- TODO Projects -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 p-4">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-gray-500 font-medium mb-2">Projects (To Do)</span>
            <div class="text-gray-900 dark:text-white font-semibold text-xl">{{ todoProjects }}</div>
          </div>
          <div class="flex items-center justify-center bg-yellow-100 dark:bg-yellow-400/10 rounded-lg w-10 h-10">
            <i class="pi pi-calendar text-yellow-500 text-xl"></i>
          </div>
        </div>
        <span class="text-yellow-600 font-medium">Waiting to start</span>
      </div>
    </div>
  
    <!-- In Progress Projects -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 p-4">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-gray-500 font-medium mb-2">Projects (In Progress)</span>
            <div class="text-gray-900 dark:text-white font-semibold text-xl">{{ inProgressProjects }}</div>
          </div>
          <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-lg w-10 h-10">
            <i class="pi pi-spinner text-orange-500 text-xl"></i>
          </div>
        </div>
        <span class="text-orange-600 font-medium">Currently active</span>
      </div>
    </div>
  
    <!-- Customers -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 p-4">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-gray-500 font-medium mb-2">Customers</span>
            <div class="text-gray-900 dark:text-white font-semibold text-xl">28,441</div>
          </div>
          <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-lg w-10 h-10">
            <i class="pi pi-user-plus text-cyan-500 text-xl"></i>
          </div>
        </div>
        <span class="text-cyan-600 font-medium">520</span>
        <span class="text-gray-500 ml-2">newly registered</span>
      </div>
    </div>
  
    

  </template>
  