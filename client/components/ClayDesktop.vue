<template>
    <div class="clay-desktop">
        <div class="window-bar">
            <div class="window-controls">
                <span class="control close"></span>
                <span class="control minimize"></span>
                <span class="control maximize"></span>
            </div>
            <div class="window-title">Archimed</div>
        </div>
        <div class="screen">
            <img :src="imageSrc" alt="Application screenshot" class="screenshot" />
        </div>
    </div>
</template>

<script setup>
defineProps({
    imageSrc: {
        type: String,
        required: true,
    },
});
</script>

<style scoped>
.clay-desktop {
    position: relative;
    width: 100%;
    max-width: 900px;
    border-radius: 12px;
    background: #ffffff;
    box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 1);
    overflow: hidden;
    transform: perspective(1000px) rotateX(2deg);
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.clay-desktop:hover {
    transform: perspective(1000px) rotateX(2deg) translateY(-5px);
    box-shadow:
        0 15px 40px rgba(0, 0, 0, 0.15),
        0 0 0 1px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 1);
}

.window-bar {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 12px;
    background: #e2e8f0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.window-controls {
    display: flex;
    gap: 6px;
}

.control {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.close {
    background-color: #ff5f57;
}

.minimize {
    background-color: #febc2e;
}

.maximize {
    background-color: #28c840;
}

.window-title {
    flex: 1;
    font-size: 12px;
    text-align: center;
    color: #4a5568;
    font-weight: 600;
}

.screen {
    position: relative;
    background-color: #f8fafc;
    width: 100%;
    height: 0;
    padding-bottom: 62.5%;
    overflow: hidden;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.screenshot {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
}

@media (max-width: 768px) {
    .clay-desktop {
        transform: none;
        box-shadow:
            0 10px 20px rgba(0, 0, 0, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .clay-desktop:hover {
        transform: translateY(-3px);
    }
}
</style>
