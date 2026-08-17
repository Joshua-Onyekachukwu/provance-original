// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useResource } from './useResource'

/**
 * jsdom supports the Page Visibility API but keeps `visibilityState` at its
 * default ('visible'). We stub the getter per test so the hook's documented
 * pause/catch-up contract can be exercised deterministically.
 */
function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

/**
 * Deterministic flush for the hook's promise chains.
 *
 * RTL's `waitFor` polls on a timer of its own, which vitest's fake timers
 * swallow (globals are off, so RTL can't detect them) — the repo convention
 * is pure-logic fake-timer tests, not RTL waitFor. `act` on the other hand
 * flushes React work + microtasks, so awaiting an empty act settles the
 * initial load and every in-flight poll tick.
 */
async function flush() {
  await act(async () => {})
}

describe('useResource polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('polls the loader on the interval and swaps data in place', async () => {
    const loader = vi.fn().mockResolvedValue('v1')
    const { result } = renderHook(() =>
      useResource(loader, [], { pollMs: 1000 }),
    )

    await flush()
    expect(result.current.status).toBe('ready')
    expect(result.current.data).toBe('v1')
    expect(loader).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    // Three interval windows → three silent polls (status never flips to
    // 'loading' again).
    expect(loader).toHaveBeenCalledTimes(4)
    expect(result.current.status).toBe('ready')
  })

  it('pauses the loop while the tab is hidden and catches up on return', async () => {
    const loader = vi.fn().mockResolvedValue('v1')
    const { result } = renderHook(() =>
      useResource(loader, [], { pollMs: 1000 }),
    )

    await flush()
    expect(loader).toHaveBeenCalledTimes(1)

    // Hidden: interval windows pass but no requests go out.
    setVisibility('hidden')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(loader).toHaveBeenCalledTimes(1)

    // Back visible: the visibilitychange listener fires an immediate
    // catch-up tick, then normal cadence resumes.
    setVisibility('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await flush()
    })
    expect(loader).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(loader).toHaveBeenCalledTimes(4)
  })

  it('keeps last-known-good data when a poll rejects', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockRejectedValueOnce(new Error('network blip'))
    const { result } = renderHook(() =>
      useResource(loader, [], { pollMs: 1000 }),
    )

    await flush()
    expect(result.current.status).toBe('ready')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    // Poll failure is swallowed — status stays 'ready' with the old data.
    expect(result.current.status).toBe('ready')
    expect(result.current.data).toBe('v1')
    expect(result.current.error).toBe('')
  })

  it('idles the loop while the pollWhen gate returns false', async () => {
    const loader = vi.fn().mockResolvedValue('v1')
    const { result } = renderHook(() =>
      useResource(loader, [], { pollMs: 1000, pollWhen: () => false }),
    )

    await flush()
    expect(loader).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('refresh() fetches immediately with silent semantics (no loading flash)', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2')
    const { result } = renderHook(() => useResource(loader, []))

    await flush()
    expect(result.current.status).toBe('ready')
    expect(result.current.data).toBe('v1')

    // Manual refresh swaps data in place — status never leaves 'ready'.
    await act(async () => {
      result.current.refresh()
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.data).toBe('v2')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('refresh() keeps last-known-good data when the fetch rejects', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockRejectedValueOnce(new Error('network blip'))
    const { result } = renderHook(() => useResource(loader, []))

    await flush()
    expect(result.current.data).toBe('v1')

    await act(async () => {
      result.current.refresh()
    })
    // Silent failure — the panel keeps its data and stays ready.
    expect(result.current.status).toBe('ready')
    expect(result.current.data).toBe('v1')
    expect(result.current.error).toBe('')
  })

  it('refresh() forces a tick even when the pollWhen gate is closed', async () => {
    const loader = vi.fn().mockResolvedValue('v1')
    const { result } = renderHook(() =>
      useResource(loader, [], { pollMs: 1000, pollWhen: () => false }),
    )

    await flush()
    expect(loader).toHaveBeenCalledTimes(1)

    // The interval idles (gate closed)…
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(loader).toHaveBeenCalledTimes(1)

    // …but an explicit refresh bypasses the gate — the user asked for now.
    await act(async () => {
      result.current.refresh()
    })
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
