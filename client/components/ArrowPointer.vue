<template>
    <svg
        viewBox="0 0 14 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="arrow"
        width="14"
        height="10"
    >
        <g fill-rule="evenodd">
            <path
                d="M1 1l4 4-4 4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="butt"
                stroke-linejoin="butt"
                :class="[
                    'transition-transform duration-150 ease-[cubic-bezier(0.215,0.61,0.355,1)]',
                    isHovered ? 'translate-x-2' : 'translate-x-0',
                ]"
            />
            <path
                d="M1 5h6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="square"
                stroke-linejoin="butt"
                :class="[
                    'transition duration-100 ease-[cubic-bezier(0.215,0.61,0.355,1)]',
                    {
                        'opacity-0': !isHovered,
                        'translate-x-1': isHovered,
                    },
                ]"
            />
        </g>
    </svg>
</template>

<script setup>
defineProps({
    isHovered: {
        type: Boolean,
        default: false,
    },
});
</script>

<style scroped>
.arrow {
    margin-left: 8px;
    position: relative;
    top: 1px;
    overflow: visible;
}
</style>
