<template>
    <div class="error-messages">
        <div v-if="!isConnected && maxReconnectAttemptsReached" class="message error-message">
            <AlertCircle class="message-icon" size="20" />
            Impossible de se connecter au serveur après plusieurs tentatives.
            <button @click="retryConnection" class="retry-btn">Réessayer</button>
        </div>

        <div v-if="!micPermissionGranted" class="message error-message">
            <MicOff class="message-icon" size="20" />
            Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.
        </div>

        <div v-if="bufferedChunkCount > 0" class="message warning-message">
            <HardDrive class="message-icon" size="20" />
            {{ bufferedChunkCount }} segments audio en attente de transmission.
        </div>
    </div>
</template>

<script setup>
import { AlertCircle, MicOff, HardDrive } from "lucide-vue-next";
import { computed } from "vue";
import { useRecording } from "~/composables/useRecording";
import { getWebSocketService } from "~/services/websocketService";

const props = defineProps({
    maxReconnectAttemptsReached: {
        type: Boolean,
        default: false,
    },
});

const { isConnected, micPermissionGranted, bufferedChunkCount } = useRecording();

const retryConnection = async () => {
    const websocketService = getWebSocketService();
    try {
        await websocketService.connect("/ws");
        // Could emit an event to parent to show retry was attempted
    } catch (error) {
        console.error("Connection retry failed:", error);
    }
};
</script>

<style scoped>
.error-messages {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
}

.message {
    padding: 12px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
}

.message-icon {
    margin-right: 10px;
    flex-shrink: 0;
}

.error-message {
    background-color: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fecaca;
}

.warning-message {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.retry-btn {
    margin-left: 12px;
    background-color: rgba(185, 28, 28, 0.1);
    border: 1px solid #b91c1c;
    color: #b91c1c;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.retry-btn:hover {
    background-color: rgba(185, 28, 28, 0.2);
}
</style>
