<template>
  <div class="time-entries card">
    <div class="time-entries__toolbar">
      <label class="time-entries__date">
        <input type="date" v-model="modelDate" />
      </label>
      <div class="time-entries__total">
        Всього: <span class="mono">{{ formatMs(totalMs) }}</span>
      </div>
    </div>

    <div v-if="entries.length" class="time-entries__list">
      <div v-for="entry in entries" :key="entry.logId" class="time-entry">
        <div class="time-entry__header">
          <div class="time-entry__title">
            {{ entry.taskTitle || 'Без назви' }}
          </div>
          <div class="time-entry__meta">
            <span v-if="entry.project">{{ entry.project }}</span>
            <span v-if="entry.type">{{ entry.type }}</span>
          </div>
          <div class="time-entry__actions">
            <button
              class="btn"
              v-if="editingId === entry.logId"
              @click="saveEntry(entry)"
            >
              Зберегти
            </button>
            <button
              class="btn"
              v-else
              @click="startEdit(entry)"
            >
              Редагувати
            </button>
            <button
              class="btn ghost"
              v-if="editingId === entry.logId"
              @click="cancelEdit"
            >
              Скасувати
            </button>
            <button
              class="btn red"
              @click="removeEntry(entry)"
            >
              Видалити
            </button>
          </div>
        </div>

        <div class="time-entry__body">
          <div class="time-entry__field">
            <span class="label">Початок</span>
            <template v-if="editingId === entry.logId">
              <input type="datetime-local" v-model="draft.start" step="60" />
            </template>
            <template v-else>
              <span class="mono">{{ formatDateTime(entry.start) }}</span>
            </template>
          </div>
          <div class="time-entry__field">
            <span class="label">Завершення</span>
            <template v-if="editingId === entry.logId">
              <input type="datetime-local" v-model="draft.end" step="60" />
            </template>
            <template v-else>
              <span class="mono">{{ formatDateTime(entry.end) }}</span>
            </template>
          </div>
          <div class="time-entry__field">
            <span class="label">Тривалість</span>
            <span class="mono">{{ formatMs(entry.ms) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty">Немає записів часу для цієї дати.</div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { formatMs } from '../helpers';

const props = defineProps({
  entries: { type: Array, default: () => [] },
  dateStr: { type: String, default: '' },
  totalMs: { type: Number, default: 0 },
});

const emit = defineEmits(['update-date', 'update-entry', 'remove-entry']);

const editingId = ref(null);
const draft = reactive({ start: '', end: '' });

const modelDate = computed({
  get: () => props.dateStr,
  set: (value) => emit('update-date', value),
});

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
});
const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
});

function formatDateTime(ts) {
  const d = new Date(ts);
  return `${dateFormatter.format(d)} ${timeFormatter.format(d)}`;
}

function toLocalInput(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalInput(value) {
  if (!value) return Number.NaN;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return Number.NaN;
  const [year, month, day] = datePart.split('-').map((part) => Number(part));
  const [hour, minute] = timePart.split(':').map((part) => Number(part));
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return Number.NaN;
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  return result.getTime();
}

function startEdit(entry) {
  editingId.value = entry.logId;
  draft.start = toLocalInput(entry.start);
  draft.end = toLocalInput(entry.end);
}

function cancelEdit() {
  editingId.value = null;
  draft.start = '';
  draft.end = '';
}

function saveEntry(entry) {
  const startTs = parseLocalInput(draft.start);
  const endTs = parseLocalInput(draft.end);
  if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
    alert('Невірний формат дати або часу.');
    return;
  }
  if (endTs <= startTs) {
    alert('Час завершення має бути пізнішим за час початку.');
    return;
  }
  emit('update-entry', {
    taskId: entry.taskId,
    logId: entry.logId,
    start: startTs,
    end: endTs,
  });
  cancelEdit();
}

function removeEntry(entry) {
  emit('remove-entry', { taskId: entry.taskId, logId: entry.logId });
}

watch(
  () => props.entries,
  (entries) => {
    if (!editingId.value) return;
    const current = entries.find((item) => item.logId === editingId.value);
    if (!current) {
      cancelEdit();
      return;
    }
    draft.start = toLocalInput(current.start);
    draft.end = toLocalInput(current.end);
  },
);
</script>

<style scoped>
.time-entries{padding:16px 18px;display:flex;flex-direction:column;gap:18px;}
.time-entries__toolbar{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;}
.time-entries__date{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--sub);}
.time-entries__date input{min-width:200px;}
.time-entries__total{font-weight:600;color:var(--text);}

.time-entries__list{display:flex;flex-direction:column;gap:16px;}
.time-entry{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:#111216;display:flex;flex-direction:column;gap:12px;}
.time-entry__header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;}
.time-entry__title{font-weight:600;}
.time-entry__meta{display:flex;gap:8px;color:var(--sub);font-size:13px;}
.time-entry__actions{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto;}

.time-entry__body{display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;align-items:center;}
.time-entry__field{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--sub);}
.time-entry__field input{width:100%;}
.label{font-size:12px;color:var(--sub);}

@media (max-width:700px){
  .time-entry__actions{width:100%;justify-content:flex-start;}
  .time-entry__body{grid-template-columns:1fr;}
}
</style>
