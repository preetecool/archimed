<template>
    <div class="subscription-info">
        <div v-if="subscriptionStore.isLoading" class="subscription-loading">
            <p>{{ $t("common.loading") }}</p>
        </div>

        <div v-else-if="subscriptionStore.error" class="subscription-error">
            <p>{{ $t("subscription.error") }}</p>
            <button @click="retryFetch" class="retry-button">
                {{ $t("common.retry") }}
            </button>
        </div>

        <div v-else-if="subscriptionStore.activeSubscription" class="subscription-active">
            <div class="subscription-header">
                <h2 class="subscription-title">{{ $t("subscription.your_subscription") }}</h2>
                <div
                    class="subscription-status"
                    :class="`status-${subscriptionStore.activeSubscription.status}`"
                >
                    {{
                        subscriptionStore.formatStatus(subscriptionStore.activeSubscription.status)
                    }}
                </div>
            </div>

            <div class="subscription-details">
                <div class="subscription-plan">
                    <span class="label">{{ $t("subscription.plan") }}:</span>
                    <span class="value">{{
                        formatPlan(subscriptionStore.activeSubscription.planId)
                    }}</span>
                </div>

                <div class="subscription-period">
                    <span class="label">{{ $t("subscription.current_period") }}:</span>
                    <span class="value">
                        {{
                            subscriptionStore.formatDate(
                                subscriptionStore.activeSubscription.currentPeriodStart,
                            )
                        }}
                        -
                        {{
                            subscriptionStore.formatDate(
                                subscriptionStore.activeSubscription.currentPeriodEnd,
                            )
                        }}
                    </span>
                </div>

                <div
                    v-if="subscriptionStore.activeSubscription.cancelAtPeriodEnd"
                    class="subscription-cancel-notice"
                >
                    <p>{{ $t("subscription.ends_notice") }}</p>
                    <button
                        @click="reactivateSubscription"
                        class="reactivate-button"
                        :disabled="isProcessing"
                    >
                        {{ $t("subscription.reactivate") }}
                    </button>
                </div>

                <div
                    v-if="subscriptionStore.isTrialPlan && subscriptionStore.trialDaysLeft > 0"
                    class="subscription-trial-notice"
                >
                    <p>
                        {{
                            $t("subscription.trial_notice", {
                                days: subscriptionStore.trialDaysLeft,
                            })
                        }}
                    </p>
                    <button @click="upgradeToPaid" class="upgrade-button">
                        {{ $t("subscription.upgrade_now") }}
                    </button>
                </div>
            </div>

            <div class="subscription-actions">
                <button
                    v-if="!subscriptionStore.activeSubscription.cancelAtPeriodEnd"
                    @click="cancelSubscription"
                    class="cancel-button"
                    :disabled="isProcessing"
                >
                    {{ $t("subscription.cancel") }}
                </button>

                <button
                    @click="updatePaymentMethod"
                    class="update-payment-button"
                    :disabled="isProcessing"
                >
                    {{ $t("subscription.update_payment_method") }}
                </button>
            </div>
        </div>

        <div v-else class="subscription-none">
            <p>{{ $t("subscription.no_active_subscription") }}</p>
            <button class="subscription-cta-button" @click="goToPricingPage">
                {{ $t("subscription.view_plans") }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSubscriptionStore } from "~/stores/modules/subscription";
import { usePaymentStore } from "~/stores/modules/payment";
import { useUIStore } from "~/stores/modules/ui";

const { t } = useI18n({
    useScope: "local",
});

const router = useRouter();
const subscriptionStore = useSubscriptionStore();
const paymentStore = usePaymentStore();
const uiStore = useUIStore();

const isProcessing = ref(false);

function formatPlan(planId) {
    if (!planId) return "";

    const planMapping = {
        prod_SB8zwxqP3NnnEh: "monthly",
    };

    const internalPlanId = planMapping[planId] || planId;

    const plan = paymentStore.getPlanDetails(internalPlanId);
    return plan ? plan.name : internalPlanId;
}

