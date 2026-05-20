<template>
  <div class="time-entries card">
    <div class="time-entries__toolbar">
      <div class="time-entries__total">
        Всього: <span class="mono">{{ formatMs(totalMs) }}</span>
        <span v-if="showEarnings" class="time-entries__money mono">
          {{ formatUsd(earnedForMs(totalMs, hourlyRate)) }}
        </span>
      </div>
      <div class="time-entries__date">
        <button
          type="button"
          class="date-stepper__arrow"
          @click="shiftDate(-1)"
          aria-label="Попередній день"
          title="Попередній день"
        >
          <Icon name="chevron-left" size="16" weight="bold" />
        </button>
        <input type="date" v-model="modelDate" aria-label="Оберіть дату" />
        <button
          type="button"
          class="date-stepper__arrow"
          @click="shiftDate(1)"
          aria-label="Наступний день"
          title="Наступний день"
        >
          <Icon name="chevron-right" size="16" weight="bold" />
        </button>
      </div>
    </div>

    <div v-if="entries.length" class="time-entries__list">
      <div
        v-for="entry in reversedEntries"
        :key="entry.logId"
        :ref="(el) => registerEntryEl(entry.logId, el)"
        :class="[
          'time-entry',
          {
            'is-highlighted': highlightLogId === entry.logId,
            'is-editing': editingId === entry.logId,
          },
        ]"
      >
        <div class="time-entry__header">
          <div class="time-entry__info">
            <div class="time-entry__title">
              {{ entry.taskTitle || 'Без назви' }}
            </div>
            <div class="time-entry__meta" v-if="entry.project || entry.type">
              <div class="meta-item" v-if="entry.project">
                <span class="meta-label">Проєкт</span>
                <span class="meta-value">{{ entry.project }}</span>
              </div>
              <div class="meta-item" v-if="entry.type">
                <span class="meta-label">Тип проєкту</span>
                <span class="meta-value">{{ entry.type }}</span>
              </div>
            </div>
          </div>
          <div class="time-entry__actions controls">
            <button
              v-for="item in menuItemsForEntry(entry)"
              :key="item.label"
              class="controls-menu__item"
              :class="{ 'controls-menu__item--danger': item.danger }"
              type="button"
              @click="item.action"
            >
              <Icon :name="item.icon" size="18" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>

        <div class="time-entry__body">
          <div class="time-entry__field">
            <span class="label">Початок</span>
            <template v-if="editingId === entry.logId">
              <input type="datetime-local" v-model="draftStartInput" step="60" />
            </template>
            <template v-else>
              <span class="mono">{{ formatDateTime(entry.start) }}</span>
            </template>
          </div>
          <div class="time-entry__field">
            <span class="label">Завершення</span>
            <template v-if="editingId === entry.logId">
              <input type="datetime-local" v-model="draftEndInput" step="60" />
            </template>
            <template v-else>
              <span class="mono">{{ formatDateTime(entry.end) }}</span>
            </template>
          </div>
          <div class="time-entry__field">
            <span class="label">Тривалість</span>
            <span class="mono">{{
              editingId === entry.logId
                ? formatMs(adjustedDraftMs)
                : formatMs(entryAdjustedMs(entry))
            }}</span>
          </div>
          <div v-if="showEarnings" class="time-entry__field">
            <span class="label">Зароблено</span>
            <span class="mono time-entry__money">{{
              editingId === entry.logId
                ? formatUsd(earnedForMs(adjustedDraftMs, hourlyRate))
                : formatUsd(earnedForMs(entryAdjustedMs(entry), hourlyRate))
            }}</span>
          </div>
        </div>

        <div v-if="editingId === entry.logId" class="time-entry__footer">
          <div class="time-entry__footer-head">
            <div class="time-entry__footer-times">
              <span class="time-entry__footer-time mono">{{ formatTime(draft.start) }}</span>
              <span class="time-entry__footer-dash">—</span>
              <span class="time-entry__footer-time mono">{{ formatTime(draft.end) }}</span>
              <span class="time-entry__footer-duration mono">{{ formatMs(draftRawMs) }}</span>
            </div>
          </div>
          <TimeRangeSlider
            :min="sliderMin"
            :max="sliderMax"
            :from="draft.start"
            :to="draft.end"
            :occupied="otherEntriesForSlider"
            @update:from="(v) => (draft.start = v)"
            @update:to="(v) => (draft.end = v)"
          />
        </div>
      </div>
    </div>
    <div v-else class="empty">Немає записів часу для цієї дати.</div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { adjustedLogMs, earnedForMs, formatMs, formatUsd, shouldShowEarnings, toInputDate } from '../helpers';
