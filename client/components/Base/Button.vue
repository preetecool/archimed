<template>
    <component
        :is="tag"
        :href="href"
        :class="buttonClasses"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        v-bind="$attrs"
    >
        {{ label }}
        <span class="arrow-wrapper" v-if="pointerRight">
            <ArrowPointer :is-hovered="isHovered" />
        </span>
    </component>
</template>
<script setup>
import { computed, ref } from "vue";
import ArrowPointer from "../ArrowPointer.vue";
const props = defineProps({
    label: {
        type: String,
        required: true,
    },
    href: {
        type: String,
        default: null,
    },
    variant: {
        type: String,
        default: "default",
        validator: (value) => ["default", "primary", "outline", "ghost"].includes(value),
    },
    size: {
        type: String,
        default: "md",
        validator: (value) => ["sm", "md", "lg"].includes(value),
    },
    textColor: {
        type: String,
        default: null,
    },
    accentText: {
        type: Boolean,
        default: false,
    },
    pointerRight: Boolean,
    pointDown: Boolean,
    pointUp: Boolean,
    justifyBetween: Boolean,
    marginTopZero: Boolean,
    noFill: Boolean,
    lightFill: Boolean,
});
const isHovered = ref(false);
const tag = computed(() => (props.href ? "a" : "button"));
const buttonClasses = computed(() => [
    "btn",
    `btn-${props.variant}`,
    `btn-${props.size}`,
    {
        "justify-between": props.justifyBetween,
        "mt-0": props.marginTopZero,
        "accent-text": props.accentText,
        "custom-text-color": props.textColor,
        "btn-no-fill": props.noFill,
        "btn-light-fill": props.lightFill,
    },
]);
</script>
<style scoped>
.arrow-wrapper {
    display: inline-flex;
    align-items: center;
    padding-right: 4px;
    overflow: visible;
}

.btn {
    --btn-padding-sm: 0.375rem 0.75rem;
    --btn-padding-md: 0.5rem 1rem;
    --btn-padding-lg: 0.75rem 1.25rem;
    --btn-font-sm: 0.75rem;
    --btn-font-md: 0.9rem;
    --btn-font-lg: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.2px;
    transition: all var(--transition-smooth);
    position: relative;
    overflow: visible;
}

.btn-sm {
    padding: var(--btn-padding-sm);
    font-size: var(--btn-font-sm);
}

.btn-md {
    padding: var(--btn-padding-md);
    font-size: var(--btn-font-md);
}

.btn-lg {
    padding: var(--btn-padding-lg);
    font-size: var(--btn-font-lg);
}

.btn-default,
.btn-primary {
    background-color: var(--accent-color);
    color: white;
    border: 1px solid var(--accent-color);
}

.btn-outline {
    color: var(--text-color);
    border: 1px solid var(--gray);
}

.btn-ghost {
    background-color: transparent;
    color: var(--text-color);
    border: none;
    padding: 0;
}

.btn-light-fill {
    background-color: var(--button-gray);
    color: var(--text-color);
}
.btn-primary.btn-light-fill:hover,
.btn-default.btn-light-fill:hover {
    background-color: var(--gray);
}

.btn-outline.btn-light-fill:hover {
    background-color: var(--button-gray-hover);
    color: var(--text-color);
}

.btn-no-fill {
    background-color: transparent !important;
}

.btn-default:hover,
.btn-primary:hover {
    background-color: var(--accent-hover);
    border-color: var(--button-hover-border);
}

.btn-default.btn-no-fill:hover,
.btn-primary.btn-no-fill:hover {
    background-color: transparent !important;
    color: var(--accent-color);
}

.btn-outline:hover {
    background-color: var(--accent-color);
    color: white;
}

.btn-outline.btn-no-fill:hover {
    background-color: transparent !important;
    border-color: var(--accent-color);
    color: var(--accent-color);
}

.btn-ghost:hover {
    color: var(--accent-color);
}

.accent-text {
    color: #ff4b4b !important;
}

.custom-text-color {
    color: var(--custom-text-color) !important;
}

.btn.custom-text-color {
    --custom-text-color: v-bind("props.textColor");
}
</style>
