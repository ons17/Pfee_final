<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import axios from 'axios';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useQuery } from '@vue/apollo-composable';
import gql from 'graphql-tag';
import Toolbar from 'primevue/toolbar';
import Chip from 'primevue/chip';
import Select from 'primevue/select'; // Add this import

const router = useRouter();
const toast = useToast();

// Form data with validation state
const form = reactive({
  nom: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'SUPERVISOR',
});

// Form validation
const errors = reactive({
  nom: '',
  email: '',
  password: '',
  confirmPassword: '' 
});

// Component state
const isSubmitting = ref(false);
const showSuccess = ref(false);
const passwordStrength = ref(0);
const confirmDialogVisible = ref(false);
const projectDialog = ref(false);
const selectedSupervisor = ref(null);
const selectedProject = ref(null);
const assigningProject = ref(false);
const availableProjects = ref([]);

// Add query to get supervisors
const GET_SUPERVISORS = gql`
  query {
    allAdministrateurs {
      idAdministrateur
      nom_administrateur 
      email_administrateur
      role
      projets {
        idProjet
        nom_projet
        description_projet
        statut_projet
      }
    }
  }
`;

// Add query to get available projects
const GET_AVAILABLE_PROJECTS = gql`
  query {
    getAvailableProjects {
      idProjet
      nom_projet
      description_projet
      statut_projet
    }
  }
`;

// Add reactive refs for supervisors
const supervisors = ref([]);
const loading = ref(true);

// Query supervisors
const { result: supervisorsResult } = useQuery(GET_SUPERVISORS);

// Watch for query results
watch(supervisorsResult, (newResult) => {
  console.log('Raw supervisor data:', newResult); // Debug log
  if (newResult?.allAdministrateurs) {
    supervisors.value = newResult.allAdministrateurs
      .filter(admin => admin.role.toLowerCase() === 'supervisor')
      .map(supervisor => ({
        ...supervisor,
        // Ensure projets is always an array
        projets: Array.isArray(supervisor.projets) ? supervisor.projets : []
      }));
    console.log('Processed supervisors:', supervisors.value); // Debug log
    loading.value = false;
  }
});

// Form validation functions
const validateForm = () => {
  let isValid = true;
  
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '');
  
  // Name validation
  if (!form.nom.trim()) {
    errors.nom = 'Name is required';
    isValid = false;
  } else if (form.nom.length < 2) {
    errors.nom = 'Name must be at least 2 characters';
    isValid = false;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!emailRegex.test(form.email)) {
    errors.email = 'Please enter a valid email address';
    isValid = false;
  }
  
  // Password validation
  if (!form.password) {
    errors.password = 'Password is required';
    isValid = false;
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
    isValid = false;
  }
  
  // Confirm password
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
    isValid = false;
  }
  
  return isValid;
};

// Check password strength
const checkPasswordStrength = (password) => {
  if (!password) {
    passwordStrength.value = 0;
    return;
  }
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 20;
  
  // Contains lowercase
  if (/[a-z]/.test(password)) strength += 20;
  
  // Contains uppercase
  if (/[A-Z]/.test(password)) strength += 20;
  
  // Contains number
  if (/[0-9]/.test(password)) strength += 20;
  
  // Contains special character
  if (/[^A-Za-z0-9]/.test(password)) strength += 20;
  
  passwordStrength.value = strength;
};

const getPasswordClass = () => {
  if (passwordStrength.value < 40) return 'p-progressbar-danger';
  if (passwordStrength.value < 80) return 'p-progressbar-warning';
  return 'p-progressbar-success';
};

// Handle password input
const handlePasswordChange = () => {
  checkPasswordStrength(form.password);
};

// Show confirmation dialog
const showConfirmDialog = () => {
  if (validateForm()) {
    confirmDialogVisible.value = true;
  } else {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fix the errors in the form', life: 3000 });
  }
};

