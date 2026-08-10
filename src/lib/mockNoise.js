/**
 * mockNoise.js — dev-only control for the mock API's random error injection.
 *
 * The mock layer throws occasional simulated transient errors (maybeError in
 * mockApi.js) so every surface's error state is demoable. During interactive
 * demos that noise can reset state at awkward moments (e.g. changing the team
 * filter or flipping demo states). Suppress it with either:
 *
 *   - ?noisy=0 in the URL                  (shareable, per-page)
 *   - localStorage['provance.mock.noisy.v1'] = '0' (sticky across reloads)
 *
 * Both are inert in production builds (import.meta.env.DEV gate), matching the
 * ?state= / ?quota= demo-param precedent in useDemoState.js and mockApi.js.
 */

export const NOISE_STORAGE_KEY = 'provance.mock.noisy.v1'

function noisyParamDisabled(search) {
  return new URLSearchParams(search).get('noisy') === '0'
}

function noisyStorageDisabled() {
  try {
    return window.localStorage.getItem(NOISE_STORAGE_KEY) === '0'
  } catch {
    // Storage unavailable — the URL flag still works.
    return false
  }
}

/**
 * True when random error injection should be suppressed. Dev-only — always
 * false in production builds. `search` defaults to the live URL's query
 * string and is overridable for tests.
 */
export function isNoiseDisabled(search = typeof window !== 'undefined' ? window.location.search : '') {
  if (!import.meta.env.DEV) return false
  return noisyParamDisabled(search) || noisyStorageDisabled()
}

/** Sticky localStorage toggle; returns the new effective state. */
export function setNoiseDisabled(disabled) {
  try {
    if (disabled) window.localStorage.setItem(NOISE_STORAGE_KEY, '0')
    else window.localStorage.removeItem(NOISE_STORAGE_KEY)
  } catch {
    // Storage unavailable — the URL flag still works.
  }
  return isNoiseDisabled()
}
