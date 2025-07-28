<template>
    <div class="simplified-recorder">
        <div class="transcription-box">
            <div class="recorder-header">
                <h3>Live Transcription</h3>
                <RecordingTimer
                    :isRecording="isRecording"
                    :formatted-duration="formattedDuration"
                />
            </div>

            <TranscriptionContent
                :is-recording="isRecording"
                :current-transcription="currentTranscription"
                :empty-message="'Ready to record'"
            />

            <div class="control-panel">
                <ErrorMessages
                    :connection-error="!isConnected && maxReconnectAttemptsReached"
                    :mic-permission-error="!micPermissionGranted"
                />

                <RecordButton
                    :is-recording="isRecording"
                    :is-connected="isConnected"
                    :mic-permission-granted="micPermissionGranted"
                    @toggle="toggleRecording"
                />
            </div>
        </div>

        <div v-if="isRecording" class="live-recording-indicator">
            <span class="pulse"></span>
            <span>Recording in progress</span>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRecording } from "~/composables/useRecording";
import RecordingTimer from "~/components/audiorecorder/RecordingTimer.vue";
import TranscriptionContent from "~/components/audiorecorder/TranscriptionContent.vue";
import ErrorMessages from "~/components/audiorecorder/ErrorMessages.vue";
import RecordButton from "~/components/audiorecorder/RecordButton.vue";
import { getWebSocketService } from "~/services/websocketService";

const {
    isRecording,
    isConnected,
    micPermissionGranted,
    currentTranscription,
    formattedDuration,
    toggleRecording,
    initialize,
    cleanupPollingIntervals,
} = useRecording();

const maxReconnectAttemptsReached = ref(false);

onMounted(async () => {
    try {
        initialize();

        const websocketService = getWebSocketService();
        if (websocketService) {
            websocketService.on("reconnectionFailed", () => {
                maxReconnectAttemptsReached.value = true;
            });

            await websocketService.connect();
        }
    } catch (error) {
        console.error("Error during recorder initialization:", error);
    }
});

onBeforeUnmount(() => {
    if (isRecording.value) {
        toggleRecording();
    }

    const websocketService = getWebSocketService();
    if (websocketService) {
        websocketService.off("reconnectionFailed");
    }

    if (typeof cleanupPollingIntervals === "function") {
        cleanupPollingIntervals();
    }
});
</script>

<style scoped>
.simplified-recorder {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.transcription-box {
    background-color: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.recorder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.recorder-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #334155;
}

.control-panel {
    display: flex;
    justify-content: center;
    margin-top: 16px;
}

.live-recording-indicator {
    display: flex;
    align-items: center;
    background-color: #fee2e2;
    color: #ef4444;
    padding: 12px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
}

.pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    margin-right: 12px;
    animation: pulse 1.5s infinite;
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
</style>
