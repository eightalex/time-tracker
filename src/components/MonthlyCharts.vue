<template>
  <div class="monthly-chart card stack">
    <div class="monthly-chart__header">
      <div>
        <h2 class="monthly-chart__title">Графік по днях</h2>
        <p class="monthly-chart__subtitle">Місяць: {{ monthTitle }}</p>
        <p class="monthly-chart__total">
          Всього за місяць:
          <span class="monthly-chart__total-value mono">{{ monthlyTotalFormatted }}</span>
        </p>
        <p v-if="showEarnings" class="monthly-chart__total">
          Зароблено:
          <span class="monthly-chart__total-value monthly-chart__total-value--money mono">{{ formatUsd(earnedForMs(monthlyTotalMs, hourlyRate)) }}</span>
        </p>
      </div>
      <input
        class="monthly-chart__month"
        type="month"
        v-model="selectedMonth"
        aria-label="Оберіть місяць"
      />
    </div>

    <div class="monthly-chart__body">
      <div class="chart-grid">
        <div
          v-for="day in days"
          :key="day.date"
          :class="[
            'chart-grid__item',
            {
              'chart-grid__item--weekend': day.isWeekend,
              'chart-grid__item--composer-open': composerDate === day.date,
            },
          ]"
        >
          <div class="chart-grid__top">
            <div class="chart-grid__value mono" v-if="day.totalMs">
              {{ formatMs(day.totalMs) }}
            </div>
            <button
              type="button"
              :class="['chart-grid__add', { 'is-open': composerDate === day.date }]"
              :aria-label="`Додати запис часу на ${day.date}`"
              :title="`Додати запис часу на ${day.date}`"
              @click="openComposer(day)"
            >
              <Icon name="plus" size="14" weight="bold" />
            </button>
          </div>

          <div class="chart-grid__column">
            <div
              v-if="day.totalMs"
              class="chart-grid__bar"
              :style="{ height: barHeight(day.totalMs) + 'px' }"
              :aria-label="barAria(day)"
            >
              <div
                v-for="segment in day.segments"
                :key="segment.id"
                :class="['chart-grid__segment', segmentClasses(segment.id)]"
                :style="{
                  backgroundColor: segment.color,
                  flexGrow: segment.ms,
                }"
                :title="segment.tooltip"
                @mouseenter="setHoveredTask(segment.id)"
                @mouseleave="clearHoveredTask(segment.id)"
                @click="onSegmentClick(day, segment)"
              ></div>
            </div>
            <div v-else class="chart-grid__bar chart-grid__bar--empty" aria-hidden="true"></div>
          </div>

          <div class="chart-grid__label">{{ day.day }}</div>
        </div>
      </div>
    </div>

    <div v-if="composerDate" class="monthly-chart__composer">
      <div class="monthly-chart__composer-header">
        <div>
          <h3 class="monthly-chart__composer-title">Новий запис часу</h3>
          <p class="monthly-chart__composer-subtitle">{{ composerDateLabel }}</p>
        </div>
        <button
          type="button"
          class="monthly-chart__composer-close"
          aria-label="Закрити форму додавання"
          @click="closeComposer"
        >
          ×
        </button>
      </div>

      <form class="monthly-chart__composer-form" @submit.prevent="submitComposer">
        <label class="monthly-chart__field">
          <span>Задача</span>
          <select v-model="composer.taskId">
            <option value="" disabled>
              {{ taskOptions.length ? 'Оберіть задачу' : 'Спочатку створіть задачу' }}
            </option>
            <option
              v-for="task in taskOptions"
              :key="task.id"
              :value="task.id"
            >
              {{ task.label }}
            </option>
          </select>
        </label>

        <div class="monthly-chart__field">
          <span>Тривалість</span>
          <div class="monthly-chart__presets">
            <button
              v-for="preset in durationPresets"
              :key="preset.ms"
              type="button"
              :class="['monthly-chart__preset', { 'is-active': activePresetMs === preset.ms }]"
              @click="applyDurationPreset(preset.ms)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div class="monthly-chart__time-range">
          <label class="monthly-chart__field">
            <span>Початок</span>
            <input type="time" v-model="composer.startTime" step="60" />
          </label>
          <label class="monthly-chart__field">
            <span>Завершення</span>
            <input type="time" v-model="composer.endTime" step="60" />
          </label>
        </div>

        <div class="monthly-chart__composer-summary">
          <div>
            <span class="monthly-chart__summary-label">Проміжок</span>
            <strong class="monthly-chart__summary-value mono">{{ composerRangeLabel }}</strong>
          </div>
          <div>
            <span class="monthly-chart__summary-label">Тривалість</span>
            <strong class="monthly-chart__summary-value mono">{{ composerDurationLabel }}</strong>
          </div>
        </div>

        <p v-if="composerHint" class="monthly-chart__composer-hint">
          {{ composerHint }}
        </p>
        <p v-if="!taskOptions.length" class="monthly-chart__composer-hint">
          Для додавання записів спочатку створіть хоча б одну задачу в секції "Задачі".
        </p>

        <div class="monthly-chart__composer-actions">
          <div class="monthly-chart__smart-slot">
            <button
              type="button"
              class="btn ghost"
              @click="resetComposerTimes"
            >Розумний слот</button>
            <p class="monthly-chart__smart-slot-hint">
              <span class="monthly-chart__smart-slot-hint-icon" aria-hidden="true">💡</span>
              <span class="monthly-chart__smart-slot-hint-text">
                Автоматично підбирає час: за порожній день — 10:00, інакше ставить запис одразу після останнього або у найбільше вільне вікно дня.
              </span>
            </p>
          </div>
          <button type="button" class="btn ghost" @click="closeComposer">Скасувати</button>
          <button type="submit" class="btn primary" :disabled="!canSubmitComposer">Додати запис</button>
        </div>
      </form>
    </div>

    <div v-if="legend.length" class="monthly-chart__legend">
      <template v-for="item in legend" :key="item.id">
        <div
          class="legend-item"
          :class="legendClasses(item.id)"
          role="button"
          tabindex="0"
          @click="toggleLegend(item.id)"
          @keydown.enter.prevent="toggleLegend(item.id)"
          @keydown.space.prevent="toggleLegend(item.id)"
          @mouseenter="setHoveredTask(item.id)"
          @mouseleave="clearHoveredTask(item.id)"
        >
          <span class="legend-item__swatch" :style="{ backgroundColor: item.color }"></span>
          <span class="legend-item__title">{{ item.title }}</span>
          <span class="legend-item__value mono">{{ item.hours }}</span>
          <span v-if="showEarnings" class="legend-item__money mono">{{ item.earned }}</span>
        </div>
        <div
          v-if="activeTaskId === item.id"
          class="legend-item__entries"
        >
          <button
            v-for="entry in entriesByTaskId.get(item.id) || []"
            :key="entry.logId"
            type="button"
            class="legend-item__entry"
            @click="onEntryClick(entry)"
          >
            <span class="legend-item__entry-date">{{ entry.dateLabel }}</span>
            <span class="legend-item__entry-time mono">{{ entry.timeLabel }}</span>
            <span class="legend-item__entry-duration mono">{{ entry.durationLabel }}</span>
          </button>
          <p
            v-if="!(entriesByTaskId.get(item.id) || []).length"
            class="legend-item__entries-empty"
          >
            Немає записів за цей місяць.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import {
  firstDayOfMonth,
  lastDayOfMonth,
  toInputMonth,
  monthLabel,
  formatMs,
  applyTimeCoefficient,
  effectiveLogCoefficient,
  earnedForMs,
  formatUsd,
  shouldShowEarnings,
  startOfDay,
} from '../helpers';
import Icon from './Icon.vue';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DEFAULT_DURATION_MINUTES = 60;
const MAX_DAY_MINUTES = 23 * 60 + 59;
const durationPresets = [
  { label: '30 хв', ms: 30 * MINUTE_MS },
  { label: '1 год', ms: 60 * MINUTE_MS },
  { label: '1.5 год', ms: 90 * MINUTE_MS },
  { label: '2 год', ms: 120 * MINUTE_MS },
  { label: '4 год', ms: 240 * MINUTE_MS },
  { label: '8 год', ms: 480 * MINUTE_MS },
];

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  today: { type: Object, default: () => new Date() },
  tick: { type: Number, default: 0 },
  timeCoefficient: { type: Number, default: 1 },
  timeCoefficientAppliesToAll: { type: Boolean, default: false },
  hourlyRate: { type: Number, default: 0 },
});

