<template>
  <div class="card stack">
    <div class="toolbar">
      <div class="field">
        <label class="muted">День:</label>
        <input type="date" v-model="modelSelectedDateStr"/>
        <div class="chip mono">{{ formatMs(totalForDate(tasks, selectedDate)) }}</div>
      </div>
      <div class="field">
        <label class="muted">Місяць:</label>
        <input type="month" v-model="modelSelectedMonthStr"/>
        <div class="chip mono">{{ formatMs(totalForMonth(tasks, selectedMonthDate)) }}</div>
      </div>
      <div class="field">
        <label class="muted">Експорт (період):</label>
        <input type="date" v-model="modelExportStartStr"/>
        <span class="muted">–</span>
        <input type="date" v-model="modelExportEndStr"/>
        <button class="btn" @click="copyTSV">Копіювати TSV</button>
      </div>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="k mono">{{ formatMs(totalForDate(tasks, today)) }}</div>
        <div class="l">Сьогодні ({{ toISODate(today) }})</div>
      </div>
      <div class="metric">
        <div class="k mono">{{ formatMs(totalForMonth(tasks, selectedMonthDate)) }}</div>
        <div class="l">За {{ monthLabel(selectedMonthDate) }}</div>
      </div>
      <div class="metric">
        <div class="k mono">{{ runningCount }} запущено</div>
        <div class="l">Активні таймери</div>
      </div>
    </div>

    <!-- Hidden textarea for copy fallback -->
    <textarea ref="hiddenTA" style="position:absolute;left:-9999px;top:-9999px;height:1px;width:1px"></textarea>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { formatMs, toISODate, monthLabel, startOfDay, endOfDay } from '../helpers';
import { totalForDate, totalForMonth, buildRowsForRange, buildTaskTotalsForRange } from '../helpers';

const props = defineProps({
  selectedDateStr: String,
  selectedMonthStr: String,
  exportStartStr: String,
  exportEndStr: String,
  today: { type: Date, required: true },
  tasks: { type: Array, required: true },
  runningCount: { type: Number, required: true },
});
const emit = defineEmits(['update:selectedDateStr','update:selectedMonthStr','update:exportStartStr','update:exportEndStr']);

const modelSelectedDateStr = computed({ get:()=>props.selectedDateStr, set:v=>emit('update:selectedDateStr', v) });
const modelSelectedMonthStr = computed({ get:()=>props.selectedMonthStr, set:v=>emit('update:selectedMonthStr', v) });
const modelExportStartStr = computed({ get:()=>props.exportStartStr, set:v=>emit('update:exportStartStr', v) });
const modelExportEndStr = computed({ get:()=>props.exportEndStr, set:v=>emit('update:exportEndStr', v) });

const selectedDate = computed(()=> new Date(props.selectedDateStr + 'T00:00:00'));
const selectedMonthDate = computed(()=> new Date(props.selectedMonthStr + '-01T00:00:00'));

const hiddenTA = ref(null);

function exportRange(){
  const start = new Date(props.exportStartStr + 'T00:00:00').getTime();
  const end = new Date(props.exportEndStr + 'T23:59:59').getTime();
  if(end < start){ alert('Кінець періоду раніше початку'); }
  return {start, end};
}

function copyTSV(){
  const {start, end} = exportRange();
  const rows = buildTaskTotalsForRange(props.tasks, start, end);
  const lines = [];
  // Remove tabs, newlines, and semicolons from fields; tabs delimit cells
  const clean = s => String(s ?? '').replace(/[;\t\r\n]/g, ' ');
  for(const r of rows){
    const hours = Math.floor((r.ms/3600000)*100)/100;
    lines.push([clean(r.title), clean(r.link), clean(r.project), clean(r.type), hours].join('\t'));
  }
  const tsv = lines.join('\n');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(tsv).catch(()=>{
      const ta = hiddenTA.value; if(!ta) return alert('Не знайдено буфер для копіювання');
      ta.value = tsv; ta.select(); document.execCommand('copy');
    });
  } else {
    const ta = hiddenTA.value; if(!ta) return alert('Не знайдено буфер для копіювання');
    ta.value = tsv; ta.select(); document.execCommand('copy');
  }
  alert('Скопійовано у буфер — вставляйте в Google Sheets.');
}

</script>

<style scoped>
.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;}
.toolbar .field{display:flex;gap:8px;align-items:center}
.chips{display:flex;gap:8px;flex-wrap:wrap;}
.chip{padding:6px 10px;border-radius:999px;border:1px solid var(--line);background:#12141a;color:var(--sub);font-size:12px}
.chip.running{color:#22c55e;border-color:#22c55e}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding: 0 12px 12px;}
.metric{padding:16px;border-radius:14px;background:var(--muted);border:1px solid var(--line)}
.metric .k{font-size:20px;font-weight:700}
.metric .l{font-size:12px;color:var(--sub)}
</style>
