<template>
    <div class="transcription-workspace">
        <div class="session-list-column">
            <div class="column-header">
                <h2>Sessions</h2>
            </div>
            <div class="sessions-container">
                <ProcessingSessionItem
                    v-for="session in processingSessions"
                    :key="session.id"
                    :session="session"
                    :format-date="formatDate"
                />

                <div
                    v-for="session in pendingCompletionSessions"
                    :key="session.id"
                    class="session-container"
                >
                    <SessionCard
                        :session="session"
                        status="pending_completion"
                        @toggle-details="toggleSessionDetails(session.id)"
                    >
                        <template #content>
                            <ProcessingSessionContent :session="session" />
                        </template>
                    </SessionCard>
                </div>

                <SessionItem
                    v-for="session in sessionsHistory"
                    :key="session.id"
                    :session="session"
                    :format-date="formatDate"
                    :format-time="formatTime"
                    :format-duration="formatDuration"
                    :truncate-text="truncateText"
                    @toggle-details="selectSession"
                    @copy-note="copyNote"
                    @delete-session="deleteSession"
                    :class="{ selected: selectedSessionId === session.id }"
                />

                <EmptyState
                    v-if="showEmptyState"
                    title="No sessions yet"
                    description="Start recording to create your first session"
                />
            </div>
        </div>

        <div class="current-session-column">
            <div class="column-header">
                <h2>Session Details</h2>
            </div>
            <div class="current-session-content">
                <div v-if="selectedSession" class="session-details">
                    <CompletedSessionContent
                        :session="selectedSession"
                        @update-transcription="handleTranscriptionUpdate"
                    />
                </div>
                <EmptySessionDetails v-else />
            </div>
        </div>

        <div class="recording-panel-column">
            <div class="column-header">
                <h2>Recording</h2>
            </div>

            <div v-if="serverUnavailable" class="server-error-message">
                The recording server appears to be unavailable. Please try again later.
            </div>

            <StatusIndicators
                v-if="isRecording || isReconnectingSessions || bufferedChunkCount > 0"
                :is-recording="isRecording"
                :is-connected="isConnected"
                :is-reconnecting-sessions="isReconnectingSessions"
                :buffered-chunk-count="bufferedChunkCount"
                :chunk-processing-status="chunkProcessingStatus"
                :sync-progress="syncProgress"
            />

            <div class="recording-panel">
                <div class="recording-controls-fixed">
                    <RecordButtonRound
                        :is-recording="isRecording"
                        :is-connected="isConnected"
                        :mic-permission-granted="micPermissionGranted"
                        :formatted-duration="formattedDuration"
                        @toggle="toggleRecording"
                        :use-wave-effect="true"
                    />
                </div>

                <div class="transcription-area">
                    <div class="transcription-header">
                        <span class="section-title">Transcription</span>
                        <div class="timer-indicator" v-if="isRecording">
                            {{ formattedDuration }}
                        </div>
                    </div>

                    <div class="transcription-content-wrapper">
                        <TranscriptionContent
                            :is-recording="isRecording"
                            :current-transcription="currentTranscription"
                            :empty-message="
                                isRecording ? '' : 'Start recording to begin transcription'
                            "
                        />
                    </div>

                    <div v-if="isRecording && !isConnected" class="connection-warning" role="alert">
                        <AlertCircle size="16" aria-hidden="true" />
                        <span>Connection lost - audio buffered ({{ bufferedChunkCount }})</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { AlertCircle, Clock } from "lucide-vue-next";
import { useRecording } from "~/composables/useRecording";
import { useSessionFormatting } from "~/composables/useSessionFormatting";
import { useSessionManagement } from "~/composables/useSessionManagement";
import { useAudioCapture } from "~/composables/useAudioCapture";
import { getWebSocketService } from "~/services/websocketService";
import { useRecordingStore } from "~/stores/modules/recording";
import { storeToRefs } from "pinia";

