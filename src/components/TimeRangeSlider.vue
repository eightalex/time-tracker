<template>
  <div class="trs" ref="rootRef">
    <div class="trs__track" @pointerdown="onTrackDown">
      <div
        v-for="(block, i) in occupiedBlocks"
        :key="i"
        class="trs__occupied"
        :style="block.style"
        :title="block.title"
      ></div>
      <div class="trs__range" :style="rangeStyle"></div>
    </div>
    <div class="trs__hours" aria-hidden="true">
      <span
        v-for="mark in hourMarks"
        :key="mark.value"
        class="trs__hour"
        :class="{ 'is-major': mark.major }"
        :style="{ left: mark.pct + '%' }"
      >
        <span class="trs__hour-tick"></span>
        <span v-if="mark.label" class="trs__hour-label">{{ mark.label }}</span>
      </span>
    </div>
    <button
      type="button"
      class="trs__thumb trs__thumb--from"
      :style="{ left: fromPct + '%' }"
      :aria-label="`Початок: ${formatTime(from)}`"
      :aria-valuenow="from"
      :aria-valuemin="min"
      :aria-valuemax="to"
      role="slider"
      @pointerdown.stop="startDrag('from', $event)"
      @keydown="onKeyDown('from', $event)"
    >
      <span class="trs__bubble">{{ formatTime(from) }}</span>
    </button>
    <button
      type="button"
      class="trs__thumb trs__thumb--to"
      :style="{ left: toPct + '%' }"
      :aria-label="`Завершення: ${formatTime(to)}`"
      :aria-valuenow="to"
      :aria-valuemin="from"
      :aria-valuemax="max"
      role="slider"
      @pointerdown.stop="startDrag('to', $event)"
      @keydown="onKeyDown('to', $event)"
    >
      <span class="trs__bubble">{{ formatTime(to) }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const props = defineProps({
  from: { type: Number, required: true },
  to: { type: Number, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 60000 },
  occupied: {
    type: Array,
    default: () => [],
    // [{ start: number, end: number, title?: string }]
  },
});

const emit = defineEmits(['update:from', 'update:to']);

const rootRef = ref(null);

const span = computed(() => Math.max(props.max - props.min, 1));

function pctOf(value) {
  const pct = ((value - props.min) / span.value) * 100;
  return Math.min(Math.max(pct, 0), 100);
}

const fromPct = computed(() => pctOf(props.from));
const toPct = computed(() => pctOf(props.to));

const rangeStyle = computed(() => ({
  left: fromPct.value + '%',
  right: 100 - toPct.value + '%',
}));

const occupiedBlocks = computed(() =>
  (props.occupied || [])
    .filter((r) => r && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > props.min && r.start < props.max)
    .map((r) => {
      const start = Math.max(r.start, props.min);
      const end = Math.min(r.end, props.max);
      return {
        title: r.title || '',
        style: {
          left: pctOf(start) + '%',
          right: 100 - pctOf(end) + '%',
        },
      };
    }),
);

const HOUR = 3600000;

const hourMarks = computed(() => {
  const marks = [];
  const totalHours = span.value / HOUR;
  const labelEvery = totalHours > 26 ? 3 : totalHours > 12 ? 2 : 1;
  const firstHour = Math.ceil(props.min / HOUR) * HOUR;
  for (let t = firstHour; t <= props.max; t += HOUR) {
    const d = new Date(t);
    const hour = d.getHours();
    const major = hour % labelEvery === 0;
    marks.push({
      value: t,
      pct: ((t - props.min) / span.value) * 100,
      label: major ? String(hour).padStart(2, '0') : '',
      major,
    });
  }
  return marks;
});

let dragging = null;

function clampToFrom(value) {
  // Lower bound: the closest occupied.end that lies at or below the current `to`
  // (any such range, if newFrom crossed below it, would overlap with [newFrom, to]).
  let lowerBound = props.min;
  for (const r of props.occupied || []) {
    if (!r || !Number.isFinite(r.end)) continue;
    if (r.end <= props.to && r.end > lowerBound) lowerBound = r.end;
  }
  const upperBound = props.to - props.step;
  return Math.min(Math.max(value, lowerBound), upperBound);
}

function clampToTo(value) {
  // Upper bound: the closest occupied.start that lies at or above the current `from`.
  let upperBound = props.max;
  for (const r of props.occupied || []) {
    if (!r || !Number.isFinite(r.start)) continue;
    if (r.start >= props.from && r.start < upperBound) upperBound = r.start;
  }
  const lowerBound = props.from + props.step;
  return Math.min(Math.max(value, lowerBound), upperBound);
}

function valueFromX(x, rect) {
  const ratio = Math.min(Math.max((x - rect.left) / rect.width, 0), 1);
  const raw = props.min + ratio * span.value;
  return Math.round(raw / props.step) * props.step;
}

function startDrag(which, ev) {
  if (ev.button !== undefined && ev.button !== 0) return;
  const root = rootRef.value;
  if (!root) return;
  ev.preventDefault();
  const rect = root.getBoundingClientRect();
  dragging = { which, rect };
  if (ev.currentTarget && typeof ev.currentTarget.focus === 'function') {
    ev.currentTarget.focus();
  }
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag, { once: true });
  window.addEventListener('pointercancel', endDrag, { once: true });
}

