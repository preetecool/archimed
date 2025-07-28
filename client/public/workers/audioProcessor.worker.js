const DB_CONFIG = {
  NAME: "AudioBufferDB",
  VERSION: 2,
  STORES: {
    AUDIO: "audioChunks",
    TRANSCRIPT: "transcripts",
    SESSION: "sessions",
  },
};
const acknowledgedChunks = {};

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

    request.onerror = (event) => reject(`IndexedDB error: ${event.target.error}`);

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      try {
        const db = event.target.result;
        createStoresIfNeeded(db);
      } catch (error) {
        console.error("Error in database upgrade:", error);
      }
    };
  });
}

function createStoresIfNeeded(db) {
  if (!db.objectStoreNames.contains(DB_CONFIG.STORES.AUDIO)) {
    db.createObjectStore(DB_CONFIG.STORES.AUDIO, {
      keyPath: "id",
      autoIncrement: true,
    });
  }

  if (!db.objectStoreNames.contains(DB_CONFIG.STORES.TRANSCRIPT)) {
    const transcriptStore = db.createObjectStore(DB_CONFIG.STORES.TRANSCRIPT, {
      keyPath: "sessionId",
    });
    transcriptStore.createIndex("timestamp", "timestamp", { unique: false });
  }

  if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SESSION)) {
    const sessionStore = db.createObjectStore(DB_CONFIG.STORES.SESSION, {
      keyPath: "id",
    });
    sessionStore.createIndex("status", "status", { unique: false });
    sessionStore.createIndex("timestamp", "lastUpdated", { unique: false });
  }
}

function safeGetIndex(store, indexName) {
  try {
    if (store.indexNames && store.indexNames.contains(indexName)) {
      return store.index(indexName);
    }
    return null;
  } catch (error) {
    console.error(`Error accessing index ${indexName}:`, error);
    return null;
  }
}