const emit = defineEmits(['create-entry', 'view-day-entries']);

const selectedMonth = ref('');
const activeTaskId = ref(null);
const hoveredTaskId = ref(null);
const composerDate = ref('');
const composerHint = ref('');
const composer = reactive({
  taskId: '',
  startTime: '',
  endTime: '',
});

const longDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const entryDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: 'short',
});

const entryTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
});

watch(
  () => props.today,
  (value) => {
    const monthStr = toInputMonth(value instanceof Date ? value : new Date());
    if (!selectedMonth.value) {
      selectedMonth.value = monthStr;
    } else {
      const current = parseMonth(selectedMonth.value);
      const next = parseMonth(monthStr);
      if (current && next && current.getTime() !== next.getTime()) {
        selectedMonth.value = monthStr;
      }
    }
  },
  { immediate: true }
);

watch(selectedMonth, () => {
  closeComposer();
});

const monthDate = computed(() => {
  const parsed = parseMonth(selectedMonth.value);
  if (parsed) return parsed;
  return firstDayOfMonth(new Date());
});

const monthTitle = computed(() => monthLabel(monthDate.value));

const rawDays = computed(() => {
  props.tick;
  return buildMonthlyDays(props.tasks, monthDate.value, props.timeCoefficient, props.timeCoefficientAppliesToAll);
});

