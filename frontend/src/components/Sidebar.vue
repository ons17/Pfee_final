<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// User role
const admin = JSON.parse(localStorage.getItem('administrateur'));
const employee = JSON.parse(localStorage.getItem('employee'));

// Determine user role
const userRole = ref('');
onMounted(() => {
    if (admin) {
        userRole.value = 'admin';
    } else if (employee) {
        userRole.value = 'employee';
    }
});

// Sidebar menu items
const menuItems = ref([
    { name: 'Dashboard', route: '/dashboard', icon: 'pi pi-home', roles: ['admin', 'employee'] },
    { name: 'Time Tracking', route: '/time-tracking', icon: 'pi pi-clock', roles: ['employee'] },
    { name: 'Employee', route: '/employee', icon: 'pi pi-users', roles: ['admin'] },
    { name: 'Settings', route: '/settings', icon: 'pi pi-cog', roles: ['admin', 'employee'] },
]);
</script>

<template>
    <aside class="sidebar">
        <ul class="menu">
            <li
                v-for="item in menuItems"
                :key="item.name"
                v-if="item.roles.includes(userRole.value)"
                @click="router.push(item.route)"
                class="menu-item"
            >
                <i :class="item.icon"></i>
                <span>{{ item.name }}</span>
            </li>
        </ul>
    </aside>
</template>

<style scoped>
.sidebar {
    width: 250px;
    background-color: #f4f4f4;
    padding: 20px;
    height: 100vh;
}

.menu {
    list-style: none;
    padding: 0;
    margin: 0;
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 10px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.menu-item:hover {
    background-color: #e0e0e0;
}

.menu-item i {
    margin-right: 10px;
}
</style>