import SessionItem from "~/components/audiorecorder/SessionItem.vue";
import EmptyState from "~/components/audiorecorder/EmptyState.vue";
import EmptySessionDetails from "~/components/EmptySessionDetails.vue";
import CompletedSessionContent from "~/components/audiorecorder/CompletedSessionContent.vue";
import TranscriptionContent from "~/components/audiorecorder/TranscriptionContent.vue";
import ErrorMessages from "~/components/audiorecorder/ErrorMessages.vue";
import RecordButtonRound from "~/components/RecordButtonRound.vue";
import StatusIndicators from "~/components/audiorecorder/StatusIndicators.vue";
import ProcessingSessionItem from "~/components/audiorecorder/ProcessingSessionItem.vue";
import ProcessingSessionContent from "~/components/audiorecorder/ProcessingSessionContent.vue";
import SessionCard from "~/components/audiorecorder/SessionCard.vue";

definePageMeta({
    layout: "app",
});

const {
    isRecording,
    isConnected,
    isConnecting,
    micPermissionGranted,
    currentTranscription,
    formattedDuration,
    bufferedChunkCount,
    sessionsHistory,
    processingSession,
    toggleSessionDetails,
    deleteSession,
    initialize,
    audioWorker,
    runAutomaticCleanup,
    checkStorageUsage,
    revokeAllBlobUrls,
    stopRecording,
    startRecording,
    cleanupPollingIntervals,
} = useRecording();

const { formatDate, formatTime, formatDuration, truncateText } = useSessionFormatting();
const { copyNote } = useSessionManagement();

const store = useRecordingStore();
const storageUsage = ref(null);
const isCleanupInProgress = ref(false);

if (store) {
    try {
        const storeRefs = storeToRefs(store);
        if (storeRefs.storageUsage) {
            storageUsage.value = storeRefs.storageUsage.value;
        }
        if (storeRefs.isCleanupInProgress) {
            isCleanupInProgress.value = storeRefs.isCleanupInProgress.value;
        }
    } catch (e) {
        console.error("Error accessing store refs:", e);
    }
}

const maxReconnectAttemptsReached = ref(false);
const serverUnavailable = ref(false);
const lastChunkTimestamp = ref(null);
const isReconnectingSessions = ref(false);
const syncProgress = ref({ done: 0, total: 0 });
const chunkProcessingDelay = 4000;
const selectedSessionId = ref(null);

const showEmptyState = computed(() => {
    return (
        !isRecording.value &&
        !processingSession.value &&
        completedSessions.value.length === 0 &&
        pendingCompletionSessions.value.length === 0
    );
});

const chunkProcessingStatus = computed(() => {
    if (!lastChunkTimestamp.value) return { isProcessing: false, remainingSeconds: 0 };

    const elapsed = Date.now() - lastChunkTimestamp.value;
    const remainingTime = Math.max(0, Math.floor((chunkProcessingDelay - elapsed) / 1000));

    return {
        isProcessing: elapsed < chunkProcessingDelay,
        remainingSeconds: remainingTime,
    };
});

const selectedSession = computed(() => {
    if (!selectedSessionId.value) return null;

    return sessionsHistory.value.find((session) => session.id === selectedSessionId.value);
});

const completedSessions = computed(() => {
    return sessionsHistory.value.filter(
        (session) => session.status === "completed" && !session.pendingFinalization,
    );
});

const pendingCompletionSessions = computed(() => {
    return sessionsHistory.value.filter(
        (session) => session.status === "pending_completion" || session.pendingFinalization,
    );
});

const processingSessions = computed(() => {
    return processingSession.value ? [processingSession.value] : [];
});

function selectSession(sessionId) {
    selectedSessionId.value = sessionId;

    const session = sessionsHistory.value.find((s) => s.id === sessionId);

    sessionsHistory.value.forEach((s) => {
        if (s.id !== sessionId && s.isExpanded) {
            toggleSessionDetails(s.id);
        }
    });

    if (session && !session.isExpanded) {
        toggleSessionDetails(sessionId);
    }
}

