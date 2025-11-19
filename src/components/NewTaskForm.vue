<template>
  <button
    class="btn new-task-fab"
    type="button"
    @click="openModal"
    title="Нова задача"
    aria-label="Додати нову задачу"
  >
    <Icon name="plus" size="28" />
  </button>

  <div v-if="isModalOpen" class="modal new-task-modal" @click.self="cancel">
    <div class="dialog new-task-dialog">
      <div class="new-task-modal__header">
        <strong>Нова задача</strong>
        <button type="button" class="new-task-modal__close" aria-label="Закрити" @click="cancel">×</button>
      </div>
      <form class="new-task-form" @submit.prevent="submit">
        <label class="new-task-form__field">
          <span>Назва задачі</span>
          <input ref="titleInput" type="text" v-model="title" placeholder="Наприклад, Дизайн лендингу" />
        </label>
        <label class="new-task-form__field">
          <span>Посилання</span>
          <input type="url" v-model="link" placeholder="Посилання на Planka (необов'язково)" />
        </label>
        <label class="new-task-form__field">
          <span>Проєкт</span>
          <input type="text" v-model="project" list="projectsList" placeholder="Назва проєкту" />
          <datalist id="projectsList">
            <option v-for="p in knownProjects" :key="p" :value="p"></option>
          </datalist>
        </label>
        <label class="new-task-form__field">
          <span>Тип проєкту</span>
          <input type="text" v-model="type" list="typesList" placeholder="Тип (комерційний, внутрішній...)" />
          <datalist id="typesList">
            <option v-for="t in knownTypes" :key="t" :value="t"></option>
          </datalist>
        </label>
        <div class="new-task-form__actions">
          <button type="button" class="btn ghost" @click="cancel">Скасувати</button>
          <button class="btn primary" type="submit">Додати задачу</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue';
import Icon from './Icon.vue';

defineProps({
  knownProjects: { type: Array, default: () => [] },
  knownTypes: { type: Array, default: () => [] },
});
const emit = defineEmits(['add-task']);

const title = ref('');
const link = ref('');
const project = ref('');
const type = ref('');
const isModalOpen = ref(false);
const titleInput = ref(null);

function openModal() {
  isModalOpen.value = true;
  nextTick(() => {
    titleInput.value?.focus();
  });
}

function closeModal() {
  isModalOpen.value = false;
}

function resetForm() {
  title.value = '';
  link.value = '';
  project.value = '';
  type.value = '';
}

function cancel() {
  resetForm();
  closeModal();
}

function submit() {
  const t = (title.value || '').trim();
  if (!t) return alert('Вкажіть назву задачі');
  emit('add-task', {
    title: t,
    link: (link.value || '').trim(),
    project: (project.value || '').trim(),
    type: (type.value || '').trim(),
  });
  resetForm();
  closeModal();
}
</script>

<style scoped>
.new-task-fab {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  box-shadow: 0 15px 30px rgba(15, 23, 42, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1a4fff, #173fd5);
  color: #ffffff;
  z-index: 25;
}

.new-task-fab:hover {
  filter: brightness(1.08);
}

.new-task-fab:active {
  transform: translateY(1px);
}

.new-task-modal {
  z-index: 30;
}

.new-task-dialog {
  width: min(520px, 100%);
}

.new-task-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.new-task-modal__close {
  border: none;
  background: transparent;
  color: var(--sub);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.new-task-modal__close:hover {
  color: var(--text);
}

.new-task-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.new-task-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--sub);
}

.new-task-form__field input {
  width: 100%;
}

.new-task-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .new-task-fab {
    right: 16px;
    bottom: 16px;
    width: 56px;
    height: 56px;
  }
}
</style>
