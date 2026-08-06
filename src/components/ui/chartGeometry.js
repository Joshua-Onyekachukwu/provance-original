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

export function buildChartGeometry(points) {
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const maxValue = Math.max(1, ...points.map((p) => p.scans || 0))
  const yMax = Math.ceil((maxValue * 1.2) / 10) * 10
  const xStep = points.length > 1 ? plotW / (points.length - 1) : plotW

  const x = (i) => PAD.left + (points.length > 1 ? i * xStep : plotW / 2)
  const y = (value) => PAD.top + plotH - (value / yMax) * plotH

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.scans || 0).toFixed(1)}`)
    .join(' ')

  const completedPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.completed || 0).toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = (yMax / 4) * i
    return { value, y: y(value) }
  })

  return { x, y, yMax, linePath, completedPath, areaPath, gridLines, xStep, plotH }
}

export function pctOfViewBoxY(viewBoxY) {
  return `${(viewBoxY / CHART_H) * 100}%`
}

export function pctOfViewBoxX(viewBoxX) {
  return `${(viewBoxX / CHART_W) * 100}%`
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