function goToPricingPage() {
    router.push("/payment");
}

function upgradeToPaid() {
    router.push({
        path: "/payment",
        query: { plan: "monthly" },
    });
}

async function cancelSubscription() {
    if (!confirm(t("subscription.cancel_confirmation"))) {
        return;
    }

    isProcessing.value = true;
    try {
        const result = await subscriptionStore.cancelSubscription();
        if (result.success) {
            uiStore.showSuccess(result.message || t("subscription.cancel_success"));
        } else {
            uiStore.showError(result.error || t("subscription.cancel_error"));
        }
    } catch (error) {
        uiStore.showError(error.message || t("subscription.cancel_error"));
    } finally {
        isProcessing.value = false;
    }
}

async function reactivateSubscription() {
    isProcessing.value = true;
    try {
        const result = await subscriptionStore.reactivateSubscription();
        if (result.success) {
            uiStore.showSuccess(result.message || t("subscription.reactivate_success"));
        } else {
            uiStore.showError(result.error || t("subscription.reactivate_error"));
        }
    } catch (error) {
        uiStore.showError(error.message || t("subscription.reactivate_error"));
    } finally {
        isProcessing.value = false;
    }
}

function updatePaymentMethod() {
    uiStore.showInfo(t("subscription.payment_method_update_coming_soon"));
}

async function retryFetch() {
    await subscriptionStore.fetchActiveSubscription(true);
}

function handleSubscriptionUpdate(event) {
    console.log("SubscriptionInfo received update:", event.detail);
}

onMounted(async () => {
    await subscriptionStore.initialize();

    if (typeof window !== "undefined") {
        window.addEventListener("subscription-updated", handleSubscriptionUpdate);
    }
});

onUnmounted(() => {
    if (typeof window !== "undefined") {
        window.removeEventListener("subscription-updated", handleSubscriptionUpdate);
    }
});
</script>

<style scoped>
.subscription-info {
    margin-top: 2rem;
    margin-bottom: 2rem;
}

.subscription-loading,
.subscription-error,
.subscription-none {
    padding: 2rem;
    text-align: center;
    background-color: #f9fafb;
    border-radius: 0.5rem;
}

.subscription-active {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
}

.subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}

.subscription-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.subscription-status {
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
}

.status-active {
    background-color: #ecfdf5;
    color: #047857;
}

.status-trialing {
    background-color: #eff6ff;
    color: #2563eb;
}

.status-canceled {
    background-color: #fef2f2;
    color: #dc2626;
}

.status-past_due,
.status-incomplete,
.status-incomplete_expired,
.status-unpaid {
    background-color: #fff7ed;
    color: #ea580c;
}

.subscription-details {
    padding: 1.5rem;
}

.subscription-plan,
.subscription-period {
    margin-bottom: 1rem;
}

.label {
    font-weight: 500;
    margin-right: 0.5rem;
}

.subscription-cancel-notice,
.subscription-trial-notice {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.subscription-cancel-notice {
    background-color: #fef2f2;
    color: #b91c1c;
}

.subscription-trial-notice {
    background-color: #eff6ff;
    color: #1e40af;
}

.subscription-actions {
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 1rem;
}

.subscription-cta-button,
.reactivate-button,
.upgrade-button,
.cancel-button,
.update-payment-button,
.retry-button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.subscription-cta-button,
.reactivate-button,
.upgrade-button {
    background-color: var(--accent-color, #0f172a);
    color: white;
}

.subscription-cta-button:hover,
.reactivate-button:hover,
.upgrade-button:hover {
    background-color: var(--accent-hover, #1e293b);
}

.cancel-button {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

.cancel-button:hover {
    background-color: #fee2e2;
}

.update-payment-button {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
}

.update-payment-button:hover {
    background-color: #e5e7eb;
}

.retry-button {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
    margin-top: 1rem;
}

.retry-button:hover {
    background-color: #dbeafe;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

@media (max-width: 640px) {
    .subscription-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }

    .subscription-actions {
        flex-direction: column;
    }
}
</style>
