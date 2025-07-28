<template>
    <section id="faq" class="faq-section">
        <BaseContainer>
            <div class="centered-heading">
                <h2>{{ $t("faq.title") }}</h2>
                <p class="subtitle">
                    {{ $t("faq.subtitle") }}
                </p>
            </div>

            <div class="faq-accordion">
                <div
                    v-for="(item, index) in faqItems"
                    :key="index"
                    class="faq-item"
                    :class="{ active: activeIndex === index }"
                >
                    <div class="faq-question" @click="toggleItem(index)">
                        <h3>{{ item.question }}</h3>
                        <span class="icon" :class="{ rotated: activeIndex === index }">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M19 9L12 16L5 9"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>
                    </div>
                    <transition name="slide-fade">
                        <div class="faq-answer" v-if="activeIndex === index">
                            <p>{{ item.answer }}</p>
                        </div>
                    </transition>
                </div>
            </div>
        </BaseContainer>
    </section>
</template>

<script setup>
import { ref } from "vue";

const activeIndex = ref(null);

const toggleItem = (index) => {
    if (activeIndex.value === index) {
        activeIndex.value = null;
    } else {
        activeIndex.value = index;
    }
};

const faqItems = [
    {
        question: "Comment fonctionne la période d'essai gratuit ?",
        answer: "Notre essai gratuit vous donne accès à toutes les fonctionnalités pendant 7 jours. Aucune carte de crédit n'est requise pour commencer, et vous pouvez annuler à tout moment pendant la période d'essai sans être facturé.",
    },
    {
        question: "Puis-je changer de forfait à tout moment ?",
        answer: "Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence de prix sera calculée au prorata pour le reste de votre cycle de facturation. Vous pouvez également passer à un forfait inférieur au début de votre prochain cycle de facturation.",
    },
    {
        question: "Comment fonctionne la facturation ?",
        answer: "La facturation est mensuelle ou annuelle, selon l'option que vous choisissez lors de l'inscription. Les paiements sont automatiquement prélevés le même jour chaque mois pour les forfaits mensuels, ou une fois par an pour les forfaits annuels.",
    },
    {
        question: "Quelles méthodes de paiement acceptez-vous ?",
        answer: "Nous acceptons les principales cartes de crédit (Visa, Mastercard, American Express) ainsi que les paiements par PayPal et les virements bancaires pour les forfaits Enterprise.",
    },
    {
        question: "Comment fonctionne le support technique ?",
        answer: "Tous les forfaits comprennent un support par email. Les forfaits Professionnel et Enterprise incluent également un support prioritaire par téléphone et chat en direct pendant les heures ouvrables. Le forfait Enterprise bénéficie d'un support 24/7.",
    },
];
</script>

<style scoped>
.faq-section {
    padding: 5rem 0;
    background-color: white;
}

.faq-header {
    text-align: center;
    margin-bottom: 3.5rem;
}

.faq-header h2 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: #1a1a1a;
}

.faq-header .subtitle {
    font-size: 1.125rem;
    color: #4a5568;
    max-width: 600px;
    margin: 0 auto;
}

.faq-accordion {
    max-width: 768px;
    margin: 0 auto;
}

.faq-item {
    border-bottom: 1px solid #e2e8f0;
    overflow: hidden;
}

.faq-item:first-child {
    border-top: 1px solid #e2e8f0;
}

.faq-question {
    padding: 1.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.faq-question:hover {
    color: var(--accent-color);
}

.faq-question h3 {
    font-size: 1.125rem;
    font-weight: 500;
    color: inherit;
    margin: 0;
}

.icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
    color: #0a2540;
}

.icon.rotated {
    transform: rotate(180deg);
    color: var(--accent-color);
}

.faq-item.active .faq-question {
    color: var(--accent-color);
}

.faq-answer {
    padding: 0 0 1.5rem;
}

.faq-answer p {
    margin: 0;
    color: #4a5568;
    line-height: 1.6;
    text-align: left;
}

.slide-fade-enter-active {
    transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-leave-active {
    transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(-20px);
    opacity: 0;
}

@media (max-width: 768px) {
    .faq-section {
        padding: 3rem 0;
    }

    .faq-header h2 {
        font-size: 2rem;
    }

    .faq-question h3 {
        font-size: 1rem;
    }
}
</style>
