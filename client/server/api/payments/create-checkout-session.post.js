import { defineEventHandler, readBody } from "h3";
import { useServerStripe } from "#stripe/server";

export default defineEventHandler(async (event) => {
  try {
    const stripe = await useServerStripe(event);
    const { planId, customerId } = await readBody(event);

    const planDetails = getPlanDetails(planId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: planDetails.name,
              description: planDetails.description || "",
            },
            unit_amount: planDetails.price * 100,
            recurring:
              planId === "monthly"
                ? {
                    interval: "month",
                  }
                : undefined,
          },
          quantity: 1,
        },
      ],
      mode: planId === "monthly" ? "subscription" : "payment",
      success_url: `${process.env.BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/payment`,
      metadata: {
        planId: planId,
      },
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

function getPlanDetails(planId) {
  const plans = {
    monthly: {
      name: "Professional Plan",
      price: 130,
      description: "Monthly subscription with all features",
    },
    enterprise: {
      name: "Enterprise Plan",
      price: 500,
      description: "Custom enterprise solution",
    },
  };

  return plans[planId] || plans.monthly;
}
