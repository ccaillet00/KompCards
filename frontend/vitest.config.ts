import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'

// Komponententests im Nuxt-Umfeld (vitest-environment-nuxt).
export default defineConfig({
  plugins: [
    Vue({
      isProduction: false,
    }),
  ],
  test: {
    environment: 'nuxt',
    include: ['tests/**/*.test.ts'],
  },
})
