<script setup>
import { ref } from 'vue';
import axios from 'axios';

const nom = ref('');
const email = ref('');
const password = ref('');
const role = ref('ADMIN');
const successMessage = ref('');
const errorMessage = ref('');

const API_URL = 'http://localhost:3000/graphql'; // Backend URL

const addAdmin = async () => {
  try {
    const response = await axios.post(API_URL, {
      query: `
        mutation {
          createAdministrateur(
            nom_administrateur: "${nom.value}",
            email_administrateur: "${email.value}",
            password_administrateur: "${password.value}",
            role: "${role.value}"
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
      `
    });

    const { success, message } = response.data.data.createAdministrateur;

    if (success) {
      successMessage.value = message;
      nom.value = '';
      email.value = '';
      password.value = '';
    } else {
      errorMessage.value = message;
    }
  } catch (error) {
    errorMessage.value = 'Failed to add admin. Please try again.';
    console.error(error);
  }
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Add New Admin</h1>
    <div v-if="successMessage" class="text-green-500 mb-4">{{ successMessage }}</div>
    <div v-if="errorMessage" class="text-red-500 mb-4">{{ errorMessage }}</div>
    <form @submit.prevent="addAdmin">
      <div class="mb-4">
        <label for="nom" class="block text-sm font-medium">Name</label>
        <input v-model="nom" id="nom" type="text" class="border rounded w-full p-2" required />
      </div>
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium">Email</label>
        <input v-model="email" id="email" type="email" class="border rounded w-full p-2" required />
      </div>
      <div class="mb-4">
        <label for="password" class="block text-sm font-medium">Password</label>
        <input v-model="password" id="password" type="password" class="border rounded w-full p-2" required />
      </div>
      <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Add Admin</button>
    </form>
  </div>
</template>

<style scoped>
/* Add your styles here */
</style>