<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const email = ref('');
const password = ref('');
const checked = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const router = useRouter();

// API Base URL
const API_URL = 'http://localhost:3000/graphql'; // Replace with your backend URL

// Login function
const login = async () => {
  try {
    const response = await axios.post(API_URL, {
      query: `
        mutation {
          loginEmployee(email: "${email.value}", password: "${password.value}") {
            success
            message
            token
            employee {
              idEmployee
              nomEmployee
              emailEmployee
            }
          }
        }
      `,
    });

    const { success, message, token, employee } = response.data.data.loginEmployee;

    if (success) {
      // Store token, employee details, and password in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('employee', JSON.stringify(employee));
      localStorage.setItem('password', password.value); // Save the password

      // Redirect to the dashboard
      router.push({ name: 'TimeTracking' });
    } else {
      errorMessage.value = message;
    }
  } catch (error) {
    errorMessage.value = 'Login failed. Please try again.';
    console.error(error);
  }
};
</script>

<template>
  <FloatingConfigurator />
  <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
          <div class="text-center mb-8">
            <img src="/logo2.png" alt="Logo" class="w-32 mx-auto" />
          </div>

          <!-- Email and Password Login -->
          <div>
            <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
            <input id="email1" type="text" placeholder="Email address" class="w-full md:w-[30rem] mb-8 p-2 border rounded" v-model="email" />

            <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
            <div class="relative">
              <input 
                id="password1" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Password" 
                class="w-full md:w-[30rem] mb-4 p-2 border rounded pr-10" 
                v-model="password" 
              />
              <button 
                type="button"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                @click="showPassword = !showPassword"
              >
                <i :class="[showPassword ? 'pi pi-eye-slash' : 'pi pi-eye']"></i>
              </button>
            </div>

            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
              <div class="flex items-center">
                <input type="checkbox" id="rememberme1" v-model="checked" class="mr-2" />
                <label for="rememberme1">Remember me</label>
              </div>
            </div>

            <Button label="Sign In" class="w-full" @click="login"></Button>
            <p v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input {
  border: 1px solid #ccc;
  padding: 0.5rem;
  border-radius: 4px;
}

button {
  cursor: pointer;
}

button:hover {
  background-color: #075831; /* Darker green for hover effect */
}

.relative {
  position: relative;
}

.absolute {
  position: absolute;
}

button.absolute {
  background: none;
  border: none;
  padding: 0.5rem;
}

button.absolute:hover {
  background: none;
}

.pi {
  font-size: 1.2rem;
}
</style>