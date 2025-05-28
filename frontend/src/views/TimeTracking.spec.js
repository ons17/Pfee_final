import { mount, flushPromises } from '@vue/test-utils';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import TimeTracking from './TimeTracking.vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import PrimeVue from 'primevue/config';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';

// Mock PrimeVue Toast
const toastSpy = vi.fn();
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastSpy
  }),
  PrimeVueToastSymbol: Symbol('PrimeVueToast')
}));

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
          { duree_suivi: 3600, heure_debut_suivi: new Date().toISOString() },
          { duree_suivi: 1800, heure_debut_suivi: new Date().toISOString() }
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

// Mock timer
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

// Mock GraphQL queries/mutations
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

    mockApolloClient = new ApolloClient({
      cache: new InMemoryCache(),
      defaultOptions: { query: { fetchPolicy: 'no-cache' } }
    });

    await router.push('/');
    await router.isReady();

    wrapper = mount(TimeTracking, {
      global: {
        plugins: [router, PrimeVue],
        components: {
          Button,
          Dropdown,
          ProgressBar,
          ProgressSpinner
        },
        stubs: {
          Card: true,
          Tag: true,
          DataTable: true,
          Column: true,
          InputText: true,
          Dialog: true,
          Toast: true,
          Badge: true
        },
        provide: {
          [Symbol.for('DefaultApolloClient')]: mockApolloClient
        },
        mocks: {
          $toast: { add: vi.fn() }
        }
      }
    });

    await flushPromises();
    await wrapper.vm.$nextTick();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
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

  describe('Project and Task Selection', () => {
    it('enables task dropdown when project is selected', async () => {
      await router.isReady();
      wrapper.vm.selectedProject = { id: 1, name: 'Test Project' };
      wrapper.vm.projects = [{ id: 1, name: 'Test Project' }];
      await flushPromises();
      const taskDropdown = wrapper.findComponent(Dropdown);
      expect(taskDropdown.props('disabled')).toBe(false);
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
      wrapper.vm.activeEntry = { id: 1, employee: 'Test User' };
      wrapper.vm.password = '';
      await wrapper.vm.deleteEntry();
      
      expect(toastSpy).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter your password to confirm deletion.',
        life: 5000
      });
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
      wrapper.vm.$.setupState.timeEntriesResult = {
        value: {
          suivisDeTemp: [
            { duree_suivi: 3600, heure_debut_suivi: new Date().toISOString() },
            { duree_suivi: 1800, heure_debut_suivi: new Date().toISOString() }
          ]
        }
      };
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.totalWeekMinutes).toBe(90);
    });
  });
});