// ---------------------------------------------------------------------------
// Shared self-hosted chart geometry (viewBox math + percentage label helpers)
//
// Kept in its own module (not inside a component file) so fast-refresh stays
// happy, and so sibling charts (e.g. the admin analytics verdict/queue charts)
// can reuse the same coordinate system and crisp HTML axis-label math.
// ---------------------------------------------------------------------------

export const CHART_W = 720
export const CHART_H = 220
export const PAD = { top: 16, right: 12, bottom: 28, left: 34 }

// Negative, NaN, or non-numeric values clamp to 0 so malformed data renders
// at the baseline instead of above the plot or as NaN path coordinates.
// Numeric strings are coerced (preserving the old `p.scans || 0` semantics).
const clamp0 = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function buildChartGeometry(points) {
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const maxValue = Math.max(1, ...points.map((p) => clamp0(p.scans)))
  const yMax = Math.ceil((maxValue * 1.2) / 10) * 10
  const xStep = points.length > 1 ? plotW / (points.length - 1) : plotW

  const x = (i) => PAD.left + (points.length > 1 ? i * xStep : plotW / 2)
  const y = (value) => PAD.top + plotH - (clamp0(value) / yMax) * plotH

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.scans).toFixed(1)}`)
    .join(' ')

  const completedPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.completed).toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = (yMax / 4) * i
    return { value, y: y(value) }
  })

  return { x, y, yMax, linePath, completedPath, areaPath, gridLines, xStep, plotH }
}

// Percentage-of-viewBox helpers for the HTML axis labels that overlay the SVG.
// Round to 3 decimals so CSS `top`/`left` values stay short (e.g. 4.722% not
// 4.722222222222222%) — sub-pixel drift at 1/1000th of a percent is invisible,
// and short values keep the DOM styles readable.
function pctOf(value, total) {
  return `${((value / total) * 100).toFixed(3)}%`
}

export function pctOfViewBoxY(viewBoxY) {
  return pctOf(viewBoxY, CHART_H)
}

export function pctOfViewBoxX(viewBoxX) {
  return pctOf(viewBoxX, CHART_W)
}

// ---------------------------------------------------------------------------
// buildStackedBarGeometry
//
// Shared geometry for stacked-bar charts (e.g. the verdict mix chart): a bar
// group per point whose height maps to the point's total across the given
// segments, with grid lines and crisp axis-label math identical to the line
// chart's coordinate system.
//
//   segments  [{ key, ... }] — segment order defines the stack order
//                              (index 0 = bottom of each bar)
// ---------------------------------------------------------------------------
export function buildStackedBarGeometry(points, segments) {
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const totalOf = (p) =>
    segments.reduce((sum, s) => sum + (p[s.key] || 0), 0)
  const maxTotal = Math.max(1, ...points.map(totalOf))
  const yMax = Math.ceil((maxTotal * 1.2) / 10) * 10
  const groupW = points.length > 0 ? plotW / points.length : plotW
  const barW = Math.max(6, groupW * 0.62)

  const x = (i) => PAD.left + groupW * i + (groupW - barW) / 2
  const y = (value) => PAD.top + plotH - (value / yMax) * plotH

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = (yMax / 4) * i
    return { value, y: y(value) }
  })

  return { yMax, x, y, gridLines, barW, groupW, plotH }
}

// ---------------------------------------------------------------------------
// stackedSegmentBounds
//
// Computes the SVG rect (y + height) for each segment of one bar, bottom →
// top in `segments` order. Uses the same "cumulative from the baseline"
// arithmetic as buildChartGeometry so stacked totals always land on the
// shared y-axis. Renders carry `color` (from the segment config) so the bar
// painter doesn't need a separate lookup.
// ---------------------------------------------------------------------------
export function stackedSegmentBounds(point, geometry, segments) {
  const bottom = geometry.y(0)
  let cumulative = 0

  return segments.map((s) => {
    const value = point[s.key] || 0
    const yTop = geometry.y(cumulative + value)
    const yBottom = geometry.y(cumulative)
    cumulative += value

    return {
      key: s.key,
      value,
      color: s.color ?? null,
      yTop,
      height: Math.max(0, yBottom - yTop),
      bottom,
    }
  })
}

// ---------------------------------------------------------------------------
// stackedOutlineBounds
//
// The hover-outline geometry for a stacked bar (extracted from StackedBarChart
// so the math is unit-testable and shared): given the hovered point, returns
// the outline rect's y span over the FULL stack — stack top from the last
// segment's yTop, baseline from the first segment's bottom, and the clamped
// height between them. With no segments (or all-zero values) the stack
// collapses: the fallbacks mirror the component's PAD defaults and the height
// clamps to 0 so the outline never renders inverted or NaN.
//
//   point     [{ [segmentKey]: number }] — the hovered data point
//   geometry  from buildStackedBarGeometry
//   segments  [{ key }] — stack definition (index 0 = bottom)
//
// Returns { yTop, bottom, height }.
// ---------------------------------------------------------------------------
export function stackedOutlineBounds(point, geometry, segments) {
  const bounds = stackedSegmentBounds(point, geometry, segments)
  const yTop = bounds[bounds.length - 1]?.yTop ?? PAD.top
  const bottom = bounds[0]?.bottom ?? PAD.top + geometry.plotH
  return {
    yTop,
    bottom,
    height: Math.max(0, bottom - yTop),
  }
}

// ---------------------------------------------------------------------------
// buildDonutSegments
//
// Shared geometry for ring/donut charts: given the segments, computes the
// total, ring radius, circumference, and each positive-value segment's arc
// (length in circumference units + the stroke-dashoffset that places it right
// after the previous segment, starting at 12 o'clock via a -90° rotation in
// the painter). Zero-value segments are excluded from the arcs (the legend
// still shows them) and an all-zero set yields `total: 0` with no arcs.
//
//   segments  [{ key, value }] — value clamps to 0 (negatives/NaN never
//             produce inverted arcs)
//   options   { size, thickness } viewBox diameter + ring stroke width
//
// Returns { total, r, circumference, arcs: [{ key, value, share, len, offset }] }.
// ---------------------------------------------------------------------------
export function buildDonutSegments(
  segments,
  { size = 160, thickness = 20 } = {},
) {
  const total = segments.reduce((sum, s) => sum + clamp0(s.value), 0)
  const r = Math.max(0, size / 2 - thickness / 2 - 2)
  const circumference = 2 * Math.PI * r
  let accumulated = 0

  const arcs = segments
    .filter((s) => clamp0(s.value) > 0)
    .map((s) => {
      const value = clamp0(s.value)
      const len = total > 0 ? (value / total) * circumference : 0
      const arc = {
        key: s.key,
        value,
        share: total > 0 ? value / total : 0,
        len,
        offset: -accumulated,
      }
      accumulated += len
      return arc
    })

  return { total, r, circumference, arcs }
}

// ---------------------------------------------------------------------------
// buildHitAreaCells
//
// Returns one transparent hover cell per point, sized and positioned so the
// cells tile the full plot area edge-to-edge with no dead zones. The first
// and last cells are clamped to the plot bounds and extend a full cell width
// where the centered half-cell would leave a gap — fixing the classic bug
// where the first point falls outside every rect's hit area.
// ---------------------------------------------------------------------------
export function buildHitAreaCells(points) {
  const geometry = buildChartGeometry(points)
  const plotLeft = PAD.left
  const plotRight = CHART_W - PAD.right

  return points.map((_, i) => {
    const center = geometry.x(i)
    const half = geometry.xStep / 2
    const x = i === 0 ? plotLeft : Math.max(plotLeft, center - half)
    const rightEdge = i === points.length - 1 ? plotRight : Math.min(plotRight, center + half)

    // Clamp the edge cells to a positive width even for tiny point counts.
    const width = Math.max(0, rightEdge - x)

    return { x, width }
  })
}

// ---------------------------------------------------------------------------
// buildGroupedHitAreaCells
//
// Grouped variant of buildHitAreaCells for bar charts (stacked bars, hourly
// bars): one transparent hover cell per point slot, tiling the plot area
// edge-to-edge so no bar — including the first and last — falls in a dead
// zone. Unlike the line variant, cells are group-aligned (slot width), so
// the geometry comes from the bar chart's group width rather than xStep.
//
//   pointCount  number of slots (bars)
//   groupW      width of one group/slot in viewBox units (the caller's
//               geometry.groupW or computed slot width)
//   bounds      optional { plotLeft, plotRight } overriding the shared
//               PAD-derived plot bounds — required when a chart uses its own
//               viewBox (e.g. the queue panels' QUEUE_CHART_W / QUEUE_PAD)
// ---------------------------------------------------------------------------
export function buildGroupedHitAreaCells(
  pointCount,
  groupW,
  bounds = {},
) {
  const plotLeft = bounds.plotLeft ?? PAD.left
  const plotRight = bounds.plotRight ?? CHART_W - PAD.right

  return Array.from({ length: pointCount }, (_, i) => {
    const x = i === 0 ? plotLeft : Math.max(plotLeft, plotLeft + i * groupW)
    const rightEdge = i === pointCount - 1 ? plotRight : Math.min(plotRight, plotLeft + (i + 1) * groupW)

    // Clamp the edge cells to a positive width even for tiny point counts.
    const width = Math.max(0, rightEdge - x)

    return { x, width }
  })
}

// ---------------------------------------------------------------------------
// buildHourlyBarGeometry
//
// Shared geometry for the hourly bar charts (queue throughput on Analytics,
// queue health on Monitoring). Both panels used to hand-roll the same math —
// slot width, series max, bar width, and the edge-to-edge hover cells — so
// the HourlyBarChart primitive now owns it. Custom viewBoxes flow through
// `options` (e.g. the queue panels' QUEUE_CHART_W=720 / QUEUE_PAD
// {left: 8, right: 8}); defaults match the shared CHART_W/CHART_H/PAD.
//
//   points  [{ hour, processed }] — the hourly series
//   options { chartW, chartH, pad, barBaseY } geometry overrides;
//           barBaseY defaults to `chartH - 20` (the shared-pad convention)
//
// Returns { slotW, hourlyMax, barW, barBaseY, hitAreas }.
// ---------------------------------------------------------------------------
export function buildHourlyBarGeometry(
  points,
  { chartW = CHART_W, chartH = CHART_H, pad = PAD, barBaseY = chartH - 20 } = {},
) {
  const slotW = points.length > 0 ? (chartW - pad.left - pad.right) / points.length : 0
  const hourlyMax = points.reduce((max, p) => Math.max(max, clamp0(p.processed)), 0)
  const barW = slotW * 0.64
  const hitAreas = buildGroupedHitAreaCells(points.length, slotW, {
    plotLeft: pad.left,
    plotRight: chartW - pad.right,
  })

  return { slotW, hourlyMax, barW, barBaseY, hitAreas }
}
