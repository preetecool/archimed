<template>
    <div
        :class="[
            'container',
            {
                'container--fluid': fluid,
                'container--narrow': narrow,
                [`container--padding-${padding}`]: padding,
                'container--centered': centered,
            },
        ]"
    >
        <slot />
    </div>
</template>

<script setup>
defineProps({
    fluid: {
        type: Boolean,
        default: false,
    },
    narrow: {
        type: Boolean,
        default: false,
    },
    padding: {
        type: String,
        default: "md",
        validator: (value) => ["none", "sm", "md", "lg", "xl"].includes(value),
    },
    centered: {
        type: Boolean,
        default: true,
    },
});
</script>

<style scoped>
.container {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
    box-sizing: border-box;
}

.container--fluid {
    max-width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;
}

.container--narrow {
    max-width: 768px;
}

.container--centered {
    text-align: center;
}

.container--padding-none {
    padding: 0;
}

.container--padding-sm {
    padding: 1rem;
}

.container--padding-md {
    padding: 0 2rem;
}

.container--padding-lg {
    padding: 3rem;
}

.container--padding-xl {
    padding: 5rem;
}

@media (min-width: 640px) {
    .container:not(.container--fluid) {
        max-width: 640px;
    }
}

@media (min-width: 768px) {
    .container:not(.container--fluid) {
        max-width: 768px;
    }
}

@media (min-width: 1024px) {
    .container:not(.container--fluid) {
        max-width: 1024px;
    }
}

@media (min-width: 1280px) {
    .container:not(.container--fluid) {
        max-width: 1280px;
    }
}
</style>
