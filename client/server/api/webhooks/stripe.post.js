import { defineEventHandler, readRawBody } from "h3";
import { useServerStripe } from "#stripe/server";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event) => {
  try {
    const stripe = await useServerStripe(event);

    const signature = event.req.headers["stripe-signature"];
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const rawBody = await readRawBody(event);
    if (!rawBody) {
      throw new Error("No request body found");
    }

    const webhookSecret = useRuntimeConfig().STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing Stripe webhook secret");
    }

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`Processing webhook event: ${stripeEvent.type}`);

    switch (stripeEvent.type) {
      case "customer.created":
      case "customer.updated":
        console.log(`Customer ${stripeEvent.data.object.id} was created/updated`);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(stripe, stripeEvent.data.object);
        break;

      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
        console.log(
          `Payment intent ${stripeEvent.data.object.id} ${stripeEvent.type.split(".")[1]}`,
        );
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error("Stripe webhook error:", error);
    event.res.statusCode = 400;
    return { error: error.message || "Webhook Error" };
  }
});

async function handleSubscriptionUpdate(stripe, subscription) {
  try {
    const customerId = subscription.customer;

    if (!customerId) {
      console.log("No customer ID found in subscription");
      return;
    }

    const stripeCustomer = await stripe.customers.retrieve(customerId);

    if (stripeCustomer.deleted) {
      console.log(`Customer ${customerId} has been deleted`);
      return;
    }

    const userId = stripeCustomer.metadata?.firebaseUserId;

    if (!userId) {
      console.log(`No user ID found for customer ${customerId}`);
      return;
    }

    console.log(
      `Subscription ${subscription.id} for user ${userId} updated to ${subscription.status}`,
    );

    const subscriptionData = {
      id: subscription.id,
      userId,
      customerId,
      status: subscription.status,
      planId: subscription.items.data[0]?.price?.product || "unknown",
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    };
  } catch (error) {
    console.error("Error handling subscription update:", error);
  }
}
