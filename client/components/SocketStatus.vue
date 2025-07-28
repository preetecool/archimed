<template>
    <span class="socket-status" :class="status">
        {{ statusText }}
    </span>
</template>

<script setup>
const props = defineProps({
    status: {
        type: String,
        default: "disconnected",
        validator: (value) => ["connected", "disconnected"].includes(value),
    },
});

const statusText = computed(() => {
    return props.status === "connected" ? "Connecté" : "Déconnecté";
});
</script>

<style scoped>
.socket-status {
    display: inline-flex;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 50px;
}

.socket-status::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
}

.socket-status.connected {
    background-color: #dcfce7;
    color: #166534;
}

.socket-status.connected::before {
    background-color: #22c55e;
}

.socket-status.disconnected {
    background-color: #fee2e2;
    color: #b91c1c;
}

.socket-status.disconnected::before {
    background-color: #ef4444;
}
</style>
