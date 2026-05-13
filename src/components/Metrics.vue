<template>
  <div class="card stack">
    <div class="metrics">
      <div class="metric">
        <div class="k mono">{{ formatMs(todayTotal) }}</div>
        <div v-if="showEarnings" class="metric__money mono">{{ formatUsd(earnedForMs(todayTotal, hourlyRate)) }}</div>
        <div class="l">Сьогодні ({{ toISODate(today) }})</div>
      </div>
      <div class="metric">
        <div class="k mono">{{ formatMs(monthTotal) }}</div>
        <div v-if="showEarnings" class="metric__money mono">{{ formatUsd(earnedForMs(monthTotal, hourlyRate)) }}</div>
        <div class="l">За {{ monthLabel(currentMonthDate) }}</div>
      </div>
      <div class="metric metric--active">
        <button
          :class="activeBtnClasses"
          type="button"
          :disabled="isActiveToggleDisabled"
          @click="onToggleActive"
        >
          <Icon :name="activeToggleIcon" size="40" />
        </button>
        <div class="metric-active__info">
          <div class="metric-active__time mono">{{ activeTaskTime }}</div>
          <div v-if="showEarnings && activeTaskMs" class="metric-active__money mono">
            {{ formatUsd(earnedForMs(activeTaskMs, hourlyRate)) }}
          </div>
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
import Icon from './Icon.vue';
import { adjustedLogMs, applyTimeCoefficient, earnedForMs, formatMs, formatMsS, formatUsd, shouldShowEarnings, toISODate, monthLabel, isRunning, totalForDate, totalForMonth } from '../helpers';

const props = defineProps({
  today: { type: Date, required: true },
  tasks: { type: Array, required: true },
  runningCount: { type: Number, required: true },
  tick: { type: Number, default: 0 },
  timeCoefficient: { type: Number, default: 1 },
  timeCoefficientAppliesToAll: { type: Boolean, default: false },
  hourlyRate: { type: Number, default: 0 },
});

const emit = defineEmits(['toggle-active-task']);

const currentMonthDate = computed(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

// Live totals (depend on tick so running timers update)
const coefficientOptions = computed(() => ({
  coefficient: props.timeCoefficient,
  applyToAll: props.timeCoefficientAppliesToAll,
}));
const todayTotal = computed(() => { props.tick; return totalForDate(props.tasks, props.today, coefficientOptions.value); });
const monthTotal = computed(() => { props.tick; return totalForMonth(props.tasks, currentMonthDate.value, coefficientOptions.value); });
const showEarnings = computed(() => shouldShowEarnings(props.hourlyRate));

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
        if (start > lastLogStart) {
          lastLogStart = start;
          lastLogCandidate = {
            taskId: task.id,
            title,
            start,
            isRunning: false,
            log,
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

const activeTaskMs = computed(() => {
  props.tick;
  const task = lastKnownTask.value;
  if (!task) return 0;
  if (task.isRunning) {
    return applyTimeCoefficient(Math.max(0, Date.now() - task.start), props.timeCoefficient);
  }
  return adjustedLogMs(task.log, coefficientOptions.value);
});

const activeTaskTime = computed(() => {
  return activeTaskMs.value ? formatMsS(activeTaskMs.value) : '00:00:00';
});

const activeToggleIcon = computed(() => (lastKnownTask.value?.isRunning ? 'pause' : 'play'));

const activeBtnClasses = computed(() => {
  const classes = ['btn', 'metric-active__btn'];
  if (lastKnownTask.value?.isRunning) {
    classes.push('primary');
  } else if (lastKnownTask.value) {
    classes.push('green');
  }
  return classes;
});

const isActiveToggleDisabled = computed(() => !lastKnownTask.value);

function onToggleActive() {
  const task = lastKnownTask.value;
  if (!task) return;
  emit('toggle-active-task', { taskId: task.taskId });
}
</script>

<style scoped>
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px;}
.metric{padding:16px;border-radius:14px;background:var(--input-bg);display:flex;flex-direction:column;justify-content:center;gap:8px}
.metric .k{font-size:20px;font-weight:700}
.metric__money{font-size:15px;font-weight:700;color:var(--accent)}
.metric .l{font-size:12px;color:var(--sub)}
.metric--active{flex-direction:row;align-items:center;gap:16px}
.metric-active__btn{display:inline-flex;align-items:center;justify-content:center;padding:0;width:56px;height:56px;font-size:24px;border:none;border-radius:50%}
.metric-active__btn svg {
    width: 40px;
    height: 40px;
}
.metric-active__btn:disabled{opacity:0.45;cursor:not-allowed}
.metric-active__info{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.metric-active__title{max-width:145px;font-weight:600;font-size:15px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.metric-active__time{font-size:18px;font-weight:600;color:var(--text)}
.metric-active__money{font-size:13px;font-weight:700;color:var(--accent)}
</style>
