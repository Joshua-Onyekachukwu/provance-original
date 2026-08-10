import { describe, expect, it } from 'vitest'
import {
  CHART_H,
  CHART_W,
  PAD,
  buildChartGeometry,
  buildDonutSegments,
  buildGroupedHitAreaCells,
  buildHitAreaCells,
  buildHourlyBarGeometry,
  buildStackedBarGeometry,
  pctOfViewBoxX,
  pctOfViewBoxY,
  stackedOutlineBounds,
  stackedSegmentBounds,
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

// ---------------------------------------------------------------------------
// buildGroupedHitAreaCells — the grouped analogue of buildHitAreaCells for
// bar charts (stacked bars, hourly bars): one full slot-width cell per bar,
// tiled edge-to-edge across the plot so no bar (including the first and
// last) falls in a dead zone. groupW is the caller's slot/group width.
// ---------------------------------------------------------------------------

describe('buildGroupedHitAreaCells', () => {
  it('tiles the full plot width with no gaps for a 12-slot series', () => {
    const plotLeft = PAD.left
    const plotRight = CHART_W - PAD.right
    const groupW = (plotRight - plotLeft) / 12
    const cells = buildGroupedHitAreaCells(12, groupW)

    expect(cells).toHaveLength(12)
    expect(cells[0].x).toBe(plotLeft)
    const last = cells[cells.length - 1]
    expect(last.x + last.width).toBe(plotRight)
    for (let i = 1; i < cells.length; i += 1) {
      expect(cells[i].x).toBeCloseTo(cells[i - 1].x + cells[i - 1].width, 6)
    }
  })

  it('covers the first and last bars inside their own cells', () => {
    const plotLeft = PAD.left
    const plotRight = CHART_W - PAD.right
    const groupW = (plotRight - plotLeft) / 7
    const cells = buildGroupedHitAreaCells(7, groupW)

    // First cell starts exactly at the plot's left edge (no dead zone before
    // the first bar) and the last cell ends exactly at the right edge.
    expect(cells[0].x).toBe(plotLeft)
    expect(cells[0].width).toBeGreaterThan(0)
    expect(cells[6].x + cells[6].width).toBe(plotRight)
    // Every cell is full slot width except the clamped last one.
    expect(cells[5].width).toBeCloseTo(groupW, 6)
  })

  it('keeps a positive-width single cell for a one-bar series', () => {
    const cells = buildGroupedHitAreaCells(1, 0)
    expect(cells).toHaveLength(1)
    expect(cells[0].x).toBe(PAD.left)
    expect(cells[0].x + cells[0].width).toBe(CHART_W - PAD.right)
    expect(cells[0].width).toBeGreaterThan(0)
  })

  it('returns cells inside the plot bounds for any point count', () => {
    const plotLeft = PAD.left
    const plotRight = CHART_W - PAD.right
    const cells = buildGroupedHitAreaCells(30, (plotRight - plotLeft) / 30)
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(plotLeft)
      expect(cell.x + cell.width).toBeLessThanOrEqual(plotRight)
      expect(cell.width).toBeGreaterThan(0)
    }
  })

  it('is deterministic for identical slot count + width', () => {
    const a = buildGroupedHitAreaCells(14, 10)
    const b = buildGroupedHitAreaCells(14, 10)
    expect(a).toEqual(b)
  })

  it('honors custom plot bounds (e.g. the queue panels\' QUEUE_PAD)', () => {
    // The queue panels draw bars against QUEUE_CHART_W=720 / QUEUE_PAD
    // {left: 8, right: 8}; the shared PAD (left 34) would shift the cells
    // +26 units and leave the first bar's left edge in a dead zone.
    const plotLeft = 8
    const plotRight = 720 - 8
    const groupW = (plotRight - plotLeft) / 12
    const cells = buildGroupedHitAreaCells(12, groupW, { plotLeft, plotRight })

    expect(cells[0].x).toBe(plotLeft)
    expect(cells[cells.length - 1].x + cells[cells.length - 1].width).toBe(plotRight)
    // Every bar slot starts inside its own cell (no left-edge dead zone).
    for (let i = 0; i < 12; i += 1) {
      const barLeft = plotLeft + i * groupW
      const cell = cells[i]
      expect(barLeft).toBeGreaterThanOrEqual(cell.x)
      expect(barLeft).toBeLessThan(cell.x + cell.width)
    }
  })
})

