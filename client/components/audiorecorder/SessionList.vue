<template>
    <div class="session-list">
        <div v-for="session in processingSessions" :key="session.id" class="session-container">
            <SessionCard
                :session="session"
                status="processing"
                :show-consultation-options="showConsultationOptions"
                @toggle-details="toggleSessionDetails(session.id)"
            >
                <template #content>
                    <ProcessingSessionContent :session="session" />
                </template>
            </SessionCard>
        </div>

        <div
            v-for="session in pendingCompletionSessions"
            :key="session.id"
            class="session-container"
        >
            <SessionCard
                :session="session"
                status="pending_completion"
                :show-consultation-options="showConsultationOptions"
                @toggle-details="toggleSessionDetails(session.id)"
            >
                <template #content>
                    <ProcessingSessionContent :session="session" />
                </template>
            </SessionCard>
        </div>

        <div v-for="session in completedSessions" :key="session.id" class="session-container">
            <SessionCard
                :session="session"
                status="completed"
                :show-consultation-options="showConsultationOptions"
                @toggle-details="toggleSessionDetails(session.id)"
                @copy-note="copyNote(session)"
                @delete-session="deleteSession(session.id)"
            >
                <template #content>
                    <CompletedSessionContent
                        v-if="session.isExpanded"
                        :session="session"
                        :show-consultation-options="showConsultationOptions"
                        @update-transcription="handleTranscriptionUpdate"
                    />
                </template>
            </SessionCard>
        </div>

        <div v-if="noSessions" class="empty-session-list">
            <p>Aucune session enregistrée</p>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import SessionCard from "./SessionCard.vue";
import ProcessingSessionContent from "./ProcessingSessionContent.vue";
import CompletedSessionContent from "./CompletedSessionContent.vue";
import { useSessionManagement } from "~/composables/useSessionManagement";
import { useRecording } from "~/composables/useRecording";

const props = defineProps({
    processingSessions: {
        type: Array,
        required: true,
        default: () => [],
    },

    completedSessions: {
        type: Array,
        required: true,
        default: () => [],
    },

    pendingCompletionSessions: {
        type: Array,
        default: () => [],
    },

    showConsultationOptions: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["update-session"]);

const { toggleSessionDetails, copyNote, deleteSession } = useSessionManagement();

const noSessions = computed(() => {
    return (
        props.processingSessions.length === 0 &&
        props.completedSessions.length === 0 &&
        props.pendingCompletionSessions.length === 0
    );
});

const handleTranscriptionUpdate = (updateData) => {
    const sessionExists =
        props.completedSessions.some((s) => s.id === updateData.sessionId) ||
        props.processingSessions.some((s) => s.id === updateData.sessionId) ||
        props.pendingCompletionSessions.some((s) => s.id === updateData.sessionId);

    if (!sessionExists) {
        console.warn(
            `Attempted to update transcription for non-existent session: ${updateData.sessionId}`,
        );
        return;
    }
    emit("update-session", updateData);
};
</script>

<style scoped>
.session-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.session-container {
    width: 100%;
}

.empty-session-list {
    text-align: center;
    padding: 20px;
    color: #64748b;
    background-color: #f8fafc;
    border-radius: 8px;
    border: 1px dashed #e2e8f0;
}
</style>
