<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';
import Password from 'primevue/password';
import Dropdown from 'primevue/dropdown';
import Chip from 'primevue/chip';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import axios from 'axios';

// Import utility functions
import { isAdmin, validatePassword } from '@/utils/authUtils';

const toast = useToast();
const dt = ref();
const taches = ref([]);
const addEmployeeDialog = ref(false);
const editEmployeeDialog = ref(false);
const deleteEmployeeDialog = ref(false);
const disableEmployeeDialog = ref(false);
const resetPasswordDialog = ref(false);
const sendEmailDialog = ref(false);
const deleteEmployeesDialog = ref(false);
const employee = ref({});
const submitted = ref(false);
const searchQuery = ref('');
const employeeToDelete = ref(null);
const disabledUntil = ref(null);
const newPassword = ref('');
const emailForReset = ref('');
const emailSubject = ref('');
const emailMessage = ref('');
const selectedEmployeeId = ref(null);
const disableDialogVisible = ref(false);
const selectedDisabledUntil = ref(null);
const selectedEmployees = ref([]);
const loading = ref(false);
const filters = ref({
  global: { value: '' }
});
const equipes = ref([]);
const selectedEquipe = ref(null);
const adminPassword = ref('');

const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const isStrongPassword = (password) => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

// Fetch employees
const fetchTaches = async () => {
  try {
    const query = `
      query {
        employees {
          message
          employees {
            idEmployee
            nomEmployee
            emailEmployee
            role
            disabledUntil
            idEquipe
          }
        }
      }
    `;
    const response = await axios.post('http://localhost:3000/graphql', { query });
    if (response.data?.data?.employees?.employees) {
      taches.value = response.data.data.employees.employees.map(emp => ({
        ...emp,
        disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil) : null,
      }));
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error("Error fetching employees:", error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load employees', life: 3000 });
  }
};

// Fetch equipes from the backend
const fetchEquipes = async () => {
  try {
    const query = `
      query {
        equipes {
          idEquipe
          nom_equipe
        }
      }
    `;
    const response = await axios.post('http://localhost:3000/graphql', { query });
    if (response.data?.data?.equipes) {
      equipes.value = [
        { idEquipe: null, nom_equipe: 'No Equipe Assigned' },
        ...response.data.data.equipes,
      ];
    } else {
      throw new Error('Failed to fetch equipes');
    }
  } catch (error) {
    console.error('Error fetching equipes:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load equipes', life: 3000 });
  }
};

