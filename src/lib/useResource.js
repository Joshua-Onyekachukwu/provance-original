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
 *   { status: 'loading' | 'ready' | 'error', data, error, reload, refresh }
 *
 * - status 'loading' while the loader promise is pending
 * - status 'ready' with the resolved value in `data` on success
 * - status 'error' with a message on failure
 * - reload() re-runs the loader (wire it to Retry buttons) — this re-enters
 *   the loading state (data blanks briefly)
 * - refresh() fetches immediately with SILENT semantics (same as a poll
 *   tick): in-place data swap, no loading flash, keeps last-known-good on
 *   failure. Wire it to the live indicator's tap-to-refresh affordance —
 *   unlike reload() it never blanks a live panel.
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
 * - refresh() (see Returns) is the manual twin of a poll tick: an explicit
 *   user action that fetches immediately regardless of the pollWhen gate or
 *   the tab-hidden pause (the user asked for fresh data now).
 *
 * Note: the gate evaluates the resource's internal state, so dev-only demo
 * forcing (?state=empty|error via withDemoOverride) does not idle the polls
 * — they continue underneath while the forced display wins. Inert in
 * production builds, where ?state= is not read.
 *
 * ── One engine, two vocabularies ─────────────────────────────────────────
 * This hook is the single polling engine for the app. useMockData is a thin
 * adapter over it (mock loader wrapped into the () => promise seam, params
 * read from a ref at call time) that maps this status vocabulary back to the
 * mock dialect ({ loading, refetch }) — so real mode and mock mode can never
 * drift: one implementation of the poll loop, two return shapes. See
 * useMockData.js and pollParity.test.jsx.
 *
 * Two engine options exist solely to preserve the mock dialect:
 * - `keepDataOnReload` (default false): when true, reload()/deps-triggered
 *   reloads keep the previous data while re-entering the loading state
 *   (the mock's refetch semantics). Real-mode reload blanks data by design.
 * - `errorMessage` (default 'Failed to load.'): the fallback error string
 *   when a thrown error carries no message. useMockData passes the mock
 *   dialect's 'An unexpected error occurred.'.
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
  // Mock-dialect options (see header): keep prior data through a reload, and
  // the fallback error string when a thrown error has no message.
  const keepDataOnReloadRef = useRef(options.keepDataOnReload === true)
  keepDataOnReloadRef.current = options.keepDataOnReload === true
  const errorMessageRef = useRef(options.errorMessage || 'Failed to load.')
  errorMessageRef.current = options.errorMessage || 'Failed to load.'

  useEffect(() => {
    let cancelled = false
    // Capture the pre-reload data once: with keepDataOnReload the mock's
    // refetch semantics keep prior data through the loading state (and on a
    // reload failure, where the panel must not blank to null).
    const previousData = keepDataOnReloadRef.current ? stateRef.current.data : null
    setState((prev) => ({
      status: 'loading',
      data: keepDataOnReloadRef.current ? prev.data : null,
      error: '',
    }))

    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            data: keepDataOnReloadRef.current ? previousData : null,
            error: error?.message || errorMessageRef.current,
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

  // ── Manual refresh (the live indicator's tap-to-refresh affordance) ──────
  // An explicit user action: fetch fresh data immediately with the same
  // silent semantics as a poll tick (in-place swap, no loading flash,
  // last-known-good on failure) — unlike reload(), which re-enters the
  // loading state and blanks the panel. Bypasses the pollWhen gate and the
  // tab-hidden pause on purpose: the user asked for fresh data now. Skips
  // while one refresh is already in flight, mirroring the poll's inFlight
  // guard.
  const refreshingRef = useRef(false)
  const refresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    try {
      const data = await loaderRef.current()
      setState((prev) =>
        // Never clobber an in-progress manual load with a refresh result.
        prev.status === 'loading' ? prev : { status: 'ready', data, error: '' },
      )
    } catch (error) {
      // Keep the last-known-good data — a transient failure must not blank
      // a live panel or flip it to the error state.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useResource] manual refresh failed; keeping last-known-good data:',
          error?.message || error,
        )
      }
    } finally {
      refreshingRef.current = false
    }
  }, [])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload, refresh }
}
