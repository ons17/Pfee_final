<template>
  <div 
    class="welcome-page"
    @keydown="handleKeyboardNavigation"
    tabindex="0"
  >
    <!-- Topbar with theme switcher -->
    <div class="topbar">
      <div class="logo-section">
        <img src="/logo2.png" alt="ImbusFlow Logo" class="logo animate-fadein" />
        <span class="brand-name">ImbusFlow</span>
      </div>
      <div 
        class="theme-actions" 
        role="group" 
        aria-label="Theme and Help Controls"
      >
        <Button
          :icon="isDarkTheme ? 'pi pi-sun' : 'pi pi-moon'"
          class="p-button-rounded p-button-text"
          @click="toggleDarkMode"
          :aria-label="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
          tabindex="0"
        />
        <Button
          icon="pi pi-question-circle"
          class="p-button-rounded p-button-text ml-2"
          @click="showHelpDialog = true"
          aria-label="Get Help"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left Section -->
      <div class="left-section animate-slideup">
        <h1 class="title">Welcome to ImbusFlow</h1>
        <p class="subtitle">Streamline your workflow with smart time tracking</p>
        
        <div class="features-grid">
          <div v-for="(feature, index) in features" 
               :key="index" 
               class="feature-card"
               :style="{ animationDelay: `${index * 0.1}s` }">
            <i :class="feature.icon"></i>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>

        <div class="stats-section">
          <div v-for="(stat, index) in stats" 
               :key="index"
               class="stat-item animate-fadein"
               :style="{ animationDelay: `${0.5 + index * 0.1}s` }">
            <span class="stat-number">{{ stat.number }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Right Section - Login Options -->
      <div class="right-section animate-slideup">
        <div class="login-card">
          <img src="/logo2.png" alt="ImbusFlow Logo" class="card-logo pulse" />
          <h2 class="portal-title">Choose Your Portal</h2>
          <p class="portal-subtitle">Select the appropriate login option below</p>

          <div class="login-buttons">
            <Button
              label="Login as Administrator"
              icon="pi pi-user-plus"
              severity="primary"
              class="p-button-lg w-full mb-3 admin-btn"
              raised
              :loading="loading.admin"
              @click="goToAdmin"
              v-tooltip.top="'Access admin dashboard & management tools'"
              tabindex="1"
              aria-label="Login as Administrator"
            />
            <Button
              label="Login as Employee"
              icon="pi pi-users"
              severity="success"
              class="p-button-lg w-full employee-btn"
              raised
              :loading="loading.employee"
              @click="goToEmployee"
              v-tooltip.top="'Track time & manage your tasks'"
              tabindex="2"
              aria-label="Login as Employee"
            />
          </div>

          <div class="help-links">
            <a 
              href="mailto:support@imbusflow.com" 
              class="help-link"
              tabindex="3"
              aria-label="Contact Support"
            >
              <i class="pi pi-envelope mr-1"></i>
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Help Dialog -->
    <Dialog 
      v-model:visible="showHelpDialog" 
      header="Need Help?" 
      :modal="true"
      :style="{ width: '30rem' }"
      class="help-dialog"
    >
      <div class="help-content">
        <div class="help-section">
          <h3><i class="pi pi-user-plus mr-2"></i>Administrator Access</h3>
          <p>For managing teams, projects, and organizational settings.</p>
        </div>
        <div class="help-section">
          <h3><i class="pi pi-users mr-2"></i>Employee Access</h3>
          <p>For time tracking, task management, and project collaboration.</p>
        </div>
        <div class="help-contact">
          <Button 
            label="Contact Support" 
            icon="pi pi-envelope"
            class="p-button-help"
            @click="contactSupport"
          />
        </div>
      </div>
    </Dialog>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <span class="copyright">
            © {{ new Date().getFullYear() }} ImbusFlow
          </span>
          <span class="version">Version 2.0</span>
        </div>
        <div class="footer-links">
          <a href="#" class="footer-link">
            <i class="pi pi-shield mr-1"></i>
            Privacy Policy
          </a>
          <a href="#" class="footer-link">
            <i class="pi pi-file mr-1"></i>
            Terms of Service
          </a>
          <a href="#" class="footer-link">
            <i class="pi pi-globe mr-1"></i>
            Language
          </a>
        </div>
      </div>
    </footer>

    <!-- Animated Background -->
    <div class="animated-bg">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLayout } from '@/layout/composables/layout';
import Button from 'primevue/button';  // Add this import

const router = useRouter();
const { toggleDarkMode, isDarkTheme } = useLayout();
const showHelpDialog = ref(false);
const loading = ref({
  admin: false,
  employee: false
});

// Features data
const features = [
  {
    icon: 'pi pi-clock-fill',
    title: 'Smart Time Tracking',
    description: 'Effortless time logging with intelligent suggestions'
  },
  {
    icon: 'pi pi-chart-line',
    title: 'Real-time Analytics',
    description: 'Comprehensive insights into productivity trends'
  },
  {
    icon: 'pi pi-users',
    title: 'Team Management',
    description: 'Streamlined team coordination and oversight'
  },
  {
    icon: 'pi pi-calendar',
    title: 'Project Planning',
    description: 'Efficient project scheduling and resource allocation'
  }
];

// Stats data
const stats = [
  { number: '10K+', label: 'Active Users' },
  { number: '5M+', label: 'Hours Tracked' },
  { number: '99.9%', label: 'Uptime' }
];

// Navigation functions
const goToAdmin = async () => {
  loading.value.admin = true;
  try {
    await router.push('/login');
  } finally {
    loading.value.admin = false;
  }
};

