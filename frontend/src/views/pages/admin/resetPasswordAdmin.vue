<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');

const resetPassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  try {
    const token = route.query.token;
    const response = await axios.post('http://localhost:3000/graphql', {
      query: `
        mutation ResetPassword($token: String!, $newPassword: String!) {
          resetPassword(token: $token, newPassword: $newPassword) {
            success
            message
          }
        }
      `,
      variables: { token, newPassword: newPassword.value },
    });

    const result = response.data.data.resetPassword;

    if (result.success) {
      successMessage.value = result.message;
      setTimeout(() => router.push({ name: 'Login' }), 3000);
    } else {
      errorMessage.value = result.message;
    }
  } catch (error) {
    errorMessage.value = 'Failed to reset password.';
    console.error(error);
  }
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">Reset Password</h1>
    <div v-if="successMessage" class="text-green-500">{{ successMessage }}</div>
    <div v-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
    <div class="p-fluid">
      <div class="field">
        <label for="newPassword">New Password</label>
        <Password id="newPassword" v-model="newPassword" required toggleMask />
      </div>
      <div class="field">
        <label for="confirmPassword">Confirm Password</label>
        <Password id="confirmPassword" v-model="confirmPassword" required toggleMask />
      </div>
      <Button label="Reset Password" @click="resetPassword" />
    </div>
    
  </div>

</template>