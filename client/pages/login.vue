<template>
    <div>
        <Navigation />

        <FormCard :title="$t('auth.login.title')" :errorMessage="userStore.error">
            <form v-if="!userStore.isLoading" @submit.prevent="handleEmailLogin" class="auth-form">
                <div class="form-group">
                    <BaseInput
                        v-model="email"
                        :label="$t('auth.login.email')"
                        type="email"
                        placeholder="your@email.com"
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
                        :label="$t('auth.login.password')"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="••••••••"
                        required
                        :prefixIcon="true"
                        :suffixIcon="true"
                        :error="passwordError"
                        @blur="validatePassword"
                        aria-describedby="password-error"
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
                </div>

                <div class="form-options">
                    <label class="remember-me">
                        <input
                            type="checkbox"
                            v-model="rememberMe"
                            aria-describedby="remember-description"
                        />
                        <span id="remember-description">{{ $t("auth.login.remember_me") }}</span>
                    </label>
                    <button
                        type="button"
                        class="forgot-password"
                        @click="handleForgotPassword"
                        :disabled="!email || emailError"
                    >
                        {{ $t("auth.login.forgot_password") }}
                    </button>
                </div>

                <BaseButton
                    :label="$t('auth.login.sign_in')"
                    type="submit"
                    variant="primary"
                    size="lg"
                    class="full-width-btn"
                    :disabled="!isFormValid || userStore.isLoading"
                    :loading="userStore.isLoading"
                />
            </form>

            <div class="separator">
                <span>{{ $t("auth.login.or") }}</span>
            </div>

            <div class="social-login">
                <button
                    @click="handleGoogleLogin"
                    class="social-btn google"
                    :disabled="userStore.isLoading"
                    aria-label="Continue with Google"
                >
                    <span class="icon">G</span>
                    <span>{{
                        userStore.isLoading
                            ? $t("auth.login.loading")
                            : $t("auth.login.continue_with_google")
                    }}</span>
                </button>
            </div>

            <div class="account-prompt">
                <p>
                    {{ $t("auth.login.no_account") }}
                    <nuxt-link to="/register">{{ $t("auth.login.create_account") }}</nuxt-link>
                </p>
            </div>
        </FormCard>
    </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "~/stores/modules/user";
import { useUIStore } from "~/stores/modules/ui";
import { Mail, Lock, Eye, EyeOff } from "lucide-vue-next";
import { useI18n } from "vue-i18n";

definePageMeta({});

const { t } = useI18n();
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const rememberMe = ref(false);
const emailError = ref("");
const passwordError = ref("");
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUIStore();

const isFormValid = computed(() => {
    return (
        email.value &&
        password.value &&
        !emailError.value &&
        !passwordError.value &&
        isValidEmail(email.value)
    );
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
    if (password.value.length < 6) {
        passwordError.value = "Password must be at least 6 characters";
        return false;
    }
    passwordError.value = "";
    return true;
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const handleEmailLogin = async () => {
    if (!validateEmail() || !validatePassword()) return;

    const result = await userStore.loginWithEmail(email.value, password.value, rememberMe.value);

    if (result.success) {
        redirectAfterLogin();
    }
};

const handleGoogleLogin = async () => {
    const result = await userStore.loginWithGoogle();
    if (result.success) {
        redirectAfterLogin();
    }
};

const redirectAfterLogin = () => {
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

const handleForgotPassword = async () => {
    if (!validateEmail()) {
        uiStore.showError("Please enter a valid email address");
        return;
    }

    const result = await userStore.resetPassword(email.value);
    if (result.success) {
        uiStore.showSuccess("Password reset email sent. Please check your inbox.");
    }
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

.form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.5rem 0;
}

.remember-me {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
}

.remember-me input[type="checkbox"] {
    margin: 0;
}

.forgot-password {
    background: none;
    border: none;
    color: #4f46e5;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
    padding: 0;
}

.forgot-password:hover:not(:disabled) {
    text-decoration: underline;
}

.forgot-password:disabled {
    color: #9ca3af;
    cursor: not-allowed;
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
