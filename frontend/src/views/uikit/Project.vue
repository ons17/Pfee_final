<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import ProgressBar from 'primevue/progressbar';
import { GET_TEAMS, GET_PROJECTS, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT , GET_TACHES } from '@/graphql';
import { ADD_TEAM_TO_PROJECT, REMOVE_TEAM_FROM_PROJECT } from '@/graphql';
import { isAdmin, validatePassword } from '@/utils/authUtils'; // Import utility functions

const toast = useToast();
const dt = ref();
const projects = ref([]);
const teams = ref([]);
const projectDialog = ref(false);
const deleteProjectDialog = ref(false);
const deleteProjectsDialog = ref(false);
const removeTeamDialog = ref(false);
const project = ref({});
const selectedProjects = ref([]);
const submitted = ref(false);
const loading = ref(false);
const selectedTeam = ref(null);
const teamToRemove = ref({ id: null, name: '' });
const addingTeam = ref(false);
const removingTeam = ref(false);
const dropdownKey = ref(0);
const adminPassword = ref('');

// Computed property to check if user is admin
const userIsAdmin = computed(() => isAdmin());

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const statuses = ref([
    { label: 'TODO', value: 'todo' },
    { label: 'IN_PROGRESS', value: 'in_progress' },
    { label: 'END', value: 'end' }
]);

// Computed property for available teams
const availableTeams = computed(() => {
    if (!teams.value.length) return [];
    const assignedTeamIds = project.value.equipes?.map((team) => team.idEquipe) || [];
    return teams.value.filter((team) => !assignedTeamIds.includes(team.idEquipe));
});

// Queries
const {
    result: projectsResult,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
} = useQuery(GET_PROJECTS, null, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
});

const {
    result: teamsResult,
    loading: teamsLoading,
    refetch: refetchTeams
} = useQuery(GET_TEAMS, null, {
    fetchPolicy: 'cache-and-network'
});

const { result: tasksResult } = useQuery(GET_TACHES);

// Mutations
const { mutate: createProject } = useMutation(CREATE_PROJECT, {
    update(cache, { data: { createProjet } }) {
        try {
            // Read existing projects from cache
            const existingData = cache.readQuery({ 
                query: GET_PROJECTS 
            });

            // Check if project already exists in cache
            const projectExists = existingData?.projets?.some(
                p => p.idProjet === createProjet.idProjet
            );

            if (!projectExists) {
                // Write updated data to cache only if project doesn't exist
                cache.writeQuery({
                    query: GET_PROJECTS,
                    data: {
                        projets: [...(existingData?.projets || []), {
                            ...createProjet,
                            equipes: createProjet.equipes || []
                        }]
                    }
                });
            }
        } catch (error) {
            console.error('Error updating cache:', error);
        }
    },
    // Add this option to ensure fresh data
    refetchQueries: [{ query: GET_PROJECTS }]
});

const { mutate: updateProject } = useMutation(UPDATE_PROJECT, {
    update(cache, { data: { updateProjet } }) {
        const existingData = cache.readQuery({ query: GET_PROJECTS });
        const updatedProject = {
            ...updateProjet,
            equipes: updateProjet.equipes || []
        };
        cache.writeQuery({
            query: GET_PROJECTS,
            data: {
                projets: (existingData?.projets || []).map((p) => (p.idProjet === updatedProject.idProjet ? updatedProject : p))
            }
        });
    }
});

const { mutate: deleteProjetMutation } = useMutation(DELETE_PROJECT);
const { mutate: addTeamToProject } = useMutation(ADD_TEAM_TO_PROJECT);
const { mutate: removeTeamFromProject } = useMutation(REMOVE_TEAM_FROM_PROJECT);

// Date handling functions (copied exactly from tasks.vue)
const formatDBDate = (dateString) => {
    if (!dateString) return '-';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

const formatDateForDB = (date) => {
    if (!date) return null;
    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    return null;
};

const handleDateSelect = (event, field) => {
    if (isEditMode.value) return; // Prevent date changes in edit mode
    const selectedDate = new Date(event);
    selectedDate.setHours(12, 0, 0, 0);
    project.value[field] = selectedDate;
};

const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
};

