import { mount, flushPromises } from '@vue/test-utils';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import TimeTracking from './TimeTracking.vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import ProgressBar from 'primevue/progressbar';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';

// Mock matchMedia
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
};

// Mock Apollo composables
vi.mock('@vue/apollo-composable', () => ({
  useQuery: () => ({
    result: { 
      value: {
        suivisDeTemp: [
          { duration: 3600 },
          { duration: 1800 }
        ],
        getProjetsForEmployee: [{ idProjet: 1, nom_projet: 'Test Project', statut_projet: 'in_progress' }],
        taches: [{ idTache: 1, idProjet: 1, titreTache: 'Test Task', statutTache: 'IN_PROGRESS' }],
        getActiveSuivi: null
      }
    },
    loading: { value: false },
    refetch: vi.fn(),
    onResult: vi.fn()
  }),
  useMutation: () => [vi.fn(), { loading: { value: false } }],
  provideApolloClient: vi.fn()
}));

vi.mock('@/views/uikit/timer', () => ({
  useTimer: () => ({
    timer: { value: 0 },
    isRunning: { value: false },
    isPaused: { value: false },
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    formatTime: vi.fn(() => '00:00:00'),
    restoreTimerState: vi.fn(),
    pauseTimer: vi.fn(),
    resumeTimer: vi.fn()
  })
}));

