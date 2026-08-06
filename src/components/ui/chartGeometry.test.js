import { describe, expect, it } from 'vitest'
import {
  CHART_W,
  PAD,
  buildChartGeometry,
  buildHitAreaCells,
} from './chartGeometry.js'

// ---------------------------------------------------------------------------
// buildHitAreaCells — transparent hover cells for line/area charts.
//
// The regression this locks in: the old hand-rolled hit rects gave the first
// and last points half-width cells positioned off-center, leaving the first
// point (at x = PAD.left) inside a dead zone where no rect received the
// mouse. Cells must tile the plot edge-to-edge and every point's x must fall
// inside its own cell.
// ---------------------------------------------------------------------------

function sampleSeries(n) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
    scans: 10 + i,
    completed: 8,
    failed: 1,
    suspicious: 2,
  }))
}

describe('buildHitAreaCells', () => {
  it('tiles the full plot width with no gaps between consecutive cells', () => {
    const points = sampleSeries(14)
    const cells = buildHitAreaCells(points)

    // Cells start at the plot's left edge…
    expect(cells[0].x).toBe(PAD.left)
    // …end at the plot's right edge…
    const last = cells[cells.length - 1]
    expect(last.x + last.width).toBe(CHART_W - PAD.right)
    // …and each next cell starts exactly where the previous one ended.
    for (let i = 1; i < cells.length; i += 1) {
      expect(cells[i].x).toBeCloseTo(cells[i - 1].x + cells[i - 1].width, 6)
    }
  })

  it('covers every point, including the first and last, inside its own cell', () => {
    const points = sampleSeries(14)
    const geometry = buildChartGeometry(points)
    const cells = buildHitAreaCells(points)

    points.forEach((_, i) => {
      const pointX = geometry.x(i)
      const cell = cells[i]
      expect(pointX).toBeGreaterThanOrEqual(cell.x)
      expect(pointX).toBeLessThanOrEqual(cell.x + cell.width)
    })
  })

  it('keeps edge cells positive-width for a two-point series', () => {
    const cells = buildHitAreaCells(sampleSeries(2))
    expect(cells).toHaveLength(2)
    expect(cells[0].width).toBeGreaterThan(0)
    expect(cells[1].width).toBeGreaterThan(0)
    expect(cells[1].x).toBeCloseTo(cells[0].x + cells[0].width, 6)
  })

  it('covers the first point when the first cell starts at the plot left edge', () => {
    // Regression: with the old half-width edge rect the first point sat in a
    // dead zone; the first cell must include x = PAD.left.
    const points = sampleSeries(7)
    const cells = buildHitAreaCells(points)
    expect(cells[0].x).toBe(PAD.left)
    expect(cells[0].width).toBeGreaterThanOrEqual(0)
  })

  it('covers the whole plot with a single cell for a one-point series', () => {
    const cells = buildHitAreaCells(sampleSeries(1))
    expect(cells).toHaveLength(1)
    expect(cells[0].x).toBe(PAD.left)
    expect(cells[0].x + cells[0].width).toBe(CHART_W - PAD.right)
  })

  it('returns positive-width cells within the plot bounds', () => {
    const points = sampleSeries(30)
    const cells = buildHitAreaCells(points)
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(PAD.left)
      expect(cell.x + cell.width).toBeLessThanOrEqual(CHART_W - PAD.right)
      expect(cell.width).toBeGreaterThan(0)
    }
  })

  it('is independent of the y-axis math (same cells regardless of values)', () => {
    const high = sampleSeries(14)
    const low = sampleSeries(14).map((p) => ({ ...p, scans: 0 }))
    const cellsHigh = buildHitAreaCells(high)
    const cellsLow = buildHitAreaCells(low)
    expect(cellsHigh).toEqual(cellsLow)
  })

  it('produces positive-width cells covering every point', () => {
    const points = sampleSeries(14)
    const cells = buildHitAreaCells(points)
    expect(cells.every((cell) => cell.width > 0)).toBe(true)
  })
})