// Validation functions (copied from tasks.vue but for projects)
const validateProjectName = (name) => {
    if (!name) return 'Project name is required';
    if (name.length < 2 || name.length > 50) return 'Project name must be between 2 and 50 characters';
    return null;
};

const validateProjectDescription = (description) => {
    if (description && (description.length < 10 || description.length > 500)) {
        return 'Description must be between 10 and 500 characters';
    }
    return null;
};

const validateDate = (date, isStartDate) => {
    if (!date) return isStartDate ? 'Date is required' : null;
    if (!isEditMode.value && isPastDate(date)) return 'Cannot select a date in the past';
    return null;
};

const validateEndDate = (startDate, endDate) => {
    if (!startDate) return 'Start date must be set first';
    if (!endDate) return 'End date is required';
    if (!isEditMode.value && isPastDate(endDate)) return 'Cannot select a date in the past';
    if (new Date(endDate) < new Date(startDate)) return 'End date must be after start date';
    return null;
};

const validateForm = () => {
    const nameError = validateProjectName(project.value.nom_projet);
    const descriptionError = validateProjectDescription(project.value.description_projet);
    const startDateError = validateDate(project.value.date_debut_projet, true);
    const endDateError = validateEndDate(project.value.date_debut_projet, project.value.date_fin_projet);

    if (nameError) toast.add({ severity: 'error', summary: 'Error', detail: nameError, life: 3000 });
    if (descriptionError) toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
    if (startDateError) toast.add({ severity: 'error', summary: 'Error', detail: startDateError, life: 3000 });
    if (endDateError) toast.add({ severity: 'error', summary: 'Error', detail: endDateError, life: 3000 });

    return !(nameError || descriptionError || startDateError || endDateError);
};

// Computed property for edit mode
const isEditMode = computed(() => !!project.value.idProjet);

// Watchers
watch(projectsResult, (newResult) => {
    if (newResult?.projets) {
        projects.value = newResult.projets.map((p) => ({
            ...p,
            date_debut_projet: p.date_debut_projet ? new Date(p.date_debut_projet) : null,
            date_fin_projet: p.date_fin_projet ? new Date(p.date_fin_projet) : null,
            equipes: p.equipes || []
        }));
    }
});

watch(teamsResult, (newResult) => {
    if (newResult?.equipes) {
        teams.value = newResult.equipes;
        dropdownKey.value++;
    }
});

watch(projectsError, (error) => {
    if (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load projects',
            life: 3000
        });
    }
});

// Lifecycle
onMounted(async () => {
    try {
        await refetchProjects();
        await refetchTeams();
    } catch (error) {
        console.error('Error refetching data:', error);
    }
});

// Methods
const openNew = () => {
    project.value = {
        nom_projet: '',
        description_projet: '',
        date_debut_projet: null,
        date_fin_projet: null,
        statut_projet: 'todo',
        equipes: [] // Initialize with empty array
    };
    submitted.value = false;
    projectDialog.value = true;
};

const editProject = async (proj) => {
    project.value = {
        ...proj,
        // Store original dates that cannot be modified
        originalDateDebutProjet: proj.date_debut_projet,
        originalDateFinProjet: proj.date_fin_projet,
        equipes: proj.equipes || []
    };
    projectDialog.value = true;

    try {
        await refetchTeams();
        dropdownKey.value++;
        await nextTick();
    } catch (error) {
        console.error('Error refreshing teams:', error);
    }
};

const hideDialog = () => {
  projectDialog.value = false;
  submitted.value = false;
  selectedTeam.value = null;
  project.value = {
    nom_projet: '',
    description_projet: '',
    date_debut_projet: null,
    date_fin_projet: null,
    statut_projet: 'todo',
    equipes: []
  };
};

