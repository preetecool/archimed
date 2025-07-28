import { defineEventHandler, readBody } from "h3";
import { useServerStripe } from "#stripe/server";

export default defineEventHandler(async (event) => {
  try {
    const { action, subscriptionId, userId, customerId } = await readBody(event);

    if (!action || !subscriptionId) {
      return {
        success: false,
        error: "Action and subscription ID are required",
      };
    }

    const stripe = await useServerStripe(event);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (customerId && subscription.customer !== customerId) {
      return {
        success: false,
        error: "Subscription does not belong to this customer",
      };
    }

    if (userId) {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer.metadata?.firebaseUserId !== userId) {
        return {
          success: false,
          error: "Subscription does not belong to this user",
        };
      }
    }

    switch (action) {
      case "cancel":
        return await handleCancelSubscription(stripe, subscriptionId);

      case "reactivate":
        return await handleReactivateSubscription(stripe, subscriptionId);

      case "update_payment_method":
        const { paymentMethodId } = readBody(event);
        if (!paymentMethodId) {
          return {
            success: false,
            error: "Payment method ID is required",
          };
        }
        return await handleUpdatePaymentMethod(stripe, subscriptionId, paymentMethodId);

      default:
        return {
          success: false,
          error: "Invalid action",
        };
    }
  } catch (error) {
    console.error("Error managing subscription:", error);
    return {
      success: false,
      error: error.message || "Failed to manage subscription",
    };
  }
});

async function handleCancelSubscription(stripe, subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return {
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error: error.message || "Failed to cancel subscription",
    };
  }
}

async function handleReactivateSubscription(stripe, subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return {
      success: true,
      message: "Subscription reactivated successfully",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    };
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return {
      success: false,
      error: error.message || "Failed to reactivate subscription",
    };
  }
}

async function handleUpdatePaymentMethod(stripe, subscriptionId, paymentMethodId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.customer,
    });

    await stripe.customers.update(subscription.customer, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });

    return {
      success: true,
      message: "Payment method updated successfully",
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
      },
    };
  } catch (error) {
    console.error("Error updating payment method:", error);
    return {
      success: false,
      error: error.message || "Failed to update payment method",
    };
  }
}
