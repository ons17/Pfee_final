<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import Password from 'primevue/password';
import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';

const router = useRouter();
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const passwordStrength = ref(0);

// Add password strength checker
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

// Update password strength on input
const handlePasswordChange = () => {
  checkPasswordStrength(newPassword.value);
};

const resetPassword = async () => {
  try {
    // Clear previous messages
    errorMessage.value = '';
    successMessage.value = '';

    // Additional validations
    if (!currentPassword.value) {
      errorMessage.value = 'Current password is required';
      return;
    }

    if (!newPassword.value) {
      errorMessage.value = 'New password is required';
      return;
    }

    if (passwordStrength.value < 60) {
      errorMessage.value = 'Password is not strong enough';
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      errorMessage.value = 'New passwords do not match';
      return;
    }

    // Get admin email from localStorage
    const admin = JSON.parse(localStorage.getItem('administrateur'));
    if (!admin?.email_administrateur) {
      errorMessage.value = 'Please login first';
      return;
    }

    const response = await axios.post('http://localhost:3000/graphql', {
      query: `
        mutation ResetAdminPassword($email: String!, $currentPassword: String!, $newPassword: String!) {
          resetPassword(
            email_administrateur: $email,
            currentPassword: $currentPassword,
            newPassword: $newPassword
          ) {
            success
            message
          }
        }
      `,
      variables: {
        email: admin.email_administrateur,
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      }
    });

    const { success, message } = response.data.data.resetPassword;

    if (success) {
      successMessage.value = message;
      // Clear form
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      // Redirect after success
      setTimeout(() => router.push('/admin/login'), 2000);
    } else {
      errorMessage.value = message;
    }
  } catch (error) {
    console.error('Error:', error);
    errorMessage.value = 'Failed to reset password. Please try again.';
  }
};
</script>

<template>
  <div class="surface-card p-4 shadow-2 border-round w-full lg:w-6">
    <div class="text-center mb-5">
      <div class="text-900 text-3xl font-medium mb-3">Reset Password</div>
      <span class="text-600 font-medium line-height-3">Change your admin password</span>
    </div>

    <div v-if="errorMessage" class="p-message p-message-error mb-4">{{ errorMessage }}</div>
    <div v-if="successMessage" class="p-message p-message-success mb-4">{{ successMessage }}</div>

    <div class="p-fluid">
      <div class="field mb-4">
        <label for="currentPassword" class="font-medium">Current Password</label>
        <Password 
          id="currentPassword" 
          v-model="currentPassword" 
          toggleMask 
          :feedback="false"
        />
      </div>

      <div class="field mb-4">
        <label for="newPassword" class="font-medium">New Password</label>
        <Password 
          id="newPassword" 
          v-model="newPassword" 
          toggleMask
          @input="handlePasswordChange"
        />
        <div class="mt-2">
          <ProgressBar :value="passwordStrength" :class="[
            passwordStrength < 40 ? 'p-progressbar-danger' :
            passwordStrength < 80 ? 'p-progressbar-warning' :
            'p-progressbar-success'
          ]" />
          <small class="text-gray-600 mt-1">
            Password strength: {{ 
              passwordStrength < 40 ? 'Weak' :
              passwordStrength < 80 ? 'Medium' :
              'Strong'
            }}
          </small>
        </div>
      </div>

      <div class="field mb-4">
        <label for="confirmPassword" class="font-medium">Confirm New Password</label>
        <Password 
          id="confirmPassword" 
          v-model="confirmPassword" 
          toggleMask 
          :feedback="false"
        />
      </div>

      <Button 
        label="Reset Password" 
        @click="resetPassword" 
        class="w-full"
      />
    </div>
  </div>
</template>

<style scoped>
.p-message {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 4px;
}
.p-message-error {
  background-color: #ffebee;
  color: #c62828;
}
.p-message-success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.p-progressbar {
  height: 6px;
}

.p-progressbar-danger .p-progressbar-value {
  background-color: #ef4444;
}

.p-progressbar-warning .p-progressbar-value {
  background-color: #f59e0b;
}

.p-progressbar-success .p-progressbar-value {
  background-color: #10b981;
}
</style>