const saveProject = async () => {
  submitted.value = true;
  if (!validateForm()) return;

  // Prevent duplicate project names (case-insensitive)
  const duplicate = projects.value.some(
    p => p.nom_projet.trim().toLowerCase() === project.value.nom_projet.trim().toLowerCase()
  );
  if (!isEditMode.value && duplicate) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'A project with this name already exists.',
      life: 4000
    });
    loading.value = false;
    return;
  }

  loading.value = true;

  try {
    const projectData = {
      nom_projet: project.value.nom_projet.trim(),
      description_projet: project.value.description_projet?.trim() || null,
      date_debut_projet: isEditMode.value
        ? formatDateForDB(project.value.originalDateDebutProjet)
        : formatDateForDB(project.value.date_debut_projet),
      date_fin_projet: isEditMode.value
        ? formatDateForDB(project.value.originalDateFinProjet)
        : formatDateForDB(project.value.date_fin_projet),
      statut_projet: project.value.statut_projet
    };

    if (project.value.idProjet) {
      // Update existing project
      await updateProject({
        id: project.value.idProjet,
        ...projectData
      });
    } else {
      // Create new project
      const { data } = await createProject(projectData);

      if (data?.createProjet) {
        const newProjectId = data.createProjet.idProjet;
        
        // Only add teams if there are any selected
        if (project.value.equipes.length > 0) {
          const addTeamPromises = project.value.equipes.map(team =>
            addTeamToProject({
              idProjet: newProjectId,
              idEquipe: team.idEquipe
            })
          );
          await Promise.all(addTeamPromises);
        }
      }
    }

    // Explicitly refetch projects to ensure fresh data
    await refetchProjects();
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: project.value.idProjet ? 'Project updated successfully' : 'Project created successfully',
      life: 3000
    });

    projectDialog.value = false;
  } catch (error) {
    console.error('Error saving project:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save project: ' + (error.graphQLErrors?.[0]?.message || error.message),
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

const confirmDeleteProject = (proj) => {
    project.value = proj;
    deleteProjectDialog.value = true;
};

const deleteProject = async () => {
    console.log('isAdmin:', isAdmin()); // Debug log to check if the user is recognized as an admin

    if (!isAdmin()) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Only admins can delete projects.', life: 3000 });
        return;
    }

    if (!adminPassword.value) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter your password.', life: 3000 });
        return;
    }

    if (!validatePassword(adminPassword.value)) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Invalid password. Please try again.', life: 3000 });
        return;
    }

    try {
        const { data } = await deleteProjetMutation({ id: project.value.idProjet });
        if (data?.deleteProjet?.success) {
            await refetchProjects();
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Project deleted successfully.',
                life: 3000
            });
        } else {
            throw new Error(data?.deleteProjet?.message || 'Failed to delete project.');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete project.',
            life: 3000
        });
    } finally {
        deleteProjectDialog.value = false;
        adminPassword.value = ''; // Clear the password field
    }
};

const confirmDeleteSelected = () => {
    deleteProjectsDialog.value = true;
};

const deleteSelectedProjects = async () => {
    // Security checks
    if (!isAdmin()) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Only admins can delete projects.', life: 3000 });
        return;
    }
    if (!adminPassword.value) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter your password.', life: 3000 });
        return;
    }
    if (!validatePassword(adminPassword.value)) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Invalid password. Please try again.', life: 3000 });
        return;
    }

    try {
        const deletePromises = selectedProjects.value.map((proj) => deleteProjetMutation({ id: proj.idProjet }));
        await Promise.all(deletePromises);
        await refetchProjects();
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Selected projects deleted successfully',
            life: 3000
        });
    } catch (error) {
        console.error('Error deleting projects:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete selected projects',
            life: 3000
        });
    } finally {
        deleteProjectsDialog.value = false;
        selectedProjects.value = [];
        adminPassword.value = ''; // Clear password after action
    }
};

