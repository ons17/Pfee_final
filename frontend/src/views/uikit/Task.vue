<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { GET_TACHES, GET_PROJECTS, CREATE_TACHE, UPDATE_TACHE, DELETE_TACHE } from '@/graphql';

const toast = useToast();
const dt = ref();
const tasks = ref([]);
const projects = ref([]);
const taskDialog = ref(false);
const deleteTaskDialog = ref(false);
const deleteTasksDialog = ref(false);
const task = ref({});
const selectedTasks = ref([]);
const submitted = ref(false);
const loading = ref(false);
const isEditMode = computed(() => !!task.value.idTache);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const statuses = ref([
    { label: 'TODO', value: 'TODO' },
    { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
    { label: 'END', value: 'END' }
]);

// Queries
const {
    result: tasksResult,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
} = useQuery(GET_TACHES, null, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
});

const {
    result: projectsResult,
    loading: projectsLoading,
    refetch: refetchProjects
} = useQuery(GET_PROJECTS, null, {
    fetchPolicy: 'cache-and-network'
});

// Mutations
const { mutate: createTask } = useMutation(CREATE_TACHE, {
    update(cache, { data: { createTache } }) {
        const existingData = cache.readQuery({ query: GET_TACHES });
        cache.writeQuery({
            query: GET_TACHES,
            data: {
                taches: [...(existingData?.taches || []), createTache]
            }
        });
    }
});

const { mutate: updateTask } = useMutation(UPDATE_TACHE, {
    onError: (error) => {
        console.error('Update Task Error:', error);
        console.error('Variables sent:', error.operation?.variables);
    },
    update(cache, { data: { updateTache } }) {
        cache.modify({
            id: cache.identify({ __typename: 'Tache', idTache: updateTache.idTache }),
            fields: {
                idProjet() {
                    return updateTache.idProjet;
                },
                titreTache() {
                    return updateTache.titreTache;
                },
                descriptionTache() {
                    return updateTache.descriptionTache;
                },
                statutTache() {
                    return updateTache.statutTache;
                },
                duration() {
                    return updateTache.duration;
                }
            }
        });
    }
});

const { mutate: deleteTaskMutation } = useMutation(DELETE_TACHE);

// Date handling functions
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
    task.value[field] = selectedDate;
};

const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
};

// Validation functions
const validateTitle = (title) => {
    if (!title) return 'Title is required';
    if (title.length < 2 || title.length > 50) return 'Title must be between 2 and 50 characters';
    return null;
};

