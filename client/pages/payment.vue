<template>
    <div class="payment-page">
        <div class="section-switcher">
            <button
                class="switcher-button"
                :class="{ active: !isEnterprise }"
                @click="isEnterprise = false"
            >
                {{ $t("pricing.title") }}
            </button>
            <button
                class="switcher-button"
                :class="{ active: isEnterprise }"
                @click="isEnterprise = true"
            >
                {{ $t("pricing.enterprise.name") }}
            </button>
        </div>

        <div class="pricing-container">
            <h1 class="pricing-title">{{ $t("pricing.title") }}</h1>
            <p class="pricing-subtitle">{{ $t("pricing.subtitle") }}</p>

            <div class="plans-grid">
                <template v-if="!isEnterprise">
                    <div class="plan-card" :class="{ active: selectedPlan === 'trial' }">
                        <div class="plan-header">
                            <h2>{{ $t("pricing.trial.name") }}</h2>
                            <p class="price">
                                <span class="amount">14</span>
                                <span class="period">{{ $t("pricing.trial.duration") }}</span>
                            </p>
                            <p class="description">{{ $t("pricing.trial.description") }}</p>
                        </div>
                        <ul class="features-list">
                            <li v-for="feature in trialFeatures" :key="feature">
                                <Check class="feature-icon" />
                                {{ feature }}
                            </li>
                        </ul>
                        <button
                            class="select-plan-button"
                            @click="handlePlanSelection('trial')"
                            :disabled="paymentStore.isLoading"
                        >
                            <span v-if="paymentStore.isLoading && selectedPlan === 'trial'">
                                {{ $t("common.loading") }}
                            </span>
                            <span v-else>
                                {{ $t("pricing.trial.cta") }}
                            </span>
                        </button>
                    </div>

                    <div class="plan-card featured" :class="{ active: selectedPlan === 'monthly' }">
                        <div class="plan-header">
                            <div class="recommend-badge">
                                {{ $t("pricing.professional.recommended") }}
                            </div>
                            <h2>{{ $t("pricing.professional.name") }}</h2>
                            <p class="price">
                                <span class="amount">{{ $t("pricing.professional.price") }}</span>
                                <span class="period">{{ $t("pricing.professional.period") }}</span>
                            </p>
                            <p class="description">{{ $t("pricing.professional.description") }}</p>
                        </div>
                        <ul class="features-list">
                            <li v-for="feature in professionalFeatures" :key="feature">
                                <Check class="feature-icon" />
                                {{ feature }}
                            </li>
                        </ul>
                        <button
                            @click="handlePlanSelection('monthly')"
                            :disabled="paymentStore.isLoading"
                            class="select-plan-button primary"
                        >
                            <span v-if="paymentStore.isLoading && selectedPlan === 'monthly'">
                                {{ $t("payment.processing") }}
                            </span>
                            <span v-else>
                                {{ $t("payment.proceed_to_checkout") }}
                            </span>
                        </button>
                    </div>
                </template>

                <div v-else class="plan-card enterprise">
                    <div class="plan-header">
                        <h2>{{ $t("pricing.enterprise.name") }}</h2>
                        <p class="price">
                            <span class="amount">{{ $t("pricing.enterprise.price") }}</span>
                        </p>
                        <p class="description">{{ $t("pricing.enterprise.description") }}</p>
                    </div>
                    <ul class="features-list">
                        <li v-for="feature in enterpriseFeatures" :key="feature">
                            <Check class="feature-icon" />
                            {{ feature }}
                        </li>
                    </ul>
                    <button class="select-plan-button" @click="handleContactTeam">
                        {{ $t("pricing.enterprise.cta") }}
                    </button>
                </div>
            </div>
        </div>

        <PaymentModal
            v-model:show="showPaymentModal"
            :initial-plan="selectedPlan"
            @close="handleModalClose"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Check } from "lucide-vue-next";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePaymentStore } from "~/stores/modules/payment";
import { useUserStore } from "~/stores/modules/user";
import { useUIStore } from "~/stores/modules/ui";
import { useSubscriptionStore } from "~/stores/modules/subscription";
import PaymentModal from "~/components/PaymentModal.vue";

