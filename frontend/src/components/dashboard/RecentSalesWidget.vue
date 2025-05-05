<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { FilterMatchMode } from '@primevue/core/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import ProgressSpinner from 'primevue/progressspinner';

const projects = ref([]);
const loading = ref(true);
const error = ref(null);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const statuses = ref([
    { label: 'TODO', value: 'todo' },
    { label: 'IN_PROGRESS', value: 'in_progress' },
    { label: 'END', value: 'end' }
]);

const fetchProjects = async () => {
    loading.value = true;
    try {
        const query = `
            query {
                projets {
                    idProjet
                    nom_projet
                    description_projet
                    date_debut_projet
                    date_fin_projet
                    statut_projet
                }
            }
        `;
        const response = await axios.post('http://localhost:3000/graphql', { query });
        let allProjects = response.data?.data?.projets || [];
        projects.value = allProjects.filter(project => project.statut_projet === 'in_progress' || project.statut_projet === 'todo');
    } catch (err) {
        console.error("Error fetching projects:", err);
        error.value = "Failed to load projects.";
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchProjects();
});

const formatDBDate = (dateString) => {
    if (!dateString) return '-';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

const getStatusLabel = (status) => {
    const statusSeverity = {
        todo: 'warn',
        in_progress: 'info',
        end: 'success'
    };
    return statusSeverity[status] || 'info';
};

const todoCount = computed(() => {
    return projects.value.filter(project => project.statut_projet === 'todo').length;
});

const inProgressCount = computed(() => {
    return projects.value.filter(project => project.statut_projet === 'in_progress').length;
});
</script>

<template>
    <div class="card">
        <div class="font-semibold text-xl mb-4">Recent Projects</div>
       

        <div v-if="loading" class="flex justify-center my-8">
            <ProgressSpinner />
        </div>

        <div v-else-if="error" class="text-red-500 text-center my-4">
            {{ error }}
        </div>

        <DataTable v-else :value="projects" :rows="5" :paginator="true" responsiveLayout="scroll" :filters="filters">
            <template #header>
                <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                  
                </div>
            </template>
            <Column field="nom_projet" header="Name" sortable></Column>
            <Column field="description_projet" header="Description" sortable></Column>
            <Column field="date_debut_projet" header="Start Date" sortable>
                <template #body="{ data }">
                    {{ formatDBDate(data.date_debut_projet) }}
                </template>
            </Column>
            <Column field="date_fin_projet" header="End Date" sortable>
                <template #body="{ data }">
                    {{ formatDBDate(data.date_fin_projet) }}
                </template>
            </Column>
            <Column field="statut_projet" header="Status" sortable>
                <template #body="{ data }">
                    <Tag :value="data.statut_projet" :severity="getStatusLabel(data.statut_projet)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