const goToEmployee = async () => {
  loading.value.employee = true;
  try {
    await router.push('/EmployeeLogin');
  } finally {
    loading.value.employee = false;
  }
};

const showForgotPassword = () => router.push('/ResetPassword');
const contactSupport = () => window.location.href = 'mailto:support@imbusflow.com';

const handleKeyboardNavigation = (event) => {
  if (event.key === 'Tab' && !event.shiftKey) {
    // Manage focus order
  }
};
</script>

<style scoped>
:root {
  --theme-transition: background-color 0.3s ease, color 0.3s ease;
}

.welcome-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--surface-0) 0%, var(--surface-50) 100%);
  position: relative;
  overflow: hidden;
  transition: var(--theme-transition);
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  position: relative;
  z-index: 10;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  height: 40px;
  width: auto;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.main-content {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
  padding: 2rem 4rem;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.left-section {
  padding: 2rem;
}

.title {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(45deg, var(--primary-color), var(--primary-600));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.25rem;
  color: var(--text-color-secondary);
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: var(--surface-card);
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  transition: var(--theme-transition);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
}

.feature-card i {
  font-size: 2rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.feature-card p {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.right-section {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  background: var(--surface-card);
  padding: 3rem 2rem;
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 440px;
  text-align: center;
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(10px);
  transition: var(--theme-transition);
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
  width: 100%;
}

.admin-btn {
  background: #059669 !important; /* Primary blue color */
  color: white !important;
  border: none !important;
  padding: 1rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3) !important;
  height: 3.5rem !important;
}

.admin-btn:hover {
  background: #059669 !important;
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4) !important;
}

.employee-btn {
  background: #16a34a !important; /* Success green color */
  color: white !important;
  border: none !important;
  padding: 1rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
  height: 3.5rem !important;
}

.employee-btn:hover {
  background: #16a34a !important;
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4) !important;
}

/* Ensure button text and icons are visible */
.p-button-lg {
  font-size: 1.1rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.p-button-icon {
  color: white !important;
  margin-right: 0.5rem !important;
}

/* Remove transform to keep buttons stable */
.login-buttons .p-button {
  transform: none !important;
  transition: background-color 0.2s, box-shadow 0.2s !important;
}

.help-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.help-links a {
  color: var(--primary-color);
  text-decoration: none;
}

.help-links a:hover {
  text-decoration: underline;
}

.divider {
  color: var(--surface-400);
}

.trust-badges {
  display: flex;
  gap: 2rem;
  margin-top: 3rem;
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color-secondary);
}

.badge i {
  color: var(--primary-color);
}

.footer {
  position: relative;
  z-index: 10;
  padding: 2rem 4rem;
  background: var(--surface-0);
  transition: var(--theme-transition);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1440px;
  margin: 0 auto;
}

.footer-links {
  display: flex;
  gap: 2rem;
}

.footer-links a {
  color: var(--text-color-secondary);
  text-decoration: none;
  font-size: 0.875rem;
}

.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.1;
  animation: float 20s ease-in-out infinite alternate;
}

.shape-1 {
  background: var(--primary-300);
  width: 400px;
  height: 400px;
  top: -100px;
  left: -100px;
}

.shape-2 {
  background: var(--green-300);
  width: 300px;
  height: 300px;
  top: 40%;
  right: -50px;
  animation-delay: 5s;
}

.shape-3 {
  background: var(--primary-200);
  width: 250px;
  height: 250px;
  bottom: -50px;
  left: 30%;
  animation-delay: 10s;
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(20px, -20px) rotate(45deg); }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .left-section {
    text-align: center;
    padding: 1rem;
  }

  .trust-badges {
    justify-content: center;
  }

  .footer {
    padding: 1rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}

@media (max-width: 640px) {
  .title {
    font-size: 2.5rem;
  }

  .topbar {
    padding: 1rem;
  }

  .login-card {
    padding: 2rem 1rem;
  }

  .footer-links {
    flex-direction: column;
    gap: 1rem;
  }
}

/* Add to existing styles */

.animate-fadein {
  animation: fadeIn 0.6s ease-out forwards;
}

.animate-slideup {
  animation: slideUp 0.6s ease-out forwards;
}

.pulse {
  animation: pulse 2s infinite;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.stats-section {
  display: flex;
  justify-content: space-around;
  margin-top: 3rem;
  padding: 2rem;
  background: var(--surface-card);
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: var(--theme-transition);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.help-dialog .p-dialog-content {
  padding: 2rem;
}

.help-section {
  margin-bottom: 1.5rem;
}

.help-section h3 {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.help-contact {
  margin-top: 2rem;
  text-align: center;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.version {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.footer-link {
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.footer-link:hover {
  color: var(--primary-color);
}

/* Enhance existing styles */

.login-buttons {
  .admin-btn, .employee-btn {
    transition: transform 0.2s, box-shadow 0.2s;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

.feature-card {
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
}

/* Add responsive improvements */
@media (max-width: 768px) {
  .stats-section {
    flex-direction: column;
    gap: 2rem;
  }
  
  .feature-card {
    padding: 1.5rem;
  }
}

/* Add to your existing styles */
.p-button:focus,
.help-link:focus,
.footer-link:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.p-button:focus:not(:focus-visible),
.help-link:focus:not(:focus-visible),
.footer-link:focus:not(:focus-visible) {
  outline: none;
}

/* Add skip link for keyboard users */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary-color);
  color: white;
  padding: 8px;
  z-index: 100;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}
</style>