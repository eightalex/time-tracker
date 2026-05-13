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
      <div class="settings-toggle">
        <button
          class="settings-toggle__btn"
          @click="$emit('open-settings')"
          title="Налаштування"
          aria-label="Відкрити налаштування"
        >
          <Icon name="gear" size="18" />
        </button>
      </div>
      <ThemeSwitcher />
    </div>
  </div>
</template>

<script setup>
import ThemeSwitcher from './ThemeSwitcher.vue';
import Icon from './Icon.vue';
const emit = defineEmits(['create-seed','open-settings']);
const props = defineProps({
  hasTasks: { type: Boolean, default: false },
});
</script>

<style scoped>
.header{display:flex;gap:18px;align-items:center;justify-content:space-between;margin-bottom:24px}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:36px;height:36px;border-radius:12px;background:conic-gradient(from 180deg, var(--accent), var(--accent-2));filter:saturate(110%);}
h1{font-size:22px;font-weight:700;margin:0;letter-spacing:.2px}
.settings-toggle{display:inline-flex;gap:2px;background:var(--muted);border:1px solid var(--line);border-radius:12px;padding:2px;align-items:center}
.settings-toggle__btn{appearance:none;border:1px solid transparent;background:transparent;color:var(--sub);padding:6px 8px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.settings-toggle__btn:hover{filter:brightness(1.08)}
.settings-toggle__btn:focus-visible{outline:2px solid var(--accent-2);outline-offset:1px}
</style>
