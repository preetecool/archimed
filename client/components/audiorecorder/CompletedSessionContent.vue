<template>
    <div class="session-details">
        <div class="detail-section transcription-section">
            <h4 class="section-title">Transcription complète</h4>
            <div v-if="!session.transcription" class="transcription-empty">
                <p>Aucune transcription disponible</p>
            </div>
            <div v-else class="transcription-text">
                {{ session.transcription }}
            </div>
        </div>

        <div v-if="session.medicalNote" class="detail-section note-section">
            <h4 class="section-title">Note médicale</h4>
            <MedicalNoteDisplay :noteText="session.medicalNote" />
        </div>
    </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useSessionFormatting } from "~/composables/useSessionFormatting";
import { useRecordingStore } from "~/stores/modules/recording";
import MedicalNoteDisplay from "./MedicalNoteDisplay.vue";

const debug = ref(true);
const props = defineProps({
    session: {
        type: Object,
        required: true,
        validator: (session) => {
            return session && typeof session.id === "string";
        },
    },

    showConsultationOptions: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["update-transcription"]);

const { formatReasons } = useSessionFormatting();

onMounted(() => {
    if (!props.session.transcription || props.session.transcription.length === 0) {
        try {
            const store = useRecordingStore();

            store.loadTranscriptForSession(props.session.id).then((savedTranscription) => {
                if (savedTranscription && savedTranscription.length > 0) {
                    console.log(
                        `Recovered backup transcription for session ${props.session.id} (${savedTranscription.length} chars)`,
                    );

                    emit("update-transcription", {
                        sessionId: props.session.id,
                        transcription: savedTranscription,
                    });
                }
            });
        } catch (e) {
            console.warn("Failed to recover backup transcription:", e);
        }
    } else {
        try {
            const store = useRecordingStore();
            store.saveTranscriptToIndexedDB(props.session.id, props.session.transcription);
        } catch (e) {
            console.warn("Failed to save existing transcription to IndexedDB:", e);
        }
    }
});
</script>

<style scoped>
.session-details {
    margin-top: 16px;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
}

.detail-section {
    margin-bottom: 20px;
}

.detail-section:last-child {
    margin-bottom: 0;
}

.section-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #334155;
    margin: 0 0 10px 0;
}

.transcription-section {
    background-color: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.note-section {
    background-color: #eef2ff;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e0e7ff;
}

.transcription-text {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #475569;
    white-space: pre-wrap;
}

.transcription-empty {
    color: #94a3b8;
    font-style: italic;
}

.metadata-section {
    background-color: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-bottom: 16px;
}

.metadata-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.metadata-item {
    display: flex;
    gap: 8px;
    align-items: baseline;
}

.metadata-label {
    font-weight: 600;
    color: #64748b;
    min-width: 80px;
}

.metadata-value {
    color: #334155;
}
</style>
