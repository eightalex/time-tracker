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
                        <div class="chips">
                            <span class="chip">ID: {{ task.id.slice(-6) }}</span>
                            <span class="chip running" v-if="isRunning(task)">● Запущено</span>
                        </div>
                        <div class="controls">
                            <button
                                class="btn panel green"
                                v-if="!isRunning(task) && !task._edit"
                                @click="start(task)"
                                title="Старт таймера"
                                aria-label="Старт таймера"
                            >
                                <Icon name="play" />
                            </button>
                            <button
                                class="btn panel grey"
                                v-else-if="isRunning(task)"
                                @click="stop(task)"
                                title="Зупинити таймер"
                                aria-label="Зупинити таймер"
                            >
                                <Icon name="pause" />
                            </button>
                            <button
                                class="btn panel"
                                v-if="!task._edit"
                                @click="openEdit(task)"
                                title="Редагувати"
                                aria-label="Редагувати"
                            >
                                <Icon name="edit" />
                            </button>
                            <button
                                class="btn panel"
                                v-else
                                @click="saveEdit(task)"
                                title="Зберегти"
                                aria-label="Зберегти"
                            >
                                <Icon name="save" />
                            </button>
                            <button
                                class="btn panel ghost"
                                v-if="task._edit"
                                @click="cancelEdit(task)"
                                title="Скасувати"
                                aria-label="Скасувати"
                            >
                                <Icon name="cancel" />
                            </button>
                            <button
                                class="btn panel"
                                v-if="!task.archived && !task._edit"
                                @click="archive(task)"
                                title="Архівувати"
                                aria-label="Архівувати"
                            >
                                <Icon name="archive" />
                            </button>
                            <button
                                class="btn panel"
                                v-if="task.archived && !task._edit"
                                @click="unarchive(task)"
                                title="Повернути"
                                aria-label="Повернути"
                            >
                                <Icon name="unarchive" />
                            </button>
                            <button
                                class="btn panel"
                                v-if="!task.archived && !task._edit && !task.persistent"
                                @click="makePersistent(task)"
                                title="Додати до повторюваних"
                                aria-label="Додати до повторюваних"
                            >
                                <Icon name="repeat" />
                            </button>
                            <button
                                class="btn panel"
                                v-if="!task.archived && !task._edit && task.persistent"
                                @click="makeRegular(task)"
                                title="Прибрати з повторюваних"
                                aria-label="Прибрати з повторюваних"
                            >
                                <Icon name="clock" />
                            </button>
                            <button
                                class="btn panel red"
                                v-if="!task._edit"
                                @click="emitRemove(task)"
                                title="Видалити"
                                aria-label="Видалити"
                            >
                                <Icon name="trash" />
                            </button>
                        </div>
                    </div>
                    <div class="thead grid">
                        <div>Проєкт</div>
                        <div class="hide-sm">Тип проєкту</div>
                        <div class="nowrap">Сьогодні</div>
                        <div class="nowrap">За увесь час</div>
                    </div>
                    <div class="row grid">
                        <div class="hide-sm">
                            <template v-if="!task._edit">{{ task.project || '—' }}</template>
                            <template v-else>
                                <input
                                    type="text"
                                    v-model="task._draft.project"
                                    list="projectsList"
                                />
                            </template>
                        </div>
                        <div class="hide-sm">
                            <template v-if="!task._edit">{{ task.type || '—' }}</template>
                            <template v-else>
                                <input
                                    type="text"
                                    v-model="task._draft.type"
                                    list="typesList"
                                />
                            </template>
                        </div>
                        <div class="mono nowrap">{{ formatMsS(totalForTaskOnDate(task, todayDate, nowTs)) }}</div>
                        <div class="mono nowrap">{{ formatMsS(totalForTaskOverall(task, nowTs)) }}</div>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { isRunning, formatMsS, totalForTaskOnDate, totalForTaskOverall, cryptoRandomId } from '../helpers';

const props = defineProps({
    filteredTasks: { type: Array, required: true },
    allTasks: { type: Array },
    disableAnimation: { type: Boolean, default: false },
    tick: { type: Number, default: 0 }
});

const emit = defineEmits(['remove-task']);

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
    padding-bottom: 6px;
    background: var(--surface);
    border-radius: var(--radius) !important;
    box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.05);

    &:not(:last-child) {
        margin-bottom: 16px;
    }

    &.is-running {
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
        padding: 10px;
    }

    .title {
        display: flex;
        gap: 8px;
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

        input {
            flex: 1;
        }
    }

    .controls {
        display: flex;
        justify-content: flex-end;
        flex-shrink: 0;
        margin-left: auto;
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
