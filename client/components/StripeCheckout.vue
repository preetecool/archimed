<template>
    <div class="stripe-checkout">
        <div v-if="isLoading || !isReady" class="loading-overlay">
            <p>{{ $t("payment.loading") }}</p>
        </div>

        <div v-if="error" class="error-message">
            {{ error }}
        </div>

        <form id="payment-form" @submit.prevent="handleSubmit">
            <div id="payment-element" class="payment-element" :class="{ hidden: !isReady }"></div>

            <button type="submit" class="payment-button" :disabled="isSubmitting || !isReady">
                <span v-if="isSubmitting">{{ $t("payment.processing") }}</span>
                <span v-else>{{ $t("payment.pay") }} {{ formattedAmount }}</span>
            </button>

            <div class="payment-message" v-if="paymentMessage">
                {{ paymentMessage }}
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { usePaymentStore } from "~/stores/modules/payment";
import { useSubscriptionStore } from "~/stores/modules/subscription";
import { useClientStripe } from "#imports";

const props = defineProps({
    amount: {
        type: Number,
        required: true,
    },
    planId: {
        type: String,
        default: "monthly",
    },
    metadata: {
        type: Object,
        default: () => ({}),
    },
    successUrl: {
        type: String,
        default: "/payment-success",
    },
});

const emit = defineEmits(["payment-success", "payment-error"]);

const { stripe } = useClientStripe();
const paymentStore = usePaymentStore();
const subscriptionStore = useSubscriptionStore();
let elements = null;

const isLoading = ref(false);
const isReady = ref(false);
const error = ref(null);
const isSubmitting = ref(false);
const paymentMessage = ref("");

const formattedAmount = computed(() => {
    return paymentStore.formatPrice(props.amount);
});

const handleSubmit = async () => {
    if (!stripe.value || !elements || isSubmitting.value) {
        return;
    }

    try {
        isSubmitting.value = true;
        paymentMessage.value = "";

        console.log("Confirming payment...");

        const { error: paymentError, paymentIntent } = await stripe.value.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + props.successUrl,
                payment_method_data: {
                    metadata: {
                        ...props.metadata,
                        planId: props.planId,
                    },
                },
            },
            redirect: "if_required",
        });

        if (paymentError) {
            console.error("Payment error:", paymentError);
            throw new Error(paymentError.message || "Payment failed");
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
            console.log("Payment succeeded!");
            paymentMessage.value = "Payment successful!";

            await subscriptionStore.fetchActiveSubscription();

            emit("payment-success", paymentIntent);
        } else if (paymentIntent) {
            console.log("Payment status:", paymentIntent.status);
            paymentMessage.value = `Payment status: ${paymentIntent.status}`;
        }
    } catch (err) {
        console.error("Payment submission error:", err);
        paymentMessage.value = err.message || "An error occurred during payment";
        emit("payment-error", { error: err });
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(async () => {
    console.log("StripeCheckout component mounted");

    if (!stripe.value) {
        error.value = "Stripe failed to load";
        return;
    }

    try {
        isLoading.value = true;
        error.value = null;

        console.log("Creating payment intent...");

        const clientSecret = await paymentStore.createPaymentIntent(props.amount, props.planId);

        if (!clientSecret) {
            throw new Error("Failed to create payment intent. No client secret received.");
        }

        console.log("Client secret received, creating elements...");

        elements = stripe.value.elements({
            clientSecret,
            appearance: {
                theme: "stripe",
                variables: {
                    colorPrimary: "#0f172a",
                },
            },
        });

        console.log("Creating payment element...");
        const paymentElement = elements.create("payment");

        console.log("Mounting payment element...");
        paymentElement.mount("#payment-element");

        console.log("Payment element mounted successfully");
        isReady.value = true;
    } catch (err) {
        console.error("Stripe initialization error:", err);
        error.value = err.message || "Failed to initialize payment form";
        emit("payment-error", { error: err });
    } finally {
        isLoading.value = false;
    }
});
</script>

<style scoped>
.stripe-checkout {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    position: relative;
}

.loading-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
}

.error-message {
    color: #e53e3e;
    padding: 10px;
    margin-bottom: 15px;
    border: 1px solid #e53e3e;
    border-radius: 4px;
    background-color: #fff5f5;
}

.payment-element {
    margin-bottom: 24px;
}

.hidden {
    visibility: hidden;
}

.payment-button {
    background-color: #0f172a;
    color: white;
    border: none;
    padding: 12px 16px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.3s ease;
    margin-top: 16px;
}

.payment-button:hover {
    background-color: #1e293b;
}

.payment-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.payment-message {
    margin-top: 12px;
    color: #4a5568;
    text-align: center;
}
</style>
