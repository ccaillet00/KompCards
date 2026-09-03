import { defineVitestConfig } from '@nuxt/test-utils/config'

// Komponententests im Nuxt-Umfeld (vitest-environment-nuxt).
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        rootDir: new URL('./', import.meta.url).pathname,
      },
    },
    include: ['tests/**/*.test.ts'],
  },
})