// Filter employees based on search query
const filteredEmployees = computed(() => {
  return taches.value.filter(emp =>
    emp.nomEmployee.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const openNew = () => {
  employee.value = {};
  submitted.value = false;
  addEmployeeDialog.value = true;
};

const saveEmployee = async () => {
  submitted.value = true;

  if (!employee.value.nomEmployee || !employee.value.emailEmployee || !employee.value.role || !employee.value.passwordEmployee) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields', life: 3000 });
    return;
  }

  if (!isValidEmail(employee.value.emailEmployee)) {
    toast.add({ severity: 'warn', summary: 'Invalid Email', detail: 'Please enter a valid email address', life: 3000 });
    return;
  }

  if (!isStrongPassword(employee.value.passwordEmployee)) {
    toast.add({
      severity: 'warn',
      summary: 'Weak Password',
      detail: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.',
      life: 5000,
    });
    return;
  }

  try {
    const mutation = `
      mutation CreateEmployee(
        $nomEmployee: String!,
        $emailEmployee: String!,
        $passwordEmployee: String!,
        $idEquipe: String,
        $role: String!
      ) {
        createEmployee(
          nomEmployee: $nomEmployee,
          emailEmployee: $emailEmployee,
          passwordEmployee: $passwordEmployee,
          idEquipe: $idEquipe,
          role: $role
        ) {
          idEmployee
        }
      }
    `;
    const variables = {
      nomEmployee: employee.value.nomEmployee,
      emailEmployee: employee.value.emailEmployee,
      passwordEmployee: employee.value.passwordEmployee,
      idEquipe: employee.value.idEquipe || null,
      role: employee.value.role,
    };

    const response = await axios.post('http://localhost:3000/graphql', { query: mutation, variables });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully', life: 3000 });
    addEmployeeDialog.value = false;
    fetchTaches();
  } catch (error) {
    console.error('Error saving employee:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save employee', life: 3000 });
  }
};

const updateEmployee = async () => {
  submitted.value = true;

  if (!employee.value.nomEmployee || !employee.value.emailEmployee || !employee.value.role) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation UpdateEmployee(
        $id: String!,
        $nomEmployee: String,
        $emailEmployee: String,
        $role: String,
        $idEquipe: String,
        $disabledUntil: String
      ) {
        updateEmployee(
          id: $id,
          nomEmployee: $nomEmployee,
          emailEmployee: $emailEmployee,
          role: $role,
          idEquipe: $idEquipe,
          disabledUntil: $disabledUntil
        ) {
          idEmployee
          disabledUntil
        }
      }
    `;

    const variables = {
      id: employee.value.idEmployee,
      nomEmployee: employee.value.nomEmployee,
      emailEmployee: employee.value.emailEmployee,
      role: employee.value.role,
      idEquipe: employee.value.idEquipe || null,
      disabledUntil: employee.value.disabledUntil ? employee.value.disabledUntil.toISOString() : null,
    };

    const response = await axios.post('http://localhost:3000/graphql', { query: mutation, variables });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee updated successfully', life: 3000 });
    editEmployeeDialog.value = false;
    fetchTaches();
  } catch (error) {
    console.error('Error updating employee:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update employee', life: 3000 });
  }
};

const deleteEmployee = async () => {
  if (!isAdmin()) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Only admins can delete employees.', life: 3000 });
    return;
  }

  if (!adminPassword.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter your password.', life: 3000 });
    return;
  }

  if (!validatePassword(adminPassword.value)) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Invalid password. Please try again.', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation DeleteEmployee($id: String!) {
        deleteEmployee(id: $id) {
          success
          message
        }
      }
    `;
    const variables = {
      id: employeeToDelete.value.idEmployee,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee deleted successfully', life: 3000 });
    deleteEmployeeDialog.value = false;
    adminPassword.value = '';
    fetchTaches();
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 'Failed to delete employee';
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }
};

const disableEmployee = async () => {
  if (!disabledUntil.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please specify a disable date', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation DisableEmployee($id: String!, $disabledUntil: String!) {
        updateEmployee(id: $id, disabledUntil: $disabledUntil) {
          idEmployee
        }
      }
    `;
    const variables = {
      id: employee.value.idEmployee,
      disabledUntil: disabledUntil.value,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee disabled successfully', life: 3000 });
    disableEmployeeDialog.value = false;
    fetchTaches();
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 'Failed to disable employee';
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }
};

const openResetPasswordDialog = (emp) => {
  employee.value = emp;
  emailForReset.value = emp.emailEmployee;
  newPassword.value = '';
  resetPasswordDialog.value = true;
};

const sendResetPasswordEmail = async () => {
  if (!newPassword.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter a new password', life: 3000 });
    return;
  }
  if (!isValidEmail(emailForReset.value)) {
    toast.add({ severity: 'warn', summary: 'Invalid Email', detail: 'Please enter a valid email address', life: 3000 });
    return;
  }
  try {
    const response = await axios.post('http://localhost:3000/send-email', {
      email: emailForReset.value,
      password: newPassword.value,
    });
    toast.add({ severity: 'success', summary: 'Success', detail: 'Password reset email sent', life: 3000 });
    resetPasswordDialog.value = false;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to send password reset email', life: 3000 });
  }
};

const openEdit = (emp) => {
  employee.value = {
    ...emp,
    disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil) : null,
  };
  submitted.value = false;
  editEmployeeDialog.value = true;
};

const openDisableDialog = (employee) => {
  selectedEmployeeId.value = employee.idEmployee;
  selectedDisabledUntil.value = null;
  disableDialogVisible.value = true;
};

const setDisabledUntil = async () => {
  if (!selectedDisabledUntil.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a date', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation UpdateEmployee($id: String!, $disabledUntil: String) {
        updateEmployee(id: $id, disabledUntil: $disabledUntil) {
          idEmployee
          disabledUntil
        }
      }
    `;

    const variables = {
      id: selectedEmployeeId.value,
      disabledUntil: selectedDisabledUntil.value.toISOString(),
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: 'Disabled Until date set successfully', 
      life: 3000 
    });
    
    disableDialogVisible.value = false;
    await fetchTaches();
  } catch (error) {
    console.error('Error setting Disabled Until:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to set Disabled Until date', 
      life: 3000 
    });
  }
};

