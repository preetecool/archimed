import { getClientIdentityManager } from "./clientIdentityService";
import { useRecordingStore } from "../stores/modules/recording";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = {
      open: [],
      close: [],
      error: [],
      message: [],
      reconnecting: [],
      reconnected: [],
      reconnectionFailed: [],
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 15;
    this.initialReconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectMultiplier = 2;
    this.reconnectTimeout = null;
    this.deliberateClose = false;
    this.activeSessionsBeforeDisconnect = new Set();
    this.pendingReconnection = false;
    this.messageQueue = [];
    this.serverUnavailableSince = 0;

    this.lastPongReceived = Date.now();
    this.pingInterval = null;
    this.heartbeatCheckInterval = null;

    this.consecutiveFailureCount = 0;
    this.MAX_CONSECUTIVE_FAILURES = 5;
    this.lastSuccessfulConnectionTime = 0;
  }

  async checkServerAvailability() {
    const SERVER_UNAVAILABLE_COOLDOWN = 30000;
    if (this.serverUnavailableSince > 0) {
      const timeSinceUnavailable = Date.now() - this.serverUnavailableSince;
      if (timeSinceUnavailable < SERVER_UNAVAILABLE_COOLDOWN) {
        if (Math.random() < 0.25) {
          console.log("In cooldown but attempting retry check");
        } else {
          console.log(
            `Server in unavailable cooldown (${Math.round(
              timeSinceUnavailable / 1000,
            )}s of ${SERVER_UNAVAILABLE_COOLDOWN / 1000}s)`,
          );
          return false;
        }
      } else {
        console.log("Server unavailable cooldown expired, resetting");
        this.serverUnavailableSince = 0;
      }
    }

    let attempts = 0;
    while (attempts < 3) {
      try {
        const cacheParam = `_nocache=${Date.now()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const serverUrl = `${this._getApiBaseUrl()}/ping?${cacheParam}`;
        console.log(`Attempt ${attempts + 1}: Checking server at ${serverUrl}`);

        const response = await fetch(serverUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log("Server is available (ping successful)");
          return true;
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      } catch (error) {
        if (error.name === "AbortError") {
          console.warn("Server ping timeout, retrying...");
        } else {
          console.error("Server check error:", error);
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }

    this.serverUnavailableSince = Date.now();
    console.log(
      `Server marked unavailable at ${new Date(this.serverUnavailableSince).toISOString()}`,
    );
    return false;
  }

  async connect(url = null) {
    const isAvailable = await this.checkServerAvailability();
    if (!isAvailable) {
      console.error("WebSocket server appears to be unavailable, not attempting connection");
      this._emitEvent("serverUnavailable");
      throw new Error("WebSocket server is unavailable");
    }

    return new Promise((resolve, reject) => {
      if (
        this.socket &&
        (this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING)
      ) {
        resolve();
        return;
      }

      if (this.consecutiveFailureCount >= this.MAX_CONSECUTIVE_FAILURES) {
        console.error(
          `Too many consecutive connection failures (${this.consecutiveFailureCount}), stopping reconnection`,
        );
        this._emitEvent("reconnectionFailed", {
          attempts: this.consecutiveFailureCount,
          reason: "Too many consecutive failures",
        });
        this.deliberateClose = true;
        reject(new Error("Too many consecutive connection failures"));
        return;
      }

      this.pendingReconnection = this.reconnectAttempts > 0;
      this.deliberateClose = false;

      const wsUrl = url || (process.env.NODE_ENV === "production" ? "" : "ws://localhost:8080/ws");

      try {
        console.log("Connecting to WebSocket URL:", wsUrl, "Online status:", navigator.onLine);

        const clientIdentityManager = getClientIdentityManager();
        this.clientId = clientIdentityManager.getClientId();

        if (!this.clientId || this.clientId === "undefined") {
          console.error("Client ID is invalid or undefined, regenerating");
          this.clientId =
            "client_" + Date.now() + "_" + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("archimed_client_id", this.clientId);
          window.__archimedClientId = this.clientId;
        }

        const connectionUrl = new URL(wsUrl);
        connectionUrl.searchParams.append("client_id", this.clientId);
        console.log(`Connecting with client ID: ${this.clientId}`);

        this.socket = new WebSocket(connectionUrl.toString());
        this.socket.binaryType = "arraybuffer";

        const connection =
          navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          connection.addEventListener("change", () => {
            console.log("Network connection changed:", connection.type);

            if (navigator.onLine && this.socket && this.socket.readyState !== WebSocket.OPEN) {
              console.log("Back online, checking connection");
              this.checkHeartbeat();
            }
          });
        }

        window.addEventListener("online", () => {
          console.log("Browser reports online");
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            console.log("Reconnecting after coming back online");
            this.connect().catch((e) => console.error("Reconnection after online failed:", e));
          }
        });

        window.addEventListener("offline", () => {
          console.log("Browser reports offline");
          this.isConnected = false;
        });

        if (this.socket.constructor.name === "WebSocket") {
          try {
            if (typeof this.socket._socket !== "undefined" && this.socket._socket) {
              this.socket._socket.setTimeout(30000);
              this.socket._socket.setKeepAlive(true, 15000);
            }
          } catch (e) {
            console.log(
              "Unable to configure WebSocket internals, using application-level keepalive instead",
            );
          }
        }

        const onOpen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.consecutiveFailureCount = 0;
          this.lastSuccessfulConnectionTime = Date.now();
          this._emitEvent("open");

          this.startPingPongCycle();
          this.startHeartbeatCheck();
          this.startConnectionHealthCheck();

          if (this.reconnectAttempts > 0) {
            this._emitEvent("reconnected", {
              activeSessions: Array.from(this.activeSessionsBeforeDisconnect),
            });
          }

          this._processPendingMessages();

          resolve();
        };

        const onClose = (event) => {
          console.log(`WebSocket closed: ${event.code} ${event.reason}`);

          this.isConnected = false;

          if (this.socket) {
            this.socket.removeEventListener("open", onOpen);
            this.socket.removeEventListener("close", onClose);
            this.socket.removeEventListener("error", onError);
            this.socket.removeEventListener("message", onMessage);
          }

          this._emitEvent("close", event);

          this.stopPingPongCycle();
          this.stopHeartbeatCheck();

          if (!this.deliberateClose && event.code !== 1000) {
            if (this.consecutiveFailureCount < this.MAX_CONSECUTIVE_FAILURES) {
              this._attemptReconnect(url);
            } else {
              console.error("Too many consecutive reconnection failures, stopping attempts");
              this._emitEvent("reconnectionFailed", {
                attempts: this.consecutiveFailureCount,
                reason: "Too many consecutive failures",
              });
            }
          }
        };

        const onError = (error) => {
          console.error("WebSocket error:", error);
          this._emitEvent("error", error);
        };

        const onMessage = (event) => {
          try {
            this.lastPongReceived = Date.now();

            if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
              this._emitEvent("binary-message", event.data);
              return;
            }

            console.log("Raw WebSocket message received:", event.data);
            const data = JSON.parse(event.data);
            console.log("Parsed WebSocket message:", data);
            const parsedData = this._convertKeys(data, this._toCamelCase);
            this._emitEvent("message", parsedData);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.socket.addEventListener("open", onOpen);
        this.socket.addEventListener("close", onClose);
        this.socket.addEventListener("error", onError);
        this.socket.addEventListener("message", onMessage);
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        reject(error);
      }
    });
  }

  startPingPongCycle() {
    this.stopPingPongCycle();

    this.primaryKeepAliveInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(new Uint8Array([0]));
        } catch (e) {
          console.warn("Failed to send binary keepalive", e);
        }
      }
    }, 15000);

    this.secondaryKeepAliveInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log("Sending application keep-alive message");
        this.send("keep-alive", { timestamp: Date.now() });
      }
    }, 45000);

    this.lastPongReceived = Date.now();
  }

  stopPingPongCycle() {
    if (this.primaryKeepAliveInterval) {
      clearInterval(this.primaryKeepAliveInterval);
      this.primaryKeepAliveInterval = null;
    }

    if (this.secondaryKeepAliveInterval) {
      clearInterval(this.secondaryKeepAliveInterval);
      this.secondaryKeepAliveInterval = null;
    }
  }

  startHeartbeatCheck() {
    this.stopHeartbeatCheck();

    this.heartbeatCheckInterval = setInterval(() => {
      this.checkHeartbeat();
    }, 30000);
  }

  stopHeartbeatCheck() {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  checkHeartbeat() {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.lastPongReceived;

    if (timeSinceLastHeartbeat > 20000) {
      console.warn(
        `No heartbeat detected for ${Math.round(
          timeSinceLastHeartbeat / 1000,
        )}s, forcing reconnection...`,
      );

      this.isConnected = false;

      try {
        if (this.socket) {
          this.socket.close(1001, "No heartbeat response");
        }
      } catch (e) {}

      setTimeout(() => {
        this.socket = null;
        this.connect().catch((error) => {
          console.error("Forced reconnection failed:", error);
        });
      }, 500);
    }
  }

  disconnect() {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }

      this.deliberateClose = true;

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      this.stopPingPongCycle();
      this.stopHeartbeatCheck();

      const onClose = () => {
        this.socket.removeEventListener("close", onClose);
        this.isConnected = false;
        resolve();
      };

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.addEventListener("close", onClose);
        this.socket.close(1000, "Deliberate close by client");
      } else {
        this.isConnected = false;
        resolve();
      }
    });
  }

  isConnectionHealthy() {
    return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  startConnectionHealthCheck() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

    this.healthCheckInterval = setInterval(() => {
      if (this.isConnected && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
        console.log("Health check detected zombie connection");
        this.isConnected = false;
        this.connect().catch((e) => console.error("Health check reconnect failed:", e));
      }
    }, 15000);
  }

  send(type, payload = {}) {
    const clientId = getClientIdentityManager().getClientId();
    if (!this.isConnectionHealthy()) {
      console.log(`Cannot send ${type} message - connection not healthy`);

      if (this.isConnected && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
        console.log("Detected zombie connection, forcing reconnect");
        this.isConnected = false;

        setTimeout(() => this.connect(), 1000);
      }

      if (this.reconnectAttempts > 0 && !this.deliberateClose) {
        this.messageQueue.push({
          type,
          payload: { ...payload },
        });
        console.log(`Queued message of type ${type} for later sending`);
      }
      return false;
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (this.reconnectAttempts > 0 && !this.deliberateClose) {
        this.messageQueue.push({
          type,
          payload: { ...payload },
        });
        console.log(`Queued message of type ${type} for later sending`);
      }
      return false;
    }

    try {
      const message = { ...payload };
      message.type = type.replace(/-/g, "_");

      if (!message.metadata) {
        message.metadata = {};
      }
      const clientIdentityManager = getClientIdentityManager();
      const currentClientId = clientIdentityManager.getClientId();
      message.metadata.clientId = currentClientId;

      console.log(`Sending message with client ID: ${currentClientId}`);

      const convertedMessage = this._convertKeys(message, this._toSnakeCase);

      const logMessage = { ...convertedMessage };
      if (logMessage.audio) {
        logMessage.audio = `[base64 data, length: ${logMessage.audio.length}]`;
      }
      console.log(`Sending WebSocket message: ${JSON.stringify(logMessage)}`);

      const sendPromise = new Promise((resolve, reject) => {
        try {
          this.socket.send(JSON.stringify(convertedMessage));
          resolve(true);
        } catch (error) {
          reject(error);
        }
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(false), 5000);
      });

      return Promise.race([sendPromise, timeoutPromise])
        .then((result) => {
          if (!result) {
            console.warn(`Send timed out for message type ${type}`);

            if (this.socket.readyState === WebSocket.OPEN) {
              this.socket.close(1001, "Send timeout");
            }
          } else {
            console.log(`Successfully sent message of type ${type}`);
          }
          return result;
        })
        .catch((error) => {
          console.error(`Error sending ${type}:`, error);

          if (
            error.message &&
            (error.message.includes("not connected") || error.message.includes("INVALID_STATE_ERR"))
          ) {
            console.log("Send error suggests connection is dead, forcing reconnect");
            this.isConnected = false;
            setTimeout(() => this.connect(), 1000);
          }

          return false;
        });
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      return false;
    }
  }

  on(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].push(callback);
    } else {
      console.warn(`Unknown WebSocket event: ${eventName}`);
    }
  }

  off(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName] = this.eventListeners[eventName].filter(
        (cb) => cb !== callback,
      );
    }
  }

  getSocketState() {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  registerActiveSession(sessionId) {
    if (sessionId) {
      this.activeSessionsBeforeDisconnect.add(sessionId);
    }
  }

  unregisterActiveSession(sessionId) {
    if (sessionId) {
      this.activeSessionsBeforeDisconnect.delete(sessionId);
    }
  }

  _processPendingMessages() {
    if (this.messageQueue.length > 0) {
      console.log(`Processing ${this.messageQueue.length} queued messages after reconnection`);

      const queue = [...this.messageQueue];
      this.messageQueue = [];

      for (const message of queue) {
        this.send(message.type, message.payload);
      }
    }
  }

  _emitEvent(eventName, data = null) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket ${eventName} event listener:`, error);
        }
      });
    }
  }

  _attemptReconnect(url) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;

    const timeSinceLastConnection = Date.now() - this.lastSuccessfulConnectionTime;
    if (timeSinceLastConnection > 60000) {
      console.log("Resetting consecutive failure count due to elapsed time");
      this.consecutiveFailureCount = Math.max(0, this.consecutiveFailureCount - 1);
    }

    if (this.consecutiveFailureCount >= this.MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `Too many consecutive failures (${this.consecutiveFailureCount}), stopping reconnection`,
      );
      this._emitEvent("reconnectionFailed", {
        attempts: this.consecutiveFailureCount,
        reason: "Too many consecutive failures",
      });
      return;
    }

    let delay =
      this.initialReconnectDelay * Math.pow(this.reconnectMultiplier, this.reconnectAttempts - 1);
    delay = Math.min(delay, this.maxReconnectDelay);
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    delay = Math.floor(delay + jitter);

    console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts}) in ${delay}ms`);

    this._emitEvent("reconnecting", {
      attemptNumber: this.reconnectAttempts,
      nextDelay: delay,
      activeSessions: Array.from(this.activeSessionsBeforeDisconnect),
    });

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);

      if (!navigator.onLine) {
        console.log("Browser reports offline, delaying reconnection attempt");
        this.reconnectTimeout = setTimeout(() => this._attemptReconnect(url), 5000);
        return;
      }

      this.socket = null;

      if (this.serverUnavailableSince > 0) {
        const timeSinceUnavailable = Date.now() - this.serverUnavailableSince;
        if (timeSinceUnavailable > 30000) {
          this.serverUnavailableSince = 0;
        }
      }

      this.connect(url).catch((error) => {
        console.error(`Connection attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }

  _convertKeys(obj, convertFn) {
    if (!obj || typeof obj !== "object" || obj instanceof Date || obj instanceof Blob) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this._convertKeys(item, convertFn));
    }

    return Object.keys(obj).reduce((result, key) => {
      const convertedKey = convertFn(key);
      result[convertedKey] = this._convertKeys(obj[key], convertFn);
      return result;
    }, {});
  }

  _toSnakeCase(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  _toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  async ensureFinalizeSession(sessionId) {
    if (!sessionId) return false;

    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log(`Finalizing session ${sessionId} via WebSocket`);

      try {
        const finalizePromise = new Promise((resolve) => {
          const messageHandler = (data) => {
            if (data.type === "session-ended" && data.sessionId === sessionId) {
              console.log(`Received session-ended confirmation for ${sessionId}`);
              this.off("message", messageHandler);
              resolve(true);
            }

            if (
              data.type === "processing-status" &&
              data.sessionId === sessionId &&
              (data.status === "completed" || data.status === "processing")
            ) {
              console.log(`Received processing status ${data.status} for ${sessionId}`);

              if (data.status === "completed") {
                this.off("message", messageHandler);
                resolve(true);
              }
            }
          };

          this.on("message", messageHandler);

          setTimeout(() => {
            this.off("message", messageHandler);
            console.log(`Timeout expired for WebSocket finalization of ${sessionId}`);
            resolve(false);
          }, 30000);
        });

        const sendSuccess = this.send("end-session", {
          sessionId: sessionId,
        });

        if (!sendSuccess) {
          console.log(`Failed to send end-session request for ${sessionId} via WebSocket`);
          return false;
        }

        const success = await finalizePromise;
        console.log(`WebSocket finalization result for ${sessionId}: ${success}`);
        return success;
      } catch (error) {
        console.error(`Error finalizing session ${sessionId} via WebSocket:`, error);
        return false;
      }
    }

    console.log(`WebSocket unavailable for session ${sessionId}, caller should use HTTP fallback`);
    return false;
  }

  handleConnectionLoss(sessionId) {
    if (sessionId) {
      console.log(`Connection lost while processing session ${sessionId}, starting HTTP polling`);

      const recordingStore = useRecordingStore();
      if (recordingStore && recordingStore.checkSessionStatusViaHTTP) {
        recordingStore.checkSessionStatusViaHTTP(sessionId);
      }
    }
  }

  _getApiBaseUrl() {
    const wsUrl = this.socket
      ? this.socket.url
      : process.env.NODE_ENV === "production"
        ? ""
        : "ws://localhost:8080/ws";

    return wsUrl.replace(/^ws/, "http").replace(/^wss/, "https").replace(/\/ws$/, "");
  }

  _getClientId() {
    if (!this._clientId) {
      this._clientId = "fallback-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    }
    return this._clientId;
  }
}

let websocketService = null;

export const getWebSocketService = () => {
  if (!websocketService) {
    websocketService = new WebSocketService();
  }
  return websocketService;
};
