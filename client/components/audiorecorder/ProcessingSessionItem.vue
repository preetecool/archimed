<template>
    <div class="session-item processing">
        <div class="session-header">
            <div class="session-info">
                <div class="session-meta">
                    <Calendar size="16" class="meta-icon" />
                    <span class="session-date">{{ $t("recording.session.processing") }}</span>
                </div>
            </div>
            <div class="session-status processing">
                <Loader class="spinner" size="16" />
                <span>{{ $t("recording.session.processing") }} ({{ session.progress }}%)</span>
            </div>
        </div>
        <ProcessingSessionContent :session="session" />
    </div>
</template>

<script setup>
import { Calendar, Loader } from "lucide-vue-next";
import ProcessingSessionContent from "./ProcessingSessionContent.vue";

defineProps({
    session: {
        type: Object,
        required: true,
    },
    formatDate: {
        type: Function,
        required: true,
    },
});
</script>

<style scoped>
.session-item {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.2s ease;
    border-radius: 8px;
}

.session-item.processing {
    border-left: 4px solid #f97316;
}

.session-item:hover {
    background-color: #f8fafc;
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

.session-status {
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 50px;
    gap: 6px;
}

.session-status.processing {
    background-color: #ffedd5;
    color: #ea580c;
}

.spinner {
    animation: spin 1.5s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 640px) {
    .session-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}
</style>