// ---------------------------------------------------------------------------
// buildChartGeometry — shared line/area chart viewBox math. Locks in the
// degenerate-series edge cases every chart must survive: empty input, a
// single point (centered, not at the left edge), and all-zero values (yMax
// floor, baseline rendering, paths that stay inside the plot).
// ---------------------------------------------------------------------------

describe('buildChartGeometry', () => {
  it('floors yMax at the 10-unit minimum for an empty series without throwing', () => {
    const geometry = buildChartGeometry([])

    expect(geometry.yMax).toBe(10)
    expect(geometry.linePath).toBe('')
    expect(geometry.completedPath).toBe('')
    // The degenerate areaPath (x(-1) fallback) must stay NaN-free, not throw.
    expect(geometry.areaPath).not.toContain('NaN')
    // Baseline lands at the bottom of the plot area.
    expect(geometry.y(0)).toBeCloseTo(PAD.top + geometry.plotH, 6)
    // xStep falls back to full plot width for a non-2-point series.
    expect(geometry.xStep).toBeCloseTo(CHART_W - PAD.left - PAD.right, 6)
  })

  it('centers a single-point series horizontally and scales yMax from its value', () => {
    const geometry = buildChartGeometry([{ date: '2026-07-01T12:00:00.000Z', scans: 50 }])

    // x(0) sits mid-plot: PAD.left + plotW/2
    const plotW = CHART_W - PAD.left - PAD.right
    expect(geometry.x(0)).toBeCloseTo(PAD.left + plotW / 2, 6)
    // yMax = ceil(50 * 1.2 / 10) * 10 = 60
    expect(geometry.yMax).toBe(60)
    // Both paths emit exactly one command for the lone point.
    expect(geometry.linePath).toMatch(/^M\d+\.\d+,\d+\.\d+$/)
    expect(geometry.completedPath).toMatch(/^M\d+\.\d+,\d+\.\d+$/)
    // Area path closes the single-point spike back down to the baseline.
    expect(geometry.areaPath).toContain('Z')
  })

  it('treats a lone zero point as a zero-height baseline marker (no NaN paths)', () => {
    const geometry = buildChartGeometry([{ date: '2026-07-01T12:00:00.000Z', scans: 0 }])

    expect(geometry.yMax).toBe(10)
    expect(geometry.y(0)).toBeCloseTo(PAD.top + geometry.plotH, 6)
    // A zero scans value maps to the baseline, so the path must not contain NaN.
    expect(geometry.linePath).not.toContain('NaN')
    expect(geometry.areaPath).not.toContain('NaN')
  })

  it('scales a two-point series across the full plot width edge-to-edge', () => {
    const geometry = buildChartGeometry([
      { date: '2026-07-01T12:00:00.000Z', scans: 10 },
      { date: '2026-07-02T12:00:00.000Z', scans: 20 },
    ])

    expect(geometry.x(0)).toBeCloseTo(PAD.left, 6)
    expect(geometry.x(1)).toBeCloseTo(CHART_W - PAD.right, 6)
    // yMax = ceil(20 * 1.2 / 10) * 10 = 30
    expect(geometry.yMax).toBe(30)
  })

  it('clamps negative scan values to zero on the y-axis (never above the plot)', () => {
    const geometry = buildChartGeometry([
      { date: '2026-07-01T12:00:00.000Z', scans: -5 },
      { date: '2026-07-02T12:00:00.000Z', scans: 40 },
    ])

    expect(geometry.y(-5)).toBeCloseTo(geometry.y(0), 6)
    expect(geometry.y(geometry.yMax)).toBeCloseTo(PAD.top, 6) // yMax = 50
    expect(geometry.yMax).toBe(50)
    expect(geometry.linePath).not.toContain('NaN')
  })

  it('coerces numeric-string scan values instead of zeroing them', () => {
    const geometry = buildChartGeometry([
      { date: '2026-07-01T12:00:00.000Z', scans: '12' },
      { date: '2026-07-02T12:00:00.000Z', scans: 'invalid' },
    ])

    // yMax = ceil(12 * 1.2 / 10) * 10 = 20 — the numeric string drives the scale.
    expect(geometry.yMax).toBe(20)
    // The invalid string clamps to 0 → baseline; the valid one scales normally.
    expect(geometry.linePath).not.toContain('NaN')
    expect(geometry.linePath).not.toContain('Infinity')
  })

  it('emits 5 evenly spaced grid lines across the y axis', () => {
    const geometry = buildChartGeometry([{ date: '2026-07-01T12:00:00.000Z', scans: 100 }])

    expect(geometry.gridLines).toHaveLength(5)
    // Values step by yMax/4 from 0 up to yMax.
    expect(geometry.gridLines[0].value).toBe(0)
    expect(geometry.gridLines[4].value).toBe(geometry.yMax)
    // y(0) is the bottom-most line; y(yMax) the top-most.
    expect(geometry.gridLines[0].y).toBeGreaterThan(geometry.gridLines[4].y)
  })
})

