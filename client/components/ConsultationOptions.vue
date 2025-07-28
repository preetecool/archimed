<template>
    <div class="consultation-options">
        <div class="options-header">
            <h3>Raisons de consultation</h3>
            <div class="selection-count" v-if="localSelectedReasons.length > 0">
                {{ localSelectedReasons.length }} sélectionné(s)
            </div>
        </div>

        <div class="search-container">
            <div class="search-input-container">
                <span class="search-icon"><Search size="16" /></span>
                <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="Rechercher des raisons de consultation..."
                    @focus="showDropdown = true"
                    @keydown.down.prevent="navigateDropdown('down')"
                    @keydown.up.prevent="navigateDropdown('up')"
                    @keydown.enter.prevent="selectHighlighted"
                    @keydown.esc="showDropdown = false"
                    class="search-input"
                />
                <button class="dropdown-toggle" @click="showDropdown = !showDropdown" type="button">
                    <span class="toggle-icon">{{ showDropdown ? "▲" : "▼" }}</span>
                </button>
            </div>

            <div v-if="localSelectedReasons.length > 0" class="selected-tags">
                <div
                    v-for="reason in localSelectedReasons"
                    :key="reason"
                    class="tag"
                    :title="formatReason(reason)"
                >
                    <span class="tag-label">{{ formatReason(reason) }}</span>
                    <button @click="removeReason(reason)" class="tag-remove" aria-label="Supprimer">
                        ×
                    </button>
                </div>
            </div>

            <div v-if="showDropdown" class="dropdown-menu" ref="dropdownMenu">
                <div class="dropdown-header">
                    <span>{{ filteredReasons.length }} raison(s) trouvée(s)</span>
                </div>

                <div class="dropdown-content">
                    <div
                        v-for="(reason, index) in filteredReasons"
                        :key="reason"
                        class="dropdown-item"
                        :class="{
                            highlighted: highlightedIndex === index,
                            selected: isReasonSelected(reason),
                        }"
                        @click="toggleReason(reason)"
                        @mouseover="highlightedIndex = index"
                    >
                        <span
                            class="checkbox"
                            :class="{ checked: isReasonSelected(reason) }"
                        ></span>
                        <span class="reason-label">{{ formatReason(reason) }}</span>
                    </div>

                    <div v-if="filteredReasons.length === 0" class="no-results">
                        Aucun résultat trouvé pour "{{ searchQuery }}"
                    </div>
                </div>

                <div v-if="localSelectedReasons.length > 0" class="dropdown-footer">
                    <button class="clear-all-btn" @click="clearAllReasons">Tout effacer</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Search } from "lucide-vue-next";
