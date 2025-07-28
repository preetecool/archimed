import { defineStore } from "pinia";

export const useUIStore = defineStore("ui", {
  state: () => ({
    toast: {
      show: false,
      message: "",
      type: "info",
      duration: 3000,
    },
    modal: {
      show: false,
      type: null,
      data: null,
    },
    isLoading: false,
  }),

  actions: {
    showToast(message, type = "info", duration = 3000) {
      this.toast = {
        show: true,
        message,
        type,
        duration,
      };

      setTimeout(() => this.clearToast(), duration);
    },

    showSuccess(message, duration = 3000) {
      this.showToast(message, "success", duration);
    },

    showError(message, duration = 3000) {
      this.showToast(message, "error", duration);
    },

    clearToast() {
      this.toast.show = false;
    },

    showModal(type, data = null) {
      this.modal = {
        show: true,
        type,
        data,
      };
    },

    closeModal() {
      this.modal = {
        show: false,
        type: null,
        data: null,
      };
    },

    setLoading(status) {
      this.isLoading = status;
    },
  },
});
