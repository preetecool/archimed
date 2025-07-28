<template>
    <div class="success-page">
        <Navigation />

        <div class="container">
            <div class="success-card">
                <div class="success-icon">✓</div>
                <h1>{{ $t("payment.payment_success") }}</h1>
                <p>{{ $t("payment.success_message") }}</p>

                <div v-if="paymentDetails">
                    <div class="details-section">
                        <h2>{{ $t("payment.payment_details") }}</h2>
                        <div class="detail-row">
                            <span>{{ $t("payment.payment_id") }}</span>
                            <span>{{ paymentDetails.id }}</span>
                        </div>
                        <div class="detail-row">
                            <span>{{ $t("payment.amount") }}</span>
                            <span>{{ formatAmount(paymentDetails.amount) }}</span>
                        </div>
                        <div class="detail-row">
                            <span>{{ $t("payment.date") }}</span>
                            <span>{{ formatDate(paymentDetails.created) }}</span>
                        </div>
                    </div>
                </div>

                <div
                    v-if="subscriptionStore.hasActiveSubscription"
                    class="subscription-status-section"
                >
                    <h2>{{ $t("subscription.your_subscription") }}</h2>
                    <div class="subscription-card">
                        <div class="subscription-plan">
                            <span class="plan-name">
                                {{ formatPlan(subscriptionStore.activeSubscription?.planId) }}
                            </span>
                            <span
                                class="plan-status"
                                :class="`status-${subscriptionStore.activeSubscription?.status}`"
                            >
                                {{
                                    subscriptionStore.formatStatus(
                                        subscriptionStore.activeSubscription?.status,
                                    )
                                }}
                            </span>
                        </div>
                        <div v-if="subscriptionStore.isTrialPlan" class="trial-info">
                            <p>
                                {{
                                    $t("subscription.trial_notice", {
                                        days: subscriptionStore.trialDaysLeft,
                                    })
                                }}
                            </p>
                        </div>
                        <div v-else class="billing-info">
                            <p>
                                {{ $t("subscription.next_billing") }}:
                                {{ subscriptionStore.formattedExpiryDate }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="action-buttons">
                    <button @click="goToDashboard" class="primary-button">
                        {{ $t("payment.go_to_dashboard") }}
                    </button>
                    <button @click="goToAccount" class="secondary-button">
                        {{ $t("payment.manage_subscription") }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSubscriptionStore } from "~/stores/modules/subscription";
import { usePaymentStore } from "~/stores/modules/payment";

definePageMeta({
    middleware: ["auth"],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { stripe } = useClientStripe();
const subscriptionStore = useSubscriptionStore();
const paymentStore = usePaymentStore();

const paymentDetails = ref(null);
const error = ref(null);
const isLoading = ref(true);

const formatAmount = (amount) => {
    if (!amount) return "0,00 $";
    const value = amount / 100;
    return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
    }).format(value);
};

const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const formatPlan = (planId) => {
    if (!planId) return "";

    const planMapping = {
        prod_SB8zwxqP3NnnEh: "monthly",
    };

    const internalPlanId = planMapping[planId] || planId;

    const plan = paymentStore.getPlanDetails(internalPlanId);
    return plan ? plan.name : internalPlanId;
};

const goToDashboard = () => {
    router.push("/transcription");
};

const goToAccount = () => {
    router.push("/account");
};

const processCheckoutSuccess = async () => {
    try {
        const sessionId = route.query.session_id;
        const paymentIntentId = route.query.payment_intent;
        const clientSecret = route.query.payment_intent_client_secret;

        if (stripe.value && clientSecret) {
            try {
                const { paymentIntent } = await stripe.value.retrievePaymentIntent(clientSecret);
                if (paymentIntent) {
                    paymentDetails.value = paymentIntent;
                }
            } catch (stripeError) {
                console.error("Error retrieving payment intent:", stripeError);
            }
        }

        if (sessionId || paymentIntentId) {
            await paymentStore.handleCheckoutSuccess(sessionId, paymentIntentId);
        } else {
            await subscriptionStore.refreshAfterPaymentAction();
        }
    } catch (err) {
        console.error("Error processing checkout success:", err);
        error.value = t("payment.error_retrieving_details");
    } finally {
        isLoading.value = false;
    }
};

onMounted(async () => {
    await processCheckoutSuccess();

    useHead({
        title: () => t("payment.payment_success") + " | " + t("app.title"),
    });
});
</script>

<style scoped>
.success-page {
    min-height: 100vh;
    background-color: #f8fafc;
    padding: 60px 0;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px;
}

.success-card {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    padding: 40px;
    text-align: center;
}

.success-icon {
    width: 80px;
    height: 80px;
    background-color: #10b981;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    margin: 0 auto 30px;
}

.success-card h1 {
    font-size: 2rem;
    color: var(--primary-color, #0f172a);
    margin-bottom: 16px;
}

.success-card p {
    font-size: 1.125rem;
    color: #4b5563;
    margin-bottom: 30px;
}

.details-section,
.subscription-status-section {
    margin: 30px 0;
    text-align: left;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    background-color: #f8fafc;
}

.details-section h2,
.subscription-status-section h2 {
    font-size: 1.25rem;
    color: var(--primary-color, #0f172a);
    margin-bottom: 16px;
    text-align: center;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #e2e8f0;
}

.detail-row:last-child {
    border-bottom: none;
}

.subscription-card {
    background: white;
    border-radius: 6px;
    padding: 16px;
    border: 1px solid #e2e8f0;
}

.subscription-plan {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.plan-name {
    font-weight: 600;
    color: #374151;
}

.plan-status {
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
}

.status-active {
    background-color: #ecfdf5;
    color: #047857;
}

.status-trialing {
    background-color: #eff6ff;
    color: #2563eb;
}

.trial-info,
.billing-info {
    font-size: 0.875rem;
    color: #6b7280;
}

.trial-info {
    background-color: #eff6ff;
    color: #1e40af;
    padding: 8px 12px;
    border-radius: 4px;
}

.action-buttons {
    margin-top: 30px;
    display: flex;
    gap: 16px;
    justify-content: center;
}

.primary-button,
.secondary-button {
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    border: none;
}

.primary-button {
    background-color: var(--accent-color, #0f172a);
    color: white;
}

.primary-button:hover {
    background-color: var(--accent-hover, #1e293b);
}

.secondary-button {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
}

.secondary-button:hover {
    background-color: #e5e7eb;
}

@media (max-width: 640px) {
    .success-card {
        padding: 30px 20px;
    }

    .success-icon {
        width: 60px;
        height: 60px;
        font-size: 30px;
    }

    .success-card h1 {
        font-size: 1.5rem;
    }

    .action-buttons {
        flex-direction: column;
    }

    .subscription-plan {
        flex-direction: column;
        gap: 8px;
        text-align: center;
    }
}
</style>
