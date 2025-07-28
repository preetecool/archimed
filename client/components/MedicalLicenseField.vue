<template>
    <div class="form-group">
        <label for="medical-license" class="form-label">Numéro de licence médicale</label>
        <div class="input-group">
            <input
                type="text"
                id="medical-license"
                v-model="licenseValue"
                class="form-input"
                placeholder="Exemple: MD12345678"
                :class="{ 'is-invalid': licenseError }"
                @input="validateLicense"
                @blur="validateLicense(true)"
            />
        </div>
        <div v-if="licenseError" class="error-text">
            {{ licenseError }}
        </div>
        <div v-if="licenseInfo" class="info-text">
            {{ licenseInfo }}
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { debounce } from "lodash";

const props = defineProps({
    modelValue: {
        type: String,
        default: "",
    },
    email: {
        type: String,
        default: "",
    },
    required: {
        type: Boolean,
        default: true,
    },
    validationMode: {
        type: String,
        default: "lazy",
    },
});

const emit = defineEmits(["update:modelValue", "validation"]);

const licenseValue = ref(props.modelValue);
const licenseError = ref("");
const licenseInfo = ref("");
const isValidated = ref(false);

watch(
    () => props.modelValue,
    (newValue) => {
        licenseValue.value = newValue;
    },
);

watch(licenseValue, (newValue) => {
    emit("update:modelValue", newValue);

    if (props.validationMode === "immediate") {
        debouncedValidate(false);
    }
});

const debouncedValidate = debounce((isBlur = false) => {
    validateLicense(isBlur);
}, 300);

const validateLicense = async (isBlur = false) => {
    if (!props.required && !licenseValue.value) {
        licenseError.value = "";
        licenseInfo.value = "";
        emit("validation", true);
        isValidated.value = true;
        return;
    }

    const licenseRegex = /^(MD|DO)\d{8}$/;

    if (!licenseValue.value) {
        licenseError.value = isBlur ? "Le numéro de licence est requis." : "";
        isValidated.value = false;
        emit("validation", false);
    } else if (!licenseRegex.test(licenseValue.value)) {
        licenseError.value = "Format invalide. Exemple: MD12345678";
        isValidated.value = false;
        emit("validation", false);
    } else {
        if (isBlur && props.email) {
            try {
                licenseInfo.value = "Vérification de la licence...";
                licenseError.value = "";

                const response = await fetch("/api/auth/verify-license", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        licenseNumber: licenseValue.value,
                        email: props.email,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    licenseInfo.value = "Numéro de licence valide.";
                    licenseError.value = "";
                    isValidated.value = true;
                } else {
                    licenseError.value = result.error || "Numéro de licence invalide";
                    licenseInfo.value = "";
                    isValidated.value = false;
                }
            } catch (error) {
                licenseError.value = "Impossible de vérifier la licence.";
                licenseInfo.value = "";
                isValidated.value = false;
            }
        } else {
            licenseError.value = "";
            licenseInfo.value = "Format de licence valide.";
            isValidated.value = true;
        }

        emit("validation", isValidated.value);
    }
};

defineExpose({
    validate: () => {
        validateLicense(true);
        return isValidated.value;
    },
});
</script>

<style scoped>
.form-group {
    margin-bottom: 1.25rem;
}

.form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 0.5rem;
}

.input-group {
    position: relative;
    display: flex;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(42, 70, 178, 0.1);
}

.form-input.is-invalid {
    border-color: #ef4444;
}

.error-text {
    margin-top: 0.5rem;
    color: #ef4444;
    font-size: 0.75rem;
}

.info-text {
    margin-top: 0.5rem;
    color: #16a34a;
    font-size: 0.75rem;
}
</style>
