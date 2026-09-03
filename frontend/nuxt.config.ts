// KompCards Frontend — Nuxt 4
//
// Grundgerüst: Design & Features folgen in einem zweiten Schritt.
// Same-origin-API: /api wird vom Traefik-Reverse-Proxy ans Backend geroutet
// (keine lokale Proxy-Konfiguration nötig, s. ADR-009).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  // @nuxt/test-utils: aktiviert nur im Test-Umfeld (vitest-environment-nuxt).
  modules: ['@nuxt/test-utils/module'],

  css: ['~/assets/css/main.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  app: {
    head: {
      title: 'KompCards',
      htmlAttrs: { lang: 'de' },
    },
  },

  // Öffentliche Konfiguration (bündelbar). API-Basis default /api (same-origin).
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api',
    },
  },
})
