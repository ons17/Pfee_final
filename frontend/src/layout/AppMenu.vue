<script setup>
import { ref, computed, onMounted } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

// Update role determination
const admin = JSON.parse(localStorage.getItem('administrateur'));
const employee = JSON.parse(localStorage.getItem('employee'));
const userRole = ref('');

onMounted(() => {
    if (admin) {
        // Check if the admin is actually a supervisor
        userRole.value = admin.role?.toLowerCase() === 'supervisor' ? 'supervisor' : 'admin';
    } else if (employee) {
        userRole.value = 'employee';
    }
});

// Update the menu model to explicitly specify admin (not supervisor)
const model = ref([
    {
        label: 'HOME',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/app', roles: ['admin'] },
            { label: 'Time Tracking', icon: 'pi pi-fw pi-clock', to: '/app/TimeTracking', roles: ['employee'] }
        ]
    },
    {
        label: 'MANAGEMENT',
        items: [
            { label: 'Employee', icon: 'pi pi-fw pi-user', to: '/app/Employee', roles: ['admin'] },
            { label: 'Teams', icon: 'pi pi-fw pi-users', to: '/app/Teams', roles: ['admin', 'employee'] },
            { label: 'Project', icon: 'pi pi-fw pi-folder', to: '/app/Project', roles: ['admin', 'employee'] },
            { label: 'Task', icon: 'pi pi-fw pi-list-check', to: '/app/Task', roles: ['admin', 'employee'] }
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
            { 
                label: 'Add Superviseur', 
                icon: 'pi pi-fw pi-user-plus', 
                to: '/app/AddAdmin', 
                roles: ['admin'], // Only admin, not supervisor
                requiresAdmin: true // Add this flag to explicitly require admin role
            }
        ]
    }
]);

// Update the filtered model computation
const filteredModel = computed(() => {
    return model.value.map(section => ({
        ...section,
        items: section.items.filter(item => {
            // Check if item requires admin role
            if (item.requiresAdmin) {
                return userRole.value === 'admin';
            }
            return item.roles.includes(userRole.value);
        })
    })).filter(section => section.items.length > 0);
});

// Add new computed property for TimeTracking styling
const isEmployee = computed(() => userRole.value === 'employee');
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in filteredModel" :key="i">
            <app-menu-item 
                v-if="!item.separator" 
                :item="item" 
                :index="i"
                :class="{ 
                    'time-tracking-highlight': isEmployee && item.items.some(menuItem => menuItem.label === 'Time Tracking')
                }"
            ></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped>
.time-tracking-highlight {
    :deep(.router-link-active) {
        color: #0aa56a !important; /* Blue color - you can change this */
        font-weight: bold;
    }
}
</style>