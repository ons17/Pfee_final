import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import EmployeeLogin from '@/views/pages/auth/EmployeeLogin.vue';
import EmployeeDashboard from '@/views/pages/EmployeeDashboard.vue';
import Login from '@/views/pages/auth/Login.vue';
import ResetPasswordAdmin from '@/views/pages/admin/resetPasswordAdmin.vue';
import ResetPassword from '@/views/pages/auth/ResetPassword.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login, // Admin login page
  },
  {
    path: '/EmployeeLogin',
    name: 'EmployeeLogin',
    component: EmployeeLogin, // Employee login page
  },
  {
    path: '/dashboard',
    name: 'EmployeeDashboard',
    component: EmployeeDashboard,
    meta: { requiresAuth: true }, // Protect this route
  },
  {
    path: '/ResetPassword',
    name: 'ResetPassword',
    component: ResetPassword,
  },
  {
    path: '/resetPasswordAdmin',
    name: 'ResetPasswordAdmin',
    component: ResetPasswordAdmin,
  },
  {
    path: '/',
    redirect: '/login', // Redirect root path to the Login page
  },
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true }, // Protect all child routes
    children: [
      {
        path: '/app',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'TimeTracking',
        name: 'TimeTracking',
        component: () => import('@/views/TimeTracking.vue'),
      },
      {
        path: 'Project',
        name: 'Project',
        component: () => import('@/views/uikit/Project.vue'),
      },
      {
        path: 'Task',
        name: 'Task',
        component: () => import('@/views/uikit/Task.vue'),
      },
      {
        path: 'Teams',
        name: 'Teams',
        component: () => import('@/views/uikit/Teams.vue'),
      },
      {
        path: 'Employee',
        name: 'Employee',
        component: () => import('@/views/uikit/Employee.vue'),
      },
      {
        path: 'Profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
      },
      {
        path: 'Calendar',
        name: 'Calendar',
        component: () => import('@/views/pages/Calendar.vue'),
      },
      {
        path: 'Reports',
        name: 'Reports',
        component: () => import('@/views/pages/Reports.vue'),
      },
      {
        path: 'Performance',
        name: 'Performance',
        component: () => import('@/views/pages/Performance.vue'),
      },
      {
        path: 'Notifications',
        name: 'Notifications',
        component: () => import('@/views/pages/Notifications.vue'),
      },
      {
        path: 'AddAdmin',
        name: 'AddAdmin',
        component: () => import('@/views/pages/admin/AddSupervisor.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*', // This will match all paths not defined above
    name: 'NotFound',
    component: () => import('@/views/pages/NotFound.vue'),
  },
  {
    path: '/Access-denied',
    name: 'AccessDenied',
    component: () => import('@/views/pages/auth/Access.vue'),
  },
  {
    path: '/Error',
    name: 'Error',
    component: () => import('@/views/pages/auth/Error.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global Navigation Guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token'); // Check if a token exists in localStorage

  if (to.meta.requiresAuth && !token) {
    // If the route requires authentication and no token is found, redirect to login
    next({ name: 'Login' });
  } else {
    // Otherwise, allow access
    next();
  }
});

export default router;