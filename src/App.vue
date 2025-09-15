<template>
  <div class="container" v-cloak>
    <div class="header">
      <div class="brand">
        <div class="logo"></div>
        <h1>Трекер часу</h1>
      </div>
      <div class="row">
        <button class="btn ghost" @click="createSeed">+ Швидко додати демо</button>
        <button class="btn ghost" @click="clearAll" title="Очистити локальні дані">Очистити</button>
      </div>
    </div>

    <div class="card stack">
      <div class="toolbar">
        <div class="field">
          <label class="muted">День:</label>
          <input type="date" v-model="selectedDateStr"/>
          <div class="chip mono">{{ formatMs(totalForDate(selectedDate)) }}</div>
        </div>
        <div class="field">
          <label class="muted">Місяць:</label>
          <input type="month" v-model="selectedMonthStr"/>
          <div class="chip mono">{{ formatMs(totalForMonth(selectedMonthDate)) }}</div>
        </div>
        <div class="field">
          <label class="muted">Експорт (період):</label>
          <input type="date" v-model="exportStartStr"/>
          <span class="muted">–</span>
          <input type="date" v-model="exportEndStr"/>
          <button class="btn" @click="copyTSV">Копіювати TSV</button>
          <button class="btn" @click="downloadCSV">Завантажити CSV</button>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="k mono">{{ formatMs(todayMs) }}</div>
          <div class="l">Сьогодні ({{ toISODate(today) }})</div>
        </div>
        <div class="metric">
          <div class="k mono">{{ formatMs(monthMs) }}</div>
          <div class="l">За {{ monthLabel(selectedMonthDate) }}</div>
        </div>
        <div class="metric">
          <div class="k mono">{{ runningCount }} запущено</div>
          <div class="l">Активні таймери</div>
        </div>
      </div>
    </div>

    <div class="hr"></div>

    <div class="card">
      <div class="toolbar">
        <strong>Нова задача</strong>
        <input class="grow" type="text" v-model="form.title" placeholder="Назва задачі" @keyup.enter="addTask"/>
        <input type="url" v-model="form.link" placeholder="Посилання на Planka (необов'язково)"/>
        <input type="text" v-model="form.project" list="projectsList" placeholder="Проєкт"/>
        <datalist id="projectsList">
          <option v-for="p in knownProjects" :key="p" :value="p"></option>
        </datalist>
        <input type="text" v-model="form.type" list="typesList" placeholder="Тип проєкту"/>
        <datalist id="typesList">
          <option v-for="t in knownTypes" :key="t" :value="t"></option>
        </datalist>
        <button class="btn primary" @click="addTask">Додати</button>
      </div>
    </div>

    <div class="tabs card">
      <div class="tab" :class="{active: tab==='all'}" @click="tab='all'">Всі задачі</div>
      <div class="tab" :class="{active: tab==='archived'}" @click="tab='archived'">Архів</div>
    </div>

    <div class="card stack">
      <div class="tbody">
        <div v-if="filteredTasks.length===0" class="empty">Немає задач у цій вкладці.</div>
        <div v-for="task in filteredTasks" :key="task.id" class="task">
          <div class="head row">
            <div class="title">
              <template v-if="!task._edit">
                <a v-if="task.link" :href="task.link" target="_blank" rel="noopener noreferrer">{{ task.title }}</a>
                <span v-else>{{ task.title }}</span>
              </template>
              <template v-else>
                <input type="text" v-model="task._draft.title"/>
              </template>
            </div>
            <div class="chips">
              <span class="chip" v-if="!task._edit">ID: {{ task.id.slice(-6) }}</span>
              <span class="chip running" v-if="isRunning(task)">● Запущено</span>
              <template v-if="task._edit">
                <input type="url" v-model="task._draft.link" placeholder="Посилання"/>
              </template>
            </div>
            <div class="controls">
              <button class="btn green" v-if="!isRunning(task) && !task._edit" @click="start(task)" title="Старт таймера">▶︎</button>
              <button class="btn" v-else-if="isRunning(task)" @click="stop(task)" title="Зупинити таймер">⏸</button>
              <button class="btn" v-if="!task._edit" @click="openEdit(task)">Редагувати</button>
              <button class="btn" v-else @click="saveEdit(task)">Зберегти</button>
              <button class="btn ghost" v-if="task._edit" @click="cancelEdit(task)">Скасувати</button>
              <button class="btn" v-if="!task.archived && !task._edit" @click="archive(task)">Архівувати</button>
              <button class="btn" v-if="task.archived && !task._edit" @click="unarchive(task)">Повернути</button>
              <button class="btn red" v-if="!task._edit" @click="remove(task)">Видалити</button>
            </div>
          </div>
          <div class="thead grid">
            <div>Проєкт</div>
            <div class="hide-sm">Тип проєкту</div>
            <div class="nowrap">Сьогодні</div>
            <div class="nowrap">За увесь час</div>
          </div>
          <div class="row grid">
            <div class="hide-sm">
              <template v-if="!task._edit">{{ task.project || '—' }}</template>
              <template v-else>
                <input type="text" v-model="task._draft.project" list="projectsList"/>
              </template>
            </div>
            <div class="hide-sm">
              <template v-if="!task._edit">{{ task.type || '—' }}</template>
              <template v-else>
                <input type="text" v-model="task._draft.type" list="typesList"/>
              </template>
            </div>
            <div class="mono nowrap">{{ formatMsS(totalForTaskOnDate(task, selectedDate)) }}</div>
            <div class="mono nowrap">{{ formatMsS(totalForTaskOverall(task)) }}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="muted">Всього задач: {{ filteredTasks.length }}</div>
        <div class="muted">Збереження: LocalStorage</div>
      </div>
    </div>

    <textarea ref="hiddenTA" style="position:absolute;left:-9999px;top:-9999px;height:1px;width:1px"></textarea>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, toRefs, ref } from 'vue';

