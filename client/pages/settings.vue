<template>
    <div class="settings-page">
        <AppNavigation />

        <div class="page-content">
            <div class="container">
                <div class="page-header">
                    <h1>{{ $t("settings.title") }}</h1>
                    <p class="page-description">{{ $t("settings.manageSettings") }}</p>
                </div>

                <div class="settings-grid">
                    <div class="settings-card profile-card">
                        <div class="card-header">
                            <div class="profile-avatar">
                                <div class="avatar-circle">
                                    {{ userInitials }}
                                </div>
                                <button
                                    class="avatar-upload"
                                    @click="handleAvatarUpload"
                                    :disabled="updateLoading"
                                >
                                    <Camera size="16" />
                                </button>
                            </div>
                            <div class="profile-info">
                                <h2>{{ userStore.userName }}</h2>
                                <p class="profile-email">{{ email }}</p>
                                <div class="verification-status">
                                    <CheckCircle
                                        v-if="userStore.isEmailVerified"
                                        size="16"
                                        class="verified-icon"
                                    />
                                    <AlertCircle v-else size="16" class="unverified-icon" />
                                    <span
                                        :class="{
                                            verified: userStore.isEmailVerified,
                                            unverified: !userStore.isEmailVerified,
                                        }"
                                    >
                                        {{ userStore.isEmailVerified ? "Verified" : "Unverified" }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form @submit.prevent="updateProfile" class="settings-form">
                            <div class="form-group">
                                <BaseInput
                                    v-model="displayName"
                                    :label="$t('settings.profile.name')"
                                    placeholder="Your name"
                                    :disabled="updateLoading"
                                />
                            </div>
                            <div class="form-group">
                                <BaseInput
                                    v-model="email"
                                    :label="$t('settings.profile.email')"
                                    type="email"
                                    disabled
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div class="form-actions">
                                <BaseButton
                                    :label="$t('settings.profile.save')"
                                    type="submit"
                                    variant="primary"
                                    :disabled="!hasProfileChanges || updateLoading"
                                    :loading="updateLoading"
                                />
                                <BaseButton
                                    v-if="!userStore.isEmailVerified"
                                    :label="$t('settings.profile.resend_verification')"
                                    variant="outline"
                                    @click="resendVerificationEmail"
                                    :disabled="verificationLoading"
                                    :loading="verificationLoading"
                                />
                            </div>
                        </form>
                    </div>

                    <div class="settings-card preferences-card">
                        <h2>Preferences</h2>
                        <div class="preferences-grid">
                            <div class="preference-item">
                                <label for="language">Language</label>
                                <select
                                    id="language"
                                    v-model="preferences.language"
                                    @change="updatePreferences"
                                    class="preference-select"
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div class="preference-item">
                                <label for="theme">Theme</label>
                                <select
                                    id="theme"
                                    v-model="preferences.theme"
                                    @change="updatePreferences"
                                    class="preference-select"
                                >
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="system">System</option>
                                </select>
                            </div>
                            <div class="preference-item">
                                <label class="preference-toggle">
                                    <input
                                        type="checkbox"
                                        v-model="preferences.notifications"
                                        @change="updatePreferences"
                                    />
                                    <span>Email notifications</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="settings-card license-card">
                        <h2>{{ $t("settings.license.title") }}</h2>
                        <div v-if="userStore.isLoading" class="loading">
                            {{ $t("settings.loading") }}
                        </div>
                        <div v-else>
                            <div
                                v-if="userStore.medicalLicense && !showLicenseForm"
                                class="license-info"
                            >
                                <div class="license-display">
                                    <Shield class="license-icon verified" size="20" />
                                    <div>
                                        <p class="license-number">{{ userStore.medicalLicense }}</p>
                                        <p class="license-status">Verified medical license</p>
                                    </div>
                                </div>
                                <button @click="showLicenseForm = true" class="text-button">
                                    {{ $t("settings.license.update") }}
                                </button>
                            </div>
                            <div v-else>
                                <MedicalLicenseField
                                    v-model="newLicense"
                                    :email="email"
                                    @validation="licensePassed = $event"
                                />
                                <div class="form-actions">
                                    <BaseButton
                                        :label="$t('settings.license.save')"
                                        @click="updateLicense"
                                        variant="primary"
                                        :disabled="!licensePassed || licenseUpdateLoading"
                                        :loading="licenseUpdateLoading"
                                    />
                                    <BaseButton
                                        v-if="userStore.medicalLicense"
                                        :label="$t('settings.license.cancel')"
                                        @click="cancelLicenseUpdate"
                                        variant="outline"
                                        :disabled="licenseUpdateLoading"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-card subscription-card">
                        <SubscriptionInfo />
                    </div>

                    <div class="settings-card payment-history-card">
                        <PaymentHistory :limit="5" />
                    </div>

                    <div class="settings-card security-card" v-if="!userStore.isOAuthUser">
                        <h2>{{ $t("settings.password.title") }}</h2>
                        <form @submit.prevent="updatePassword" class="settings-form">
                            <div class="form-group">
                                <BaseInput
                                    v-model="currentPassword"
                                    :label="$t('settings.password.current')"
                                    type="password"
                                    placeholder="••••••••"
                                    :disabled="passwordUpdateLoading"
                                />
                            </div>
                            <div class="form-group">
                                <BaseInput
                                    v-model="newPassword"
                                    :label="$t('settings.password.new')"
                                    type="password"
                                    placeholder="••••••••"
                                    :disabled="passwordUpdateLoading"
                                    @input="validateNewPassword"
                                />
                                <div
                                    v-if="newPassword && newPasswordStrength"
                                    class="password-strength"
                                >
                                    <div class="strength-bar">
                                        <div
                                            class="strength-fill"
                                            :class="`strength-${newPasswordStrength.strength}`"
                                            :style="{
                                                width: `${(newPasswordStrength.score / 5) * 100}%`,
                                            }"
                                        ></div>
                                    </div>
                                    <span
                                        class="strength-text"
                                        :class="`strength-${newPasswordStrength.strength}`"
                                    >
                                        {{ getStrengthText(newPasswordStrength.strength) }}
                                    </span>
                                </div>
                            </div>
                            <div class="form-group">
                                <BaseInput
                                    v-model="confirmNewPassword"
                                    :label="$t('settings.password.confirm')"
                                    type="password"
                                    placeholder="••••••••"
                                    :error="passwordMismatchError"
                                    :disabled="passwordUpdateLoading"
                                />
                            </div>
                            <div class="form-actions">
                                <BaseButton
                                    :label="$t('settings.password.update')"
                                    type="submit"
                                    variant="primary"
                                    :disabled="!canUpdatePassword || passwordUpdateLoading"
                                    :loading="passwordUpdateLoading"
                                />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="showDeleteConfirmation"
            class="modal-overlay"
            @click="showDeleteConfirmation = false"
        >
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>Delete Account</h3>
                    <button @click="showDeleteConfirmation = false" class="modal-close">
                        <X size="20" />
                    </button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete your account? This will:</p>
                    <ul class="delete-consequences">
                        <li>Permanently delete all your transcriptions and data</li>
                        <li>Cancel any active subscriptions</li>
                        <li>Remove your medical license verification</li>
                        <li>Delete your account permanently</li>
                    </ul>
                    <p class="delete-warning">This action cannot be undone.</p>
                    <div class="delete-confirmation">
                        <label for="delete-confirm">Type "DELETE" to confirm:</label>
                        <input
                            id="delete-confirm"
                            v-model="deleteConfirmation"
                            type="text"
                            placeholder="DELETE"
                            class="delete-input"
                        />
                    </div>
                </div>
                <div class="modal-actions">
                    <BaseButton
                        label="Cancel"
                        variant="outline"
                        @click="showDeleteConfirmation = false"
                    />
                    <BaseButton
                        label="Delete Account"
                        variant="danger"
                        @click="handleDeleteAccount"
                        :disabled="deleteConfirmation !== 'DELETE' || deleteLoading"
                        :loading="deleteLoading"
                    />
                </div>
            </div>
        </div>

        <ToastNotification v-bind="toastState" @close="closeToast" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Camera, CheckCircle, AlertCircle, Shield, X } from "lucide-vue-next";
