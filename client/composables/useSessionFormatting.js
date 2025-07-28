import { ref } from "vue";

export function useSessionFormatting() {
  function formatDate(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatDuration(startTime, endTime) {
    if (!startTime || !endTime) return "";

    const durationMs = endTime - startTime;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  function formatReasons(reasons) {
    if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
      return "Non spécifié";
    }

    return reasons.join(", ");
  }

  function truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength) + "...";
  }

  function parseMedicalNote(noteText) {
    console.log("Starting to parse medical note, length:", noteText?.length || 0);

    if (!noteText) return [];

    const cleanedText = noteText
      .replace(/<\|start_header_id\|>assistant<\|end_header_id\|>/g, "")
      .replace(/<\|eot_id\|>/g, "")
      .trim();

    const lines = cleanedText.split("\n").filter((line) => line.trim());

    const sections = [];
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      const isHeader =
        (line === line.toUpperCase() && line.length > 3) ||
        (line.length < 30 && i < lines.length - 1 && !lines[i + 1].trim()) ||
        /^(RAISON|HISTOIRE|EXAMEN|PLAN|Suivi|Raison|Formulaire)/i.test(line);

      if (isHeader) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push(currentSection);
        }

        currentSection = {
          title: line,
          content: [],
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        currentSection = {
          title: "Note",
          content: [line],
        };
      }
    }

    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    if (sections.length === 0 && cleanedText) {
      sections.push({
        title: "Note Médicale",
        content: cleanedText.split("\n").filter((line) => line.trim()),
      });
    }

    console.log(
      "Parsed sections:",
      sections.map((s) => s.title),
    );
    return sections;
  }

  return {
    formatTime,
    formatDate,
    formatDuration,
    formatReasons,
    truncateText,
    parseMedicalNote,
  };
}
