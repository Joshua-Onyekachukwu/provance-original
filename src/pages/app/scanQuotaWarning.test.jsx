// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { scanQuotaPct } from '../../lib/scanQuota.js'
import ScanQuotaWarningChip from '../../components/ScanQuotaWarningChip.jsx'

/**
 * Verification-unit warning tests — the shared ≥85% utilization chip
 * (dashboard hero + Uploads page both render it from the same resolveUsage
 * source):
 *
 * - scanQuotaPct is a pure 0..100 computation from the billing usage shape
 *   (unitsUsed / unitsLimit), returning null when no usable limit exists.
 * - The chip renders a Billing link at ≥85% (warning), escalates to danger
 *   at 100%+, and renders nothing below 85% or without a usable limit.
 */
describe('scanQuotaPct', () => {
  it('computes the used/limit ratio as a 0..100 integer', () => {
    expect(scanQuotaPct({ unitsUsed: 90000, unitsLimit: 100000 })).toBe(90)
    expect(scanQuotaPct({ unitsUsed: 62000, unitsLimit: 100000 })).toBe(62)
    expect(scanQuotaPct({ unitsUsed: 100000, unitsLimit: 100000 })).toBe(100)
  })

  it('clamps above 100', () => {
    expect(scanQuotaPct({ unitsUsed: 140000, unitsLimit: 100000 })).toBe(100)
  })

  it('returns null for missing or non-positive limits', () => {
    expect(scanQuotaPct(null)).toBeNull()
    expect(scanQuotaPct({})).toBeNull()
    expect(scanQuotaPct({ unitsUsed: 0, unitsLimit: 0 })).toBeNull()
    expect(scanQuotaPct({ unitsUsed: 10, unitsLimit: null })).toBeNull()
    expect(scanQuotaPct({ unitsUsed: 10, unitsLimit: -5 })).toBeNull()
  })
})

describe('ScanQuotaWarningChip', () => {
  it('renders a warning chip linking to Billing at 85–99%', () => {
    render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={{ unitsUsed: 90000, unitsLimit: 100000 }} />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/app/billing')
    expect(link.textContent).toContain(
      '90% of monthly verification-unit allowance used',
    )
  })

  it('escalates to danger when exhausted (100%+)', () => {
    render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={{ unitsUsed: 100000, unitsLimit: 100000 }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link').textContent).toContain(
      'Monthly verification-unit allowance exhausted',
    )
  })

  it('renders nothing below 85%', () => {
    const { container } = render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={{ unitsUsed: 60000, unitsLimit: 100000 }} />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing without a usable limit', () => {
    const { container } = render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={null} />
      </MemoryRouter>,
    )
    expect(container.firstChild).toBeNull()
  })
})