const validateDescription = (description) => {
    if (description && (description.length < 10 || description.length > 500)) {
        return 'Description must be between 10 and 500 characters';
    }
    return null; // No error if the description is empty
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

const validateProject = (projectId) => {
    if (!projectId) return 'Project is required';
    return null;
};

// Enhanced date rules for task date handling
const dateRules = {
    canModifyDates(task, project) {
        // Can't modify dates for completed tasks
        if (task.statutTache === 'END') {
            return false;
        }

        // Can't modify dates if task has time entries
        if (task.suiviDeTemps?.length > 0) {
            return false;
        }

        // Can't modify dates if the project is completed
        if (project?.statut_projet === 'END') {
            return false;
        }

        // Can modify dates if:
        // 1. It's a new task
        // 2. Task is in TODO state with no time entries
        return !task.idTache || task.statutTache === 'TODO';
    },

    getDateRestrictionReason(task, project) {
        if (task.statutTache === 'END') {
            return 'Dates cannot be modified for completed tasks';
        }

        if (task.suiviDeTemps?.length > 0) {
            return 'Dates cannot be modified after time tracking has begun';
        }

        if (project?.statut_projet === 'END') {
            return 'Cannot modify dates in a completed project';
        }

        return null;
    }
};

// Enhanced date validation
const validateTaskDates = (task, project) => {
    if (!project) return 'Project is required to validate dates';
    if (!task.dateDebutTache) return 'Start date is required';
    if (!task.dateFinTache) return 'End date is required';

    const taskStart = new Date(task.dateDebutTache);
    const taskEnd = new Date(task.dateFinTache);
    const projectStart = new Date(project.date_debut_projet);
    const projectEnd = new Date(project.date_fin_projet);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For new tasks
    if (!task.idTache && taskStart < today) {
        return 'Start date cannot be in the past for new tasks';
    }

    // Task dates must be within project dates
    if (taskStart < projectStart) {
        return 'Task cannot start before the project start date';
    }

    if (taskEnd > projectEnd) {
        return 'Task cannot end after the project end date';
    }

    if (taskEnd < taskStart) {
        return 'End date must be after start date';
    }

    // If task has time entries, validate against them
    if (task.suiviDeTemps?.length > 0) {
        const hasTimeEntryConflict = task.suiviDeTemps.some(entry => {
            const entryDate = new Date(entry.date_suivi);
            return entryDate < taskStart || entryDate > taskEnd;
        });

        if (hasTimeEntryConflict) {
            return 'Task dates conflict with existing time entries';
        }
    }

    return null;
};

const validateForm = () => {
    const titleError = validateTitle(task.value.titreTache);
    const descriptionError = validateDescription(task.value.descriptionTache);
    const projectError = validateProject(task.value.idProjet);

    const selectedProject = projects.value.find((p) => p.idProjet === task.value.idProjet);
    const taskDateError = validateTaskDates(task.value, selectedProject);

    // Check if the project is ended
    const projectEndedError = selectedProject && selectedProject.statut_projet === 'END'
        ? 'Cannot add or update tasks in an ended project'
        : null;

    if (titleError) toast.add({ severity: 'error', summary: 'Error', detail: titleError, life: 3000 });
    if (descriptionError) toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
    if (projectError) toast.add({ severity: 'error', summary: 'Error', detail: projectError, life: 3000 });
    if (taskDateError) toast.add({ severity: 'error', summary: 'Error', detail: taskDateError, life: 3000 });
    if (projectEndedError) toast.add({ severity: 'error', summary: 'Error', detail: projectEndedError, life: 3000 });

    return !(titleError || descriptionError || projectError || taskDateError || projectEndedError);
};

// Watchers
watch(tasksResult, (newResult) => {
    if (newResult?.taches) {
        tasks.value = newResult.taches.map((t) => ({
            ...t,
            dateDebutTache: t.dateDebutTache ? new Date(t.dateDebutTache) : null,
            dateFinTache: t.dateFinTache ? new Date(t.dateFinTache) : null
        }));
    }
});

watch(projectsResult, (newResult) => {
    if (newResult?.projets) {
        projects.value = newResult.projets;
    }
});

watch(tasksError, (error) => {
    if (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load tasks',
            life: 3000
        });
    }
});

// Lifecycle
onMounted(async () => {
    try {
        await refetchTasks();
        await refetchProjects();
    } catch (error) {
        console.error('Error refetching data:', error);
    }
});

// Methods
const openNew = () => {
    task.value = {
        titreTache: '',
        descriptionTache: '',
        dateDebutTache: null,
        dateFinTache: null,
        statutTache: 'TODO',
        duration: 0,
        idProjet: null
    };
    submitted.value = false;
    taskDialog.value = true;
};

const editTask = (t) => {
    task.value = {
        ...t,
        idProjet: t.idProjet,
        // Store original dates that cannot be modified
        originalDateDebutTache: t.dateDebutTache,
        originalDateFinTache: t.dateFinTache
    };
    taskDialog.value = true;
};

const hideDialog = () => {
    taskDialog.value = false;
    submitted.value = false;
};

const saveTask = async () => {
    if (isEditMode.value) {
        // Call the update logic if editing an existing task
        await updateTaskDetails();
    } else {
        // Handle the creation of a new task
        submitted.value = true;
        if (!validateForm()) return;

        // Prevent duplicate task titles in the same project (case-insensitive)
        const duplicate = tasks.value.some(
            t =>
                t.titreTache.trim().toLowerCase() === task.value.titreTache.trim().toLowerCase() &&
                t.idProjet === task.value.idProjet
        );
        if (duplicate) {
            toast.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'A task with this title already exists in the selected project.',
                life: 4000
            });
            loading.value = false;
            return;
        }

        loading.value = true;

        try {
            const taskData = {
                titreTache: task.value.titreTache.trim(),
                descriptionTache: task.value.descriptionTache?.trim() || null, // Allow null or empty description
                dateDebutTache: formatDateForDB(task.value.dateDebutTache),
                dateFinTache: formatDateForDB(task.value.dateFinTache),
                statutTache: task.value.statutTache,
                duration: task.value.duration || 0,
                idProjet: task.value.idProjet
            };

            await createTask(taskData);
            await refetchTasks();

            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Task created successfully',
                life: 3000
            });

            await refetchTasks();
            taskDialog.value = false;
        } catch (error) {
            console.error('Error creating task:', error);
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to create task: ' + (error.graphQLErrors?.[0]?.message || error.message),
                life: 5000
            });
        } finally {
            loading.value = false;
        }
    }
};

