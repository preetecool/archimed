import { useRecordingStore } from "~/stores/modules/recording";
import { useToast } from "~/composables/useToast";

export function useSessionManagement() {
  const store = useRecordingStore();
  const { showSuccess, showError } = useToast();

  function toggleSessionDetails(sessionId) {
    store.toggleSessionDetails(sessionId);
  }

  function deleteSession(sessionId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette session ?")) {
      store.deleteSession(sessionId);
    }
  }

  function copyNote(session) {
    if (session.medicalNote) {
      navigator.clipboard
        .writeText(session.medicalNote)
        .then(() => {
          showSuccess("Note médicale copiée");
        })
        .catch((err) => {
          console.error("Erreur lors de la copie de la note:", err);
          showError("Erreur lors de la copie de la note");
        });
    }
  }

  return {
    toggleSessionDetails,
    deleteSession,
    copyNote,
  };
}
