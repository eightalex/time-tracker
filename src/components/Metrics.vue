<template>
  <div class="card stack">
    <div class="metrics">
      <div class="metric">
        <div class="k mono">{{ formatMs(totalForDate(tasks, today)) }}</div>
        <div class="l">Сьогодні ({{ toISODate(today) }})</div>
      </div>
      <div class="metric">
        <div class="k mono">{{ formatMs(totalForMonth(tasks, currentMonthDate)) }}</div>
        <div class="l">За {{ monthLabel(currentMonthDate) }}</div>
      </div>
      <div class="metric">
        <div class="k mono">{{ runningCount }} запущено</div>
        <div class="l">Активні таймери</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatMs, toISODate, monthLabel } from '../helpers';
import { totalForDate, totalForMonth } from '../helpers';

const props = defineProps({
  today: { type: Date, required: true },
  tasks: { type: Array, required: true },
  runningCount: { type: Number, required: true },
});

const currentMonthDate = computed(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
</script>

<style scoped>
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px;}
.metric{padding:16px;border-radius:14px;background:var(--muted);border:1px solid var(--line)}
.metric .k{font-size:20px;font-weight:700}
.metric .l{font-size:12px;color:var(--sub)}
</style>

