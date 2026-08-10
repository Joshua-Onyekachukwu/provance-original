import { useMemo, useState } from 'react'
import { formatHourShort } from '../app/scanPresentation.js'
import ChartHoverReadout from './ChartHoverReadout.jsx'
import {
  CHART_H,
  CHART_W,
  PAD,
  buildHourlyBarGeometry,
} from './chartGeometry.js'

// ---------------------------------------------------------------------------
// HourlyBarChart
//
// Self-hosted SVG hourly bar chart (e.g. "scans processed per hour over the
// last 12h") extracted from the admin queue panels (Analytics queue
// throughput, Monitoring queue health) so no surface hand-rolls the bar
// SVG anymore. Owns the full interaction surface:
//   - hover readout (shared ChartHoverReadout, compact size)
//   - bars with the last slot emphasized (charcoal vs. stone)
//   - hover guide line + outlined bar
//   - transparent edge-to-edge hit cells (no dead zones, incl. the first bar)
//   - crisp HTML axis labels (first / middle / last hour)
//
// The two original panels used different viewBox geometry — Analytics drew
// against the shared CHART_W/CHART_H/PAD, Monitoring against a custom
// QUEUE_CHART_W=720 / QUEUE_CHART_H=120 / QUEUE_PAD={left: 8, right: 8} with
// taller bars. All of that flows through the geometry props; defaults match
// the Analytics usage so callers only override what differs.
//
// Props:
//   points        [{ hour, processed }] — the hourly series (required)
//   ariaLabel     SVG aria-label
//   formatLabel   (point) => string — readout + axis label text (default
//                 formatHourShort(point.hour))
//   hint          idle readout text before any hover
//   itemText      (point) => string — the readout's value item (default
//                 `${point.processed ?? 0} processed`)
//   chartW        viewBox width  (default CHART_W)
//   chartH        viewBox height (default CHART_H)
//   pad           { left, right, top, bottom } plot padding (default PAD)
//   barAreaH      height of the bar plot area in viewBox units (default 64)
//   barBaseY      y of the bar baseline (default chartH - 20)
//   guideTop      y where the hover guide line starts (default pad.top)
//   svgClassName  rendered SVG height classes (default 'h-24 w-full')
//
// Renders nothing when points is empty or every value is zero (the panels
// gate the surrounding block themselves).
// ---------------------------------------------------------------------------

export default function HourlyBarChart({
  points = [],
  ariaLabel = 'Scans processed per hour over the last 12 hours',
  formatLabel = (p) => formatHourShort(p.hour),
  hint = 'Hover a bar for the hourly count',
  itemText = (p) => `${p.processed ?? 0} processed`,
  chartW = CHART_W,
  chartH = CHART_H,
  pad = PAD,
  barAreaH = 64,
  barBaseY = chartH - 20,
  guideTop = pad.top,
  svgClassName = 'h-24 w-full',
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  // Geometry — computed unconditionally so hook order stays stable across
  // the early return below.
  const geometry = useMemo(
    () => buildHourlyBarGeometry(points, { chartW, chartH, pad, barBaseY }),
    [points, chartW, chartH, pad, barBaseY],
  )

  if (points.length === 0 || geometry.hourlyMax === 0) return null

  const last = points[points.length - 1] || null
  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const { slotW, hourlyMax, barW, hitAreas } = geometry

  return (
    <>
      {/* Hover readout — shared compact primitive, identical affordance to
          the TrendChart / verdict charts */}
      <ChartHoverReadout
        size="compact"
        label={hovered ? formatLabel(hovered) : null}
        hint={hint}
        items={hovered ? [{ key: 'processed', text: itemText(hovered) }] : []}
      />
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className={svgClassName}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        {points.map((p, i) => {
          const barH = ((p.processed || 0) / hourlyMax) * barAreaH
          return (
            <rect
              key={p.hour}
              x={pad.left + slotW * i + (slotW - barW) / 2}
              y={barBaseY - barH}
              width={barW}
              height={barH}
              rx="2"
              fill={i === points.length - 1 ? '#1f2937' : '#c7c3b8'}
            />
          )
        })}

        {/* Hover guide + highlighted bar */}
        {hoverIndex !== null && hovered ? (
          <>
            <line
              x1={pad.left + slotW * hoverIndex + barW / 2}
              y1={guideTop}
              x2={pad.left + slotW * hoverIndex + barW / 2}
              y2={barBaseY}
              stroke="#1f2937"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <rect
              x={pad.left + slotW * hoverIndex + (slotW - barW) / 2}
              y={barBaseY - ((hovered.processed || 0) / hourlyMax) * barAreaH}
              width={barW}
              height={((hovered.processed || 0) / hourlyMax) * barAreaH}
              rx="2"
              fill="none"
              stroke="#1f2937"
              strokeWidth="1.5"
            />
          </>
        ) : null}

        {/* Transparent hover hit-areas — shared grouped cells tile the plot
            edge-to-edge so no bar (including the first) falls in a dead
            zone; y spans exactly the bar area (barBaseY - barAreaH →
            barBaseY) so the cells overlap the drawn bars */}
        {hitAreas.map((cell, i) => (
          <rect
            key={`hit-${i}`}
            x={cell.x}
            y={barBaseY - barAreaH}
            width={cell.width}
            height={barAreaH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-charcoal-light/70">
        <span>{formatLabel(points[0])}</span>
        <span>{formatLabel(points[Math.floor(points.length / 2)])}</span>
        <span>{last ? formatLabel(last) : null}</span>
      </div>
    </>
  )
}
