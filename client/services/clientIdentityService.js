class ClientIdentityManager {
  constructor() {
    this.clientId = this.loadOrCreateClientId();

    console.log(`Client identity initialized: ${this.clientId}`);

    if (window.__archimedClientId) {
      this.clientId = window.__archimedClientId;
      localStorage.setItem("archimed_client_id", this.clientId);
    } else {
      this.clientId = this.loadOrCreateClientId();

      window.__archimedClientId = this.clientId;
    }

    this.sessionMappings = this.loadSessionMappings();
    window.addEventListener("beforeunload", () => {
      this.saveSessionMappings();
    });
  }

  loadOrCreateClientId() {
    let clientId = localStorage.getItem("archimed_client_id");

    if (!clientId) {
      clientId = this.generateClientId();
      localStorage.setItem("archimed_client_id", clientId);
    }

    return clientId;
  }

  generateClientId() {
    return "client_" + Date.now() + "_" + Math.random().toString(36).substring(2, 15);
  }

  getClientId() {
    return this.clientId;
  }

  registerSession(sessionId) {
    if (!this.sessionMappings.includes(sessionId)) {
      this.sessionMappings.push(sessionId);
      this.saveSessionMappings();
    }
  }

  isSessionOwner(sessionId) {
    return this.sessionMappings.includes(sessionId);
  }

  loadSessionMappings() {
    const mappings = localStorage.getItem("archimed_session_mappings");
    return mappings ? JSON.parse(mappings) : [];
  }

  saveSessionMappings() {
    localStorage.setItem("archimed_session_mappings", JSON.stringify(this.sessionMappings));
  }
}

let clientIdentityManager = null;

export const getClientIdentityManager = () => {
  if (!clientIdentityManager) {
    clientIdentityManager = new ClientIdentityManager();
  }
  return clientIdentityManager;
};