// Submit form
const createSupervisor = async () => {
  try {
    isSubmitting.value = true;
    confirmDialogVisible.value = false;

    const mutation = `
      mutation CreateAdministrateur($nom: String!, $email: String!, $password: String!, $role: String!) {
        createAdministrateur(
          nom_administrateur: $nom,
          email_administrateur: $email,
          password_administrateur: $password,
          role: $role
        ) {
          success
          message
          administrateur {
            idAdministrateur
            nom_administrateur
            email_administrateur
            role
          }
        }
      }
    `;

    const variables = {
      nom: form.nom,
      email: form.email,
      password: form.password,
      role: form.role,
    };

    const response = await axios.post(import.meta.env.VITE_API_URL || 'http://localhost:3000/graphql', 
      { query: mutation, variables },
      { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    const result = response.data.data?.createAdministrateur;

    if (result?.success) {
      toast.add({ 
        severity: 'success', 
        summary: 'Success', 
        detail: `Supervisor ${form.nom} has been created successfully`, 
        life: 3000 
      });
      
      // Reset form
      Object.keys(form).forEach(key => {
        if (key !== 'role') form[key] = '';
      });
      
      showSuccess.value = true;
      setTimeout(() => {
        showSuccess.value = false;
      }, 3000);
      
      // Log for analytics
      if (result.administrateur) {
        console.log('New supervisor created:', result.administrateur.idAdministrateur);
      } else {
        console.log('New supervisor created, but ID is missing in response.');
      }
      
      // Optionally redirect to supervisors list after short delay
      setTimeout(() => {
        router.push('/app')
      }, 2000);
    } else {
      throw new Error(result?.message || 'Failed to create supervisor');
    }
  } catch (error) {
    console.error('Error creating supervisor:', error);
    let errorMessage = 'Failed to create supervisor';
    
    if (error.response?.data?.errors) {
      errorMessage = error.response.data.errors[0].message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: errorMessage, 
      life: 5000 
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Cancel form submission
const cancelCreation = () => {
  confirmDialogVisible.value = false;
};

// Initialize component
onMounted(() => {
  // Any initialization logic can go here
  document.title = 'ImbusFlow';
});

// Add these refs
const dt = ref(null);
const selectedSupervisors = ref(null);
const filters = ref({});
const supervisorDialog = ref(false);
const deleteSupervisorDialog = ref(false);
const addSupervisorDialog = ref(false);
const submitted = ref(false);

// Add these methods
const exportCSV = () => {
  dt.value?.exportCSV();
};

const deleteSupervisor = async (supervisor) => {
  // Implementation for delete
};

const openNew = () => {
  form.nom = '';
  form.email = '';
  form.password = '';
  form.confirmPassword = '';
  form.role = 'SUPERVISOR';
  submitted.value = false;
  addSupervisorDialog.value = true;
};

const hideDialog = () => {
  addSupervisorDialog.value = false;
  submitted.value = false;
};

// Project assignment methods
const openProjectDialog = () => {
  if (!selectedSupervisors.value || selectedSupervisors.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select at least one supervisor',
      life: 3000
    });
    return;
  }
  
  // If only one supervisor is selected, set it as the selected supervisor
  if (selectedSupervisors.value.length === 1) {
    selectedSupervisor.value = selectedSupervisors.value[0];
  }
  
  projectDialog.value = true;
  fetchAvailableProjects();
};

const hideProjectDialog = () => {
  projectDialog.value = false;
  selectedSupervisor.value = null;
  selectedProject.value = null;
};

const fetchAvailableProjects = async () => {
  try {
    const response = await axios.post(
      import.meta.env.VITE_API_URL || 'http://localhost:3000/graphql',
      {
        query: `
          query {
            getAvailableProjects {
              idProjet
              nom_projet
              description_projet
              statut_projet
            }
          }
        `
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (response.data.data?.getAvailableProjects) {
      availableProjects.value = response.data.data.getAvailableProjects;
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch projects',
        life: 3000
      });
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to fetch projects',
      life: 3000
    });
  }
};

const assignProject = async () => {
  if (!selectedProject.value) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Please select a project',
      life: 3000
    });
    return;
  }

  assigningProject.value = true;
  try {
    for (const supervisor of selectedSupervisors.value) {
      const mutation = `
        mutation AssignProject($supervisorId: ID!, $projectId: ID!) {
          assignProjetToSupervisor(
            idAdministrateur: $supervisorId,
            idProjet: $projectId
          ) {
            idSupervisorProjet
          }
        }
      `;

      const variables = {
        supervisorId: supervisor.idAdministrateur,
        projectId: selectedProject.value.idProjet
      };

      await axios.post(
        import.meta.env.VITE_API_URL || 'http://localhost:3000/graphql',
        { query: mutation, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
    }

    // Force refetch of supervisors data
    await refetch();
    
    // Clear selection and update UI
    selectedProject.value = null;
    selectedSupervisors.value = null;
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project assigned successfully',
      life: 3000
    });

    hideProjectDialog();
  } catch (error) {
    console.error('Error assigning project:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to assign project',
      life: 3000
    });
  } finally {
    assigningProject.value = false;
  }
};

