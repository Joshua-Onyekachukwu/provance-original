import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Frontend unit tests only — the backend has its own jest suite
    // (npm --prefix backend run test).
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
})
