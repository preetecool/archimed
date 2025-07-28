import { defineEventHandler, getQuery } from "h3";
import { useServerStripe } from "#stripe/server";

export default defineEventHandler(async (event) => {
  try {
    const { userId, email } = getQuery(event);

    if (!userId && !email) {
      return {
        success: false,
        error: "User ID or email is required",
      };
    }

    const stripe = await useServerStripe(event);

    let customer;

    if (email) {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
      }
    } else if (userId) {
      const customers = await stripe.customers.list({
        limit: 100,
      });

      customer = customers.data.find((cust) => cust.metadata?.firebaseUserId === userId);
    }

    if (!customer) {
      return {
        success: true,
        subscription: null,
      };
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
      expand: ["data.default_payment_method"],
    });

    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );

    if (!activeSubscription) {
      return {
        success: true,
        subscription: null,
      };
    }

    return {
      success: true,
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        planId: activeSubscription.items.data[0]?.price?.product || null,
        currentPeriodStart: new Date(activeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
        trialStart: activeSubscription.trial_start
          ? new Date(activeSubscription.trial_start * 1000)
          : null,
        trialEnd: activeSubscription.trial_end
          ? new Date(activeSubscription.trial_end * 1000)
          : null,
        hasPaymentMethod: !!activeSubscription.default_payment_method,
        customerId: customer.id,
      },
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch subscription status",
    };
  }
});
