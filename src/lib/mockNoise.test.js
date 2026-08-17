// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isNoiseDisabled, NOISE_STORAGE_KEY, setNoiseDisabled } from './mockNoise.js'

afterEach(() => {
  window.localStorage.removeItem(NOISE_STORAGE_KEY)
  vi.unstubAllEnvs()
})

describe('mockNoise — dev-only error-injection kill switch', () => {
  it('is enabled (noise on) by default — no param, no storage flag', () => {
    expect(isNoiseDisabled('')).toBe(false)
    expect(isNoiseDisabled('?state=empty')).toBe(false)
  })

  it('disables noise with ?noisy=0 and ignores other values', () => {
    expect(isNoiseDisabled('?noisy=0')).toBe(true)
    expect(isNoiseDisabled('?noisy=1')).toBe(false)
    expect(isNoiseDisabled('?noisy=')).toBe(false)
  })

  it('coexists with the other demo params (?state=, ?team=)', () => {
    expect(isNoiseDisabled('?noisy=0&state=error')).toBe(true)
    expect(isNoiseDisabled('?team=team_legal&noisy=0')).toBe(true)
    expect(isNoiseDisabled('?team=team_legal&state=empty')).toBe(false)
  })

  it('disables noise via the sticky localStorage flag', () => {
    window.localStorage.setItem(NOISE_STORAGE_KEY, '0')
    expect(isNoiseDisabled('')).toBe(true)
    // The URL flag wins even when the storage flag is stale.
    expect(isNoiseDisabled('?noisy=1')).toBe(true)
  })

  it('re-enables noise when the storage flag is removed', () => {
    window.localStorage.setItem(NOISE_STORAGE_KEY, '0')
    expect(isNoiseDisabled('')).toBe(true)

    window.localStorage.removeItem(NOISE_STORAGE_KEY)
    expect(isNoiseDisabled('')).toBe(false)
  })

  it('setNoiseDisabled toggles the storage flag and reports the new state', () => {
    expect(setNoiseDisabled(true)).toBe(true)
    expect(window.localStorage.getItem(NOISE_STORAGE_KEY)).toBe('0')
    expect(isNoiseDisabled('')).toBe(true)

    expect(setNoiseDisabled(false)).toBe(false)
    expect(window.localStorage.getItem(NOISE_STORAGE_KEY)).toBeNull()
  })

  it('is always inert in production builds, even with param + storage set', () => {
    vi.stubEnv('DEV', false)
    window.localStorage.setItem(NOISE_STORAGE_KEY, '0')

    expect(isNoiseDisabled('?noisy=0')).toBe(false)
  })
})
