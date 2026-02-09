import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // E2E spins up a Next dev server and uses Playwright.
    pool: 'threads',
    fileParallelism: false,
  },
});
