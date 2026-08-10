/**
 * useTeamFilterParam.js — URL-backed team filter for the workspace surfaces
 * (scan ledger, queue, reports) and the admin Users/Organizations/Analytics
 * views.
 *
 * Persists the active team filter in the query string (?team=team_legal) so
 * the selection survives navigation and is shareable / linkable, following
 * the existing ?state= demo-param pattern. The two params are independent
 * and coexist (e.g. /app/queue?team=team_legal&state=empty).
 *
 * Implementation note: all URL-sync plumbing lives in the generic
 * useQueryParam hook (see src/lib/useQueryParam.js) — this module only
 * supplies the key, the validator, and the default, plus the pure helpers
 * below for router-free reads.
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

import { TEAM_IDS } from '../components/app/scanPresentation.js'
import { readQueryParam, useQueryParam } from './useQueryParam.js'

/** 'all' + the known workspace team ids (see scanPresentation.TEAM_IDS). */
export const TEAM_FILTER_VALUES = ['all', ...TEAM_IDS]

/** True when the value is 'all' or a known team id — used to validate ?team=. */
export function isValidTeamFilter(value) {
  return TEAM_FILTER_VALUES.includes(value)
}

export function readFromSearch(search) {
  return readQueryParam(search, 'team', isValidTeamFilter, 'all')
}

/**
 * Returns [teamFilter, setTeamFilter] where teamFilter is derived from and
 * persisted to the ?team= query param.
 */
export function useTeamFilterParam() {
  return useQueryParam({
    key: 'team',
    validate: isValidTeamFilter,
    defaultValue: 'all',
  })
}
