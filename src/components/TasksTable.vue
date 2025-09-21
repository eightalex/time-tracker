<template>
  <div class="card simple stack">
    <div class="tbody">
      <div v-if="orderedTasks.length===0" class="empty">Немає задач у цій вкладці.</div>
      <TransitionGroup v-else name="task-move" tag="div">
        <div
          v-for="task in orderedTasks"
          :key="task.id"
          class="task"
          :class="{ 'is-running': isRunning(task) }"
        >
        <div class="head row">
          <div class="title">
            <template v-if="!task._edit">
              <a v-if="task.link" :href="task.link" target="_blank" rel="noopener noreferrer">{{ task.title }}</a>
              <span v-else>{{ task.title }}</span>
            </template>
            <template v-else>
              <input type="text" v-model="task._draft.title"/>
            </template>
            <template v-if="task._edit">
              <input type="url" v-model="task._draft.link" placeholder="Посилання"/>
            </template>
          </div>
          <div class="chips">
            <span class="chip">ID: {{ task.id.slice(-6) }}</span>
            <span class="chip running" v-if="isRunning(task)">● Запущено</span>
          </div>
          <div class="controls">
            <button class="btn green" v-if="!isRunning(task) && !task._edit" @click="start(task)" title="Старт таймера">▶︎</button>
            <button class="btn grey" v-else-if="isRunning(task)" @click="stop(task)" title="Зупинити таймер">⏸</button>
            <button class="btn" v-if="!task._edit" @click="openEdit(task)">Редагувати</button>
            <button class="btn" v-else @click="saveEdit(task)">Зберегти</button>
            <button class="btn ghost" v-if="task._edit" @click="cancelEdit(task)">Скасувати</button>
            <button class="btn" v-if="!task.archived && !task._edit" @click="archive(task)">Архівувати</button>
            <button class="btn" v-if="task.archived && !task._edit" @click="unarchive(task)">Повернути</button>
            <button class="btn red" v-if="!task._edit" @click="emitRemove(task)">Видалити</button>
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

          <div class="mono nowrap">{{ formatMsS(totalForTaskOnDate(task, todayDate, nowTs)) }}</div>
          <div class="mono nowrap">{{ formatMsS(totalForTaskOverall(task, nowTs)) }}</div>
        </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { isRunning, formatMsS, totalForTaskOnDate, totalForTaskOverall, cryptoRandomId } from '../helpers';

const props = defineProps({
  filteredTasks: { type: Array, required: true },
  tick: { type: Number, default: 0 },
});
const emit = defineEmits(['remove-task']);

function openEdit(task){ task._edit=true; task._draft = { title:task.title, link:task.link, project:task.project, type:task.type }; }
function cancelEdit(task){ task._edit=false; task._draft=null; }
function saveEdit(task){ Object.assign(task, task._draft); task._edit=false; task._draft=null; }

function archive(task){ task.archived=true; stopIfRunning(task); }
function unarchive(task){ task.archived=false; }
function emitRemove(task){ if(confirm('Видалити задачу? Дію неможливо скасувати.')) emit('remove-task', task.id); }

function start(task){ props.filteredTasks.forEach(t=>{ if(isRunning(t)) stop(t); }); task.running = { start: Date.now() }; }
function stop(task){ if(!isRunning(task)) return; const start = new Date(task.running.start); const end = new Date(); const dur = Math.max(0, end - start); task.logs.push({ id: cryptoRandomId(), start: start.getTime(), end: end.getTime(), ms: dur }); task.running = null; }
function stopIfRunning(task){ if(isRunning(task)) stop(task); }

const orderedTasks = computed(()=> {
  return [...props.filteredTasks].sort((a, b) => Number(isRunning(b)) - Number(isRunning(a)));
});

// reactive "now" for live updates
const nowTs = computed(()=>{ props.tick; return Date.now(); });
// Always use today's date for per-day total, ignoring selectedDate
const todayDate = computed(()=> new Date());
</script>

<style scoped>
.chips{display:flex;gap:8px;flex-wrap:wrap;}
.chip{padding:6px 10px;border-radius:999px;border:1px solid var(--line);background:var(--segment-bg);color:var(--sub);font-size:12px}
.chip.running{color:#22c55e;border-color:#22c55e}
.task{background:var(--surface);border:1px solid var(--line)}
.task.is-running{margin-bottom: 16px;border-radius: var(--radius) !important;}
.task.is-running + .task{border-radius:var(--radius) var(--radius) 0 0;}
.task:first-child{border-radius:var(--radius) var(--radius) 0 0;}
.task:last-child{border-radius:0 0 var(--radius) var(--radius);}
.task .title{display:flex;gap:8px;width:100%;font-weight:600}
.task .title input{flex:1}
.task-move-enter-active,.task-move-leave-active{transition:opacity .3s all,transform .3s ease;}
.task-move-enter-from,.task-move-leave-to{opacity:0;transform:translateY(8px);}
.task-move-move{transition:transform .3s ease;}
</style>
