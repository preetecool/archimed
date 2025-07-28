<template>
    <div class="app-layout">
        <div class="sidebar">
            <div class="logo">
                <div class="logo-icon">A</div>
            </div>
            <div class="nav-items">
                <div class="nav-item active" title="Transcriptions">
                    <Mic size="20" />
                </div>

                <div class="nav-item" title="Settings">
                    <Settings size="20" @click="navigateToSettings" />
                </div>
            </div>
            <div class="user-menu">
                <div class="nav-item" title="User Profile">
                    <User size="20" />
                </div>
                <div class="nav-item" title="Logout">
                    <LogOut size="20" @click="handleLogout" />
                </div>
            </div>
        </div>

        <div class="main-content">
            <slot />
            <Toast />
        </div>
    </div>
</template>

<script setup>
import { Mic, LayoutDashboard, Calendar, Settings, User, LogOut } from "lucide-vue-next";
import { signOut } from "firebase/auth";

const router = useRouter();
const route = useRoute();
const auth = useFirebaseAuth();
const user = useCurrentUser();

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

const navigateToSettings = async () => {
    try {
        if (auth) {
            router.push("/settings");
        }
    } catch (error) {
        console.error("Something went wrong.", error);
    }
};
</script>

<style scoped>
.app-layout {
    display: flex;
    height: 100vh;
    width: 100%;
    background-color: #f8fafc;
}

.sidebar {
    width: 64px;
    height: 100%;
    background-color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0;
    border-right: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    z-index: 10;
}

.logo {
    margin-bottom: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.logo-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background-color: var(--accent-color, #4073ff);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
}

.nav-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    align-items: center;
    flex: 1;
}

.nav-item {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
}

.nav-item:hover {
    background-color: #f1f5f9;
    color: #0f172a;
}

.nav-item.active {
    background-color: #eff6ff;
    color: var(--accent-color, #4073ff);
}

.user-menu {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    align-items: center;
    padding-top: 16px;
}

.main-content {
    flex: 1;
    height: 100%;
    overflow: hidden;
}
</style>
