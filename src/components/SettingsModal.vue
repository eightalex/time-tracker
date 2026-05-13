<template>
  <div class="modal settings-modal" @click.self="emit('close')">
    <div class="dialog settings-dialog">
      <div class="settings-modal__header">
        <strong>Налаштування</strong>
        <button type="button" class="settings-modal__close" aria-label="Закрити" @click="emit('close')">×</button>
      </div>

      <div class="settings-actions">
        <label class="settings-field">
          <span>Коефіцієнт</span>
          <input
            type="text"
            inputmode="decimal"
            v-model="coefficientInputValue"
            @input="onCoefficientInput"
          />
        </label>
        <label class="settings-field settings-field--checkbox">
          <span>Застосувати до всіх записів</span>
          <input
            type="checkbox"
            :checked="timeCoefficientAppliesToAll"
            @change="emit('update:timeCoefficientAppliesToAll', $event.target.checked)"
          />
        </label>
        <label class="settings-field">
          <span>Вартість години, $</span>
          <input
            type="text"
            inputmode="decimal"
            v-model="hourlyRateInputValue"
            @input="onHourlyRateInput"
          />
        </label>
        <button type="button" class="settings-action" @click="emit('open-export-range')">
          <Icon name="upload" size="18" />
          <span>Експортувати в TSV</span>
        </button>
        <button type="button" class="settings-action" @click="emit('export-data')">
          <Icon name="download" size="18" />
          <span>Експортувати локальний бекап</span>
        </button>
        <button type="button" class="settings-action danger" @click="emit('clear-all')">
          <Icon name="trash" size="18" />
          <span>Очистити локальні дані</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Icon from './Icon.vue';

const emit = defineEmits(['close','open-export-range','export-data','clear-all','update:timeCoefficient','update:timeCoefficientAppliesToAll','update:hourlyRate']);
const props = defineProps({
  timeCoefficient: { type: Number, default: 1 },
  timeCoefficientAppliesToAll: { type: Boolean, default: false },
  hourlyRate: { type: Number, default: 0 },
});

const coefficientInputValue = ref(String(props.timeCoefficient));
const hourlyRateInputValue = ref(String(props.hourlyRate));

watch(
  () => props.timeCoefficient,
  (value) => {
    const normalized = String(value);
    if (Number.parseFloat(coefficientInputValue.value.replace(',', '.')) !== value) {
      coefficientInputValue.value = normalized;
    }
  }
);

watch(
  () => props.hourlyRate,
  (value) => {
    const normalized = String(value);
    if (Number.parseFloat(hourlyRateInputValue.value.replace(',', '.')) !== value) {
      hourlyRateInputValue.value = normalized;
    }
  }
);

function onCoefficientInput(event){
  const parsed = Number.parseFloat(String(event.target.value).replace(',', '.'));
  emit('update:timeCoefficient', Number.isFinite(parsed) && parsed >= 0 ? parsed : 1);
}

function onHourlyRateInput(event){
  const parsed = Number.parseFloat(String(event.target.value).replace(',', '.'));
  emit('update:hourlyRate', Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
}
</script>

<style scoped>
.settings-modal{
  z-index: 34;
}

.settings-dialog{
  width: min(420px, 100%);
}

.settings-modal__header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.settings-modal__close{
  border: none;
  background: transparent;
  color: var(--sub);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.settings-modal__close:hover{
  color: var(--text);
}

.settings-actions{
  display: grid;
  gap: 10px;
  padding: 24px;
}

.settings-field{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--sub);
  font-size: 13px;
}

.settings-field + .settings-action{
  margin-top: 10px;
}

.settings-field input{
  width: 92px;
  flex: 0 0 92px;
  padding: 9px 10px;
  text-align: right;
}

.settings-field--checkbox input{
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  padding: 0;
  text-align: initial;
  accent-color: var(--accent);
}

.settings-action{
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid var(--btn-border);
  background: linear-gradient(180deg, var(--btn-bg1), var(--btn-bg2));
  color: var(--text);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  text-align: left;
}

.settings-action:hover{
  filter: brightness(1.05);
}

.settings-action:active{
  transform: translateY(1px);
}

.settings-action:focus-visible{
  outline: 2px solid var(--accent-2);
  outline-offset: 2px;
}

.settings-action.danger{
  color: var(--danger);
}
</style>