function handleTranscriptionUpdate(data) {
    const { sessionId, transcription } = data;

    const sessionIndex = sessionsHistory.value.findIndex((s) => s.id === sessionId);
    if (sessionIndex >= 0) {
        const updatedSession = {
            ...sessionsHistory.value[sessionIndex],
            transcription,
        };

        sessionsHistory.value[sessionIndex] = updatedSession;
    }
}

function setupEventListeners(websocketService) {
    if (websocketService) {
        websocketService.on("serverUnavailable", () => {
            serverUnavailable.value = true;
            console.log("Server unavailable");
        });

        websocketService.on("reconnectionFailed", () => {
            maxReconnectAttemptsReached.value = true;
        });

        websocketService.on("reconnecting", (data) => {
            if (data.activeSessions && data.activeSessions.length > 0) {
                isReconnectingSessions.value = true;
            }
        });

        websocketService.on("reconnected", () => {
            setTimeout(() => {
                isReconnectingSessions.value = false;
                syncProgress.value = { done: 0, total: 0 };
            }, 3000);
        });
    }

    if (audioWorker && audioWorker.value) {
        audioWorker.value.addEventListener("message", handleWorkerMessage);
    }
}

function handleWorkerMessage(event) {
    const data = event.data;

    if (data.type === "sendingBufferedChunks") {
        syncProgress.value.total = data.count;
        syncProgress.value.done = 0;
        isReconnectingSessions.value = true;
    } else if (data.type === "chunkSuccessfullySent" && isReconnectingSessions.value) {
        syncProgress.value.done++;
        if (syncProgress.value.done >= syncProgress.value.total) {
            setTimeout(() => {
                isReconnectingSessions.value = false;
            }, 1000);
        }
    }
}

function toggleRecording() {
    try {
        if (isRecording.value) {
            stopRecording().then(() => {});
        } else {
            startRecording();
        }
    } catch (error) {
        console.error("Error toggling recording:", error);
    }
}

watch(
    processingSession,
    (newValue, oldValue) => {
        if (newValue?.status === "completed" && (!oldValue || oldValue.status !== "completed")) {
            selectedSessionId.value = newValue.id;

            const session = sessionsHistory.value.find((s) => s.id === newValue.id);
            if (session && !session.isExpanded) {
                toggleSessionDetails(newValue.id);
            }
        }

        if (!newValue && oldValue?.status === "completed" && oldValue?.id) {
            if (!selectedSessionId.value) {
                selectedSessionId.value = oldValue.id;
            }
        }
    },
    { deep: true },
);

watch(
    sessionsHistory,
    (newSessions, oldSessions) => {
        if (processingSession.value?.status === "completed") {
            const completedSession = newSessions.find(
                (s) => s.id === processingSession.value.id && s.status === "completed",
            );

            if (completedSession) {
                selectedSessionId.value = completedSession.id;

                if (!completedSession.isExpanded) {
                    toggleSessionDetails(completedSession.id);
                }
            }
        }
    },
    { deep: true },
);

