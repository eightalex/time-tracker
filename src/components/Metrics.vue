<template>
  <div class="card stack">
    <div class="metrics">
      <div class="metric">
        <div class="k mono">{{ formatMs(todayTotal) }}</div>
        <div class="l">Сьогодні ({{ toISODate(today) }})</div>
      </div>
      <div class="metric">
        <div class="k mono">{{ formatMs(monthTotal) }}</div>
        <div class="l">За {{ monthLabel(currentMonthDate) }}</div>
      </div>
      <div class="metric metric--active">
        <button
          class="btn metric-active__btn"
          type="button"
          :disabled="isActiveToggleDisabled"
          @click="onToggleActive"
        >
          {{ activeToggleIcon }}
        </button>
        <div class="metric-active__info">
          <div class="metric-active__time mono">{{ activeTaskTime }}</div>
          <div class="metric-active__title" :title="activeTaskTitle">
            {{ activeTaskTitle }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatMs, formatMsS, toISODate, monthLabel, isRunning, totalForDate, totalForMonth } from '../helpers';

const props = defineProps({
  today: { type: Date, required: true },
  tasks: { type: Array, required: true },
  runningCount: { type: Number, required: true },
  tick: { type: Number, default: 0 },
});

const emit = defineEmits(['toggle-active-task']);

const currentMonthDate = computed(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

// Live totals (depend on tick so running timers update)
const todayTotal = computed(() => { props.tick; return totalForDate(props.tasks, props.today); });
const monthTotal = computed(() => { props.tick; return totalForMonth(props.tasks, currentMonthDate.value); });

const latestRunningTask = computed(() => {
  props.tick;
  let latest = null;
  for (const task of props.tasks) {
    if (!task || typeof task !== 'object') continue;
    if (!isRunning(task)) continue;
    const start = task.running?.start;
    if (typeof start !== 'number') continue;
    if (!latest || start > latest.start) {
      latest = {
        taskId: task.id,
        title: task.title || 'Без назви',
        start,
      };
    }
  }
  return latest;
});

const activeTaskTitle = computed(() => latestRunningTask.value?.title || 'Немає активних таймерів');

const activeTaskTime = computed(() => {
  props.tick;
  const task = latestRunningTask.value;
  if (!task) return '00:00:00';
  return formatMsS(Math.max(0, Date.now() - task.start));
});

const activeToggleIcon = computed(() => (latestRunningTask.value ? '⏸' : '▶︎'));

const isActiveToggleDisabled = computed(() => !latestRunningTask.value);

function onToggleActive() {
  const task = latestRunningTask.value;
  if (!task) return;
  emit('toggle-active-task', { taskId: task.taskId });
}
</script>

<style scoped>
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px;}
.metric{padding:16px;border-radius:14px;background:var(--muted);border:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.metric .k{font-size:20px;font-weight:700}
.metric .l{font-size:12px;color:var(--sub)}
.metric--active{flex-direction:row;align-items:center;gap:16px}
.metric-active__btn{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;font-size:24px;border-radius:16px}
.metric-active__btn:disabled{opacity:0.45;cursor:not-allowed}
.metric-active__info{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.metric-active__title{max-width:206px;font-weight:600;font-size:15px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.metric-active__time{font-size:18px;font-weight:600;color:var(--text)}
</style>