import TimeRangeSlider from './TimeRangeSlider.vue';
import Icon from './Icon.vue';

const props = defineProps({
  entries: { type: Array, default: () => [] },
  dateStr: { type: String, default: '' },
  totalMs: { type: Number, default: 0 },
  timeCoefficient: { type: Number, default: 1 },
  timeCoefficientAppliesToAll: { type: Boolean, default: false },
  hourlyRate: { type: Number, default: 0 },
  highlightLogId: { type: String, default: '' },
});

const emit = defineEmits(['update-date', 'update-entry', 'remove-entry']);

const editingId = ref(null);
const draft = reactive({ start: 0, end: 0 });
const entryEls = new Map();

function shiftDate(delta) {
  const base = props.dateStr ? new Date(`${props.dateStr}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return;
  base.setDate(base.getDate() + delta);
  emit('update-date', toInputDate(base));
}

function menuItemsForEntry(entry) {
  const items = [];
  if (editingId.value === entry.logId) {
    items.push({ icon: 'save', label: 'Зберегти', action: () => saveEntry(entry) });
    items.push({ icon: 'cancel', label: 'Скасувати', action: () => cancelEdit() });
  } else {
    items.push({ icon: 'edit', label: 'Редагувати', action: () => startEdit(entry) });
    items.push({ icon: 'trash', label: 'Видалити', danger: true, action: () => removeEntry(entry) });
  }
  return items;
}

function registerEntryEl(logId, el) {
  if (el) {
    entryEls.set(logId, el);
  } else {
    entryEls.delete(logId);
  }
}

watch(
  () => props.highlightLogId,
  async (logId) => {
    if (!logId) return;
    await nextTick();
    const el = entryEls.get(logId);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
  { immediate: true }
);

const modelDate = computed({
  get: () => props.dateStr,
  set: (value) => emit('update-date', value),
});

watch(
  () => props.dateStr,
  (value) => {
    if (!value) {
      emit('update-date', toInputDate(new Date()));
    }
  },
  { immediate: true }
);

const reversedEntries = computed(() => [...props.entries].reverse());
const showEarnings = computed(() => shouldShowEarnings(props.hourlyRate));

const editingEntry = computed(() =>
  editingId.value ? props.entries.find((e) => e.logId === editingId.value) || null : null,
);

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

function formatTime(ts) {
  return timeFormatter.format(new Date(ts));
}

function entryAdjustedMs(entry) {
  return adjustedLogMs(entry, {
    coefficient: props.timeCoefficient,
    applyToAll: props.timeCoefficientAppliesToAll,
  });
}

const draftRawMs = computed(() => Math.max(draft.end - draft.start, 0));

const adjustedDraftMs = computed(() => {
  if (!editingEntry.value) return 0;
  return adjustedLogMs(
    { ...editingEntry.value, start: draft.start, end: draft.end },
    {
      coefficient: props.timeCoefficient,
      applyToAll: props.timeCoefficientAppliesToAll,
    },
  );
});

function dayBoundsOf(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();
  return { start, end };
}

const sliderMin = computed(() => {
  const day = dayBoundsOf(props.dateStr);
  const candidates = [];
  if (day) candidates.push(day.start);
  if (editingEntry.value) candidates.push(editingEntry.value.start);
  candidates.push(draft.start);
  return Math.min(...candidates);
});

const otherEntriesForSlider = computed(() => {
  if (!editingId.value) return [];
  return props.entries
    .filter((e) => e.logId !== editingId.value)
    .map((e) => ({ start: e.start, end: e.end, title: e.taskTitle || 'Без назви' }));
});

const sliderMax = computed(() => {
  const day = dayBoundsOf(props.dateStr);
  const candidates = [];
  if (day) candidates.push(day.end);
  if (editingEntry.value) candidates.push(editingEntry.value.end);
  candidates.push(draft.end);
  return Math.max(...candidates);
});

function toLocalInput(ts) {
  if (!Number.isFinite(ts)) return '';
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

const draftStartInput = computed({
  get: () => toLocalInput(draft.start),
  set: (value) => {
    const ts = parseLocalInput(value);
    if (!Number.isNaN(ts)) draft.start = ts;
  },
});

const draftEndInput = computed({
  get: () => toLocalInput(draft.end),
  set: (value) => {
    const ts = parseLocalInput(value);
    if (!Number.isNaN(ts)) draft.end = ts;
  },
});

function startEdit(entry) {
  editingId.value = entry.logId;
  draft.start = entry.start;
  draft.end = entry.end;
}

function cancelEdit() {
  editingId.value = null;
  draft.start = 0;
  draft.end = 0;
}

function saveEntry(entry) {
  if (!entry) return;
  if (!Number.isFinite(draft.start) || !Number.isFinite(draft.end)) {
    alert('Невірний формат дати або часу.');
    return;
  }
  if (draft.end <= draft.start) {
    alert('Час завершення має бути пізнішим за час початку.');
    return;
  }
  emit('update-entry', {
    taskId: entry.taskId,
    logId: entry.logId,
    start: draft.start,
    end: draft.end,
  });
  cancelEdit();
}

function removeEntry(entry) {
  if (editingId.value === entry.logId) cancelEdit();
  emit('remove-entry', { taskId: entry.taskId, logId: entry.logId });
}

watch(
  () => props.entries,
  (entries) => {
    if (!editingId.value) return;
    const current = entries.find((item) => item.logId === editingId.value);
    if (!current) {
      cancelEdit();
    }
  },
);
</script>

<style scoped>
.time-entries{padding:18px;display:flex;flex-direction:column;gap:18px;}
.time-entries__toolbar{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;}
.time-entries__date{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--sub);}
.time-entries__date input{min-width:200px;}
.date-stepper__arrow{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
  width:36.5px;
  height:36.5px;
  padding:0;
  border-radius:12px;
  border: none;
  background:var(--btn-bg1);
  color:var(--text);
  cursor:pointer;
  transition:background-color 0.18s ease, border-color 0.18s ease, transform 0.1s ease;
}
.date-stepper__arrow:hover{background:var(--btn-bg2);border-color:color-mix(in srgb, var(--accent) 40%, var(--line));}
.date-stepper__arrow:active{transform:translateY(1px);}
.date-stepper__arrow:focus-visible{outline:2px solid color-mix(in srgb, var(--accent) 60%, transparent);outline-offset:2px;}
.time-entries__total{display:flex;gap:8px;flex-wrap:wrap;font-weight:600;color:var(--text);}
.time-entries__money{color:var(--accent);}

.time-entries__list{display:flex;flex-direction:column;gap:16px;}
.time-entry {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background-color: var(--input-bg);
  border-radius: 12px;
  transition: background-color 0.4s ease, box-shadow 0.4s ease;
}
.time-entry.is-highlighted {
  background-color: color-mix(in srgb, var(--accent, #2563eb) 18%, var(--input-bg));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #2563eb) 55%, transparent);
}
.time-entry.is-editing {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #6ee7b7) 55%, transparent);
}
.time-entry__header{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between;}
.time-entry__info{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1;}
.time-entry__title{font-weight:600;}
.time-entry__meta{
  display:flex;
  flex-wrap:wrap;
  font-size:12px;
  color:var(--sub);
}
.time-entry__meta .meta-item{
  display:flex;
  align-items:center;
  gap:6px;
  opacity:0.4;
}
.time-entry__meta .meta-label{
  font-size:11px;
}
.time-entry__meta .meta-value{
  padding:0;
  color:var(--text);
  font-weight:500;
  opacity:0.85;
}
.time-entry__actions{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto;align-items:center;}

.controls-menu__item{
  display:flex;
  align-items:center;
  gap:10px;
  border:none;
  background:transparent;
  color:inherit;
  padding:8px 10px;
  border-radius:10px;
  cursor:pointer;
  font-size:14px;
  text-align:left;
}
.controls-menu__item:hover{background:var(--input-bg-focus);}
.controls-menu__item:active{transform:translateY(1px);}
.controls-menu__item--danger{color:var(--danger);}
.controls-menu__item--danger:hover{background:color-mix(in srgb, var(--danger) 14%, transparent);}

.time-entry__body{display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;align-items:center;}
.time-entry__field{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--sub);}
.time-entry__field input{width:100%;}
.time-entry__money{color:var(--accent);font-weight:700;}
.label{font-size:12px;color:var(--sub);}

.time-entry__footer{
  margin-top:4px;
  padding:10px 12px 6px;
  background:color-mix(in srgb, var(--surface) 80%, transparent);
  border-radius:8px;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.time-entry__footer-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:flex-end;}
.time-entry__footer-times{display:flex;gap:8px;align-items:center;font-size:14px;color:var(--text);}
.time-entry__footer-time{font-weight:600;}
.time-entry__footer-dash{color:var(--sub);}
.time-entry__footer-duration{
  margin-left:8px;
  padding:2px 8px;
  border-radius:6px;
  background:var(--input-bg);
  color:var(--sub);
  font-size:13px;
}

@media (max-width:700px){
  .time-entry__actions{width:100%;justify-content:flex-start;}
  .time-entry__body{grid-template-columns:1fr;}
  .time-entry__footer-head{justify-content:flex-start;}
}
</style>
