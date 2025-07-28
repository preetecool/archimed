<template>
    <div class="websocket-monitor">
        <div class="status" :class="connectionClass">
            WebSocket: {{ statusText }}
            <span v-if="latency !== null" class="latency">({{ latency }}ms)</span>
        </div>
        <div class="controls">
            <button @click="reconnect" :disabled="isConnected && !connectionError">
                {{ isConnected ? "Reconnect" : "Connect" }}
            </button>
            <button @click="checkLatency" :disabled="!isConnected">Ping</button>
        </div>
        <div v-if="connectionError" class="error">
            Connection error detected. Check console for details.
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useWebSocket } from "~/composables/useWebSocket";

const { isConnected, connectionError, reconnecting, latency, connect, measureLatency } =
    useWebSocket();

const statusText = computed(() => {
    if (reconnecting.value) return "Reconnecting...";
    if (isConnected.value) return "Connected";
    return "Disconnected";
});

const connectionClass = computed(() => {
    if (reconnecting.value) return "reconnecting";
    if (isConnected.value) return "connected";
    if (connectionError.value) return "error";
    return "disconnected";
});

const reconnect = () => {
    connect();
};

const checkLatency = () => {
    measureLatency();
};
</script>

<style scoped>
.websocket-monitor {
    padding: 10px;
    margin: 10px 0;
    border: 1px solid #ccc;
    border-radius: 4px;
}
.status {
    font-weight: bold;
    margin-bottom: 8px;
}
.latency {
    font-weight: normal;
    font-size: 0.9em;
}
.controls {
    display: flex;
    gap: 8px;
}
.connected {
    color: green;
}
.disconnected {
    color: gray;
}
.reconnecting {
    color: orange;
}
.error {
    color: red;
}
</style>
