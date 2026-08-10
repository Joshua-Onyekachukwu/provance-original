// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { scanQuotaPct } from '../../lib/scanQuota.js'
import { ScanQuotaWarningChip } from './AppDashboardPage.jsx'

/**
 * Scan-quota warning tests — the dashboard's ≥85% utilization chip:
 *
 * - scanQuotaPct is a pure 0..100 computation from the billing usage shape
 *   (scansUsed / scansLimit), returning null when no usable limit exists.
 * - The chip renders a Billing link at ≥85% (warning), escalates to danger
 *   at 100%+, and renders nothing below 85% or without a usable limit.
 */
describe('scanQuotaPct', () => {
  it('computes the used/limit ratio as a 0..100 integer', () => {
    expect(scanQuotaPct({ scansUsed: 450, scansLimit: 500 })).toBe(90)
    expect(scanQuotaPct({ scansUsed: 312, scansLimit: 500 })).toBe(62)
    expect(scanQuotaPct({ scansUsed: 500, scansLimit: 500 })).toBe(100)
  })

  it('clamps above 100', () => {
    expect(scanQuotaPct({ scansUsed: 700, scansLimit: 500 })).toBe(100)
  })

  it('returns null for missing or non-positive limits', () => {
    expect(scanQuotaPct(null)).toBeNull()
    expect(scanQuotaPct({})).toBeNull()
    expect(scanQuotaPct({ scansUsed: 0, scansLimit: 0 })).toBeNull()
    expect(scanQuotaPct({ scansUsed: 10, scansLimit: null })).toBeNull()
    expect(scanQuotaPct({ scansUsed: 10, scansLimit: -5 })).toBeNull()
  })
})

describe('ScanQuotaWarningChip', () => {
  it('renders a warning chip linking to Billing at 85–99%', () => {
    render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={{ scansUsed: 450, scansLimit: 500 }} />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/app/billing')
    expect(link.textContent).toContain('90% of monthly scan quota used')
  })

  it('escalates to danger when exhausted (100%+)', () => {
    render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={{ scansUsed: 500, scansLimit: 500 }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link').textContent).toContain(
      'Monthly scan quota exhausted',
    )
  })

  it('renders nothing below 85%', () => {
    const { container } = render(
      <MemoryRouter>
        <ScanQuotaWarningChip usage={{ scansUsed: 300, scansLimit: 500 }} />
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
