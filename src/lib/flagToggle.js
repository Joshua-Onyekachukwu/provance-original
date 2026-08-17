/**
 * flagToggle.js — pure helpers for the Feature Flags page's optimistic toggle
 * working-copy logic (src/pages/admin/FeatureFlagsPage.jsx).
 *
 * The page keeps a local `workingRows` copy so a toggle flips immediately and
 * the KPI counts stay in lockstep, then reverts on API failure. These helpers
 * are the single source for that mapping/counting so the behavior is
 * unit-testable without rendering the page.
 *
 * Stale-closure contract: the page seeds `workingRows` from the latest fetch
 * and applies updates through `updater(current || rowsRef.current)` — the
 * updater must therefore be safe to call with `null` (working copy not yet
 * seeded / a fresh fetch reset it) and must never produce an empty/blank table
 * from a stale closure. `applyToggle` maps whatever rows it is given, so the
 * fallback to the latest rows always yields a full toggled set.
 */

/**
 * Flip `enabled` on the flag with the given key, returning a NEW array; all
 * other rows are passed through untouched (immutable update).
 */
export function applyToggle(rows, key, enabled) {
  return rows.map((flag) => (flag.key === key ? { ...flag, enabled } : flag))
}

/**
 * KPI counts over a flag list — the Enabled/Disabled/High-Exposure numbers the
 * page derives from the working copy (never the stale source rows), so the
 * counts track the optimistic table exactly.
 */
export function countFlagKpis(rows) {
  const total = rows.length
  const enabled = rows.filter((flag) => flag.enabled).length
  const disabled = rows.filter((flag) => !flag.enabled).length
  const highExposure = rows.filter((flag) => flag.exposure === 'all_users').length
  return { total, enabled, disabled, highExposure }
}
