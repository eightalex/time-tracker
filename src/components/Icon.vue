<template>
    <component
        :is="iconComponent"
        :size="resolvedSize"
        :weight="weight"
        :color="color"
        aria-hidden="true"
        focusable="false"
        class="icon"
    />
</template>

<script setup>
import { computed } from 'vue';
import {
    PhArchiveBox,
    PhBoxArrowUp,
    PhClock,
    PhDotsThreeVertical,
    PhFloppyDisk,
    PhPauseCircle,
    PhPencilSimple,
    PhPlayCircle,
    PhQuestion,
    PhRepeat,
    PhStar,
    PhTrash,
    PhXCircle,
    PhPlus,
    PhListChecks,
    PhChartLineUp,
} from '@phosphor-icons/vue';

const ICONS = {
    play: PhPlayCircle,
    pause: PhPauseCircle,
    edit: PhPencilSimple,
    save: PhFloppyDisk,
    cancel: PhXCircle,
    archive: PhArchiveBox,
    unarchive: PhBoxArrowUp,
    star: PhStar,
    clock: PhClock,
    trash: PhTrash,
    question: PhQuestion,
    repeat: PhRepeat,
    more: PhDotsThreeVertical,
    plus: PhPlus,
    tasks: PhListChecks,
    chart: PhChartLineUp,
};

const props = defineProps({
    name: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
    weight: {
        type: String,
        default: 'regular',
        validator: (value) => ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'].includes(value)
    },
    color: { type: String, default: 'currentColor' }
});

const iconComponent = computed(() => ICONS[props.name] ?? ICONS.question);

const resolvedSize = computed(() => {
    if (typeof props.size === 'number') {
        return props.size;
    }
    const parsed = parseInt(props.size, 10);
    return Number.isFinite(parsed) ? parsed : 20;
});
</script>

<style scoped>
.icon {
    display: block;
}
</style>
