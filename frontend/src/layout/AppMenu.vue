<script setup>
import { ref, computed, onMounted } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

// Determine user role
const admin = JSON.parse(localStorage.getItem('administrateur'));
const employee = JSON.parse(localStorage.getItem('employee'));
const userRole = ref('');

onMounted(() => {
    if (admin) {
        userRole.value = 'admin';
    } else if (employee) {
        userRole.value = 'employee';
    }
});

// Menu model with role-based filtering
const model = ref([
    {
        label: 'HOME',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/app', roles: ['admin', 'employee'] },
            { label: 'Time Tracking', icon: 'pi pi-fw pi-clock', to: '/app/TimeTracking', roles: ['employee'] }
        ]
    },
    {
        label: 'MANAGEMENT',
        items: [
            { label: 'Employee', icon: 'pi pi-fw pi-user', to: '/app/Employee', roles: ['admin'] },
            { label: 'Teams', icon: 'pi pi-fw pi-users', to: '/app/Teams', roles: ['admin'] },
            { label: 'Project', icon: 'pi pi-fw pi-folder', to: '/app/Project', roles: ['admin'] },
            { label: 'Task', icon: 'pi pi-fw pi-list-check', to: '/app/Task', roles: ['admin'] }
        ]
    },
    {
        label: 'UTILITIES',
        items: [
            { label: 'Calendar', icon: 'pi pi-fw pi-calendar', to: '/app/Calendar', roles: ['admin', 'employee'] },
            { label: 'Reports', icon: 'pi pi-fw pi-chart-line', to: '/app/Reports', roles: ['admin'] }
        ]
    },
    {
        label: 'SETTINGS',
        items: [
            { label: 'Performance', icon: 'pi pi-fw pi-chart-pie', to: '/app/Performance', roles: ['admin'] },
            { label: 'Notifications', icon: 'pi pi-fw pi-bell', to: '/app/Notifications', roles: ['admin'] }
        ]
    },
    {
        label: 'ADMINISTRATION',
        items: [
            { label: 'Add Superviseur', icon: 'pi pi-fw pi-user-plus', to: '/app/AddAdmin', roles: ['admin'] }
        ]
    }
]);

// Filter menu items based on user role
const filteredModel = computed(() => {
    return model.value.map(section => ({
        ...section,
        items: section.items.filter(item => item.roles.includes(userRole.value))
    })).filter(section => section.items.length > 0);
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in filteredModel" :key="i">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped>
/* Add your styles here if needed */
</style>