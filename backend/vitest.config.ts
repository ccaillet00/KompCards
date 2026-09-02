import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    // zod als Named Export (`import { z }`) nicht zuverlässig unter Vitest
    // auflösbar (ESM-Interop) ⇒ durch den Transform pegen.
    server: {
      deps: {
        inline: ['zod'],
      },
    },
  },
});
