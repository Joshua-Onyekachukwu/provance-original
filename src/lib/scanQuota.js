/**
 * scanQuota.js — pure scan-quota helpers for the dashboard's ≥85% warning
 * chip. Kept in its own module (not a component file) so fast-refresh and
 * unit tests can import the function without the page's component graph.
 *
 * The input is the billing usage shape ({ scansUsed, scansLimit }) produced
 * by GET /v1/billing — the same resolveUsage source of truth the Billing
 * page and the initiateScan quota gate consume.
 */

/**
 * scanQuotaPct — the current cycle's scan-quota utilization as a 0..100
 * integer. Returns null when no usable limit exists so the warning chip
 * simply doesn't render.
 */
export function scanQuotaPct(usage) {
  const used = Number(usage?.scansUsed)
  const limit = Number(usage?.scansLimit)
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null
  return Math.min(100, Math.round((used / limit) * 100))
}

const DAY_MS = 86_400_000

export const OVERAGE_PRICE_PER_SCAN_USD = 0.05

/**
 * projectScanUsage — end-of-cycle projection from the current usage pace.
 *
 * Frontend mirror of the backend's projectScanUsage (billing.service.ts) so
 * the mock payload and the Billing page's projection StatCard use the same
 * math as the real endpoint:
 *   pace        = used / max(1, days elapsed in cycle)
 *   projected   = round(pace * days in cycle)
 *   overage     = max(0, projected - limit)
 *   overageCost = overage * price (2dp)
 *
 * Degenerates gracefully: zero used → zero projection; missing dates default
 * to the calendar month around now.
 */
export function projectScanUsage({
  used = 0,
  limit = 0,
  periodStart,
  periodEnd,
  overagePriceUsd = OVERAGE_PRICE_PER_SCAN_USD,
  now = new Date(),
} = {}) {
  const start = periodStart ? new Date(periodStart).getTime() : null
  const end = periodEnd ? new Date(periodEnd).getTime() : null
  const nowMs = now.getTime()

  const daysElapsed = start ? Math.max(1, Math.floor((nowMs - start) / DAY_MS)) : 1
  const daysInCycle = end && start ? Math.max(1, Math.round((end - start) / DAY_MS)) : 30

  const pacePerDay = Math.round((used / daysElapsed) * 100) / 100
  const projectedScans = Math.round(pacePerDay * daysInCycle)
  const overageScans = Math.max(0, projectedScans - limit)
  const overageCostUsd = Math.round(overageScans * overagePriceUsd * 100) / 100

  return {
    daysElapsed,
    daysInCycle,
    pacePerDay,
    projectedScans,
    overageScans,
    overageCostUsd,
  }
}
