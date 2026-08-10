import { describe, expect, it } from 'vitest'
import { applyToggle, countFlagKpis } from './flagToggle.js'

const FLAGS = [
  { key: 'deep_scan_mode', label: 'Deep Scan Mode', enabled: true, exposure: 'all_users' },
  { key: 'team_workspaces', label: 'Team Workspaces', enabled: true, exposure: 'org_admins' },
  { key: 'new_uploader', label: 'New Uploader', enabled: false, exposure: 'internal' },
]

describe('applyToggle', () => {
  it('flips only the target flag and leaves the rest untouched', () => {
    const next = applyToggle(FLAGS, 'team_workspaces', false)

    expect(next).toHaveLength(FLAGS.length)
    expect(next.find((f) => f.key === 'team_workspaces').enabled).toBe(false)
    expect(next.find((f) => f.key === 'deep_scan_mode').enabled).toBe(true)
    expect(next.find((f) => f.key === 'new_uploader').enabled).toBe(false)
  })

  it('returns a new array (immutable) — the source rows are never mutated', () => {
    const next = applyToggle(FLAGS, 'deep_scan_mode', false)

    expect(next).not.toBe(FLAGS)
    expect(FLAGS.find((f) => f.key === 'deep_scan_mode').enabled).toBe(true)
  })

  it('toggles in both directions', () => {
    expect(applyToggle(FLAGS, 'new_uploader', true).find((f) => f.key === 'new_uploader').enabled).toBe(
      true,
    )
    expect(applyToggle(FLAGS, 'deep_scan_mode', false).find((f) => f.key === 'deep_scan_mode').enabled).toBe(
      false,
    )
  })

  it('is a no-op for an unknown key (full pass-through)', () => {
    const next = applyToggle(FLAGS, 'missing_key', true)
    expect(next).toEqual(FLAGS)
  })

  // Stale-closure contract: the page applies updates through
  // `updater(current || rowsRef.current)`, so the updater must be safe when the
  // working copy is null (not yet seeded / reset by a fresh fetch) and must
  // never produce an empty table from a stale closure.
  it('produces a full toggled set when the working copy is null (fresh/fallback path)', () => {
    const latestRows = FLAGS
    const updater = (current) => applyToggle(current || latestRows, 'deep_scan_mode', false)

    const result = updater(null)

    expect(result).toHaveLength(latestRows.length) // never blanks the table
    expect(result.find((f) => f.key === 'deep_scan_mode').enabled).toBe(false)
    expect(result.find((f) => f.key === 'team_workspaces').enabled).toBe(true)
  })

  it('applies on top of an existing working copy without losing prior toggles', () => {
    const working = applyToggle(FLAGS, 'team_workspaces', false) // first optimistic flip
    const updater = (current) => applyToggle(current || FLAGS, 'deep_scan_mode', false)

    const result = updater(working)

    expect(result.find((f) => f.key === 'team_workspaces').enabled).toBe(false) // prior kept
    expect(result.find((f) => f.key === 'deep_scan_mode').enabled).toBe(false) // new applied
    expect(result).toHaveLength(FLAGS.length)
  })
})

describe('countFlagKpis', () => {
  it('counts total / enabled / disabled / high-exposure', () => {
    expect(countFlagKpis(FLAGS)).toEqual({
      total: 3,
      enabled: 2,
      disabled: 1,
      highExposure: 1,
    })
  })

  it('tracks an optimistic flip in lockstep with the working copy', () => {
    const working = applyToggle(FLAGS, 'deep_scan_mode', false)
    expect(countFlagKpis(working)).toEqual({ total: 3, enabled: 1, disabled: 2, highExposure: 1 })
  })

  it('is zero-safe on an empty list', () => {
    expect(countFlagKpis([])).toEqual({ total: 0, enabled: 0, disabled: 0, highExposure: 0 })
  })
})
