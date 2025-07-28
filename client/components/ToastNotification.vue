<template>
    <transition name="toast">
        <div v-if="show" class="toast" :class="type">
            {{ message }}
        </div>
    </transition>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    message: {
        type: String,
        default: "",
    },
    type: {
        type: String,
        default: "success",
        validator: (value) => ["success", "error", "info", "warning"].includes(value),
    },
    duration: {
        type: Number,
        default: 3000,
    },
    autoClose: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["close"]);

let timer = null;

watch(
    () => props.show,
    (newValue) => {
        if (newValue && props.autoClose) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                emit("close");
            }, props.duration);
        }
    },
);

onBeforeUnmount(() => {
    if (timer) {
        clearTimeout(timer);
    }
});
</script>

<style scoped>
.toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast.success {
    background-color: #10b981;
}

.toast.error {
    background-color: #ef4444;
}

.toast.warning {
    background-color: #f59e0b;
}

.toast.info {
    background-color: #3b82f6;
}

.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.toast-leave-to {
    opacity: 0;
    transform: translateY(20px);
}
</style>
