<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import axios from 'axios';

const form = ref({
  nom: '',
  email: '',
  password: '',
  role: 'ADMIN',
});

const isSubmitting = ref(false);
const toast = useToast();

const createAdmin = async () => {
  if (!form.value.nom || !form.value.email || !form.value.password) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields', life: 3000 });
    return;
  }

  try {
    isSubmitting.value = true;

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
      nom: form.value.nom,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
    };

    const response = await axios.post('http://localhost:3000/graphql', { query: mutation, variables });

    const result = response.data.data?.createAdministrateur;

    if (result?.success) {
      toast.add({ severity: 'success', summary: 'Success', detail: result.message, life: 3000 });
      form.value = { nom: '', email: '', password: '', role: 'ADMIN' }; // Reset form
    } else {
      throw new Error(result?.message || 'Failed to create admin');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to create admin', life: 3000 });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">Add New Admin</h1>
    <div class="p-fluid">
      <div class="field">
        <label for="nom">Name</label>
        <InputText id="nom" v-model="form.nom" required />
      </div>
      <div class="field">
        <label for="email">Email</label>
        <InputText id="email" v-model="form.email" required type="email" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <Password id="password" v-model="form.password" required toggleMask />
      </div>
      <div class="field">
        <label for="role">Role</label>
        <Dropdown id="role" v-model="form.role" :options="['ADMIN', 'SUPERVISOR']" />
      </div>
      <Button label="Create Admin" :loading="isSubmitting" @click="createAdmin" />
    </div>
  </div>
</template>