// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChartHoverReadout, { ChartAxisLabels } from './ChartHoverReadout.jsx'
import { PAD, buildChartGeometry, pctOfViewBoxX } from './chartGeometry.js'

// ---------------------------------------------------------------------------
// ChartHoverReadout — the shared readout strip. The point of the extraction
// is "identical styling everywhere," so these tests lock the exact class
// strings (default + compact variants) that four charts now depend on, plus
// the aria-live contract and the label/hint/item rendering.
// ---------------------------------------------------------------------------

describe('ChartHoverReadout', () => {
  it('renders the default strip with the exact shared class string', () => {
    render(<ChartHoverReadout hint="Hover a point for day-level detail" />)

    const strip = screen.getByText('Hover a point for day-level detail').closest('div')
    expect(strip.className).toBe(
      'mb-3 mt-3 flex h-6 items-center gap-2 font-mono text-xs text-charcoal-mid',
    )
    expect(strip).toHaveAttribute('aria-live', 'polite')
  })

  it('renders the compact strip with the exact queue-panel class string', () => {
    render(<ChartHoverReadout size="compact" hint="Hover a bar for the hourly count" />)

    const strip = screen.getByText('Hover a bar for the hourly count').closest('div')
    expect(strip.className).toBe(
      'mb-2 flex h-5 items-center gap-2 font-mono text-xs text-charcoal-mid',
    )
  })

  it('shows the hint when no label is provided', () => {
    render(<ChartHoverReadout hint="Hover a point for day-level detail" />)

    expect(screen.getByText('Hover a point for day-level detail')).toBeInTheDocument()
    // No bold label segment when idle.
    expect(screen.queryByText('Jul 1')).toBeNull()
  })

  it('renders the bold label, separator, and each item when hovered', () => {
    render(
      <ChartHoverReadout
        label="Jul 1"
        items={[
          { key: 'scans', text: '10 scans' },
          { key: 'completed', text: '8 completed', className: 'text-emerald-600' },
          { key: 'failed', text: '1 failed', className: 'text-rose-500' },
        ]}
      />,
    )

    expect(screen.getByText('Jul 1')).toBeInTheDocument()
    expect(screen.getByText('10 scans')).toBeInTheDocument()
    expect(screen.getByText('8 completed')).toHaveClass('text-emerald-600')
    expect(screen.getByText('1 failed')).toHaveClass('text-rose-500')
    expect(screen.queryByText('Hover a point for day-level detail')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ChartAxisLabels — the HTML axis-label overlay. Locks the y-grid label
// geometry (width tied to the shared PAD) and the every-other x cadence.
// ---------------------------------------------------------------------------

describe('ChartAxisLabels', () => {
  const points = Array.from({ length: 14 }, (_, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
    scans: 10 + i,
  }))

  it('renders y-grid labels positioned from the shared PAD width', () => {
    const geometry = buildChartGeometry(points)
    const { container } = render(
      <ChartAxisLabels geometry={geometry} points={points} xLabel={(p) => p.date} />,
    )

    const yLabels = container.querySelectorAll('[style*="top:"]')
    expect(yLabels.length).toBeGreaterThan(0)
    // The first y-label's inline width equals PAD.left - 4 (the shared-PAD
    // coupling the overlay documents).
    expect(yLabels[0].style.width).toBe(`${PAD.left - 4}px`)
    expect(yLabels[0].getAttribute('aria-hidden')).toBeNull() // inside the hidden container
  })

  it('skips x labels when xLabel is omitted (y labels still render)', () => {
    const geometry = buildChartGeometry(points)
    const { container } = render(<ChartAxisLabels geometry={geometry} points={points} />)

    // No x-label spans (they end in -translate-x-1/2), but the overlay exists.
    const xLabels = container.querySelectorAll('[class*="-translate-x-1/2"]')
    expect(xLabels.length).toBe(0)
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('renders every-other x label plus the last point (14 points → 8 labels)', () => {
    const geometry = buildChartGeometry(points)
    const { container } = render(
      <ChartAxisLabels geometry={geometry} points={points} xLabel={(p) => p.date} />,
    )

    const xLabels = container.querySelectorAll('[class*="-translate-x-1/2"]')
    expect(xLabels.length).toBe(8) // indices 0,2,4,6,8,10,12,13
    // Anchor is the point's geometry.x(i) by default.
    const firstX = parseFloat(xLabels[0].style.left)
    expect(firstX).toBeCloseTo(parseFloat(pctOfViewBoxX(geometry.x(0))), 4)
  })

  it('honors the xLabelX anchor override (bar-center variant)', () => {
    const geometry = buildChartGeometry(points)
    const { container } = render(
      <ChartAxisLabels
        geometry={geometry}
        points={points}
        xLabel={(p) => p.date}
        xLabelX={(i) => geometry.x(i) + 20}
      />,
    )

    const xLabels = container.querySelectorAll('[class*="-translate-x-1/2"]')
    const firstX = parseFloat(xLabels[0].style.left)
    expect(firstX).toBeCloseTo(parseFloat(pctOfViewBoxX(geometry.x(0) + 20)), 4)
  })
})
