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
