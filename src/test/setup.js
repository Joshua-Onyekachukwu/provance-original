// Jest-DOM matchers (toBeInTheDocument, toHaveAttribute, …) for the
// @testing-library/react component tests. Registered once here so every
// *.test.jsx file can use them without importing per file.
import '@testing-library/jest-dom/vitest'

// @testing-library/react auto-registers its afterEach(cleanup) only when
// test globals are available. Vitest runs with `globals: false`, so register
// the cleanup explicitly — otherwise rendered DOM accumulates between tests
// and queries hit stale elements from earlier cases.
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
