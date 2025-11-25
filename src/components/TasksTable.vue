<template>
    <div class="card simple stack">
        <div class="tbody">
            <div v-if="orderedTasks.length === 0" class="empty">
                Немає задач у цій вкладці.
            </div>
            <TransitionGroup
                v-else
                name="task-move"
                :css="!props.disableAnimation"
                tag="div"
            >
                <div
                    v-for="task in orderedTasks"
                    :key="task.id"
                    class="task"
                    :class="{ 'is-running': isRunning(task) }"
                >
                    <div class="head">
                        <div class="title">
                            <div class="title-main">
                                <template v-if="!task._edit">
                                    <a
                                        v-if="task.link"
                                        :href="task.link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >{{ task.title }}</a>
                                    <span v-else>{{ task.title }}</span>
                                </template>
                                <template v-else>
                                    <input
                                        type="text"
                                        v-model="task._draft.title"
                                    />
                                </template>
                                <template v-if="task._edit">
                                    <input
                                        type="url"
                                        v-model="task._draft.link"
                                        placeholder="Посилання"
                                    />
                                </template>
                            </div>
                            <div class="task-meta hide-sm">
                                <div class="meta-item">
                                    <span class="meta-label">Проєкт</span>
                                    <template v-if="!task._edit">
                                        <span class="meta-value">{{ task.project || '—' }}</span>
                                    </template>
                                    <template v-else>
                                        <input
                                            type="text"
                                            v-model="task._draft.project"
                                            list="projectsList"
                                        />
                                    </template>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">Тип проєкту</span>
                                    <template v-if="!task._edit">
                                        <span class="meta-value">{{ task.type || '—' }}</span>
                                    </template>
                                    <template v-else>
                                        <input
                                            type="text"
                                            v-model="task._draft.type"
                                            list="typesList"
                                        />
                                    </template>
                                </div>
                            </div>
                        </div>
                        <div class="chips">
                            <span class="chip">ID: {{ task.id.slice(-6) }}</span>
                            <span class="chip running" v-if="isRunning(task)">● Запущено</span>
                        </div>
                        <div class="controls">
                            <button
                                class="btn panel green primary-action"
                                v-if="!isRunning(task) && !task._edit"
                                @click="start(task)"
                                title="Старт таймера"
                                aria-label="Старт таймера"
                            >
                                <Icon name="play" size="26" />
                            </button>
                            <button
                                class="btn panel primary primary-action"
                                v-else-if="isRunning(task)"
                                @click="stop(task)"
                                title="Зупинити таймер"
                                aria-label="Зупинити таймер"
                            >
                                <Icon name="pause" size="26" />
                            </button>
                            <div class="controls-menu">
                                <button
                                    class="btn panel ghost more-btn"
                                    @click.stop="toggleMenu(task.id)"
                                    :aria-expanded="openMenuFor === task.id"
                                    aria-haspopup="true"
                                    title="Інші дії"
                                    aria-label="Інші дії"
                                >
                                    <Icon name="more" />
                                </button>
                                <div
                                    v-if="openMenuFor === task.id"
                                    class="controls-menu__dropdown"
                                >
                                    <button
                                        v-for="item in menuItemsForTask(task)"
                                        :key="item.label"
                                        class="controls-menu__item"
                                        type="button"
                                        @click="handleMenuAction(item.action)"
                                    >
                                        <Icon :name="item.icon" size="18" />
                                        <span>{{ item.label }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="thead grid">
                        <div class="nowrap">Сьогодні</div>
                        <div class="nowrap">За поточний місяць</div>
                        <div class="nowrap">За увесь час</div>
                    </div>
                    <div class="row grid">
                        <div class="mono nowrap">{{ formatMsS(totalForTaskOnDate(task, todayDate, nowTs)) }}</div>
                        <div class="mono nowrap">{{ formatMsS(totalForTaskInMonth(task, todayDate, nowTs)) }}</div>
                        <div class="mono nowrap">{{ formatMsS(totalForTaskOverall(task, nowTs)) }}</div>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import Icon from './Icon.vue';
import {
    isRunning,
    formatMsS,
    totalForTaskOnDate,
    totalForTaskInMonth,
    totalForTaskOverall,
    cryptoRandomId
} from '../helpers';

const props = defineProps({
    filteredTasks: { type: Array, required: true },
    allTasks: { type: Array },
    disableAnimation: { type: Boolean, default: false },
    tick: { type: Number, default: 0 }
});

const emit = defineEmits(['remove-task']);

const openMenuFor = ref(null);

function toggleMenu(taskId) {
    openMenuFor.value = openMenuFor.value === taskId ? null : taskId;
}

function closeMenu() {
    openMenuFor.value = null;
}

function handleMenuAction(action) {
    if (typeof action === 'function') {
        action();
    }
    closeMenu();
}

function menuItemsForTask(task) {
    const items = [];

    if (task._edit) {
        items.push({
            icon: 'save',
            label: 'Зберегти',
            action: () => saveEdit(task)
        });
        items.push({
            icon: 'cancel',
            label: 'Скасувати',
            action: () => cancelEdit(task)
        });
    } else {
        items.push({
            icon: 'edit',
            label: 'Редагувати',
            action: () => openEdit(task)
        });
    }

    if (!task.archived && !task._edit) {
        items.push({
            icon: 'archive',
            label: 'Архівувати',
            action: () => archive(task)
        });
    }

    if (task.archived && !task._edit) {
        items.push({
            icon: 'unarchive',
            label: 'Повернути',
            action: () => unarchive(task)
        });
    }

    if (!task.archived && !task._edit && !task.persistent) {
        items.push({
            icon: 'repeat',
            label: 'Додати до повторюваних',
            action: () => makePersistent(task)
        });
    }

    if (!task.archived && !task._edit && task.persistent) {
        items.push({
            icon: 'clock',
            label: 'Прибрати з повторюваних',
            action: () => makeRegular(task)
        });
    }

    if (!task._edit) {
        items.push({
            icon: 'trash',
            label: 'Видалити',
            action: () => emitRemove(task)
        });
    }

    return items;
}

function openEdit(task) {
    task._edit = true;
    task._draft = {
        title: task.title,
        link: task.link,
        project: task.project,
        type: task.type
    };
}

function cancelEdit(task) {
    task._edit = false;
    task._draft = null;
}

function saveEdit(task) {
    Object.assign(task, task._draft);
    task._edit = false;
    task._draft = null;
}

function archive(task) {
    task.archived = true;
    stopIfRunning(task);
}

function unarchive(task) {
    task.archived = false;
}

function makePersistent(task) {
    task.persistent = true;
}

function makeRegular(task) {
    task.persistent = false;
}

function emitRemove(task) {
    if (confirm('Видалити задачу? Дію неможливо скасувати.')) {
        emit('remove-task', task.id);
    }
}

function tasksPool() {
    return Array.isArray(props.allTasks) ? props.allTasks : props.filteredTasks;
}

function start(task) {
    // Ensure only one timer runs globally.
    tasksPool().forEach((t) => {
        if (t !== task && isRunning(t)) {
            stop(t);
        }
    });

    if (isRunning(task)) {
        return;
    }

    task.running = { start: Date.now() };
}

function stop(task) {
    if (!isRunning(task)) {
        return;
    }

    const start = new Date(task.running.start);
    const end = new Date();
    const dur = Math.max(0, end - start);

    task.logs.push({
        id: cryptoRandomId(),
        start: start.getTime(),
        end: end.getTime(),
        ms: dur
    });

    task.running = null;
}

function stopIfRunning(task) {
    if (isRunning(task)) {
        stop(task);
    }
}

const orderedTasks = computed(() => {
    return [...props.filteredTasks].sort(
        (a, b) => Number(isRunning(b)) - Number(isRunning(a))
    );
});

// reactive "now" for live updates
const nowTs = computed(() => {
    props.tick;
    return Date.now();
});

// Always use today's date for per-day total, ignoring selectedDate
const todayDate = computed(() => new Date());
</script>

<style scoped lang="postcss">
.chips {
    display: none;
    gap: 8px;
    flex-wrap: wrap;

    .chip {
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--segment-bg);
        color: var(--sub);
        font-size: 12px;

        &.running {
            color: #22c55e;
            border-color: #22c55e;
        }
    }
}

