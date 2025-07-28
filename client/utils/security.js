import { useUserStore } from "~/stores";

export const TOKEN_KEY = "firebase_token";

export const SecurityUtils = {
  getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setAuthToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeAuthToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  validateToken(token) {
    if (!token) return false;
    try {
      const [header, payload, signature] = token.split(".");
      if (!header || !payload || !signature) return false;

      const decodedPayload = JSON.parse(atob(payload));
      const currentTime = Math.floor(Date.now() / 1000);

      return decodedPayload.exp > currentTime;
    } catch {
      return false;
    }
  },

  getSecureHeaders() {
    const token = this.getAuthToken();
    return {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-XSRF-TOKEN": document.cookie.match(/XSRF-TOKEN=([\w-]+)/)?.[1] || "",
    };
  },

  async secureRequest(url, options = {}) {
    const headers = {
      ...this.getSecureHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (response.status === 401) {
      this.removeAuthToken();
      const userStore = useUserStore();
      await userStore.signOut();
      throw new Error("Authentication required");
    }

    return response;
  },

  sanitizeInput(input) {
    if (typeof input !== "string") return input;
    return input.replace(/[<>]/g, "").trim();
  },

  checkPermissions(requiredPermissions) {
    const userStore = useUserStore();
    return requiredPermissions.every((permission) =>
      userStore.userData?.permissions?.includes(permission),
    );
  },

  getSocketAuthPayload() {
    const token = this.getAuthToken();
    return {
      token,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substr(2, 9),
    };
  },
};

export const requireAuth = async (to, from, next) => {
  const userStore = useUserStore();
  const token = SecurityUtils.getAuthToken();

  if (!token || !SecurityUtils.validateToken(token)) {
    SecurityUtils.removeAuthToken();
    return next({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }

  if (!userStore.isAuthenticated) {
    try {
      await userStore.init();
    } catch (error) {
      SecurityUtils.removeAuthToken();
      return next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    }
  }

  next();
};

export const socketSecurityMiddleware = (socket) => {
  socket.on("connect", () => {
    socket.auth = SecurityUtils.getSocketAuthPayload();
  });

  socket.on("error", (error) => {
    if (error.type === "AuthError") {
      const userStore = useUserStore();
      userStore.signOut();
    }
  });
};
