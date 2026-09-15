import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Frontend unit tests only — the backend has its own jest suite
    // (npm --prefix backend run test). scripts/*.test.mjs covers the
    // zero-dependency Trello CLI's pure helpers (node env, no React).
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.mjs'],
    environment: 'node',
    // Component tests (*.test.jsx under src/components) opt into jsdom with
    // a `// @vitest-environment jsdom` docblock at the top of the file —
    // vitest 4 does not expose environmentMatchGlobs, so the docblock is the
    // stable per-file mechanism. Pure logic tests stay in the fast node env.
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      // Measured baseline 2026-09-15: 60.4% lines / 53.5% branches /
      // 58.8% functions / 62.2% statements across 71 passing test files.
      // Thresholds sit just under HEAD so regressions gate while headroom
      // for refactors remains; ratchet upward as coverage work lands.
      provider: 'v8',
      thresholds: {
        lines: 58,
        branches: 50,
        functions: 55,
        statements: 60,
      },
    },
  },
})