onMounted(async () => {
    window.isUnmounting = false;

    initialize();

    if (sessionsHistory.value) {
        const expandedSessions = sessionsHistory.value.filter((session) => session.isExpanded);

        for (const session of expandedSessions) {
            toggleSessionDetails(session.id);
        }
        selectedSessionId.value = null;
    }

    try {
        const websocketService = getWebSocketService();

        if (websocketService) {
            if (websocketService.isConnected) {
                isConnected.value = true;
            }

            websocketService.on("open", () => {
                isConnected.value = true;
                if (store) {
                    try {
                        store.$patch({ isConnected: true });
                    } catch (e) {
                        console.error("Error patching store:", e);
                    }
                }
            });

            try {
                await websocketService.connect();
                isConnected.value = true;
                if (store) {
                    try {
                        store.$patch({ isConnected: true });
                    } catch (e) {
                        console.error("Error patching store after connection:", e);
                    }
                }
            } catch (e) {
                console.error("Initial WebSocket connection failed:", e);
            }
        }

        const { checkMicrophonePermission } = useAudioCapture();
        if (typeof checkMicrophonePermission === "function") {
            await checkMicrophonePermission();
        }

        if (websocketService) {
            setupEventListeners(websocketService);
        }

        watch(isConnected, (connected) => {
            if (connected) {
                maxReconnectAttemptsReached.value = false;
            }
        });
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});

onBeforeUnmount(() => {
    window.isUnmounting = true;

    if (isRecording && isRecording.value) {
        toggleRecording();
    }

    if (typeof cleanupPollingIntervals === "function") {
        cleanupPollingIntervals();
    }

    const websocketService = getWebSocketService();
    if (websocketService) {
        websocketService.off("serverUnavailable");
        websocketService.off("reconnectionFailed");
        websocketService.off("reconnecting");
        websocketService.off("reconnected");
    }

    if (audioWorker.value) {
        audioWorker.value.removeEventListener("message", handleWorkerMessage);
    }

    if (typeof revokeAllBlobUrls === "function") {
        revokeAllBlobUrls();
    }

    setTimeout(() => {
        window.isUnmounting = false;
    }, 500);
});
</script>

<style scoped>
.transcription-workspace {
    display: flex;
    height: 100vh;
    width: 100%;
    background-color: white;
}

.session-list-column,
.current-session-column,
.recording-panel-column {
    height: 100vh;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e2e8f0;
}

.session-list-column {
    width: 320px;
    min-width: 280px;
}

.current-session-column {
    flex: 1;
    min-width: 400px;
}

.recording-panel-column {
    width: 380px;
    min-width: 340px;
    border-right: none;
    display: flex;
    flex-direction: column;
}

.column-header {
    height: 60px;
    padding: 0 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    background-color: white;
}

.column-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #334155;
}

.sessions-container,
.current-session-content {
    flex: 1;
    overflow-y: auto;
}

.recording-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.transcription-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #f1f5f9;
    padding: 20px;
    overflow: hidden;
}

.transcription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
}

.timer-indicator {
    font-family: monospace;
    font-size: 14px;
    color: #64748b;
    background-color: rgba(255, 255, 255, 0.5);
    padding: 4px 8px;
    border-radius: 4px;
}

.panel-divider {
    height: 1px;
    background-color: #cbd5e1;
    width: 100%;
}

.recording-controls {
    background-color: white;
    padding: 24px;
}

.server-error-message {
    margin: 16px;
    padding: 12px 16px;
    background-color: #fee2e2;
    color: #b91c1c;
    border-radius: 6px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.connection-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #fef9c3;
    color: #854d0e;
    padding: 10px 12px;
    border-radius: 6px;
    margin-top: 16px;
    font-size: 14px;
}

.selected {
    background-color: #f0f9ff;
    border-left: 3px solid var(--accent-color, #3b82f6);
}

:deep(.session-item) {
    border-bottom: 1px solid #f1f5f9;
    padding: 16px;
    border-radius: 0;
    transition: all 0.2s ease;
}

:deep(.session-item:hover) {
    background-color: #f8fafc;
}

.recording-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    position: relative;
    height: 100%;
}

.recording-controls-fixed {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: white;
    width: 100%;
    padding: 16px 0;
    border-bottom: 1px solid #e2e8f0;
}

.transcription-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #f1f5f9;
    padding: 20px;
    overflow: hidden;

    min-height: 200px;
}

.transcription-content-wrapper {
    flex: 1;
    overflow-y: auto;
    height: 100%;
    max-height: calc(100vh - 200px);
}

:deep(.transcription-content-box) {
    height: 100%;
    overflow-y: auto;
}
</style>
