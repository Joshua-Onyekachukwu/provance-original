// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HourlyBarChart from './HourlyBarChart'
import { PAD } from './chartGeometry'

// ---------------------------------------------------------------------------
// HourlyBarChart hover interaction tests (mirror of the TrendChart suite).
//
// The chart's hover is driven by transparent full-slot hit rects (one per
// bar, tiled edge-to-edge by buildGroupedHitAreaCells inside
// buildHourlyBarGeometry). These tests lock in that:
//   - hovering the FIRST rect (left edge at the plot's pad.left — the
//     historic dead-zone regression) updates the readout + guide line for
//     index 0;
//   - hovering the LAST rect updates them for the final bar;
//   - mouseleave resets the readout and removes the guide line;
//   - an empty/all-zero series renders nothing (the panels gate it).
// ---------------------------------------------------------------------------

// Local-time Date objects keep the hour labels deterministic regardless of
// the machine's timezone (formatHourShort formats in local time).
const hours = Array.from({ length: 12 }, (_, i) => ({
  hour: new Date(2026, 6, 24, i + 1, 0), // 1 AM … 12 PM
  processed: 3 + (i % 5),
}))

function getHitRects(container) {
  const svg = container.querySelector('svg[aria-label]')
  return svg ? [...svg.querySelectorAll('rect[fill="transparent"]')] : []
}

function getReadout(container) {
  return container.querySelector('[aria-live="polite"]')
}

function getGuideLine(container) {
  // The hover guide is the only "3 3" dashed line in the chart.
  return container.querySelector('line[stroke-dasharray="3 3"]')
}

describe('HourlyBarChart', () => {
  it('shows the idle hint before any hover and no guide line', () => {
    const { container } = render(<HourlyBarChart points={hours} />)

    expect(screen.getByText('Hover a bar for the hourly count')).toBeInTheDocument()
    expect(getGuideLine(container)).toBeNull()
  })

  it('renders crisp HTML axis labels for the first, middle, and last hour', () => {
    render(<HourlyBarChart points={hours} />)

    expect(screen.getByText('1 AM')).toBeInTheDocument()
    // Middle slot index 6 → 7 AM; last slot index 11 → 12 PM.
    expect(screen.getByText('7 AM')).toBeInTheDocument()
    expect(screen.getByText('12 PM')).toBeInTheDocument()
  })

  it('updates readout + guide line for the FIRST bar when its hit rect is hovered', async () => {
    const user = userEvent.setup()
    const { container } = render(<HourlyBarChart points={hours} />)
    const cells = getHitRects(container)

    expect(cells).toHaveLength(12)
    // Regression: the first cell must start at the plot's left edge so the
    // first bar (at pad.left + (slotW - barW)/2) is inside it.
    expect(parseFloat(cells[0].getAttribute('x'))).toBeCloseTo(PAD.left, 5)

    await user.hover(cells[0])

    const readout = getReadout(container)
    expect(readout).toHaveTextContent('1 AM')
    expect(readout).toHaveTextContent('3 processed')

    const guide = getGuideLine(container)
    expect(guide).toBeInTheDocument()
  })

  it('updates readout + guide line for the LAST bar when its hit rect is hovered', async () => {
    const user = userEvent.setup()
    const { container } = render(<HourlyBarChart points={hours} />)
    const cells = getHitRects(container)
    const lastCell = cells[cells.length - 1]

    // Last cell must end exactly at the plot's right edge.
    const x = parseFloat(lastCell.getAttribute('x'))
    const width = parseFloat(lastCell.getAttribute('width'))
    expect(x + width).toBeCloseTo(720 - PAD.right, 5)

    await user.hover(lastCell)

    const readout = getReadout(container)
    expect(readout).toHaveTextContent('12 PM')
    expect(readout).toHaveTextContent(`${3 + (11 % 5)} processed`)
    expect(getGuideLine(container)).toBeInTheDocument()
  })

  it('resets the readout and removes the guide line on mouse leave', async () => {
    const user = userEvent.setup()
    const { container } = render(<HourlyBarChart points={hours} />)
    const cells = getHitRects(container)

    await user.hover(cells[5])
    expect(getReadout(container)).toHaveTextContent('6 AM')

    await user.unhover(cells[5])

    expect(screen.getByText('Hover a bar for the hourly count')).toBeInTheDocument()
    expect(getGuideLine(container)).toBeNull()
  })

  it('renders nothing for an empty series or all-zero values', () => {
    const { container, rerender } = render(<HourlyBarChart points={[]} />)
    expect(container.querySelector('svg[aria-label]')).toBeNull()

    rerender(
      <HourlyBarChart points={hours.map((p) => ({ ...p, processed: 0 }))} />,
    )
    expect(container.querySelector('svg[aria-label]')).toBeNull()
  })
})
