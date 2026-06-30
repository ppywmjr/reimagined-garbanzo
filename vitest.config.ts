import { defineConfig } from 'vitest/config'

const isCI = process.env.CI === 'true'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: isCI ? 120_000 : 60_000,
    fileParallelism: !isCI,
    setupFiles: ['tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/.stryker-tmp/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/helpers/**',
        '**/node_modules/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
})
