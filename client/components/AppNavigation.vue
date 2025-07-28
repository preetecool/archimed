<template>
    <nav class="app-navigation">
        <div class="container">
            <div class="nav-wrapper">
                <div class="logo">
                    <NuxtLink to="/transcription">{{ $t("app.title") }}</NuxtLink>
                </div>

                <div class="nav-links">
                    <NuxtLink
                        to="/transcription"
                        class="nav-link"
                        :class="{ active: isCurrentRoute('/transcription') }"
                    >
                        Transcription
                    </NuxtLink>

                    <NuxtLink
                        to="/settings"
                        class="nav-link"
                        :class="{ active: isCurrentRoute('/settings') }"
                    >
                        {{ $t("navigation.settings") }}
                    </NuxtLink>
                </div>

                <div class="nav-actions">
                    <LanguageSwitcher />

                    <div class="user-menu">
                        <button class="logout-button" @click="handleLogout">
                            {{ $t("navigation.logout") }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <LicenseRequiredModal
            v-if="showLicenseModal"
            @close="showLicenseModal = false"
            @license-saved="handleLicenseSaved"
        />
    </nav>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useFirebaseAuth, useCurrentUser } from "vuefire";
import { signOut } from "firebase/auth";
import LanguageSwitcher from "~/components/LanguageSwitcher.vue";
import LicenseRequiredModal from "~/components/LicenseRequiredModal.vue";

const router = useRouter();
const route = useRoute();
const auth = useFirebaseAuth();
const user = useCurrentUser();
const showLicenseModal = ref(false);

const isCurrentRoute = (path) => {
    return route.path === path;
};
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

const checkLicenseRequired = async () => {
    const requiresLicense = localStorage.getItem("requiresMedicalLicense") === "true";

    if (requiresLicense && user.value) {
        try {
            const tokenResult = await user.value.getIdTokenResult(true);
            const claims = tokenResult.claims || {};

            if (!claims.medicalLicense) {
                showLicenseModal.value = true;
            } else {
                localStorage.removeItem("requiresMedicalLicense");
            }
        } catch (error) {
            console.error("Error checking license claims:", error);
        }
    }
};

const handleLicenseSaved = () => {
    showLicenseModal.value = false;
    localStorage.removeItem("requiresMedicalLicense");
};

onMounted(() => {
    checkLicenseRequired();
});
</script>

<style scoped>
.app-navigation {
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 50;
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
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.2px;
    transition: color 0.2s ease;
    padding: 8px 0;
    position: relative;
}

.nav-link:hover {
    color: var(--accent-color);
}

.nav-link.active {
    color: var(--accent-color);
}

.nav-link.active::after {
    content: "";
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--accent-color);
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.user-menu {
    display: flex;
    align-items: center;
}

.logout-button {
    background: none;
    border: none;
    color: var(--text-color);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.logout-button:hover {
    background-color: #f3f4f6;
    color: var(--accent-color);
}

@media (max-width: 768px) {
    .nav-links {
        gap: 1rem;
    }

    .nav-actions {
        gap: 0.75rem;
    }
}

@media (max-width: 640px) {
    .nav-wrapper {
        height: auto;
        flex-direction: column;
        padding: 12px 0;
    }

    .logo {
        margin-bottom: 12px;
    }

    .nav-links {
        width: 100%;
        justify-content: space-between;
        margin-bottom: 12px;
    }

    .nav-actions {
        width: 100%;
        justify-content: space-between;
    }
}
</style>
