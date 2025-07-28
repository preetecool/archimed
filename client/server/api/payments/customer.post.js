import { defineEventHandler, readBody } from "h3";
import { useServerStripe } from "#stripe/server";

export default defineEventHandler(async (event) => {
  try {
    const stripe = await useServerStripe(event);

    const { userId, email, name } = await readBody(event);

    if (!userId || !email) {
      return {
        success: false,
        error: "User ID and email are required",
      };
    }

    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const existingCustomer = existingCustomers.data[0];

      if (!existingCustomer.metadata?.firebaseUserId) {
        await stripe.customers.update(existingCustomer.id, {
          metadata: {
            ...existingCustomer.metadata,
            firebaseUserId: userId,
          },
        });
      }

      console.log(`Using existing Stripe customer ${existingCustomer.id} for user ${userId}`);

      return {
        success: true,
        customerId: existingCustomer.id,
      };
    }

    const customer = await stripe.customers.create({
      email,
      name: name || email.split("@")[0],
      metadata: {
        firebaseUserId: userId,
      },
    });

    console.log(`Created new Stripe customer ${customer.id} for user ${userId}`);

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error) {
    console.error("Error creating/retrieving customer:", error);
    return {
      success: false,
      error: error.message || "Failed to create/retrieve customer",
    };
  }
});
