// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from './Badge'

describe('Badge', () => {
  it('renders the children with a neutral tone by default', () => {
    render(<Badge>Queued</Badge>)

    const badge = screen.getByText('Queued')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-parchment')
  })

  it.each([
    ['success', 'bg-emerald-50'],
    ['info', 'bg-sky-50'],
    ['warning', 'bg-amber-50'],
    ['danger', 'bg-rose-50'],
    ['neutral', 'bg-parchment'],
  ])('applies the %s tone classes', (tone, toneClass) => {
    render(<Badge tone={tone}>{tone}</Badge>)

    expect(screen.getByText(tone).className).toContain(toneClass)
  })

  it('shows a leading status dot when `dot` is set', () => {
    render(<Badge tone="success" dot>Live</Badge>)

    const badge = screen.getByText('Live')
    expect(badge.querySelector('span[aria-hidden="true"]')).toBeTruthy()
  })

  it('syncs the verdict-mapped dot colors to the palette CSS vars', () => {
    render(<Badge tone="success" dot>Live</Badge>)

    const dot = screen.getByText('Live').querySelector('span[aria-hidden="true"]')
    // The dot consumes VERDICT_PALETTE's hex via applyVerdictPalette's CSS
    // var — same source as the chart arcs/bars.
    expect(dot.className).toContain('bg-(--color-tone-success)')
  })

  it('omits the dot when `dot` is not set', () => {
    render(<Badge>Static</Badge>)

    const badge = screen.getByText('Static')
    expect(badge.querySelector('span[aria-hidden="true"]')).toBeNull()
  })

  it('applies the sm size class', () => {
    render(<Badge size="sm">Small</Badge>)

    expect(screen.getByText('Small').className).toContain('px-2 py-0.5')
  })

  it('forwards the title attribute', () => {
    render(<Badge title="Full team name">Legal</Badge>)

    expect(screen.getByText('Legal')).toHaveAttribute('title', 'Full team name')
  })

  it('falls back to the neutral tone for an unknown tone', () => {
    render(<Badge tone="bogus">Odd</Badge>)

    expect(screen.getByText('Odd').className).toContain('bg-parchment')
  })
})
