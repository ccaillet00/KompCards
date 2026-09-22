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

  css: ['~/assets/css/main.css', '~/assets/css/transitions.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  // View Transitions API: root-übergreifender Crossfade beim Seitenwechsel.
  // Kombiniert mit der Vue-Page-Transition (s. assets/css/transitions.css).
  experimental: {
    viewTransition: true,
  },

  app: {
    // Dezente, globale Übergänge (CSS in assets/css/transitions.css).
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      title: 'KompCards',
      htmlAttrs: { lang: 'de' },
      bodyAttrs: { 'data-theme': 'kompcards' },
      meta: [
        { name: 'description', content: 'KompCards macht deine beruflichen Kompetenzen sichtbar.' },
        { name: 'theme-color', content: '#fdfbf6' },
      ],
    },
  },

  // Öffentliche Konfiguration (bündelbar). API-Basis default /api (same-origin).
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api',
    },
  },

  // Dev-Proxy: /api → Backend (localhost:4000).
  // Bildet die Produktions-Architektur (Traefik, same-origin) lokal ab —
  // der Browser spricht nur mit dem Nuxt-Dev-Server, kein CORS nötig.
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  },
})
