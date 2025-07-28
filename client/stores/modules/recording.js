import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { getWebSocketService } from "~/services/websocketService";
import { getClientIdentityManager } from "~/services/clientIdentityService";
import { useAudioCapture } from "~/composables/useAudioCapture";

export const useRecordingStore = defineStore("recording", () => {
  const sessionId = ref(null);
  const isRecording = ref(false);
  const isConnecting = ref(false);
  const isConnected = ref(false);
  const micPermissionGranted = ref(true);
  const currentTranscription = ref("");
  const recordingStartTime = ref(null);
  const bufferedChunkCount = ref(0);
  const sessionsHistory = ref([]);
  const processingSession = ref(null);
  const audioWorker = ref(null);
  const currentMimeType = ref(null);
  const websocketService = ref(null);
  const currentTime = ref(Date.now());
  let timerInterval = null;
  let audioChunkSequence = 0;
  const sessionPollingIntervals = ref({});

  const pendingAudioChunks = ref([]);

  const storageUsage = ref(null);
  const isCleanupInProgress = ref(false);
  const createdBlobUrls = new Set();

  let reconnectFailureCount = 0;
  const MAX_RECONNECT_FAILURES = 3;

  const CHUNK_MANAGEMENT = {
    MAX_MEMORY_CHUNKS: 50,
    MAX_AGE_MS: 5 * 60 * 1000,
    CLEANUP_INTERVAL_MS: 30 * 1000,
  };

  const {
    isMicPermissionGranted,
    isCapturingAudio,
    startAudioCapture,
    stopAudioCapture,
    checkMicrophonePermission,
    mediaRecorder,
  } = useAudioCapture();

  const formattedDuration = computed(() => {
    if (!recordingStartTime.value) return "00:00";

    const durationMs = Math.max(0, currentTime.value - recordingStartTime.value);
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  });

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      currentTime.value = Date.now();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  async function initialize() {
    websocketService.value = getWebSocketService();

    await initializeAudioWorker();
    setupEventListeners();
    await checkMicrophonePermission();
    await loadSessionsFromIndexedDB();
    micPermissionGranted.value = isMicPermissionGranted.value;
    setupCleanupSchedule();
    setupChunkManagement();
    setupKeepAliveForLongRecordings();

    try {
      await websocketService.value.connect();
    } catch (error) {
      console.error("Failed to connect WebSocket", error);
    }
  }

  function setupEventListeners() {
    if (websocketService.value) {
      websocketService.value.on("open", handleSocketOpen);
      websocketService.value.on("close", handleSocketClose);
      websocketService.value.on("error", handleSocketError);
      websocketService.value.on("reconnecting", handleSocketReconnecting);
      websocketService.value.on("reconnected", handleSocketReconnected);
      websocketService.value.on("message", handleWebSocketMessage);
    }
  }

  async function initializeAudioWorker() {
    try {
      if (typeof Worker !== "undefined") {
        if (!audioWorker.value) {
          audioWorker.value = new Worker("/workers/audioProcessor.worker.js");
          audioWorker.value.onmessage = handleWorkerMessage;

          await new Promise((resolve) => {
            const messageHandler = (event) => {
              if (event.data && event.data.type === "workerReady") {
                audioWorker.value.removeEventListener("message", messageHandler);
                resolve();
              }
            };

            audioWorker.value.addEventListener("message", messageHandler);
            audioWorker.value.postMessage({ action: "ping" });

            setTimeout(resolve, 1000);
          });
        }
      } else {
        console.error("Web Workers are not supported in this browser");
      }
    } catch (error) {
      console.error("Error initializing audio worker", error);
    }

    return audioWorker.value !== null;
  }

  function setupCleanupSchedule() {
    const dailyCleanupMs = 24 * 60 * 60 * 1000;
    setInterval(() => {
      if (audioWorker.value) {
        try {
          audioWorker.value.postMessage({
            action: "cleanupStalePendingSessions",
            maxAgeHours: 24,
          });
        } catch (error) {
          console.error("Error scheduling pending sessions cleanup", error);
        }
      }
    }, dailyCleanupMs);

    setTimeout(() => {
      if (audioWorker.value) {
        audioWorker.value.postMessage({
          action: "cleanupStalePendingSessions",
          maxAgeHours: 24,
        });
      }
    }, 5000);
  }

  function setupChunkManagement() {
    setInterval(() => {
      if (pendingAudioChunks.value.length > CHUNK_MANAGEMENT.MAX_MEMORY_CHUNKS / 2) {
        managePendingChunks();
      }

      if (audioWorker.value) {
        audioWorker.value.postMessage({
          action: "cleanupOrphanedChunks",
        });
      }
    }, CHUNK_MANAGEMENT.CLEANUP_INTERVAL_MS);
  }

  function managePendingChunks() {
    if (pendingAudioChunks.value.length === 0) return;

    if (pendingAudioChunks.value.length > CHUNK_MANAGEMENT.MAX_MEMORY_CHUNKS) {
      const excessCount = pendingAudioChunks.value.length - CHUNK_MANAGEMENT.MAX_MEMORY_CHUNKS;

      pendingAudioChunks.value.sort((a, b) => a.timestamp - b.timestamp);

      const chunksToSave = pendingAudioChunks.value.slice(0, excessCount);

      if (sessionId.value && audioWorker.value) {
        chunksToSave.forEach((chunk) => {
          saveChunkToIndexedDB(chunk);
        });

        pendingAudioChunks.value = pendingAudioChunks.value.slice(excessCount);
      }
    }
  }

  function saveChunkToIndexedDB(chunk) {
    if (!audioWorker.value || !sessionId.value) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64Audio = reader.result.split(",")[1];
        audioWorker.value.postMessage({
          action: "saveChunkDirectly",
          sessionId: sessionId.value,
          base64Audio: base64Audio,
          mimeType: chunk.mimeType,
          timestamp: chunk.timestamp,
        });
      } catch (error) {
        console.error("Error saving chunk to IndexedDB:", error);
      }
    };
    reader.readAsDataURL(chunk.audioBlob);
  }

  function handleSocketOpen() {
    isConnected.value = true;
    isConnecting.value = false;
    reconnectFailureCount = 0;

    setTimeout(checkPendingCompletionSessions, 1000);

    if (bufferedChunkCount.value > 0) {
      setTimeout(sendBufferedAudio, 500);
    }
  }

  function handleSocketClose() {
    isConnected.value = false;
    isConnecting.value = false;

    if (isRecording.value && sessionId.value && websocketService.value) {
      websocketService.value.registerActiveSession(sessionId.value);
    }

    if (isRecording.value && audioWorker.value) {
      audioWorker.value.postMessage({
        action: "processAndQueue",
        isOnline: false,
      });
    }
  }

  function handleSocketError(error) {
    isConnected.value = false;
    isConnecting.value = false;
    console.error("WebSocket error", error);
  }

  function handleSocketReconnecting(info) {
    isConnecting.value = true;
  }

  function handleSocketReconnected(data) {
    if (data.activeSessions && data.activeSessions.length > 0) {
      if (isRecording.value) {
        let sessionToResume = null;

        if (sessionId.value) {
          sessionToResume = data.activeSessions.find((session) => session.id === sessionId.value);

          if (sessionToResume) {
            console.log(`Found our active recording session: ${sessionId.value}`);
          } else {
            console.log(`Our session ${sessionId.value} not found in active sessions`);
          }
        }

        if (!sessionId.value || !sessionToResume) {
          console.log("Recording was active but session lost, starting new session");
          sessionId.value = null;

          setTimeout(() => {
            if (websocketService.value && websocketService.value.isConnectionHealthy()) {
              doStartRecording(true);
            } else {
              console.warn("Connection not healthy after reconnection, buffering audio only");
            }
          }, 500);
        } else {
          websocketService.value.send("resume-session", {
            sessionId: sessionId.value,
            clientTime: new Date().toISOString(),
            requestLatestTranscript: true,
          });

          websocketService.value.registerActiveSession(sessionId.value);
        }
      } else {
        for (const reconnectedSession of data.activeSessions) {
          if (processingSession.value && processingSession.value.id === reconnectedSession.id) {
            websocketService.value.send("get-session-status", {
              sessionId: reconnectedSession.id,
            });
          }
        }
      }

      sendBufferedAudio();
    }
  }

  async function startRecording() {
    if (isRecording.value) {
      return;
    }

    sessionId.value = null;
    currentTranscription.value = "";

    if (processingSession.value) {
      processingSession.value = null;
    }

    pendingAudioChunks.value = [];

    startTimer();

    try {
      if (!isConnected.value) {
        isConnecting.value = true;

        try {
          if (websocketService.value) {
            await websocketService.value.connect();
          }
        } catch (error) {
          console.error("Failed to connect before recording:", error);
          isConnecting.value = false;
          return;
        }

        isConnecting.value = false;
      } else {
      }

      await doStartRecording();
    } catch (error) {
      console.error("Error in startRecording:", error);
      isConnecting.value = false;
    }
  }

  async function doStartRecording(isResumption = false) {
    try {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        micPermissionGranted.value = false;
        return;
      }

      if (!websocketService.value) {
        websocketService.value = getWebSocketService();
      }

      const clientIdentityManager = getClientIdentityManager();
      console.log(
        `Starting${
          isResumption ? " resumed" : ""
        } recording with client ID: ${clientIdentityManager.getClientId()}`,
      );

      currentMimeType.value = await startAudioCapture({
        onDataAvailable: handleAudioData,
        timesliceMilliseconds: 4000,
      });

      micPermissionGranted.value = true;

      if (!isResumption) {
        isRecording.value = true;
        recordingStartTime.value = Date.now();
      }

      if (websocketService.value && isConnected.value) {
        websocketService.value.send("start-session", {
          metadata: {
            clientTime: new Date().toISOString(),
            userAgent: navigator.userAgent,
            mimeType: currentMimeType.value,
            isResumption: isResumption,
          },
        });
      } else {
        console.warn("WebSocket not connected, recording locally only");
      }
    } catch (error) {
      console.error("Error in doStartRecording:", error);
      micPermissionGranted.value = false;
    }
  }

  async function stopRecording() {
    if (!isRecording.value) return;

    const sessionToEnd = sessionId.value;
    const endTime = Date.now();

    const finalTranscript = currentTranscription.value;
    console.log(`Final transcript length: ${finalTranscript.length}`);

    try {
      stopAudioCapture();
      console.log("Final audio capture stopped");
    } catch (e) {
      console.error("Error stopping audio capture:", e);
    }

    isRecording.value = false;

    const wsIsHealthy =
      websocketService.value &&
      websocketService.value.isConnectionHealthy &&
      websocketService.value.isConnectionHealthy();

    console.log(
      `WebSocket health check before stopping recording: ${wsIsHealthy ? "HEALTHY" : "UNHEALTHY"}`,
    );

    processingSession.value = {
      id: sessionToEnd,
      startTime: recordingStartTime.value,
      endTime: endTime,
      status: "processing",
      transcription: finalTranscript,
      progress: 10,
    };

    if (!sessionPollingIntervals.value) {
      sessionPollingIntervals.value = {};
    }

    updateSessionInIndexedDB({
      id: sessionToEnd,
      startTime: recordingStartTime.value,
      endTime: endTime,
      status: "processing",
      transcription: finalTranscript,
    });

    setTimeout(async () => {
      stopAudioCapture();
      stopTimer();

      let endSuccess = false;

      if (wsIsHealthy && sessionToEnd) {
        const messageHandler = (data) => {
          if (data.sessionId === sessionToEnd) {
            if (data.type === "processing-status") {
              console.log(`Processing status update: ${data.status}, progress: ${data.progress}`);
              if (processingSession.value && processingSession.value.id === sessionToEnd) {
                processingSession.value.progress = data.progress;
                processingSession.value.status = data.status;

                if (data.message) {
                  processingSession.value.message = data.message;
                }
              }
            } else if (data.type === "medical-note") {
              console.log(`Received medical note: ${data.note.length} chars`);
              if (processingSession.value && processingSession.value.id === sessionToEnd) {
                processingSession.value.medicalNote = data.note;
              }
            } else if (data.type === "processing-heartbeat") {
              console.log(
                `Received processing heartbeat at ${new Date(data.timestamp).toISOString()}`,
              );
              if (processingSession.value && processingSession.value.id === sessionToEnd) {
                processingSession.value.lastHeartbeat = data.timestamp;
              }
            }
          }
        };

        if (websocketService.value) {
          websocketService.value.on("message", messageHandler);
        }

        try {
          console.log("Attempting to finalize session via WebSocket");

          const finalizationPromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              console.log("Finalization timeout exceeded");
              resolve(false);
            }, 60000);

            const checkInterval = setInterval(() => {
              if (processingSession.value && processingSession.value.id === sessionToEnd) {
                if (processingSession.value.status === "completed") {
                  console.log("Detected completed status through status updates");
                  clearTimeout(timeoutId);
                  clearInterval(checkInterval);
                  resolve(true);
                } else if (processingSession.value.medicalNote) {
                  console.log("Detected medical note received");
                  clearTimeout(timeoutId);
                  clearInterval(checkInterval);
                  resolve(true);
                }
              }
            }, 1000);

            const endedHandler = (data) => {
              if (data.type === "session-ended" && data.sessionId === sessionToEnd) {
                console.log("Detected session-ended event");
                clearTimeout(timeoutId);
                clearInterval(checkInterval);
                websocketService.value.off("message", endedHandler);
                resolve(true);
              }
            };

            if (websocketService.value) {
              websocketService.value.on("message", endedHandler);
            }
          });

          console.log("Sending end-session request");
          const sendSuccess = websocketService.value.send("end-session", {
            sessionId: sessionToEnd,
          });

          if (sendSuccess) {
            console.log("Successfully sent end-session request");
            endSuccess = await finalizationPromise;

            websocketService.value.off("message", messageHandler);
          }

          if (endSuccess) {
            console.log("Successfully finalized session via WebSocket");
            websocketService.value.unregisterActiveSession(sessionToEnd);
          } else {
            console.log("WebSocket finalization timed out, will use HTTP fallback");
          }
        } catch (error) {
          console.error("Error during WebSocket finalization:", error);
          endSuccess = false;

          if (websocketService.value) {
            websocketService.value.off("message", messageHandler);
          }
        }
      } else {
        console.log(
          "WebSocket not healthy or invalid session ID, will use HTTP fallback immediately",
        );
      }

      if (!endSuccess && sessionToEnd) {
        console.log(`Starting HTTP polling for failed WebSocket finalization of ${sessionToEnd}`);
        checkSessionStatusViaHTTP(sessionToEnd);
      }

      if (sessionToEnd) {
        updateSessionInIndexedDB({
          id: sessionToEnd,
          startTime: recordingStartTime.value,
          endTime: endTime,
          status: endSuccess ? "processing" : "pending_completion",
          transcription: finalTranscript,
          pendingFinalization: !endSuccess,
          lastEndAttempt: Date.now(),
        });
      }

      if (!endSuccess && processingSession.value) {
        processingSession.value.status = "pending_completion";
        processingSession.value.pendingFinalization = true;
      }

      currentTranscription.value = "";
      recordingStartTime.value = null;
      sessionId.value = null;
    }, 500);
  }

  function toggleRecording() {
    console.log("Store toggleRecording function called");
    try {
      if (isRecording.value) {
        stopRecording();
      } else {
        startRecording();
      }
    } catch (error) {
      console.error("Error in toggleRecording:", error);
    }
  }

  function handleAudioData(audioBlob) {
    if (!audioBlob) {
      console.warn("Received undefined audioBlob, ignoring");
      return;
    }

    if (!(audioBlob instanceof Blob)) {
      console.error(`Invalid audioBlob type: ${typeof audioBlob}`);
      return;
    }

    if (audioBlob.size === 0) {
      console.warn("Received empty audio blob, ignoring");
      return;
    }

    audioChunkSequence++;

    if (!sessionId.value) {
      pendingAudioChunks.value.push({
        audioBlob,
        mimeType: currentMimeType.value,
        timestamp: Date.now(),
        sequenceNumber: audioChunkSequence,
      });
      return;
    }

    if (!audioWorker.value) {
      console.error("Audio worker not initialized, attempting to initialize");
      pendingAudioChunks.value.push({
        audioBlob,
        mimeType: currentMimeType.value,
        timestamp: Date.now(),
        sequenceNumber: audioChunkSequence,
      });

      initializeAudioWorker().then(() => {
        processBufferedChunks();
      });
      return;
    }

    audioWorker.value.postMessage({
      action: "processAndQueue",
      audioBlob,
      sessionId: sessionId.value,
      mimeType: currentMimeType.value,
      isOnline: isConnected.value,
      sequenceNumber: audioChunkSequence,
    });
  }

  function processAudioChunk(chunk) {
    if (!audioWorker.value || !sessionId.value) return;

    audioWorker.value.postMessage({
      action: "processAndQueue",
      audioBlob: chunk.audioBlob,
      sessionId: sessionId.value,
      mimeType: chunk.mimeType,
      timestamp: chunk.timestamp,
      isOnline: isConnected.value,
    });
  }

  function handleWebSocketMessage(data) {
    switch (data.type) {
      case "session-created":
        console.log(`Session created with ID: ${data.sessionId}`);
        sessionId.value = data.sessionId;
        isRecording.value = true;

        if (pendingAudioChunks.value.length > 0) {
          console.log(`Processing ${pendingAudioChunks.value.length} buffered audio chunks`);

          if (!audioWorker.value) {
            console.error("Audio worker not available, reinitializing...");
            initializeAudioWorker().then(() => {
              processBufferedChunks();
            });
          } else {
            processBufferedChunks();
          }
        }
        break;

      case "transcription-update":
        if (data.sessionId === sessionId.value) {
          if (data.fullTranscript && data.fullTranscript.trim() !== "") {
            currentTranscription.value = data.fullTranscript;
            saveTranscriptToIndexedDB(data.sessionId, data.fullTranscript);
          }
        }
        break;

      case "processing-status":
        if (processingSession.value && processingSession.value.id === data.sessionId) {
          console.log(
            `Processing status update for ${data.sessionId}: ${data.status}, progress: ${data.progress}`,
          );
          processingSession.value.progress = data.progress;
          processingSession.value.status = data.status;

          if (data.message) {
            processingSession.value.message = data.message;
          }

          if (data.status === "completed") {
            console.log(`Session ${data.sessionId} marked as completed from processing-status`);
            updateSessionInIndexedDB({
              id: data.sessionId,
              status: "completed",
              pendingFinalization: false,
            });
          }
        }
        break;

      case "processing-heartbeat":
        if (processingSession.value && processingSession.value.id === data.sessionId) {
          console.log(`Received processing heartbeat at ${new Date(data.timestamp).toISOString()}`);
          processingSession.value.lastHeartbeat = data.timestamp;

          processingSession.value.lastServerContact = Date.now();
        }
        break;

      case "medical-note":
        if (processingSession.value && processingSession.value.id === data.sessionId) {
          console.log("RECEIVED MEDICAL NOTE:", {
            sessionId: data.sessionId,
            noteLength: data.note ? data.note.length : 0,
            notePreview: data.note ? data.note.substring(0, 100) + "..." : "EMPTY NOTE",
            processing: processingSession.value ? JSON.stringify(processingSession.value) : "null",
          });

          processingSession.value.medicalNote = data.note;

          processingSession.value = { ...processingSession.value };

          updateSessionHistory({
            id: data.sessionId,
            medicalNote: data.note,

            ...processingSession.value,
          });

          const sessionInHistory = sessionsHistory.value.find((s) => s.id === data.sessionId);
          console.log("SESSION IN HISTORY AFTER UPDATE:", {
            found: !!sessionInHistory,
            hasNote: sessionInHistory ? !!sessionInHistory.medicalNote : false,
            noteLength: sessionInHistory?.medicalNote?.length || 0,
          });

          updateSessionInIndexedDB({
            id: data.sessionId,
            medicalNote: data.note,
          });
        }
        break;

      case "session-ended":
        console.log(`Received session-ended event for session ${data.sessionId}`);
        if (processingSession.value && processingSession.value.id === data.sessionId) {
          const normalizedStatus = data.status === "complete" ? "completed" : data.status;
          processingSession.value.status = normalizedStatus;

          updateSessionInIndexedDB({
            id: data.sessionId,
            status: normalizedStatus,
            pendingFinalization: false,
          });

          if (normalizedStatus === "completed") {
            checkAndCleanupSessionChunks(data.sessionId);
          }

          if (
            normalizedStatus === "completed" &&
            !sessionsHistory.value.some((s) => s.id === data.sessionId)
          ) {
            updateSessionHistory({
              id: data.sessionId,
              startTime: processingSession.value.startTime,
              endTime: processingSession.value.endTime,
              transcription: processingSession.value.transcription,
              medicalNote: processingSession.value.medicalNote,
              status: "completed",
              isExpanded: false,
            });

            console.log("CREATED NEW SESSION HISTORY ENTRY:", {
              id: data.sessionId,
              hasNote: !!processingSession.value.medicalNote,
              noteLength: processingSession.value.medicalNote?.length || 0,
            });
          }

          if (normalizedStatus === "completed" || normalizedStatus === "error") {
            console.log(`Clearing processing session for ${data.sessionId}`);
            setTimeout(() => {
              if (processingSession.value && processingSession.value.id === data.sessionId) {
                const finalSession = { ...processingSession.value };
                console.log("FINAL SESSION BEFORE CLEARING:", {
                  id: finalSession.id,
                  status: finalSession.status,
                  hasNote: !!finalSession.medicalNote,
                  noteLength: finalSession.medicalNote?.length || 0,
                });

                processingSession.value = null;
              }
            }, 2000);
          }
        }
        break;

      case "session-resumed":
        if (sessionId.value === data.sessionId && data.transcript) {
          currentTranscription.value = data.transcript;
        }
        break;

      case "session-pending-completion":
        if (data.sessionId) {
          console.log(`Session ${data.sessionId} is pending completion`);

          if (processingSession.value && processingSession.value.id === data.sessionId) {
            processingSession.value.status = "pending_completion";
            processingSession.value.pendingFinalization = true;
          }

          updateSessionInIndexedDB({
            id: data.sessionId,
            status: "pending_completion",
            pendingFinalization: true,
            lastEndAttempt: Date.now(),
          });

          if (sessionId.value === data.sessionId) {
            console.log("Active session needs completion, attempting to resume and finalize");
            if (websocketService.value) {
              websocketService.value.send("resume-session", {
                sessionId: data.sessionId,
                clientTime: new Date().toISOString(),
              });

              setTimeout(() => {
                websocketService.value.send("end-session", {
                  sessionId: data.sessionId,
                });
              }, 2000);
            }
          }
        }
        break;

      case "reconnection-info":
        console.log("Received reconnection info:", data);
        if (data.activeSessions && data.activeSessions.length > 0) {
          data.activeSessions.forEach((session) => {
            if (isRecording.value && !sessionId.value) {
              sessionId.value = session.id;
              console.log(`Restored recording session ID: ${sessionId.value}`);
            }

            if (
              session.status === "processing" &&
              (!processingSession.value || processingSession.value.id !== session.id)
            ) {
              processingSession.value = {
                id: session.id,
                status: "processing",
                progress: 50,
                startTime: session.startTime || Date.now() - 60000,
                lastHeartbeat: Date.now(),
              };
            }
          });
        }
        break;

      case "chunk-ack":
        if (audioWorker.value) {
          audioWorker.value.postMessage({
            action: "chunkAcknowledged",
            sessionId: data.sessionId,
            chunkId: data.chunkId,
            sequenceNumber: data.sequenceNumber,
          });
        }
        break;

      case "keep-alive-response":
        break;

      case "app-ping":
        break;

      case "error":
        console.error("Server error:", data.message);

        if (
          data.sessionId &&
          processingSession.value &&
          processingSession.value.id === data.sessionId
        ) {
          processingSession.value.status = "error";
          processingSession.value.error = data.message;

          updateSessionInIndexedDB({
            id: data.sessionId,
            status: "error",
            error: data.message,
          });
        }
        break;

      default:
        console.log(`Unhandled message type: ${data.type}`, data);
        break;
    }
  }

  function handleWorkerMessage(event) {
    const {
      type,
      base64Audio,
      mimeType,
      sessionId: audioSessionId,
      id,
      count,
      error,
      sessions,
      transcript,
      usage,
      allAcknowledged,
    } = event.data;

    switch (type) {
      case "chunkReadyForSending":
        if (isConnected.value && websocketService.value) {
          const success = websocketService.value.send("audio-chunk", {
            sessionId: audioSessionId,
            audio: base64Audio,
            mimeType,
          });

          if (success && id !== null && audioWorker.value) {
            audioWorker.value.postMessage({
              action: "chunkSuccessfullySent",
              id,
              sessionId: audioSessionId,
            });
          }
        } else {
          console.log(`Not sending audio chunk because WebSocket is not connected`);
        }
        break;

      case "bufferUpdate":
        bufferedChunkCount.value = count;
        break;

      case "error":
        console.error("Worker error:", error);
        break;

      case "sessionsRetrieved":
        if (sessions && Array.isArray(sessions)) {
          sessionsHistory.value = sessions;
        }
        break;

      case "transcriptRetrieved":
        if (transcript && audioSessionId) {
          const sessionIndex = sessionsHistory.value.findIndex((s) => s.id === audioSessionId);
          if (sessionIndex >= 0) {
            sessionsHistory.value[sessionIndex].transcription = transcript;
          }
        }
        break;

      case "chunksAcknowledgedStatus":
        if (allAcknowledged && audioSessionId) {
          cleanupSessionChunks(audioSessionId);
        } else if (audioSessionId) {
          console.warn(
            `Not all chunks for session ${audioSessionId} acknowledged, deferring cleanup`,
          );

          setTimeout(() => {
            checkAndCleanupSessionChunks(audioSessionId);
          }, 30000);
        }
        break;

      case "cleanupCompleted":
        loadSessionsFromIndexedDB();
        break;

      case "storageUsage":
        storageUsage.value = usage;

        if (usage && usage.totalSize > 50 * 1024 * 1024) {
          runAutomaticCleanup();
        }
        break;

      case "automaticCleanupCompleted":
        isCleanupInProgress.value = false;
        checkStorageUsage();
        break;
    }
  }

  function checkAndCleanupSessionChunks(sessionId) {
    if (audioWorker.value) {
      audioWorker.value.postMessage({
        action: "checkAllChunksAcknowledged",
        sessionId: sessionId,
      });
    }
  }

  async function checkPendingCompletionSessions() {
    if (!audioWorker.value || !isConnected.value) return;

    try {
      const pendingSessions = await getPendingSessions();

      for (const session of pendingSessions) {
        if (session.status === "pending_completion") {
          websocketService.value.send("resume-session", {
            sessionId: session.id,
            clientTime: new Date().toISOString(),
          });

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const endSuccess = websocketService.value.send("end-session", {
          sessionId: session.id,
        });

        if (endSuccess) {
          updateSessionInIndexedDB({
            id: session.id,
            status: "processing",
            pendingFinalization: false,
          });
        }
      }
    } catch (error) {
      console.error("Error checking for pending sessions:", error);
    }
  }

  function processBufferedChunks() {
    if (!sessionId.value || !audioWorker.value || pendingAudioChunks.value.length === 0) {
      return;
    }

    pendingAudioChunks.value.sort((a, b) => a.timestamp - b.timestamp);

    const BATCH_SIZE = 5;
    const processBatch = () => {
      const batch = pendingAudioChunks.value.splice(
        0,
        Math.min(BATCH_SIZE, pendingAudioChunks.value.length),
      );

      batch.forEach((chunk) => {
        processAudioChunk(chunk);
      });

      if (pendingAudioChunks.value.length > 0) {
        setTimeout(processBatch, 1000);
      }
    };

    processBatch();
  }

  function getPendingSessions() {
    return new Promise((resolve, reject) => {
      if (!audioWorker.value) {
        reject("Worker not initialized");
        return;
      }

      const messageHandler = (event) => {
        if (event.data.type === "pendingSessionsRetrieved") {
          audioWorker.value.removeEventListener("message", messageHandler);
          resolve(event.data.sessions || []);
        }
      };

      audioWorker.value.addEventListener("message", messageHandler);

      try {
        audioWorker.value.postMessage({
          action: "getPendingSessions",
        });
      } catch (error) {
        audioWorker.value.removeEventListener("message", messageHandler);
        reject(error);
      }
    });
  }

  async function recoverStaleSessions() {
    if (!audioWorker.value) return;

    try {
      audioWorker.value.postMessage({
        action: "getSessions",
        status: null,
      });

      const messageHandler = (event) => {
        if (event.data.type === "sessionsRetrieved") {
          audioWorker.value.removeEventListener("message", messageHandler);

          const sessions = event.data.sessions || [];
          const staleSessions = sessions.filter(
            (s) => s.status === "processing" && s.endTime && Date.now() - s.endTime > 5 * 60 * 1000,
          );

          staleSessions.forEach((session) => {
            updateSessionInIndexedDB({
              id: session.id,
              status: "completed",
              pendingFinalization: false,
              forceClosed: true,
              lastUpdated: Date.now(),
            });

            if (!sessionsHistory.value.some((s) => s.id === session.id)) {
              updateSessionHistory({
                ...session,
                status: "completed",
                isExpanded: false,
              });
            }
          });
        }
      };

      audioWorker.value.addEventListener("message", messageHandler);
    } catch (error) {
      console.error("Error checking for stale sessions:", error);
    }
  }

  function updateSessionInIndexedDB(session) {
    if (!audioWorker.value) return;

    try {
      const existingSessionIndex = sessionsHistory.value.findIndex((s) => s.id === session.id);

      let combinedSession = { ...session };

      if (existingSessionIndex >= 0) {
        combinedSession = {
          ...sessionsHistory.value[existingSessionIndex],
          ...session,
          lastUpdated: Date.now(),
          lastConnectionState: isConnected.value ? "connected" : "disconnected",
        };
      }

      audioWorker.value.postMessage({
        action: "updateSession",
        sessionInfo: combinedSession,
      });

      if (session.transcription && session.transcription.length > 0) {
        saveTranscriptToIndexedDB(session.id, session.transcription);
      }
    } catch (error) {
      console.error("Error updating session in IndexedDB:", error);
    }
  }

  function updateSessionHistory(session) {
    const index = sessionsHistory.value.findIndex((s) => s.id === session.id);

    if (index >= 0) {
      sessionsHistory.value[index] = {
        ...sessionsHistory.value[index],
        ...session,
      };
    } else {
      sessionsHistory.value.unshift(session);
    }

    updateSessionInIndexedDB(session);
  }

  function toggleSessionDetails(sessionId) {
    const index = sessionsHistory.value.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      const updated = {
        ...sessionsHistory.value[index],
        isExpanded: !sessionsHistory.value[index].isExpanded,
      };
      sessionsHistory.value[index] = updated;
      updateSessionInIndexedDB(updated);
    }
  }

  function deleteSession(sessionId) {
    cleanupSessionResources(sessionId);

    websocketService.value.send("delete-session", {
      sessionId,
    });

    const index = sessionsHistory.value.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      sessionsHistory.value.splice(index, 1);
    }

    if (audioWorker.value) {
      audioWorker.value.postMessage({
        action: "deleteSession",
        sessionId,
      });
    }
  }

  function saveTranscriptToIndexedDB(sessionId, transcriptText) {
    if (!audioWorker.value) return;

    audioWorker.value.postMessage({
      action: "saveTranscript",
      sessionId,
      transcriptText,
    });
  }

  function loadTranscriptForSession(sessionId) {
    if (!audioWorker.value) {
      return Promise.resolve("");
    }

    return new Promise((resolve) => {
      const messageHandler = (event) => {
        if (event.data.type === "transcriptRetrieved" && event.data.sessionId === sessionId) {
          audioWorker.value.removeEventListener("message", messageHandler);
          resolve(event.data.transcript || "");
        }
      };

      audioWorker.value.addEventListener("message", messageHandler);

      try {
        audioWorker.value.postMessage({
          action: "getTranscript",
          sessionId,
        });
      } catch (error) {
        console.error("Error requesting transcript from worker:", error);
        audioWorker.value.removeEventListener("message", messageHandler);
        resolve("");
      }
    });
  }

  async function loadSessionsFromIndexedDB() {
    if (!audioWorker.value) return;

    return new Promise((resolve) => {
      const messageHandler = (event) => {
        if (event.data.type === "sessionsRetrieved") {
          audioWorker.value.removeEventListener("message", messageHandler);

          if (event.data.sessions && Array.isArray(event.data.sessions)) {
            sessionsHistory.value = event.data.sessions;

            debugSessions();
          }

          resolve(sessionsHistory.value);
        }
      };

      audioWorker.value.addEventListener("message", messageHandler);

      audioWorker.value.postMessage({
        action: "getSessions",
      });
    });
  }

  function sendBufferedAudio(specificSessionId = null) {
    if (!audioWorker.value || !isConnected.value) return;

    try {
      audioWorker.value.postMessage({
        action: "sendBufferedData",
        sessionId: specificSessionId || sessionId.value || "all",
      });
    } catch (error) {
      console.error("Error sending message to worker:", error);
      reconnectFailureCount++;
    }
  }

  function checkStorageUsage() {
    if (!audioWorker.value) return;

    audioWorker.value.postMessage({
      action: "getStorageUsage",
    });
  }

  function runAutomaticCleanup(thresholdMB = 50) {
    if (!audioWorker.value || isCleanupInProgress.value) return;

    isCleanupInProgress.value = true;

    audioWorker.value.postMessage({
      action: "performAutomaticCleanup",
      thresholdMB,
    });
  }

  function cleanupSessionResources(sessionId) {
    if (!sessionId) return;

    if (processingSession.value && processingSession.value.id === sessionId) {
      if (processingSession.value.audioUrl) {
        revokeTrackedBlobUrl(processingSession.value.audioUrl);
        processingSession.value.audioUrl = null;
      }
    }

    if (audioWorker.value) {
      audioWorker.value.postMessage({
        action: "cleanupOrphanedChunks",
      });
    }
  }

  async function cleanupSessionChunks(sessionId) {
    if (!audioWorker.value) return;

    try {
      audioWorker.value.postMessage({
        action: "cleanupSessionChunks",
        sessionId: sessionId,
      });
    } catch (error) {
      console.error(`Error requesting chunk cleanup for session ${sessionId}:`, error);
    }
  }

  function setupKeepAliveForLongRecordings() {
    const keepAliveInterval = setInterval(() => {
      if (isRecording.value && websocketService.value) {
        if (!isConnected.value) {
          websocketService.value.connect().catch((error) => {
            console.error("Failed to reconnect during recording:", error);
          });
        } else {
          websocketService.value.send("keep-alive", {
            sessionId: sessionId.value,
            timestamp: Date.now(),
          });
        }
      }
    }, 30000);

    window.addEventListener("beforeunload", () => {
      clearInterval(keepAliveInterval);
    });
  }

  function createTrackedBlobUrl(blob) {
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    createdBlobUrls.add(url);
    return url;
  }

  function revokeTrackedBlobUrl(url) {
    if (!url) return;

    if (createdBlobUrls.has(url)) {
      URL.revokeObjectURL(url);
      createdBlobUrls.delete(url);
    }
  }

  function revokeAllBlobUrls() {
    createdBlobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    createdBlobUrls.clear();
  }

  async function checkSessionStatusViaHTTP(sessionId) {
    if (!sessionId) return;

    if (sessionPollingIntervals.value && sessionPollingIntervals.value[sessionId]) {
      clearInterval(sessionPollingIntervals.value[sessionId]);
      delete sessionPollingIntervals.value[sessionId];
    }

    let consecutiveErrors = 0;
    let pollInterval = 5000;
    let maxPollAttempts = 30;
    let pollCount = 0;

    const checkStatus = async () => {
      pollCount++;

      if (window.isUnmounting || pollCount > maxPollAttempts) {
        clearInterval(sessionPollingIntervals.value[sessionId]);
        delete sessionPollingIntervals.value[sessionId];
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let baseUrl = "http://localhost:8080";
        if (websocketService.value && typeof websocketService.value._getApiBaseUrl === "function") {
          baseUrl = websocketService.value._getApiBaseUrl();
        } else if (process.env.NODE_ENV === "production") {
          baseUrl = "";
        }

        if (baseUrl.includes("/ws")) {
          baseUrl = baseUrl.substring(0, baseUrl.indexOf("/ws"));
        }

        const endpoint = `${baseUrl}/api/session-status/${sessionId}`;

        const response = await fetch(endpoint, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        consecutiveErrors = 0;

        if (response.ok) {
          const status = await response.json();

          if (status.status === "completed" || status.status === "error") {
            if (processingSession.value && processingSession.value.id === sessionId) {
              processingSession.value.status = status.status;
              processingSession.value.progress = 100;

              if (status.transcript) {
                processingSession.value.transcription = status.transcript;
              }

              if (status.note) {
                processingSession.value.medicalNote = status.note;
              } else {
                processingSession.value.medicalNote = generateFallbackNote(
                  status.transcript || processingSession.value.transcription,
                );
              }
            }

            updateSessionHistory({
              id: sessionId,
              status: status.status,
              transcription: status.transcript || "",
              medicalNote: status.note || generateFallbackNote(status.transcript),
              isExpanded: false,
              startTime: status.startTime,
              endTime: status.endTime,
            });

            clearInterval(sessionPollingIntervals.value[sessionId]);
            delete sessionPollingIntervals.value[sessionId];

            if (processingSession.value && processingSession.value.id === sessionId) {
              processingSession.value = null;
            }

            return;
          } else if (status.status === "processing") {
            if (processingSession.value && processingSession.value.id === sessionId) {
              processingSession.value.progress = status.progress || 50;
            }
          }
        } else {
          console.error(`HTTP polling received error status: ${response.status}`);
          consecutiveErrors++;
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.log(`Polling request aborted for session ${sessionId} (timeout)`);
        } else {
          console.error(`Error polling status for session ${sessionId}:`, error);
        }
        consecutiveErrors++;
      }

      if (consecutiveErrors > 3) {
        pollInterval = Math.min(pollInterval * 1.5, 15000);
        console.log(`Backing off poll interval to ${pollInterval}ms due to errors`);
      }
    };

    await checkStatus();

    const intervalId = setInterval(checkStatus, pollInterval);
    sessionPollingIntervals.value[sessionId] = intervalId;

    function generateFallbackNote(transcript) {
      return `# Medical Note (Automatically Generated)

## Transcription
${transcript || "No transcription available"}

## Summary
A summary could not be generated automatically. Please review the transcription.`;
    }

    return () => {
      if (sessionPollingIntervals.value && sessionPollingIntervals.value[sessionId]) {
        clearInterval(sessionPollingIntervals.value[sessionId]);
        delete sessionPollingIntervals.value[sessionId];
      }
    };
  }

  function cleanupPollingIntervals() {
    Object.keys(sessionPollingIntervals.value).forEach((sessionId) => {
      clearInterval(sessionPollingIntervals.value[sessionId]);
    });
    sessionPollingIntervals.value = {};
  }

  function debugSessions() {
    console.log("==== SESSION DEBUG ====");
    console.log(
      "Processing session:",
      processingSession.value
        ? {
            id: processingSession.value.id,
            status: processingSession.value.status,
            transcription: processingSession.value.transcription
              ? `${processingSession.value.transcription.substring(0, 50)}... (${
                  processingSession.value.transcription.length
                } chars)`
              : "None",
          }
        : "None",
    );

    console.log(
      "Sessions history:",
      sessionsHistory.value.map((s) => ({
        id: s.id,
        status: s.status,
        transcription: s.transcription
          ? `${s.transcription.substring(0, 50)}... (${s.transcription.length} chars)`
          : "None",
      })),
    );
    console.log("=====================");
  }

  window.addEventListener("beforeunload", revokeAllBlobUrls);

  return {
    sessionId,
    isRecording,
    isConnecting,
    isConnected,
    micPermissionGranted,
    currentTranscription,
    bufferedChunkCount,
    sessionsHistory,
    processingSession,
    audioWorker,
    sessionPollingIntervals,

    formattedDuration,

    initialize,
    startRecording,
    stopRecording,
    toggleRecording,
    sendBufferedAudio,
    deleteSession,
    toggleSessionDetails,
    saveTranscriptToIndexedDB,
    loadSessionsFromIndexedDB,
    checkStorageUsage,
    runAutomaticCleanup,
    createTrackedBlobUrl,
    revokeTrackedBlobUrl,
    revokeAllBlobUrls,
    loadTranscriptForSession,
    checkSessionStatusViaHTTP,
    cleanupPollingIntervals,
    debugSessions,
  };
});
