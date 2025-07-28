<template>
    <section class="pricing-section py-16 bg-gray-50">
        <div class="mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-5xl mx-auto">
                <div class="section-header">
                    <h2>{{ $t("pricing.title") }}</h2>
                    <p>{{ $t("pricing.subtitle") }}</p>
                </div>

                <div class="pricing-cards">
                    <article
                        v-for="plan in planTypes"
                        :key="plan"
                        :class="[
                            'pricing-card',
                            plan === 'professional' ? 'pricing-card-featured' : '',
                        ]"
                    >
                        <header class="pricing-header">
                            <h3 class="pricing-card-heading">
                                {{ $t(`pricing.${plan}.name`) }}
                            </h3>
                            <div>
                                <span class="price-text">
                                    {{ $t(`pricing.${plan}.price`) }}
                                </span>
                                <span v-if="plan !== 'enterprise'" class="text-gray-500 ml-1">
                                    {{ $t(`pricing.${plan}.period`) }}
                                </span>
                            </div>
                        </header>

                        <div class="spacer"></div>

                        <div class="pricing-features">
                            <ul class="feature-list">
                                <li
                                    v-for="(feature, featureIndex) in tm(
                                        `pricing.features.${plan}`,
                                    )"
                                    :key="featureIndex"
                                    class="feature-item"
                                >
                                    <CheckCircle class="feature-icon" />
                                    <span class="feature-text">{{ $rt(feature) }}</span>
                                </li>
                            </ul>
                        </div>

                        <footer class="pricing-footer">
                            <BaseButton
                                :label="$t(`pricing.${plan}.cta`)"
                                :variant="plan === 'professional' ? 'primary' : 'outline'"
                                class="w-full"
                                :lightFill="plan !== 'professional'"
                                @click="selectPlan(plan === 'trial' ? 'trial' : plan)"
                            />
                        </footer>
                    </article>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { CheckCircle } from "lucide-vue-next";

const props = defineProps({
    selectedPlan: {
        type: String,
        default: null,
    },
});

const emit = defineEmits(["plan-selected"]);
const { t, tm, rt } = useI18n({
    useScope: "local",
});
const router = useRouter();

const planTypes = ["trial", "professional", "enterprise"];

const selectPlan = (plan) => {
    emit("plan-selected", plan);

    const mappedPlan = plan === "free" ? "trial" : plan === "professional" ? "monthly" : plan;

    router.push({
        path: "/payment",
        query: { plan: mappedPlan },
    });
};
</script>

<style scoped>
.pricing-section {
    padding: 4rem 0;
}

:root {
    --accent-color: #4f46e5;
    --accent-dark: #4338ca;
    --text-color: #1f2937;
    --border-color: #e5e7eb;
}

.text-accent {
    color: var(--accent-color, #4f46e5);
}

.bg-accent {
    background-color: var(--accent-color, #4f46e5);
}

.pricing-section {
    padding: 4rem 0;
}
.pricing-card-heading {
    color: var(--heading-color);
    font-size: 24px;
    line-height: 28px;
    font-weight: 700;
    letter-spacing: -0.2px;
}

.pricing-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    position: relative;
}
.price-text {
    font-size: 18px;
    letter-spacing: 0.2px;
    font-weight: 500;
    color: var(--text-color);
}

.pricing-card {
    display: flex;
    flex-direction: column;
    background-color: white;
    border: 1px solid var(--border-color, #e5e7eb);
    height: 100%;
    position: relative;
    gap: 20px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.pricing-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.pricing-card:first-child {
    border-radius: 0.5rem 0 0 0.5rem;
    border-right: none;
}

.pricing-card:nth-child(2) {
    margin-block-start: -15px;
    margin-block-end: -34px;
    padding-block-start: 39px;
    padding-block-end: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    z-index: 10;
    border-radius: 0.5rem;
    box-sizing: initial;
}

.pricing-card:last-child {
    border-radius: 0 0.5rem 0.5rem 0;
    border-left: none;
}

.pricing-header {
    padding: 1.5rem 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.spacer {
    border-top: 1px solid var(--border-color, #e5e7eb);
    margin-inline: -24px;
}

.pricing-features {
    padding: 1.5rem 0;
    flex-grow: 1;
}

.pricing-footer {
    padding: 1.5rem 0;
    margin-top: auto;
}

.feature-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.feature-item {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
}

.feature-icon {
    height: 1.25rem;
    width: 1.25rem;
    color: var(--accent-color, #4f46e5);
    margin-right: 0.5rem;
    flex-shrink: 0;
}

.feature-text {
    font-size: 0.875rem;
    color: #4b5563;
}

@media (max-width: 768px) {
    .pricing-cards {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }

    .pricing-card {
        border-radius: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
    }

    .pricing-card:nth-child(2) {
        order: -1;
        margin-block: 0;
        padding-block-start: 2rem;
        padding-block-end: 1.5rem;
    }

    .pricing-card:first-child,
    .pricing-card:last-child {
        border-radius: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
    }
}
</style>