// Add the refetch function using Apollo Client
const { refetch } = useQuery(GET_SUPERVISORS);

// Add this method in the script section
const getProjectStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'todo':
      return 'bg-blue-100 text-blue-700';
    case 'in_progress':
      return 'bg-orange-100 text-orange-700';
    case 'end':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};
</script>

<template>
  <div class="supervisor-page p-4">
    <div class="card">
      <Toolbar class="mb-4">
        <template #start>
          <div class="flex gap-2">
            <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
          </div>
        </template>
        <template #end>
          <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
        </template>
      </Toolbar>

      <DataTable 
        ref="dt"
        :value="supervisors"
        v-model:selection="selectedSupervisors"
        dataKey="idAdministrateur"
        :paginator="true"
        :rows="10"
        :filters="filters"
        :loading="loading"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[5, 10, 25]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} supervisors"
        responsiveLayout="scroll"
      >
        <Column field="nom_administrateur" header="Name" sortable style="min-width: 14rem">
          <template #header>
            <div class="flex justify-content-between align-items-center">
            </div>
          </template>
        </Column>
        <Column field="email_administrateur" header="Email" sortable style="min-width: 14rem">
          <template #header>
            <div class="flex justify-content-between align-items-center">
            </div>
          </template>
        </Column>
        <Column field="role" header="Role" sortable style="min-width: 10rem" />
        
        
      </DataTable>

      <!-- Add Supervisor Dialog -->
      <Dialog 
        v-model:visible="addSupervisorDialog" 
        header="Add New Supervisor" 
        modal 
        class="p-fluid" 
        :style="{ width: '50%' }"
      >
        <div class="p-fluid">
          <div class="field">
            <label for="nom">Name</label>
            <InputText 
              id="nom" 
              v-model="form.nom" 
              required 
              class="p-inputtext-lg"
              :class="{'p-invalid': errors.nom}"
            />
            <small class="p-error">{{ errors.nom }}</small>
          </div>

          <div class="field">
            <label for="email">Email</label>
            <InputText 
              id="email" 
              v-model="form.email" 
              required 
              type="email" 
              class="p-inputtext-lg"
              :class="{'p-invalid': errors.email}"
            />
            <small class="p-error">{{ errors.email }}</small>
          </div>

          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="field">
                <label for="password">Password</label>
                <Password
                  id="password"
                  v-model="form.password"
                  required
                  toggleMask
                  class="w-full"
                  :class="{'p-invalid': errors.password}"
                  @input="handlePasswordChange"
                />
                <div class="mt-2">
                  <ProgressBar :value="passwordStrength" :class="getPasswordClass()" />
                  <div class="text-xs mt-1 text-gray-600">
                    Password strength: {{ passwordStrength >= 80 ? 'Strong' : passwordStrength >= 40 ? 'Medium' : 'Weak' }}
                  </div>
                </div>
                <small class="p-error">{{ errors.password }}</small>
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="field">
                <label for="confirmPassword">Confirm Password</label>
                <Password
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  required
                  toggleMask
                  class="w-full"
                  :class="{'p-invalid': errors.confirmPassword}"
                  :feedback="false"
                />
                <small class="p-error">{{ errors.confirmPassword }}</small>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
          <Button label="Save" icon="pi pi-check" class="p-button-text" @click="showConfirmDialog" />
        </template>
      </Dialog>

      <!-- Confirm Supervisor Creation Dialog -->
      <Dialog v-model:visible="confirmDialogVisible" header="Confirm Supervisor Creation" :modal="true" :closable="false">
        <div class="p-4">
          <p class="mb-4">Are you sure you want to create a new supervisor with the following information?</p>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="grid grid-cols-2 gap-2">
              <div class="font-semibold">Name:</div>
              <div>{{ form.nom }}</div>
              <div class="font-semibold">Email:</div>
              <div>{{ form.email }}</div>
              <div class="font-semibold">Role:</div>
              <div>Supervisor</div>
            </div>
          </div>
        </div>
        <template #footer>
          <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="cancelCreation" />
          <Button label="Confirm" icon="pi pi-check" class="p-button-primary" @click="createSupervisor" :loading="isSubmitting" />
        </template>
      </Dialog>

      <!-- Project Assignment Dialog -->
      <Dialog 
        v-model:visible="projectDialog" 
        header="Assign Project to Supervisor" 
        :modal="true"
        class="p-fluid" 
        :style="{ width: '50%' }"
      >
        <!-- Show selected supervisors -->
        <div class="field">
          <label>Selected Supervisors</label>
          <div class="flex flex-wrap gap-2 p-2 bg-gray-50 rounded">
            <Chip 
              v-for="supervisor in selectedSupervisors" 
              :key="supervisor.idAdministrateur"
              :label="supervisor.nom_administrateur"
            />
          </div>
        </div>

        <div class="field">
          <label for="project">Project</label>
          <Select
            id="project"
            v-model="selectedProject"
            :options="availableProjects"
            optionLabel="nom_projet"
            placeholder="Select a Project"
            class="w-full"
          >
            <template #option="slotProps">
              <div class="flex flex-column">
                <span>{{ slotProps.option.nom_projet }}</span>
                <small class="text-gray-500">{{ slotProps.option.description_projet }}</small>
              </div>
            </template>
          </Select>
        </div>

        <template #footer>
          <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideProjectDialog" />
          <Button 
            label="Assign" 
            icon="pi pi-check" 
            @click="assignProject" 
            :loading="assigningProject"
            :disabled="!selectedProject"
          />
        </template>
      </Dialog>
    </div>
  </div>