// ---------- Helpers ----------
function uniq(arr){ return Array.from(new Set(arr)); }
function cryptoRandomId(){
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
function firstDayOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function lastDayOfMonth(d){ const x=new Date(d); x.setMonth(x.getMonth()+1,0); x.setHours(23,59,59,999); return x; }
function prevMonth(d){ const x=new Date(d); x.setMonth(x.getMonth()-1, 1); return x; }
function toInputDate(d){ return d.toISOString().slice(0,10); }
function toInputMonth(d){ return d.toISOString().slice(0,7); }
function toISODate(d){ return d.toISOString().slice(0,10); }
function monthLabel(d){ return d.toLocaleDateString('uk-UA', { month:'long', year:'numeric' }); }
function formatMs(ms){
  const sign = ms<0?'-':''; ms = Math.abs(ms)|0;
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  return sign + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function formatMsS(ms){
  const sign = ms<0?'-':''; ms = Math.abs(ms)|0;
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
  return sign + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function toHHMM(ms){ const h = Math.floor(ms/3600000), m = Math.round((ms%3600000)/60000); return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
function overlapMs(a0,a1,b0,b1){ const s=Math.max(a0,b0), e=Math.min(a1,b1); return Math.max(0, e-s); }
function midpointWithin(a0,a1,b0,b1){ const s=Math.max(a0,b0), e=Math.min(a1,b1); return s + Math.floor((e-s)/2); }
function csvSafe(v){
  const s = (v==null?'':String(v));
  if(/[",\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function isRunning(task){ return !!task.running; }

const STORAGE_KEY = 'time-tracker.v1';
const state = reactive({
  tasks: [],
  tab: 'all',
  form: { title:'', link:'', project:'', type:'' },
  selectedDateStr: toInputDate(new Date()),
  selectedMonthStr: toInputMonth(prevMonth(new Date())),
  exportStartStr: toInputDate(firstDayOfMonth(prevMonth(new Date()))),
  exportEndStr: toInputDate(lastDayOfMonth(prevMonth(new Date()))),
  tick: 0,
});
const hiddenTA = ref(null);

const selectedDate = computed(()=> new Date(state.selectedDateStr + 'T00:00:00'));
const selectedMonthDate = computed(()=> new Date(state.selectedMonthStr + '-01T00:00:00'));
const today = new Date();
const knownProjects = computed(()=> uniq(state.tasks.map(t=>t.project).filter(Boolean)).sort());
const knownTypes = computed(()=> uniq(state.tasks.map(t=>t.type).filter(Boolean)).sort());
const filteredTasks = computed(()=> state.tasks.filter(t=> state.tab==='archived' ? t.archived : !t.archived));
const runningCount = computed(()=> state.tasks.filter(isRunning).length);
const todayMs = computed(()=> totalForDate(today));
const monthMs = computed(()=> totalForMonth(selectedMonthDate.value));

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

function downloadCSV(){
  const {start, end} = exportRange();
  const rows = buildRowsForRange(start, end);
  const header = ['Date','Task','Project','Type','Minutes','HH:MM','Link'];
  const lines = [header.join(',')];
  for(const r of rows){ const vals = [r.date, r.title, r.project, r.type, Math.round(r.ms/60000), toHHMM(r.ms), r.link].map(csvSafe); lines.push(vals.join(',')); }
  const csv = lines.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `time-export-${state.exportStartStr}_to_${state.exportEndStr}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportRange(){ const start = new Date(state.exportStartStr + 'T00:00:00').getTime(); const end = new Date(state.exportEndStr + 'T23:59:59').getTime(); if(end < start){ alert('Кінець періоду раніше початку'); } return {start, end}; }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify({tasks: state.tasks})); }
function load(){ try{ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return; const data = JSON.parse(raw); if(Array.isArray(data.tasks)) state.tasks = data.tasks; }catch(e){ console.warn('Load failed', e); } }
function createSeed(){ if(!confirm('Додати кілька демо-задач?')) return; const now = Date.now(); const p = (title, project, type) => ({ id: cryptoRandomId(), title, link:'', project, type, archived:false, logs:[], running:null, createdAt: now }); const a = p('TB: виправити помилку ACF','Traffic Bureau','dev'); const b = p('Planka: валідація форм','Internal','dev'); const c = p('Рефакторинг таблиць','Mezha','frontend'); const lastM = prevMonth(new Date()); const lastMStart = firstDayOfMonth(lastM).getTime(); const day1 = lastMStart + 3*86400000 + 9*3600000; const day2 = lastMStart + 10*86400000 + 14*3600000; a.logs.push({id:cryptoRandomId(), start:day1, end: day1+2*3600000, ms:2*3600000}); b.logs.push({id:cryptoRandomId(), start:day2, end: day2+90*60000, ms:90*60000}); const todayStart = startOfDay(new Date()).getTime()+10*3600000; c.logs.push({id:cryptoRandomId(), start:todayStart, end: todayStart+75*60000, ms:75*60000}); state.tasks.unshift(a,b,c); save(); }
function clearAll(){ if(confirm('Очистити всі локальні дані?')) { localStorage.removeItem(STORAGE_KEY); state.tasks=[]; } }

setInterval(()=> state.tick++, 1000);
watch(()=>state.tasks, save, {deep:true});
onMounted(()=>{ load(); });

// expose to template (script setup auto-exposes)
const { tasks, tab, form, selectedDateStr, selectedMonthStr, exportStartStr, exportEndStr } = toRefs(state);
</script>

