<template>
  <div class="modal export-modal" @click.self="emit('close')">
    <div class="dialog export-dialog">
      <div class="export-modal__header">
        <strong>Експорт (TSV)</strong>
        <button type="button" class="export-modal__close" aria-label="Закрити" @click="emit('close')">×</button>
      </div>
      <form class="export-form" @submit.prevent="copyTSV">
        <div class="export-form__row">
          <label class="export-form__field">
            <span>Початок періоду</span>
            <input type="date" v-model="modelExportStartStr" />
          </label>
          <label class="export-form__field">
            <span>Кінець періоду</span>
            <input type="date" v-model="modelExportEndStr" />
          </label>
        </div>
        <div class="export-form__actions">
          <button type="button" class="btn ghost" @click="emit('close')">Скасувати</button>
          <button class="btn primary" type="submit">Копіювати TSV</button>
        </div>
      </form>
    </div>
    <textarea ref="hiddenTA" style="position:absolute;left:-9999px;top:-9999px;height:1px;width:1px"></textarea>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { buildTaskTotalsForRange, toInputDate, firstDayOfMonth } from '../helpers';

const props = defineProps({
  exportStartStr: String,
  exportEndStr: String,
  tasks: { type: Array, required: true },
});
const emit = defineEmits(['update:exportStartStr','update:exportEndStr','close']);

const defaultStart = toInputDate(firstDayOfMonth(new Date()));
const defaultEnd = toInputDate(new Date());
const modelExportStartStr = computed({ get:()=>props.exportStartStr, set:v=>emit('update:exportStartStr', v) });
const modelExportEndStr = computed({ get:()=>props.exportEndStr, set:v=>emit('update:exportEndStr', v) });

watch(
  () => props.exportStartStr,
  (value) => {
    if (!value) emit('update:exportStartStr', defaultStart);
  },
  { immediate: true }
);

watch(
  () => props.exportEndStr,
  (value) => {
    if (!value) emit('update:exportEndStr', defaultEnd);
  },
  { immediate: true }
);

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
.export-modal{
  z-index: 35;
}

.export-dialog{
  width: min(420px, 100%);
}

.export-modal__header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.export-modal__close{
  border: none;
  background: transparent;
  color: var(--sub);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.export-modal__close:hover{
  color: var(--text);
}

.export-form{
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.export-form__row{
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.export-form__field{
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--sub);
}

.export-form__field input{
  width: 100%;
}

.export-form__actions{
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