</template>

<style scoped>
.supervisor-page {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.field {
  margin-bottom: 1.5rem;
}

.p-fluid .field label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: block;
}

.p-fluid .field .p-inputtext-lg {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border-radius: 5px;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  margin: -0.5rem;
}

.col-12 {
  flex: 0 0 100%;
  padding: 0.5rem;
}

@media screen and (min-width: 768px) {
  .md\:col-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
}

/* Custom progress bar colors */
:deep(.p-progressbar-danger) .p-progressbar-value {
  background-color: #ef4444;
}

:deep(.p-progressbar-warning) .p-progressbar-value {
  background-color: #f59e0b;
}

:deep(.p-progressbar-success) .p-progressbar-value {
  background-color: #10b981;
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

h5 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
}

:deep(.p-datatable) {
  margin-top: 1rem;
}

:deep(.p-button-sm) {
  padding: 0.4rem;
}

.p-dialog .p-fluid {
  padding: 0 1rem;
}

.field {
  margin-bottom: 1.5rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

/* Add to existing styles */
.bg-blue-100 {
  background-color: #dbeafe;
}
.text-blue-700 {
  color: #1d4ed8;
}

.bg-orange-100 {
  background-color: #ffedd5;
}
.text-orange-700 {
  color: #c2410c;
}

.bg-green-100 {
  background-color: #dcfce7;
}
.text-green-700 {
  color: #15803d;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}
.text-gray-700 {
  color: #374151;
}

:deep(.p-chip) {
  border-radius: 4px;
  padding: 0 8px;
}

:deep(.p-chip-text) {
  font-size: 0.875rem;
}
</style>