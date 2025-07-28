<template>
    <div class="transcription-content-box">
        <div v-if="isRecording && currentTranscription" class="transcription-text">
            <p
                v-for="(paragraph, index) in formattedParagraphs"
                :key="index"
                class="transcription-paragraph"
            >
                {{ paragraph }}
            </p>
        </div>
        <p v-else-if="isRecording" class="transcription-text"></p>
        <p v-else class="empty-transcription">
            {{ emptyMessage }}
        </p>
    </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
    isRecording: {
        type: Boolean,
        required: true,
    },
    currentTranscription: {
        type: String,
        default: "",
    },
    emptyMessage: {
        type: String,
        default: "No transcription available",
    },
});

function formatTranscription(text) {
    if (!text || text.length === 0) return [];

    const sentences = text.split(/\.\s+/);

    const SENTENCES_PER_PARAGRAPH = 3;
    const paragraphs = [];
    let currentParagraph = "";

    sentences.forEach((sentence, index) => {
        const endMark = index < sentences.length - 1 || sentence.endsWith(".") ? "." : "";

        currentParagraph += sentence + endMark + " ";

        if ((index + 1) % SENTENCES_PER_PARAGRAPH === 0 || sentence.includes("\n\n")) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = "";
        }
    });

    if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
    }

    return paragraphs;
}

const formattedParagraphs = computed(() => {
    return formatTranscription(props.currentTranscription);
});
</script>

<style scoped>
.transcription-content-box {
    overflow-y: auto;

    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f8fafc;
}

.transcription-content-box::-webkit-scrollbar {
    width: 8px;
}

.transcription-content-box::-webkit-scrollbar-track {
    background: #f8fafc;
}

.transcription-content-box::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 8px;
}

.transcription-text {
    white-space: pre-wrap;
    line-height: 1.6;
    margin: 0;
    color: #334155;
}

.transcription-paragraph {
    font-size: 1.25rem;
    margin-bottom: 16px;
    line-height: 1.7;
}

.transcription-paragraph:last-child {
    color: #0f172a;
    font-weight: 500;
}

.empty-transcription {
    color: #94a3b8;
    font-style: italic;
    margin: 0;
    font-size: 1.1rem;
}

.recording-active .transcription-content-box {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
</style>
