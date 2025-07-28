<template>
    <div class="clay-phone">
        <div class="clay-phone__frame">
            <div class="clay-phone__screen">
                <div class="clay-phone__notch"></div>
                <div class="clay-phone__content">
                    <img src="/appimage.png" alt="App Screenshot" class="app-screenshot" />
                </div>
            </div>
            <div class="clay-phone__button"></div>
            <div class="clay-phone__button volume-up"></div>
            <div class="clay-phone__button volume-down"></div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    imageSrc: {
        type: String,
        default: "/",
    },
    imageAlt: {
        type: String,
        default: "App Screenshot",
    },
});
</script>

<style scoped>
.clay-phone {
    position: relative;
    width: 280px;
    height: 560px;
    perspective: 1000px;
    transform: rotate(-5deg);
}

.clay-phone__frame {
    width: 100%;
    height: 100%;
    background: #e2e8f0;

    border-radius: 40px;
    position: relative;
    transform-style: preserve-3d;
    box-shadow:
        20px 20px 60px rgba(0, 0, 0, 0.1),
        -20px -20px 60px rgba(255, 255, 255, 0.8),
        inset 0 0 40px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(148, 163, 184, 0.2);
    animation: float 6s ease-in-out infinite;
}

.clay-phone__screen {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    bottom: 12px;
    background: #f8fafc;

    border-radius: 32px;
    overflow: hidden;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
}

.clay-phone__notch {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 25px;
    background: #e2e8f0;

    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
    box-shadow: inset 0 -5px 10px rgba(0, 0, 0, 0.05);
    z-index: 2;
}

.clay-phone__content {
    position: relative;
    height: 100%;
    overflow: hidden;
}

.app-screenshot {
    position: absolute;
    top: 25px;
    left: 0;
    width: 100%;
    height: calc(100% - 25px);
    object-fit: cover;
    object-position: top;
}

.clay-phone__button {
    position: absolute;
    right: -2px;
    top: 120px;
    width: 3px;
    height: 40px;
    background: #cbd5e1;

    border-radius: 2px;
    box-shadow: inset -1px 0 3px rgba(0, 0, 0, 0.1);
}

.clay-phone__button.volume-up {
    left: -2px;
    top: 100px;
    height: 30px;
}

.clay-phone__button.volume-down {
    left: -2px;
    top: 140px;
    height: 30px;
}

@keyframes float {
    0%,
    100% {
        transform: translateY(0) rotate(-5deg);
    }

    50% {
        transform: translateY(-20px) rotate(-5deg);
    }
}

.clay-phone__frame::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
        125deg,
        rgba(255, 255, 255, 0.7) 0%,
        rgba(255, 255, 255, 0.3) 20%,
        transparent 50%
    );
    border-radius: 40px;
    pointer-events: none;
}
</style>
