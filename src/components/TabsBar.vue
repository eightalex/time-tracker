<template>
  <div class="tabs card">
    <div class="tab" :class="{active: modelTab==='all'}" @click="modelTab='all'">Всі задачі</div>
    <div class="tab" :class="{active: modelTab==='recurring'}" @click="modelTab='recurring'">Постійні</div>
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
.tabs{
  display: flex;
  gap: 8px;
  margin: 14px 0;
  padding: 10px 12px
}

.tab{
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  color: var(--sub);
  font-size: 14px;
  user-select: none;
  transition: background .2s,border-color .2s,color .2s
}

.tab.active{
  background: var(--segment-active);
  color: var(--text)
}
</style>
