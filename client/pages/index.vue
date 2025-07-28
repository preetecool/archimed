<template>
    <div class="landing-page">
        <Navigation />

        <HeroSection @primary-action="handleStartTrial" />

        <div id="fonctionnalités" style="background-color: #f8fafc">
            <FeatureSection />
        </div>

        <div id="tarifs">
            <PricingSection @plan-selected="handlePlanSelection" />
        </div>

        <div id="testimonials">
            <TestimonialSection />
        </div>

        <div id="faq">
            <FAQSection />
        </div>
    </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useUserStore } from "~/stores/modules/user";

const router = useRouter();
const userStore = useUserStore();

const handleStartTrial = () => {
    if (userStore.isAuthenticated) {
        router.push({
            path: "/payment",
            query: { plan: "trial" },
        });
    } else {
        router.push({
            path: "/login",
            query: {
                redirect: encodeURIComponent("/payment"),
                plan: "trial",
            },
        });
    }
};

const handlePlanSelection = (plan) => {
    console.log(`Plan selected from pricing section: ${plan}`);
};
</script>

<style scoped></style>
