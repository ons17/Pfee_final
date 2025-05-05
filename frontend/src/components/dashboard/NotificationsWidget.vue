<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';

const employees = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchEmployees = async () => {
    loading.value = true;
    try {
        const query = `
            query {
                employees {
                    employees {
                        idEmployee
                        nomEmployee
                        emailEmployee
                        role
                        disabledUntil
                    }
                }
            }
        `;
        const response = await axios.post('http://localhost:3000/graphql', { query });
        employees.value = response.data?.data?.employees?.employees || [];
    } catch (err) {
        console.error("Error fetching employees:", err);
        error.value = "Failed to load employees.";
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchEmployees();
});

const activeEmployeeCount = computed(() => {
    return employees.value.filter(employee => !employee.disabledUntil).length;
});

const formatDate = (dateString) => {
    if (!dateString) return 'Active';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};
</script>

<template>
    <div class="card">
        <h2>Employees</h2>

        <div v-if="loading" class="flex justify-center my-8">
            <ProgressSpinner />
        </div>

        <div v-else-if="error" class="text-red-500 text-center my-4">
            {{ error }}
        </div>

        <DataTable v-else :value="employees" responsiveLayout="scroll">
            <Column field="nomEmployee" header="Name" />
            <Column field="emailEmployee" header="Email" />
            <Column field="role" header="Role" />
            <Column field="disabledUntil" header="Disabled Until">
                <template #body="slotProps">
                    {{ formatDate(slotProps.data.disabledUntil) }}
                </template>
            </Column>
        </DataTable>
    </div>
</template>
