<template>
  <div class="card stack">
    <div class="toolbar">
      <div class="field">
        <label class="muted">Експорт (період):</label>
        <input type="date" v-model="modelExportStartStr"/>
        <span class="muted">–</span>
        <input type="date" v-model="modelExportEndStr"/>
        <button class="btn" @click="copyTSV">Копіювати TSV</button>
      </div>
    </div>
    <textarea ref="hiddenTA" style="position:absolute;left:-9999px;top:-9999px;height:1px;width:1px"></textarea>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { buildTaskTotalsForRange } from '../helpers';

const props = defineProps({
  exportStartStr: String,
  exportEndStr: String,
  tasks: { type: Array, required: true },
});
const emit = defineEmits(['update:exportStartStr','update:exportEndStr']);

const modelExportStartStr = computed({ get:()=>props.exportStartStr, set:v=>emit('update:exportStartStr', v) });
const modelExportEndStr = computed({ get:()=>props.exportEndStr, set:v=>emit('update:exportEndStr', v) });

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
.card{margin-top:14px;}
.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;}
.toolbar .field{display:flex;gap:8px;align-items:center}
</style>