const props = defineProps({
    selectedReasons: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["update:selectedReasons"]);

const localSelectedReasons = ref([...props.selectedReasons]);
const availableReasons = ref([]);
const searchQuery = ref("");
const showDropdown = ref(false);
const highlightedIndex = ref(0);
const dropdownMenu = ref(null);

const handleClickOutside = (event) => {
    const dropdownEl = document.querySelector(".search-container");
    if (dropdownEl && !dropdownEl.contains(event.target)) {
        showDropdown.value = false;
    }
};

onMounted(() => {
    try {
        availableReasons.value = [
            "adenopathies",
            "anxiete",
            "bilan de sante",
            "diabete",
            "diarhee",
            "doleur abdo",
            "doleur epaule",
            "doleur epigasrique",
            "doleur gorge",
            "doleux msk",
            "doleur oreille",
            "drs",
            "dysphagia",
            "dyspnee",
            "fatigue",
            "hta",
            "insomnie",
            "lession cutanee",
            "lombalgie",
            "mentruation",
            "plaie",
            "psy",
            "rectoragie",
            "tdah",
            "tel - resultat",
            "toux",
        ].sort();
    } catch (error) {
        console.error("Failed to fetch consultation reasons:", error);
    }

    document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
});

const formatReason = (reason) => {
    return reason
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

const filteredReasons = computed(() => {
    if (!searchQuery.value) return availableReasons.value;

    const query = searchQuery.value.toLowerCase();
    return availableReasons.value.filter((reason) =>
        formatReason(reason).toLowerCase().includes(query),
    );
});

const isReasonSelected = (reason) => {
    return localSelectedReasons.value.includes(reason);
};

const toggleReason = (reason) => {
    if (isReasonSelected(reason)) {
        removeReason(reason);
    } else {
        const newReasons = [...localSelectedReasons.value, reason];
        localSelectedReasons.value = newReasons;
        emit("update:selectedReasons", newReasons);

        nextTick(() => {
            searchQuery.value = "";

            if (dropdownMenu.value) {
                const items = Array.from(dropdownMenu.value.querySelectorAll(".dropdown-item"));
                const selectedIndex = items.findIndex((item) =>
                    item.classList.contains("selected"),
                );
                if (selectedIndex >= 0) {
                    items[selectedIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            }
        });
    }
};

const removeReason = (reason) => {
    const newReasons = localSelectedReasons.value.filter((r) => r !== reason);
    localSelectedReasons.value = newReasons;
    emit("update:selectedReasons", newReasons);
};

const clearAllReasons = () => {
    localSelectedReasons.value = [];
    emit("update:selectedReasons", []);
    showDropdown.value = false;
};

const navigateDropdown = (direction) => {
    if (filteredReasons.value.length === 0) return;

    if (direction === "down") {
        highlightedIndex.value = (highlightedIndex.value + 1) % filteredReasons.value.length;
    } else {
        highlightedIndex.value =
            (highlightedIndex.value - 1 + filteredReasons.value.length) %
            filteredReasons.value.length;
    }

    nextTick(() => {
        if (dropdownMenu.value) {
            const items = Array.from(dropdownMenu.value.querySelectorAll(".dropdown-item"));
            if (items[highlightedIndex.value]) {
                items[highlightedIndex.value].scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }
    });
};

const selectHighlighted = () => {
    if (filteredReasons.value.length > 0) {
        toggleReason(filteredReasons.value[highlightedIndex.value]);

        if (!isReasonSelected(filteredReasons.value[highlightedIndex.value])) {
            searchQuery.value = "";
            highlightedIndex.value = 0;
        }
    }
};

const selectedReasonsFormatted = computed(() => {
    return localSelectedReasons.value.map((reason) => formatReason(reason)).join(", ");
});

const sortedSelectedReasons = computed(() => {
    return [...localSelectedReasons.value].sort((a, b) => {
        return formatReason(a).localeCompare(formatReason(b));
    });
});

watch(
    () => props.selectedReasons,
    (newValue) => {
        if (JSON.stringify(newValue) !== JSON.stringify(localSelectedReasons.value)) {
            localSelectedReasons.value = [...newValue];
        }
    },
    { deep: true },
);

watch(filteredReasons, () => {
    highlightedIndex.value = 0;
});
</script>

<style scoped>
.consultation-options {
    width: 100%;
    background-color: white;
    border-radius: 8px;
    padding: 4px 0;
}

.options-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 4px;
}

.options-header h3 {
    font-size: 1.1rem;
    color: var(--primary-color, #334155);
    margin: 0;
    font-weight: 600;
}

.selection-count {
    background-color: var(--accent-color, #3b82f6);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
}

.search-container {
    position: relative;
    width: 100%;
    margin-bottom: 8px;
}

.search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: #f8fafc;
    transition: all 0.2s ease;
    overflow: hidden;
}

.search-input-container:focus-within {
    border-color: var(--accent-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
    padding-left: 12px;
    color: #64748b;
    font-size: 0.9rem;
}

.search-input {
    flex: 1;
    padding: 12px 12px 12px 8px;
    border: none;
    background: transparent;
    font-size: 0.95rem;
    outline: none;
    width: 100%;
}

.dropdown-toggle {
    background: none;
    border: none;
    padding: 0 12px;
    border-left: 1px solid #e2e8f0;
    color: #64748b;
    cursor: pointer;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toggle-icon {
    font-size: 0.7rem;
}

.dropdown-toggle:hover {
    background-color: #f1f5f9;
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

.dropdown-header {
    padding: 10px 12px;
    background-color: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.85rem;
    color: #64748b;
    font-weight: 500;
}

.dropdown-content {
    max-height: 240px;
    overflow-y: auto;
    padding: 4px 0;
}

.dropdown-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: all 0.15s ease;
}

.dropdown-item:hover {
    background-color: #f1f5f9;
}

.dropdown-item.highlighted {
    background-color: #f1f5f9;
}

.dropdown-item.selected {
    background-color: #eff6ff;
}

.dropdown-item.selected.highlighted {
    background-color: #dbeafe;
}

.checkbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 2px solid #cbd5e1;
    border-radius: 4px;
    margin-right: 10px;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.checkbox.checked {
    background-color: var(--accent-color, #3b82f6);
    border-color: var(--accent-color, #3b82f6);
}

.checkbox.checked:after {
    content: "";
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
    display: block;
}

.reason-label {
    font-size: 0.95rem;
    color: #334155;
}

.dropdown-footer {
    padding: 8px 12px;
    background-color: #f8fafc;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
}

.clear-all-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-weight: 500;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.clear-all-btn:hover {
    background-color: #fee2e2;
}

.no-results {
    padding: 16px;
    text-align: center;
    color: #64748b;
    font-style: italic;
    font-size: 0.9rem;
}

.selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
    margin-bottom: 12px;
}

.tag {
    display: flex;
    align-items: center;
    background-color: #eff6ff;
    padding: 6px 12px;
    border-radius: 50px;
    font-size: 0.85rem;
    border: 1px solid #dbeafe;
    transition: all 0.2s ease;
    max-width: 180px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tag:hover {
    background-color: #dbeafe;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tag-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
    color: #2563eb;
}

.tag-remove {
    margin-left: 6px;
    font-size: 1.2rem;
    line-height: 0.8;
    color: #64748b;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
}

.tag-remove:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
}
</style>
