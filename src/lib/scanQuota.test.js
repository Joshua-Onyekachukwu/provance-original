import { describe, expect, it } from 'vitest'
import {
  VU_OVERAGE_PRICE_USD,
  projectScanUsage,
  scanQuotaPct,
} from './scanQuota.js'

/**
 * VU quota parity tests — the frontend mirror of the backend's
 * projectScanUsage (billing.service.ts). Locks the same pace → projection →
 * overage math so the mock payload and the Billing page's StatCard can never
 * disagree with the real endpoint. The meter is VUs (unitsUsed/unitsLimit);
 * the legacy scansUsed/scansLimit fields were dropped with the frontend
 * switch.
 */
describe('scanQuotaPct', () => {
  it('computes the used/limit ratio as a 0..100 integer', () => {
    expect(scanQuotaPct({ unitsUsed: 90000, unitsLimit: 100000 })).toBe(90)
    expect(scanQuotaPct({ unitsUsed: 62000, unitsLimit: 100000 })).toBe(62)
    expect(scanQuotaPct({ unitsUsed: 100000, unitsLimit: 100000 })).toBe(100)
  })

  it('returns null for missing or non-positive limits', () => {
    expect(scanQuotaPct(null)).toBeNull()
    expect(scanQuotaPct({})).toBeNull()
    expect(scanQuotaPct({ unitsUsed: 10, unitsLimit: 0 })).toBeNull()
    expect(scanQuotaPct({ unitsUsed: 10, unitsLimit: null })).toBeNull()
    expect(scanQuotaPct({ unitsUsed: 10, unitsLimit: -5 })).toBeNull()
  })
})

describe('projectScanUsage', () => {
  const cycle = {
    periodStart: '2026-07-01T00:00:00.000Z',
    periodEnd: '2026-08-01T00:00:00.000Z',
  }

  it('projects end-of-cycle VUs from the current pace', () => {
    const projection = projectScanUsage({
      used: 250,
      limit: 500,
      ...cycle,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })

    expect(projection.daysElapsed).toBe(10)
    expect(projection.daysInCycle).toBe(31)
    expect(projection.pacePerDay).toBe(25)
    expect(projection.projectedUnits).toBe(775)
    expect(projection.overageUnits).toBe(275)
    // Rounded to 2dp in the projection (the raw float product has binary
    // noise at the 0.0006 price — assert the rounded wire value).
    expect(projection.overageCostUsd).toBe(
      Math.round(275 * VU_OVERAGE_PRICE_USD * 100) / 100,
    )
  })

  it('reports zero overage when the projection stays under the limit', () => {
    const projection = projectScanUsage({
      used: 60,
      limit: 500,
      ...cycle,
      now: new Date('2026-07-11T00:00:00.000Z'),
    })

    expect(projection.projectedUnits).toBe(186)
    expect(projection.overageUnits).toBe(0)
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
    expect(projection.projectedUnits).toBe(930)
    expect(projection.overageUnits).toBe(830)
  })

  it('handles zero usage and missing dates gracefully', () => {
    const zero = projectScanUsage({
      used: 0,
      limit: 500,
      ...cycle,
      now: new Date('2026-07-20T00:00:00.000Z'),
    })
    expect(zero.projectedUnits).toBe(0)
    expect(zero.overageCostUsd).toBe(0)

    const noDates = projectScanUsage({ used: 100, limit: 500 })
    expect(noDates.projectedUnits).toBeGreaterThan(0)
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
