<template>
    <button
        @click="$emit('toggle')"
        :class="{ recording: isRecording }"
        class="record-button"
        :disabled="!isConnected || !micPermissionGranted"
    >
        <div class="btn-icon">
            <span v-if="isRecording" class="stop-icon" aria-hidden="true"></span>
            <Mic v-else size="20" />
        </div>
        <span class="btn-text">
            {{ isRecording ? recordingLabel : startLabel }}
        </span>
    </button>
</template>
<script setup>
import { Mic } from "lucide-vue-next";

defineProps({
    isRecording: {
        type: Boolean,
        required: true,
    },
    isConnected: {
        type: Boolean,
        required: true,
    },
    micPermissionGranted: {
        type: Boolean,
        required: true,
    },
    recordingLabel: {
        type: String,
        default: "Stop Recording",
    },
    startLabel: {
        type: String,
        default: "Start Recording",
    },
});

defineEmits(["toggle"]);
</script>

<style scoped>
.record-button {
    display: flex;
    align-items: center;
    padding: 12px 24px;
    background: var(--accent-color, #4073ff);
    color: white;
    border: none;
    border-radius: 50px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 10px rgba(64, 115, 255, 0.3);
}

.record-button:hover:not(:disabled) {
    background: #3462dd;
    transform: translateY(-1px);
}

.record-button:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    box-shadow: none;
}

.record-button.recording {
    background: #ef4444;
}

.record-button.recording:hover {
    background: #dc2626;
}

.btn-icon {
    margin-right: 10px;
}

.stop-icon {
    width: 14px;
    height: 14px;
    background-color: white;
    border-radius: 2px;
}
</style>