const exportCSV = () => {
    const header = ['Name', 'Description', 'Start Date', 'End Date', 'Status', 'Teams'];
    const rows = projects.value.map(project => [
        project.nom_projet,
        project.description_projet,
        formatDBDate(project.date_debut_projet),
        formatDBDate(project.date_fin_projet),
        project.statut_projet,
        (project.equipes || []).map(t => t.nom_equipe).join(' | ')
    ]);
    const csvContent = [header, ...rows]
        .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'projects_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const getStatusLabel = (status) => {
    const statusSeverity = {
        todo: 'warn',
        in_progress: 'info',
        end: 'success'
    };
    return statusSeverity[status] || 'info';
};

const handleAddTeam = async (teamId) => {
    addingTeam.value = true;
    try {
        const teamToAdd = teams.value.find((team) => team.idEquipe === teamId);
        if (!teamToAdd) throw new Error('Team not found');

        if (project.value.idProjet) {
            const { data } = await addTeamToProject({
                idProjet: project.value.idProjet,
                idEquipe: teamId
            });

            if (data.addEquipeToProject.success) {
                project.value.equipes = [...project.value.equipes, teamToAdd];
                dropdownKey.value++;
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: data.addEquipeToProject.message || 'Team added successfully',
                    life: 3000
                });
            } else {
                throw new Error(data.addEquipeToProject.message || 'Failed to add team');
            }
        } else {
            project.value.equipes = [...project.value.equipes, teamToAdd];
            dropdownKey.value++;
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Team added to project',
                life: 3000
            });
        }
        selectedTeam.value = null;
    } catch (error) {
        console.error('Error adding team:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to add team',
            life: 3000
        });
    } finally {
        addingTeam.value = false;
    }
};

const confirmRemoveTeam = (teamId, teamName) => {
    teamToRemove.value = { id: teamId, name: teamName };
    removeTeamDialog.value = true;
};

const handleRemoveTeam = async (teamId) => {
    removingTeam.value = true;
    try {
        const { data } = await removeTeamFromProject({
            idProjet: project.value.idProjet,
            idEquipe: teamId
        });

        if (data.removeEquipeFromProject.success) {
            await refetchProjects();
            dropdownKey.value++;
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: data.removeEquipeFromProject.message || 'Team removed successfully',
                life: 3000
            });
            removeTeamDialog.value = false;
        } else {
            throw new Error(data.removeEquipeFromProject.message || 'Failed to remove team');
        }
    } catch (error) {
        console.error('Error removing team:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to remove team',
            life: 3000
        });
    } finally {
        removingTeam.value = false;
    }
};

// First, add this computed property in the <script setup> section of Project.vue

const getProjectProgress = (project) => {
  const taskCounts = {
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0
  };

  // Get tasks for this project from the tasks query result
  const projectTasks = tasksResult.value?.taches.filter(t => t.idProjet === project.idProjet) || [];
  
  taskCounts.total = projectTasks.length;
  taskCounts.completed = projectTasks.filter(t => t.statutTache === 'END').length;
  taskCounts.inProgress = projectTasks.filter(t => t.statutTache === 'IN_PROGRESS').length;
  taskCounts.todo = projectTasks.filter(t => t.statutTache === 'TODO').length;

  return {
    ...taskCounts,
    percentage: taskCounts.total ? Math.round((taskCounts.completed / taskCounts.total) * 100) : 0
  };
};

const getProgressClass = (percentage) => {
  if (percentage >= 100) return 'progress-complete';    // Green - Complete
  if (percentage >= 70) return 'progress-high';         // Blue - Good Progress
  if (percentage >= 30) return 'progress-medium';       // Orange - Medium Progress
  return 'progress-low';                               // Red - Low Progress
};

// Add this ref at the top with other refs
const statusUpdateLoading = ref({});

// Add this method to handle status updates
const updateProjectStatus = async (projectId, newStatus) => {
  // If already updating this project's status, prevent another update
  if (statusUpdateLoading.value[projectId]) return;

  try {
    // Set loading state for this specific project
    statusUpdateLoading.value[projectId] = true;

    await updateProject({
      id: projectId,
      statut_projet: newStatus
    });

    await refetchProjects();
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project status updated successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update project status',
      life: 3000
    });
  } finally {
    // Clear loading state for this project
    statusUpdateLoading.value[projectId] = false;
  }
};
</script>

