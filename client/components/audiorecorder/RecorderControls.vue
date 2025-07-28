<template>
    <div class="recorder-controls">
        <div class="recorder-panel">
            <button
                @click="toggleRecording"
                :class="{ recording: isRecording }"
                class="record-btn"
                :disabled="!isConnected || !micPermissionGranted"
                aria-label="Toggle recording"
            >
                <div class="btn-icon">
                    <span v-if="isRecording" class="stop-icon" aria-hidden="true"></span>
                    <span v-else class="mic-icon" aria-hidden="true">
                        <Mic size="20" />
                    </span>
                </div>
                <span class="btn-text">
                    {{ isRecording ? "Arrêter l'enregistrement" : "Commencer l'enregistrement" }}
                </span>
            </button>

            <div class="recording-status">
                <div v-if="isRecording" class="recording-indicator">
                    <span class="pulse" aria-hidden="true"></span>
                    <span class="recording-time">{{ formattedDuration }}</span>
                </div>

                <div v-else-if="isConnected && micPermissionGranted" class="ready-indicator">
                    <span class="ready-dot" aria-hidden="true"></span>
                    <span>Prêt à enregistrer</span>
                </div>

                <div v-else-if="isConnecting" class="connecting-indicator">
                    <Loader size="16" class="spinner" aria-hidden="true" />
                    <span>Reconnexion en cours...</span>
                </div>

                <div v-else class="offline-indicator">
                    <WifiOff size="16" aria-hidden="true" />
                    <span>Hors ligne</span>
                </div>
            </div>
        </div>

        <div v-if="isRecording && !isConnected" class="connection-warning" role="alert">
            <AlertCircle size="16" aria-hidden="true" />
            <span>Connexion perdue - audio mis en mémoire tampon ({{ bufferedChunkCount }})</span>
        </div>
    </div>
</template>

<script setup>
import { Mic, Loader, AlertCircle, WifiOff } from "lucide-vue-next";
import { useRecording } from "~/composables/useRecording";

const {
    isRecording,
    isConnected,
    isConnecting,
    micPermissionGranted,
    formattedDuration,
    bufferedChunkCount,
    toggleRecording,
} = useRecording();
</script>

<style scoped>
.recorder-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.recorder-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: white;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.record-btn {
    display: flex;
    align-items: center;
    padding: 14px 24px;
    background: var(--accent-color, #4073ff);
    color: white;
    border: none;
    border-radius: 50px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(64, 115, 255, 0.3);
}

.record-btn:hover:not(:disabled) {
    background: #3462dd;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(64, 115, 255, 0.35);
}

.record-btn:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(64, 115, 255, 0.3);
}

.record-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.7;
}

.record-btn.recording {
    background: #ef4444;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.record-btn.recording:hover:not(:disabled) {
    background: #dc2626;
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
}

.btn-icon {
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
}

.stop-icon {
    width: 14px;
    height: 14px;
    background-color: white;
    border-radius: 2px;
}

.recording-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
}

.recording-indicator {
    display: flex;
    align-items: center;
    color: #ef4444;
    font-weight: 600;
}

.ready-indicator {
    color: #22c55e;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
}

.connecting-indicator,
.offline-indicator {
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
}

.connecting-indicator {
    color: #f97316;
}

.offline-indicator {
    color: #64748b;
}

.ready-dot {
    width: 8px;
    height: 8px;
    background-color: #22c55e;
    border-radius: 50%;
}

.pulse {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #ef4444;
    margin-right: 8px;
    animation: pulse 1.5s infinite;
}

.spinner {
    animation: spin 1s linear infinite;
}

.recording-time {
    font-family: monospace;
    font-size: 1.1rem;
}

.connection-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #fef9c3;
    color: #854d0e;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
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
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 640px) {
    .recorder-panel {
        flex-direction: column;
        gap: 16px;
    }

    .recording-status {
        align-items: center;
        text-align: center;
        width: 100%;
    }

    .record-btn {
        width: 100%;
        justify-content: center;
    }
}
</style>
