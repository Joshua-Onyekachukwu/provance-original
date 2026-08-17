// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DonutChart from './DonutChart'

// ---------------------------------------------------------------------------
// DonutChart tests — arc rendering, legend values/shares, center total, hover
// readout with arc widening, and the all-zero empty state.
// ---------------------------------------------------------------------------

const segments = [
  { key: 'a', label: 'MP4 Video', value: 142, color: '#818cf8' },
  { key: 'b', label: 'JPEG Image', value: 84, color: '#34d399' },
  { key: 'c', label: 'PNG Image', value: 41, color: '#38bdf8' },
]

function getArcs(container) {
  const svg = container.querySelector('svg[aria-label]')
  return svg ? [...svg.querySelectorAll('circle[stroke-dasharray]')] : []
}

function getReadout(container) {
  return container.querySelector('[aria-live="polite"]')
}

describe('DonutChart', () => {
  it('renders one arc per positive segment plus a track, and the center total', () => {
    const { container } = render(<DonutChart segments={segments} />)

    expect(getArcs(container)).toHaveLength(3)
    // Total 142 + 84 + 41 = 267 in the center.
    expect(screen.getByText('267')).toBeInTheDocument()
  })

  it('renders the legend with label, value, and share per segment', () => {
    render(<DonutChart segments={segments} />)

    // The label appears in both the legend and the arc's <title> a11y text.
    expect(screen.getAllByText('MP4 Video').length).toBeGreaterThan(0)
    expect(screen.getByText('142')).toBeInTheDocument()
    // 142 / 267 = 53.18…% → 53.2%
    expect(screen.getByText('53.2%')).toBeInTheDocument()
    // 84 / 267 = 31.46…% → 31.5%
    expect(screen.getByText('31.5%')).toBeInTheDocument()
    // 41 / 267 = 15.35…% → 15.4%
    expect(screen.getByText('15.4%')).toBeInTheDocument()
  })

  it('shows the idle hint before any hover', () => {
    render(<DonutChart segments={segments} />)

    expect(screen.getByText('Hover a segment for the share')).toBeInTheDocument()
  })

  it('updates the readout and widens the arc when a segment is hovered', async () => {
    const user = userEvent.setup()
    const { container } = render(<DonutChart segments={segments} />)
    const arcs = getArcs(container)
    const arc = arcs[0]

    await user.hover(arc)

    const readout = getReadout(container)
    expect(readout).toHaveTextContent('MP4 Video')
    expect(readout).toHaveTextContent('142 · 53.2%')
    // Hovered arc widens from thickness 20 → 25.
    expect(parseFloat(arc.getAttribute('stroke-width'))).toBeCloseTo(25, 5)

    await user.unhover(arc)
    expect(arc.getAttribute('stroke-width')).toBe('20')
    expect(screen.getByText('Hover a segment for the share')).toBeInTheDocument()
  })

  it('keeps zero-value segments in the legend but draws no arc for them', () => {
    const { container } = render(
      <DonutChart
        segments={[
          { key: 'a', label: 'Authentic', value: 10, color: '#10b981' },
          { key: 'b', label: 'Suspicious', value: 0, color: '#f59e0b' },
        ]}
      />,
    )

    expect(getArcs(container)).toHaveLength(1)
    // Legend still lists both (labels also live in each arc's <title>).
    expect(screen.getAllByText('Authentic').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Suspicious').length).toBeGreaterThan(0)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('renders the empty card (no svg) when every value is zero', () => {
    const { container } = render(
      <DonutChart
        segments={[
          { key: 'a', label: 'Authentic', value: 0 },
          { key: 'b', label: 'Suspicious', value: 0 },
        ]}
        emptyTitle="No verdict data yet"
        emptyDescription="Completed verifications will split by verdict here as they land."
      />,
    )

    expect(screen.getByText('No verdict data yet')).toBeInTheDocument()
    expect(
      screen.getByText('Completed verifications will split by verdict here as they land.'),
    ).toBeInTheDocument()
    expect(container.querySelector('svg[aria-label]')).toBeNull()
  })

  it('supports a custom center text + hint', () => {
    render(
      <DonutChart
        segments={segments}
        centerText="267"
        centerHint="uploads"
      />,
    )

    expect(screen.getByText('uploads')).toBeInTheDocument()
  })
})
