<template>
    <div class="medical-note-content">
        <div class="parsed-sections">
            <div v-for="(section, index) in parsedSections" :key="index" class="note-section">
                <h5 class="note-section-title">{{ section.title }}</h5>
                <div class="note-section-content">
                    <p
                        v-for="(line, lineIndex) in section.content"
                        :key="`${index}-${lineIndex}`"
                        class="note-line"
                    >
                        {{ line }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useSessionFormatting } from "~/composables/useSessionFormatting";

const props = defineProps({
    noteText: {
        type: String,
        required: true,
        default: "",
    },
});

const showDebug = ref(process.env.NODE_ENV !== "production");
const showRawView = ref(false);

const toggleRawView = () => {
    showRawView.value = !showRawView.value;
};

const { parseMedicalNote } = useSessionFormatting();

const cleanedNoteText = computed(() => {
    if (!props.noteText) return "";

    return props.noteText
        .replace(/<\|start_header_id\|>assistant<\|end_header_id\|>/g, "")
        .replace(/<\|eot_id\|>/g, "")
        .trim();
});

const parsedSections = computed(() => {
    if (!props.noteText) {
        console.warn("MedicalNoteDisplay: No note text provided");
        return [];
    }

    console.log("Parsing medical note with length:", props.noteText.length);
    const sections = parseMedicalNote(props.noteText);
    console.log(
        "Found sections:",
        sections.map((s) => s.title),
    );

    return sections;
});
</script>

<style scoped>
.medical-note-content {
    padding: 10px;
    font-size: 0.9rem;
}

.note-section {
    margin-bottom: 16px;
}

.note-section-title {
    font-weight: 600;
    color: #334155;
    margin-bottom: 8px;
    font-size: 1rem;
}

.note-section-content {
    color: #475569;
}

.note-line {
    margin: 5px 0;
    line-height: 1.5;
}

.raw-note {
    white-space: pre-wrap;
    font-family: monospace;
    background-color: #f8f9fa;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
    font-size: 0.85rem;
    line-height: 1.4;
}

.raw-note pre {
    margin: 0;
    white-space: pre-wrap;
}

.debug-info {
    background-color: #fff3cd;
    padding: 8px;
    margin-bottom: 10px;
    border: 1px dashed #ffc107;
    border-radius: 4px;
    font-size: 0.8rem;
}

.debug-button {
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    margin-bottom: 8px;
    cursor: pointer;
    font-size: 0.8rem;
}

.debug-button:hover {
    background-color: #5a6268;
}
</style>
