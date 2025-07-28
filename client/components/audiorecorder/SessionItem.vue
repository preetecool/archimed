<template>
    <div class="session-item completed">
        <div class="session-header">
            <div class="session-info">
                <div class="session-meta">
                    <Calendar size="16" class="meta-icon" />
                    <span class="session-date">{{ formatDate(session.startTime) }}</span>
                    <span class="separator">•</span>
                    <span class="session-time">{{ formatTime(session.endTime) }}</span>
                </div>
            </div>
            <div class="session-badges">
                <span class="duration-badge">
                    {{ formatDuration(session.startTime, session.endTime) }}
                </span>
                <div v-if="session.medicalNote" class="note-badge">
                    <CheckCircle size="14" />
                    <span>{{ $t("recording.session.completed") }}</span>
                </div>
            </div>
        </div>

        <p class="session-preview">
            {{ truncateText(session.transcription || "", 150) }}
        </p>

        <div class="session-actions">
            <button @click="$emit('toggle-details', session.id)" class="view-button">
                {{
                    session.isExpanded
                        ? $t("recording.past_sessions.hide_session")
                        : $t("recording.past_sessions.view_session")
                }}
                <ChevronDown v-if="session.isExpanded" size="16" />
                <ChevronRight v-else size="16" />
            </button>

            <div v-if="!session.isExpanded" class="action-buttons">
                <button
                    v-if="session.medicalNote"
                    @click="$emit('copy-note', session)"
                    class="action-btn copy-btn"
                    title="Copy note"
                >
                    <Copy size="16" />
                </button>
                <button
                    @click="$emit('delete-session', session.id)"
                    class="action-btn delete-btn"
                    title="Delete session"
                >
                    <Trash2 size="16" />
                </button>
            </div>
        </div>

        <div v-if="session.isExpanded" class="expanded-content">
            <slot name="expanded-content"></slot>
        </div>
    </div>
</template>

<script setup>
import { Calendar, CheckCircle, Copy, Trash2, ChevronDown, ChevronRight } from "lucide-vue-next";

const props = defineProps({
    session: {
        type: Object,
        required: true,
    },
    formatDate: {
        type: Function,
        required: true,
    },
    formatTime: {
        type: Function,
        required: true,
    },
    formatDuration: {
        type: Function,
        required: true,
    },
    truncateText: {
        type: Function,
        required: true,
    },
});

defineEmits(["toggle-details", "copy-note", "delete-session"]);
</script>

<style scoped>
.session-item {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.2s ease;
    border-radius: 8px;
}

.session-item:hover {
    background-color: #f8fafc;
}

.session-item:last-child {
    border-bottom: none;
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.session-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.session-meta {
    display: flex;
    align-items: center;
}

.meta-icon {
    color: var(--accent-color, #4073ff);
    margin-right: 8px;
}

.session-date {
    font-size: 0.9rem;
    font-weight: 500;
    color: #334155;
}

.separator {
    margin: 0 8px;
    color: #94a3b8;
}

.session-time {
    font-size: 0.9rem;
    color: #64748b;
}

.session-badges {
    display: flex;
    align-items: center;
    gap: 10px;
}

.duration-badge {
    font-family: monospace;
    font-size: 0.8rem;
    background-color: #f1f5f9;
    color: #64748b;
    padding: 4px 8px;
    border-radius: 4px;
}

.note-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: #d1fae5;
    color: #059669;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
}

.session-preview {
    font-size: 0.95rem;
    line-height: 1.5;
    color: #475569;
    margin: 0 0 12px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.session-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.view-button {
    background: none;
    border: none;
    color: var(--accent-color, #4073ff);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    padding: 4px 0;
}

.view-button:hover {
    text-decoration: underline;
}

.action-buttons {
    display: flex;
    gap: 8px;
}

.action-btn {
    border: none;
    background-color: transparent;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.copy-btn {
    color: var(--accent-color, #4073ff);
}

.copy-btn:hover {
    background-color: #eef2ff;
}

.delete-btn {
    color: #ef4444;
}

.delete-btn:hover {
    background-color: #fee2e2;
}

.expanded-content {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
}

@media (max-width: 640px) {
    .session-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .session-badges {
        align-self: flex-end;
    }
}
</style>