import { useUserStore } from "~/stores/modules/user";
import { useUIStore } from "~/stores/modules/ui";
import { useToast } from "~/composables/useToast";
import MedicalLicenseField from "~/components/MedicalLicenseField.vue";
import SubscriptionInfo from "~/components/SubscriptionInfo.vue";
import PaymentHistory from "~/components/PaymentHistory.vue";

definePageMeta({
    middleware: ["auth"],
});

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const uiStore = useUIStore();
const { toastState, showSuccess, showError, closeToast } = useToast();

const displayName = ref("");
const email = ref("");
const originalDisplayName = ref("");
const preferences = ref({ ...userStore.preferences });
const newLicense = ref("");
const licensePassed = ref(false);
const showLicenseForm = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const confirmNewPassword = ref("");
const passwordMismatchError = ref("");
const newPasswordStrength = ref(null);
const showDeleteConfirmation = ref(false);
const deleteConfirmation = ref("");
const updateLoading = ref(false);
const licenseUpdateLoading = ref(false);
const passwordUpdateLoading = ref(false);
const verificationLoading = ref(false);
const deleteLoading = ref(false);

const userInitials = computed(() => {
    const name = userStore.userName;
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
});

const hasProfileChanges = computed(() => {
    return displayName.value !== originalDisplayName.value;
});