const maxTotalMs = computed(() => {
  return days.value.reduce((max, day) => Math.max(max, day.totalMs), 0);
});
const showEarnings = computed(() => shouldShowEarnings(props.hourlyRate));

const legend = computed(() => {
  const totals = new Map();
  for (const day of rawDays.value) {
    for (const seg of day.segments) {
      const prev = totals.get(seg.id) || { id: seg.id, title: seg.title, ms: 0, color: seg.color };
      prev.ms += seg.ms;
      prev.color = seg.color;
      totals.set(seg.id, prev);
    }
  }
  return Array.from(totals.values())
    .sort((a, b) => b.ms - a.ms)
    .map((item) => ({
      id: item.id,
      title: item.title,
      color: item.color,
      hours: formatHours(item.ms),
      earned: formatUsd(earnedForMs(item.ms, props.hourlyRate)),
    }));
});

watch(legend, (items) => {
  if (!items.length || !items.some((item) => item.id === activeTaskId.value)) {
    activeTaskId.value = null;
  }
});

const monthlyTotalMs = computed(() => rawDays.value.reduce((sum, day) => sum + day.totalMs, 0));
const monthlyTotalFormatted = computed(() => formatMs(monthlyTotalMs.value));

const days = computed(() => {
  if (!activeTaskId.value) return rawDays.value;
  return rawDays.value.map((day) => {
    const segments = day.segments.filter((seg) => seg.id === activeTaskId.value);
    const totalMs = segments.reduce((sum, seg) => sum + seg.ms, 0);
    return {
      ...day,
      segments,
      totalMs,
    };
  });
});

const taskOptions = computed(() => {
  return [...(Array.isArray(props.tasks) ? props.tasks : [])]
    .filter((task) => !task.archived)
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'uk'))
    .map((task) => ({
      id: task.id,
      label: formatTaskOption(task),
    }));
});

