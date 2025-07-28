<template>
    <div class="payment-history">
        <div class="payment-history-header">
            <h2 class="payment-history-title">{{ $t("payment.history_title") }}</h2>
            <button
                v-if="!subscriptionStore.isLoading && payments.length > 0"
                @click="refreshHistory"
                class="refresh-button"
                :disabled="isRefreshing"
            >
                {{ isRefreshing ? $t("common.refreshing") : $t("common.refresh") }}
            </button>
        </div>

        <div
            v-if="subscriptionStore.isLoading && payments.length === 0"
            class="payment-history-loading"
        >
            <p>{{ $t("common.loading") }}</p>
        </div>

        <div v-else-if="subscriptionStore.error" class="payment-history-error">
            <p>{{ $t("payment.history_error") }}</p>
            <button @click="retryFetch" class="retry-button">
                {{ $t("common.retry") }}
            </button>
        </div>

        <div v-else-if="payments.length === 0" class="payment-history-empty">
            <p>{{ $t("payment.no_payments") }}</p>
        </div>

        <div v-else class="payment-history-list">
            <div
                v-for="payment in payments"
                :key="payment.id"
                class="payment-history-item"
                :class="{ 'payment-new': isNewPayment(payment) }"
            >
                <div class="payment-history-item-info">
                    <div class="payment-history-item-date">
                        {{ subscriptionStore.formatDate(payment.createdAt) }}
                    </div>
                    <div v-if="payment.description" class="payment-history-item-description">
                        {{ payment.description }}
                    </div>
                </div>
                <div class="payment-history-item-amount">
                    {{ subscriptionStore.formatAmount(payment.amount, payment.currency) }}
                </div>
                <div class="payment-history-item-status" :class="`status-${payment.status}`">
                    {{ subscriptionStore.formatStatus(payment.status) }}
                </div>
            </div>

            <div v-if="canLoadMore" class="payment-history-load-more">
                <button
                    @click="loadMorePayments"
                    class="load-more-button"
                    :disabled="isLoadingMore"
                >
                    {{ isLoadingMore ? $t("common.loading") : $t("payment.load_more") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useSubscriptionStore } from "~/stores/modules/subscription";

const props = defineProps({
    limit: {
        type: Number,
        default: 5,
    },
    showRefreshButton: {
        type: Boolean,
        default: true,
    },
});

const { t } = useI18n();
const subscriptionStore = useSubscriptionStore();

const isRefreshing = ref(false);
const isLoadingMore = ref(false);
const currentLimit = ref(props.limit);
const newPaymentIds = ref(new Set());

const payments = computed(() => subscriptionStore.paymentHistory);
const canLoadMore = computed(() => {
    return payments.value.length >= currentLimit.value && payments.value.length > 0;
});

function isNewPayment(payment) {
    return newPaymentIds.value.has(payment.id);
}

async function refreshHistory() {
    isRefreshing.value = true;
    try {
        await subscriptionStore.fetchPaymentHistory(currentLimit.value);
    } finally {
        isRefreshing.value = false;
    }
}

async function loadMorePayments() {
    isLoadingMore.value = true;
    currentLimit.value += props.limit;
    try {
        await subscriptionStore.fetchPaymentHistory(currentLimit.value);
    } finally {
        isLoadingMore.value = false;
    }
}

async function retryFetch() {
    await subscriptionStore.fetchPaymentHistory(currentLimit.value);
}

function handleSubscriptionUpdate(event) {
    const { paymentHistory } = event.detail;

    if (paymentHistory && paymentHistory.length > 0) {
        const currentPaymentIds = new Set(payments.value.map((p) => p.id));

        paymentHistory.forEach((payment) => {
            if (!currentPaymentIds.has(payment.id)) {
                newPaymentIds.value.add(payment.id);

                setTimeout(() => {
                    newPaymentIds.value.delete(payment.id);
                }, 3000);
            }
        });
    }
}

onMounted(async () => {
    if (payments.value.length === 0 && subscriptionStore.hasActiveSubscription) {
        await subscriptionStore.fetchPaymentHistory(currentLimit.value);
    }

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
.payment-history {
    margin-top: 2rem;
}

.payment-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.payment-history-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.refresh-button,
.retry-button,
.load-more-button {
    padding: 0.5rem 1rem;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
}

.refresh-button:hover,
.retry-button:hover,
.load-more-button:hover {
    background-color: #e5e7eb;
}

.refresh-button:disabled,
.load-more-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.payment-history-loading,
.payment-history-error,
.payment-history-empty {
    padding: 1.5rem;
    text-align: center;
    background-color: #f9fafb;
    border-radius: 0.5rem;
}

.payment-history-list {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
}

.payment-history-item {
    display: flex;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    transition: all 0.3s ease;
}

.payment-history-item:last-child {
    border-bottom: none;
}

.payment-history-item.payment-new {
    background-color: #f0fdf4;
    border-left: 4px solid #10b981;
    animation: highlight 3s ease-out;
}

@keyframes highlight {
    0% {
        background-color: #ecfdf5;
    }
    100% {
        background-color: #f9fafb;
    }
}

.payment-history-item-info {
    flex: 2;
    min-width: 0;
}

.payment-history-item-date {
    font-weight: 500;
    color: #374151;
}

.payment-history-item-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.payment-history-item-amount {
    flex: 1;
    font-weight: 600;
    text-align: center;
    color: #374151;
}

.payment-history-item-status {
    flex: 1;
    text-align: right;
    font-weight: 500;
}

.status-succeeded {
    color: #047857;
}

.status-processing {
    color: #2563eb;
}

.status-requires_payment_method,
.status-requires_action {
    color: #d97706;
}

.status-canceled,
.status-failed {
    color: #dc2626;
}

.payment-history-load-more {
    padding: 1rem;
    text-align: center;
    border-top: 1px solid #e5e7eb;
    background-color: #f9fafb;
}

.retry-button {
    margin-top: 1rem;
}

@media (max-width: 640px) {
    .payment-history-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }

    .payment-history-item {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
        text-align: left;
    }

    .payment-history-item-amount,
    .payment-history-item-status {
        text-align: left;
    }
}
</style>
