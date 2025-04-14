<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const token = ref(router.currentRoute.value.query.token || '');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');

const resetPassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    return;
  }

  try {
    const response = await axios.post('http://localhost:3000/graphql', {
      query: `
        mutation {
          resetPassword(token: "${token.value}", newPassword: "${newPassword.value}") {
            success
            message
          }
        }
      `
    });

    const { success, message } = response.data.data.resetPassword;

    if (success) {
      successMessage.value = message;
      setTimeout(() => router.push({ name: 'EmployeeLogin' }), 3000);
    } else {
      errorMessage.value = message;
    }
  } catch (error) {
    errorMessage.value = 'Failed to reset password. Please try again.';
    console.error(error);
  }
};
</script>

<template>
  <div class="reset-password-page p-4">
    <div class="card">
      <h1 class="text-xl font-bold mb-4">Reset Password</h1>
      <div v-if="errorMessage" class="p-error mb-4">{{ errorMessage }}</div>
      <div v-if="successMessage" class="p-success mb-4">{{ successMessage }}</div>
      <form @submit.prevent="resetPassword" class="flex flex-col gap-4">
        <div class="field">
          <label for="newPassword" class="font-bold block mb-2">New Password</label>
          <input
            id="newPassword"
            type="password"
            v-model="newPassword"
            class="p-inputtext-lg w-full input-field"
            placeholder="Enter your new password"
            required
          />
        </div>
        <div class="field">
          <label for="confirmPassword" class="font-bold block mb-2">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            v-model="confirmPassword"
            class="p-inputtext-lg w-full input-field"
            placeholder="Confirm your new password"
            required
          />
        </div>
        <div class="flex justify-end">
          <button type="submit" class="p-button p-button-primary">Reset Password</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.reset-password-page {
  max-width: 600px;
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

.input-field {
  border: 1px solid var(--primary-light);
  padding: 0.75rem;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 5px rgba(72, 187, 120, 0.5); /* Green shadow */
  outline: none;
}

.p-error {
  color: #f44336;
  font-size: 0.875rem;
}

.p-success {
  color: #4caf50;
  font-size: 0.875rem;
}

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: var(--primary-dark);
}
</style>