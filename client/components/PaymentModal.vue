<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay">
                <div class="modal-wrapper">
                    <div class="modal-container">
                        <div class="modal-header">
                            <h2>
                                {{
                                    currentPlan === "trial"
                                        ? $t("trial.title")
                                        : $t("payment.title")
                                }}
                            </h2>
                            <button @click="close" class="close-button">
                                <X size="24" />
                            </button>
                        </div>

                        <div class="plan-selection">
                            <div class="plans-toggle">
                                <button
                                    :class="['plan-button', { active: currentPlan === 'trial' }]"
                                    @click="currentPlan = 'trial'"
                                >
                                    {{ $t("pricing.trial.name") }}
                                    <span class="duration"
                                        >14 {{ $t("pricing.trial.duration") }}</span
                                    >
                                </button>
                                <button
                                    :class="['plan-button', { active: currentPlan === 'monthly' }]"
                                    @click="currentPlan = 'monthly'"
                                >
                                    {{ $t("pricing.professional.name") }}
                                    <span class="price"
                                        >{{ $t("pricing.professional.price") }}/{{
                                            $t("pricing.professional.period")
                                        }}</span
                                    >
                                </button>
                            </div>
                        </div>

                        <div class="modal-content">
                            <div v-if="currentPlan === 'trial'" class="trial-section">
                                <div
                                    v-if="paymentStore.isLoading || isSubmitting"
                                    class="loading-state"
                                >
                                    <p>{{ $t("trial.activating") }}</p>
                                </div>
                                <div v-else-if="activationSuccess" class="success-state">
                                    <div class="success-icon">✓</div>
                                    <h3>{{ $t("trial.activation_success") }}</h3>
                                    <p>{{ $t("trial.activation_message") }}</p>
                                    <p v-if="activationDetails?.expiresAt" class="expiry-info">
                                        {{ $t("trial.expiry_info") }}
                                        <strong>{{
                                            formatDate(activationDetails.expiresAt)
                                        }}</strong>
                                    </p>
                                    <BaseButton
                                        :label="$t('trial.go_to_dashboard')"
                                        variant="primary"
                                        @click="goToDashboard"
                                        class="mt-4"
                                    />
                                </div>

                                <div v-else-if="showTrialPaymentForm" class="trial-payment-form">
                                    <TrialPaymentCollection
                                        @success="handleTrialPaymentSuccess"
                                        @error="handleTrialPaymentError"
                                    />
                                </div>

                                <div v-else class="trial-info">
                                    <p>{{ $t("trial.activate_description") }}</p>
                                    <ul class="feature-list">
                                        <li v-for="feature in trialFeatures" :key="feature">
                                            <Check class="feature-icon" />
                                            {{ feature }}
                                        </li>
                                    </ul>
                                    <div class="trial-disclaimer">
                                        <Info size="16" class="info-icon" />
                                        <span>{{ $t("trial.payment_method_required") }}</span>
                                    </div>
                                    <BaseButton
                                        :label="$t('trial.activate_button')"
                                        variant="primary"
                                        @click="handleTrialActivation"
                                        :disabled="paymentStore.isLoading"
                                        class="mt-4"
                                    />
                                </div>
                            </div>

                            <div v-else class="payment-section">
                                <div class="payment-summary">
                                    <div class="summary-item">
                                        <span>{{ $t("pricing.professional.name") }}</span>
                                        <span>{{ $t("pricing.professional.price") }}</span>
                                    </div>
                                    <div v-if="promoActive" class="summary-item promo">
                                        <span>{{ $t("payment.promo") }}</span>
                                        <span class="discount"
                                            >-{{ paymentStore.formatPrice(promoDiscount) }}</span
                                        >
                                    </div>
                                    <div class="summary-total">
                                        <span>{{ $t("payment.total") }}</span>
                                        <span class="total-amount">{{
                                            paymentStore.formatPrice(finalPrice)
                                        }}</span>
                                    </div>
                                </div>

                                <div class="checkout-section">
                                    <BaseButton
                                        :label="
                                            paymentStore.isLoading
                                                ? $t('payment.processing')
                                                : $t('payment.proceed_to_checkout')
                                        "
                                        variant="primary"
                                        @click="handlePaidPlanCheckout"
                                        :disabled="paymentStore.isLoading"
                                        class="checkout-button"
                                    />
                                    <p class="checkout-info">
                                        {{ $t("payment.stripe_redirect_info") }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { X, Check, Info } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePaymentStore } from "~/stores/modules/payment";
import { useUserStore } from "~/stores/modules/user";
import { useUIStore } from "~/stores/modules/ui";
import TrialPaymentCollection from "~/components/TrialPaymentCollection.vue";

const props = defineProps({
    show: Boolean,
    initialPlan: {
        type: String,
        default: "monthly",
    },
});

const emit = defineEmits(["update:show", "close"]);