const updateTaskDetails = async () => {
    submitted.value = true;

    // Prevent duplicate task titles in the same project (case-insensitive), excluding the current task
    const duplicate = tasks.value.some(
        t =>
            t.idTache !== task.value.idTache &&
            t.titreTache.trim().toLowerCase() === task.value.titreTache.trim().toLowerCase() &&
            t.idProjet === task.value.idProjet
    );
    if (duplicate) {
        toast.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'A task with this title already exists in the selected project.',
            life: 4000
        });
        loading.value = false;
        return;
    }

    // Validate the form before proceeding
    if (!validateForm()) return;

    loading.value = true;

    try {
        const taskData = {
            titreTache: task.value.titreTache.trim(),
            descriptionTache: task.value.descriptionTache?.trim() || null, // Allow null or empty description
            dateDebutTache: formatDateForDB(task.value.originalDateDebutTache), // Original start date
            dateFinTache: formatDateForDB(task.value.originalDateFinTache), // Original end date
            statutTache: task.value.statutTache,
            duration: task.value.duration || 0,
            idProjet: task.value.idProjet
        };

        await updateTask({
            id: task.value.idTache,
            ...taskData
        });

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Task updated successfully',
            life: 3000
        });

        await refetchTasks();
        taskDialog.value = false;
    } catch (error) {
        console.error('Error updating task:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update task: ' + (error.graphQLErrors?.[0]?.message || error.message),
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

const confirmDeleteTask = (t) => {
    task.value = t;
    deleteTaskDialog.value = true;
};

const deleteTask = async () => {
    try {
        const { data } = await deleteTaskMutation({ id: task.value.idTache });
        if (data?.deleteTache?.success || data?.deleteTache === true) {
            await refetchTasks();
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: data?.deleteTache?.message || 'Task deleted successfully',
                life: 3000
            });
        } else {
            throw new Error(data?.deleteTache?.message || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete task',
            life: 3000
        });
    } finally {
        deleteTaskDialog.value = false;
        task.value = {};
    }
};

const confirmDeleteSelected = () => {
    deleteTasksDialog.value = true;
};

const deleteSelectedTasks = async () => {
    try {
        const deletePromises = selectedTasks.value.map((t) => deleteTaskMutation({ id: t.idTache }));
        await Promise.all(deletePromises);
        await refetchTasks();
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Selected tasks deleted successfully',
            life: 3000
        });
    } catch (error) {
        console.error('Error deleting tasks:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete selected tasks',
            life: 3000
        });
    } finally {
        deleteTasksDialog.value = false;
        selectedTasks.value = [];
    }
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const getStatusLabel = (status) => {
    const statusSeverity = {
        TODO: 'warn',
        IN_PROGRESS: 'info',
        END: 'success'
    };
    return statusSeverity[status] || 'info';
};

// First, add this computed function in your Task.vue component
const getTaskProgress = (task) => {
    if (!task || !task.duration) return { trackedMinutes: 0, percentage: 0 };

    // Calculate total tracked seconds
    const trackedSeconds = task.suiviDeTemps?.reduce((total, suivi) => {
        return total + (parseInt(suivi.duree_suivi) || 0);
    }, 0) || 0;

    // Convert to minutes
    const trackedMinutes = Math.floor(trackedSeconds / 60);
    // Convert duration from hours to minutes
    const plannedMinutes = task.duration * 60;
    
    // Calculate percentage
    const percentage = plannedMinutes > 0 
        ? Math.min(100, Math.round((trackedMinutes / plannedMinutes) * 100))
        : 0;

    return {
        trackedMinutes,
        percentage
    };
};

