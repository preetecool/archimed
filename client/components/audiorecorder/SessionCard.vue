<template>
    <div class="session-card" :class="status">
        <div class="session-header">
            <div class="session-info">
                <h3>Session #{{ session.id.substr(0, 5).toUpperCase() }}</h3>
                <div v-if="status === 'completed'" class="time-info">
                    {{ formatDate(session.endTime) }}
                </div>
            </div>
            <div class="session-status" :class="status">
                <Loader v-if="status === 'processing'" class="spinner" size="16" />
                <WifiOff v-if="status === 'pending_completion'" size="16" />
                <CheckCircle v-else-if="status === 'completed'" size="16" />
                <span>{{ statusText }}</span>
            </div>
        </div>

        <div v-if="status === 'completed'" class="session-actions">
            <button @click="$emit('toggle-details')" class="action-btn toggle-btn">
                {{ session.isExpanded ? "Masquer les détails" : "Afficher les détails" }}
                <ChevronUp v-if="session.isExpanded" size="16" />
                <ChevronDown v-else size="16" />
            </button>
            <div class="action-group">
                <button
                    v-if="session.medicalNote"
                    @click="$emit('copy-note')"
                    class="action-btn copy-btn"
                    title="Copier la note"
                >
                    <Copy size="16" />
                </button>
                <button
                    @click="$emit('delete-session')"
                    class="action-btn delete-btn"
                    title="Supprimer cette session"
                >
                    <Trash2 size="16" />
                </button>
            </div>
        </div>

        <slot name="content"></slot>
    </div>
</template>

<script setup>
import { computed } from "vue";
import {
    Loader,
    CheckCircle,
    Copy,
    Trash2,
    ChevronUp,
    ChevronDown,
    WifiOff,
} from "lucide-vue-next";
import { useSessionFormatting } from "~/composables/useSessionFormatting";

const props = defineProps({
    session: {
        type: Object,
        required: true,
    },
    status: {
        type: String,
        required: true,
        validator: (value) => ["processing", "completed", "pending_completion"].includes(value),
    },
    showConsultationOptions: {
        type: Boolean,
        default: false,
    },
});

defineEmits(["toggle-details", "copy-note", "delete-session"]);

const statusText = computed(() => {
    switch (props.status) {
        case "processing":
            return "Traitement";
        case "completed":
            return "Complété";
        case "pending_completion":
            return "En attente de connexion";
        default:
            return "";
    }
});

const { formatDate } = useSessionFormatting();
</script>

<style scoped>
.session-card {
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
    border: 1px solid #f1f5f9;
}

.session-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.session-card.processing {
    border-left: 4px solid #f97316;
}

.session-card.completed {
    border-left: 4px solid #10b981;
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 10px;
}

.session-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #334155;
}

.session-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.time-info {
    font-size: 0.85rem;
    color: #64748b;
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

.session-status.processing {
    background-color: #ffedd5;
    color: #ea580c;
}

.session-status.completed {
    background-color: #d1fae5;
    color: #059669;
}

.session-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
}

.action-group {
    display: flex;
    gap: 8px;
}

.action-btn {
    border: none;
    background-color: transparent;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
}

.toggle-btn {
    color: #64748b;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 6px;
}

.toggle-btn:hover {
    color: var(--accent-color, #4073ff);
}

.copy-btn {
    color: #4073ff;
    background-color: #eef2ff;
}

.copy-btn:hover {
    background-color: #e0e7ff;
}

.delete-btn {
    color: #ef4444;
    background-color: #fee2e2;
}

.delete-btn:hover {
    background-color: #fecaca;
}
</style>