const composerDateLabel = computed(() => {
  if (!composerDate.value) return '';
  const date = new Date(`${composerDate.value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? composerDate.value : longDateFormatter.format(date);
});

const composerRangeLabel = computed(() => {
  if (!isValidTime(composer.startTime) || !isValidTime(composer.endTime)) {
    return 'Оберіть час';
  }
  return `${composer.startTime} - ${composer.endTime}`;
});

const composerDurationMs = computed(() => {
  if (!isValidTime(composer.startTime) || !isValidTime(composer.endTime)) {
    return 0;
  }
  const startMinutes = timeToMinutes(composer.startTime);
  const endMinutes = timeToMinutes(composer.endTime);
  if (endMinutes <= startMinutes) return 0;
  return (endMinutes - startMinutes) * MINUTE_MS;
});

const composerDurationLabel = computed(() => {
  return composerDurationMs.value > 0 ? formatMs(composerDurationMs.value) : '00:00';
});

const activePresetMs = computed(() => {
  return durationPresets.some((preset) => preset.ms === composerDurationMs.value)
    ? composerDurationMs.value
    : null;
});

const canSubmitComposer = computed(() => {
  return Boolean(composerDate.value && composer.taskId && composerDurationMs.value > 0);
});

watch(
  taskOptions,
  (options) => {
    if (!composerDate.value) return;
    if (options.some((task) => task.id === composer.taskId)) return;
    composer.taskId = pickDefaultTaskIdForDate(composerDate.value);
  },
  { immediate: true }
);

function barHeight(ms) {
  if (!maxTotalMs.value || ms <= 0) return 0;
  const base = 160;
  return Math.max(6, Math.round((ms / maxTotalMs.value) * base));
}

function barAria(day) {
  if (!day.totalMs) return `День ${day.day}: немає даних`;
  const parts = day.segments.map((seg) => `${seg.title} — ${formatHours(seg.ms)}`);
  return `День ${day.day}: ${parts.join(', ')}`;
}

function formatHours(ms) {
  const hours = ms / 3600000;
  return `${hours.toFixed(1)} год`;
}

function parseMonth(value) {
  if (typeof value !== 'string' || !value.includes('-')) return null;
  const [yearStr, monthStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function formatTaskOption(task) {
  const meta = [task.project, task.type].filter(Boolean).join(' / ');
  const base = meta ? `${task.title} · ${meta}` : task.title || 'Без назви';
  return task.persistent ? `📌 [постійна] ${base}` : base;
}

function openComposer(day) {
  composerDate.value = day.date;
  composer.taskId = pickDefaultTaskId(day);
  applySuggestedTimes(day.date);
}

function closeComposer() {
  composerDate.value = '';
  composerHint.value = '';
  composer.taskId = '';
  composer.startTime = '';
  composer.endTime = '';
}

function pickDefaultTaskId(day) {
  if (activeTaskId.value && taskOptions.value.some((task) => task.id === activeTaskId.value)) {
    return activeTaskId.value;
  }
  if (day?.segments?.length) {
    const matchingTask = taskOptions.value.find((task) => task.id === day.segments[0].id);
    if (matchingTask) return matchingTask.id;
  }
  return taskOptions.value[0]?.id || '';
}

function pickDefaultTaskIdForDate(dateStr) {
  const day = rawDays.value.find((item) => item.date === dateStr);
  return pickDefaultTaskId(day);
}

function applySuggestedTimes(dateStr) {
  const suggestion = suggestTimeRange(dateStr);
  composer.startTime = minutesToTime(suggestion.startMinutes);
  composer.endTime = minutesToTime(suggestion.endMinutes);
  composerHint.value = suggestion.hint;
}

function resetComposerTimes() {
  if (!composerDate.value) return;
  applySuggestedTimes(composerDate.value);
}

function applyDurationPreset(durationMs) {
  const currentStart = isValidTime(composer.startTime)
    ? timeToMinutes(composer.startTime)
    : composerDate.value
      ? suggestTimeRange(composerDate.value).startMinutes
      : 9 * 60;
  const durationMinutes = Math.max(1, Math.round(durationMs / MINUTE_MS));
  const endMinutes = Math.min(MAX_DAY_MINUTES, currentStart + durationMinutes);
  composer.endTime = minutesToTime(endMinutes);
  if (!isValidTime(composer.startTime)) {
    composer.startTime = minutesToTime(currentStart);
  }
  composerHint.value = 'Тривалість оновлена, за потреби час можна підкоригувати вручну.';
}

function submitComposer() {
  if (!composerDate.value) return;
  if (!composer.taskId) {
    alert('Оберіть задачу для нового запису.');
    return;
  }
  if (!isValidTime(composer.startTime) || !isValidTime(composer.endTime)) {
    alert('Оберіть коректний час початку та завершення.');
    return;
  }
  const start = combineDateAndTime(composerDate.value, composer.startTime);
  const end = combineDateAndTime(composerDate.value, composer.endTime);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    alert('Час завершення має бути пізнішим за час початку.');
    return;
  }
  emit('create-entry', {
    taskId: composer.taskId,
    dateStr: composerDate.value,
    start,
    end,
  });
  closeComposer();
}

function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !isValidTime(timeStr)) return Number.NaN;
  const [year, month, day] = dateStr.split('-').map((part) => Number(part));
  const [hours, minutes] = timeStr.split(':').map((part) => Number(part));
  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return Number.NaN;
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

function isValidTime(value) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Math.min(MAX_DAY_MINUTES, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundUpToQuarter(minutes) {
  return Math.min(24 * 60, Math.ceil(minutes / 15) * 15);
}

function roundDownToQuarter(minutes) {
  return Math.max(0, Math.floor(minutes / 15) * 15);
}

function suggestTimeRange(dateStr) {
  const dayStartTs = startOfDay(new Date(`${dateStr}T00:00:00`)).getTime();
  if (Number.isNaN(dayStartTs)) {
    return {
      startMinutes: 10 * 60,
      endMinutes: 11 * 60,
      hint: 'Запропоновано стандартний робочий слот.',
    };
  }

  const busyIntervals = collectBusyIntervals(dateStr);
  if (!busyIntervals.length) {
    return {
      startMinutes: 10 * 60,
      endMinutes: 11 * 60,
      hint: 'День порожній, тому запропоновано стандартний слот 10:00 - 11:00.',
    };
  }

  const lastInterval = busyIntervals[busyIntervals.length - 1];
  const afterLastStart = roundUpToQuarter(toMinutesWithinDay(lastInterval.end, dayStartTs));
  if (afterLastStart < MAX_DAY_MINUTES) {
    const afterLastEnd = clampEndMinutes(afterLastStart + DEFAULT_DURATION_MINUTES);
    if (afterLastEnd > afterLastStart) {
      return {
        startMinutes: afterLastStart,
        endMinutes: afterLastEnd,
        hint: 'Час підставлено одразу після останнього запису за цей день.',
      };
    }
  }

  const gaps = [];
  let cursor = 0;
  for (const interval of busyIntervals) {
    const startMinutes = roundDownToQuarter(toMinutesWithinDay(interval.start, dayStartTs));
    const endMinutes = roundUpToQuarter(toMinutesWithinDay(interval.end, dayStartTs));
    if (startMinutes > cursor) {
      gaps.push({ start: cursor, end: startMinutes });
    }
    cursor = Math.max(cursor, endMinutes);
  }
  if (cursor < MAX_DAY_MINUTES) {
    gaps.push({ start: cursor, end: MAX_DAY_MINUTES });
  }

  const usableGap = gaps
    .map((gap) => ({
      start: roundUpToQuarter(gap.start),
      end: roundDownToQuarter(gap.end),
    }))
    .filter((gap) => gap.end > gap.start)
    .sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];

  if (usableGap) {
    const duration = Math.min(DEFAULT_DURATION_MINUTES, usableGap.end - usableGap.start);
    return {
      startMinutes: usableGap.start,
      endMinutes: clampEndMinutes(usableGap.start + duration),
      hint: 'Знайдено вільне вікно між наявними записами.',
    };
  }

  const fallbackStart = Math.max(0, roundDownToQuarter(toMinutesWithinDay(lastInterval.end, dayStartTs) - 30));
  const fallbackEnd = clampEndMinutes(fallbackStart + 30);
  return {
    startMinutes: fallbackStart,
    endMinutes: fallbackEnd,
    hint: 'День уже щільно заповнений, тому запропоновано короткий слот для точного ручного налаштування.',
  };
}

function clampEndMinutes(totalMinutes) {
  return Math.max(1, Math.min(MAX_DAY_MINUTES, totalMinutes));
}

function toMinutesWithinDay(timestamp, dayStartTs) {
  return Math.max(0, Math.ceil((timestamp - dayStartTs) / MINUTE_MS));
}

function collectBusyIntervals(dateStr) {
  const baseDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) return [];
  const dayStartTs = startOfDay(baseDate).getTime();
  const dayEndExclusive = dayStartTs + DAY_MS;
  const intervals = [];

  for (const task of Array.isArray(props.tasks) ? props.tasks : []) {
    const logs = Array.isArray(task.logs) ? task.logs : [];
    for (const log of logs) {
      const startTs = typeof log.start === 'number' ? log.start : null;
      const endTs = typeof log.end === 'number' ? log.end : null;
      if (startTs === null || endTs === null) continue;
      const clippedStart = Math.max(startTs, dayStartTs);
      const clippedEnd = Math.min(endTs, dayEndExclusive);
      if (clippedEnd > clippedStart) {
        intervals.push({ start: clippedStart, end: clippedEnd });
      }
    }

    if (task.running && typeof task.running.start === 'number') {
      const clippedStart = Math.max(task.running.start, dayStartTs);
      const clippedEnd = Math.min(Date.now(), dayEndExclusive);
      if (clippedEnd > clippedStart) {
        intervals.push({ start: clippedStart, end: clippedEnd });
      }
    }
  }

  return mergeIntervals(intervals);
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) {
      merged.push({ ...interval });
      continue;
    }
    last.end = Math.max(last.end, interval.end);
  }
  return merged;
}

function buildMonthlyDays(tasks, monthStartDate, coefficient=1, applyToAll=false) {
  const coefficientOptions = { coefficient, applyToAll };
  const start = firstDayOfMonth(monthStartDate).getTime();
  const endInclusive = lastDayOfMonth(monthStartDate).getTime();
  const endExclusive = endInclusive + 1;

  const dayMap = new Map();
  const colorCache = new Map();

  const ensureEntry = (timestamp) => {
    const dateKey = formatDateKey(timestamp);
    let entry = dayMap.get(dateKey);
    if (!entry) {
      entry = { date: dateKey, day: Number(dateKey.slice(-2)), totalMs: 0, tasks: new Map() };
      dayMap.set(dateKey, entry);
    }
    return entry;
  };

  const addDuration = (task, spanStart, spanEnd, durationCoefficient) => {
    const clampedStart = Math.max(spanStart, start);
    const clampedEnd = Math.min(spanEnd, endExclusive);
    if (clampedEnd <= clampedStart) return;

    let cursor = clampedStart;
    while (cursor < clampedEnd) {
      const dayStart = startOfDay(new Date(cursor)).getTime();
      const nextDayStart = dayStart + DAY_MS;
      const sliceEnd = Math.min(nextDayStart, clampedEnd);
      const delta = applyTimeCoefficient(Math.max(0, sliceEnd - cursor), durationCoefficient);
      if (delta > 0) {
        const entry = ensureEntry(dayStart);
        entry.totalMs += delta;

        const taskKey = task.id || task.title || 'unknown';
        let taskEntry = entry.tasks.get(taskKey);
        if (!taskEntry) {
          taskEntry = {
            id: taskKey,
            title: task.title || 'Без назви',
            ms: 0,
          };
          entry.tasks.set(taskKey, taskEntry);
        }
        taskEntry.ms += delta;
      }
      cursor = sliceEnd;
    }
  };

  for (const task of Array.isArray(tasks) ? tasks : []) {
    const logs = Array.isArray(task.logs) ? task.logs : [];
    for (const log of logs) {
      const startTs = typeof log.start === 'number' ? log.start : null;
      const endTs = typeof log.end === 'number' ? log.end : null;
      if (startTs === null || endTs === null) continue;
      addDuration(task, startTs, endTs, effectiveLogCoefficient(log, coefficientOptions));
    }
    if (task.running && typeof task.running.start === 'number') {
      addDuration(task, task.running.start, Date.now(), coefficient);
    }
  }

  const results = [];
  const iter = new Date(start);
  while (iter.getTime() <= endInclusive) {
    const entry = ensureEntry(iter.getTime());
    const segments = Array.from(entry.tasks.values())
      .sort((a, b) => b.ms - a.ms)
      .map((item) => {
        const colorKey = item.id;
        let color = colorCache.get(colorKey);
        if (!color) {
          color = makeColor(colorKey, item.title);
          colorCache.set(colorKey, color);
        }
        return {
          id: item.id,
          title: item.title,
          ms: item.ms,
          color,
          tooltip: `${item.title}: ${formatHours(item.ms)}`,
        };
      });
    const dayOfWeek = iter.getDay();
    results.push({
      date: entry.date,
      day: entry.day,
      totalMs: entry.totalMs,
      segments,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
    iter.setDate(iter.getDate() + 1);
  }
  return results;
}

function formatDateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeColor(seed, fallbackTitle) {
  const source = seed || fallbackTitle || 'task';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 65;
  const lightness = 60;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function toggleLegend(taskId) {
  activeTaskId.value = activeTaskId.value === taskId ? null : taskId;
  hoveredTaskId.value = taskId;
}

const entriesByTaskId = computed(() => {
  const monthStart = firstDayOfMonth(monthDate.value).getTime();
  const monthEnd = lastDayOfMonth(monthDate.value).getTime();
  const map = new Map();
  for (const task of Array.isArray(props.tasks) ? props.tasks : []) {
    const rows = [];
    const logs = Array.isArray(task.logs) ? task.logs : [];
    for (const log of logs) {
      const startTs = typeof log.start === 'number' ? log.start : null;
      const endTs = typeof log.end === 'number' ? log.end : null;
      if (startTs === null || endTs === null) continue;
      if (endTs < monthStart || startTs > monthEnd) continue;
      const ms = typeof log.ms === 'number' ? log.ms : Math.max(0, endTs - startTs);
      const startDate = new Date(startTs);
      const endDate = new Date(endTs);
      rows.push({
        taskId: task.id,
        logId: log.id,
        start: startTs,
        end: endTs,
        ms,
        dateStr: formatDateKey(startTs),
        dateLabel: entryDateFormatter.format(startDate),
        timeLabel: `${entryTimeFormatter.format(startDate)} – ${entryTimeFormatter.format(endDate)}`,
        durationLabel: formatMs(ms),
      });
    }
    rows.sort((a, b) => a.start - b.start);
    map.set(task.id, rows);
  }
  return map;
});

function onSegmentClick(day, segment) {
  if (!day?.date) return;
  emit('view-day-entries', { dateStr: day.date, taskId: segment?.id || null });
}

function onEntryClick(entry) {
  if (!entry?.dateStr) return;
  emit('view-day-entries', { dateStr: entry.dateStr, logId: entry.logId });
}

function setHoveredTask(taskId) {
  hoveredTaskId.value = taskId;
}

function clearHoveredTask(taskId) {
  if (hoveredTaskId.value === taskId) {
    hoveredTaskId.value = null;
  }
}

function segmentClasses(taskId) {
  return {
    'is-highlighted': hoveredTaskId.value === taskId,
    'is-faded': hoveredTaskId.value && hoveredTaskId.value !== taskId,
    'is-active': activeTaskId.value === taskId,
  };
}

function legendClasses(taskId) {
  return {
    'is-active': activeTaskId.value === taskId,
    'is-highlighted': hoveredTaskId.value === taskId,
    'is-faded': hoveredTaskId.value && hoveredTaskId.value !== taskId,
  };
}
</script>

<style scoped>
.monthly-chart {
  padding: 18px;
  gap: 18px;
}

.monthly-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.monthly-chart__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.monthly-chart__subtitle {
  margin: 4px 0 0;
  color: var(--sub);
  font-size: 13px;
}

.monthly-chart__total {
  margin: 4px 0 0;
  color: var(--sub);
  font-size: 13px;
}

.monthly-chart__total-value {
  color: var(--text, #111);
}

.monthly-chart__total-value--money {
  color: var(--accent);
}

.monthly-chart__body {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18px, 1fr));
  align-items: end;
  gap: 3px;
  min-height: 226px;
}

.chart-grid__item {
  display: grid;
  grid-template-rows: 20px 164px auto;
  align-items: end;
  gap: 6px;
  min-width: 0;
  position: relative;
}

.chart-grid__item--composer-open .chart-grid__value {
  opacity: 0;
}

.chart-grid__item--weekend .chart-grid__label {
  margin-bottom: -3px;
  padding: 3px 5px;
  background-color: color-mix(in srgb, var(--accent, #ef4444) 6%, transparent);
  border-radius: 6px;
  color: var(--accent, #ef4444);
  font-weight: 600;
}

.chart-grid__top {
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 20px;
}

.chart-grid__value {
  font-size: 8px;
  color: var(--sub);
  transition: opacity 0.18s ease;
}

.chart-grid__add {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent, #6ee7b7) 48%, transparent);
  background: color-mix(in srgb, var(--surface) 82%, var(--accent, #6ee7b7));
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px) scale(0.94);
  transition: opacity 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.chart-grid__item:hover .chart-grid__add,
.chart-grid__item:focus-within .chart-grid__add,
.chart-grid__add.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.chart-grid__item:hover .chart-grid__value,
.chart-grid__item:focus-within .chart-grid__value {
  opacity: 0;
}

.chart-grid__add:hover {
  background: color-mix(in srgb, var(--surface) 72%, var(--accent, #6ee7b7));
}

.chart-grid__column {
  width: 100%;
  min-height: 164px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 2px 4px;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.chart-grid__item:hover .chart-grid__column,
.chart-grid__item:focus-within .chart-grid__column,
.chart-grid__item--composer-open .chart-grid__column {
  background: color-mix(in srgb, var(--accent-2, #60a5fa) 8%, transparent);
}

.chart-grid__bar {
  width: 15px;
  border-radius: 5px 5px 0 0;
  background: var(--segment-bg);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 1px;
  overflow: hidden;
  transition: height 0.2s ease;
}

.chart-grid__bar--empty {
  height: 100%;
  background: transparent;
}

.chart-grid__segment {
  width: 100%;
  transition: opacity 0.18s ease, filter 0.18s ease, transform 0.18s ease;
  cursor: pointer;
}

.chart-grid__segment.is-highlighted {
  opacity: 1;
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.chart-grid__segment.is-faded {
  opacity: 0.35;
}

.chart-grid__segment.is-active {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
}

.chart-grid__label {
  font-size: 12px;
  color: var(--sub);
  text-align: center;
}

.monthly-chart__composer {
  border-radius: 18px;
  padding: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent, #6ee7b7) 10%, transparent), transparent 42%),
    var(--input-bg);
  display: grid;
  gap: 16px;
}

.monthly-chart__composer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.monthly-chart__composer-title {
  margin: 0;
  font-size: 16px;
}

.monthly-chart__composer-subtitle {
  margin: 4px 0 0;
  color: var(--sub);
  font-size: 13px;
  text-transform: capitalize;
}

.monthly-chart__composer-close {
  border: none;
  background: transparent;
  color: var(--sub);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.monthly-chart__composer-close:hover {
  color: var(--text);
}

.monthly-chart__composer-form {
  display: grid;
  gap: 16px;
}

.monthly-chart__field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: var(--sub);
}

.monthly-chart__field input,
.monthly-chart__field select {
  width: 100%;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}

.monthly-chart__time-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.monthly-chart__presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.monthly-chart__preset {
  border: none;
  background: var(--surface);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.monthly-chart__preset.is-active {
  border-color: color-mix(in srgb, var(--accent, #6ee7b7) 70%, var(--line));
  background: color-mix(in srgb, var(--accent, #6ee7b7) 18%, transparent);
}

.monthly-chart__composer-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}

.monthly-chart__summary-label {
  display: block;
  font-size: 12px;
  color: var(--sub);
  margin-bottom: 6px;
}

.monthly-chart__summary-value {
  display: block;
  font-size: 16px;
}

.monthly-chart__composer-hint {
  margin: 0;
  font-size: 13px;
  color: var(--sub);
}

.monthly-chart__composer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.monthly-chart__smart-slot {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-right: auto;
  max-width: 360px;
}

.monthly-chart__smart-slot-hint {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--sub);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--input-bg);
}

.monthly-chart__smart-slot-hint::after,
.monthly-chart__smart-slot-hint::before {
  bottom: 100%;
  left: 20px;
  border: solid transparent;
  content: "";
  height: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}

.monthly-chart__smart-slot-hint::after {
  border-color: transparent;
  border-bottom-color: var(--input-bg);
  border-width: 6px;
  margin-left: -6px;
}

.monthly-chart__smart-slot-hint::before {
  border-color: transparent;
  border-bottom-color: var(--line);
  border-width: 7px;
  margin-left: -7px;
}

.monthly-chart__smart-slot-hint-icon {
  flex: 0 0 auto;
  font-size: 16px;
  line-height: 1.2;
}

.monthly-chart__smart-slot-hint-text {
  flex: 1 1 auto;
}

.monthly-chart__legend {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--input-bg);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
}

.legend-item__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-item__title {
  flex: 1;
  font-size: 13px;
}

.legend-item__value {
  font-weight: 600;
}

.legend-item__money {
  color: var(--accent);
  font-weight: 700;
}

.legend-item.is-active {
  border-color: var(--accent, #2563eb);
  background-color: color-mix(in srgb, var(--accent, #2563eb) 12%, transparent);
}

.legend-item:focus-visible {
  outline: 2px solid var(--accent, #2563eb);
  outline-offset: 2px;
}

.legend-item.is-highlighted {
  border-color: var(--accent, #2563eb);
  background-color: color-mix(in srgb, var(--accent, #2563eb) 18%, transparent);
}

.legend-item.is-faded {
  opacity: 0.45;
}

.legend-item__entries {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: -2px 0 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--input-bg) 60%, transparent);
  border: 1px solid var(--line);
}

.legend-item__entry {
  display: grid;
  grid-template-columns: minmax(80px, auto) 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--text);
  text-align: left;
  font: inherit;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.legend-item__entry:hover,
.legend-item__entry:focus-visible {
  background: color-mix(in srgb, var(--accent, #2563eb) 12%, transparent);
  outline: none;
}

.legend-item__entry-date {
  color: var(--sub);
  font-size: 12px;
  text-transform: capitalize;
}

.legend-item__entry-time {
  font-size: 13px;
}

.legend-item__entry-duration {
  font-weight: 600;
  font-size: 13px;
}

.legend-item__entries-empty {
  margin: 0;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--sub);
}

@media (max-width: 720px) {
  .monthly-chart__header {
    flex-direction: column;
    align-items: stretch;
  }

  .chart-grid {
    grid-template-columns: repeat(31, minmax(20px, 1fr));
    min-width: 700px;
  }

  .monthly-chart__time-range,
  .monthly-chart__composer-summary {
    grid-template-columns: 1fr;
  }

  .monthly-chart__composer-actions {
    justify-content: stretch;
  }

  .monthly-chart__composer-actions .btn {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
