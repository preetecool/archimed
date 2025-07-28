import { storeToRefs } from "pinia";
import { useRecordingStore } from "~/stores/modules/recording";

export function useRecording() {
  const store = useRecordingStore();

  const {
    isRecording,
    isConnected,
    isConnecting,
    micPermissionGranted,
    currentTranscription,
    formattedDuration,
    bufferedChunkCount,
    sessionsHistory,
    processingSession,
    audioWorker,
  } = storeToRefs(store);

  return {
    isRecording,
    isConnected,
    isConnecting,
    micPermissionGranted,
    currentTranscription,
    formattedDuration,
    bufferedChunkCount,
    sessionsHistory,
    processingSession,
    audioWorker,

    initialize: store.initialize,
    toggleRecording: store.toggleRecording,
    toggleSessionDetails: store.toggleSessionDetails,
    deleteSession: store.deleteSession,
    runAutomaticCleanup: store.runAutomaticCleanup,
    checkStorageUsage: store.checkStorageUsage,
    revokeAllBlobUrls: store.revokeAllBlobUrls,
    startRecording: store.startRecording,
    stopRecording: store.stopRecording,
    cleanupPollingIntervals: store.cleanupPollingIntervals,
  };
}
