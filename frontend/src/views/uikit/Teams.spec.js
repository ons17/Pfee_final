import { mount, flushPromises } from '@vue/test-utils';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { ref, reactive } from 'vue';
import Teams from './Teams.vue';
import PrimeVue from 'primevue/config';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import { ApolloClient, InMemoryCache } from '@apollo/client/core';

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn();

// Mock data
const mockTeams = [
  {
    idEquipe: '1',
    nom_equipe: 'Development Team',
    description_equipe: 'Main development team',
    projets: [{ idProjet: '1', nom_projet: 'Project A' }]
  },
  {
    idEquipe: '2',
    nom_equipe: 'Design Team',
    description_equipe: 'UI/UX design team',
    projets: []
  }
];

const mockProjects = [
  { idProjet: '1', nom_projet: 'Project A', statut_projet: 'in_progress' },
  { idProjet: '2', nom_projet: 'Project B', statut_projet: 'todo' }
];

// Mock Apollo composables
vi.mock('@vue/apollo-composable', () => {
  const mockAddTeamToProject = vi.fn().mockResolvedValue({
    data: {
      addEquipeToProject: {
        success: true,
        message: 'Project added successfully'
      }
    }
  });

  return {
    useQuery: () => ({
      result: reactive({
        value: {
          equipes: mockTeams,
          projets: mockProjects
        }
      }),
      loading: ref(false),
      refetch: vi.fn(),
      error: ref(null)
    }),
    useMutation: (mutation) => {
      // Always return { mutate: fn }
      return [{
        mutate: mockAddTeamToProject
      }, { loading: ref(false) }];
    },
    provideApolloClient: vi.fn()
  };
});

// Mock PrimeVue Toast
const toastSpy = vi.fn();
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastSpy
  })
}));

describe('Teams.vue', () => {
  let wrapper;
  let mockApolloClient;

  beforeEach(async () => {
    // Mock localStorage
    window.localStorage.setItem('administrateur', JSON.stringify({ 
      id: 1, 
      role: 'ADMIN' 
    }));
    window.localStorage.setItem('password', 'admin123');

    mockApolloClient = new ApolloClient({
      cache: new InMemoryCache()
    });

    wrapper = mount(Teams, {
      global: {
        plugins: [PrimeVue],
        components: {
          Button,
          DataTable,
          Column,
          InputText,
          Textarea,
          Dialog
        },
        provide: {
          [Symbol.for('DefaultApolloClient')]: mockApolloClient
        },
        stubs: {
          Toolbar: {
            template: `
              <div class="toolbar">
                <slot name="start">
                  <button label="New">New</button>
                </slot>
                <slot name="end"></slot>
              </div>
            `
          },
          Dropdown: true,
          Chip: true,
          ProgressSpinner: true,
          IconField: true,
          InputIcon: true
        }
      }
    });

    // Initialize component data
    wrapper.vm.teams = [...mockTeams];
    wrapper.vm.projects = [...mockProjects];
    await flushPromises();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  describe('Component Initialization', () => {
    it('renders teams table', () => {
      const table = wrapper.findComponent(DataTable);
      expect(table.exists()).toBe(true);
    });

    it('displays correct number of teams', () => {
      expect(wrapper.vm.teams).toHaveLength(mockTeams.length);
    });

    it('shows admin controls when user is admin', () => {
      const newButton = wrapper.find('button');
      expect(newButton.exists()).toBe(true);
    });
  });

  describe('Team Actions', () => {
    it('shows delete confirmation dialog', async () => {
      await wrapper.vm.confirmDeleteTeam(mockTeams[0]);
      expect(wrapper.vm.deleteTeamDialog).toBe(true);
      expect(wrapper.vm.team).toEqual(mockTeams[0]);
    });

    it('requires password for deletion', async () => {
      wrapper.vm.team = mockTeams[0];
      wrapper.vm.adminPassword = '';
      await wrapper.vm.deleteTeam();
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'error',
        detail: expect.stringMatching(/password/i)
      }));
    });
  });

  describe('Project Management', () => {
    it('can add project to team', async () => {
      // Set up initial state for a new team (no idEquipe)
      const team = {
        nom_equipe: 'Development Team',
        description_equipe: 'Main development team',
        projets: [{ idProjet: '1', nom_projet: 'Project A' }]
      };

      const initialLength = team.projets.length;

      wrapper.vm.team = team;
      wrapper.vm.projects = mockProjects;

      const projectToAdd = mockProjects[1];
      await wrapper.vm.handleAddProject(projectToAdd.idProjet);
      await flushPromises();

      expect(wrapper.vm.team.projets.length).toBe(initialLength + 1);

      const addedProject = wrapper.vm.team.projets.find(
        p => p.idProjet === projectToAdd.idProjet
      );
      expect(addedProject).toBeTruthy();
      expect(addedProject.nom_projet).toBe(projectToAdd.nom_projet);

      const originalProject = wrapper.vm.team.projets.find(
        p => p.idProjet === mockTeams[0].projets[0].idProjet
      );
      expect(originalProject).toBeTruthy();
    });

    it('shows available projects for team', async () => {
      const team = {...mockTeams[0]};
      await wrapper.vm.editTeam(team);
      await flushPromises();
      
      expect(wrapper.vm.availableProjects.length).toBe(1);
    });
  });
});