// ---------------------------------------------------------------------------
// pctOfViewBoxX / pctOfViewBoxY — percentage strings for HTML axis labels
// overlaying the SVG. Rounding to 3 decimals keeps CSS `top`/`left` short.
// ---------------------------------------------------------------------------

describe('pctOfViewBox helpers', () => {
  it('rounds to 3 decimal places with a trailing percent sign', () => {
    // 10 / 720 = 1.388888…%  → 1.389%
    expect(pctOfViewBoxX(10)).toBe('1.389%')
    // 50 / 220 = 22.727272…% → 22.727%
    expect(pctOfViewBoxY(50)).toBe('22.727%')
  })

  it('maps the viewBox origin to 0% and the far edge to 100%', () => {
    expect(pctOfViewBoxX(0)).toBe('0.000%')
    expect(pctOfViewBoxY(0)).toBe('0.000%')
    expect(pctOfViewBoxX(CHART_W)).toBe('100.000%')
    expect(pctOfViewBoxY(CHART_H)).toBe('100.000%')
  })

  it('keeps axis-label positions from the real geometry helpers parseable', () => {
    const geometry = buildChartGeometry([
      { date: '2026-07-01T12:00:00.000Z', scans: 10 },
      { date: '2026-07-02T12:00:00.000Z', scans: 20 },
    ])

    // y-label at grid line i=2 → parse back to a number close to 50%.
    const yPct = parseFloat(pctOfViewBoxY(geometry.gridLines[2].y))
    expect(yPct).toBeGreaterThan(0)
    expect(yPct).toBeLessThan(100)
    // x-label for the first point sits just inside the left pad.
    const xPct = parseFloat(pctOfViewBoxX(geometry.x(0)))
    expect(xPct).toBeGreaterThan(0)
    expect(xPct).toBeLessThan(10)
  })
})

// ---------------------------------------------------------------------------
// buildHourlyBarGeometry — shared hourly-bar math for the queue panels.
// Locks in: slot/bar widths from the plot width, the series max for bar
// scaling, and the edge-to-edge hit cells aligned to the caller's pad.
// ---------------------------------------------------------------------------

function hourlySeries(n, processed = 5) {
  return Array.from({ length: n }, (_, i) => ({
    hour: `2026-07-${String(i + 1).padStart(2, '0')}T09:00:00.000Z`,
    processed,
  }))
}

