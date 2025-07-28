<template>
    <div class="timer-display" :class="{ 'recording-active': isRecording }">
        <Clock size="16" class="clock-icon" />
        <span class="time-display">{{ isRecording ? formattedDuration : "00:00" }}</span>
    </div>
</template>

<script setup>
import { Clock } from "lucide-vue-next";

defineProps({
    formattedDuration: {
        type: String,
        required: true,
    },
    isRecording: {
        type: Boolean,
        required: true,
    },
});
</script>

<style scoped>
.timer-display {
    display: flex;
    align-items: center;
    background-color: #f0f9ff;
    color: #00000041;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    gap: 6px;
}
.recording-active {
    color: var(--text-color);
}

.clock-icon {
    color: currentColor;
}

.time-display {
    font-family: monospace;
    font-size: 1rem;
    font-weight: 500;
}
</style>
