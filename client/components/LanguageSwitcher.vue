<template>
    <div class="language-switcher">
        <NuxtLink
            v-for="locale in availableLocales"
            :key="locale.code"
            :to="switchLocalePath(locale.code)"
            class="lang-button"
            :class="{ active: currentLocale === locale.code }"
        >
            {{ locale.code.toUpperCase() }}
        </NuxtLink>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const switchLocalePath = useSwitchLocalePath();

const currentLocale = computed(() => i18n.locale.value);
const availableLocales = computed(() => {
    return i18n.locales.value.filter((i) => i.code !== currentLocale.value);
});

const switchLanguage = (locale) => {
    if (process.client) {
        const targetLocale = locale;
        const { pathname, search, hash } = window.location;
        const baseUrl = window.location.origin;

        let path = pathname;
        const currentLocalePrefix = `/${currentLocale.value}`;
        if (path.startsWith(currentLocalePrefix)) {
            path = path.replace(currentLocalePrefix, "");
        }
        if (path === "") path = "/";

        const targetPath = targetLocale === i18n.defaultLocale ? path : `/${targetLocale}${path}`;
        const newUrl = `${baseUrl}${targetPath}${search}${hash}`;

        window.location.href = newUrl;
    }
};
</script>

<style scoped>
.language-switcher {
    display: flex;
    gap: 0.25rem;
    align-items: center;
}

.lang-button {
    border: none;
    background: transparent;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
    opacity: 0.7;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.lang-button:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.05);
}

.lang-button.active {
    opacity: 1;
    background-color: var(--accent-color);
    color: white;
}
</style>
