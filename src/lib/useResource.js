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
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export function useResource(loader, deps = []) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

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

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
