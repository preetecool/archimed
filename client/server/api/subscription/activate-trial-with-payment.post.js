import { defineEventHandler, readBody, getRequestIP } from "h3";
import { useServerStripe } from "#stripe/server";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event) => {
  try {
    const { userId, email, name, paymentMethodId } = await readBody(event);

    if (!userId || !email || !paymentMethodId) {
      return {
        success: false,
        error: "User ID, email, and payment method are required",
      };
    }

    const clientIP = getRequestIP(event, { xForwardedFor: true }) || "unknown";

    const stripe = await useServerStripe(event);
    const config = useRuntimeConfig();

    try {
      const ipLimitCheck = await checkIPLimits(clientIP);
      if (!ipLimitCheck.allowed) {
        console.warn(`Trial abuse detected from IP: ${clientIP}`);
        return {
          success: false,
          error: "Too many trial attempts detected. Please try again later.",
        };
      }

      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      let customerId;

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;

        const subscriptions = await stripe.customers.listSubscriptions(customerId, {
          status: "all",
        });

        const hadTrial = subscriptions.data.some(
          (sub) => sub.status === "trialing" || (sub.status === "canceled" && sub.trial_end),
        );

        if (hadTrial) {
          return {
            success: false,
            error: "You have already used your trial period",
          };
        }
      } else {
        const customer = await stripe.customers.create({
          email,
          name: name || email.split("@")[0],
          metadata: {
            firebaseUserId: userId,
            registrationIp: clientIP,
            registeredAt: new Date().toISOString(),
          },
        });

        customerId = customer.id;
      }

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      let trialPriceId = config.STRIPE_TRIAL_PRICE_ID;

      if (!trialPriceId) {
        console.log("No trial price ID configured, creating a temporary price");
        const product = await stripe.products.create({
          name: "Trial Subscription",
          metadata: {
            isTrialProduct: "true",
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: 0,
          currency: "cad",
          recurring: {
            interval: "month",
          },
          metadata: {
            isTrialPrice: "true",
          },
        });

        trialPriceId = price.id;
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: trialPriceId,
          },
        ],
        trial_period_days: 14,
        payment_settings: {
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription",
        },
        default_payment_method: paymentMethodId,
        metadata: {
          firebaseUserId: userId,
          trialActivatedAt: new Date().toISOString(),
          trialActivationIp: clientIP,
          source: "web-app",
        },
      });

      const trialEnd = new Date(subscription.trial_end * 1000);

      console.log(
        `Trial with payment method activated for user: ${userId}, email: ${email}, IP: ${clientIP}`,
      );

      return {
        success: true,
        message: "Trial activated successfully",
        expiresAt: trialEnd,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          trialEnd: trialEnd,
          customerId: customerId,
        },
      };
    } catch (error) {
      console.error("Error processing trial activation:", error);
      return {
        success: false,
        error: error.message || "Failed to process trial activation",
      };
    }
  } catch (error) {
    console.error("Trial activation error:", error);
    return {
      success: false,
      error: error.message || "Failed to activate trial",
    };
  }
});
