<template>
    <div class="input-wrapper">
        <label v-if="label" :for="id" class="input-label">
            {{ label }}
        </label>

        <div class="input-container" :class="{ 'input-container--error': error }">
            <div v-if="prefixIcon" class="input-icon input-icon--prefix">
                <slot name="prefix-icon"></slot>
            </div>

            <input
                :id="id"
                :type="type"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :readonly="readonly"
                :required="required"
                :autofocus="autofocus"
                :class="[
                    'input-field',
                    {
                        'input-field--with-prefix': prefixIcon,
                        'input-field--with-suffix': suffixIcon,
                    },
                ]"
                @input="$emit('update:modelValue', $event.target.value)"
                @blur="$emit('blur', $event)"
                @focus="$emit('focus', $event)"
            />

            <div v-if="suffixIcon" class="input-icon input-icon--suffix">
                <slot name="suffix-icon"></slot>
            </div>
        </div>

        <div v-if="error" class="input-error">{{ error }}</div>
        <div v-if="hint && !error" class="input-hint">{{ hint }}</div>
    </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: "",
    },
    label: {
        type: String,
        default: "",
    },
    type: {
        type: String,
        default: "text",
    },
    placeholder: {
        type: String,
        default: "",
    },
    id: {
        type: String,
        default: () => `input-${Math.random().toString(36).substring(2, 9)}`,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    readonly: {
        type: Boolean,
        default: false,
    },
    required: {
        type: Boolean,
        default: false,
    },
    autofocus: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: "",
    },
    hint: {
        type: String,
        default: "",
    },
    prefixIcon: {
        type: Boolean,
        default: false,
    },
    suffixIcon: {
        type: Boolean,
        default: false,
    },
});

defineEmits(["update:modelValue", "blur", "focus"]);
</script>

<style scoped>
.input-wrapper {
    margin-bottom: 1rem;
}

.input-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4a5568;
}

.input-required {
    color: #e53e3e;
    margin-left: 0.25rem;
}

.input-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 0.25rem;
    background-color: #fff;
    transition: all 0.2s ease;
    min-height: 50px;
}

.input-container:focus-within {
    border-color: #3490dc;
    box-shadow: 0 0 0 3px rgba(52, 144, 220, 0.25);
}

.input-container--error {
    border-color: #e53e3e;
}

.input-container--error:focus-within {
    box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.25);
}

.input-field {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border: none;
    outline: none;
    background: transparent;
}

.input-field--with-prefix {
    padding-left: 2.5rem;
}

.input-field--with-suffix {
    padding-right: 2.5rem;
}

.input-field:disabled,
.input-field:readonly {
    background-color: #f7fafc;
    cursor: not-allowed;
}

.input-icon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    color: #a0aec0;
}

.input-icon--prefix {
    left: 0;
}

.input-icon--suffix {
    right: 0;
}

.input-error {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #e53e3e;
}

.input-hint {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #718096;
}
</style>
