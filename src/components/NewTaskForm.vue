<template>
  <div class="card">
    <div class="toolbar">
      <strong>Нова задача</strong>
      <input class="grow" type="text" v-model="title" placeholder="Назва задачі" @keyup.enter="submit"/>
      <input type="url" v-model="link" placeholder="Посилання на Planka (необов'язково)"/>
      <input type="text" v-model="project" list="projectsList" placeholder="Проєкт"/>
      <datalist id="projectsList">
        <option v-for="p in knownProjects" :key="p" :value="p"></option>
      </datalist>
      <input type="text" v-model="type" list="typesList" placeholder="Тип проєкту"/>
      <datalist id="typesList">
        <option v-for="t in knownTypes" :key="t" :value="t"></option>
      </datalist>
      <button class="btn primary" @click="submit">Додати</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  knownProjects: { type: Array, default: () => [] },
  knownTypes: { type: Array, default: () => [] },
});
const emit = defineEmits(['add-task']);

const title = ref('');
const link = ref('');
const project = ref('');
const type = ref('');

function submit(){
  const t = (title.value||'').trim();
  if(!t) return alert('Вкажіть назву задачі');
  emit('add-task', { title: t, link: (link.value||'').trim(), project: (project.value||'').trim(), type: (type.value||'').trim() });
  title.value=''; link.value=''; project.value=''; type.value='';
}
</script>

<style scoped>
.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;}
.toolbar .field{display:flex;gap:8px;align-items:center}
</style>

