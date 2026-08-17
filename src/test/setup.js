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

// jsdom does not implement window.matchMedia — stub it so components that
// gate pointer/reduced-motion behavior (InteractivePanel tilt, hero motion,
// …) can render in tests. Default: no fine pointer, no reduced motion.
// jsdom does not implement IntersectionObserver — stub it so framer-motion
// whileInView blocks (landing sections) mount in tests. The stub never fires,
// so hidden/visible states stay static, which is all a render test needs.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback
      this.options = options
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

afterEach(() => {
  cleanup()
})
