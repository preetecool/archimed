import { defineStore } from "pinia";
import { useUserStore } from "./user";
import { useSubscriptionStore } from "./subscription";
import { useUIStore } from "./ui";

export const usePaymentStore = defineStore("payment", {
  state: () => ({
    isLoading: false,
    error: null,
    customerId: null,
    lastActivatedPlan: null,
    processingPayment: false,
  }),

  getters: {
    availablePlans: () => {
      return {
        trial: {
          name: "Trial",
          price: 0,
          durationDays: 14,
          features: [
            "Transcription illimitée",
            "Accès à toutes les fonctionnalités",
            "Support prioritaire",
            "Export des données",
          ],
        },
        monthly: {
          name: "Professional",
          price: 150,
          promoDiscount: 20,
          promoActive: true,
          features: [
            "Intégration DMP",
            "Analyses avancées",
            "Support 24/7",
            "Sauvegarde cloud sécurisée",
            "Rapports personnalisés",
          ],
        },
        enterprise: {
          name: "Enterprise",
          price: null,
          custom: true,
          features: [
            "Déploiement sur site",
            "API personnalisée",
            "SLA garanti",
            "Account manager dédié",
            "Formation sur site",
          ],
        },
      };
    },
  },

  actions: {
    getPlanDetails(planId) {
      return this.availablePlans[planId] || null;
    },

    calculatePrice(planId) {
      const plan = this.getPlanDetails(planId);
      if (!plan) return 0;
      if (plan.price === null) return 0;

      if (planId === "monthly" && plan.promoActive) {
        return plan.price - plan.promoDiscount;
      }
      return plan.price;
    },

    formatPrice(price) {
      if (price === null) return "Contact us";
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "CAD",
      }).format(price);
    },

    async getOrCreateCustomer() {
      const userStore = useUserStore();

      if (!userStore.userData) {
        throw new Error("User must be logged in");
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await fetch("/api/payments/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userStore.userData.uid,
            email: userStore.userData.email,
            name: userStore.userData.displayName,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to create customer");
        }

        this.customerId = result.customerId;
        return result.customerId;
      } catch (err) {
        this.error = err.message || "Error creating Stripe customer";
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async activateSubscription(planId, paymentMethodId = null) {
      const userStore = useUserStore();
      const uiStore = useUIStore();
      const subscriptionStore = useSubscriptionStore();

      if (!userStore.userData) {
        throw new Error("User must be logged in");
      }

      this.isLoading = true;
      this.error = null;

      try {
        let endpoint, payload;

        if (planId === "trial") {
          if (!paymentMethodId) {
            throw new Error("Payment method required for trial activation");
          }
          endpoint = "/api/subscription/activate-trial-with-payment";
          payload = {
            userId: userStore.userData.uid,
            email: userStore.userData.email,
            name: userStore.userData.displayName,
            paymentMethodId: paymentMethodId,
          };
        } else {
          endpoint = "/api/payments/create-checkout-session";
          payload = {
            planId,
            customerId: this.customerId || (await this.getOrCreateCustomer()),
          };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to activate subscription");
        }

        this.lastActivatedPlan = planId;

        if (planId === "trial") {
          uiStore.showSuccess("Trial activated successfully");

          await subscriptionStore.refreshAfterPaymentAction();

          return {
            success: true,
            type: "trial",
            expiresAt: result.expiresAt,
            subscriptionId: result.subscription?.id,
          };
        } else {
          window.location.href = result.url;
          return {
            success: true,
            type: "checkout_redirect",
          };
        }
      } catch (err) {
        console.error("Subscription activation error:", err);
        this.error = err.message;
        uiStore.showError(err.message || "Failed to activate subscription");
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async processCheckout(planId) {
      const userStore = useUserStore();
      const uiStore = useUIStore();

      if (!userStore.isAuthenticated) {
        return {
          success: false,
          error: "User must be logged in",
          redirectToLogin: true,
        };
      }

      if (planId === "enterprise") {
        return { success: true, redirectToContact: true };
      }

      this.processingPayment = true;
      try {
        if (planId !== "trial") {
          await this.getOrCreateCustomer();
        }

        return await this.activateSubscription(planId);
      } catch (error) {
        uiStore.showError(error.message || "Failed to process payment");
        return { success: false, error: error.message };
      } finally {
        this.processingPayment = false;
      }
    },

    async handlePaymentSuccess(paymentDetails) {
      const subscriptionStore = useSubscriptionStore();
      const uiStore = useUIStore();

      this.lastActivatedPlan = paymentDetails?.metadata?.planId || "monthly";

      await subscriptionStore.refreshAfterPaymentAction();

      if (paymentDetails) {
        const paymentData = {
          id: paymentDetails.id,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency || "cad",
          status: paymentDetails.status,
          createdAt: new Date(paymentDetails.created * 1000),
          paymentMethod: paymentDetails.payment_method_types?.[0] || "card",
          description: paymentDetails.description || `Payment for ${this.lastActivatedPlan} plan`,
          metadata: paymentDetails.metadata || {},
        };

        subscriptionStore.addPaymentToHistory(paymentData);
      }

      uiStore.showSuccess("Payment successful! Your subscription is now active.");

      return {
        success: true,
        paymentIntentId: paymentDetails?.id,
        planId: paymentDetails?.metadata?.planId,
      };
    },

    handlePaymentError(error) {
      console.error("Payment error:", error);
      this.error = error.message || "Payment failed";

      return {
        success: false,
        error: this.error,
      };
    },

    async handleCheckoutSuccess(sessionId, paymentIntentId = null) {
      const subscriptionStore = useSubscriptionStore();
      const uiStore = useUIStore();

      try {
        await subscriptionStore.refreshAfterPaymentAction();

        uiStore.showSuccess("Payment successful! Your subscription is now active.");

        return { success: true, sessionId, paymentIntentId };
      } catch (error) {
        console.error("Error handling checkout success:", error);

        uiStore.showSuccess(
          "Payment successful! Please refresh the page if you don't see your subscription.",
        );
        return { success: true, sessionId, paymentIntentId, refreshError: error.message };
      }
    },

    initializeReactiveUpdates() {
      const subscriptionStore = useSubscriptionStore();

      if (typeof window !== "undefined") {
        window.addEventListener("subscription-updated", (event) => {
          console.log("Payment store received subscription update:", event.detail);
        });
      }

      subscriptionStore.initialize();
    },

    async createCheckoutSession(planId) {
      console.warn("createCheckoutSession is deprecated. Use processCheckout instead.");
      return this.processCheckout(planId);
    },
  },
});
