// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useMockData from './useMockData'

/**
 * Deterministic flush for the hook's promise chains — same convention as
 * useResource.test.jsx: awaiting an empty act settles the initial load and
 * every in-flight poll tick (fake timers + pure-logic assertions, no RTL
 * waitFor).
 */
async function flush() {
  await act(async () => {})
}

describe('useMockData polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('swaps data in place on a poll tick without flashing loading', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })

    const { result } = renderHook(() => useMockData(loader, null, { pollMs: 5000 }))

    await flush()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual({ count: 1 })

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    await flush()

    // Silent swap: data updated, loading never flipped back to true.
    expect(loader).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual({ count: 2 })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('keeps last-known-good data when a poll fails', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('probe down'))

    const { result } = renderHook(() => useMockData(loader, null, { pollMs: 5000 }))

    await flush()
    expect(result.current.data).toEqual({ count: 1 })

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    await flush()

    // A failed poll must not blank the panel or flip it to the error state.
    expect(result.current.data).toEqual({ count: 1 })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does not poll when pollMs is omitted (backwards compatible)', async () => {
    const loader = vi.fn().mockResolvedValue({ count: 1 })

    const { result } = renderHook(() => useMockData(loader))

    await flush()
    expect(result.current.data).toEqual({ count: 1 })

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    await flush()

    expect(loader).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual({ count: 1 })
  })
})
