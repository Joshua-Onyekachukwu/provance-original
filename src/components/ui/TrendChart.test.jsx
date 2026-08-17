// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrendChart from './TrendChart'
import { CHART_W, PAD } from './chartGeometry'

// ---------------------------------------------------------------------------
// TrendChart hover interaction tests.
//
// The chart's hover is driven by transparent full-cell hit rects (one per
// point, tiled edge-to-edge by buildHitAreaCells). These tests lock in that:
//   - hovering the FIRST rect (whose left edge is at the plot's PAD.left,
//     the historic dead-zone regression) updates the readout + guide line
//     for index 0, not nothing and not the wrong neighbor;
//   - hovering the LAST rect updates them for the final point;
//   - mouseleave resets the readout and removes the guide line.
// ---------------------------------------------------------------------------

const series = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-07-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
  scans: 10 + i,
  completed: 8,
  failed: 1,
  suspicious: 2,
}))

function getHitRects(container) {
  const svg = container.querySelector('svg[aria-label]')
  return svg ? [...svg.querySelectorAll('rect[fill="transparent"]')] : []
}

function getReadout(container) {
  return container.querySelector('[aria-live="polite"]')
}

function getGuideLine(container) {
  // Grid lines use strokeDasharray="1"; the completed path "4 3"; the hover
  // guide is the only "3 3" dashed line in the chart.
  return container.querySelector('line[stroke-dasharray="3 3"]')
}

