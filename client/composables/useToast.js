import { ref } from "vue";

const toastState = ref({
  show: false,
  message: "",
  type: "success",
  duration: 3000,
});

export function useToast() {
  const showSuccess = (message, duration = 3000) => {
    toastState.value = {
      show: true,
      message,
      type: "success",
      duration,
    };

    setTimeout(() => {
      closeToast();
    }, duration);
  };

  const showError = (message, duration = 3000) => {
    toastState.value = {
      show: true,
      message,
      type: "error",
      duration,
    };

    setTimeout(() => {
      closeToast();
    }, duration);
  };

  const showInfo = (message, duration = 3000) => {
    toastState.value = {
      show: true,
      message,
      type: "info",
      duration,
    };

    setTimeout(() => {
      closeToast();
    }, duration);
  };

  const showWarning = (message, duration = 3000) => {
    toastState.value = {
      show: true,
      message,
      type: "warning",
      duration,
    };

    setTimeout(() => {
      closeToast();
    }, duration);
  };

  const closeToast = () => {
    toastState.value.show = false;
  };

  return {
    toastState,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    closeToast,
  };
}