const canUpdatePassword = computed(() => {
    return (
        currentPassword.value &&
        newPassword.value &&
        confirmNewPassword.value &&
        newPassword.value === confirmNewPassword.value &&
        newPassword.value.length >= 8 &&
        newPasswordStrength.value?.strength !== "weak"
    );
});

const getStrengthText = (strength) => {
    const texts = { weak: "Weak", medium: "Medium", strong: "Strong" };
    return texts[strength] || "Weak";
};

watch([newPassword, confirmNewPassword], ([newPw, confirmPw]) => {
    if (confirmPw && newPw !== confirmPw) {
        passwordMismatchError.value = "Passwords don't match";
    } else {
        passwordMismatchError.value = "";
    }
});

const loadUserData = async () => {
    if (userStore.userData) {
        displayName.value = userStore.userData.displayName || "";
        originalDisplayName.value = displayName.value;
        email.value = userStore.userData.email || "";
    }
};

const validateNewPassword = () => {
    if (newPassword.value) {
        newPasswordStrength.value = userStore.validatePasswordStrength(newPassword.value);
    } else {
        newPasswordStrength.value = null;
    }
};

const updatePreferences = () => {
    userStore.updatePreferences(preferences.value);
    showSuccess("Preferences updated successfully");
};

const updateProfile = async () => {
    updateLoading.value = true;
    try {
        const result = await userStore.updateProfile(displayName.value);
        if (result.success) {
            originalDisplayName.value = displayName.value;
            showSuccess("Profile updated successfully");
        } else {
            showError(result.error || "Failed to update profile");
        }
    } catch (error) {
        showError("Failed to update profile");
    } finally {
        updateLoading.value = false;
    }
};

