<script setup>
import { ref, computed, nextTick } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import OverlayPanel from 'primevue/overlaypanel';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import gql from 'graphql-tag';

// --- GraphQL Query for Alerts (add status, priority for demo) ---
const ALERTS_QUERY = gql`
  query {
    alerts {
      idAlert
      message_alert
      date_creer_alert
      alert_type
      employee {
        idEmployee
        nomEmployee
        emailEmployee
        role
      }
    }
  }
`;

const { result, loading, refetch } = useQuery(ALERTS_QUERY);

const toast = useToast();
const search = ref('');
const selectedAlert = ref(null);
const showDetails = ref(false);

function openDetails(alert) {
  selectedAlert.value = alert;
  showDetails.value = true;
}

const selectedType = ref(null);
const selectedEmployee = ref(null);
const dateFilter = ref('');
const alertTypes = [
  { label: 'All', value: null },
  { label: 'Complete', value: 'complete' },
  { label: 'Incomplete', value: 'incomplete' },
  { label: 'Overtime', value: 'overtime' }
];




// --- Compute unique employees for filter dropdown ---
const employees = computed(() => {
  const all = result.value?.alerts?.map(a => a.employee).filter(Boolean) || [];
  const unique = [];
  const seen = new Set();
  for (const emp of all) {
    if (!seen.has(emp.idEmployee)) {
      unique.push(emp);
      seen.add(emp.idEmployee);
    }
  }
  return unique;
});

// --- Filtered alerts ---
const filteredAlerts = computed(() => {
  let alerts = result.value?.alerts || [];
  if (selectedType.value) alerts = alerts.filter(a => a.alert_type === selectedType.value);
  if (selectedEmployee.value) alerts = alerts.filter(a => a.employee?.idEmployee === selectedEmployee.value);
  if (dateFilter.value) {
    alerts = alerts.filter(a => {
      const dateStr = new Date(Number(a.date_creer_alert)).toISOString().slice(0, 10);
      return dateStr === dateFilter.value;
    });
  }
  if (search.value) {
    const s = search.value.toLowerCase();
    alerts = alerts.filter(a =>
      a.message_alert.toLowerCase().includes(s) ||
      a.employee?.nomEmployee?.toLowerCase().includes(s) ||
      a.employee?.emailEmployee?.toLowerCase().includes(s)
    );
  }
  return alerts;
});

// --- Stats ---
const stats = computed(() => {
  const alerts = result.value?.alerts || [];
  return {
    total: alerts.length,
    complete: alerts.filter(a => a.alert_type === 'complete').length,
    incomplete: alerts.filter(a => a.alert_type === 'incomplete').length,
    overtime: alerts.filter(a => a.alert_type === 'overtime').length,
    today: alerts.filter(a => a.date_creer_alert.startsWith(new Date().toISOString().slice(0, 10))).length
  };
});

// --- Export CSV ---
function exportCSV() {
  const rows = filteredAlerts.value.map(a => ({
    Date: a.date_creer_alert
      ? new Date(Number(a.date_creer_alert)).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      : '—',
    Type: a.alert_type,
    Employee: a.employee?.nomEmployee,
    Email: a.employee?.emailEmployee,
    Message: a.message_alert
  }));
  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'alerts.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast.add({ severity: 'info', summary: 'Exported', detail: 'CSV downloaded', life: 2000 });
}

// --- Timeline view ---
const showTimeline = ref(false);

// --- Employee popover ---
const op = ref(null);

function showEmployeePopover(alert, event) {
  selectedAlert.value = alert;
  nextTick(() => {
    if (op.value) op.value.toggle(event);
  });
}

// --- AI Assistant/Chatbot (stub, ready for real API) ---
const aiDialog = ref(false);
const aiInput = ref('');
const aiResponse = ref('');
async function askAI() {
  aiResponse.value = 'Analyzing...';
  await new Promise(r => setTimeout(r, 700));
  const input = aiInput.value.toLowerCase();
  if (input.includes('incomplete')) {
    aiResponse.value = `There are ${stats.value.incomplete} incomplete alerts today.`;
  } else if (input.includes('overtime')) {
    aiResponse.value = `There are ${stats.value.overtime} overtime alerts today.`;
  } else if (input.includes('summary')) {
    aiResponse.value = `Summary: ${stats.value.complete} complete, ${stats.value.incomplete} incomplete, ${stats.value.overtime} overtime alerts today.`;
  } else {
    aiResponse.value = `Total alerts: ${stats.value.total}.`;
  }
}

// --- Copy Alert Message ---
function copyAlertMessage(alert) {
  navigator.clipboard.writeText(alert.message_alert);
  toast.add({ severity: 'success', summary: 'Copied', detail: 'Alert message copied', life: 1500 });
}

