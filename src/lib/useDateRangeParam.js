/**
 * useDateRangeParam.js — URL-backed date range for scoped ledger views.
 *
 * Persists ?from= and ?to= (canonical YYYY-MM-DD) alongside ?team= so a fully
 * scoped view is shareable / linkable, following the useTeamFilterParam
 * pattern (replace:true writes that preserve every other param, re-derivation
 * on back/forward and manual URL edits).
 *
 * Semantics:
 *   - from — inclusive start (scans created on/after that local date)
 *   - to   — inclusive end (scans created on/before that local date)
 *   - invalid or missing values are treated as unset (null)
 *   - from > to filters to zero rows (no scan can satisfy both bounds)
 *
 * Usage:
 *   const [range, setRange] = useDateRangeParam()       // { from, to } | nulls
 *   setRange({ from: '2026-07-01', to: '2026-07-15' })  // deletes keys when null
 *   rows.filter((scan) => inDateRange(scan.created_at, range.from, range.to))
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Returns the value when it is a real calendar date in YYYY-MM-DD, else null. */
export function parseDateParam(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  // Round-trip guard: JS Date overflows (e.g. 2026-02-30 → Mar 2) rather
  // than NaN, so compare the serialized form.
  return date.toISOString().slice(0, 10) === value ? value : null
}

/** Extracts and validates ?from= and ?to= from a search string. */
export function readFromSearch(search) {
  const params = new URLSearchParams(search)
  return {
    from: parseDateParam(params.get('from')),
    to: parseDateParam(params.get('to')),
  }
}

/**
 * Inclusive date-range predicate for a scan's created_at.
 * `from` / `to` are validated YYYY-MM-DD strings or null. Rows without a
 * parseable date pass through rather than being silently dropped.
 */
export function inDateRange(createdAt, from, to) {
  const time = new Date(createdAt).getTime()
  if (Number.isNaN(time)) return true
  if (from && time < new Date(`${from}T00:00:00.000Z`).getTime()) return false
  if (to && time > new Date(`${to}T23:59:59.999Z`).getTime()) return false
  return true
}

/**
 * Returns [range, setRange] where range is derived from and persisted to the
 * ?from= / ?to= query params. setRange({ from, to }) with nulls removes the
 * corresponding keys; any other params (?team=, ?state=) are preserved.
 *
 * Synchronization model: same origin-ref pattern as useQueryParam — the
 * re-derive effect runs FIRST and marks URL-originated state changes, so the
 * write effect never fights an external same-route navigation (manual URL
 * edit / back-forward while History stays mounted). This multi-key hook is
 * intentionally standalone: composing two useQueryParam instances would race
 * the write effects on batched setRange({ from, to }) calls.
 */
export function useDateRangeParam() {
  const navigate = useNavigate()
  const location = useLocation()
  const [range, setRangeState] = useState(() => readFromSearch(location.search))

  const rangeRef = useRef(range)
  rangeRef.current = range
  const urlOriginRef = useRef(false)

  const setRange = (next) => {
    urlOriginRef.current = false
    setRangeState({
      from: parseDateParam(next.from),
      to: parseDateParam(next.to),
    })
  }

  // Re-derive from the URL FIRST — external changes win over stale state.
  useEffect(() => {
    const derived = readFromSearch(location.search)
    if (derived.from === rangeRef.current.from && derived.to === rangeRef.current.to) {
      urlOriginRef.current = false // in sync — future writes are allowed
      return
    }
    urlOriginRef.current = true
    setRangeState(derived)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rangeRef tracks range
  }, [location.search])

  // Keep the URL canonical — write on change, strip invalid values. Skipped
  // for the round where the URL itself supplied the current range.
  useEffect(() => {
    if (urlOriginRef.current) {
      urlOriginRef.current = false
      return
    }

    const params = new URLSearchParams(location.search)
    if (range.from) params.set('from', range.from)
    else params.delete('from')
    if (range.to) params.set('to', range.to)
    else params.delete('to')

    const next = params.toString()
    const current = location.search.replace(/^\?/, '')
    if (next !== current) {
      navigate(`${location.pathname}${next ? `?${next}` : ''}`, { replace: true })
    }
  }, [range.from, range.to, location.pathname, location.search, navigate])

  return [range, setRange]
}
