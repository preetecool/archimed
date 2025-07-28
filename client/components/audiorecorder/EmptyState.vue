<template>
    <div class="empty-state">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
    </div>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
});
</script>

<style scoped>
.empty-state {
    padding: 40px 0;
    text-align: center;
    color: #64748b;
}

.empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    color: #334155;
}

.empty-state p {
    margin: 0;
    font-size: 0.9rem;
}
</style>
