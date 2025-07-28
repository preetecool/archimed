<template>
    <div class="hero-gradient-container">
        <div class="hero-gradient-mesh"></div>
        <div class="hero-gradient-primary"></div>
        <div class="hero-gradient-dots"></div>
        <div class="hero-gradient-accent"></div>
    </div>
</template>

<style>
:root {
    --accent-color-transparent: rgba(42, 70, 178, 0.2);
    --accent-hover-transparent: rgba(63, 93, 198, 0.1);
    --accent-light: rgba(144, 224, 255, 0.15);
    --subtle-white: rgba(255, 255, 255, 0.5);
}

.hero-gradient-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: -1;
}

.hero-gradient-primary {
    position: absolute;
    top: -20%;
    right: -20%;
    width: 140%;
    height: 140%;
    background: linear-gradient(
        135deg,
        rgba(42, 70, 178, 0.03) 0%,
        rgba(63, 93, 198, 0.05) 30%,
        rgba(144, 224, 255, 0.07) 70%,
        rgba(255, 255, 255, 0.03) 100%
    );
    filter: blur(30px);
    animation: gradientShift 25s ease-in-out infinite alternate;
}

.hero-gradient-accent {
    position: absolute;
    top: 30%;
    right: 15%;
    width: 30vw;
    height: 30vw;
    background: radial-gradient(circle, var(--accent-light) 0%, rgba(144, 224, 255, 0) 70%);
    border-radius: 40% 60% 60% 40% / 60% 30% 70% 40%;
    animation:
        blobMove 20s ease-in-out infinite,
        blobMorph 15s ease-in-out infinite;
    opacity: 0.5;
}

.hero-gradient-dots {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(rgba(42, 70, 178, 0.2) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.1;
    animation: dotFloat 60s linear infinite;
}

.hero-gradient-mesh {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
        linear-gradient(to right, rgba(42, 70, 178, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(42, 70, 178, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    transform: skewY(-1deg);
    transform-origin: top left;
    animation: meshFloat 40s linear infinite;
}

@keyframes gradientShift {
    0% {
        transform: translate(0, 0) scale(1);
    }

    50% {
        transform: translate(-5%, 5%) scale(1.1);
    }

    100% {
        transform: translate(5%, -5%) scale(1);
    }
}

@keyframes blobMove {
    0% {
        transform: translate(0, 0) rotate(0deg);
    }

    33% {
        transform: translate(5%, 5%) rotate(90deg);
    }

    66% {
        transform: translate(-5%, 10%) rotate(180deg);
    }

    100% {
        transform: translate(0, 0) rotate(360deg);
    }
}

@keyframes blobMorph {
    0%,
    100% {
        border-radius: 40% 60% 60% 40% / 60% 30% 70% 40%;
    }

    25% {
        border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
    }

    50% {
        border-radius: 60% 40% 30% 70% / 60% 40% 60% 40%;
    }

    75% {
        border-radius: 40% 60% 50% 50% / 30% 40% 60% 70%;
    }
}

@keyframes dotFloat {
    0% {
        background-position: 0 0;
    }

    100% {
        background-position: 100px 100px;
    }
}

@keyframes meshFloat {
    0% {
        background-position: 0 0;
    }

    100% {
        background-position: 40px 40px;
    }
}

@media (max-width: 768px) {
    .hero-gradient-accent {
        width: 60vw;
        height: 60vw;
    }

    .hero-gradient-dots {
        background-size: 20px 20px;
    }

    .hero-gradient-mesh {
        background-size: 30px 30px;
    }
}
</style>
