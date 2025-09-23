<template>
  <div class="monthly-chart card stack">
    <div class="monthly-chart__header">
      <div>
        <h2 class="monthly-chart__title">Графік по днях</h2>
        <p class="monthly-chart__subtitle">Поточний місяць: {{ monthTitle }}</p>
      </div>
    </div>

    <div v-if="days.length" class="monthly-chart__body">
      <div class="chart-grid">
        <div
          v-for="day in days"
          :key="day.date"
          class="chart-grid__item"
        >
          <div class="chart-grid__value mono" v-if="day.totalMs">
            {{ formatMs(day.totalMs) }}
          </div>
          <div
            class="chart-grid__bar"
            :style="{ height: barHeight(day.totalMs) + 'px' }"
            :aria-label="barAria(day)"
          >
            <div
              v-for="segment in day.segments"
              :key="segment.id"
              class="chart-grid__segment"
              :style="{
                backgroundColor: segment.color,
                flexGrow: segment.ms,
              }"
              :title="segment.tooltip"
            ></div>
          </div>
          <div class="chart-grid__label">{{ day.day }}</div>
        </div>
      </div>
    </div>
    <div v-else class="monthly-chart__empty">
      Немає записів часу за вибраний місяць.
    </div>

    <div v-if="legend.length" class="monthly-chart__legend">
      <div v-for="item in legend" :key="item.id" class="legend-item">
        <span class="legend-item__swatch" :style="{ backgroundColor: item.color }"></span>
        <span class="legend-item__title">{{ item.title }}</span>
        <span class="legend-item__value mono">{{ item.hours }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
  firstDayOfMonth,
  lastDayOfMonth,
  toInputMonth,
  monthLabel,
  formatMs,
  startOfDay,
} from '../helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  today: { type: Object, default: () => new Date() },
  tick: { type: Number, default: 0 },
});

const selectedMonth = ref('');

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

const monthDate = computed(() => {
  const parsed = parseMonth(selectedMonth.value);
  if (parsed) return parsed;
  return firstDayOfMonth(new Date());
});

const monthTitle = computed(() => monthLabel(monthDate.value));

const days = computed(() => {
  props.tick; // ensure recompute while таймери працюють
  return buildMonthlyDays(props.tasks, monthDate.value);
});

const maxTotalMs = computed(() => {
  return days.value.reduce((max, day) => Math.max(max, day.totalMs), 0);
});

const legend = computed(() => {
  const totals = new Map();
  for (const day of days.value) {
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
    }));
});

function barHeight(ms) {
  if (!maxTotalMs.value || ms <= 0) return 0;
  const base = 160; // pixels
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

function buildMonthlyDays(tasks, monthStartDate) {
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

  const addDuration = (task, spanStart, spanEnd) => {
    const clampedStart = Math.max(spanStart, start);
    const clampedEnd = Math.min(spanEnd, endExclusive);
    if (clampedEnd <= clampedStart) return;

    let cursor = clampedStart;
    while (cursor < clampedEnd) {
      const dayStart = startOfDay(new Date(cursor)).getTime();
      const nextDayStart = dayStart + DAY_MS;
      const sliceEnd = Math.min(nextDayStart, clampedEnd);
      const delta = Math.max(0, sliceEnd - cursor);
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
      addDuration(task, startTs, endTs);
    }
    if (task.running && typeof task.running.start === 'number') {
      addDuration(task, task.running.start, Date.now());
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
    results.push({
      date: entry.date,
      day: entry.day,
      totalMs: entry.totalMs,
      segments,
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
</script>

<style scoped>
.monthly-chart {
  padding: 18px;
  gap: 18px;
}

.monthly-chart__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
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

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20px, 1fr));
  align-items: end;
  gap: 8px;
  min-height: 200px;
}

.chart-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.chart-grid__value {
  font-size: 12px;
  color: var(--sub);
}

.chart-grid__bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: var(--segment-bg);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  transition: height 0.2s ease;
}

.chart-grid__segment {
  width: 100%;
}

.chart-grid__label {
  font-size: 12px;
  color: var(--sub);
}

.monthly-chart__empty {
  color: var(--sub);
  font-size: 14px;
}

.monthly-chart__legend {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
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
</style>