describe('TrendChart hover', () => {
  it('shows the default readout before any hover', () => {
    const { container } = render(<TrendChart data={series} />)

    expect(screen.getByText('Hover a point for day-level detail')).toBeInTheDocument()
    expect(getGuideLine(container)).toBeNull()
  })

  it('updates readout + guide line for the FIRST point when its hit rect is hovered', async () => {
    const user = userEvent.setup()
    const { container } = render(<TrendChart data={series} />)
    const cells = getHitRects(container)

    expect(cells).toHaveLength(14)
    // Regression: the first cell must start at the plot's left edge so the
    // first point (at PAD.left) is inside it — the historic dead-zone bug.
    expect(parseFloat(cells[0].getAttribute('x'))).toBeCloseTo(PAD.left, 5)

    await user.hover(cells[0])

    // Readout carries the first point's date + counts (index 0, not a
    // neighbor). The full-prefix regex proves the index on its own — a bare
    // /Jul 1/ would also match "Jul 10"/"Jul 11" from a wrong neighbor.
    const readout = getReadout(container)
    expect(readout).toHaveTextContent(/Jul 1·10 scans/)
    expect(readout).toHaveTextContent('8 completed')
    expect(readout).toHaveTextContent('1 failed')

    // Guide line sits exactly over the first point's x (PAD.left).
    const guide = getGuideLine(container)
    expect(guide).toBeInTheDocument()
    expect(parseFloat(guide.getAttribute('x1'))).toBeCloseTo(PAD.left, 5)
  })

  it('updates readout + guide line for the LAST point when its hit rect is hovered', async () => {
    const user = userEvent.setup()
    const { container } = render(<TrendChart data={series} />)
    const cells = getHitRects(container)
    const lastCell = cells[cells.length - 1]

    // Last cell must end exactly at the plot's right edge.
    const x = parseFloat(lastCell.getAttribute('x'))
    const width = parseFloat(lastCell.getAttribute('width'))
    expect(x + width).toBeCloseTo(CHART_W - PAD.right, 5)

    await user.hover(lastCell)

    // Readout carries the final point (Jul 14, scans 10+13=23).
    const readout = getReadout(container)
    expect(readout).toHaveTextContent(/Jul 14·23 scans/)

    // Guide line sits over the last point's x (plot right edge).
    const guide = getGuideLine(container)
    expect(guide).toBeInTheDocument()
    expect(parseFloat(guide.getAttribute('x1'))).toBeCloseTo(CHART_W - PAD.right, 5)
  })

  it('moves the readout + guide when hover travels between hit rects', async () => {
    const user = userEvent.setup()
    const { container } = render(<TrendChart data={series} />)
    const cells = getHitRects(container)

    await user.hover(cells[2])
    expect(getReadout(container)).toHaveTextContent(/Jul 3/)
    expect(getReadout(container)).toHaveTextContent('12 scans')

    await user.hover(cells[9])
    expect(getReadout(container)).toHaveTextContent(/Jul 10/)
    expect(getReadout(container)).toHaveTextContent('19 scans')
    expect(getGuideLine(container)).toBeInTheDocument()
  })

  it('resets the readout and removes the guide line on mouse leave', async () => {
    const user = userEvent.setup()
    const { container } = render(<TrendChart data={series} />)
    const cells = getHitRects(container)

    await user.hover(cells[5])
    expect(getReadout(container)).toHaveTextContent(/Jul 6/)

    await user.unhover(cells[5])

    expect(screen.getByText('Hover a point for day-level detail')).toBeInTheDocument()
    expect(getGuideLine(container)).toBeNull()
  })

  it('renders an empty state (no hover cells) for an empty series', () => {
    const { container } = render(<TrendChart data={[]} />)

    expect(screen.getByText('No volume data in range')).toBeInTheDocument()
    // No SVG means no hit rects at all in the empty state.
    expect(container.querySelector('svg[aria-label]')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TrendChart labels prop + empty-data degradation.
//
// The `labels` prop relabels the legend AND the hover readout for non-scan
// series (e.g. a queue throughput trend: Processed / Completed / Failed).
// These tests lock the contract: defaults when omitted, custom labels in the
// legend with totals, lowercased custom labels in the readout, and the empty
// card (default + custom copy) with no SVG/legend when data is empty.
// ---------------------------------------------------------------------------

describe('TrendChart labels + empty degradation', () => {
  it('renders the default empty card with no SVG and no legend for an empty series', () => {
    const { container } = render(<TrendChart data={[]} />)

    expect(screen.getByText('No volume data in range')).toBeInTheDocument()
    expect(
      screen.getByText('Extend the range or wait for new scans to land.'),
    ).toBeInTheDocument()
    expect(container.querySelector('svg[aria-label]')).toBeNull()
    // The legend lives in the populated branch — nothing to show empty.
    expect(screen.queryByText(/Scans \(/)).toBeNull()
  })

  it('flows custom emptyTitle + emptyDescription into the empty card', () => {
    render(
      <TrendChart
        data={[]}
        emptyTitle="No queue throughput yet"
        emptyDescription="Worker activity will trend here as scans flow through."
      />,
    )

    expect(screen.getByText('No queue throughput yet')).toBeInTheDocument()
    expect(
      screen.getByText('Worker activity will trend here as scans flow through.'),
    ).toBeInTheDocument()
  })

  it('uses default legend labels when the labels prop is omitted', () => {
    render(<TrendChart data={series} />)

    // series totals: scans 10..23 → 231, completed 8×14 → 112, failed 14.
    expect(screen.getByText(/Scans \(231\)/)).toBeInTheDocument()
    expect(screen.getByText(/Completed \(112\)/)).toBeInTheDocument()
    expect(screen.getByText(/Failed \(14\)/)).toBeInTheDocument()
  })

  it('flows custom labels into the legend with totals (defaults gone)', () => {
    render(
      <TrendChart
        data={series}
        labels={{ scans: 'Processed', completed: 'Completed', failed: 'Failed' }}
      />,
    )

    expect(screen.getByText(/Processed \(231\)/)).toBeInTheDocument()
    expect(screen.getByText(/Completed \(112\)/)).toBeInTheDocument()
    expect(screen.getByText(/Failed \(14\)/)).toBeInTheDocument()
    // The default 'Scans' label must not appear anywhere in the legend.
    expect(screen.queryByText(/Scans \(/)).toBeNull()
  })

  it('flows custom labels into the hover readout, lowercased', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <TrendChart data={series} labels={{ scans: 'Processed' }} />,
    )
    const cells = getHitRects(container)

    await user.hover(cells[0])

    const readout = getReadout(container)
    // Custom scan label lowercased; the omitted labels keep their defaults.
    expect(readout).toHaveTextContent(/Jul 1·10 processed/)
    expect(readout).toHaveTextContent('8 completed')
    expect(readout).toHaveTextContent('1 failed')
  })

  it('keeps the legend label casing but lowercases only the readout usage', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <TrendChart data={series} labels={{ scans: 'Processed' }} />,
    )
    const cells = getHitRects(container)

    // Legend keeps the prop's casing.
    expect(screen.getByText(/Processed \(231\)/)).toBeInTheDocument()

    await user.hover(cells[0])
    // Readout lowercases it.
    expect(getReadout(container)).toHaveTextContent('10 processed')
    expect(getReadout(container)).not.toHaveTextContent('10 Processed')
  })
})
