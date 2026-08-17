import { describe, expect, it } from 'vitest'
import { OVERAGE_PRICE_PER_SCAN_USD, projectScanUsage, scanQuotaPct } from './scanQuota.js'

/**
 * Billing projection parity tests — the frontend mirror of the backend's
 * projectScanUsage (billing.service.ts). Locks the same pace → projection →
 * overage math so the mock payload and the Billing page's StatCard can never
 * disagree with the real endpoint.
 */
describe('scanQuotaPct', () => {
  it('computes the used/limit ratio as a 0..100 integer', () => {
    expect(scanQuotaPct({ scansUsed: 450, scansLimit: 500 })).toBe(90)
    expect(scanQuotaPct({ scansUsed: 312, scansLimit: 500 })).toBe(62)
    expect(scanQuotaPct({ scansUsed: 500, scansLimit: 500 })).toBe(100)
  })

  it('returns null for missing or non-positive limits', () => {
    expect(scanQuotaPct(null)).toBeNull()
    expect(scanQuotaPct({})).toBeNull()
    expect(scanQuotaPct({ scansUsed: 10, scansLimit: 0 })).toBeNull()
  })
})

describe('projectScanUsage', () => {
  const cycle = {
    periodStart: '2026-07-01T00:00:00.000Z',
    periodEnd: '2026-08-01T00:00:00.000Z',
  }

  it('projects end-of-cycle usage from the current pace', () => {
    const projection = projectScanUsage({
      used: 250,
      limit: 500,
      ...cycle,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })

    expect(projection.daysElapsed).toBe(10)
    expect(projection.daysInCycle).toBe(31)
    expect(projection.pacePerDay).toBe(25)
    expect(projection.projectedScans).toBe(775)
    expect(projection.overageScans).toBe(275)
    expect(projection.overageCostUsd).toBe(275 * OVERAGE_PRICE_PER_SCAN_USD)
  })

  it('reports zero overage when the projection stays under the limit', () => {
    const projection = projectScanUsage({
      used: 60,
      limit: 500,
      ...cycle,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })

    expect(projection.projectedScans).toBe(186)
    expect(projection.overageScans).toBe(0)
    expect(projection.overageCostUsd).toBe(0)
  })

  it('clamps days-elapsed to 1 so a first-day burst never divides by zero', () => {
    const projection = projectScanUsage({
      used: 30,
      limit: 100,
      ...cycle,
      now: new Date('2026-07-01T06:00:00.000Z'),
    })

    expect(projection.daysElapsed).toBe(1)
    expect(projection.projectedScans).toBe(930)
    expect(projection.overageScans).toBe(830)
  })

  it('handles zero usage and missing dates gracefully', () => {
    const zero = projectScanUsage({
      used: 0,
      limit: 500,
      ...cycle,
      now: new Date('2026-07-20T00:00:00.000Z'),
    })
    expect(zero.projectedScans).toBe(0)
    expect(zero.overageCostUsd).toBe(0)

    const noDates = projectScanUsage({ used: 100, limit: 500 })
    expect(noDates.projectedScans).toBeGreaterThan(0)
    expect(noDates.daysInCycle).toBe(30)
  })

  it('respects a custom overage price', () => {
    const projection = projectScanUsage({
      used: 250,
      limit: 500,
      ...cycle,
      overagePriceUsd: 0.1,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })

    expect(projection.overageCostUsd).toBe(27.5)
  })
})