// Helper function to format time
const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}.${mins.toString().padStart(2, '0')}`;
};

const getProgressClass = (percentage) => {
    if (percentage >= 100) return 'progress-complete';    // Green
    if (percentage >= 70) return 'progress-high';         // Blue
    if (percentage >= 30) return 'progress-medium';       // Orange
    return 'progress-low';                               // Red
};

// Add role detection
const admin = JSON.parse(localStorage.getItem('administrateur'));
const storedAdminPassword = localStorage.getItem('password') || '';

const employee = JSON.parse(localStorage.getItem('employee'));
const isAdmin = ref(!!admin);

const adminPassword = ref('');
const adminPasswordError = ref('');

// New variables for bulk delete password
const adminPasswordBulk = ref('');
const adminPasswordBulkError = ref('');

// New method for deleting task with password confirmation
const deleteTaskWithPassword = async () => {
    adminPasswordError.value = '';
    if (
        !adminPassword.value ||
        adminPassword.value.trim() !== storedAdminPassword.trim()
    ) {
        adminPasswordError.value = 'Incorrect admin password!';
        return;
    }
    await deleteTask();
    adminPassword.value = '';
};

// New method for deleting selected tasks with password confirmation
const deleteSelectedTasksWithPassword = async () => {
    adminPasswordBulkError.value = '';
    if (
        !adminPasswordBulk.value ||
        adminPasswordBulk.value.trim() !== storedAdminPassword.trim()
    ) {
        adminPasswordBulkError.value = 'Incorrect admin password!';
        return;
    }
    await deleteSelectedTasks();
    adminPasswordBulk.value = '';
};

// Store the password in localStorage (for demo purposes only, not secure!)
const password = ref('');
const savePassword = () => {
    localStorage.setItem('password', password.value);
};

// Update the Calendar components in the template to use the new date rules
</script>

<template>
    <div class="p-4 task-page">
        <div class="card">
            <div class="toolbar-flex mb-4">
                <div>
                    <!-- Admin-only buttons -->
                    <Button 
                        v-if="isAdmin"
                        label="New" 
                        icon="pi pi-plus" 
                        class="mr-2" 
                        @click="openNew" 
                    />
                    <Button 
                        v-if="isAdmin"
                        label="Delete" 
                        icon="pi pi-trash" 
                        severity="danger" 
                        @click="confirmDeleteSelected" 
                        :disabled="!selectedTasks?.length" 
                    />
                </div>
                <!-- Employee name badge -->
                <div v-if="employee" class="employee-center-badge">
                    <i class="pi pi-user mr-2"></i>
                    {{ employee.nomEmployee || employee.nom_employee || 'Employee' }}
                </div>
                <div>
                    <Button 
                        v-if="isAdmin"
                        label="Export" 
                        icon="pi pi-upload" 
                        @click="exportCSV" 
                    />
                </div>
            </div>

            <div v-if="tasksError" class="p-mt-3 p-p-3 p-text-center error-message">
                <i class="pi pi-exclamation-triangle p-mr-2"></i>
                Error loading tasks.
                <Button label="Retry" icon="pi pi-refresh" class="p-button-text p-ml-2" @click="refetchTasks" />
            </div>

            <DataTable
                ref="dt"
                v-model:selection="selectedTasks"
                :value="tasks"
                :loading="tasksLoading"
                dataKey="idTache"
                :paginator="true"
                :rows="5"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tasks"
            >
                <template #loading>
                    <div class="flex align-items-center">
                        <ProgressSpinner style="width: 30px; height: 30px" />
                        <span class="ml-2">Loading tasks...</span>
                    </div>
                </template>

                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">Manage Tasks</h4>
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="titreTache" header="Title" sortable></Column>
                <Column field="descriptionTache" header="Description" sortable></Column>
                <Column field="dateDebutTache" header="Start Date" sortable>
                    <template #body="{ data }">
                        {{ formatDBDate(data.dateDebutTache) }}
                    </template>
                </Column>
                <Column field="dateFinTache" header="End Date" sortable>
                    <template #body="{ data }">
                        {{ formatDBDate(data.dateFinTache) }}
                    </template>
                </Column>
                <Column field="statutTache" header="Status" sortable>
                    <template #body="{ data }">
                        <Tag :value="data.statutTache" :severity="getStatusLabel(data.statutTache)" />
                    </template>
                </Column>
                <Column field="duration" header="Duration (hours)" sortable></Column>
                <Column field="idProjet" header="Project" sortable>
                    <template #body="{ data }">
                        {{ projects.find((p) => p.idProjet === data.idProjet)?.nom_projet || 'N/A' }}
                    </template>
                </Column>
                <Column header="Progress" headerStyle="width: 250px">
                    <template #body="{ data }">
                        <div class="progress-wrapper">
                            <div v-if="!data.duration" class="no-duration-message">
                                <i class="pi pi-info-circle mr-2"></i>
                                No duration set
                            </div>
                            <div v-else-if="getTaskProgress(data).percentage === 0" class="no-progress-message">
                                <i class="pi pi-clock mr-2"></i>
                                No time tracked
                            </div>
                            <div v-else class="progress-container">
                                <ProgressBar 
                                    :value="getTaskProgress(data).percentage"
                                    :class="getProgressClass(getTaskProgress(data).percentage)"
                                />
                                <div class="progress-stats">
                                    <span class="progress-percentage">{{ getTaskProgress(data).percentage }}%</span>
                                    <div class="time-tracked">
                                        <small>{{ formatTime(getTaskProgress(data).trackedMinutes) }}/{{ data.duration }}h</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Column>
                <!-- Hide Actions column for non-admin users -->
                <Column v-if="isAdmin" header="Actions" headerStyle="width: 10rem">
                    <template #body="{ data }">
                        <Button icon="pi pi-pencil" class="mr-2" outlined @click="editTask(data)" />
                        <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteTask(data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="taskDialog" :style="{ width: '700px' }" header="Task Details" :modal="true" :closable="false">
            <div class="flex flex-col gap-4">
                <div class="field">
                    <label for="titreTache" class="font-bold block mb-2">Title </label>
                    <InputText id="titreTache" v-model.trim="task.titreTache" required autofocus :class="{ 'p-invalid': submitted && !task.titreTache }" class="w-full" />
                    <small v-if="submitted && !task.titreTache" class="p-error">Title is required.</small>
                </div>

                <div class="field">
                    <label for="descriptionTache" class="font-bold block mb-2">Description</label>
                    <Textarea
                        id="descriptionTache"
                        v-model.trim="task.descriptionTache"
                        rows="3"
                        class="w-full"
                        :class="{ 'p-invalid': submitted && validateDescription(task.descriptionTache) }"
                    />
                    <small v-if="submitted && validateDescription(task.descriptionTache)" class="p-error">
                        {{ validateDescription(task.descriptionTache) }}
                    </small>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="field">
                        <label for="dateDebutTache" class="font-bold block mb-2">
                            Start Date
                            <InfoTooltip v-if="isEditMode && !dateRules.canModifyDates(task, selectedProject)" 
                                        text="Date cannot be modified after time entries are added or task is started" />
                        </label>
                        <Calendar 
                            id="dateDebutTache" 
                            v-model="task.dateDebutTache" 
                            :showIcon="true" 
                            dateFormat="dd/mm/yy"
                            :minDate="new Date()"
                            :disabled="isEditMode && !dateRules.canModifyDates(task, selectedProject)"
                            :class="{ 'p-invalid': submitted && validateTaskDates(task, selectedProject) }"
                            class="w-full"
                        >
                            <template #footer>
                                <div class="calendar-footer">
                                    <small class="text-gray-500">
                                        {{ dateRules.getDateRestrictionReason(task, selectedProject) || 'Select start date' }}
                                    </small>
                                </div>
                            </template>
                        </Calendar>
                        <div class="field-feedback">
                            <small v-if="submitted && !task.dateDebutTache" class="p-error">
                                Start date is required
                            </small>
                            <small v-else-if="dateError" class="p-error">
                                {{ dateError }}
                            </small>
                        </div>
                    </div>

                    <div class="field">
                        <label for="dateFinTache" class="font-bold block mb-2">
                            End Date
                            <InfoTooltip v-if="isEditMode && !dateRules.canModifyDates(task, selectedProject)"
                                        text="Date cannot be modified after time entries are added or task is started" />
                        </label>
                        <Calendar
                            id="dateFinTache"
                            v-model="task.dateFinTache"
                            :showIcon="true"
                            dateFormat="dd/mm/yy"
                            :minDate="task.dateDebutTache || new Date()"
                            :disabled="isEditMode && !dateRules.canModifyDates(task, selectedProject) || !task.dateDebutTache"
                            :class="{ 'p-invalid': submitted && !task.dateFinTache }"
                            class="w-full"
                        >
                            <template #footer>
                                <div class="calendar-footer">
                                    <small class="text-gray-500">
                                        {{ !task.dateDebutTache 
                                            ? 'Set start date first'
                                            : dateRules.canModifyDates(task, selectedProject)
                                                ? 'Select end date'
                                                : 'Date locked - Task in progress' }}
                                    </small>
                                </div>
                            </template>
                        </Calendar>
                        <div class="field-feedback">
                            <small v-if="submitted && !task.dateFinTache" class="p-error">
                                End date is required
                            </small>
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label for="statutTache" class="font-bold block mb-2">Status</label>
                    <Dropdown
                        id="statutTache"
                        v-model="task.statutTache"
                        :options="statuses"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select a Status"
                        class="w-full"
                        
                    />
                </div>

                <div class="field">
                    <label for="duration" class="font-bold block mb-2">Duration (hours)</label>
                    <InputNumber id="duration" v-model="task.duration" mode="decimal" :min="0" class="w-full" />
                </div>

                <div class="field">
                    <label for="idProjet" class="font-bold block mb-2">Project </label>
                    <Dropdown
                        id="idProjet"
                        v-model="task.idProjet"
                        :options="projects"
                        optionLabel="nom_projet"
                        optionValue="idProjet"
                        placeholder="Select a Project"
                        class="w-full"
                        :loading="projectsLoading"
                        :class="{ 'p-invalid': submitted && !task.idProjet }"
                        :disabled="projects.find((p) => p.idProjet === task.idProjet)?.statut_projet === 'END'"
                    />
                    <small v-if="submitted && !task.idProjet" class="p-error">Project is required.</small>
                    <small v-if="projects.find((p) => p.idProjet === task.idProjet)?.statut_projet === 'END'" class="p-error">
                        Cannot add tasks to an ended project.
                    </small>
                </div>

                <!-- Status transition warning -->
                <div v-if="isEditMode && task.statutTache !== originalStatus" class="status-change-warning">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span>Changing status from {{ originalStatus }} to {{ task.statutTache }}</span>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    @click="saveTask"
                    :loading="loading"
                    :disabled="loading"
                    autofocus
                />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteTaskDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span v-if="task">
                    Are you sure you want to delete task <b>{{ task.titreTache }}</b>?
                </span>
            </div>
            <div class="mt-3">
                <label for="admin-password" class="block mb-1 font-semibold">Admin Password</label>
                <InputText id="admin-password" v-model="adminPassword" type="password" class="w-full" />
                <small v-if="adminPasswordError" class="p-error">{{ adminPasswordError }}</small>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteTaskDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteTaskWithPassword" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteTasksDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span>Are you sure you want to delete the selected tasks?</span>
            </div>
            <div class="mt-3">
                <label for="admin-password-bulk" class="block mb-1 font-semibold">Admin Password</label>
                <InputText id="admin-password-bulk" v-model="adminPasswordBulk" type="password" class="w-full" />
                <small v-if="adminPasswordBulkError" class="p-error">{{ adminPasswordBulkError }}</small>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteTasksDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteSelectedTasksWithPassword" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.task-page .p-dialog .p-dialog-content {
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

.progress-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.progress-container {
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

.time-tracked {
    color: var(--text-color-secondary);
}

.no-duration-message,
.no-progress-message {
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
}

.no-duration-message {
    background-color: var(--surface-200);
    color: var(--text-color-secondary);
}

.no-progress-message {
    background-color: var(--yellow-50);
    color: var(--yellow-700);
}

:deep(.p-progressbar) {
    height: 0.5rem;
    background: var(--surface-200);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

:deep(.p-progressbar-value) {
    transition: width 0.3s ease-in-out;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
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

.toolbar-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
}

.employee-center-badge {
    background: linear-gradient(45deg, #9fd0c0 0%, #c5e0d8 100%);
    box-shadow: 0 2px 4px rgba(44, 81, 74, 0.1);
    transition: all 0.3s ease;
    padding: 0.8em 1.2em;
    border-radius: 8px;
    color: #2c514a;
    font-weight: 600;
}

.employee-center-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(44, 81, 74, 0.2);
}

.status-change-warning {
    padding: 0.75rem;
    border-radius: 6px;
    background-color: #fff3cd;
    color: #856404;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.calendar-footer {
    padding: 0.5rem;
    border-top: 1px solid var(--surface-200);
    font-size: 0.875rem;
}

.date-locked {
    background-color: var(--surface-100);
    cursor: not-allowed;
}

.date-warning {
    color: var(--yellow-700);
    background-color: var(--yellow-50);
    padding: 0.5rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>