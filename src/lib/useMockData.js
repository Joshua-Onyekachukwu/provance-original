/**
 * useMockData.js — mock-mode loader hook, now a thin adapter over useResource.
 *
 * useResource is the app's single polling engine (one implementation of the
 * load / reload / poll / refresh state machine, visibility pause, in-flight
 * guards, last-known-good). This hook adapts the mock dialect to it:
 *
 *   const { data, loading, error, refetch, refresh } = useMockData(mockApiFunction, params)
 *
 * Two seams make the collapse possible:
 *
 * 1. Loader seam — the mock's `(params) => promise` signature is wrapped into
 *    the engine's `() => promise` seam. Params are read from a ref at call
 *    time (never part of the engine deps), so an inline params object that
 *    changes identity per render cannot retrigger the load — callers that
 *    change params call `refetch()` explicitly, exactly like the pre-collapse
 *    contract (see AnalyticsPage's team filter).
 * 2. Vocabulary seam — the engine's `{ status, data, error, reload, refresh }`
 *    is mapped back to the mock dialect `{ data, loading, error, refetch,
 *    refresh }`:
 *    - `loading` ⇔ `status === 'loading'`
 *    - `error` is `null` on success (mock dialect) instead of `''`
 *    - `refetch` ⇔ `reload` with `keepDataOnReload` (mock refetch keeps the
 *      previous data while loading; the real-mode reload blanks by design)
 *    - `refresh` ⇔ the engine's manual silent tick (same last-known-good
 *      semantics as the old poll)
 *    - fallback error text keeps the mock dialect ('An unexpected error
 *      occurred.') via the engine's `errorMessage` option
 *
 * State machine (unchanged from the pre-collapse mock contract):
 *   Initial:     { data: null, loading: true,  error: null }
 *   Success:     { data,       loading: false, error: null }
 *   Error:       { data: prev, loading: false, error: 'message' }
 *   Refetching:  { data: prev, loading: true,  error: null }
 *
 * Polling (`pollMs` > 0) is the engine's silent background loop: in-place
 * data swap, no loading flash, last-known-good on failure, pauses while the
 * tab is hidden — identical to real-mode useResource, which is the point
 * (see pollParity.test.jsx). `refresh()` is the manual twin of a poll tick.
 */

import { useCallback, useRef } from 'react'
import { useResource } from './useResource'

export default function useMockData(mockFn, params = null, options = {}) {
  // Params live in a ref and are read at call time — never an engine dep —
  // preserving the old contract where a params identity change does not
  // auto-reload; callers call refetch() explicitly.
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Loader seam: wrap the mock's (params) => promise into the engine's
  // () => promise. An object is passed even when no params were given, so
  // mock loaders using destructuring defaults like `({ page = 1 } = {})`
  // behave identically (a bare null would throw mid-destructure).
  const loader = useCallback(() => mockFn(paramsRef.current ?? {}), [mockFn])

  const resource = useResource(loader, [mockFn], {
    ...options,
    keepDataOnReload: true,
    errorMessage: 'An unexpected error occurred.',
  })

  return {
    data: resource.data,
    loading: resource.status === 'loading',
    error: resource.error || null,
    refetch: resource.reload,
    refresh: resource.refresh,
  }
}