// --- Top Employees Computation ---
const topEmployees = computed(() => {
  const counts = {};
  (result.value?.alerts || []).forEach(a => {
    if (a.employee) {
      counts[a.employee.idEmployee] = counts[a.employee.idEmployee] || { ...a.employee, count: 0 };
      counts[a.employee.idEmployee].count++;
    }
  });
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
});
</script>

<template>
  <Toast />
  <div class="notifications-admin-page">
    <!-- Header & Stats -->
    <div class="header flex items-center justify-between mb-6">
      <div>
        <h2 class="font-bold text-2xl mb-1">Employee Alerts</h2>
        <p class="text-muted">All notifications and alerts generated for employees. <span class="ml-2">Today: <b>{{ stats.today }}</b></span></p>
      </div>
      <div class="flex gap-2 items-center">
        <Button icon="pi pi-refresh" class="p-button-sm" @click="refetch()" />
        <Button icon="pi pi-comments" class="p-button-sm p-button-secondary" @click="aiDialog = true" label="AI Assistant" />
        <Button icon="pi pi-download" class="p-button-sm p-button-info" @click="exportCSV" label="Export CSV" />
        <Button icon="pi pi-clock" class="p-button-sm p-button-help" @click="showTimeline = !showTimeline" :label="showTimeline ? 'Table' : 'Timeline'" />
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-cards flex gap-4 mb-6">
      <div class="stat-card">
        <div class="stat-label">Total</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card complete">
        <div class="stat-label">Complete</div>
        <div class="stat-value">{{ stats.complete }}</div>
      </div>
      <div class="stat-card incomplete">
        <div class="stat-label">Incomplete</div>
        <div class="stat-value">{{ stats.incomplete }}</div>
      </div>
      <div class="stat-card overtime">
        <div class="stat-label">Overtime</div>
        <div class="stat-value">{{ stats.overtime }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters flex gap-3 mb-4 items-end">
      <Dropdown v-model="selectedType" :options="alertTypes" optionLabel="label" optionValue="value" placeholder="Alert Type" class="w-44" />
      <Dropdown v-model="selectedEmployee" :options="employees" optionLabel="nomEmployee" optionValue="idEmployee" placeholder="Employee" class="w-44" />
      <InputText v-model="dateFilter" type="date" class="w-44" />
      <InputText v-model="search" placeholder="Search alerts or employees..." class="w-72" />
    </div>

    <!-- Timeline View -->
    <div v-if="showTimeline" class="timeline-view mb-6">
      <div v-for="a in filteredAlerts" :key="a.idAlert" class="timeline-item">
        <div class="timeline-dot" :class="a.alert_type"></div>
        <div class="timeline-content">
          <div class="flex items-center gap-2">
            <Tag :value="a.alert_type" :severity="{
              complete: 'success',
              incomplete: 'warn',
              overtime: 'danger'
            }[a.alert_type] || 'info'" />
            <span class="text-xs text-muted">
  {{
    a.date_creer_alert
      ? new Date(Number(a.date_creer_alert)).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      : '—'
  }}
</span>
          </div>
          <div class="timeline-message mt-2">{{ a.message_alert }}</div>
          <div class="flex items-center gap-2 mt-2">
            <Avatar :label="a.employee?.nomEmployee?.split(' ').map(n => n[0]).join('')" shape="circle" size="small" />
            <span class="font-semibold">{{ a.employee?.nomEmployee }}</span>
            <Button icon="pi pi-eye" class="p-button-text p-button-sm" @click="openDetails(a)" />
          </div>
        </div>
      </div>
      <OverlayPanel ref="op">
        <div v-if="selectedAlert?.employee">
          <div class="font-bold">{{ selectedAlert.employee.nomEmployee }}</div>
          <div class="text-xs">{{ selectedAlert.employee.emailEmployee }}</div>
          <div class="text-xs">{{ selectedAlert.employee.role }}</div>
        </div>
      </OverlayPanel>
    </div>

    <!-- DataTable View -->
    <DataTable
      v-else
      :value="filteredAlerts"
      :loading="loading"
      paginator
      :rows="10"
      responsiveLayout="scroll"
      class="p-datatable-striped"
      emptyMessage="No alerts found."
    >
      <Column field="date_creer_alert" header="Date" :sortable="true">
        <template #body="{ data }">
          <span>
  {{
    data.date_creer_alert
      ? new Date(Number(data.date_creer_alert)).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      : '—'
  }}