vi.mock('@/graphql', () => ({
  SUIVIS_DE_TEMP: 'SuivisDeTemp',
  GET_PROJECTS_FOR_EMPLOYEE: 'GetProjetsForEmployee',
  GET_TACHES: 'GetTaches',
  GET_ACTIVE_SUIVI: 'GetActiveSuivi',
  CREATE_SUIVI: 'CreateSuivi',
  STOP_ACTIVE_SUIVI: 'StopActiveSuivi',
  DELETE_SUIVI: 'DeleteSuivi',
  PAUSE_SUIVI: 'PauseSuivi',
  RESUME_SUIVI: 'ResumeSuivi'
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();

describe('TimeTracking.vue', () => {
  let wrapper;
  let router;
  let toastSpy;
  let mockApolloClient;

  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
        { path: '/login', name: 'EmployeeLogin', component: { template: '<div>Login</div>' } }
      ]
    });

    window.localStorage.setItem('employee', JSON.stringify({ 
      idEmployee: 1, 
      nomEmployee: 'Test User' 
    }));

    toastSpy = vi.fn();

    mockApolloClient = new ApolloClient({
      cache: new InMemoryCache(),
      defaultOptions: { query: { fetchPolicy: 'no-cache' } }
    });

    await router.push('/');
    await router.isReady();

    wrapper = mount(TimeTracking, {
      global: {
        plugins: [router, PrimeVue, ToastService],
        components: { Button, Dropdown, ProgressBar },
        stubs: {
          'primevue-card': true,
          'primevue-tag': true,
          'primevue-datatable': true,
          'primevue-column': true,
          'primevue-inputtext': true,
          'primevue-dialog': true,
          'primevue-toast': true,
          'Card': true,
          'Tag': true,
          'DataTable': true,
          'Column': true,
          'InputText': true,
          'Dialog': true,
          'Toast': true,
          'Button': false, // Do not stub Button
          'Dropdown': false, // Do not stub Dropdown
          'ProgressBar': false // Do not stub ProgressBar
        },
        mocks: {
          $toast: { add: toastSpy }
        },
        provide: {
          [Symbol.for('DefaultApolloClient')]: mockApolloClient
        }
      },
      attachTo: document.body
    });
    await flushPromises();
    await wrapper.vm.$nextTick();
  }, 30000);

  afterEach(() => {
    wrapper.unmount();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders the header', async () => {
    await router.isReady();
    expect(wrapper.text()).toContain('Time Tracking');
  });

  it('shows employee name', async () => {
    await router.isReady();
    expect(wrapper.text()).toContain('Test User');
  });

  it('initializes with week view', async () => {
    await router.isReady();
    expect(wrapper.vm.filterType).toBe('week');
  });

  describe('Timer Controls', () => {
    it('disables start button when no task is selected', async () => {
      await flushPromises();
      const timerButton = wrapper.find('button[data-test="timer-button"]');
      expect(timerButton.exists()).toBe(true);
      expect(timerButton.attributes('disabled')).toBeDefined();
    });

    it('shows correct button state when tracking is active', async () => {
      // Set the running flag directly (do not use .value)
      wrapper.vm.isRunning = true;
      await flushPromises();
      const timerButton = wrapper.find('button[data-test="timer-button"]');
      expect(timerButton.text().toLowerCase()).toContain('pause');
    });

    it('shows correct button state when tracking is paused', async () => {
      wrapper.vm.isRunning = true;
      wrapper.vm.isPaused = true;
      await flushPromises();
      const timerButton = wrapper.find('button[data-test="timer-button"]');
      expect(timerButton.text().toLowerCase()).toContain('resume');
    });
  });

  describe('Project and Task Selection', () => {
    it('disables task dropdown when no project is selected', async () => {
      await flushPromises();
      const taskDropdown = wrapper.find('[data-test="task-dropdown"]');
      expect(taskDropdown.exists()).toBe(true);
      expect(taskDropdown.attributes('disabled')).toBeDefined();
    });

    it('enables task dropdown when project is selected', async () => {
      await router.isReady();
      // Assign directly to the component properties
      wrapper.vm.selectedProject = { id: 1, name: 'Test Project' };
      wrapper.vm.projects = [{ id: 1, name: 'Test Project' }];
      await flushPromises();
      const taskDropdown = wrapper.find('[data-test="task-dropdown"]');
      expect(taskDropdown.attributes('disabled')).toBeUndefined();
    });

    it('clears selected task when project changes', async () => {
      await router.isReady();
      wrapper.vm.selectedTask = { id: 1, title: 'Test Task' };
      wrapper.vm.handleProjectChange();
      expect(wrapper.vm.selectedTask).toBeNull();
    });
  });

  describe('Date Range Controls', () => {
    it('updates date range when filter type changes', async () => {
      await router.isReady();
      wrapper.vm.filterType = 'day';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.formatDateRange()).toMatch(/\w+ \d{2}, \d{4}/);
    });

    it('navigates to previous period', async () => {
      await router.isReady();
      const initialDate = new Date(wrapper.vm.currentDate);
      wrapper.vm.navigatePeriod(-1);
      expect(wrapper.vm.currentDate.getTime()).toBeLessThan(initialDate.getTime());
    });

    it('navigates to next period', async () => {
      await router.isReady();
      const initialDate = new Date(wrapper.vm.currentDate);
      wrapper.vm.navigatePeriod(1);
      expect(wrapper.vm.currentDate.getTime()).toBeGreaterThan(initialDate.getTime());
    });
  });

  describe('Time Entry Management', () => {
    it('shows delete confirmation dialog when delete button is clicked', async () => {
      await router.isReady();
      const entry = { id: 1, task: 'Test Task' };
      wrapper.vm.confirmDelete(entry);
      expect(wrapper.vm.showDeleteDialog).toBe(true);
      expect(wrapper.vm.activeEntry).toEqual(entry);
    });

    it('requires password for deletion', async () => {
      // Assign activeEntry directly (do not use .value)
      wrapper.vm.activeEntry = { id: 1, employee: 'Test User' };
      wrapper.vm.password = ''; // Simulate missing password
      await wrapper.vm.deleteEntry();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: expect.stringContaining('password')
        })
      );
    });

    it('can export time entries to CSV', async () => {
      const linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
      wrapper.vm.timeEntries = [
        { task: 'Test', project: 'Project', startTime: new Date(), duration: 3600 }
      ];
      await wrapper.vm.exportToCSV();
      expect(linkClickSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Weekly Summary', () => {
    it('calculates total week minutes correctly', async () => {
      // Patch the Apollo result and force update
      wrapper.vm.$.setupState.timeEntriesResult.value = {
        suivisDeTemp: [
          { duree_suivi: 3600 },
          { duree_suivi: 1800 }
        ]
      };
      Object.defineProperty(wrapper.vm, 'timeEntries', {
        get() {
          return [
            { duration: 3600 },
            { duration: 1800 }
          ];
        }
      });
      await flushPromises();
      expect(wrapper.vm.totalWeekMinutes).toBe(90);
    });

    it('shows progress towards weekly goal', async () => {
      // Set filterType directly
      wrapper.vm.filterType = 'week';
      await flushPromises();
      const progressBar = wrapper.findComponent(ProgressBar);
      expect(progressBar.exists()).toBe(true);
    });
  });
});