definePageMeta({
    middleware: ["auth"],
});

const { t } = useI18n({ useScope: "local" });
const router = useRouter();
const route = useRoute();
const paymentStore = usePaymentStore();
const userStore = useUserStore();
const uiStore = useUIStore();
const subscriptionStore = useSubscriptionStore();
const user = useCurrentUser();

const isEnterprise = ref(false);
const showPaymentModal = ref(false);
const selectedPlan = ref(null);

const trialFeatures = computed(() => {
    const plan = paymentStore.getPlanDetails("trial");
    return plan?.features || [];
});

const professionalFeatures = computed(() => {
    const plan = paymentStore.getPlanDetails("monthly");
    return plan?.features || [];
});

const enterpriseFeatures = computed(() => {
    const plan = paymentStore.getPlanDetails("enterprise");
    return plan?.features || [];
});

onMounted(async () => {
    if (route.query.plan) {
        selectedPlan.value = route.query.plan.toString();
    }

    if (user.value) {
        try {
            await subscriptionStore.fetchActiveSubscription();

            if (selectedPlan.value === "trial") {
                showPaymentModal.value = true;
            }
        } catch (err) {
            console.error("Error loading user data:", err);
        }
    } else {
        console.log("No current user found");
    }
});

const handlePlanSelection = async (plan) => {
    console.log(`Plan selected: ${plan}`);
    selectedPlan.value = plan;

    if (!userStore.isAuthenticated) {
        console.log("User not authenticated, redirecting to login");
        router.push(`/login?redirect=${encodeURIComponent("/payment")}&plan=${plan}`);
        return;
    }

    if (plan === "enterprise") {
        handleContactTeam();
        return;
    }

    try {
        const result = await paymentStore.processCheckout(plan);

        if (result.redirectToLogin) {
            router.push(`/login?redirect=${encodeURIComponent("/payment")}&plan=${plan}`);
            return;
        }

        if (result.redirectToContact) {
            handleContactTeam();
            return;
        }

        if (result.success) {
            if (result.type === "checkout_redirect") {
            } else if (plan === "trial") {
                showPaymentModal.value = true;
            }
        } else {
            console.error("Failed to process plan selection:", result.error);
        }
    } catch (error) {
        uiStore.showError(error.message || "Failed to process plan selection");
    } finally {
        selectedPlan.value = null;
    }
};

const handleModalClose = () => {
    console.log("Modal closed");
    selectedPlan.value = null;
    showPaymentModal.value = false;
};

const handleContactTeam = () => {
    router.push("/contact?subject=Enterprise%20Solution");
};

useHead({
    title: `${t("pricing.title")} | ${t("app.title")}`,
});
</script>

<style scoped>
.payment-page {
    min-height: 100vh;
    background-color: white;
    padding: 4rem 1rem;
}

.section-switcher {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 4rem;
}

.switcher-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: white;
    color: var(--text-color);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
}

.switcher-button.active {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
}

.pricing-container {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
}

.pricing-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--text-color);
}

.pricing-subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin-bottom: 4rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 1000px;
    margin: 0 auto;
}

.plan-card {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    padding: 2rem;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;
}

.plan-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
}

.plan-card.featured {
    border-color: var(--accent-color);
}

.plan-card.active {
    border-color: var(--accent-color);
}

.recommend-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: var(--accent-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
}

.plan-header {
    text-align: center;
    margin-bottom: 2rem;
}

.plan-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--text-color);
}

.price {
    margin-bottom: 1rem;
}

.amount {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-color);
}

.period {
    color: var(--text-secondary);
    font-size: 1rem;
}

.description {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.features-list {
    margin: 2rem 0;
    text-align: left;
    flex-grow: 1;
}

.features-list li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    color: var(--text-color);
}

.feature-icon {
    color: var(--accent-color);
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}

.select-plan-button {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    border: 1px solid var(--border-color);
    color: var(--text-color);
}

.select-plan-button.primary {
    background: var(--accent-color);
    border: none;
    color: white;
}

.select-plan-button:hover:not(:disabled) {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
}

.select-plan-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .pricing-title {
        font-size: 2rem;
    }
}
</style>