const router = useRouter();
const { t } = useI18n({ useScope: "local" });
const paymentStore = usePaymentStore();
const userStore = useUserStore();
const uiStore = useUIStore();

const currentPlan = ref(props.initialPlan);
const activationSuccess = ref(false);
const activationDetails = ref(null);
const redirectToDashboardTimer = ref(null);
const showTrialPaymentForm = ref(false);
const isSubmitting = ref(false);

const trialFeatures = computed(() => {
    const plan = paymentStore.getPlanDetails("trial");
    return plan?.features || [];
});

const userId = computed(() => userStore.userData?.uid);

const promoActive = computed(() => {
    const plan = paymentStore.getPlanDetails("monthly");
    return plan?.promoActive || false;
});

const promoDiscount = computed(() => {
    const plan = paymentStore.getPlanDetails("monthly");
    return plan?.promoDiscount || 0;
});

const finalPrice = computed(() => {
    if (currentPlan.value === "trial") return 0;
    return paymentStore.calculatePrice(currentPlan.value);
});

const close = () => {
    emit("update:show", false);
    emit("close");

    if (activationSuccess.value) {
        goToDashboard();
    }
};

const formatDate = (date) => {
    return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(new Date(date));
};

const handleTrialActivation = async () => {
    showTrialPaymentForm.value = true;
};

const handleTrialPaymentSuccess = async ({ paymentMethodId }) => {
    if (!paymentMethodId) {
        uiStore.showError(t("trial.payment_method_required"));
        return;
    }

    isSubmitting.value = true;

    try {
        const result = await paymentStore.activateSubscription("trial", paymentMethodId);

        if (result.success) {
            activationSuccess.value = true;
            activationDetails.value = result;

            redirectToDashboardTimer.value = setTimeout(() => {
                goToDashboard();
            }, 2000);
        } else {
            throw new Error(result.error || t("trial.default_error"));
        }
    } catch (error) {
        uiStore.showError(error.message || t("trial.default_error"));
    } finally {
        isSubmitting.value = false;
    }
};

const handleTrialPaymentError = ({ error }) => {
    uiStore.showError(error.message || t("trial.payment_error"));
};

const handlePaidPlanCheckout = async () => {
    try {
        const result = await paymentStore.processCheckout(currentPlan.value);

        if (result.success && result.type === "checkout_redirect") {
        } else if (!result.success) {
            console.error("Checkout failed:", result.error);
        }
    } catch (error) {
        uiStore.showError(error.message || t("payment.error_message"));
    }
};

const goToDashboard = () => {
    close();
    router.push("/transcription");
};

watch(
    () => props.initialPlan,
    (newPlan) => {
        if (newPlan) {
            currentPlan.value = newPlan;
            activationSuccess.value = false;
            showTrialPaymentForm.value = false;

            if (redirectToDashboardTimer.value) {
                clearTimeout(redirectToDashboardTimer.value);
            }
        }
    },
);

onBeforeUnmount(() => {
    if (redirectToDashboardTimer.value) {
        clearTimeout(redirectToDashboardTimer.value);
    }
});
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
}

.modal-wrapper {
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.modal-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-color);
}

.close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
}

.close-button:hover {
    color: var(--text-color);
}

.plan-selection {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.plans-toggle {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.plan-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: white;
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.plan-button.active {
    border-color: var(--accent-color);
    background: var(--accent-color);
    color: white;
}

.plan-button .price,
.plan-button .duration {
    font-size: 0.875rem;
    margin-top: 0.25rem;
    color: var(--text-secondary);
}

.plan-button.active .price,
.plan-button.active .duration {
    color: white;
}

.modal-content {
    padding: 1.5rem;
    overflow-y: auto;
}

.payment-summary {
    margin-bottom: 2rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    padding: 1rem;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-color);
}

.summary-item.promo {
    background: #f0fdf4;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
    border: none;
}

.discount {
    color: #059669;
}

.summary-total {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    font-weight: 600;
    font-size: 1.125rem;
    color: var(--text-color);
}

.feature-list {
    margin: 1rem 0;
}

.feature-list li {
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
}

.success-icon {
    width: 3rem;
    height: 3rem;
    background-color: var(--accent-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin: 0 auto 1.5rem;
}

.expiry-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f0fdf4;
    border-radius: 0.5rem;
    color: #059669;
}

.trial-disclaimer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background: #eff6ff;
    border-radius: 0.5rem;
    color: #1e40af;
    font-size: 0.875rem;
}

.info-icon {
    color: #1e40af;
    flex-shrink: 0;
}

.trial-payment-form {
    margin-top: 1rem;
}

.checkout-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.checkout-button {
    width: 100%;
    max-width: 300px;
}

.checkout-info {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-align: center;
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

@media (max-width: 640px) {
    .plans-toggle {
        flex-direction: column;
    }
}

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
}

.mt-4 {
    margin-top: 1rem;
}
</style>
