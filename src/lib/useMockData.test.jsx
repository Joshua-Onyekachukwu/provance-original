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

  it('passes an object to the loader even with null params (destructuring defaults seam)', async () => {
    // Mock loaders use destructuring defaults like `({ page = 1 } = {})` —
    // the loader seam must hand them an object (not null) or the default
    // never kicks in and the destructure throws.
    const loader = vi.fn().mockResolvedValue({ page: 1 })

    const { result } = renderHook(() => useMockData(loader, null))

    await flush()
    expect(loader).toHaveBeenCalledWith({})
    expect(result.current.data).toEqual({ page: 1 })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('passes the params through to the loader unchanged', async () => {
    const loader = vi.fn().mockResolvedValue({ items: [] })

    const { result } = renderHook(() => useMockData(loader, { page: 3, team: 'core' }))

    await flush()
    expect(loader).toHaveBeenCalledWith({ page: 3, team: 'core' })
    expect(result.current.data).toEqual({ items: [] })
  })

  it('refetch() keeps the previous data while reloading (mock dialect)', async () => {
    // Second load is a deferred we resolve by hand, so the intermediate
    // "refetching" state is observable instead of resolving in the same flush.
    const deferred = {}
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          deferred.resolve = resolve
        }),
      )

    const { result } = renderHook(() => useMockData(loader))

    await flush()
    expect(result.current.data).toEqual({ count: 1 })

    // Refetch re-enters loading but data stays visible — no blank flash.
    await act(async () => {
      result.current.refetch()
      await flush()
    })
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual({ count: 1 })

    await act(async () => {
      deferred.resolve({ count: 2 })
      await flush()
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual({ count: 2 })
  })

  it('refetch() keeps last-known-good data when the reload rejects', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('probe down'))

    const { result } = renderHook(() => useMockData(loader))

    await flush()
    expect(result.current.data).toEqual({ count: 1 })

    await act(async () => {
      result.current.refetch()
    })
    // Error state surfaces, but the previous data is not blanked.
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('probe down')
    expect(result.current.data).toEqual({ count: 1 })
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

  it('refresh() fetches immediately with silent semantics (no loading flash)', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })

    const { result } = renderHook(() => useMockData(loader, null, { pollMs: 5000 }))

    await flush()
    expect(result.current.data).toEqual({ count: 1 })

    // Manual refresh swaps in place — loading never flips back to true.
    await act(async () => {
      result.current.refresh()
    })
    expect(result.current.data).toEqual({ count: 2 })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('refresh() keeps last-known-good data when the fetch rejects', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('probe down'))

    const { result } = renderHook(() => useMockData(loader, null, { pollMs: 5000 }))

    await flush()
    expect(result.current.data).toEqual({ count: 1 })

    await act(async () => {
      result.current.refresh()
    })
    expect(result.current.data).toEqual({ count: 1 })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