async function saveChunkToIndexedDB(sessionId, base64Audio, mimeType) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readwrite");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);

      const record = {
        sessionId,
        base64Audio,
        mimeType,
        timestamp: Date.now(),
      };

      const request = store.add(record);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(`Error saving to IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function getOrderedBufferedChunks(sessionId) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);
      const chunks = [];

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId || sessionId === "all") {
            chunks.push(cursor.value);
          }
          cursor.continue();
        } else {
          chunks.sort((a, b) => a.timestamp - b.timestamp);
          resolve(chunks);
        }
      };

      request.onerror = (event) => reject(`Error reading from IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function deleteChunk(id) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readwrite");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);

      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(`Error deleting from IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function getBufferCount(sessionId) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);
      let count = 0;

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) {
            count++;
          }
          cursor.continue();
        } else {
          resolve(count);
        }
      };

      request.onerror = (event) => reject(`Error counting in IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function saveTranscript(sessionId, transcriptText) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.TRANSCRIPT], "readwrite");
      const store = transaction.objectStore(DB_CONFIG.STORES.TRANSCRIPT);

      const record = {
        sessionId,
        text: transcriptText,
        timestamp: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) =>
        reject(`Error saving transcript to IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function getTranscript(sessionId) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.TRANSCRIPT], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.TRANSCRIPT);

      const request = store.get(sessionId);

      request.onsuccess = (event) => {
        resolve(event.target.result ? event.target.result.text : "");
      };

      request.onerror = (event) =>
        reject(`Error retrieving transcript from IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function updateSessionInfo(sessionInfo) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.SESSION], "readwrite");
      const store = transaction.objectStore(DB_CONFIG.STORES.SESSION);

      const record = {
        ...sessionInfo,
        lastUpdated: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) =>
        reject(`Error updating session in IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function getSessions(statusFilter = null) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.SESSION], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.SESSION);
      const sessions = [];

      let request;

      if (statusFilter) {
        const statusIndex = safeGetIndex(store, "status");

        if (statusIndex) {
          const range = IDBKeyRange.only(statusFilter);
          request = statusIndex.openCursor(range);
        } else {
          request = store.openCursor();
        }
      } else {
        request = store.openCursor();
      }

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (statusFilter && !safeGetIndex(store, "status")) {
            if (cursor.value.status === statusFilter) {
              sessions.push(cursor.value);
            }
          } else {
            sessions.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      request.onerror = (event) =>
        reject(`Error retrieving sessions from IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function cleanupOldSessions(maxAgeDays = 30) {
  if (!db) await initDatabase();

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoffTimestamp = Date.now() - maxAgeMs;

  const oldSessionIds = await findOldSessions(cutoffTimestamp);

  let deletedCount = 0;
  for (const sessionId of oldSessionIds) {
    try {
      await deleteSession(sessionId);
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting session ${sessionId}:`, error);
    }
  }

  return deletedCount;
}

async function findOldSessions(cutoffTimestamp) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.SESSION], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.SESSION);
      const ids = [];

      const timestampIndex = safeGetIndex(store, "timestamp");

      let request;
      if (timestampIndex) {
        const range = IDBKeyRange.upperBound(cutoffTimestamp);
        request = timestampIndex.openCursor(range);
      } else {
        request = store.openCursor();
      }

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!timestampIndex) {
            if (cursor.value.lastUpdated && cursor.value.lastUpdated < cutoffTimestamp) {
              ids.push(cursor.value.id);
            }
          } else {
            ids.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          resolve(ids);
        }
      };

      request.onerror = (event) => reject(`Error finding old sessions: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function deleteSession(sessionId) {
  if (!db) await initDatabase();

  await deleteAllSessionChunks(sessionId);

  try {
    const transaction = db.transaction([DB_CONFIG.STORES.TRANSCRIPT], "readwrite");
    const store = transaction.objectStore(DB_CONFIG.STORES.TRANSCRIPT);
    await new Promise((resolve, reject) => {
      const request = store.delete(sessionId);
      request.onsuccess = resolve;
      request.onerror = (event) => reject(`Error deleting transcript: ${event.target.error}`);
    });
  } catch (error) {
    console.warn(`Error deleting transcript for session ${sessionId}:`, error);
  }

  try {
    const transaction = db.transaction([DB_CONFIG.STORES.SESSION], "readwrite");
    const store = transaction.objectStore(DB_CONFIG.STORES.SESSION);
    await new Promise((resolve, reject) => {
      const request = store.delete(sessionId);
      request.onsuccess = resolve;
      request.onerror = (event) => reject(`Error deleting session: ${event.target.error}`);
    });
  } catch (error) {
    console.warn(`Error deleting session info for ${sessionId}:`, error);
  }

  return true;
}

async function deleteAllSessionChunks(sessionId) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readwrite");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);
      const chunkIds = [];

      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) {
            chunkIds.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          let deletedCount = 0;
          for (const id of chunkIds) {
            try {
              await deleteChunk(id);
              deletedCount++;
            } catch (error) {
              console.error(`Error deleting chunk ${id}:`, error);
            }
          }
          resolve(deletedCount);
        }
      };

      request.onerror = (event) =>
        reject(`Error finding chunks in IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function cleanupOrphanedChunks() {
  if (!db) await initDatabase();

  try {
    const sessions = await getSessions();
    const activeSessionIds = new Set(sessions.map((session) => session.id));

    const orphanedChunks = await findOrphanedChunks(activeSessionIds);
    let deletedCount = 0;

    for (const chunk of orphanedChunks) {
      try {
        await deleteChunk(chunk.id);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting orphaned chunk ${chunk.id}:`, error);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up orphaned chunks:", error);
    return 0;
  }
}