<template>
    <div class="p-4 project-page">
        <div class="card">
            <!-- Only show Toolbar for admins -->
            <Toolbar v-if="userIsAdmin" class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button 
                        label="Delete" 
                        icon="pi pi-trash" 
                        severity="danger" 
                        @click="confirmDeleteSelected" 
                        :disabled="!selectedProjects?.length" 
                    />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <div v-if="projectsError" class="p-mt-3 p-p-3 p-text-center error-message">
                <i class="pi pi-exclamation-triangle p-mr-2"></i>
                Error loading projects.
                <Button label="Retry" icon="pi pi-refresh" class="p-button-text p-ml-2" @click="refetchProjects" />
            </div>

            <DataTable
                ref="dt"
                v-model:selection="selectedProjects"
                :value="projects"
                :loading="projectsLoading"
                dataKey="idProjet"
                :paginator="true"
                :rows="5"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} projects"
            >
                <template #loading>
                    <div class="flex align-items-center">
                        <ProgressSpinner style="width: 30px; height: 30px" />
                        <span class="ml-2">Loading projects...</span>
                    </div>
                </template>

                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">Manage Projects</h4>
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search..." />
                        </IconField>
                    </div>
                </template>

                <!-- Only show selection column to admins -->
                <Column v-if="userIsAdmin" selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="nom_projet" header="Name" sortable></Column>
                <Column field="description_projet" header="Description" sortable></Column>
                <Column field="date_debut_projet" header="Start Date" sortable>
                    <template #body="{ data }">
                        {{ formatDBDate(data.date_debut_projet) }}
                    </template>
                </Column>
                <Column field="date_fin_projet" header="End Date" sortable>
                    <template #body="{ data }">
                        {{ formatDBDate(data.date_fin_projet) }}
                    </template>
                </Column>
                <Column field="statut_projet" header="Status" sortable>
                    <template #body="{ data }">
                        <Tag :value="data.statut_projet" :severity="getStatusLabel(data.statut_projet)" />
                    </template>
                </Column>
                <Column header="Teams">
                    <template #body="{ data }">
                        <div class="flex flex-wrap gap-1">
                            <Chip v-for="team in data.equipes" :key="team.idEquipe" :label="team.nom_equipe" class="text-sm" />
                        </div>
                    </template>
                </Column>
                <Column header="Progress" headerStyle="width: 250px">
                    <template #body="{ data }">
                        <div class="progress-wrapper">
                            <div v-if="getProjectProgress(data).total === 0" class="no-tasks-message">
                                <i class="pi pi-info-circle mr-2"></i>
                                No tasks yet
                            </div>
                            <div v-else-if="getProjectProgress(data).percentage === 0" class="no-progress-message">
                                <i class="pi pi-clock mr-2"></i>
                                No tasks completed
                            </div>
                            <div v-else class="progress-container">
                                <ProgressBar 
                                    :value="getProjectProgress(data).percentage"
                                    :class="getProgressClass(getProjectProgress(data).percentage)"
                                />
                                <div class="progress-stats">
                                    <span class="progress-percentage">{{ getProjectProgress(data).percentage }}%</span>
                                    <div class="task-counts">
                                        <small>{{ getProjectProgress(data).completed }}/{{ getProjectProgress(data).total }} tasks</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Column>
                <!-- Only show Actions column to admins -->
                <Column v-if="userIsAdmin" header="Actions" headerStyle="width: 10rem">
                    <template #body="{ data }">
                        <Button 
                            icon="pi pi-pencil" 
                            class="mr-2" 
                            outlined 
                            @click="editProject(data)" 
                        />
                        <Button 
                            icon="pi pi-trash" 
                            severity="danger" 
                            outlined 
                            @click="confirmDeleteProject(data)" 
                        />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="projectDialog" :style="{ width: '700px' }" header="Project Details" :modal="true" :closable="false">
            <div class="flex flex-col gap-4">
                <div class="field">
                    <label for="nom_projet" class="font-bold block mb-2">Name *</label>
                    <InputText id="nom_projet" v-model.trim="project.nom_projet" required autofocus :class="{ 'p-invalid': submitted && !project.nom_projet }" class="w-full" />
                    <small v-if="submitted && !project.nom_projet" class="p-error">Name is required.</small>
                </div>

                <div class="field">
                    <label for="description_projet" class="font-bold block mb-2">Description</label>
                    <Textarea id="description_projet" v-model.trim="project.description_projet" rows="3" class="w-full" :class="{ 'p-invalid': submitted && validateProjectDescription(project.description_projet) }" />
                    <small v-if="submitted && validateProjectDescription(project.description_projet)" class="p-error">
                        {{ validateProjectDescription(project.description_projet) }}
                    </small>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="field">
                        <label for="date_debut_projet" class="font-bold block mb-2">Start Date *</label>
                        <Calendar 
                            id="date_debut_projet" 
                            v-model="project.date_debut_projet" 
                            :showIcon="true" 
                            dateFormat="yy-mm-dd" 
                            placeholder="Select a Start Date" 
                            class="w-full"
                            :minDate="new Date()"
                            @date-select="handleDateSelect($event, 'date_debut_projet')"
                            :class="{ 'p-invalid': submitted && (validateDate(project.date_debut_projet, true) || !project.date_debut_projet) }"
                            :disabled="isEditMode"
                            required
                        />
                        <small v-if="isEditMode" class="text-gray-500">Start date cannot be modified</small>
                        <small v-else-if="submitted && validateDate(project.date_debut_projet, true)" class="p-error">
                            {{ validateDate(project.date_debut_projet, true) }}
                        </small>
                        <small v-else-if="submitted && !project.date_debut_projet" class="p-error">
                            Start date is required
                        </small>
                    </div>
                    <div class="field">
                        <label for="date_fin_projet" class="font-bold block mb-2">End Date *</label>
                        <Calendar
                            id="date_fin_projet"
                            v-model="project.date_fin_projet"
                            :showIcon="true"
                            dateFormat="yy-mm-dd"
                            placeholder="Select an End Date"
                            :minDate="project.date_debut_projet || new Date()"
                            class="w-full"
                            @date-select="handleDateSelect($event, 'date_fin_projet')"
                            :disabled="isEditMode || !project.date_debut_projet"
                            :class="{ 'p-invalid': submitted && (validateEndDate(project.date_debut_projet, project.date_fin_projet) || !project.date_fin_projet) }"
                            required
                        />
                        <small v-if="isEditMode" class="text-gray-500">End date cannot be modified</small>
                        <small v-else-if="submitted && validateEndDate(project.date_debut_projet, project.date_fin_projet)" class="p-error">
                            {{ validateEndDate(project.date_debut_projet, project.date_fin_projet) }}
                        </small>
                        <small v-else-if="submitted && !project.date_fin_projet" class="p-error">
                            End date is required
                        </small>
                    </div>
                </div>

                <div class="field">
                    <label for="statut_projet" class="font-bold block mb-2">Status</label>
                    <Dropdown id="statut_projet" v-model="project.statut_projet" :options="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" class="w-full" />
                </div>

                <div class="field">
                    <label class="font-bold block mb-2">Teams Management</label>
                    <div class="flex gap-2">
                        <Dropdown :key="dropdownKey" v-model="selectedTeam" :options="availableTeams" optionLabel="nom_equipe" optionValue="idEquipe" placeholder="Select a team" class="w-full" :loading="teamsLoading" :disable></Dropdown>
                        <Button label="Add Team" icon="pi pi-plus" @click="handleAddTeam(selectedTeam)" :disabled="!selectedTeam || teamsLoading" :loading="addingTeam" />
                    </div>
                    <div class="mt-4">
                        <h5 class="font-bold mb-2">Assigned Teams</h5>
                        <div class="flex flex-wrap gap-2">
                            <Chip v-for="team in project.equipes" :key="team.idEquipe" :label="team.nom_equipe" removable @remove="confirmRemoveTeam(team.idEquipe, team.nom_equipe)" />
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
                <Button label="Save" icon="pi pi-check" @click="saveProject" :loading="loading" autofocus />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProjectDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
            <div class="flex flex-col gap-3">
                <div class="flex align-items-center gap-3">
                    <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                    <span v-if="project">
                        Are you sure you want to delete project <b>{{ project.nom_projet }}</b>?
                    </span>
                </div>
                <div class="mt-3">
                    <label for="adminPassword" class="block mb-1 font-semibold">Admin Password</label>
                    <InputText id="adminPassword" v-model="adminPassword" type="password" class="w-full" />
                    <!-- Optionally show an error message here if you want -->
                </div>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteProjectDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteProject" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteProjectsDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
            <div class="flex flex-col gap-3">
                <div class="flex align-items-center gap-3">
                    <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                    <span>Are you sure you want to delete the selected projects?</span>
                </div>
                <div class="mt-3">
                    <label for="adminPasswordBulk" class="block mb-1 font-semibold">Admin Password</label>
                    <InputText id="adminPasswordBulk" v-model="adminPassword" type="password" class="w-full" />
                    <!-- Optionally show an error message here if you want -->
                </div>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteProjectsDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteSelectedProjects" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog v-model:visible="removeTeamDialog" :style="{ width: '450px' }" header="Confirm Team Removal" :modal="true" :closable="false">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span>
                    Are you sure you want to remove team <b>{{ teamToRemove.name }}</b> from this project?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="removeTeamDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="handleRemoveTeam(teamToRemove.id)" :loading="removingTeam" class="p-button-danger" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.project-page .p-dialog .p-dialog-content {
    padding: 1.5rem;
}

