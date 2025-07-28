<template>
    <div class="hero-wrapper">
        <section class="hero">
            <BaseContainer padding="xl" :fluid="false">
                <div class="hero-content">
                    <div class="hero-text">
                        <div class="hero-heading">
                            <h1>
                                <span class="static-text">{{ $t("hero.title_start") }}</span>
                                <span class="gradient-text">{{ $t("hero.title_highlight") }}</span>
                                <span class="static-text">{{ $t("hero.title_end") }}</span>
                            </h1>

                            <p class="subtitle">
                                {{ $t("hero.subtitle") }}
                            </p>
                        </div>

                        <div class="hero-actions">
                            <BaseButton
                                :label="$t('hero.cta_primary')"
                                variant="primary"
                                size="md"
                                pointerRight
                                class="primary-btn"
                                @click="$emit('primary-action')"
                            />
                        </div>
                    </div>

                    <div class="hero-visual">
                        <div class="ecg-background">
                            <ECGAnimation />
                        </div>
                        <div class="decorative-shape"></div>
                        <div class="decorative-shape shape-secondary"></div>
                        <ClayDesktop :imageSrc="appScreenshotSrc || '/screenshot-app.png'" />
                    </div>
                </div>
            </BaseContainer>

            <div class="hero-bg-gradient"></div>
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const props = defineProps({
    showSecondaryAction: {
        type: Boolean,
        default: true,
    },
    appScreenshotSrc: {
        type: String,
        default: "",
    },
});

defineEmits(["primary-action", "secondary-action"]);

onMounted(() => {
    const observerOptions = {
        threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, observerOptions);

    document.querySelectorAll(".hero-text, .hero-visual").forEach((el) => {
        observer.observe(el);
    });
});
</script>

<style scoped>
.hero-wrapper {
    position: relative;
    overflow-x: hidden;
    --gradient-red: #5045e4;
    --gradient-yellow: #41e6c0;
    --heading-color: #1a202c;
    --text-color: #4a5568;

    --card-bg: #ffffff;
    --border-color: #e2e8f0;
}

.hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    background-color: var(--bg-color);
    overflow: hidden;
    z-index: 1;
}

.hero-bg-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
        linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
    background-size: 25px 25px;
    background-position: center center;
    z-index: -2;
}

.hero-bg-gradient {
    position: absolute;
    top: -30%;
    right: -20%;
    width: 80%;
    height: 80%;
    background: radial-gradient(circle, rgba(65, 230, 192, 0.07) 0%, rgba(248, 250, 252, 0) 70%);
    filter: blur(70px);
    z-index: -1;
}

.hero-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    position: relative;
    z-index: 2;
    padding: 2rem 0;
}

.hero-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    margin: 0 auto;
    opacity: 0;
    transform: translateY(20px);
    transition:
        opacity 0.6s ease,
        transform 0.6s ease;
}

.hero-text.visible {
    opacity: 1;
    transform: translateY(0);
}

.hero-badge {
    display: inline-flex;
    align-items: center;
    background: rgba(65, 230, 192, 0.1);
    border: 1px solid rgba(65, 230, 192, 0.3);
    border-radius: 2rem;
    padding: 0.5rem 1rem;
    margin-bottom: 1.5rem;
    gap: 0.5rem;
    box-shadow: 0 2px 5px rgba(65, 230, 192, 0.1);
}

.pulse-dot {
    width: 8px;
    height: 8px;
    background-color: var(--accent-color);
    border-radius: 50%;
    display: inline-block;
    position: relative;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(65, 230, 192, 0.7);
    }
    70% {
        box-shadow: 0 0 0 6px rgba(65, 230, 192, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(65, 230, 192, 0);
    }
}

.badge-text {
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent-color);
}

.hero-heading {
    text-align: center;
    margin-bottom: 2rem;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 32px;
}

h1 {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--heading-color);
    letter-spacing: -0.03em;
}

.subtitle {
    font-size: 18px;
    line-height: 1.4;
    color: var(--text-color);
    margin: 0 auto;
}

.gradient-text {
    background: linear-gradient(
        135deg,
        var(--accent-color) 0%,
        var(--gradient-red) 50%,
        var(--gradient-yellow) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite;
}

.hero-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center;
    flex-wrap: wrap;
}

.primary-btn {
    position: relative;
    overflow: hidden;
}

.primary-btn::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(30deg);
    animation: shineEffect 4s infinite;
}

@keyframes shineEffect {
    0% {
        left: -150%;
    }
    80% {
        left: -150%;
    }
    100% {
        left: 150%;
    }
}

.ecg-background {
    position: absolute;
    width: 100vw;
    left: 50%;
    transform: translateX(-50%);
    top: 50%;
    margin-top: -30px;
    z-index: -1;
    pointer-events: none;
}

.hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 450px;
    width: 100%;
    max-width: 900px;
    margin-top: 1rem;
    opacity: 0;
    transform: translateY(20px);
    transition:
        opacity 0.6s ease 0.3s,
        transform 0.6s ease 0.3s;
}

.hero-visual.visible {
    opacity: 1;
    transform: translateY(0);
}

.decorative-shape {
    position: absolute;
    width: 350px;
    height: 350px;
    background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%);
    opacity: 0.15;
    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
    transform: rotate(-15deg);
    z-index: 0;
    filter: blur(40px);
    animation: morphShape 20s ease-in-out infinite;
}

.shape-secondary {
    position: absolute;
    width: 250px;
    height: 250px;
    background: linear-gradient(135deg, var(--gradient-red) 0%, var(--accent-hover) 100%);
    opacity: 0.1;
    border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
    right: -30px;
    bottom: -30px;
    z-index: 0;
    filter: blur(40px);
    animation: morphShape 15s ease-in-out infinite reverse;
}

@keyframes gradientShift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

@keyframes morphShape {
    0%,
    100% {
        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
    }
    25% {
        border-radius: 50% 50% 70% 30% / 50% 50% 70% 30%;
    }
    50% {
        border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
    }
    75% {
        border-radius: 30% 70% 50% 50% / 30% 30% 70% 70%;
    }
}

@media (min-width: 768px) {
    h1 {
        font-size: 3.5rem;
    }

    .hero-content {
        gap: 3rem;
    }
}

@media (min-width: 1024px) {
    h1 {
        font-size: 4rem;
    }

    .decorative-shape {
        width: 500px;
        height: 500px;
    }

    .shape-secondary {
        width: 350px;
        height: 350px;
    }
}

@media (max-width: 767px) {
    .hero-badge {
        padding: 0.4rem 0.8rem;
    }

    h1 {
        font-size: 2.5rem;
    }

    .subtitle {
        font-size: 1rem;
    }

    .hero-actions {
        flex-direction: column;
        width: 100%;
        max-width: 280px;
    }

    .hero-visual {
        min-height: 320px;
    }
}
</style>
