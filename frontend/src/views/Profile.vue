<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Reactive state for profile data
const profile = ref({
    name: '',
    email: '',
    role: '',
    profileImage: '/api/placeholder/200/200',
});

// Reactive state for user type
const userType = ref(''); // 'admin' or 'employee'

// Logout method
const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('administrateur');
    localStorage.removeItem('employee');

    // Redirect to login page
    router.push({ name: 'Login' });
};

// On mounted, retrieve the user data from localStorage
onMounted(() => {
    const administrateur = localStorage.getItem('administrateur');
    const employee = localStorage.getItem('employee');

    if (administrateur) {
        const adminData = JSON.parse(administrateur);
        profile.value.name = adminData.nom_administrateur;
        profile.value.email = adminData.email_administrateur;
        profile.value.role = 'Admin';
        userType.value = 'admin';
    } else if (employee) {
        const employeeData = JSON.parse(employee);
        profile.value.name = employeeData.nomEmployee;
        profile.value.email = employeeData.emailEmployee;
        profile.value.role = 'Employee';
        userType.value = 'employee';
    } else {
        // Redirect to login if no user is found
        router.push({ name: 'Login' });
    }
});
</script>

<template>
    <div class="personal-profile-container">
        <!-- Profile Header -->
        <div class="profile-header">
            <div class="profile-image-container">
                <img :src="profile.profileImage" alt="" class="profile-image" />
            </div>
            <div class="profile-info">
                <h1 class="profile-name">{{ profile.name }}</h1>
                <div class="profile-details">
                    <p><strong>📧 Email:</strong> {{ profile.email }}</p>
                    <p><strong>💼 Role:</strong> {{ profile.role }}</p>
                </div>

                <!-- Logout Button -->
                <button @click="logout" class="logout-button">Logout</button>
            </div>
        </div>

        <!-- Conditional Content Based on User Type -->
        <div v-if="userType === 'admin'" class="admin-section">
            <h2>Admin Dashboard</h2>
            <p>Welcome, Admin! Manage your platform here.</p>
        </div>
        <div v-else-if="userType === 'employee'" class="employee-section">
            <h2>Employee Dashboard</h2>
            <p>Welcome, Employee! View your tasks and projects here.</p>
        </div>
    </div>
</template>

<style scoped>
.personal-profile-container {
    max-width: 800px;
    margin: 0 auto;
    font-family: 'Arial', sans-serif;
    background-color: #f4f4f4;
    padding: 20px;
    border-radius: 10px;
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.profile-image-container {
    margin-right: 20px;
}

.profile-image {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
}

.profile-info {
    flex-grow: 1;
}

.logout-button {
    padding: 10px 20px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.logout-button:hover {
    background-color: #d32f2f;
}

.admin-section,
.employee-section {
    margin-top: 20px;
    padding: 20px;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
