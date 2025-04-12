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
  <div class="reset-password-page">
    <h1>Reset Password</h1>
    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success">{{ successMessage }}</div>
    <form @submit.prevent="resetPassword">
      <label for="newPassword">New Password</label>
      <input id="newPassword" type="password" v-model="newPassword" required />

      <label for="confirmPassword">Confirm Password</label>
      <input id="confirmPassword" type="password" v-model="confirmPassword" required />

      <button type="submit">Reset Password</button>
    </form>
  </div>
</template>

<style scoped>
.reset-password-page {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}
.error {
  color: red;
}
.success {
  color: green;
}
</style>