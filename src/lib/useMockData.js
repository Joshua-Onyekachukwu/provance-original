/**
 * useMockData.js — React hook for loading mock data with realistic state transitions.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useMockData(mockApiFunction, params)
 *
 * State machine:
 *   Initial:     { data: null, loading: true,  error: null }
 *   Success:     { data,       loading: false, error: null }
 *   Error:       { data: null, loading: false, error: 'message' }
 *   Refetching:  { data: prev, loading: true,  error: null }
 *
 * refetch() reloads from the same source, preserving previous data while loading.
 * refresh() (when pollMs is set) is the manual twin of a poll tick — silent
 * in-place swap, no loading flash, last-known-good on failure — for the live
 * indicator's tap-to-refresh affordance (see useResource's refresh contract).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export default function useMockData(mockFn, params = null, options = {}) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  })

  const paramsRef = useRef(params)
  paramsRef.current = params

  const pollMs = options.pollMs || 0
  const pollWhenRef = useRef(options.pollWhen)
  pollWhenRef.current = options.pollWhen
  const stateRef = useRef(state)
  stateRef.current = state

  const isMountedRef = useRef(true)
  const fetchIdRef = useRef(0)

  const execute = useCallback(
    async (isRefetch = false) => {
      fetchIdRef.current += 1
      const thisFetchId = fetchIdRef.current

      if (!isRefetch) {
        setState({ data: null, loading: true, error: null })
      } else {
        setState((prev) => ({ data: prev.data, loading: true, error: null }))
      }

      try {
        // Pass an object even when no params were given: mock loaders use
        // destructuring defaults like `({ page = 1 } = {})`, which only kick
        // in for `undefined` — a bare `null` would throw mid-destructure.
        const result = await mockFn(paramsRef.current ?? {})

        if (!isMountedRef.current || thisFetchId !== fetchIdRef.current) {
          return
        }

        setState({ data: result, loading: false, error: null })
      } catch (err) {
        if (!isMountedRef.current || thisFetchId !== fetchIdRef.current) {
          return
        }

        setState({
          data: null,
          loading: false,
          error: err.message || 'An unexpected error occurred.',
        })
      }
    },
    [mockFn],
  )

  const refetch = useCallback(() => {
    execute(true)
  }, [execute])

  useEffect(() => {
    isMountedRef.current = true
    execute(false)

    return () => {
      isMountedRef.current = false
    }
  }, [execute])

  // ── Silent background polling (optional, pollMs > 0) ─────────────────────
  // Same contract as useResource's poll: swaps fresh data in place without
  // ever flashing the loading state, and keeps last-known-good data if a poll
  // fails — so a live panel (e.g. admin monitoring) can track worker progress
  // without flickering or blanking on a transient error.
  const poll = useCallback(async () => {
    fetchIdRef.current += 1
    const thisFetchId = fetchIdRef.current
    try {
      const result = await mockFn(paramsRef.current ?? {})
      if (isMountedRef.current && thisFetchId === fetchIdRef.current) {
        setState({ data: result, loading: false, error: null })
      }
    } catch {
      if (isMountedRef.current && thisFetchId === fetchIdRef.current) {
        // Keep last-known-good — a transient poll failure must not flip a
        // live panel into its error state.
        setState((prev) => ({ ...prev, error: null }))
      }
    }
  }, [mockFn])

  useEffect(() => {
    if (!pollMs || pollMs <= 0) return undefined

    let cancelled = false
    let inFlight = false

    const tick = async () => {
      if (cancelled || inFlight) return
      const gate = pollWhenRef.current
      if (gate && !gate(stateRef.current)) return
      inFlight = true
      try {
        await poll()
      } finally {
        inFlight = false
      }
    }

    const interval = window.setInterval(tick, pollMs)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, poll])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    // refresh = the silent poll tick, exposed for the live indicator's
    // tap-to-refresh affordance: same in-place swap semantics as useResource's
    // refresh (no loading flash, last-known-good on failure). refetch() stays
    // for Retry buttons, which re-enter the loading state.
    refresh: poll,
  }
}