async function findOrphanedChunks(activeSessionIds) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);
      const orphanedChunks = [];

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!activeSessionIds.has(cursor.value.sessionId)) {
            orphanedChunks.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(orphanedChunks);
        }
      };

      request.onerror = (event) =>
        reject(`Error finding orphaned chunks in IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function getStorageUsage() {
  if (!db) await initDatabase();

  try {
    const audioChunksUsage = await getStoreSize(DB_CONFIG.STORES.AUDIO);
    const transcriptsUsage = await getStoreSize(DB_CONFIG.STORES.TRANSCRIPT);
    const sessionsUsage = await getStoreSize(DB_CONFIG.STORES.SESSION);

    return {
      audioChunksCount: audioChunksUsage.count,
      audioChunksSize: audioChunksUsage.size,
      transcriptsCount: transcriptsUsage.count,
      transcriptsSize: transcriptsUsage.size,
      sessionsCount: sessionsUsage.count,
      sessionsSize: sessionsUsage.size,
      totalSize: audioChunksUsage.size + transcriptsUsage.size + sessionsUsage.size,
    };
  } catch (error) {
    console.error("Error getting storage usage:", error);
    return {
      audioChunksCount: 0,
      audioChunksSize: 0,
      transcriptsCount: 0,
      transcriptsSize: 0,
      sessionsCount: 0,
      sessionsSize: 0,
      totalSize: 0,
    };
  }
}

async function getStoreSize(storeName) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve({ count: 0, size: 0 });
        return;
      }

      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      let totalSize = 0;
      let count = 0;

      countRequest.onsuccess = () => {
        count = countRequest.result;
        if (count === 0) {
          resolve({ count: 0, size: 0 });
          return;
        }
      };

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const value = cursor.value;
          let entrySize = 0;

          try {
            if (storeName === DB_CONFIG.STORES.AUDIO && value.base64Audio) {
              entrySize = value.base64Audio.length * 0.75;
            } else {
              const jsonString = JSON.stringify(value);
              entrySize = jsonString.length * 2;
            }

            totalSize += entrySize;
          } catch (error) {
            console.warn(`Error measuring size of ${storeName} entry:`, error);
          }

          cursor.continue();
        } else {
          resolve({
            count,
            size: totalSize,
          });
        }
      };

      request.onerror = (event) =>
        reject(`Error calculating store size in IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error while measuring ${storeName}: ${error}`);
    }
  });
}

async function getPendingSessions() {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.SESSION], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.SESSION);
      const pendingSessions = [];

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (
            cursor.value.pendingFinalization === true ||
            cursor.value.status === "pending_completion"
          ) {
            pendingSessions.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(pendingSessions);
        }
      };

      request.onerror = (event) =>
        reject(`Error retrieving pending sessions: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function cleanupStalePendingSessions(maxAgeHours = 24) {
  if (!db) await initDatabase();

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const cutoffTime = Date.now() - maxAgeMs;

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.SESSION], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.SESSION);
      const staleSessions = [];

      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const session = cursor.value;

          if (
            (session.pendingFinalization === true || session.status === "pending_completion") &&
            session.lastEndAttempt &&
            session.lastEndAttempt < cutoffTime
          ) {
            staleSessions.push(session.id);
          }
          cursor.continue();
        } else {
          let updatedCount = 0;
          for (const sessionId of staleSessions) {
            try {
              await updateSessionInfo({
                id: sessionId,
                status: "completed",
                pendingFinalization: false,
                forceClosed: true,
                lastUpdated: Date.now(),
              });
              updatedCount++;
            } catch (error) {
              console.error(`Error updating stale session ${sessionId}:`, error);
            }
          }
          resolve(updatedCount);
        }
      };

      request.onerror = (event) => reject(`Error retrieving stale sessions: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function performAutomaticCleanup(thresholdMB = 50) {
  try {
    const usage = await getStorageUsage();
    const totalSizeMB = usage.totalSize / (1024 * 1024);

    if (totalSizeMB > thresholdMB) {
      const orphanedCount = await cleanupOrphanedChunks();

      const updatedUsage = await getStorageUsage();
      const updatedSizeMB = updatedUsage.totalSize / (1024 * 1024);

      if (updatedSizeMB > thresholdMB) {
        let daysToKeep = 30;
        let deletedCount = 0;

        while (updatedSizeMB > thresholdMB && daysToKeep > 1) {
          daysToKeep = Math.max(1, daysToKeep - 5);
          deletedCount = await cleanupOldSessions(daysToKeep);

          if (deletedCount > 0) {
            const postCleanupUsage = await getStorageUsage();
            const postCleanupSizeMB = postCleanupUsage.totalSize / (1024 * 1024);

            if (postCleanupSizeMB <= thresholdMB) {
              break;
            }
          }
        }

        return {
          orphanedChunksDeleted: orphanedCount,
          oldSessionsDeleted: deletedCount,
          daysKept: daysToKeep,
        };
      }

      return {
        orphanedChunksDeleted: orphanedCount,
        oldSessionsDeleted: 0,
        daysKept: 30,
      };
    }

    return {
      orphanedChunksDeleted: 0,
      oldSessionsDeleted: 0,
      daysKept: 30,
    };
  } catch (error) {
    console.error("Error in automatic cleanup:", error);
    return {
      orphanedChunksDeleted: 0,
      oldSessionsDeleted: 0,
      daysKept: 30,
      error: error.toString(),
    };
  }
}

async function getAllSessionChunks(sessionId) {
  if (!db) await initDatabase();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([DB_CONFIG.STORES.AUDIO], "readonly");
      const store = transaction.objectStore(DB_CONFIG.STORES.AUDIO);
      const chunks = [];

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.sessionId === sessionId) {
            chunks.push(cursor.value);
          }
          cursor.continue();
        } else {
          chunks.sort((a, b) => a.timestamp - b.timestamp);
          resolve(chunks);
        }
      };

      request.onerror = (event) => reject(`Error reading from IndexedDB: ${event.target.error}`);
    } catch (error) {
      reject(`Transaction error: ${error}`);
    }
  });
}

async function blobToBase64(blob) {
  if (!(blob instanceof Blob)) {
    throw new Error(`Expected Blob but got ${typeof blob}: ${blob}`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64data = reader.result.split(",")[1];
        resolve(base64data);
      } catch (error) {
        reject(`Error processing blob: ${error}`);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

self.onmessage = async (event) => {
  try {
    const {
      action,
      audioBlob,
      sessionId,
      mimeType,
      isOnline,
      id,
      transcriptText,
      sessionInfo,
      thresholdMB,
    } = event.data;

    if (!db) {
      try {
        await initDatabase();
      } catch (dbError) {
        self.postMessage({
          type: "error",
          error: `Database initialization error: ${dbError}`,
          action,
        });
        return;
      }
    }

    switch (action) {
      case "processAndQueue": {
        if (!(audioBlob instanceof Blob)) {
          self.postMessage({
            type: "error",
            error: `Invalid audioBlob: ${typeof audioBlob}`,
            action,
          });
          break;
        }

        try {
          console.log(`Processing audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          const base64Audio = await blobToBase64(audioBlob);
          console.log(`Converted to base64, length: ${base64Audio.length}`);

          if (isOnline) {
            console.log(`Sending audio chunk for session ${sessionId} via WebSocket`);
            self.postMessage({
              type: "chunkReadyForSending",
              base64Audio,
              mimeType,
              sessionId,
              id: null,
            });
          } else {
            console.log(`Storing audio chunk for session ${sessionId} in IndexedDB (offline)`);
            const chunkId = await saveChunkToIndexedDB(sessionId, base64Audio, mimeType);
            const count = await getBufferCount(sessionId);

            self.postMessage({
              type: "bufferUpdate",
              count,
              sessionId,
            });
          }
        } catch (error) {
          console.error(`Error processing audio: ${error}`);
          self.postMessage({
            type: "error",
            error: `Error processing audio: ${error}`,
            action,
          });
        }
        break;
      }

      case "sendBufferedData": {
        try {
          const chunks = await getOrderedBufferedChunks(sessionId || "all");

          if (chunks.length > 0) {
            self.postMessage({
              type: "sendingBufferedChunks",
              count: chunks.length,
              sessionId: chunks[0].sessionId,
            });
          }

          for (const chunk of chunks) {
            self.postMessage({
              type: "chunkReadyForSending",
              base64Audio: chunk.base64Audio,
              mimeType: chunk.mimeType,
              sessionId: chunk.sessionId,
              id: chunk.id,
              timestamp: chunk.timestamp,
            });
          }
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error sending buffered data: ${error}`,
            action,
          });
        }
        break;
      }

      case "chunkSuccessfullySent": {
        try {
          await deleteChunk(id);
          const count = await getBufferCount(sessionId);

          self.postMessage({
            type: "bufferUpdate",
            count,
            sessionId,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error marking chunk as sent: ${error}`,
            action,
          });
        }
        break;
      }

      case "saveTranscript": {
        try {
          await saveTranscript(sessionId, transcriptText);
          self.postMessage({
            type: "transcriptSaved",
            sessionId,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error saving transcript: ${error}`,
            action,
          });
        }
        break;
      }

      case "getTranscript": {
        try {
          const transcript = await getTranscript(sessionId);
          self.postMessage({
            type: "transcriptRetrieved",
            sessionId,
            transcript,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error retrieving transcript: ${error}`,
            action,
          });
        }
        break;
      }

      case "updateSession": {
        try {
          await updateSessionInfo(sessionInfo);
          self.postMessage({
            type: "sessionUpdated",
            sessionId: sessionInfo.id,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error updating session: ${error}`,
            action,
          });
        }
        break;
      }

      case "getSessions": {
        try {
          const sessions = await getSessions(event.data.status || null);
          self.postMessage({
            type: "sessionsRetrieved",
            sessions,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error getting sessions: ${error}`,
            action,
          });
        }
        break;
      }

      case "getPendingSessions": {
        try {
          const sessions = await getPendingSessions();
          self.postMessage({
            type: "pendingSessionsRetrieved",
            sessions,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error getting pending sessions: ${error}`,
            action,
          });
        }
        break;
      }
      case "cleanupStalePendingSessions": {
        try {
          const maxAgeHours = event.data.maxAgeHours || 24;
          const updatedCount = await cleanupStalePendingSessions(maxAgeHours);

          self.postMessage({
            type: "stalePendingSessionsCleanedUp",
            updatedCount,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error cleaning up stale pending sessions: ${error}`,
            action,
          });
        }
        break;
      }

      case "deleteSession": {
        try {
          await deleteSession(sessionId);
          self.postMessage({
            type: "sessionDeleted",
            sessionId,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error deleting session: ${error}`,
            action,
          });
        }
        break;
      }

      case "cleanupOldSessions": {
        try {
          const deletedCount = await cleanupOldSessions(event.data.maxAgeDays || 30);
          self.postMessage({
            type: "cleanupCompleted",
            deletedCount,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error cleaning up old sessions: ${error}`,
            action,
          });
        }
        break;
      }

      case "cleanupOrphanedChunks": {
        try {
          const deletedCount = await cleanupOrphanedChunks();
          self.postMessage({
            type: "orphanedChunksCleanup",
            deletedCount,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error cleaning up orphaned chunks: ${error}`,
            action,
          });
        }
        break;
      }

      case "getStorageUsage": {
        try {
          const usage = await getStorageUsage();
          self.postMessage({
            type: "storageUsage",
            usage,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error getting storage usage: ${error}`,
            action,
          });
        }
        break;
      }

      case "performAutomaticCleanup": {
        try {
          const result = await performAutomaticCleanup(thresholdMB || 50);
          self.postMessage({
            type: "automaticCleanupCompleted",
            result,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error in automatic cleanup: ${error}`,
            action,
          });
        }
        break;
      }
      case "cleanupSessionChunks": {
        try {
          const deletedCount = await deleteAllSessionChunks(sessionId);
          self.postMessage({
            type: "sessionChunksDeleted",
            sessionId,
            count: deletedCount,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error cleaning up session chunks: ${error}`,
            action,
          });
        }
        break;
      }
      case "saveChunkDirectly": {
        try {
          await saveChunkToIndexedDB(sessionId, base64Audio, mimeType);
          self.postMessage({
            type: "chunkSaved",
            sessionId,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error saving chunk directly: ${error}`,
            action,
          });
        }
        break;
      }
      case "chunkAcknowledged": {
        try {
          const { sessionId, chunkId, sequenceNumber } = event.data;

          if (!acknowledgedChunks[sessionId]) {
            acknowledgedChunks[sessionId] = new Set();
          }

          if (chunkId) {
            acknowledgedChunks[sessionId].add(chunkId);
          } else if (sequenceNumber) {
            acknowledgedChunks[sessionId].add(`seq_${sequenceNumber}`);
          }

          self.postMessage({
            type: "chunkAcknowledged",
            sessionId,
            chunkId,
            sequenceNumber,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error handling chunk acknowledgment: ${error}`,
            action: "chunkAcknowledged",
          });
        }
        break;
      }

      case "sendAllBufferedDataForSession": {
        try {
          const sessionId = event.data.sessionId;

          const allChunks = await getAllSessionChunks(sessionId);

          console.log(`Sending ALL ${allChunks.length} buffered chunks for session ${sessionId}`);

          if (allChunks.length > 0) {
            self.postMessage({
              type: "sendingAllBufferedChunks",
              count: allChunks.length,
              sessionId: sessionId,
            });

            const BATCH_SIZE = 10;
            for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
              const batch = allChunks.slice(i, i + BATCH_SIZE);

              for (const chunk of batch) {
                self.postMessage({
                  type: "chunkReadyForSending",
                  base64Audio: chunk.base64Audio,
                  mimeType: chunk.mimeType,
                  sessionId: chunk.sessionId,
                  id: chunk.id,
                  timestamp: chunk.timestamp,
                });

                await new Promise((r) => setTimeout(r, 50));
              }
            }
          }

          self.postMessage({
            type: "allChunksSent",
            sessionId,
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            error: `Error sending all buffered data: ${error}`,
            action: "sendAllBufferedDataForSession",
          });
        }
        break;
      }
      case "ping": {
        self.postMessage({
          type: "workerReady",
        });
        break;
      }

      default:
        self.postMessage({
          type: "error",
          error: `Unknown action: ${action}`,
          action,
        });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.toString(),
      action: event.data?.action || "unknown",
    });
  }
};
