<template>
    <div class="storage-admin-panel">
        <h3>{{ $t("recording.admin.title") }}</h3>

        <div v-if="storageUsage" class="storage-stats">
            <div class="stat-row">
                <span>{{ $t("recording.admin.audio_chunks") }}:</span>
                <span
                    >{{ storageUsage.audioChunksCount }} ({{
                        formatBytes(storageUsage.audioChunksSize)
                    }})</span
                >
            </div>
            <div class="stat-row">
                <span>{{ $t("recording.admin.transcripts") }}:</span>
                <span
                    >{{ storageUsage.transcriptsCount }} ({{
                        formatBytes(storageUsage.transcriptsSize)
                    }})</span
                >
            </div>
            <div class="stat-row">
                <span>{{ $t("recording.admin.sessions") }}:</span>
                <span
                    >{{ storageUsage.sessionsCount }} ({{
                        formatBytes(storageUsage.sessionsSize)
                    }})</span
                >
            </div>
            <div class="stat-row total">
                <span>{{ $t("recording.admin.total") }}:</span>
                <span>{{ formatBytes(storageUsage.totalSize) }}</span>
            </div>
        </div>

        <div class="admin-actions">
            <button
                @click="$emit('refresh')"
                class="admin-btn refresh-btn"
                :disabled="isCleanupInProgress"
            >
                <RefreshCw size="16" />
                {{ $t("recording.admin.refresh") }}
            </button>

            <button
                @click="$emit('cleanup')"
                class="admin-btn cleanup-btn"
                :disabled="isCleanupInProgress"
            >
                <Trash2 size="16" />
                {{ $t("recording.admin.cleanup") }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { RefreshCw, Trash2 } from "lucide-vue-next";

defineProps({
    storageUsage: {
        type: Object,
        default: null,
    },
    isCleanupInProgress: {
        type: Boolean,
        required: true,
    },
    formatBytes: {
        type: Function,
        required: true,
    },
});

defineEmits(["refresh", "cleanup"]);
</script>

<style scoped>
.storage-admin-panel {
    margin-top: 24px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 16px;
    border-radius: 8px;
}

.storage-admin-panel h3 {
    font-size: 1rem;
    margin: 0 0 12px 0;
    color: #334155;
}

.storage-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #64748b;
}

.stat-row.total {
    font-weight: 600;
    color: #334155;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    margin-top: 4px;
}

.admin-actions {
    display: flex;
    gap: 12px;
}

.admin-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
}

.refresh-btn {
    background-color: #f1f5f9;
    color: #475569;
}

.refresh-btn:hover:not(:disabled) {
    background-color: #e2e8f0;
}

.cleanup-btn {
    background-color: #fee2e2;
    color: #b91c1c;
}

.cleanup-btn:hover:not(:disabled) {
    background-color: #fecaca;
}

.admin-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
