<template>
    <Teleport to="body">
        <div v-if="show" class="license-modal-overlay">
            <div class="license-modal">
                <div class="license-modal-header">
                    <h2>{{ $t("app.license_required.title") }}</h2>
                </div>

                <div class="license-modal-body">
                    <p>{{ $t("app.license_required.message") }}</p>

                    <MedicalLicenseField
                        v-model="licenseNumber"
                        :email="userEmail"
                        @validation="licensePassed = $event"
                    />
                </div>

                <div class="license-modal-footer">
                    <BaseButton
                        :label="$t('settings.license.save')"
                        variant="primary"
                        @click="saveLicense"
                        :disabled="!licensePassed || isLoading"
                    />

                    <BaseButton
                        :label="$t('settings.license.cancel')"
                        variant="ghost"
                        @click="goToSettings"
                    />
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useCurrentUser } from "vuefire";
import { useToast } from "~/composables/useToast";

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["close", "license-saved"]);

const router = useRouter();
const user = useCurrentUser();
const { showSuccess, showError } = useToast();

const licenseNumber = ref("");
const licensePassed = ref(false);
const isLoading = ref(false);

const userEmail = computed(() => {
    return user.value?.email || "";
});

const goToSettings = () => {
    router.push("/settings?requiresLicense=true");
    emit("close");
};
</script>

<style scoped>
.license-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.license-modal {
    background-color: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.license-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
}

.license-modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--primary-color);
}

.license-modal-body {
    padding: 20px;
}

.license-modal-body p {
    margin-bottom: 20px;
    color: #4b5563;
}

.license-modal-footer {
    padding: 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
</style>
