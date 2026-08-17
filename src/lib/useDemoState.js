/**
 * useDemoState.js — dev-only state forcing for reviewing the dashboard's
 * loading / empty / error surfaces without relying on the mock's random
 * error injection.
 *
 * Usage:
 *   const demoState = useDemoState()   // 'loading' | 'empty' | 'error' | null
 *   const scans = withDemoOverride(rawScans, demoState, { emptyData: [] })
 *
 * URL param:  ?state=loading | ?state=empty | ?state=error
 * Toggle:     render <DemoStateBanner> (see AppDashboardPage) to switch
 *             states without editing the URL.
 *
 * In production builds (import.meta.env.DEV === false) this module is fully
 * inert — useDemoState always returns null and overrides never apply.
 */

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const VALID_STATES = ['loading', 'empty', 'error']

/**
 * Reads the `?state=` query param and returns one of the valid demo states,
 * or null when unset/invalid (or in production builds).
 */
export function useDemoState() {
  const location = useLocation()

  return useMemo(() => {
    if (!import.meta.env.DEV) return null
    const value = new URLSearchParams(location.search).get('state')
    return VALID_STATES.includes(value) ? value : null
  }, [location.search])
}

/**
 * Combines useDemoState with the URL-syncing select handler used by the
 * DemoStateBanner, so every page drives the same `?state=` param the same way:
 *
 *   const { demoState, selectDemoState } = useDemoStateControl()
 *   <DemoStateBanner demoState={demoState} onSelect={selectDemoState} />
 *
 * In production builds this is fully inert (useDemoState returns null and
 * selectDemoState never mutates the URL — both short-circuit on !DEV).
 */
export function useDemoStateControl() {
  const location = useLocation()
  const navigate = useNavigate()
  const demoState = useDemoState()

  const selectDemoState = useCallback(
    (value) => {
      if (!import.meta.env.DEV) return
      const params = new URLSearchParams(location.search)
      if (value) params.set('state', value)
      else params.delete('state')
      const search = params.toString()
      navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true })
    },
    [location.pathname, location.search, navigate],
  )

  return { demoState, selectDemoState }
}

/**
 * Wraps a useResource state object, forcing the requested demo status:
 *   - 'loading' → status forced to 'loading' (skeletons render)
 *   - 'error'   → status forced to 'error' with an explanatory message
 *   - 'empty'   → status forced to 'ready' with the provided emptyData, so
 *                 derived "empty" branches (length === 0 checks) trigger
 */
export function withDemoOverride(resource, demoState, { emptyData = null } = {}) {
  if (!demoState) return resource

  if (demoState === 'loading') {
    return { ...resource, status: 'loading', data: resource.data, error: '' }
  }
  if (demoState === 'error') {
    return {
      ...resource,
      status: 'error',
      data: resource.data,
      error: 'Demo state — forced error for review. This is not a real outage.',
    }
  }
  // empty
  return { ...resource, status: 'ready', data: emptyData, error: '' }
}
