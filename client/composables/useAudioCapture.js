import { ref } from "vue";

export function useAudioCapture() {
  const isMicPermissionGranted = ref(false);
  const isCapturingAudio = ref(false);
  const mediaStream = ref(null);
  const mediaRecorder = ref(null);

  const getSupportedMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "audio/webm";
  };

  const startAudioCapture = async (options = {}) => {
    if (isCapturingAudio.value) return;

    const { onDataAvailable, timesliceMilliseconds = 4000 } = options;

    console.log("Starting audio capture with options:", {
      hasCallback: !!onDataAvailable,
      timesliceMilliseconds,
    });

    try {
      console.log("Requesting microphone access...");
      mediaStream.value = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      console.log("Microphone access granted");

      isMicPermissionGranted.value = true;

      const mimeType = getSupportedMimeType();
      console.log(`Using MIME type: ${mimeType}`);

      console.log("Creating MediaRecorder...");
      mediaRecorder.value = new MediaRecorder(mediaStream.value, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      console.log("Setting up ondataavailable handler...");
      mediaRecorder.value.ondataavailable = (event) => {
        console.log(`MediaRecorder ondataavailable triggered: ${event.data.size} bytes`);
        if (event.data.size > 0 && onDataAvailable) {
          console.log("Calling onDataAvailable callback");
          onDataAvailable(event.data);
        } else {
          console.log(
            `Skipping callback: data size = ${event.data.size}, hasCallback = ${!!onDataAvailable}`,
          );
        }
      };

      console.log(`Starting MediaRecorder with timeslice: ${timesliceMilliseconds}ms`);
      mediaRecorder.value.start(timesliceMilliseconds);

      mediaRecorder.value.onstart = () => console.log("MediaRecorder.onstart fired");
      mediaRecorder.value.onstop = () => console.log("MediaRecorder.onstop fired");
      mediaRecorder.value.onerror = (e) => console.error("MediaRecorder.onerror fired", e);

      isCapturingAudio.value = true;

      return mimeType;
    } catch (error) {
      console.error("Error in startAudioCapture:", error);
      isMicPermissionGranted.value = false;
      throw error;
    }
  };

  const stopAudioCapture = () => {
    if (!isCapturingAudio.value || !mediaRecorder.value) return;

    try {
      mediaRecorder.value.requestData();

      setTimeout(() => {
        mediaRecorder.value.stop();

        if (mediaStream.value) {
          mediaStream.value.getTracks().forEach((track) => track.stop());
          mediaStream.value = null;
        }

        mediaRecorder.value = null;
        isCapturingAudio.value = false;
      }, 100);
    } catch (error) {
      console.error("Error stopping audio capture:", error);
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isMicPermissionGranted.value = true;
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      isMicPermissionGranted.value = false;
      return false;
    }
  };

  return {
    isMicPermissionGranted,
    isCapturingAudio,
    startAudioCapture,
    stopAudioCapture,
    checkMicrophonePermission,
    mediaRecorder,
  };
}
