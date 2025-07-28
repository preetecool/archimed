<template>
    <nav class="navigation">
        <div class="container">
            <div class="nav-wrapper">
                <div class="logo">
                    <a href="/">Archimed</a>
                </div>
                <div v-if="!isTranscriptionPage && !isAuthPage" class="nav-links">
                    <a href="#fonctionnalites" class="nav-link">{{ $t("navigation.features") }}</a>
                    <a href="#tarifs" class="nav-link">{{ $t("navigation.pricing") }}</a>
                    <a href="#a-propos" class="nav-link">{{ $t("navigation.about") }}</a>
                    <a href="#contact" class="nav-link">{{ $t("navigation.contact") }}</a>
                </div>
                <div class="nav-actions">
                    <BaseButton
                        v-if="isAuthenticated && !isTranscriptionPage"
                        :label="$t('navigation.back_to_app')"
                        variant="primary"
                        size="sm"
                        pointerRight
                        href="/transcription"
                    />

                    <BaseButton
                        v-if="!isAuthenticated && !isTranscriptionPage && !isAuthPage"
                        :label="$t('navigation.login')"
                        variant="ghost"
                        size="sm"
                        pointerRight
                        href="/login"
                        class="nav-login-btn"
                    />

                    <BaseButton
                        v-if="isAuthenticated"
                        :label="$t('navigation.logout')"
                        variant="ghost"
                        size="sm"
                        pointerRight
                        @click="handleLogout"
                    />

                    <BaseButton
                        v-if="!isAuthenticated && !isTranscriptionPage && !isAuthPage"
                        :label="$t('navigation.free_trial')"
                        variant="primary"
                        size="sm"
                        pointerRight
                    />

                    <LanguageSwitcher />
                </div>
            </div>
        </div>
    </nav>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useFirebaseAuth } from "vuefire";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";

const { t } = useI18n();
const route = useRoute();
const auth = useFirebaseAuth();
const router = useRouter();
const isAuthenticated = ref(false);

const isTranscriptionPage = computed(() => {
    return route.path === "/transcription";
});
const isAuthPage = computed(() => {
    return route.path === "/login" || route.path === "/register";
});

onMounted(() => {
    if (auth) {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            isAuthenticated.value = !!user;
        });

        return () => unsubscribe();
    }
});

const handleLogout = async () => {
    try {
        if (auth) {
            await signOut(auth);
            localStorage.removeItem("firebase_token");
            router.push("/");
        }
    } catch (error) {
        console.error("Logout error:", error);
    }
};
</script>

<style scoped>
.navigation {
    top: 0;
    left: 0;
    width: 100%;
    z-index: 100;
    background-color: transparent;
    position: absolute;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.nav-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
}

.logo a {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.06rem;
    color: var(--accent-color);
    text-decoration: none;
}

.nav-links {
    display: flex;
    gap: 2rem;
}

.nav-link {
    color: var(--text-color);
    text-decoration: none;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.2px;
    transition: color 0.2s ease;
}

.nav-link:hover {
    color: var(--accent-color);
}

.nav-actions {
    display: flex;
    gap: 1rem;
}

@media (max-width: 768px) {
    .nav-links {
        display: none;
    }

    .nav-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.5rem;
    }
}
</style>
