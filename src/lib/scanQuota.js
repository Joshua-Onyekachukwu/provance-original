/**
 * scanQuota.js — pure VU (verification-unit) quota helpers for the dashboard's
 * ≥85% warning chip and the Billing page's projection StatCard. Kept in its
 * own module (not a component file) so fast-refresh and unit tests can import
 * the functions without the page's component graph.
 *
 * The input is the billing usage shape ({ unitsUsed, unitsLimit }) produced
 * by GET /v1/billing — the same resolveUsage source of truth the Billing
 * page and the initiateScan quota gate consume. VUs are the ratified meter
 * (quick 1 · standard 10 · deep 100 per scan); the legacy scansUsed/scansLimit
 * fields were dropped when the frontend switched to units.
 */

/**
 * scanQuotaPct — the current cycle's VU-allowance utilization as a 0..100
 * integer. Returns null when no usable limit exists so the warning chip
 * simply doesn't render.
 */
export function scanQuotaPct(usage) {
  const used = Number(usage?.unitsUsed)
  const limit = Number(usage?.unitsLimit)
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null
  return Math.min(100, Math.round((used / limit) * 100))
}

const DAY_MS = 86_400_000

/**
 * Per-unit overage price (USD) applied to projected usage above the plan's
 * monthly VU allowance — the frontend mirror of the backend's
 * VU_OVERAGE_PRICE_USD (billing.service.ts). The 0.0006 default aligns with
 * the volume-priced VU bands in USAGE_CREDITS_PROPOSAL.md.
 */
export const VU_OVERAGE_PRICE_USD = 0.0006

/**
 * projectScanUsage — end-of-cycle VU projection from the current usage pace.
 *
 * Frontend mirror of the backend's projectScanUsage (billing.service.ts) so
 * the mock payload and the Billing page's projection StatCard use the same
 * math as the real endpoint:
 *   pace         = used / max(1, days elapsed in cycle)
 *   projected    = round(pace * days in cycle)          → projectedUnits
 *   overage      = max(0, projected - limit)            → overageUnits
 *   overageCost  = overage * price (2dp, VU_OVERAGE_PRICE_USD default)
 *
 * Degenerates gracefully: zero used → zero projection; missing dates default
 * to the calendar month around now.
 */
export function projectScanUsage({
  used = 0,
  limit = 0,
  periodStart,
  periodEnd,
  overagePriceUsd = VU_OVERAGE_PRICE_USD,
  now = new Date(),
} = {}) {
  const start = periodStart ? new Date(periodStart).getTime() : null
  const end = periodEnd ? new Date(periodEnd).getTime() : null
  const nowMs = now.getTime()

  const daysElapsed = start ? Math.max(1, Math.floor((nowMs - start) / DAY_MS)) : 1
  const daysInCycle = end && start ? Math.max(1, Math.round((end - start) / DAY_MS)) : 30

  const pacePerDay = Math.round((used / daysElapsed) * 100) / 100
  const projectedUnits = Math.round(pacePerDay * daysInCycle)
  const overageUnits = Math.max(0, projectedUnits - limit)
  const overageCostUsd = Math.round(overageUnits * overagePriceUsd * 100) / 100

  return {
    daysElapsed,
    daysInCycle,
    pacePerDay,
    projectedUnits,
    overageUnits,
    overageCostUsd,
  }
}
