<template>
    <div>
        <Navigation />

        <FormCard :title="$t('auth.register.title')" :errorMessage="userStore.error">
            <form v-if="!userStore.isLoading" @submit.prevent="handleRegister" class="auth-form">
                <div class="form-group">
                    <BaseInput
                        v-model="email"
                        :label="$t('auth.register.email')"
                        type="email"
                        placeholder="votre@email.com"
                        required
                        :prefixIcon="true"
                        :error="emailError"
                        @blur="validateEmail"
                        aria-describedby="email-error"
                    >
                        <template #prefix-icon>
                            <Mail class="input-icon" size="18" />
                        </template>
                    </BaseInput>
                    <div v-if="emailError" id="email-error" class="error-text" role="alert">
                        {{ emailError }}
                    </div>
                </div>

                <div class="form-group">
                    <BaseInput
                        v-model="password"
                        :label="$t('auth.register.password')"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="••••••••"
                        required
                        :prefixIcon="true"
                        :suffixIcon="true"
                        :error="passwordError"
                        @input="validatePassword"
                        aria-describedby="password-error password-strength"
                    >
                        <template #prefix-icon>
                            <Lock class="input-icon" size="18" />
                        </template>
                        <template #suffix-icon>
                            <button
                                type="button"
                                class="toggle-password"
                                @click="showPassword = !showPassword"
                                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                            >
                                <Eye v-if="showPassword" class="input-icon" size="18" />
                                <EyeOff v-else class="input-icon" size="18" />
                            </button>
                        </template>
                    </BaseInput>
                    <div v-if="passwordError" id="password-error" class="error-text" role="alert">
                        {{ passwordError }}
                    </div>
                    <div
                        v-if="password && !passwordError"
                        id="password-strength"
                        class="password-strength"
                    >
                        <div class="strength-bar">
                            <div
                                class="strength-fill"
                                :class="`strength-${passwordStrength.strength}`"
                                :style="{ width: `${(passwordStrength.score / 5) * 100}%` }"
                            ></div>
                        </div>
                        <div class="strength-text">
                            <span :class="`strength-${passwordStrength.strength}`">
                                {{ getStrengthText(passwordStrength.strength) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <BaseInput
                        v-model="confirmPassword"
                        :label="$t('auth.register.confirm_password')"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        placeholder="••••••••"
                        required
                        :prefixIcon="true"
                        :suffixIcon="true"
                        :error="confirmPasswordError"
                        @blur="validateConfirmPassword"
                        aria-describedby="confirm-password-error"
                    >
                        <template #prefix-icon>
                            <LockKeyhole class="input-icon" size="18" />
                        </template>
                        <template #suffix-icon>
                            <button
                                type="button"
                                class="toggle-password"
                                @click="showConfirmPassword = !showConfirmPassword"
                                :aria-label="
                                    showConfirmPassword ? 'Hide password' : 'Show password'
                                "
                            >
                                <Eye v-if="showConfirmPassword" class="input-icon" size="18" />
                                <EyeOff v-else class="input-icon" size="18" />
                            </button>
                        </template>
                    </BaseInput>
                    <div
                        v-if="confirmPasswordError"
                        id="confirm-password-error"
                        class="error-text"
                        role="alert"
                    >
                        {{ confirmPasswordError }}
                    </div>
                </div>

                <MedicalLicenseField
                    v-model="medicalLicense"
                    :email="email"
                    @validation="licensePassed = $event"
                />

                <div class="terms-checkbox">
                    <input
                        type="checkbox"
                        id="terms"
                        v-model="agreeToTerms"
                        required
                        aria-describedby="terms-description"
                    />
                    <label for="terms" id="terms-description">
                        {{ $t("auth.register.agree_terms") }}
                        <button type="button" @click="showTerms" class="link-button">
                            {{ $t("auth.register.terms") }}
                        </button>
                        {{ $t("auth.register.and") }}
                        <button type="button" @click="showPrivacy" class="link-button">
                            {{ $t("auth.register.privacy") }}
                        </button>
                    </label>
                </div>

                <BaseButton
                    :label="$t('auth.register.register')"
                    type="submit"
                    variant="primary"
                    size="lg"
                    class="full-width-btn"
                    :disabled="!isFormValid || userStore.isLoading"
                    :loading="userStore.isLoading"
                />
            </form>

            <div class="separator">
                <span>{{ $t("auth.register.or") }}</span>
            </div>

            <div class="social-login">
                <button
                    @click="handleGoogleRegister"
                    class="social-btn google"
                    :disabled="userStore.isLoading || !canUseGoogle"
                    aria-label="Sign up with Google"
                >
                    <span class="icon">G</span>
                    <span>{{
                        userStore.isLoading
                            ? $t("auth.register.loading")
                            : $t("auth.register.register_with_google")
                    }}</span>
                </button>
            </div>

            <div class="account-prompt">
                <p>
                    {{ $t("auth.register.have_account") }}
                    <nuxt-link to="/login">{{ $t("auth.register.sign_in") }}</nuxt-link>
                </p>
            </div>
        </FormCard>
    </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Mail, Lock, LockKeyhole, Eye, EyeOff } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import MedicalLicenseField from "~/components/MedicalLicenseField.vue";
import { useUserStore } from "~/stores/modules/user";
import { useUIStore } from "~/stores/modules/ui";

definePageMeta({});

const { t } = useI18n();
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const medicalLicense = ref("");
const licensePassed = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const agreeToTerms = ref(false);
const emailError = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUIStore();

const passwordStrength = computed(() => {
    if (!password.value) return { score: 0, strength: "weak", checks: {} };
    return userStore.validatePasswordStrength(password.value);
});

const isFormValid = computed(() => {
    return (
        email.value &&
        password.value &&
        confirmPassword.value &&
        password.value === confirmPassword.value &&
        medicalLicense.value &&
        licensePassed.value &&
        agreeToTerms.value &&
        !emailError.value &&
        !passwordError.value &&
        !confirmPasswordError.value &&
        passwordStrength.value.strength !== "weak"
    );
});

const canUseGoogle = computed(() => {
    return agreeToTerms.value && medicalLicense.value && licensePassed.value;
});

const validateEmail = () => {
    if (!email.value) {
        emailError.value = "Email is required";
        return false;
    }
    if (!isValidEmail(email.value)) {
        emailError.value = "Please enter a valid email address";
        return false;
    }
    emailError.value = "";
    return true;
};

const validatePassword = () => {
    if (!password.value) {
        passwordError.value = "Password is required";
        return false;
    }
    if (password.value.length < 8) {
        passwordError.value = "Password must be at least 8 characters";
        return false;
    }
    if (passwordStrength.value.strength === "weak") {
        passwordError.value =
            "Password is too weak. Please include uppercase, lowercase, numbers, and special characters.";
        return false;
    }
    passwordError.value = "";
    return true;
};

const validateConfirmPassword = () => {
    if (!confirmPassword.value) {
        confirmPasswordError.value = "Please confirm your password";
        return false;
    }
    if (password.value !== confirmPassword.value) {
        confirmPasswordError.value = t("auth.register.passwords_dont_match");
        return false;
    }
    confirmPasswordError.value = "";
    return true;
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const getStrengthText = (strength) => {
    const texts = {
        weak: "Weak",
        medium: "Medium",
        strong: "Strong",
    };
    return texts[strength] || "Weak";
};

watch([password, confirmPassword], () => {
    if (confirmPassword.value) {
        validateConfirmPassword();
    }
});

const handleRegister = async () => {
    if (!validateEmail() || !validatePassword() || !validateConfirmPassword()) {
        return;
    }

    if (!isFormValid.value) {
        uiStore.showError("Please complete all required fields correctly");
        return;
    }

    try {
        const result = await userStore.registerWithEmail(
            email.value,
            password.value,
            medicalLicense.value,
        );

        if (result.success) {
            redirectAfterRegister();
        }
    } catch (error) {
        console.error("Registration error handling:", error);
    }
};

const handleGoogleRegister = async () => {
    if (!canUseGoogle.value) {
        uiStore.showError("Please accept terms and provide a valid medical license");
        return;
    }

    try {
        const result = await userStore.registerWithGoogle(medicalLicense.value);
        if (result.success) {
            redirectAfterRegister();
        }
    } catch (error) {
        console.error("Google registration error handling:", error);
    }
};

const redirectAfterRegister = () => {
    const redirectUrl = route.query.redirect?.toString();
    const plan = route.query.plan?.toString();

    if (redirectUrl) {
        if (plan) {
            router.push(`${redirectUrl}?plan=${plan}`);
        } else {
            router.push(redirectUrl);
        }
    } else {
        router.push("/transcription");
    }
};

const showTerms = () => {
    uiStore.showInfo("Terms of service coming soon...");
};

const showPrivacy = () => {
    uiStore.showInfo("Privacy policy coming soon...");
};
</script>

<style scoped>
.auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.error-text {
    font-size: 0.875rem;
    color: #dc2626;
    margin-top: 0.25rem;
}

.input-icon {
    color: #6b7280;
}

.toggle-password {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toggle-password:hover {
    color: #374151;
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

.strength-text .strength-weak {
    color: #dc2626;
}

.strength-text .strength-medium {
    color: #f59e0b;
}

.strength-text .strength-strong {
    color: #10b981;
}

.terms-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
}

.terms-checkbox input[type="checkbox"] {
    margin: 0;
    margin-top: 0.125rem;
    flex-shrink: 0;
}

.terms-checkbox label {
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.4;
    cursor: pointer;
}

.link-button {
    background: none;
    border: none;
    color: #4f46e5;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
}

.link-button:hover {
    color: #4338ca;
}

.separator {
    text-align: center;
    margin: 1.5rem 0;
    position: relative;
}

.separator::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e5e7eb;
}

.separator span {
    background: white;
    padding: 0 1rem;
    color: #6b7280;
    font-size: 0.875rem;
}

.social-login {
    margin-bottom: 1.5rem;
}

.social-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s;
}

.social-btn:hover:not(:disabled) {
    border-color: #9ca3af;
    background: #f9fafb;
}

.social-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.social-btn .icon {
    font-weight: bold;
    color: #4285f4;
}

.account-prompt {
    text-align: center;
}

.account-prompt p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
}

.account-prompt a {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
}

.account-prompt a:hover {
    text-decoration: underline;
}

.full-width-btn {
    width: 100%;
}
</style>
