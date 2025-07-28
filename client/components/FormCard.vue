<template>
    <div class="auth-page">
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-header">
                    <h1>{{ title }}</h1>
                    <p v-if="subtitle">{{ subtitle }}</p>
                </div>

                <div v-if="errorMessage" class="error-message">
                    {{ errorMessage }}
                </div>

                <slot></slot>
            </div>
        </div>
    </div>
</template>
<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
    subtitle: {
        type: String,
        default: "",
    },
    errorMessage: {
        type: String,
        default: "",
    },
});
</script>

<style scoped>
.auth-page {
    min-height: 100vh;
    background-color: #f8f9fa;
}

.auth-container {
    max-width: 580px;
    margin: 0 auto;
    padding: 100px 1rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.auth-card {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    padding: 48px 48px 24px 48px;
    width: 100%;
}

.auth-header {
    text-align: center;
    margin-bottom: 2rem;
}

.auth-header h1 {
    font-size: 1.7rem;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
    font-weight: 500;
    text-align: left;
    letter-spacing: -0.2px;
}

.auth-header p {
    color: var(--text-color);
    opacity: 0.8;
}

.error-message {
    background-color: #fee2e2;
    color: #b91c1c;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

:deep(.auth-form) {
    margin-bottom: 1.5rem;
}

:deep(.form-group) {
    margin-bottom: 1.25rem;
}

:deep(.form-options) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
}

:deep(.remember-me) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

:deep(.forgot-password) {
    color: var(--accent-color);
    text-decoration: none;
}

:deep(.forgot-password:hover) {
    text-decoration: underline;
}

:deep(.full-width-btn) {
    width: 100%;
}

:deep(.separator) {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
}

:deep(.separator::before) {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #e5e7eb;
    z-index: 0;
}

:deep(.separator span) {
    position: relative;
    z-index: 1;
    background-color: white;
    padding: 0 0.75rem;
    color: #6b7280;
    font-size: 0.875rem;
}

:deep(.social-login) {
    display: flex;
    margin-bottom: 1.5rem;
}

:deep(.social-btn) {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.875rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

:deep(.social-btn:hover) {
    background-color: #f3f4f6;
    border-color: #d1d5db;
}

:deep(.social-btn:active) {
    transform: translateY(1px);
}

:deep(.google .icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background-color: #ea4335;
    color: white;
    border-radius: 50%;
    font-weight: bold;
    font-size: 0.875rem;
}

:deep(.toggle-password) {
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
}

:deep(.input-icon) {
    color: #6b7280;
}

:deep(.account-prompt) {
    background-color: #f3f4f6;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    width: 100%;
    margin-top: 1.5rem;
}

:deep(.account-prompt p) {
    font-size: 0.875rem;
    color: #4b5563;
    margin: 0;
}

:deep(.account-prompt a) {
    color: var(--accent-color);
    text-decoration: none;
    font-weight: 600;
}

:deep(.account-prompt a:hover) {
    text-decoration: underline;
}

:deep(.terms-checkbox) {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
}

:deep(.terms-checkbox input) {
    margin-top: 0.25rem;
}

:deep(.terms-checkbox a) {
    color: var(--accent-color);
    text-decoration: none;
}

:deep(.terms-checkbox a:hover) {
    text-decoration: underline;
}

@media (max-width: 576px) {
    .auth-card {
        padding: 1.5rem;
    }

    .auth-header h1 {
        font-size: 1.75rem;
    }

    :deep(.form-options) {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }
}
</style>