.field {
    margin-bottom: 1.5rem;
}

.p-error {
    display: block;
    margin-top: 0.5rem;
    color: #f44336;
    font-size: 0.875rem;
}

.error-message {
    background: #fff6f6;
    color: #d32f2f;
}

.p-calendar:disabled {
    opacity: 0.8;
    background-color: #f5f5f5;
}

.chip-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.progress-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.progress-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.progress-percentage {
    font-weight: 600;
    font-size: 0.875rem;
}

.progress-details {
    display: flex;
    gap: 0.25rem;
}

:deep(.p-progressbar) {
    height: 0.5rem;
}

:deep(.progress-complete) .p-progressbar-value {
    background: var(--green-500);
}

:deep(.progress-good) .p-progressbar-value {
    background: var(--blue-500);
}

:deep(.progress-warning) .p-progressbar-value {
    background: var(--orange-500);
}

:deep(.progress-low) .p-progressbar-value {
    background: var(--red-500);
}

:deep(.progress-complete) .p-progressbar-value {
    background: linear-gradient(90deg, #4CAF50, #45a049);  /* Green gradient */
}

:deep(.progress-high) .p-progressbar-value {
    background: linear-gradient(90deg, #2196F3, #1976D2);  /* Blue gradient */
}

:deep(.progress-medium) .p-progressbar-value {
    background: linear-gradient(90deg, #FF9800, #F57C00);  /* Orange gradient */
}

:deep(.progress-low) .p-progressbar-value {
    background: linear-gradient(90deg, #f44336, #d32f2f);  /* Red gradient */
}

:deep(.p-progressbar) {
    height: 0.5rem;
    background: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

:deep(.p-progressbar-value) {
    transition: width 0.3s ease-in-out;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

:deep(.p-tag) {
    font-size: 0.75rem;
}

.no-tasks-message,
.no-progress-message {
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.no-tasks-message {
  background-color: var(--surface-200);
  color: var(--text-color-secondary);
}

.no-progress-message {
  background-color: var(--yellow-50);
  color: var(--yellow-700);
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-counts {
  color: var(--text-color-secondary);
}
</style>