<template>
    <section id="features" class="features" ref="featuresSection">
        <div class="container">
            <div class="section-header">
                <h2>{{ $t("features.title") }}</h2>
                <p>{{ $t("features.subtitle") }}</p>
            </div>

            <div class="feature-integrations">
                <div class="integration-button">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0a2540"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-lightbulb"
                    >
                        <path
                            d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
                        />
                        <path d="M9 18h6" />
                        <path d="M10 22h4" />
                    </svg>
                </div>

                <div class="integration-button">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0a2540"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-lock"
                    >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>

                <div class="integration-button">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0a2540"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-zap"
                    >
                        <path
                            d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                        />
                    </svg>
                </div>

                <div class="integration-button">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0a2540"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="lucide lucide-brain-circuit"
                    >
                        <path
                            d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z"
                        />
                        <path d="M16 8V5c0-1.1.9-2 2-2" />
                        <path d="M12 13h4" />
                        <path d="M12 18h6a2 2 0 0 1 2 2v1" />
                        <path d="M12 8h8" />
                        <path d="M20.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                        <path d="M16.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                        <path d="M20.5 21a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                        <path d="M18.5 3a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                    </svg>
                </div>
            </div>

            <div class="connecting-lines-container">
                <svg
                    class="connecting-lines"
                    width="600"
                    height="80"
                    fill="none"
                    viewBox="0 0 600 80"
                >
                    <g stroke="var(--border-color)" stroke-width="2" stroke-opacity="1">
                        <path d="M36 0v12c0 18 12 32 32 32h194c22 0 38 16 38 36"></path>

                        <path d="M212 0v12c0 18 12 32 16 32h34c22 0 38 16 38 36"></path>

                        >
                        <path d="M388 0v12c0 18-12 32-16 32h-34c-22 0-38 16-38 36"></path>

                        <path d="M564 0v12c0 18-12 32-32 32h-194c-22 0-38 16-38 36"></path>
                    </g>
                </svg>
            </div>

            <div class="feature-cards-container">
                <div class="vertical-connector"></div>

                <div class="feature-cards">
                    <div class="feature-card">
                        <div class="card-header">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0a2540"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="card-icon lucide lucide-lightbulb"
                            >
                                <path
                                    d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
                                />
                                <path d="M9 18h6" />
                                <path d="M10 22h4" />
                            </svg>
                            <h3>{{ $t("features.card1.title") }}</h3>
                        </div>
                        <p>{{ $t("features.card1.description") }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="card-header">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0a2540"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="card-icon lucide lucide-lock"
                            >
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <h3>{{ $t("features.card2.title") }}</h3>
                        </div>
                        <p>{{ $t("features.card2.description") }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="card-header">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0a2540"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="card-icon lucide lucide-zap"
                            >
                                <path
                                    d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                                />
                            </svg>
                            <h3>{{ $t("features.card3.title") }}</h3>
                        </div>
                        <p>{{ $t("features.card3.description") }}</p>
                    </div>

                    <div class="feature-card">
                        <div class="card-header">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0a2540"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="card-icon lucide lucide-brain-circuit"
                            >
                                <path
                                    d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z"
                                />
                                <path d="M16 8V5c0-1.1.9-2 2-2" />
                                <path d="M12 13h4" />
                                <path d="M12 18h6a2 2 0 0 1 2 2v1" />
                                <path d="M12 8h8" />
                                <path d="M20.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                <path d="M16.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                <path d="M20.5 21a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                <path d="M18.5 3a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                            </svg>
                            <h3>Smart AI Integration</h3>
                        </div>
                        <p>
                            Integrate powerful AI capabilities into your workflow with advanced
                            machine learning algorithms.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const featuresSection = ref(null);
const isVisible = ref(false);

const observeSection = () => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    isVisible.value = true;
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.2 },
    );

    if (featuresSection.value) {
        observer.observe(featuresSection.value);
    }

    return observer;
};

let observer;
onMounted(() => {
    observer = observeSection();
});

onUnmounted(() => {
    if (observer) {
        observer.disconnect();
    }
});
</script>

<style scoped>
.features {
    padding: 5rem 0;
    position: relative;
}

.container {
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
}

.feature-integrations {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.integration-button {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e2e8f0);
    background-color: var(--card-bg, white);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 1;
}

.integration-button::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
    height: 6px;
    width: 6px;
    background: var(--color-accent-color, rgb(117, 170, 255));
    border-radius: 50%;
    z-index: 1;
}

.integration-button:hover {
    background-color: var(--border-color);
    border: 1px solid rgba(114, 168, 255, 0.438);
}

.integration-button svg {
    width: 24px;
    height: 24px;
    color: var(--text-primary, #1e293b);
}

.connecting-lines {
    width: 100%;
    margin-top: -8px;
}

.vertical-connector {
    left: 50%;
    top: 0;
    height: 600px;
    width: 2px;
    background-color: var(--border-color);
    position: absolute;
}

.feature-cards-container {
    position: relative;
    max-width: 600px;
    margin: 0 auto;
    min-height: 420px;
    overflow: hidden;
}

.feature-cards {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: 24px;
}

.feature-card {
    background-color: white;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    animation: slideIn 0.5s ease forwards;
    opacity: 0;
    transform: translateX(20px);
    max-width: 480px;
    background-color: #fbfbfd;
    width: 100%;
}

.feature-card:nth-child(1) {
    animation-delay: 0.1s;
}

.feature-card:nth-child(2) {
    animation-delay: 0.2s;
}

.feature-card:nth-child(3) {
    animation-delay: 0.3s;
}

.feature-card:hover {
    background-color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px) translateX(20px);
}
.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.connector-dot {
    position: absolute;
    left: -28px;
    width: 10px;
    height: 10px;
    background: var(--color-brand-bg, rgb(114, 168, 255));
    border-radius: 50%;
    z-index: 2;
}
.connector-dot::before {
    content: "";
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    height: 1.5px;
    width: 18px;
    background-color: var(--border-color);
    opacity: 1;
}

.card-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.feature-card h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #0a2540;
}

.feature-card p {
    margin: 0;
    color: var(--text-color);
    font-size: 0.95rem;
    line-height: 1.5;
}

@keyframes slideIn {
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@media (max-width: 768px) {
    .integration-button::after {
        display: none;
    }

    .features-cards {
        margin-top: -100px;
    }

    .vertical-connector {
        top: -10px;
    }
}

@media (max-width: 640px) {
    .features {
        padding: 3rem 0;
    }

    .section-header h2 {
        font-size: 1.75rem;
    }

    .section-header p {
        font-size: 1rem;
    }
    .vertical-connector {
        top: -10px;
    }
}
</style>
