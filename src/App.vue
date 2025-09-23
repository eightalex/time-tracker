<template>
  <div class="container" v-cloak>
    <HeaderBar @create-seed="createSeed" @clear-all="clearAll" />

    <Metrics
      :today="today"
      :tasks="tasks"
      :running-count="runningCount"
      :tick="tick"
    />

    <Export
      v-model:exportStartStr="exportStartStr"
      v-model:exportEndStr="exportEndStr"
      :tasks="tasks"
    />

    <div class="hr"></div>

    <div class="section-switcher card">
      <button
        class="section-switcher__btn"
        :class="{ active: section === 'tasks' }"
        @click="setSection('tasks')"
      >
        Задачі
      </button>
      <button
        class="section-switcher__btn"
        :class="{ active: section === 'entries' }"
        @click="setSection('entries')"
      >
        Записи часу
      </button>
    </div>

    <template v-if="section === 'tasks'">
      <NewTaskForm :known-projects="knownProjects" :known-types="knownTypes" @add-task="onAddTask" />

      <TabsBar v-model:tab="tab" />

      <TasksTable :filtered-tasks="filteredTasks" :tick="tick" @remove-task="onRemoveTask" />
    </template>

    <TimeEntries
      v-else
      :entries="entriesForSelectedDate"
      :date-str="entriesDateStr"
      :total-ms="entriesTotalForSelectedDate"
      @update-date="onEntriesDateChange"
      @update-entry="onUpdateEntry"
      @remove-entry="onRemoveEntry"
    />
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, toRefs, ref } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import Metrics from './components/Metrics.vue';
import Export from './components/Export.vue';
import NewTaskForm from './components/NewTaskForm.vue';
import TabsBar from './components/TabsBar.vue';
import TasksTable from './components/TasksTable.vue';
import TimeEntries from './components/TimeEntries.vue';

import {
  uniq,
  cryptoRandomId,
  prevMonth,
  firstDayOfMonth,
  lastDayOfMonth,
  toInputDate,
  toInputMonth,
  startOfDay,
  endOfDay,
  overlapMs,
  toISODate,
  midpointWithin,
  isRunning,
} from './helpers';

const STORAGE_KEY = 'time-tracker.v1';
const state = reactive({
  tasks: [],
  tab: 'all',
  section: 'tasks',
  exportStartStr: toInputDate(firstDayOfMonth(prevMonth(new Date()))),
  exportEndStr: toInputDate(lastDayOfMonth(prevMonth(new Date()))),
  entriesDateStr: toInputDate(new Date()),
  tick: 0,
});

const today = ref(new Date());
const knownProjects = computed(() => uniq(state.tasks.map((t) => t.project).filter(Boolean)).sort());
const knownTypes = computed(() => uniq(state.tasks.map((t) => t.type).filter(Boolean)).sort());
const filteredTasks = computed(() => state.tasks.filter((t) => (state.tab === 'archived' ? t.archived : !t.archived)));
const runningCount = computed(() => state.tasks.filter((t) => !!t.running).length);
watch(
  () => state.tick,
  () => {
    const now = new Date();
    const last = today.value;
    if (
      now.getFullYear() !== last.getFullYear() ||
      now.getMonth() !== last.getMonth() ||
      now.getDate() !== last.getDate()
    ) {
      today.value = now;
    }
  },
  { immediate: true }
);
const entriesForSelectedDate = computed(() => {
  const dateStr = state.entriesDateStr;
  if (!dateStr) return [];
  const selectedDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) return [];
  const dayStart = startOfDay(selectedDate).getTime();
  const dayEnd = endOfDay(selectedDate).getTime();
  const rows = [];
  for (const task of state.tasks) {
    if (!Array.isArray(task.logs)) continue;
    for (const log of task.logs) {
      const start = typeof log.start === 'number' ? log.start : null;
      const end = typeof log.end === 'number' ? log.end : null;
      if (start === null || end === null) continue;
      if (overlapMs(start, end, dayStart, dayEnd) <= 0) continue;
      const ms = typeof log.ms === 'number' ? log.ms : Math.max(0, end - start);
      rows.push({
        taskId: task.id,
        logId: log.id,
        taskTitle: task.title,
        project: task.project || '',
        type: task.type || '',
        start,
        end,
        ms,
      });
    }
  }
  return rows.sort((a, b) => a.start - b.start);
});
const entriesTotalForSelectedDate = computed(() => {
  const dateStr = state.entriesDateStr;
  if (!dateStr) return 0;
  const selectedDate = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) return 0;
  return totalForDate(selectedDate);
});

function setSection(nextSection) {
  state.section = nextSection;
}

function onEntriesDateChange(value) {
  state.entriesDateStr = value || toInputDate(new Date());
}

