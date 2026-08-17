// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useResource } from './useResource'
import useMockData from './useMockData'

/**
 * pollParity.test.jsx — shared poll-semantics contract between useResource
 * and useMockData.
 *
 * Both hooks now support the same silent-poll options (`pollMs` + `pollWhen`):
 * a live surface should behave identically in real mode (useResource) and
 * mock mode (useMockData) — the polling UX must not drift when USE_MOCK
 * flips. This suite runs the SAME scenario through both hooks and asserts
 * identical call counts, so a divergence in one hook's pollWhen gating fails
 * here instead of as a demo-only quirk.
 */

async function flush() {
  await act(async () => {})
}

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

describe('pollWhen parity: useResource vs useMockData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('both hooks hold the poll while pollWhen is false against the fetched data', async () => {
    const runScenario = async (hookUnderTest) => {
      // Data never reports active work — the gate stays closed forever.
      const loader = vi.fn().mockResolvedValue({ busy: false })
      const pollWhen = (state) => state.data?.busy === true
      const result = await hookUnderTest(loader, pollWhen)
      return { loader, result }
    }

    const resource = await runScenario((loader, pollWhen) => {
      const { result } = renderHook(() =>
        useResource(loader, [], { pollMs: 1000, pollWhen }),
      )
      return flush().then(() => result)
    })
    const mock = await runScenario((loader, pollWhen) => {
      const { result } = renderHook(() =>
        useMockData(loader, null, { pollMs: 1000, pollWhen }),
      )
      return flush().then(() => result)
    })

    // Ten windows pass — neither hook fires a single poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await flush()

    expect(resource.loader).toHaveBeenCalledTimes(1)
    expect(mock.loader).toHaveBeenCalledTimes(1)
    // Neither hook flipped into a loading/error state from a held poll.
    expect(resource.result.current.status).toBe('ready')
    expect(mock.result.current.loading).toBe(false)
    expect(mock.result.current.error).toBeNull()
  })

  it('both hooks poll while the gate passes and hold the moment the data flips it off', async () => {
    const runScenario = async (hookUnderTest) => {
      // Initial load reports active work (gate on) — the next poll discovers
      // the queue drained (busy:false) and the loop holds from then on.
      const loader = vi
        .fn()
        .mockResolvedValueOnce({ busy: true })
        .mockResolvedValueOnce({ busy: false })
      const pollWhen = (state) => state.data?.busy === true
      const result = await hookUnderTest(loader, pollWhen)
      return { loader, result }
    }

    const resource = await runScenario((loader, pollWhen) => {
      const { result } = renderHook(() =>
        useResource(loader, [], { pollMs: 1000, pollWhen }),
      )
      return flush().then(() => result)
    })
    const mock = await runScenario((loader, pollWhen) => {
      const { result } = renderHook(() =>
        useMockData(loader, null, { pollMs: 1000, pollWhen }),
      )
      return flush().then(() => result)
    })

    // Window 1: gate on → one poll (fetches busy:false, gate now off).
    // Windows 2..5: held. Step one window at a time with a flush between so
    // each poll's data actually lands before the next gate check — bulk
    // advancement would read a stale stateRef for every window.
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      await flush()
    }

    expect(resource.loader).toHaveBeenCalledTimes(2)
    expect(mock.loader).toHaveBeenCalledTimes(2)
    expect(resource.result.current.data).toEqual({ busy: false })
    expect(mock.result.current.data).toEqual({ busy: false })
  })

  it('both hooks agree the poll loop never runs when pollMs is omitted', async () => {
    const runScenario = async (hookUnderTest) => {
      const loader = vi.fn().mockResolvedValue({ busy: true })
      const pollWhen = () => true
      const result = await hookUnderTest(loader, pollWhen)
      return { loader, result }
    }

    const resource = await runScenario((loader, pollWhen) => {
      const { result } = renderHook(() =>
        useResource(loader, [], { pollWhen }),
      )
      return flush().then(() => result)
    })
    const mock = await runScenario((loader, pollWhen) => {
      const { result } = renderHook(() => useMockData(loader, null, { pollWhen }))
      return flush().then(() => result)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await flush()

    expect(resource.loader).toHaveBeenCalledTimes(1)
    expect(mock.loader).toHaveBeenCalledTimes(1)
  })
})
