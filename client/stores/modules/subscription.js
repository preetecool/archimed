import { defineStore } from "pinia";
import { useUserStore } from "./user";

export const useSubscriptionStore = defineStore("subscription", {
  state: () => ({
    activeSubscription: null,
    paymentHistory: [],
    isLoading: false,
    error: null,
    lastFetchTime: null,
    isInitialized: false,
  }),

  getters: {
    hasActiveSubscription: (state) => {
      return (
        state.activeSubscription?.status === "active" ||
        state.activeSubscription?.status === "trialing"
      );
    },

    subscriptionPlan: (state) => {
      return state.activeSubscription?.planId || null;
    },

    formattedExpiryDate: (state) => {
      if (!state.activeSubscription?.currentPeriodEnd) return null;

      const date = new Date(state.activeSubscription.currentPeriodEnd);

      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    },

    isTrialPlan: (state) => {
      return state.activeSubscription?.status === "trialing";
    },

    trialDaysLeft: (state) => {
      if (!state.activeSubscription?.trialEnd || state.activeSubscription?.status !== "trialing")
        return 0;

      const endDate = new Date(state.activeSubscription.trialEnd);
      const today = new Date();
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays);
    },

    isDataStale: (state) => {
      if (!state.lastFetchTime) return true;
      const staleThreshold = 2 * 60 * 1000;
      return Date.now() - state.lastFetchTime > staleThreshold;
    },
  },

  actions: {
    async initialize() {
      const userStore = useUserStore();

      if (!userStore.userData?.uid || this.isInitialized) return;

      this.isInitialized = true;
      await this.fetchActiveSubscription();
    },

    async fetchActiveSubscription(forceRefresh = false) {
      const userStore = useUserStore();

      if (!userStore.userData?.uid) {
        this.activeSubscription = null;
        return null;
      }

      if (!forceRefresh && !this.isDataStale && this.activeSubscription) {
        return this.activeSubscription;
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await fetch(`/api/subscription/status?userId=${userStore.userData.uid}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch subscription data");
        }

        if (data.success && data.subscription) {
          this.activeSubscription = data.subscription;
        } else {
          this.activeSubscription = null;
        }

        this.lastFetchTime = Date.now();
        return this.activeSubscription;
      } catch (error) {
        console.error("Error fetching subscription:", error);
        this.error = error.message;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPaymentHistory(historyLimit = 5) {
      const userStore = useUserStore();

      if (!userStore.userData?.uid) return [];

      if (!this.hasActiveSubscription) {
        this.paymentHistory = [];
        return [];
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await fetch(
          `/api/payments/history?userId=${userStore.userData.uid}&limit=${historyLimit}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch payment history");
        }

        if (data.success) {
          this.paymentHistory = data.payments || [];
        }

        return this.paymentHistory;
      } catch (error) {
        console.error("Error fetching payment history:", error);
        this.error = error.message;
        return [];
      } finally {
        this.isLoading = false;
      }
    },

    async refreshAfterPaymentAction() {
      await this.fetchActiveSubscription(true);

      if (this.hasActiveSubscription) {
        await this.fetchPaymentHistory();
      }

      this.emitSubscriptionUpdate();
    },

    handleSubscriptionUpdate(subscriptionData) {
      if (subscriptionData) {
        this.activeSubscription = subscriptionData;
        this.lastFetchTime = Date.now();
        this.emitSubscriptionUpdate();
      }
    },

    addPaymentToHistory(paymentData) {
      this.paymentHistory.unshift(paymentData);

      if (this.paymentHistory.length > 10) {
        this.paymentHistory = this.paymentHistory.slice(0, 10);
      }
    },

    emitSubscriptionUpdate() {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("subscription-updated", {
            detail: {
              subscription: this.activeSubscription,
              hasActiveSubscription: this.hasActiveSubscription,
              paymentHistory: this.paymentHistory,
            },
          }),
        );
      }
    },

    async cancelSubscription() {
      const userStore = useUserStore();

      if (!this.activeSubscription?.id || !userStore.userData?.uid) {
        this.error = "No active subscription found";
        return { success: false, error: this.error };
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await fetch("/api/subscription/manage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel",
            subscriptionId: this.activeSubscription.id,
            userId: userStore.userData.uid,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to cancel subscription");
        }

        if (data.success) {
          this.activeSubscription = {
            ...this.activeSubscription,
            cancelAtPeriodEnd: true,
          };
          this.emitSubscriptionUpdate();
        }

        return { success: data.success, message: data.message };
      } catch (error) {
        console.error("Error canceling subscription:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async reactivateSubscription() {
      const userStore = useUserStore();

      if (!this.activeSubscription?.id || !userStore.userData?.uid) {
        this.error = "No active subscription found";
        return { success: false, error: this.error };
      }

      if (!this.activeSubscription.cancelAtPeriodEnd) {
        return { success: true, message: "Subscription is already active" };
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await fetch("/api/subscription/manage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reactivate",
            subscriptionId: this.activeSubscription.id,
            userId: userStore.userData.uid,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to reactivate subscription");
        }

        if (data.success) {
          this.activeSubscription = {
            ...this.activeSubscription,
            cancelAtPeriodEnd: false,
          };
          this.emitSubscriptionUpdate();
        }

        return { success: data.success, message: data.message };
      } catch (error) {
        console.error("Error reactivating subscription:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    async updatePaymentMethod(paymentMethodId) {
      const userStore = useUserStore();

      if (!this.activeSubscription?.id || !userStore.userData?.uid || !paymentMethodId) {
        this.error = "Missing required information";
        return { success: false, error: this.error };
      }

      this.isLoading = true;
      this.error = null;

      try {
        const response = await fetch("/api/subscription/manage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update_payment_method",
            subscriptionId: this.activeSubscription.id,
            userId: userStore.userData.uid,
            paymentMethodId: paymentMethodId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update payment method");
        }

        if (data.success) {
          await this.fetchActiveSubscription(true);
        }

        return { success: data.success, message: data.message };
      } catch (error) {
        console.error("Error updating payment method:", error);
        this.error = error.message;
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    clearSubscriptionData() {
      this.activeSubscription = null;
      this.paymentHistory = [];
      this.error = null;
      this.lastFetchTime = null;
      this.isInitialized = false;
    },

    formatStatus(status) {
      if (!status) return "";

      const statusMap = {
        active: "Actif",
        canceled: "Annulé",
        incomplete: "Incomplet",
        incomplete_expired: "Expiré",
        past_due: "En retard",
        trialing: "Période d'essai",
        unpaid: "Impayé",
        succeeded: "Réussi",
        processing: "En cours",
        requires_payment_method: "Paiement requis",
        requires_action: "Action requise",
        failed: "Échoué",
      };

      return statusMap[status] || status;
    },

    formatDate(timestamp) {
      if (!timestamp) return "";

      const date = new Date(timestamp);

      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    },

    formatAmount(amount, currency = "cad") {
      if (amount === undefined || amount === null) return "";

      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    },
  },
});