</span>
        </template>
      </Column>
      <Column header="Type">
        <template #body="{ data }">
          <Tag :value="data.alert_type" :severity="{
            complete: 'success',
            incomplete: 'warn',
            overtime: 'danger'
          }[data.alert_type] || 'info'" />
        </template>
      </Column>
      
      <Column header="Employee">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <Avatar
              v-if="data.employee"
              :label="data.employee.nomEmployee?.split(' ').map(n => n[0]).join('')"
              shape="circle"
              size="small"
            />
            <div>
              <div class="font-semibold">{{ data.employee?.nomEmployee || '—' }}</div>
              <div class="text-xs text-muted">{{ data.employee?.emailEmployee || '—' }}</div>
            </div>
          </div>
        </template>
      </Column>
      <Column field="message_alert" header="Message" :sortable="true">
        <template #body="{ data }">
          <span class="truncate" style="max-width: 320px; display: inline-block;">{{ data.message_alert }}</span>
        </template>
      </Column>
      <Column header="Actions" style="width: 120px;">
        <template #body="{ data }">
          <Button icon="pi pi-eye" class="p-button-text p-button-sm mr-2" @click="openDetails(data)" />
        </template>
      </Column>
    </DataTable>

    <!-- Alert Details Dialog -->
    <Dialog v-model:visible="showDetails" header="Alert Details" modal :closable="true" class="alert-details-dialog">
      <div v-if="selectedAlert">
        <div class="mb-3 flex items-center gap-2">
          <i class="pi pi-calendar text-primary"></i>
          <b>Date:</b>
          <span>
            {{
              selectedAlert.date_creer_alert
                ? new Date(Number(selectedAlert.date_creer_alert)).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                : '—'
            }}
          </span>
        </div>
        <div class="mb-3 flex items-center gap-2">
          <i class="pi pi-user text-primary"></i>
          <b>Employee:</b>
          <span v-if="selectedAlert.employee">
            {{ selectedAlert.employee.nomEmployee }} ({{ selectedAlert.employee.emailEmployee }})
          </span>
          <span v-else>—</span>
        </div>
        <div class="mb-3 flex items-center gap-2">
          <i class="pi pi-bell text-primary"></i>
          <b>Type:</b>
          <Tag :value="selectedAlert.alert_type" :severity="{
            complete: 'success',
            incomplete: 'warn',
            overtime: 'danger'
          }[selectedAlert.alert_type] || 'info'" />
        </div>
        
        <div class="mb-3 flex items-center gap-2">
          <i class="pi pi-align-left text-primary"></i>
          <b>Message:</b>
          <div class="mt-1 bg-gray-50 p-2 rounded">{{ selectedAlert.message_alert }}</div>
        </div>
      </div>
    </Dialog>

    <!-- AI Assistant Dialog -->
    <Dialog v-model:visible="aiDialog" header="AI Assistant" modal :closable="true" class="ai-dialog">
      <div>
        <div class="mb-3">Ask for a summary or explanation about alerts:</div>
        <InputText v-model="aiInput" class="w-full mb-2" placeholder="e.g. Why so many incomplete alerts today?" />
        <div class="mb-2 flex gap-2">
          <Button label="Summary" class="p-button-sm" @click="aiInput = 'summary'; askAI()" />
          <Button label="Incomplete" class="p-button-sm" @click="aiInput = 'incomplete'; askAI()" />
          <Button label="Overtime" class="p-button-sm" @click="aiInput = 'overtime'; askAI()" />
        </div>
        <Button label="Ask" icon="pi pi-send" class="p-button-sm" @click="askAI" />
        <div v-if="aiResponse" class="mt-3 p-2 bg-gray-50 rounded text-sm">{{ aiResponse }}</div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.notifications-admin-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
.text-muted {
  color: #64748b;
}
.stats-cards {
  display: flex;
  gap: 1.5rem;
}
.stat-card {
  background: #f9fafb;
  border-radius: 10px;
  padding: 1.2rem 2rem;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.stat-card.complete { border-left: 6px solid #22c55e; }
.stat-card.incomplete { border-left: 6px solid #f59e0b; }
.stat-card.overtime { border-left: 6px solid #ef4444; }
.stat-label { color: #64748b; font-size: 1rem; }
.stat-value { font-size: 2rem; font-weight: 700; color: #1e293b; }
.filters { gap: 1rem; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alert-details-dialog .p-dialog-content { background: #f9fafb; border-radius: 1rem; padding: 2rem 1.5rem; }
.ai-dialog .p-dialog-content { background: #f9fafb; border-radius: 1rem; padding: 2rem 1.5rem; }
.timeline-view {
  border-left: 4px solid #e5e7eb;
  margin-bottom: 2rem;
}
.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}
.timeline-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e5e7eb;
  margin-top: 0.5rem;
}
.timeline-dot.complete { background: #22c55e; }
.timeline-dot.incomplete { background: #f59e0b; }
.timeline-dot.overtime { background: #ef4444; }
.timeline-content {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 1rem 1.5rem;
}
.timeline-message {
  font-size: 1.08rem;
  color: #1e293b;
}
</style>