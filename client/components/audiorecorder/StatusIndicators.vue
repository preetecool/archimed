<template>
    <div class="status-indicators">
        <div v-if="isRecording" class="recording-indicator">
            <span class="pulse"></span>
            <span>{{ $t("recording.status.active") }}</span>
        </div>

        <div v-if="isRecording && !isConnected" class="connection-warning">
            <AlertCircle size="16" />
            <span>{{ $t("recording.status.offline") }} ({{ bufferedChunkCount }})</span>
        </div>

        <div
            v-if="isRecording && chunkProcessingStatus.isProcessing"
            class="chunk-processing-indicator"
        >
            <Clock size="16" />
            <span>{{
                $t("recording.status.processing", {
                    seconds: chunkProcessingStatus.remainingSeconds,
                })
            }}</span>
        </div>

        <div v-if="isReconnectingSessions" class="reconnecting-indicator">
            <RefreshCw size="16" class="spin" />
            <span>{{
                $t("recording.status.syncing", {
                    count: syncProgress.total,
                    done: syncProgress.done,
                })
            }}</span>
        </div>
    </div>
</template>

<script setup>
import { AlertCircle, Clock, RefreshCw } from "lucide-vue-next";

defineProps({
    isRecording: {
        type: Boolean,
        required: true,
    },
    isConnected: {
        type: Boolean,
        required: true,
    },
    isReconnectingSessions: {
        type: Boolean,
        required: true,
    },
    bufferedChunkCount: {
        type: Number,
        required: true,
    },
    chunkProcessingStatus: {
        type: Object,
        required: true,
    },
    syncProgress: {
        type: Object,
        required: true,
    },
});
</script>

<style scoped>
.status-indicators {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.recording-indicator {
    display: flex;
    align-items: center;
    background-color: #fee2e2;
    color: #ef4444;
    padding: 6px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 0.9rem;
    font-weight: 500;
}

.connection-warning {
    display: flex;
    align-items: center;
    background-color: #fef9c3;
    color: #854d0e;
    padding: 6px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    gap: 6px;
}

.chunk-processing-indicator {
    display: flex;
    align-items: center;
    background-color: #f0f9ff;
    color: #0369a1;
    padding: 6px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    gap: 6px;
}

.reconnecting-indicator {
    display: flex;
    align-items: center;
    background-color: #e0f2fe;
    color: #0284c7;
    padding: 6px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    gap: 6px;
}

.pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    margin-right: 8px;
    animation: pulse 1.5s infinite;
}

.spin {
    animation: spin 1.5s linear infinite;
}

@keyframes pulse {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.4;
        transform: scale(1.1);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
