<template>
  <div class="tabs card">
    <div class="tab" :class="{active: modelTab==='all'}" @click="modelTab='all'">Всі задачі</div>
    <div class="tab" :class="{active: modelTab==='archived'}" @click="modelTab='archived'">Архів</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ tab: { type: String, default: 'all' } });
const emit = defineEmits(['update:tab']);
const modelTab = computed({ get:()=>props.tab, set:v=>emit('update:tab', v) });
</script>

<style scoped>
.tabs{display:flex;gap:8px;margin: 14px 0;border-bottom:1px solid var(--line);padding:10px 12px}
.tab{padding:8px 12px;border-radius:999px;border:1px solid transparent;cursor:pointer;color:var(--sub)}
.tab.active{background:#12141a;border-color:var(--line);color:var(--text)}
</style>

