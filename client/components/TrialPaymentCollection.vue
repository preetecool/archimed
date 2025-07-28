<template>
    <div class="trial-payment-collection">
        <div v-if="isLoading" class="loading-container">
            <p>{{ $t("payment.loading") }}</p>
        </div>

        <div v-else-if="error" class="error-message">
            {{ error }}
        </div>

        <div v-else-if="stripe">
            <h3>{{ $t("trial.payment_method") }}</h3>
            <p class="payment-explanation">{{ $t("trial.payment_explanation") }}</p>

            <form @submit.prevent="handleSubmit">
                <div ref="cardElementRef" id="card-element" class="card-element"></div>
                <div id="card-errors" class="card-errors" role="alert">
                    {{ cardError }}
                </div>

                <button type="submit" class="payment-button" :disabled="isSubmitting">
                    <span v-if="isSubmitting">{{ $t("trial.processing") }}</span>
                    <span v-else>{{ $t("trial.confirm_payment_method") }}</span>
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { loadStripe } from "@stripe/stripe-js";

const props = defineProps({
    trialPriceId: {
        type: String,
        default: "",
    },
});

const emit = defineEmits(["success", "error"]);

const stripe = ref(null);
const elements = ref(null);
const cardElement = ref(null);
const cardElementRef = ref(null);
const cardError = ref("");
const isLoading = ref(true);
const isSubmitting = ref(false);
const error = ref(null);

onMounted(async () => {
    try {
        const stripeJs = await loadStripe(process.env.STRIPE_PUBLIC_KEY);
        stripe.value = stripeJs;

        elements.value = stripe.value.elements();
        cardElement.value = elements.value.create("card", {
            hidePostalCode: true,
            style: {
                base: {
                    color: "#32325d",
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "16px",
                    "::placeholder": {
                        color: "#aab7c4",
                    },
                },
                invalid: {
                    color: "#fa755a",
                    iconColor: "#fa755a",
                },
            },
        });

        cardElement.value.mount("#card-element");

        cardElement.value.on("change", (event) => {
            if (event.error) {
                cardError.value = event.error.message;
            } else {
                cardError.value = "";
            }
        });

        isLoading.value = false;
    } catch (err) {
        console.error("Error loading Stripe:", err);
        error.value = "Failed to load payment system";
        emit("error", { error: err });
    }
});

onBeforeUnmount(() => {
    if (cardElement.value) {
        cardElement.value.unmount();
        cardElement.value = null;
    }
});

const handleSubmit = async () => {
    if (!stripe.value || !elements.value || !cardElement.value) {
        error.value = "Payment system not initialized";
        return;
    }

    isSubmitting.value = true;
    cardError.value = "";

    try {
        const { paymentMethod, error: paymentMethodError } = await stripe.value.createPaymentMethod(
            {
                type: "card",
                card: cardElement.value,
            },
        );

        if (paymentMethodError) {
            throw new Error(paymentMethodError.message);
        }

        emit("success", { paymentMethodId: paymentMethod.id });
    } catch (err) {
        cardError.value = err.message;
        emit("error", { error: err });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style scoped>
.trial-payment-collection {
    margin-bottom: 2rem;
}

.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
}

.payment-explanation {
    margin-bottom: 1.5rem;
    color: var(--text-color);
    font-size: 0.9rem;
}

.card-element {
    padding: 1rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    background: #f9fafb;
    margin-bottom: 1rem;
}

.card-errors {
    color: #dc2626;
    font-size: 0.875rem;
    min-height: 1.5rem;
    margin-bottom: 1rem;
}

.payment-button {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: var(--accent-color, #0f172a);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.payment-button:hover {
    background-color: var(--accent-hover, #1e293b);
}

.payment-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.error-message {
    padding: 1rem;
    background-color: #fee2e2;
    color: #b91c1c;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
}
</style>
