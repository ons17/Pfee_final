<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios';

// Form state using reactive for better organization
const form = reactive({
  nom: '',
  email: '',
  password: '',
  role: 'ADMIN', // Role is always set to ADMIN
  isSubmitting: false
});

// Form validation
const errors = reactive({
  nom: '',
  email: '',
  password: ''
});

// Status messages
const successMessage = ref('');
const errorMessage = ref('');

// Environment variables should ideally be used for API URLs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/graphql';

// Validate email format
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate form before submission
const validateForm = () => {
  let isValid = true;

  // Reset errors
  Object.keys(errors).forEach((key) => (errors[key] = ''));

  // Name validation
  if (!form.nom.trim()) {
    errors.nom = 'Name is required';
    isValid = false;
  }

  // Email validation
  if (!form.email.trim()) {
    errors.email = 'Email is required';
    isValid = false;
  } else if (!validateEmail(form.email)) {
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

  return isValid;
};

// Handle form submission
const addAdmin = async () => {
  if (!validateForm()) return;

  try {
    form.isSubmitting = true;
    errorMessage.value = '';
    successMessage.value = '';

    // Use variables in GraphQL to prevent injection
    const response = await axios.post(API_URL, {
      query: `
        mutation CreateAdmin($nom: String!, $email: String!, $password: String!, $role: String!) {
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
      `,
      variables: {
        nom: form.nom,
        email: form.email,
        password: form.password,
        role: form.role
      }
    });

    const result = response.data.data?.createAdministrateur;

    if (result?.success) {
      successMessage.value = result.message || 'Administrator added successfully!';
      // Reset form
      Object.keys(form).forEach((key) => {
        if (key !== 'role' && key !== 'isSubmitting') form[key] = '';
      });
    } else {
      errorMessage.value = result?.message || 'Failed to add administrator.';
    }
  } catch (error) {
    console.error('Error adding admin:', error);
    errorMessage.value =
      error.response?.data?.errors?.[0]?.message || 'Server error. Please try again later.';
  } finally {
    form.isSubmitting = false;
  }
};

// Handle form reset
const resetForm = () => {
  Object.keys(form).forEach((key) => {
    if (key !== 'role' && key !== 'isSubmitting') form[key] = '';
  });
  Object.keys(errors).forEach((key) => (errors[key] = ''));
  successMessage.value = '';
  errorMessage.value = '';
};
</script>

<template>
  <div class="add-admin-page">
    <div class="card">
      <h1 class="text-2xl font-bold mb-6">Add New Administrator</h1>

      <!-- Alert messages -->
      <div v-if="successMessage" class="alert alert-success mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <span>{{ successMessage }}</span>
      </div>

      <div v-if="errorMessage" class="alert alert-error mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="addAdmin" class="form">
        <div class="form-group">
          <label for="nom" class="form-label">Full Name</label>
          <input
            v-model="form.nom"
            id="nom"
            type="text"
            class="form-input"
            :class="{'input-error': errors.nom}"
            placeholder="Enter administrator name"
          />
          <span v-if="errors.nom" class="error-message">{{ errors.nom }}</span>
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            v-model="form.email"
            id="email"
            type="email"
            class="form-input"
            :class="{'input-error': errors.email}"
            placeholder="Enter email address"
          />
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            v-model="form.password"
            id="password"
            type="password"
            class="form-input"
            :class="{'input-error': errors.password}"
            placeholder="Enter password (min. 8 characters)"
          />
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="form.isSubmitting">
            <span v-if="form.isSubmitting">
              <svg
                class="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
            <span v-else>Add Administrator</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.add-admin-page {
  max-width: 1200px; /* Increased the width */
  margin: 0 auto;
  padding: 2rem;
}

.card {
  background: var(--surface-card, white);
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-color, #333);
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 5px;
  background-color: var(--input-bg, white);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color, #4f46e5);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.input-error {
  border-color: var(--error-color, #ef4444) !important;
}

.error-message {
  color: var(--error-color, #ef4444);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-color, #4f46e5);
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #4338ca);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alert-success {
  background-color: var(--success-bg, #ecfdf5);
  color: var(--success-text, #047857);
}

.alert-error {
  background-color: var(--error-bg, #fef2f2);
  color: var(--error-text, #b91c1c);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>