function onUpdateEntry(payload) {
  if (!payload) return;
  const { taskId, logId, start, end } = payload;
  if (typeof start !== 'number' || typeof end !== 'number') return;
  if (end < start) {
    alert('Час завершення не може бути раніше за час початку.');
    return;
  }
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const log = task.logs?.find((l) => l.id === logId);
  if (!log) return;
  log.start = start;
  log.end = end;
  log.ms = Math.max(0, end - start);
  save();
}

function onRemoveEntry(payload) {
  if (!payload) return;
  const { taskId, logId } = payload;
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (!confirm('Видалити запис часу? Дію неможливо скасувати.')) return;
  task.logs = task.logs.filter((log) => log.id !== logId);
  save();
}

function addTask(){
  const f = state.form;
  const title = (f.title||'').trim();
  if(!title) return alert('Вкажіть назву задачі');
  const task = {
    id: cryptoRandomId(), title, link: (f.link||'').trim(), project: (f.project||'').trim(), type: (f.type||'').trim(),
    archived: false, logs: [], running: null, createdAt: Date.now()
  };
  state.tasks.unshift(task);
  state.form = { title:'', link:'', project:'', type:'' };
  save();
}

function openEdit(task){ task._edit=true; task._draft = { title:task.title, link:task.link, project:task.project, type:task.type }; }
function cancelEdit(task){ task._edit=false; task._draft=null; }
function saveEdit(task){ Object.assign(task, task._draft); task._edit=false; task._draft=null; save(); }

function archive(task){ task.archived=true; stopIfRunning(task); save(); }
function unarchive(task){ task.archived=false; save(); }
function remove(task){ if(!confirm('Видалити задачу? Дію неможливо скасувати.')) return; stopIfRunning(task); state.tasks = state.tasks.filter(t=>t.id!==task.id); save(); }

function start(task){ state.tasks.forEach(t=>{ if(isRunning(t)) stop(t); }); task.running = { start: Date.now() }; }
function stop(task){ if(!isRunning(task)) return; const start = new Date(task.running.start); const end = new Date(); const dur = Math.max(0, end - start); task.logs.push({ id: cryptoRandomId(), start: start.getTime(), end: end.getTime(), ms: dur }); task.running = null; save(); }
function stopIfRunning(task){ if(isRunning(task)) stop(task); }

function totalForDate(dateObj){ const d0 = startOfDay(dateObj).getTime(); const d1 = endOfDay(dateObj).getTime(); let sum = 0; for(const t of state.tasks){ sum += taskTotalInRange(t, d0, d1); } return sum + runningOverlapInRange(d0, d1); }
function totalForMonth(monthDate){ const m0 = firstDayOfMonth(monthDate).getTime(); const m1 = lastDayOfMonth(monthDate).getTime(); let sum = 0; for(const t of state.tasks){ sum += taskTotalInRange(t, m0, m1); } return sum + runningOverlapInRange(m0, m1); }
function totalForTaskOnDate(task, dateObj){ const d0 = startOfDay(dateObj).getTime(); const d1 = endOfDay(dateObj).getTime(); const now = Date.now(); state.tick; return taskTotalInRange(task, d0, d1) + (isRunning(task) ? overlapMs(task.running.start, now, d0, d1) : 0); }
function totalForTaskInMonth(task, monthDate){ const m0 = firstDayOfMonth(monthDate).getTime(); const m1 = lastDayOfMonth(monthDate).getTime(); return taskTotalInRange(task, m0, m1) + (isRunning(task) ? overlapMs(task.running.start, Date.now(), m0, m1) : 0); }
function totalForTaskOverall(task){ let sum = 0; for(const log of task.logs){ sum += (typeof log.ms === 'number') ? log.ms : Math.max(0, (log.end||0) - (log.start||0)); } if(isRunning(task)){ state.tick; sum += Date.now() - task.running.start; } return sum; }
function taskTotalInRange(task, r0, r1){ let sum = 0; for(const log of task.logs){ sum += overlapMs(log.start, log.end, r0, r1); } return sum; }
function runningOverlapInRange(r0, r1){ let sum = 0; for(const t of state.tasks){ if(isRunning(t)) sum += overlapMs(t.running.start, Date.now(), r0, r1); } return sum; }

