<script setup>
import { ref, reactive, onMounted } from 'vue';
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
</script>

<template>
  <transition name="fade" appear>
    <div class="max-w-2xl mx-auto my-10 bg-white shadow-lg rounded-xl p-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-semibold text-gray-800">Add a New Supervisor</h2>
       
      </div>
      
      <Divider />

      <div class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label for="nom" class="block text-gray-700 font-medium mb-1">Name <span class="text-red-500">*</span></label>
            <InputText
              id="nom"
              v-model="form.nom"
              placeholder="Enter supervisor name"
              class="w-full"
              :class="{'p-invalid': errors.nom}"
              aria-describedby="nom-error"
            />
            <small id="nom-error" class="text-red-500">{{ errors.nom }}</small>
          </div>

          <div>
            <label for="email" class="block text-gray-700 font-medium mb-1">Email <span class="text-red-500">*</span></label>
            <InputText
              id="email"
              v-model="form.email"
              placeholder="email@example.com"
              type="email"
              class="w-full"
              :class="{'p-invalid': errors.email}"
              aria-describedby="email-error"
            />
            <small id="email-error" class="text-red-500">{{ errors.email }}</small>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label for="password" class="block text-gray-700 font-medium mb-1">Password <span class="text-red-500">*</span></label>
            <Password
              id="password"
              v-model="form.password"
              placeholder="Create a secure password"
              toggleMask
              class="w-full"
              :class="{'p-invalid': errors.password}"
              aria-describedby="password-error"
              @input="handlePasswordChange"
            />
            <div class="mt-2">
              <ProgressBar :value="passwordStrength" :class="getPasswordClass()" />
              <div class="text-xs mt-1 text-gray-600">
                Password strength: {{ passwordStrength >= 80 ? 'Strong' : passwordStrength >= 40 ? 'Medium' : 'Weak' }}
              </div>
            </div>
            <small id="password-error" class="text-red-500">{{ errors.password }}</small>
          </div>

          <div>
            <label for="confirmPassword" class="block text-gray-700 font-medium mb-1">Confirm Password <span class="text-red-500">*</span></label>
            <Password
              id="confirmPassword"
              v-model="form.confirmPassword"
              placeholder="Confirm password"
              toggleMask
              class="w-full"
              :class="{'p-invalid': errors.confirmPassword}"
              aria-describedby="confirm-password-error"
              feedback="false"
            />
            <small id="confirm-password-error" class="text-red-500">{{ errors.confirmPassword }}</small>
          </div>
        </div>

        <div class="flex justify-center gap-3 pt-6">
          <Button
            label="Cancel"
            icon="pi pi-times"
            class="p-button-outlined"
            @click="$router.push('/app')"
          />
          <Button
            label="Create Supervisor"
            icon="pi pi-user-plus"
            class="p-button-lg"
            :loading="isSubmitting"
            @click="showConfirmDialog"
          />
        </div>

        <div v-if="showSuccess" class="pt-4">
          <Message severity="success" class="w-full">
            <div class="flex items-center">
              <i class="pi pi-check-circle mr-2 text-xl"></i>
              <span>Supervisor created successfully! Redirecting to supervisor list...</span>
            </div>
          </Message>
        </div>
      </div>
    </div>
  </transition>
  
  <!-- Confirmation Dialog -->
  <Dialog 
    v-model:visible="confirmDialogVisible" 
    header="Confirm Supervisor Creation" 
    :modal="true" 
    :closable="false"
    class="w-full max-w-lg"
  >
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
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
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
</style>