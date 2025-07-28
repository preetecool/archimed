<template>
    <div class="session-card current-recording">
        <div class="session-header">
            <h3>Enregistrement en cours</h3>
            <div class="session-status recording">
                <span class="pulse"></span>
                <span>En direct</span>
            </div>
        </div>

        <div v-if="currentTranscription" class="transcription-content">
            <h4 class="section-title">Transcription en temps réel</h4>
            <div class="transcription-text">{{ currentTranscription }}</div>
        </div>

        <div v-else class="transcription-content">
            <div class="transcription-placeholder">
                <Loader size="24" class="spinner" />
                <span>En attente de transcription...</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Loader } from "lucide-vue-next";
import { useRecording } from "~/composables/useRecording";

const { currentTranscription } = useRecording();
</script>

<style scoped>
.session-card {
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    border: 1px solid #f1f5f9;
}

.current-recording {
    background-color: white;
    border-left: 4px solid #4073ff;
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.session-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #334155;
}

.session-status {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 50px;
    gap: 6px;
}

.session-status.recording {
    background-color: #fee2e2;
    color: #ef4444;
}

.pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    margin-right: 4px;
    animation: pulse 1.5s infinite;
}

.transcription-content {
    margin-top: 12px;
}

.transcription-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
    color: #64748b;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px dashed #e2e8f0;
}

.spinner {
    animation: spin 2s linear infinite;
}

.section-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #334155;
    margin: 0 0 10px 0;
}

.transcription-text {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #475569;
    white-space: pre-wrap;
    padding: 12px;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

@keyframes pulse {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.5;
        transform: scale(1.2);
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
</style>
