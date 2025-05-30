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
    name: 'Welcome',
    component: () => import('@/views/pages/auth/Welcome.vue'),
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
          adminOnly: true, // Admin-only route
        },
      },
      {
        path: 'TimeTracking',
        name: 'TimeTracking',
        component: TimeTracking,
        meta: { 
          requiresAuth: true,
          employeeOnly: true, // Employee-only route
        },
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
  const administrator = JSON.parse(localStorage.getItem('administrateur'));
  const token = localStorage.getItem('token');

  // Handle routes that don't require authentication
  if (to.path === '/login' || to.path === '/EmployeeLogin') {
    if (administrator) {
      next('/app'); // Redirect admin to admin dashboard
      return;
    } else if (employee) {
      next('/app/timetracking'); // Redirect employee to time tracking
      return;
    }
    next();
    return;
  }

  // Check authentication for protected routes
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      // Redirect to the appropriate login page if no token is found
      if (to.meta.adminOnly) {
        next('/login'); // Redirect to admin login
      } else {
        next('/EmployeeLogin'); // Redirect to employee login
      }
      return;
    }

    // Admin-only routes
    if (to.meta.adminOnly) {
      if (!administrator) {
        next('/login'); // Redirect to admin login if unauthorized
        return;
      }
    }

    // Employee-only routes
    if (to.meta.employeeOnly) {
      if (!employee) {
        next('/EmployeeLogin'); // Redirect to employee login if unauthorized
        return;
      }
    }
  }

  next();
});

export default router;