function onTrackDown(ev) {
  if (ev.button !== undefined && ev.button !== 0) return;
  const root = rootRef.value;
  if (!root) return;
  const rect = root.getBoundingClientRect();
  const value = valueFromX(ev.clientX, rect);
  const distFrom = Math.abs(value - props.from);
  const distTo = Math.abs(value - props.to);
  const which = distFrom <= distTo ? 'from' : 'to';
  if (which === 'from') emit('update:from', clampToFrom(value));
  else emit('update:to', clampToTo(value));
  dragging = { which, rect };
  ev.preventDefault();
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag, { once: true });
  window.addEventListener('pointercancel', endDrag, { once: true });
}

function onPointerMove(ev) {
  if (!dragging) return;
  const value = valueFromX(ev.clientX, dragging.rect);
  if (dragging.which === 'from') emit('update:from', clampToFrom(value));
  else emit('update:to', clampToTo(value));
}

function endDrag() {
  dragging = null;
  window.removeEventListener('pointermove', onPointerMove);
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove);
});

function onKeyDown(which, ev) {
  const base = ev.shiftKey ? 15 : 1;
  let delta = 0;
  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') delta = -base * props.step;
  else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') delta = base * props.step;
  else if (ev.key === 'Home') {
    ev.preventDefault();
    if (which === 'from') emit('update:from', props.min);
    else emit('update:to', clampToTo(props.from + props.step));
    return;
  } else if (ev.key === 'End') {
    ev.preventDefault();
    if (which === 'from') emit('update:from', clampToFrom(props.to - props.step));
    else emit('update:to', props.max);
    return;
  } else return;
  ev.preventDefault();
  if (which === 'from') emit('update:from', clampToFrom(props.from + delta));
  else emit('update:to', clampToTo(props.to + delta));
}

const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
  hour: '2-digit',
  minute: '2-digit',
});
function formatTime(ts) {
  return timeFormatter.format(new Date(ts));
}
</script>

<style scoped>
.trs {
  position: relative;
  height: 56px;
  padding: 18px 12px 0;
  user-select: none;
  touch-action: none;
}
.trs__track {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 24px;
  height: 8px;
  border-radius: 999px;
  background: var(--input-bg-focus);
  cursor: pointer;
}
.trs__range {
  position: absolute;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--accent, #6ee7b7) 65%, transparent);
  border-radius: 999px;
  z-index: 1;
}
.trs__occupied {
  position: absolute;
  top: -2px;
  bottom: -2px;
  background:
    repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--sub) 35%, transparent) 0 4px,
      color-mix(in srgb, var(--sub) 18%, transparent) 4px 8px
    );
  border-radius: 4px;
  pointer-events: none;
  z-index: 0;
}
.trs__hours {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 36px;
  height: 14px;
  pointer-events: none;
}
.trs__hour {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--sub);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.trs__hour-tick {
  width: 1px;
  height: 4px;
  background: var(--line);
}
.trs__hour.is-major .trs__hour-tick {
  height: 6px;
  background: var(--sub);
}
.trs__hour-label {
  line-height: 1;
}
.trs__thumb {
  position: absolute;
  top: 27px;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid var(--accent, #6ee7b7);
  background: var(--surface);
  cursor: grab;
  z-index: 2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  outline: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.trs__thumb:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.1);
  z-index: 3;
}
.trs__thumb:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #6ee7b7) 40%, transparent);
  z-index: 3;
}
.trs__bubble {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--line);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.trs__thumb:hover .trs__bubble,
.trs__thumb:focus-visible .trs__bubble,
.trs__thumb:active .trs__bubble {
  opacity: 1;
}
</style>
