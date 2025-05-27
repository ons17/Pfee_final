<script setup>
import { ref, onMounted, computed } from 'vue';
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

// Logout Method
const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('administrateur');
    localStorage.removeItem('employee');

    // Redirect based on user type
    if (userType.value === 'admin') {
        router.push({ name: 'Login' }); // Redirect to admin login
    } else if (userType.value === 'employee') {
        router.push({ name: 'EmployeeLogin' }); // Redirect to employee login
    } else {
        router.push({ name: 'Login' }); // Default redirection
    }
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

// Add computed property for initials
const userInitials = computed(() => {
    const name = profile.value.name;
    if (!name) return '';
    
    const words = name.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
});

// Generate random background color for avatar
const avatarBackgroundColor = computed(() => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
    ];
    const index = profile.value.name.length % colors.length;
    return colors[index];
});
</script>

<template>
    <div class="personal-profile-container">
        <!-- Profile Header -->
        <div class="profile-header">
            <div class="profile-image-container">
                <!-- Replace img with avatar div -->
                <div class="avatar" :style="{ backgroundColor: avatarBackgroundColor }">
                    {{ userInitials }}
                </div>
            </div>
            <div class="profile-info">
                <h1 class="profile-name">{{ profile.name }}</h1>
                <div class="profile-details">
                    <p><strong>📧 Email:</strong> {{ profile.email }}</p>
                    <p><strong>💼 Role:</strong> {{ profile.role }}</p>
                </div>
                <button @click="logout" class="logout-button">Logout</button>
            </div>
        </div>

        <!-- Conditional Content Based on User Type -->
        <div v-if="userType === 'admin'" class="admin-section">
            <h2>Admin Dashboard</h2>
            <div class="dashboard-cards">
                <div class="card" @click="router.push('/app/Reports')">
                    <h3>📊 View Reports</h3>
                    <p>Access detailed reports and analytics.</p>
                </div>
                <div class="card" @click="router.push('/app/AddAdmin')">
                    <h3>➕ Add New Supervisors</h3>
                    <p>Manage and add new Supervisors.</p>
                </div>
                <div class="card" @click="router.push('/app/Teams')">
                    <h3>👥 Manage Teams</h3>
                    <p>Organize and manage your teams effectively.</p>
                </div>
            </div>
        </div>

        <div v-else-if="userType === 'employee'" class="employee-section">
            <h2>Employee Dashboard</h2>
            <div class="dashboard-cards">
                <div class="card" @click="router.push('/app/Task')">
                    <h3>📝 View Tasks</h3>
                    <p>Check your assigned tasks and deadlines.</p>
                </div>
                <div class="card" @click="router.push('/app/Project')">
                    <h3>📂 View Projects</h3>
                    <p>Explore the projects you are working on.</p>
                </div>
                <div class="card" @click="router.push('/app/Performance')">
                    <h3>📈 View Performance</h3>
                    <p>Track your performance and achievements.</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.personal-profile-container {
    max-width: 800px;
    margin: 0 auto;
    font-family: 'Arial', sans-serif;
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.profile-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.profile-image-container {
    margin-right: 20px;
}

.avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: bold;
    color: white;
    text-transform: uppercase;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-info {
    flex-grow: 1;
}

.profile-name {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 10px;
}

.profile-details p {
    margin: 5px 0;
    font-size: 1rem;
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

.dashboard-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between; /* Ensures even spacing */
    align-items: stretch; /* Ensures all cards have the same height */
}

.card {
    flex: 1 1 calc(33.333% - 20px);
    background-color: #f1f1f1;
    padding: 10px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    text-align: center;
    height: 120px; /* Set a fixed height */
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card h3 {
    font-size: 1.25rem;
    margin-bottom: 10px;
}

.card p {
    font-size: 0.9rem;
    color: #555;
}
</style>