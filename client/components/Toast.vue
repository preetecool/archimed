<template>
    <div v-if="toastState.show" class="toast-container" :class="[`toast-${toastState.type}`]">
        <div class="toast-content">
            <component :is="toastIcon" size="18" class="toast-icon" />
            <span class="toast-message">{{ toastState.message }}</span>
        </div>
        <button @click="closeToast" class="toast-close" aria-label="Close toast">
            <X size="16" />
        </button>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useToast } from "~/composables/useToast";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-vue-next";

const { toastState, closeToast } = useToast();

const toastIcon = computed(() => {
    switch (toastState.value.type) {
        case "success":
            return CheckCircle;
        case "error":
            return AlertCircle;
        case "warning":
            return AlertTriangle;
        case "info":
        default:
            return Info;
    }
});
</script>

<style scoped>
.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slide-in 0.3s ease forwards;
    max-width: 400px;
    gap: 8px;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.toast-success {
    background-color: #ecfdf5;
    border-left: 4px solid #10b981;
}

.toast-error {
    background-color: #fef2f2;
    border-left: 4px solid #ef4444;
}

.toast-warning {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
}

.toast-info {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
}

.toast-icon {
    flex-shrink: 0;
}

.toast-success .toast-icon {
    color: #10b981;
}

.toast-error .toast-icon {
    color: #ef4444;
}

.toast-warning .toast-icon {
    color: #f59e0b;
}

.toast-info .toast-icon {
    color: #3b82f6;
}

.toast-message {
    color: #1f2937;
    font-size: 14px;
}

.toast-close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toast-close:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: #1f2937;
}

@keyframes slide-in {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
</style>
