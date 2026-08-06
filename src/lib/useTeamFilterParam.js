/**
 * useTeamFilterParam.js — URL-backed team filter for the workspace surfaces
 * (scan ledger, queue, reports).
 *
 * Persists the active team filter in the query string (?team=team_legal) so
 * the selection survives navigation and is shareable / linkable, following
 * the existing ?state= demo-param pattern. The two params are independent
 * and coexist (e.g. /app/queue?team=team_legal&state=empty).
 *
 * Usage:
 *   const [teamFilter, setTeamFilter] = useTeamFilterParam()
 *   <TeamFilter value={teamFilter} onChange={setTeamFilter} />
 *
 * Behavior:
 *   - Reads ?team= on mount; invalid or unknown values fall back to 'all'.
 *   - Updating the filter rewrites the URL (replace: true, preserving any
 *     other params such as ?state=), so the link is always shareable.
 *   - On a change to the search string (mounts, back/forward, manual URL
 *     edits) the filter re-derives from the URL.
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TEAM_IDS } from '../components/app/scanPresentation.js'

/** 'all' + the known workspace team ids (see scanPresentation.TEAM_IDS). */
export const TEAM_FILTER_VALUES = ['all', ...TEAM_IDS]

/** True when the value is 'all' or a known team id — used to validate ?team=. */
export function isValidTeamFilter(value) {
  return TEAM_FILTER_VALUES.includes(value)
}

export function readFromSearch(search) {
  const value = new URLSearchParams(search).get('team')
  return isValidTeamFilter(value) ? value : 'all'
}

/**
 * Returns [teamFilter, setTeamFilter] where teamFilter is derived from and
 * persisted to the ?team= query param.
 */
export function useTeamFilterParam() {
  const navigate = useNavigate()
  const location = useLocation()
  const [teamFilter, setTeamFilter] = useState(() => readFromSearch(location.search))

  // Keep the URL canonical — write on change, strip invalid values.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (teamFilter === 'all') params.delete('team')
    else params.set('team', teamFilter)

    const next = params.toString()
    const current = location.search.replace(/^\?/, '')
    if (next !== current) {
      navigate(`${location.pathname}${next ? `?${next}` : ''}`, { replace: true })
    }
  }, [teamFilter, location.pathname, location.search, navigate])

  // Re-derive on back/forward or manual URL edits.
  useEffect(() => {
    setTeamFilter(readFromSearch(location.search))
  }, [location.search])

  return [teamFilter, setTeamFilter]
}
