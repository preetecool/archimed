<template>
    <div class="license-update-form">
        <button v-if="!showForm" @click="showForm = true" class="show-form-btn">
            Ajouter une licence médicale
        </button>

        <form v-if="showForm" @submit.prevent="handleSubmit" class="license-form">
            <MedicalLicenseField
                v-model="licenseNumber"
                :email="userEmail"
                @validation="isValid = $event"
            />

            <div class="form-actions">
                <button type="button" @click="showForm = false" class="cancel-btn">Annuler</button>
                <button type="submit" class="submit-btn" :disabled="!isValid || isSubmitting">
                    {{ isSubmitting ? "Traitement..." : "Enregistrer" }}
                </button>
            </div>

            <div v-if="error" class="error-message">
                {{ error }}
            </div>
            <div v-if="success" class="success-message">
                {{ success }}
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useCurrentUser } from "vuefire";
import MedicalLicenseField from "~/components/MedicalLicenseField.vue";

const emit = defineEmits(["license-updated"]);

const user = useCurrentUser();
const showForm = ref(false);
const licenseNumber = ref("");
const isValid = ref(false);
const isSubmitting = ref(false);
const error = ref("");
const success = ref("");

const userEmail = computed(() => {
    return user.value?.email || "";
});
</script>

<style scoped>
.license-update-form {
    margin-top: 16px;
}

.show-form-btn {
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.show-form-btn:hover {
    background-color: var(--accent-hover, #1e40af);
}

.license-form {
    margin-top: 16px;
    padding: 16px;
    background-color: #f8fafc;
    border-radius: 8px;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}

.cancel-btn {
    background-color: transparent;
    color: #6b7280;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
}

.cancel-btn:hover {
    background-color: #f3f4f6;
}

.submit-btn {
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
    background-color: var(--accent-hover, #1e40af);
}

.submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.error-message {
    margin-top: 16px;
    padding: 12px;
    background-color: #fee2e2;
    color: #b91c1c;
    border-radius: 6px;
    font-size: 0.875rem;
}

.success-message {
    margin-top: 16px;
    padding: 12px;
    background-color: #dcfce7;
    color: #16a34a;
    border-radius: 6px;
    font-size: 0.875rem;
}
</style>