const confirmDeleteEmployee = (emp) => {
  employeeToDelete.value = emp;
  adminPassword.value = '';
  deleteEmployeeDialog.value = true;
};

const openSendEmailDialog = (employeeId) => {
  selectedEmployeeId.value = employeeId;
  const employee = taches.value.find(emp => emp.idEmployee === employeeId);
  emailForReset.value = employee?.emailEmployee || '';
  emailSubject.value = '';
  emailMessage.value = '';
  sendEmailDialog.value = true;
};

const confirmDeleteSelectedEmployees = () => {
  if (!selectedEmployees.value.length) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'No employees selected', life: 3000 });
    return;
  }

  adminPassword.value = '';
  deleteEmployeesDialog.value = true;
};

const deleteSelectedEmployees = async () => {
  if (!isAdmin()) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Only admins can delete employees.', life: 3000 });
    return;
  }

  if (!adminPassword.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter your password.', life: 3000 });
    return;
  }

  if (!validatePassword(adminPassword.value)) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Invalid password. Please try again.', life: 3000 });
    return;
  }

  try {
    loading.value = true;

    const deletePromises = selectedEmployees.value.map(emp => {
      const mutation = `
        mutation DeleteEmployee($id: String!) {
          deleteEmployee(id: $id) {
            success
            message
          }
        }
      `;
      const variables = { id: emp.idEmployee };
      return axios.post('http://localhost:3000/graphql', { query: mutation, variables });
    });

    await Promise.all(deletePromises);

    toast.add({ severity: 'success', summary: 'Success', detail: 'Selected employees deleted successfully', life: 3000 });
    selectedEmployees.value = [];
    deleteEmployeesDialog.value = false;
    adminPassword.value = '';
    fetchTaches();
  } catch (error) {
    console.error('Error deleting employees:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete selected employees', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const exportCSV = () => {
  dt.value.exportCSV();
};

const hideDialog = () => {
  addEmployeeDialog.value = false;
  editEmployeeDialog.value = false;
  deleteEmployeeDialog.value = false;
  disableEmployeeDialog.value = false;
  resetPasswordDialog.value = false;
  sendEmailDialog.value = false;
  deleteEmployeesDialog.value = false;
  submitted.value = false;
};

const sendEmail = async () => {
  if (!emailSubject.value || !emailMessage.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in both subject and message', life: 3000 });
    return;
  }

  if (!isValidEmail(emailForReset.value)) {
    toast.add({ severity: 'warn', summary: 'Invalid Email', detail: 'Please enter a valid email address', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation SendEmailToEmployee($id: String!, $subject: String!, $message: String!) {
        sendEmailToEmployee(id: $id, subject: $subject, message: $message)
      }
    `;
    const variables = {
      id: selectedEmployeeId.value,
      subject: emailSubject.value,
      message: emailMessage.value,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    sendEmailDialog.value = false;
    toast.add({ severity: 'success', summary: 'Success', detail: 'Email sent successfully', life: 3000 });
  } catch (error) {
    console.error('Error sending email:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to send email', life: 3000 });
  }
};

const passwordStrength = computed(() => {
  if (!employee.value.passwordEmployee) return 'Weak';
  const password = employee.value.passwordEmployee;

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  if (password.length >= 8 && hasLowercase && hasUppercase && hasNumber && hasSpecialChar) {
    return 'Strong';
  }

  if (password.length >= 6 && hasLowercase && hasUppercase && (hasNumber || hasSpecialChar)) {
    return 'Medium';
  }

  return 'Weak';
});

const passwordStrengthColor = computed(() => {
  switch (passwordStrength.value) {
    case 'Weak':
      return 'red';
    case 'Medium':
      return 'orange';
    case 'Strong':
      return 'green';
    default:
      return '';
  }
});

const passwordStrengthClass = computed(() => {
  switch (passwordStrength.value) {
    case 'Weak':
      return 'weak';
    case 'Medium':
      return 'medium';
    case 'Strong':
      return 'strong';
    default:
      return '';
  }
});

const passwordStrengthWidth = computed(() => {
  switch (passwordStrength.value) {
    case 'Weak':
      return '33%';
    case 'Medium':
      return '66%';
    case 'Strong':
      return '100%';
    default:
      return '0%';
  }
});

const getEquipeName = (idEquipe) => {
  if (!idEquipe) return 'No Equipe Assigned';
  const equipe = equipes.value.find(e => e.idEquipe === idEquipe);
  return equipe ? equipe.nom_equipe : 'No Equipe Assigned';
};

const handleAddEquipe = () => {
  employee.value.idEquipe = selectedEquipe.value;
  selectedEquipe.value = null;
  const equipeName = getEquipeName(employee.value.idEquipe);
  toast.add({
    severity: 'success',
    summary: 'Equipe Updated',
    detail: equipeName === 'No Equipe Assigned' ? 'No equipe assigned to employee' : `Equipe "${equipeName}" assigned to employee`,
    life: 3000,
  });
};

const handleRemoveEquipe = () => {
  employee.value.idEquipe = null;
  toast.add({ severity: 'info', summary: 'Team Removed', detail: 'Team unassigned from employee', life: 3000 });
};

onMounted(() => {
  fetchTaches();
  fetchEquipes();
});
</script>

<template>
  <div class="employee-page p-4">
    <div class="card">
      <Toolbar class="mb-4">
        <template #start>
          <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            @click="confirmDeleteSelectedEmployees"
            :disabled="!selectedEmployees.length"
          />
        </template>
        <template #end>
          <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
        </template>
      </Toolbar>

      <DataTable
        ref="dt"
        v-model:selection="selectedEmployees"
        :value="filteredEmployees"
        :loading="loading"
        dataKey="idEmployee"
        :paginator="true"
        :rows="10"
        :filters="filters"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[5, 10, 25]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} employees"
      >
        <template #loading>
          <div class="flex align-items-center">
            <ProgressSpinner style="width: 30px; height: 30px" />
            <span class="ml-2">Loading employees...</span>
          </div>
        </template>

        <template #header>
          <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 class="m-0">Manage Employees</h4>
            <IconField iconPosition="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="searchQuery" placeholder="Search by name..." class="p-inputtext-sm p-mr-2" />
            </IconField>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column field="nomEmployee" header="Name" sortable></Column>
        <Column field="emailEmployee" header="Email" sortable></Column>
        <Column field="role" header="Role" sortable></Column>
        <Column field="disabledUntil" header="Disabled Until" sortable>
          <template #body="{ data }">
            {{ data.disabledUntil ? data.disabledUntil.toLocaleDateString('en-US') : 'Active' }}
          </template>
        </Column>
        <Column field="idEquipe" header="Team">
          <template #body="{ data }">
            {{ getEquipeName(data.idEquipe) }}
          </template>
        </Column>
        <Column header="Actions" headerStyle="width: 14rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" class="mr-2" severity="warning" outlined @click="openEdit(data)" />
            <Button icon="pi pi-trash" class="mr-2" severity="danger" outlined @click="confirmDeleteEmployee(data)" />
            <Button icon="pi pi-envelope" class="mr-2" severity="info" outlined @click="openSendEmailDialog(data.idEmployee)" />
            <Button icon="pi pi-calendar" class="mr-2" severity="secondary" outlined @click="openDisableDialog(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add Employee Dialog -->
    <Dialog v-model:visible="addEmployeeDialog" header="Add New Employee" modal class="p-dialog-responsive" :style="{ width: '50%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="name">Name</label>
          <InputText id="name" v-model="employee.nomEmployee" required class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="employee.emailEmployee" required type="email" class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="role">Role</label>
          <InputText id="role" v-model="employee.role" required class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="password" class="font-bold block mb-2">Password *</label>
          <Password
            id="password"
            v-model="employee.passwordEmployee"
            required
            toggleMask
            :class="{ 'p-invalid': submitted && !employee.passwordEmployee }"
            class="w-full"
          />
          <small v-if="submitted && !employee.passwordEmployee" class="p-error">Password is required.</small>
          <small :style="{ color: passwordStrengthColor }">
            Password Strength: {{ passwordStrength }}
          </small>
        </div>

        <!-- Equipe Management Section -->
        <div class="field">
          <label class="font-bold block mb-2">Equipe Management</label>
          <div class="flex gap-2">
            <Dropdown
              v-model="selectedEquipe"
              :options="equipes"
              optionLabel="nom_equipe"
              optionValue="idEquipe"
              placeholder="Select an equipe"
              class="w-full"
            />
            <Button
              label="Add Equipe"
              icon="pi pi-plus"
              @click="handleAddEquipe"
              :disabled="!selectedEquipe"
            />
          </div>
          <div class="mt-4">
            <h5 class="font-bold mb-2">Assigned Equipe</h5>
            <div class="flex flex-wrap gap-2">
              <Chip
                v-if="employee.idEquipe"
                :label="getEquipeName(employee.idEquipe)"
                removable
                @remove="handleRemoveEquipe"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" class="p-button-text" @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" severity="success" class="p-button-text" @click="saveEmployee" />
      </template>
    </Dialog>

    <!-- Edit Employee Dialog -->
    <Dialog v-model:visible="editEmployeeDialog" header="Edit Employee" modal class="p-dialog-responsive" :style="{ width: '50%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="name">Name</label>
          <InputText id="name" v-model="employee.nomEmployee" required class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="employee.emailEmployee" required type="email" class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="role">Role</label>
          <InputText id="role" v-model="employee.role" required class="p-inputtext-lg" />
        </div>

        <!-- Equipe Management Section -->
        <div class="field">
          <label class="font-bold block mb-2">Equipe Management</label>
          <div class="flex gap-2">
            <Dropdown
              v-model="selectedEquipe"
              :options="equipes"
              optionLabel="nom_equipe"
              optionValue="idEquipe"
              placeholder="Select an equipe"
              class="w-full"
            />
            <Button
              label="Add Equipe"
              icon="pi pi-plus"
              @click="handleAddEquipe"
              :disabled="!selectedEquipe"
            />
          </div>
          <div class="mt-4">
            <h5 class="font-bold mb-2">Assigned Equipe</h5>
            <div class="flex flex-wrap gap-2">
              <Chip
                v-if="employee.idEquipe"
                :label="getEquipeName(employee.idEquipe)"
                removable
                @remove="handleRemoveEquipe"
              />
            </div>
          </div>
        </div>

        <div class="field">
          <label for="disabledUntil">Disabled Until</label>
          <Calendar
            id="disabledUntil"
            v-model="employee.disabledUntil"
            :showIcon="true"
            class="w-full"
            placeholder="Select a date"
            dateFormat="yy-mm-dd"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" class="p-button-text" @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" severity="success" class="p-button-text" @click="updateEmployee" />
      </template>
    </Dialog>

    <!-- Reset Password Dialog -->
    <Dialog v-model:visible="resetPasswordDialog" header="Reset Password" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="emailForReset" disabled class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="newPassword">New Password</label>
          <InputText id="newPassword" v-model="newPassword" required type="password" class="p-inputtext-lg" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Send" icon="pi pi-check" class="p-button-text" @click="sendResetPasswordEmail" />
      </template>
    </Dialog>

    <!-- Disable Employee Dialog -->
    <Dialog v-model:visible="disableEmployeeDialog" header="Disable Employee" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="disabledUntil">Disable Until</label>
          <input
            id="disabledUntil"
            v-model="disabledUntil"
            type="date"
            class="p-inputtext-lg"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Disable" icon="pi pi-check" class="p-button-danger" @click="disableEmployee" />
      </template>
    </Dialog>

    <!-- Delete Employee Dialog -->
    <Dialog v-model:visible="deleteEmployeeDialog" header="Confirm" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
        <span>Are you sure you want to delete <b>{{ employeeToDelete?.nomEmployee }}</b>?</span>
        <div class="field mt-3">
          <label for="adminPassword">Admin Password</label>
          <Password
            id="adminPassword"
            v-model="adminPassword"
            toggleMask
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteEmployeeDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteEmployee" :loading="loading" class="p-button-danger" />
      </template>
    </Dialog>

    <!-- Send Email Dialog -->
    <Dialog v-model:visible="sendEmailDialog" header="Send Email" :modal="true" :style="{ width: '500px' }">
      <div class="field">
        <label for="subject" class="font-bold block mb-2">Subject</label>
        <InputText
          id="subject"
          v-model="emailSubject"
          class="w-full"
          placeholder="Enter email subject"
        />
      </div>

      <div class="field">
        <label for="message" class="font-bold block mb-2">Message</label>
        <Textarea
          id="message"
          v-model="emailMessage"
          class="w-full"
          rows="5"
          placeholder="Enter email message"
        />
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="sendEmailDialog = false" />
        <Button label="Send" icon="pi pi-send" class="p-button" @click="sendEmail" />
      </template>
    </Dialog>

    <!-- Set Disabled Until Dialog -->
    <Dialog v-model:visible="disableDialogVisible" header="Set Disabled Until" :modal="true" :style="{ width: '400px' }">
      <div class="field">
        <label for="disable-until">Disabled Until</label>
        <Calendar
          id="disable-until"
          v-model="selectedDisabledUntil"
          :showIcon="true"
          class="w-full"
          placeholder="Select a date"
          dateFormat="yy-mm-dd"
        />
      </div>
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="disableDialogVisible = false" />
        <Button label="Save" icon="pi pi-check" class="p-button" @click="setDisabledUntil" />
      </template>
    </Dialog>

    <!-- Delete Employees Dialog -->
    <Dialog v-model:visible="deleteEmployeesDialog" header="Confirm" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
        <span>Are you sure you want to delete the selected employees?</span>
        <div class="field mt-3">
          <label for="adminPassword">Admin Password</label>
          <Password
            id="adminPassword"
            v-model="adminPassword"
            toggleMask
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteEmployeesDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteSelectedEmployees" :loading="loading" class="p-button-danger" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.employee-page {
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
display: block;  /* Ensure labels are block-level elements */
}
.p-fluid .field .p-inputtext-lg {
width: 100%;
padding: 0.75rem;  /* Add padding for better spacing */
font-size: 1rem;
border-radius: 5px;
}

/* Add styles for the password strength feedback */
small {
  display: block;
  margin-top: 0.5rem;
  font-weight: bold;
}
</style>

