/**
 * useQueryParam.js — generic URL-backed single-value query param.
 *
 * Extracts the URL-sync plumbing that useTeamFilterParam (?team=) and
 * useDateRangeParam (?from=/?to=) previously duplicated:
 *
 *   1. initialize state by reading the search string,
 *   2. keep the URL canonical — write the validated value on change with
 *      `replace: true`, preserving every other param (?state=, ?team=, …),
 *   3. re-derive from the URL on back/forward or manual URL edits.
 *
 * Synchronization model (important):
 *   The re-derive effect runs FIRST and, when it adopts a value from the URL
 *   (i.e. the URL changed externally while state was stale), marks the change
 *   as URL-originated. The write effect then skips navigation for that round.
 *   Without this guard, an external navigation lands with a stale value, the
 *   write effect navigates back to the stale value's URL, and the two effects
 *   ping-pong forever — a latent bug the naive structure (and the original
 *   duplicated hooks) had on back/forward.
 *
 * Usage:
 *   const [teamFilter, setTeamFilter] = useQueryParam({
 *     key: 'team',
 *     validate: isValidTeamFilter,   // (raw: string | null) => boolean
 *     defaultValue: 'all',           // value treated as "unset" (key deleted)
 *   })
 *   // [value, setValue] — setValue canonicalizes invalid input to
 *   // defaultValue and supports functional updates, like a useState setter.
 *
 * Custom hooks:
 *   useTeamFilterParam()  → useQueryParam({ key: 'team', ... })   (see below)
 *   Future shareable filters (status, sort, page, …) can reuse this hook;
 *   multi-key params that must update atomically (like ?from=/?to=) keep
 *   their own hook — composing two single-key instances would race the
 *   write effects and clobber the sibling param.
 *
 * Overrides (rarely needed):
 *   read       — (search: string) => value. Default: validated raw value or
 *                defaultValue. Use when the URL form needs parsing (e.g. a
 *                JSON or comma-separated value) into a richer shape.
 *   serialize  — (value) => string | null. Default: null when the value
 *                equals defaultValue (key deleted), else String(value).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Pure extractor: the value from `search` when it passes `validate`, else
 * `defaultValue`. Router-free, so it is usable in tests and non-React code.
 */
export function readQueryParam(search, key, validate, defaultValue) {
  const raw = new URLSearchParams(search).get(key)
  return validate(raw) ? raw : defaultValue
}

/**
 * Returns [value, setValue] where value is derived from and persisted to the
 * `key` query param. `setValue` accepts the next value or an updater function;
 * invalid values fall back to `defaultValue` so the URL stays canonical.
 */
export function useQueryParam({ key, validate, defaultValue, read, serialize }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValueState] = useState(() =>
    read ? read(location.search) : readQueryParam(location.search, key, validate, defaultValue),
  )

  // Refs keep the read/serialize functions stable across renders and track
  // whether the current state change originated from the URL (see the
  // synchronization model in the header comment).
  const readRef = useRef(read)
  readRef.current = read
  const serializeRef = useRef(serialize)
  serializeRef.current = serialize
  const valueRef = useRef(value)
  valueRef.current = value
  const urlOriginRef = useRef(false)

  const derive = (search) =>
    readRef.current
      ? readRef.current(search)
      : readQueryParam(search, key, validate, defaultValue)

  const setValue = useCallback(
    (next) => {
      urlOriginRef.current = false
      setValueState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        return validate(resolved) ? resolved : defaultValue
      })
    },
    [validate, defaultValue],
  )

  // Re-derive from the URL FIRST — back/forward, manual URL edits, and our
  // own navigation landing. When the URL disagrees with state, the URL wins
  // and the change is marked as URL-originated so the write effect stands
  // down for that round (no ping-pong).
  useEffect(() => {
    const derived = derive(location.search)
    if (derived === valueRef.current) {
      urlOriginRef.current = false // in sync — future writes are allowed
      return
    }
    urlOriginRef.current = true
    setValueState(derived)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueRef tracks value
  }, [location.search, key, validate, defaultValue])

  // Keep the URL canonical — write on change, strip invalid values. Skipped
  // for the round where the URL itself supplied the current value.
  useEffect(() => {
    if (urlOriginRef.current) {
      urlOriginRef.current = false
      return
    }

    const params = new URLSearchParams(location.search)
    const serialized = serializeRef.current
      ? serializeRef.current(value)
      : value === defaultValue
        ? null
        : String(value)
    if (serialized === null) params.delete(key)
    else params.set(key, serialized)

    const next = params.toString()
    const current = location.search.replace(/^\?/, '')
    if (next !== current) {
      navigate(`${location.pathname}${next ? `?${next}` : ''}`, { replace: true })
    }
  }, [value, key, defaultValue, location.pathname, location.search, navigate])

  return [value, setValue]
}
