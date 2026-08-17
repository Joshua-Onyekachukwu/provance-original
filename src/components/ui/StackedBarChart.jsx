import { useMemo, useState } from 'react'
import { formatPct, formatShortDate } from '../app/scanPresentation.js'
import ChartHoverReadout, { ChartAxisLabels } from './ChartHoverReadout.jsx'
import {
  CHART_H,
  CHART_W,
  PAD,
  buildGroupedHitAreaCells,
  buildStackedBarGeometry,
  stackedOutlineBounds,
  stackedSegmentBounds,
} from './chartGeometry.js'

// ---------------------------------------------------------------------------
// StackedBarChart
//
// Self-hosted SVG stacked-bar chart (no chart library — pure viewBox math +
// crisp HTML axis labels). Renders one bar per data point, split into
// segments from bottom → top in `segments` order, with:
//   - hover readout (date + per-segment counts) with a guide line + outline
//   - transparent full-cell hit areas (no dead zones, including the first bar)
//   - HTML axis labels positioned from the viewBox percentages
//   - legend with per-segment totals and shares of the grand total
//
// Props:
//   data             [{ date, [segmentKey]: number, ... }] — the series;
//                    the tail (last `days` entries) is rendered.
//   segments         [{ key, label, color, readoutClass }] — stack definition.
//                    index 0 sits at the bottom of each bar; `color` drives the
//                    SVG fill, `readoutClass` the hover text tint.
//   days             how many trailing points to render (default 14)
//   title            eyebrow text (default 'Stacked breakdown')
//   description      optional one-line subtext under the eyebrow
//   ariaLabel        SVG aria-label
//   emptyTitle       fallback heading when data is empty (defaults supplied)
//   emptyDescription
//   className        extra classes for the panel wrapper
// ---------------------------------------------------------------------------

export default function StackedBarChart({
  data = [],
  segments = [],
  days = 14,
  title = 'Stacked breakdown',
  description = null,
  ariaLabel = 'Daily stacked breakdown over the selected range',
  emptyTitle = 'No data in range',
  emptyDescription = 'Extend the range or wait for new data to land.',
  className = '',
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const points = useMemo(() => data.slice(-days), [data, days])
  const geometry = useMemo(
    () => buildStackedBarGeometry(points, segments),
    [points, segments],
  )
  // Grouped hover cells — one full slot per bar, tiled edge-to-edge with no
  // dead zones (shared with the hourly queue bars via chartGeometry).
  const hitAreas = useMemo(
    () => buildGroupedHitAreaCells(points.length, geometry.groupW),
    [points.length, geometry.groupW],
  )

  const totals = useMemo(() => {
    const acc = {}
    points.forEach((p) => {
      segments.forEach((s) => {
        acc[s.key] = (acc[s.key] || 0) + (p[s.key] || 0)
      })
    })
    return acc
  }, [points, segments])

  const grandTotal = segments.reduce((sum, s) => sum + (totals[s.key] || 0), 0)
  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  // ── Empty ────────────────────────────────────────────────────────────────
  if (points.length === 0) {
    return (
      <div
        className={`rounded-3xl border border-stone-light bg-white-warm p-8 text-center shadow-sm ${className}`}
      >
        <p className="font-serif text-lg text-charcoal">{emptyTitle}</p>
        <p className="mt-1 text-sm text-charcoal-mid">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm ${className}`}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm text-charcoal-mid">{description}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          {points.length} days · {grandTotal.toLocaleString()} total
        </span>
      </div>

      {/* Hover readout — shared primitive so every chart styles identically */}
      <ChartHoverReadout
        label={hovered ? formatShortDate(hovered.date) : null}
        hint="Hover a bar for the daily split"
        items={hovered
          ? segments.map((s) => ({
              key: s.key,
              text: `${hovered[s.key] || 0} ${s.label.toLowerCase()}`,
              className: s.readoutClass || 'text-charcoal-mid',
            }))
          : []}
      />

      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-48 w-full sm:h-52"
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="none"
        >
          {/* Grid lines (HTML labels below stay crisp at any width) */}
          {geometry.gridLines.map((line) => (
            <line
              key={line.y}
              x1={PAD.left}
              y1={line.y}
              x2={CHART_W - PAD.right}
              y2={line.y}
              stroke="#e7e4dc"
              strokeWidth="1"
            />
          ))}

          {/* Stacked bars — segment order bottom → top */}
          {points.map((p, i) => {
            const bounds = stackedSegmentBounds(p, geometry, segments)
            return (
              <g key={p.date}>
                {bounds.map((segment) => (
                  <rect
                    key={`${p.date}-${segment.key}`}
                    x={geometry.x(i)}
                    y={segment.yTop}
                    width={geometry.barW}
                    height={segment.height}
                    fill={segment.color}
                  />
                ))}
              </g>
            )
          })}

          {/* Hover guide + outlined bar — outline spans the full stack
              (stack top from the last segment, baseline from the first) */}
          {hoverIndex !== null && hovered ? (() => {
            const outline = stackedOutlineBounds(hovered, geometry, segments)
            return (
              <>
                <line
                  x1={geometry.x(hoverIndex) + geometry.barW / 2}
                  y1={PAD.top}
                  x2={geometry.x(hoverIndex) + geometry.barW / 2}
                  y2={PAD.top + geometry.plotH}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.4"
                />
                <rect
                  x={geometry.x(hoverIndex)}
                  y={outline.yTop}
                  width={geometry.barW}
                  height={outline.height}
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth="1.5"
                  rx="2"
                />
              </>
            )
          })() : null}

          {/* Transparent hover hit-areas — shared grouped cells tile the plot
              edge-to-edge so no bar (including the first) falls in a dead zone */}
          {hitAreas.map((cell, i) => (
            <rect
              key={`hit-${i}`}
              x={cell.x}
              y={PAD.top}
              width={cell.width}
              height={geometry.plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>

        {/* HTML axis labels — shared overlay with bar-center x anchors */}
        <ChartAxisLabels
          geometry={geometry}
          points={points}
          xLabel={(p) => formatShortDate(p.date)}
          xLabelX={(i) => geometry.x(i) + geometry.barW / 2}
        />
      </div>

      {/* Legend with totals + shares */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {segments.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-2 text-xs text-charcoal-mid">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.label} ({totals[segment.key].toLocaleString()} ·{' '}
            {formatPct(grandTotal > 0 ? totals[segment.key] / grandTotal : 0, 0)})
          </span>
        ))}
      </div>
    </div>
  )
}
