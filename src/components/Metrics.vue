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
import { computed, ref, watch } from 'vue';
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

const lastKnownTask = ref(null);

watch(
  () => props.tasks,
  (tasks) => {
    refreshLastKnown(tasks);
  },
  { deep: true, immediate: true }
);

function refreshLastKnown(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  let runningCandidate = null;
  let runningStart = -Infinity;
  let lastLogCandidate = null;
  let lastLogStart = -Infinity;

  for (const task of list) {
    if (!task || typeof task !== 'object') continue;
    const title = task.title || 'Без назви';
    if (isRunning(task)) {
      const start = task.running?.start;
      if (typeof start === 'number' && start > runningStart) {
        runningStart = start;
        runningCandidate = {
          taskId: task.id,
          title,
          start,
          isRunning: true,
        };
      }
    }
    if (Array.isArray(task.logs)) {
      for (const log of task.logs) {
        const start = typeof log?.start === 'number' ? log.start : null;
        if (start === null) continue;
        const end = typeof log?.end === 'number' ? log.end : start;
        const duration = typeof log?.ms === 'number' ? log.ms : Math.max(0, end - start);
        if (start > lastLogStart) {
          lastLogStart = start;
          lastLogCandidate = {
            taskId: task.id,
            title,
            start,
            isRunning: false,
            duration,
          };
        }
      }
    }
  }

  if (runningCandidate) {
    lastKnownTask.value = runningCandidate;
  } else if (lastLogCandidate) {
    lastKnownTask.value = lastLogCandidate;
  } else {
    lastKnownTask.value = null;
  }
}

const activeTaskTitle = computed(() => lastKnownTask.value?.title || 'Немає активних таймерів');

const activeTaskTime = computed(() => {
  props.tick;
  const task = lastKnownTask.value;
  if (!task) return '00:00:00';
  if (task.isRunning) {
    return formatMsS(Math.max(0, Date.now() - task.start));
  }
  return formatMsS(task.duration ?? 0);
});

const activeToggleIcon = computed(() => (lastKnownTask.value?.isRunning ? '⏸' : '▶︎'));

const isActiveToggleDisabled = computed(() => !lastKnownTask.value);

function onToggleActive() {
  const task = lastKnownTask.value;
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
