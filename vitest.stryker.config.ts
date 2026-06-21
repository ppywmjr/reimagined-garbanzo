import { defineConfig } from 'vitest/config'

// Vitest config used exclusively by Stryker mutation testing.
// Integration tests are excluded because they require a running Docker container
// (via testcontainers), which makes per-mutant test runs impractically slow.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
})
