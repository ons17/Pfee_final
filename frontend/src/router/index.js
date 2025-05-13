import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import EmployeeLogin from '@/views/pages/auth/EmployeeLogin.vue';
import Login from '@/views/pages/auth/Login.vue';
import ResetPasswordAdmin from '@/views/pages/admin/resetPasswordAdmin.vue';
import ResetPassword from '@/views/pages/auth/ResetPassword.vue';
import Dashboard from '@/views/Dashboard.vue';
import TimeTracking from '@/views/TimeTracking.vue';

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
    path: '/ResetPassword',
    name: 'ResetPassword',
    component: ResetPassword,
  },
  {
    path: '/admin/reset-password',
    name: 'AdminResetPassword',
    component: () => import('@/views/pages/admin/resetPasswordAdmin.vue'),
    meta: { requiresAuth: false }
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
        component: Dashboard,
        meta: { 
          requiresAuth: true,
          adminOnly: true
        }
      },
      {
        path: 'TimeTracking',
        name: 'TimeTracking',
        component: TimeTracking,
        meta: { 
          requiresAuth: true
        }
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
  const employee = JSON.parse(localStorage.getItem('employee'));

  // Protect dashboard route
  if (to.path.includes('/dashboard')) {
    if (!employee || employee.role.toLowerCase() !== 'admin') {
      next('/app/timetracking'); // Redirect non-admins to time tracking
      return;
    }
  }

  // Check authentication for protected routes
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!localStorage.getItem('token')) {
      next('/login');
      return;
    }
  }

  next();
});

export default router;