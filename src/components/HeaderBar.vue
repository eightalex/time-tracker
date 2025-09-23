<template>
  <div class="header">
    <div class="brand">
      <div class="logo"></div>
      <h1>Трекер часу</h1>
    </div>
    <div class="row">
      <button
        v-if="!hasTasks"
        class="btn ghost"
        @click="$emit('create-seed')"
      >
        + Швидко додати демо
      </button>
      <button class="btn ghost" @click="$emit('clear-all')" title="Очистити локальні дані">Очистити</button>
      <ThemeSwitcher />
    </div>
  </div>
</template>

<script setup>
import ThemeSwitcher from './ThemeSwitcher.vue';
const emit = defineEmits(['create-seed','clear-all']);
const props = defineProps({
  hasTasks: { type: Boolean, default: false },
});
</script>

<style scoped>
.header{display:flex;gap:18px;align-items:center;justify-content:space-between;margin-bottom:24px}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:36px;height:36px;border-radius:12px;background:conic-gradient(from 180deg, var(--accent), var(--accent-2));filter:saturate(110%);}
h1{font-size:22px;font-weight:700;margin:0;letter-spacing:.2px}
</style>