const resendVerificationEmail = async () => {
    verificationLoading.value = true;
    try {
        const result = await userStore.resendVerificationEmail();
        if (result.success) {
            showSuccess(result.message);
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError("Failed to send verification email");
    } finally {
        verificationLoading.value = false;
    }
};

const updateLicense = async () => {
    if (!licensePassed.value) return;

    licenseUpdateLoading.value = true;
    try {
        const result = await userStore.updateLicense(newLicense.value);
        if (result.success) {
            newLicense.value = "";
            showLicenseForm.value = false;
            showSuccess(result.message || "Medical license updated successfully");
        } else {
            showError(result.error || "Failed to update medical license");
        }
    } catch (error) {
        showError("Failed to update medical license");
    } finally {
        licenseUpdateLoading.value = false;
    }
};

const cancelLicenseUpdate = () => {
    showLicenseForm.value = false;
    newLicense.value = "";
};

const updatePassword = async () => {
    if (!canUpdatePassword.value) return;

    passwordUpdateLoading.value = true;
    try {
        const result = await userStore.updatePassword(currentPassword.value, newPassword.value);

        if (result.success) {
            currentPassword.value = "";
            newPassword.value = "";
            confirmNewPassword.value = "";
            newPasswordStrength.value = null;
            showSuccess(result.message || "Password updated successfully");
        } else {
            showError(result.error || "Failed to update password");
        }
    } catch (error) {
        showError("Failed to update password");
    } finally {
        passwordUpdateLoading.value = false;
    }
};

const handleAvatarUpload = () => {
    uiStore.showInfo("Avatar upload coming soon...");
};

const handleDeleteAccount = async () => {
    if (deleteConfirmation.value !== "DELETE") return;

    deleteLoading.value = true;
    try {
        const response = await fetch("/api/auth/delete-account", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await userStore.userData.getIdToken()}`,
            },
        });

        const result = await response.json();

        if (result.success) {
            await userStore.logout();
            showSuccess("Account deleted successfully");
            router.push("/");
        } else {
            showError(result.error || "Failed to delete account");
        }
    } catch (error) {
        showError("Failed to delete account");
    } finally {
        deleteLoading.value = false;
        showDeleteConfirmation.value = false;
        deleteConfirmation.value = "";
    }
};

onMounted(async () => {
    await loadUserData();
});

watch(
    () => userStore.userData,
    async () => {
        await loadUserData();
    },
);
</script>

<style scoped>
.settings-page {
    min-height: 100vh;
    background-color: #f8fafc;
    padding-bottom: 60px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.page-content {
    padding-top: 20px;
}

.page-header {
    margin-bottom: 2rem;
}

.page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
}

.page-description {
    color: #6b7280;
    margin: 0;
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 24px;
}

.settings-card {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    padding: 24px;
    border: 1px solid #e5e7eb;
}

.profile-card {
    grid-column: span 2;
}

.subscription-card,
.payment-history-card {
    grid-column: span 2;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
}

.profile-avatar {
    position: relative;
}

.avatar-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1.25rem;
}

.avatar-upload {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #4f46e5;
    color: white;
    border: 2px solid white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.profile-info h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
}

.profile-email {
    color: #6b7280;
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
}

.verification-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.verified-icon {
    color: #10b981;
}

.unverified-icon {
    color: #f59e0b;
}

.verified {
    color: #10b981;
    font-weight: 500;
}

.unverified {
    color: #f59e0b;
    font-weight: 500;
}

.settings-card h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
}

.settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.preferences-grid {
    display: grid;
    gap: 1rem;
}

.preference-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.preference-item label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
}

.preference-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
}

.preference-toggle {
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.preference-toggle input[type="checkbox"] {
    margin: 0;
}

.license-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.license-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f0fdf4;
    border-radius: 0.5rem;
    border: 1px solid #bbf7d0;
    flex: 1;
}

.license-icon.verified {
    color: #10b981;
}

.license-number {
    font-weight: 600;
    color: #1f2937;
    margin: 0;
}

.license-status {
    font-size: 0.875rem;
    color: #10b981;
    margin: 0;
}

.text-button {
    background: none;
    border: none;
    color: #4f46e5;
    font-weight: 500;
    cursor: pointer;
    padding: 0.5rem;
    font-size: 0.875rem;
    margin-left: 1rem;
}

.text-button:hover {
    text-decoration: underline;
}

.password-strength {
    margin-top: 0.5rem;
}

.strength-bar {
    width: 100%;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.strength-fill {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 2px;
}

.strength-fill.strength-weak {
    background: #dc2626;
}

.strength-fill.strength-medium {
    background: #f59e0b;
}

.strength-fill.strength-strong {
    background: #10b981;
}

.strength-text {
    font-size: 0.75rem;
    font-weight: 500;
}

.strength-text.strength-weak {
    color: #dc2626;
}

.strength-text.strength-medium {
    color: #f59e0b;
}

.strength-text.strength-strong {
    color: #10b981;
}

.danger-card {
    border: 1px solid #fecaca;
    background: #fef2f2;
}

.danger-card h2 {
    color: #dc2626;
}

.danger-content {
    margin-top: 1rem;
}

.danger-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.danger-info h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #dc2626;
}

.danger-info p {
    margin: 0;
    font-size: 0.875rem;
    color: #7f1d1d;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-content {
    background: white;
    border-radius: 0.5rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #dc2626;
}

.modal-close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
}

.modal-close:hover {
    background: #f3f4f6;
}

.modal-body {
    padding: 1.5rem;
}

.delete-consequences {
    margin: 1rem 0;
    padding-left: 1.5rem;
    color: #7f1d1d;
}

.delete-warning {
    font-weight: 600;
    color: #dc2626;
    margin: 1rem 0;
}

.delete-confirmation {
    margin: 1rem 0;
}

.delete-confirmation label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
}

.delete-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.modal-actions {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid #e5e7eb;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
}

@media (max-width: 768px) {
    .settings-grid {
        grid-template-columns: 1fr;
    }

    .settings-card {
        grid-column: span 1 !important;
    }

    .card-header {
        flex-direction: column;
        text-align: center;
    }

    .danger-item {
        flex-direction: column;
        align-items: stretch;
    }

    .form-actions {
        flex-direction: column;
    }
}
</style>
