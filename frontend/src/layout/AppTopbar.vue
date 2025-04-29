<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useRouter } from 'vue-router';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const router = useRouter();

// Logout method
const logout = () => {
    // Determine user type before clearing localStorage
    const userType = localStorage.getItem('administrateur') ? 'admin' : 'employee';

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('administrateur');
    localStorage.removeItem('employee');

    // Redirect to the appropriate login page
    if (userType === 'admin') {
        router.push({ name: 'Login' }); // Redirect to admin login
    } else {
        router.push({ name: 'EmployeeLogin' }); // Redirect to employee login
    }
};
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/app" class="layout-topbar-logo">
                <img src="/logo2.png" alt="Logo" />
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
            </div>

            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="hidden layout-topbar-menu lg:block">
                <div class="layout-topbar-menu-content">
                    <router-link to="/app/calendar" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendar</span>
                    </router-link>
                    <router-link to="/app/notifications" class="layout-topbar-action">
                        <i class="pi pi-bell"></i>
                        <span>Notifications</span>
                    </router-link>
                    <router-link to="/app/profile" class="layout-topbar-action">
                        <i class="pi pi-user"></i>
                        <span>Profile</span>
                    </router-link>
                    <!-- Logout Button -->
                    <button @click="logout" class="layout-topbar-action" title="Logout">
                        <i class="pi pi-sign-out"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
