export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  ssr: false,
  modules: [
    "@nuxtjs/tailwindcss",
    "nuxt-vuefire",
    "@unlok-co/nuxt-stripe",
    "nuxt-lucide-icons",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
  ],
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    public: {
      TRANSCRIPTION_API_URL: process.env.TRANSCRIPTION_API_URL || "http://localhost:8080",
    },
  },
  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: true,
    },
    config: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementID: process.env.FIREBASE_MEASUREMENTID,
    },
  },
  pinia: {
    storesDirs: ["./stores/**", "./stores/modules/"],
  },
  stripe: {
    server: {
      key:
        process.env.NODE_ENV === "development"
          ? process.env.STRIPE_SECRET_KEY_TEST
          : process.env.STRIPE_SECRET_KEY,
      options: {},
    },
    client: {
      key:
        process.env.NODE_ENV === "development"
          ? process.env.STRIPE_PUBLISHABLE_KEY_TEST
          : process.env.STRIPE_PUBLISHABLE_KEY,
      options: {},
    },
  },

  i18n: {
    vueI18n: "./i18n.config.ts",
    locales: [
      {
        code: "fr",
        name: "Français",
        file: "fr.json",
      },
      {
        code: "en",
        name: "English",
        file: "en.json",
      },
    ],
    defaultLocale: "fr",
    lazy: true,
    langDir: "locales/",
    strategy: "prefix_except_default",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
    baseUrl: "localhost:3000",
  },

  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
    },
  },

  nitro: {
    devProxy: {
      "/ws": {
        target: "ws://localhost:8080/",
        ws: true,
      },
    },
  },
});
