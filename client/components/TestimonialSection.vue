<template>
    <section id="testimonials" class="testinonials">
        <BaseContainer>
            <div
                class="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 blur-3xl"
                aria-hidden="true"
            >
                <div
                    class="ml-[max(50%,38rem)] aspect-[1313/771] w-[82.0625rem]"
                    style="
                        background: radial-gradient(
                            circle,
                            rgba(64, 115, 255, 0.2) 0%,
                            rgba(64, 115, 255, 0) 70%
                        );
                        clip-path: polygon(
                            74.1% 44.1%,
                            100% 61.6%,
                            97.5% 26.9%,
                            85.5% 0.1%,
                            80.7% 2%,
                            72.5% 32.5%,
                            60.2% 62.4%,
                            52.4% 68.1%,
                            47.5% 58.3%,
                            45.2% 34.5%,
                            27.5% 76.7%,
                            0.1% 64.9%,
                            17.9% 100%,
                            27.6% 76.8%,
                            76.1% 97.7%,
                            74.1% 44.1%
                        );
                    "
                />
            </div>
            <div
                class="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden pt-32 opacity-25 blur-3xl sm:pt-40 xl:justify-end"
                aria-hidden="true"
            >
                <div
                    class="ml-[-22rem] aspect-[1313/771] w-[82.0625rem] flex-none origin-top-right rotate-[30deg] xl:ml-0 xl:mr-[calc(50%-12rem)]"
                    style="
                        background: radial-gradient(
                            circle,
                            rgba(64, 115, 255, 0.2) 0%,
                            rgba(64, 115, 255, 0) 70%
                        );
                        clip-path: polygon(
                            74.1% 44.1%,
                            100% 61.6%,
                            97.5% 26.9%,
                            85.5% 0.1%,
                            80.7% 2%,
                            72.5% 32.5%,
                            60.2% 62.4%,
                            52.4% 68.1%,
                            47.5% 58.3%,
                            45.2% 34.5%,
                            27.5% 76.7%,
                            0.1% 64.9%,
                            17.9% 100%,
                            27.6% 76.8%,
                            76.1% 97.7%,
                            74.1% 44.1%
                        );
                    "
                />
            </div>

            <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="centered-heading">
                    <h2>{{ $t("testimonials.title") }}</h2>
                    <p class="subtitle">{{ $t("testimonials.subtitle") }}</p>
                </div>

                <div
                    class="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm leading-6 text-gray-900 sm:mt-20 sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-flow-col xl:grid-cols-4"
                >
                    <figure
                        class="rounded-2xl bg-white shadow-lg ring-1 ring-gray-900/5 sm:col-span-2 xl:col-start-2 xl:row-end-1"
                    >
                        <blockquote
                            class="p-6 text-lg font-semibold text-gray-900 sm:p-12 sm:text-xl leading-8"
                        >
                            <p>"{{ testimonials[1].quote }}"</p>
                        </blockquote>
                        <figcaption
                            class="flex flex-wrap items-center gap-x-4 gap-y-4 border-t border-gray-900/10 px-6 py-4 sm:flex-nowrap"
                        >
                            <div
                                class="w-10 h-10 flex-none rounded-full bg-gray-50 overflow-hidden"
                            >
                                <img
                                    :src="testimonials[1].avatar"
                                    :alt="testimonials[1].name"
                                    class="w-full h-full object-cover"
                                />
                            </div>
                            <div class="flex-auto">
                                <div class="font-semibold">{{ testimonials[1].name }}</div>
                                <div class="text-gray-600">{{ testimonials[1].title }}</div>
                            </div>

                            <div class="flex">
                                <span
                                    v-for="i in 5"
                                    :key="i"
                                    class="star"
                                    :class="{
                                        'text-accent': i <= testimonials[1].rating,
                                        'text-gray-200': i > testimonials[1].rating,
                                    }"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                </span>
                            </div>
                        </figcaption>
                    </figure>

                    <div class="space-y-8 xl:contents xl:space-y-0">
                        <div class="space-y-8 xl:row-span-2">
                            <figure
                                v-for="(testimonial, index) in [testimonials[0], testimonials[2]]"
                                :key="index"
                                class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
                            >
                                <blockquote class="text-gray-900">
                                    <p>"{{ testimonial.quote }}"</p>
                                </blockquote>
                                <figcaption class="mt-6 flex items-center gap-x-4">
                                    <div class="w-10 h-10 rounded-full bg-gray-50 overflow-hidden">
                                        <img
                                            :src="testimonial.avatar"
                                            :alt="testimonial.name"
                                            class="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div class="font-semibold">{{ testimonial.name }}</div>
                                        <div class="text-gray-600">{{ testimonial.title }}</div>
                                    </div>
                                </figcaption>
                            </figure>
                        </div>
                    </div>

                    <div class="space-y-8 xl:contents xl:space-y-0">
                        <div class="space-y-8 xl:row-start-1">
                            <figure
                                v-for="(testimonial, index) in [testimonials[3], testimonials[4]]"
                                :key="index"
                                class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
                            >
                                <blockquote class="text-gray-900">
                                    <p>"{{ testimonial.quote }}"</p>
                                </blockquote>
                                <figcaption class="mt-6 flex items-center gap-x-4">
                                    <div class="w-10 h-10 rounded-full bg-gray-50 overflow-hidden">
                                        <img
                                            :src="testimonial.avatar"
                                            :alt="testimonial.name"
                                            class="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div class="font-semibold">{{ testimonial.name }}</div>
                                        <div class="text-gray-600">{{ testimonial.title }}</div>
                                    </div>
                                </figcaption>
                            </figure>
                        </div>
                    </div>

                    <div class="space-y-8 xl:contents xl:space-y-0">
                        <div class="space-y-8 xl:row-span-2">
                            <figure
                                class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
                            >
                                <blockquote class="text-gray-900">
                                    <p>"{{ testimonials[5].quote }}"</p>
                                </blockquote>
                                <figcaption class="mt-6 flex items-center gap-x-4">
                                    <div class="w-10 h-10 rounded-full bg-gray-50 overflow-hidden">
                                        <img
                                            :src="testimonials[5].avatar"
                                            class="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div class="font-semibold">{{ testimonials[5].name }}</div>
                                        <div class="text-gray-600">{{ testimonials[5].title }}</div>
                                    </div>
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                </div>
            </div>
        </BaseContainer>
    </section>
