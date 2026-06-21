// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'vitest',
  // Explicitly load the plugin — required with pnpm's strict node_modules layout
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: {
    // Uses a dedicated config that runs only unit tests. Integration tests are
    // excluded because they require Docker (testcontainers), making per-mutant
    // runs impractically slow.
    configFile: 'vitest.stryker.config.ts',
  },
  // Only mutate application source files, not tests or generated code
  mutate: [
    'src/**/*.ts',
    '!src/index.ts',        // Entry point — no logic to mutate
    '!src/app.ts',          // Pure middleware wiring — no domain logic
    '!src/lib/prisma.ts',   // Prisma singleton factory — no domain logic
  ],
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  timeoutMS: 10_000,
  timeoutFactor: 2,
}

export default config

