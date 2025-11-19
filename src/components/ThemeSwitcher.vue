<template>
  <div class="theme-toggle" role="group" aria-label="Перемикач теми">
    <button
      class="theme-toggle__btn"
      :class="{ active: mode === 'light' }"
      @click="setMode('light')"
      title="Світла тема"
      aria-label="Світла тема"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.2" y1="4.2" x2="6.4" y2="6.4" />
          <line x1="17.6" y1="17.6" x2="19.8" y2="19.8" />
          <line x1="4.2" y1="19.8" x2="6.4" y2="17.6" />
          <line x1="17.6" y1="6.4" x2="19.8" y2="4.2" />
        </g>
      </svg>
    </button>
    <button
      class="theme-toggle__btn"
      :class="{ active: mode === 'auto' }"
      @click="setMode('auto')"
      title="Авто (системна)"
      aria-label="Авто (системна)"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <!-- monitor icon -->
        <rect x="3" y="4.5" rx="2" ry="2" width="18" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <rect x="7" y="8" width="10" height="5" fill="currentColor"/>
        <path d="M8 20h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <button
      class="theme-toggle__btn"
      :class="{ active: mode === 'dark' }"
      @click="setMode('dark')"
      title="Темна тема"
      aria-label="Темна тема"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <!-- moon -->
        <path d="M20 12.5a7.5 7.5 0 1 1-8.5-8.5 6 6 0 0 0 8.5 8.5z" fill="currentColor"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const STORAGE_KEY = 'time-tracker.theme';
const mode = ref('auto');

function applyTheme(next){
  const root = document.documentElement;
  if(next === 'auto'){
    root.removeAttribute('data-theme');
  }else{
    root.setAttribute('data-theme', next);
  }
}

function setMode(next){
  if(!['light','dark','auto'].includes(next)) return;
  mode.value = next;
  try{ localStorage.setItem(STORAGE_KEY, next); }catch(e){ /* noop */ }
  applyTheme(next);
}

onMounted(()=>{
  let saved = 'auto';
  try{ saved = localStorage.getItem(STORAGE_KEY) || 'auto'; }catch(e){ /* noop */ }
  if(!['light','dark','auto'].includes(saved)) saved = 'auto';
  mode.value = saved;
  applyTheme(saved);
});
</script>

<style scoped>
.theme-toggle{display:inline-flex;gap:2px;background:var(--muted);border:1px solid var(--line);border-radius:12px;padding:2px;align-items:center}
.theme-toggle__btn{appearance:none;border:1px solid transparent;background:transparent;color:var(--sub);padding:6px 8px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.theme-toggle__btn:hover{filter:brightness(1.08)}
.theme-toggle__btn:focus-visible{outline:2px solid var(--accent-2);outline-offset:1px}
.theme-toggle__btn.active{background:var(--surface);color:var(--text);border-color:var(--line)}
</style>