function buildRowsForRange(startTs, endTs){
  const map = new Map();
  const clamp0 = startOfDay(new Date(startTs)).getTime();
  const clamp1 = endOfDay(new Date(endTs)).getTime();
  for(const t of state.tasks){
    for(const log of t.logs){ const ov = overlapMs(log.start, log.end, clamp0, clamp1); if(ov>0){ const dayKey = toISODate(new Date(midpointWithin(log.start, log.end, clamp0, clamp1))); const key = `${dayKey}__${t.id}`; const cur = map.get(key) || {date: dayKey, title: t.title, project: t.project||'', type: t.type||'', link: t.link||'', ms:0}; cur.ms += ov; map.set(key, cur); } }
    if(isRunning(t)){ const ov = overlapMs(t.running.start, Date.now(), clamp0, clamp1); if(ov>0){ const dayKey = toISODate(new Date(midpointWithin(t.running.start, Date.now(), clamp0, clamp1))); const key = `${dayKey}__${t.id}`; const cur = map.get(key) || {date: dayKey, title: t.title, project: t.project||'', type: t.type||'', link: t.link||'', ms:0}; cur.ms += ov; map.set(key, cur); } }
  }
  const rows = Array.from(map.values()).sort((a,b)=> (a.date<b.date?-1:a.date>b.date?1: (a.title.localeCompare(b.title))));
  return rows;
}
function buildTaskTotalsForRange(startTs, endTs){
  const clamp0 = startOfDay(new Date(startTs)).getTime();
  const clamp1 = endOfDay(new Date(endTs)).getTime();
  const rows = [];
  for(const t of state.tasks){
    let ms = taskTotalInRange(t, clamp0, clamp1);
    if(isRunning(t)) ms += overlapMs(t.running.start, Date.now(), clamp0, clamp1);
    if(ms>0) rows.push({ title: t.title||'', link: t.link||'', project: t.project||'', type: t.type||'', ms });
  }
  return rows.sort((a,b)=> a.title.localeCompare(b.title));
}

function copyTSV(){
  const {start, end} = exportRange();
  const rows = buildTaskTotalsForRange(start, end);
  const lines = [];
  const clean = s => String(s ?? '').replace(/;/g, '');
  for(const r of rows){ const hours = Math.floor((r.ms/3600000)*100)/100; lines.push([clean(r.title), clean(r.link), clean(r.project), clean(r.type), hours].join(';')); }
  const tsv = lines.join('\n');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(tsv).catch(()=>{ const ta = hiddenTA.value; if(!ta) return alert('Не знайдено буфер для копіювання'); ta.value = tsv; ta.select(); document.execCommand('copy'); });
  } else {
    const ta = hiddenTA.value; if(!ta) return alert('Не знайдено буфер для копіювання'); ta.value = tsv; ta.select(); document.execCommand('copy');
  }
  alert('Скопійовано у буфер — вставляйте в Google Sheets.');
}


function onAddTask(payload){
  const task = { id: cryptoRandomId(), title: payload.title, link: payload.link, project: payload.project, type: payload.type, archived: false, logs: [], running: null, createdAt: Date.now() };
  state.tasks.unshift(task); save();
}
function onRemoveTask(id){ state.tasks = state.tasks.filter(t=> t.id !== id); save(); }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify({tasks: state.tasks})); }
function load(){ try{ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return; const data = JSON.parse(raw); if(Array.isArray(data.tasks)) state.tasks = data.tasks; }catch(e){ console.warn('Load failed', e); } }
function createSeed(){ if(!confirm('Додати кілька демо-задач?')) return; const now = Date.now(); const p = (title, project, type) => ({ id: cryptoRandomId(), title, link:'', project, type, archived:false, logs:[], running:null, createdAt: now }); const a = p('TB: виправити помилку ACF','Traffic Bureau','dev'); const b = p('Planka: валідація форм','Internal','dev'); const c = p('Рефакторинг таблиць','Mezha','frontend'); const lastM = prevMonth(new Date()); const lastMStart = firstDayOfMonth(lastM).getTime(); const day1 = lastMStart + 3*86400000 + 9*3600000; const day2 = lastMStart + 10*86400000 + 14*3600000; a.logs.push({id:cryptoRandomId(), start:day1, end: day1+2*3600000, ms:2*3600000}); b.logs.push({id:cryptoRandomId(), start:day2, end: day2+90*60000, ms:90*60000}); const today = new Date(); today.setHours(10,0,0,0); const todayStart = today.getTime(); c.logs.push({id:cryptoRandomId(), start:todayStart, end: todayStart+75*60000, ms:75*60000}); state.tasks.unshift(a,b,c); save(); }
function clearAll(){ if(confirm('Очистити всі локальні дані?')) { localStorage.removeItem(STORAGE_KEY); state.tasks=[]; } }

setInterval(()=> state.tick++, 1000);
watch(()=>state.tasks, save, {deep:true});
onMounted(()=>{ load(); });

// expose to template
const { tasks, tab, section, exportStartStr, exportEndStr, entriesDateStr, tick } = toRefs(state);

// ---- Browser title: show running timer HH:MM ----
const defaultTitle = document.title;
const runningTask = computed(()=> state.tasks.find(t=> !!t.running) || null);
function formatHm(ms){ ms = Math.max(0, ms|0); const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000); return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
watch([runningTask, tick], ()=>{
  const rt = runningTask.value;
  if(rt && rt.running){ document.title = formatHm(Date.now() - rt.running.start); }
  else { document.title = defaultTitle; }
}, { immediate: true });
</script>
