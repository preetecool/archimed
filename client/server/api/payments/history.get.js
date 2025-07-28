import { defineEventHandler, getQuery } from "h3";
import { useServerStripe } from "#stripe/server";

export default defineEventHandler(async (event) => {
  try {
    const { userId, email, limit = 10 } = getQuery(event);

    if (!userId && !email) {
      return {
        success: false,
        error: "User ID or email is required",
      };
    }

    const stripe = await useServerStripe(event);

    let customerId;

    if (email) {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    } else if (userId) {
      const customers = await stripe.customers.list({
        limit: 100,
      });

      const customer = customers.data.find((cust) => cust.metadata?.firebaseUserId === userId);

      if (customer) {
        customerId = customer.id;
      }
    }

    if (!customerId) {
      return {
        success: true,
        payments: [],
      };
    }

    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: parseInt(limit),
    });

    const payments = paymentIntents.data.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: new Date(payment.created * 1000),
      paymentMethod: payment.payment_method_types[0] || null,
      description: payment.description || "",
      metadata: payment.metadata || {},
    }));

    return {
      success: true,
      payments,
    };
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch payment history",
    };
  }
});
