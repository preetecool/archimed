<template>
    <div>
        <slot></slot>

        <LicenseRequiredModal
            :show="showLicenseModal"
            @close="showLicenseModal = false"
            @license-saved="handleLicenseSaved"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useCurrentUser } from "vuefire";
import LicenseRequiredModal from "~/components/LicenseRequiredModal.vue";

const user = useCurrentUser();
const showLicenseModal = ref(false);

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

watch(user, () => {
    if (user.value) {
        checkLicenseRequired();
    } else {
        showLicenseModal.value = false;
    }
});

onMounted(() => {
    checkLicenseRequired();
});
</script>