describe('buildHourlyBarGeometry', () => {
  it('computes slot/bar width and the series max from the shared defaults', () => {
    const points = hourlySeries(12, 7)
    const geometry = buildHourlyBarGeometry(points)

    const plotW = CHART_W - PAD.left - PAD.right
    expect(geometry.slotW).toBeCloseTo(plotW / 12, 6)
    expect(geometry.barW).toBeCloseTo(geometry.slotW * 0.64, 6)
    expect(geometry.hourlyMax).toBe(7)
    // barBaseY defaults to chartH - 20 (the shared-pad convention).
    expect(geometry.barBaseY).toBe(CHART_H - 20)
  })

  it('aligns hit cells to the custom queue-panel geometry (QUEUE_PAD)', () => {
    // Monitoring draws against QUEUE_CHART_W=720 / QUEUE_CHART_H=120 /
    // QUEUE_PAD {left: 8, right: 8} with taller bars — every override must
    // flow through so the cells stay aligned with the bars.
    const points = hourlySeries(12)
    const geometry = buildHourlyBarGeometry(points, {
      chartW: 720,
      chartH: 120,
      pad: { left: 8, right: 8 },
      barBaseY: 104,
    })

    expect(geometry.slotW).toBeCloseTo(704 / 12, 6)
    expect(geometry.barBaseY).toBe(104)
    expect(geometry.hitAreas).toHaveLength(12)
    // Cells tile the custom plot bounds edge-to-edge.
    expect(geometry.hitAreas[0].x).toBe(8)
    const last = geometry.hitAreas[11]
    expect(last.x + last.width).toBe(720 - 8)
  })

  it('keeps the first slot inside its own cell (no dead zone)', () => {
    const points = hourlySeries(12)
    const geometry = buildHourlyBarGeometry(points)
    const first = geometry.hitAreas[0]

    // The first bar's left edge sits at pad.left + (slotW - barW)/2, which
    // must fall inside the first cell (starting at pad.left).
    const barLeft = PAD.left + (geometry.slotW - geometry.barW) / 2
    expect(first.x).toBe(PAD.left)
    expect(barLeft).toBeGreaterThanOrEqual(first.x)
    expect(barLeft).toBeLessThan(first.x + first.width)
  })

  it('returns zero slot width and no cells for an empty series', () => {
    const geometry = buildHourlyBarGeometry([])

    expect(geometry.slotW).toBe(0)
    expect(geometry.hourlyMax).toBe(0)
    expect(geometry.hitAreas).toEqual([])
  })

  it('reports hourlyMax 0 when every value is zero or negative (chart hidden)', () => {
    const zeroes = hourlySeries(4, 0)
    expect(buildHourlyBarGeometry(zeroes).hourlyMax).toBe(0)

    const negatives = hourlySeries(4, -3)
    expect(buildHourlyBarGeometry(negatives).hourlyMax).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// buildDonutSegments — ring/donut arc geometry. Locks in: totals + shares
// from the values, arc lengths proportional to value, sequential dash-offsets
// (each arc starts where the previous ended), zero/negative values excluded
// from the arcs, and an all-zero set yielding no arcs at all.
// ---------------------------------------------------------------------------

describe('buildDonutSegments', () => {
  it('computes the total, proportional arc lengths, and accumulating offsets', () => {
    const { total, r, circumference, arcs } = buildDonutSegments([
      { key: 'a', value: 10 },
      { key: 'b', value: 30 },
    ])

    expect(total).toBe(40)
    expect(r).toBe(160 / 2 - 20 / 2 - 2) // 58
    expect(circumference).toBeCloseTo(2 * Math.PI * r, 6)
    expect(arcs).toHaveLength(2)
    // Lengths are proportional to value share of the circumference.
    expect(arcs[0].len).toBeCloseTo(circumference * 0.25, 6)
    expect(arcs[1].len).toBeCloseTo(circumference * 0.75, 6)
    // The second arc's dash-offset shifts it to start right after the first.
    // (The first arc's offset is `-0` — Object.is-distinct from `0`.)
    expect(arcs[0].offset).toBeCloseTo(0, 6)
    expect(arcs[1].offset).toBeCloseTo(-arcs[0].len, 6)
    // Shares sum to 1.
    expect(arcs[0].share + arcs[1].share).toBeCloseTo(1, 6)
  })

  it('excludes zero-value segments from the arcs but keeps them out of the total', () => {
    const { total, arcs } = buildDonutSegments([
      { key: 'a', value: 10 },
      { key: 'zero', value: 0 },
      { key: 'b', value: 30 },
    ])

    expect(total).toBe(40)
    expect(arcs).toHaveLength(2)
    expect(arcs.map((arc) => arc.key)).toEqual(['a', 'b'])
    expect(arcs[1].offset).toBeCloseTo(-arcs[0].len, 6)
  })

  it('clamps negative and NaN values to zero (never inverted arcs)', () => {
    const { total, arcs } = buildDonutSegments([
      { key: 'bad', value: -5 },
      { key: 'nan', value: NaN },
      { key: 'ok', value: 20 },
    ])

    expect(total).toBe(20)
    expect(arcs).toHaveLength(1)
    expect(arcs[0]).toMatchObject({ key: 'ok', value: 20, share: 1 })
  })

  it('returns zero total and no arcs for an all-zero set', () => {
    const { total, arcs } = buildDonutSegments([
      { key: 'a', value: 0 },
      { key: 'b', value: 0 },
    ])

    expect(total).toBe(0)
    expect(arcs).toEqual([])
  })

  it('honors custom size + thickness for the ring radius', () => {
    const { r, circumference } = buildDonutSegments([{ key: 'a', value: 5 }], {
      size: 200,
      thickness: 24,
    })

    expect(r).toBe(200 / 2 - 24 / 2 - 2) // 86
    expect(circumference).toBeCloseTo(2 * Math.PI * 86, 6)
  })
})

// ---------------------------------------------------------------------------
// buildStackedBarGeometry + stackedSegmentBounds — stacked-bar charts (the
// verdict mix surface). Locks in: per-point totals drive yMax, and segment
// rects tile from the baseline in segment order with non-negative heights.
// ---------------------------------------------------------------------------

const STACK_SEGMENTS = [
  { key: 'authentic', color: '#10b981' },
  { key: 'suspicious', color: '#f59e0b' },
  { key: 'inconclusive', color: '#38bdf8' },
]

function stackedSeries(n) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
    authentic: 5 + i,
    suspicious: 3,
    inconclusive: 2,
  }))
}

