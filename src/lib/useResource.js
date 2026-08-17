/**
 * useResource.js — shared per-slice loader hook.
 *
 * Gives every workspace page the same loading / error / ready state machine
 * (plus derived empty states) with a stable `reload()` for retries — so new
 * pages don't need hand-rolled useEffect/useState plumbing.
 *
 * Usage:
 *   const scans = useResource(() => listScans().then((r) => r.data || []))
 *   const detail = useResource(() => getScan(scanId).then((r) => r?.scan || r), [scanId])
 *
 * Returns:
 *   { status: 'loading' | 'ready' | 'error', data, error, reload }
 *
 * - status 'loading' while the loader promise is pending
 * - status 'ready' with the resolved value in `data` on success
 * - status 'error' with a message on failure
 * - reload() re-runs the loader (wire it to Retry buttons)
 *
 * `deps` is optional: pass the values the loader closes over (e.g. [scanId])
 * and the resource reloads automatically when they change. Omit it (or pass
 * []) to load once on mount.
 *
 * Note: deps go straight into the effect dependency array, so pass only
 * stable/primitive values (strings, numbers, booleans). An inline object or
 * array literal would change identity every render and trigger refetch loops.
 *
 * Polling — pass a third `options` argument to turn the resource into a live
 * surface:
 *
 *   useResource(loader, [], { pollMs: 5000, pollWhen: (state) => busy(state.data) })
 *
 * - `pollMs` (> 0): silent background refresh interval. Unlike reload(), a
 *   poll never flashes the loading state — it swaps in fresh data in place,
 *   and keeps the last-known-good data (status stays 'ready') if a poll
 *   fails, so a transient network blip can't blank a live panel.
 * - `pollWhen` (optional): a predicate over the current resource state. When
 *   it returns false the poll loop idles, so surfaces can stop polling once
 *   the work they track finishes (e.g. only poll while scans are queued or
 *   processing). Defaults to always-on when pollMs is set.
 * - Polls are skipped while one is already in flight, and the loop pauses
 *   while the tab is hidden (a visibilitychange tick catches up on return).
 *
 * Note: the gate evaluates the resource's internal state, so dev-only demo
 * forcing (?state=empty|error via withDemoOverride) does not idle the polls
 * — they continue underneath while the forced display wins. Inert in
 * production builds, where ?state= is not read.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export function useResource(loader, deps = [], options = {}) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  // Refs keep the poll loop on the latest loader / gate / state without
  // restarting the interval every render.
  const stateRef = useRef(state)
  stateRef.current = state
  const pollWhenRef = useRef(options.pollWhen)
  pollWhenRef.current = options.pollWhen
  const pollMs = options.pollMs || 0

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null, error: '' })

    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error: error?.message || 'Failed to load.',
          })
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps])

  // ── Silent background polling ────────────────────────────────────────────
  // Restarts alongside the core effect (attempt/deps), so a manual reload
  // also re-syncs the poll cadence.
  useEffect(() => {
    if (!pollMs || pollMs <= 0) return undefined

    let cancelled = false
    let inFlight = false

    const tick = async () => {
      if (cancelled || inFlight) return
      // Documented contract: the loop pauses while the tab is hidden (no
      // wasted background requests) and catches up on return — the
      // visibilitychange listener fires an immediate tick when visible again.
      // An explicit gate (not just browser timer throttling) guarantees the
      // pause in every environment, including non-throttled ones.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      inFlight = true
      try {
        // Gate checked inside the try so a throwing predicate is caught (and
        // logged) instead of surfacing as an unhandled rejection.
        const gate = pollWhenRef.current
        if (gate && !gate(stateRef.current)) return

        const data = await loaderRef.current()
        if (!cancelled) {
          setState((prev) =>
            // Never clobber an in-progress manual load with a poll result.
            prev.status === 'loading' ? prev : { status: 'ready', data, error: '' },
          )
        }
      } catch (error) {
        // Keep the last-known-good data — a transient poll failure should not
        // flip a live panel to its error state.
        if (!cancelled && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            '[useResource] background poll failed; keeping last-known-good data:',
            error?.message || error,
          )
        }
      } finally {
        inFlight = false
      }
    }

    const interval = window.setInterval(tick, pollMs)
    // Catch up immediately when the tab becomes visible again.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, attempt, ...deps])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