.task {
    position: relative;
    padding-bottom: 6px;
    background: var(--surface);
    border: 3px solid transparent;
    border-radius: var(--radius) !important;
    box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.05);

    &:not(:last-child) {
        margin-bottom: 16px;
    }

    &.is-running {
        border: 3px solid #16a34a;

        & + .task {
            border-radius: var(--radius) var(--radius) 0 0;
        }

        & + .task:last-child {
            border-radius: var(--radius);
        }
    }

    .head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
    }

    .title {
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
        font-weight: 600;

        a,
        span {
            padding: 10px;
            border-radius: 10px;
            text-decoration: none;
        }

        a:hover {
            background-color: var(--muted);
        }
    }

    .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .title-main {
        display: flex;
        gap: 8px;
        margin-bottom: 2px;
        width: 100%;

        input {
            flex: 1;
        }
    }

    .task-meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        width: 100%;
        font-size: 12px;
        color: var(--sub);
    }

    .task-meta .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0.4;
    }

    .task-meta .meta-label {
        padding: 0 0 0 10px;
        font-size: 11px;
    }

    .task-meta .meta-value {
        padding: 0;
        color: var(--text);
        font-weight: 500;
        opacity: 0.85;
    }

    .task-meta input {
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 8px;
    }

    .controls {
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
        margin-left: auto;
        align-items: center;
        gap: 8px;
    }

    .btn.panel.primary-action {
        width: 35px;
        height: 35px;
        border-radius: 50%;
    }

    .btn.panel.primary-action svg {
        width: 70%;
        height: 70%;
    }

    .btn.panel.primary-action.green svg {
        padding-right: 1px;
    }

    .controls-menu {
        position: relative;
    }

    .controls-menu .more-btn {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-s);
    }

    .controls-menu__dropdown {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        background: var(--surface);
        border-radius: 12px;
        border: 1px solid var(--line);
        min-width: 220px;
        padding: 8px;
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 10;
    }

    .controls-menu__item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        border: none;
        background: transparent;
        color: inherit;
        padding: 8px 10px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        text-align: left;
    }

    .controls-menu__item:hover {
        background: var(--muted);
    }

    .controls-menu__item:active {
        transform: translateY(1px);
    }
}

:global(.task-move-enter-active),
:global(.task-move-leave-active) {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

:global(.task-move-enter-from),
:global(.task-move-leave-to) {
    opacity: 0;
    transform: translateY(8px);
}

:global(.task-move-move) {
    transition: transform 0.3s ease;
}
</style>