</template>

<script setup>
import { ref } from "vue";

const testimonials = [
    {
        name: "Dr. Sophie Laurent",
        title: "Médecin généraliste",
        quote: "Archimed a complètement transformé ma pratique. La transcription automatique me fait gagner au moins une heure par jour, ce qui me permet de consacrer plus de temps à mes patients.",
        avatar: "/api/placeholder/80/80",
        rating: 5,
    },
    {
        name: "Dr. Thomas Moreau",
        title: "Cardiologue",
        quote: "L'intégration avec notre système existant a été remarquablement simple. Le support technique a été exceptionnel tout au long du processus, et mes patients apprécient la rapidité avec laquelle ils reçoivent leurs comptes rendus.",
        avatar: "/api/placeholder/80/80",
        rating: 5,
    },
    {
        name: "Marie Dubois",
        title: "Directrice de clinique",
        quote: "Notre établissement a constaté une amélioration de 40% de l'efficacité administrative depuis que nous utilisons Archimed. Le retour sur investissement est indéniable.",
        avatar: "/api/placeholder/80/80",
        rating: 4,
    },
    {
        name: "Dr. Jean-Philippe Martin",
        title: "Chirurgien orthopédiste",
        quote: "L'interface est intuitive et les analyses avancées m'aident à suivre l'évolution de mes patients avec une précision que je n'avais jamais eue auparavant.",
        avatar: "/api/placeholder/80/80",
        rating: 5,
    },
    {
        name: "Isabelle Lefèvre",
        title: "Infirmière coordinatrice",
        quote: "La possibilité de partager facilement les informations entre les membres de l'équipe a considérablement amélioré notre coordination. Un outil indispensable pour notre service.",
        avatar: "/api/placeholder/80/80",
        rating: 4,
    },
    {
        name: "Dr. Alexandre Bernard",
        title: "Psychiatre",
        quote: "La confidentialité et la sécurité des données étaient mes principales préoccupations. Archimed a dépassé toutes mes attentes à cet égard. Je recommande vivement.",
        avatar: "/api/placeholder/80/80",
        rating: 5,
    },
];
</script>

<style scoped>
.text-accent {
    color: var(--accent-color);
}
.testinonials {
    padding: 6rem 0;
    background-color: var(--gray);
}
</style>
