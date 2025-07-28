<template>
    <div class="processing-session-content">
        <div v-if="session.transcription" class="transcription-preview">
            <h4 class="section-title">Transcription (partielle)</h4>
            <div class="preview-text">{{ truncatedTranscription }}</div>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useSessionFormatting } from "~/composables/useSessionFormatting";

const props = defineProps({
    session: {
        type: Object,
        required: true,
        validator: (session) => {
            return session && typeof session.id === "string";
        },
    },

    maxPreviewLength: {
        type: Number,
        default: 150,
    },
});

const { truncateText } = useSessionFormatting();

const truncatedTranscription = computed(() => {
    return truncateText(props.session.transcription || "", props.maxPreviewLength);
});
</script>

<style scoped>
.processing-session-content {
    margin-top: 8px;
}

.session-progress {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    gap: 10px;
}

.progress-bar {
    flex: 1;
    height: 8px;
    background-color: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #4073ff;
    border-radius: 4px;
    transition: width 0.5s ease;
}

.progress-text {
    font-size: 0.85rem;
    color: #64748b;
    min-width: 36px;
    text-align: right;
    font-family: monospace;
}

.transcription-preview {
    margin-top: 12px;
}

.section-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #334155;
    margin: 0 0 10px 0;
}

.preview-text {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #64748b;
    white-space: pre-wrap;
    font-style: italic;
    padding: 12px;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}
</style>