describe('buildStackedBarGeometry', () => {
  it('scales yMax from the largest per-point total', () => {
    const points = stackedSeries(3) // totals: 10, 11, 12
    const geometry = buildStackedBarGeometry(points, STACK_SEGMENTS)

    // yMax = ceil(12 * 1.2 / 10) * 10 = 20
    expect(geometry.yMax).toBe(20)
    expect(geometry.y(0)).toBe(PAD.top + geometry.plotH)
    expect(geometry.y(geometry.yMax)).toBe(PAD.top)
  })

  it('keeps bar widths within the group width and inside the plot', () => {
    const points = stackedSeries(14)
    const geometry = buildStackedBarGeometry(points, STACK_SEGMENTS)

    expect(geometry.barW).toBeLessThanOrEqual(geometry.groupW)
    expect(geometry.barW).toBeGreaterThan(0)
    // First bar starts after the left pad; last bar ends before the right edge.
    expect(geometry.x(0)).toBeGreaterThanOrEqual(PAD.left)
    expect(geometry.x(13) + geometry.barW).toBeLessThanOrEqual(CHART_W - PAD.right + 1)
  })
})

describe('stackedSegmentBounds', () => {
  it('tiles segments bottom → top with non-negative heights summing to the total', () => {
    const points = stackedSeries(1)
    const geometry = buildStackedBarGeometry(points, STACK_SEGMENTS)
    const bounds = stackedSegmentBounds(points[0], geometry, STACK_SEGMENTS)

    expect(bounds).toHaveLength(3)
    // Segment order = stack order: authentic (bottom) → inconclusive (top).
    expect(bounds[0].yTop).toBeGreaterThan(bounds[1].yTop)
    expect(bounds[1].yTop).toBeGreaterThan(bounds[2].yTop)
    expect(bounds.every((b) => b.height >= 0)).toBe(true)
    // Heights (in y-units) mirror the values: taller stack = higher on the chart.
    expect(bounds[2].yTop).toBeLessThan(bounds[0].yTop)
    // Segment config color flows through to the painter.
    expect(bounds.map((b) => b.color)).toEqual(['#10b981', '#f59e0b', '#38bdf8'])
  })

  it('supports the hover outline contract: last segment top → first segment bottom (full stack)', () => {
    const points = stackedSeries(1) // authentic 5 + suspicious 3 + inconclusive 2 = 10
    const geometry = buildStackedBarGeometry(points, STACK_SEGMENTS)
    const bounds = stackedSegmentBounds(points[0], geometry, STACK_SEGMENTS)

    const stackTop = bounds[bounds.length - 1].yTop
    const baseline = bounds[0].bottom

    // Outline spans the whole bar, not just the bottom segment.
    expect(baseline - stackTop).toBeGreaterThan(
      bounds[0].height, // bottom segment's own height alone
    )
    expect(stackTop).toBeLessThan(bounds[0].yTop)
  })

  it('handles zero values with zero-height rects without throwing', () => {
    const point = { date: '2026-07-01T12:00:00.000Z', authentic: 0, suspicious: 0, inconclusive: 0 }
    const geometry = buildStackedBarGeometry([point], STACK_SEGMENTS)
    const bounds = stackedSegmentBounds(point, geometry, STACK_SEGMENTS)

    expect(bounds.every((b) => b.height === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// stackedOutlineBounds — the hover-outline math extracted from StackedBarChart
// (stack top from the last segment, baseline from the first). Locks in that
// the outline spans the FULL stack, collapses to zero height for all-zero
// points, and falls back to the shared PAD defaults with no segments.
// ---------------------------------------------------------------------------

describe('stackedOutlineBounds', () => {
  it('spans the full stack: last segment top → first segment bottom, height = Σ segments', () => {
    const point = stackedSeries(1)[0] // authentic 5 + suspicious 3 + inconclusive 2 = 10
    const geometry = buildStackedBarGeometry([point], STACK_SEGMENTS)
    const outline = stackedOutlineBounds(point, geometry, STACK_SEGMENTS)
    const bounds = stackedSegmentBounds(point, geometry, STACK_SEGMENTS)

    // Stack top comes from the LAST (top-most) segment; baseline from the first.
    expect(outline.yTop).toBe(bounds[bounds.length - 1].yTop)
    expect(outline.bottom).toBe(bounds[0].bottom)
    // Outline height equals the sum of every segment's height (full stack).
    const totalHeight = bounds.reduce((sum, b) => sum + b.height, 0)
    expect(outline.height).toBeCloseTo(totalHeight, 6)
    // And it spans strictly more than the bottom segment alone (the historic
    // bug: outlining only the bottom segment).
    expect(outline.height).toBeGreaterThan(bounds[0].height)
  })

  it('collapses to zero height for an all-zero point (never inverted or NaN)', () => {
    const point = { date: '2026-07-01T12:00:00.000Z', authentic: 0, suspicious: 0, inconclusive: 0 }
    const geometry = buildStackedBarGeometry([point], STACK_SEGMENTS)
    const outline = stackedOutlineBounds(point, geometry, STACK_SEGMENTS)

    expect(outline.yTop).toBe(outline.bottom)
    expect(outline.height).toBe(0)
  })

  it('falls back to the shared PAD plot bounds with no segments', () => {
    const point = { date: '2026-07-01T12:00:00.000Z' }
    const geometry = buildStackedBarGeometry([point], [])
    const outline = stackedOutlineBounds(point, geometry, [])

    expect(outline.yTop).toBe(PAD.top)
    expect(outline.bottom).toBe(PAD.top + geometry.plotH)
    expect(outline.height).toBe(geometry.plotH)
  })

  it('matches the segment bounds exactly for a single-segment stack', () => {
    const point = { date: '2026-07-01T12:00:00.000Z', authentic: 7 }
    const single = [{ key: 'authentic' }]
    const geometry = buildStackedBarGeometry([point], single)
    const bounds = stackedSegmentBounds(point, geometry, single)
    const outline = stackedOutlineBounds(point, geometry, single)

    expect(outline.yTop).toBe(bounds[0].yTop)
    expect(outline.bottom).toBe(bounds[0].bottom)
    expect(outline.height).toBe(bounds[0].height)
  })

  it('is consistent with the stackedSegmentBounds contract at the point level', () => {
    // For every point in a series, the outline must cover the union of its
    // segments' spans exactly — no gap at the top, no overhang below.
    const points = stackedSeries(5)
    const geometry = buildStackedBarGeometry(points, STACK_SEGMENTS)

    points.forEach((point) => {
      const bounds = stackedSegmentBounds(point, geometry, STACK_SEGMENTS)
      const outline = stackedOutlineBounds(point, geometry, STACK_SEGMENTS)
      const minTop = Math.min(...bounds.map((b) => b.yTop))
      const maxBottom = Math.max(...bounds.map((b) => b.bottom))

      expect(outline.yTop).toBeCloseTo(minTop, 6)
      expect(outline.bottom).toBeCloseTo(maxBottom, 6)
      expect(outline.height).toBeCloseTo(maxBottom - minTop, 6)
    })
  })
})
