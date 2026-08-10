import { useState } from 'react'
import { formatPct } from '../app/scanPresentation.js'
import ChartHoverReadout from './ChartHoverReadout.jsx'
import { buildDonutSegments } from './chartGeometry.js'

// ---------------------------------------------------------------------------
// DonutChart
//
// Self-hosted SVG ring/donut chart for share-of-total distributions (admin
// media-type distribution, dashboard verdict share) — the replacement for
// hand-rolled percentage bars. Renders a full panel card like TrendChart /
// StackedBarChart:
//   - eyebrow title + optional description + optional badge pill
//   - a light full-circle track with one colored arc per positive segment
//     (stroke-dasharray arcs from buildDonutSegments, starting at 12 o'clock)
//   - hover readout (segment label + value · share) with the hovered arc
//     widening so the segment visibly pops
//   - crisp HTML center total (SVG <text> is blurry at odd sizes)
//   - a legend row per segment: dot · label · value · share
//
// Props:
//   segments        [{ key, label, value, color }] — value 0 segments stay in
//                   the legend but draw no arc
//   title           eyebrow text (default 'Distribution share')
//   description     optional one-line subtext under the eyebrow
//   badge           optional right-aligned pill (e.g. '6 types')
//   size            viewBox diameter in units (default 160)
//   thickness       ring stroke width (default 20)
//   ariaLabel       SVG aria-label
//   centerText      center big number (defaults to the formatted total)
//   centerHint      small line under the center number (e.g. 'uploads')
//   legendValue     (segment) => string — the legend's value column
//                   (default value.toLocaleString())
//   readoutValue    (segment, share) => string — the hover readout's item
//                   (default `${value.toLocaleString()} · ${formatPct(share, 1)}`)
//   emptyTitle      empty-state heading (all values zero)
//   emptyDescription
//   className       extra classes for the panel wrapper
// ---------------------------------------------------------------------------

export default function DonutChart({
  segments = [],
  title = 'Distribution share',
  description = null,
  badge = null,
  size = 160,
  thickness = 20,
  ariaLabel = 'Distribution share',
  centerText = null,
  centerHint = null,
  legendValue = (seg) => seg.value.toLocaleString(),
  readoutValue = (seg, share) => `${seg.value.toLocaleString()} · ${formatPct(share, 1)}`,
  emptyTitle = 'No data yet',
  emptyDescription = 'Values will render here as data lands.',
  className = '',
}) {
  const [hoverKey, setHoverKey] = useState(null)

  const { total, r, circumference, arcs } = buildDonutSegments(segments, {
    size,
    thickness,
  })
  const hovered = segments.find((s) => s.key === hoverKey) || null

  // ── Empty ────────────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div
        className={`rounded-3xl border border-stone-light bg-white-warm p-8 text-center shadow-sm ${className}`}
      >
        <p className="font-serif text-lg text-charcoal">{emptyTitle}</p>
        <p className="mt-1 text-sm text-charcoal-mid">{emptyDescription}</p>
      </div>
    )
  }

  const arcById = new Map(arcs.map((arc) => [arc.key, arc]))

  return (
    <div className={`rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm text-charcoal-mid">{description}</p>
          ) : null}
        </div>
        {badge ? (
          <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Hover readout — shared compact primitive, same affordance as the
            other self-hosted charts */}
        <ChartHoverReadout
          size="compact"
          label={hovered ? hovered.label : null}
          hint="Hover a segment for the share"
          items={
            hovered
              ? [
                  {
                    key: hovered.key,
                    text: readoutValue(hovered, arcById.get(hovered.key)?.share ?? 0),
                  },
                ]
              : []
          }
        />

        <div className="relative" style={{ width: size, height: size }}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-full w-full"
            role="img"
            aria-label={ariaLabel}
          >
            {/* Track — reads as a gauge even when one segment dominates */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#e7e4dc"
              strokeWidth={thickness}
            />
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              {arcs.map((arc) => {
                const seg = segments.find((s) => s.key === arc.key)
                const isHovered = hoverKey === arc.key
                return (
                  <circle
                    key={arc.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={seg?.color || '#1f2937'}
                    strokeWidth={isHovered ? thickness + 5 : thickness}
                    strokeDasharray={`${Math.max(arc.len, 0.5)} ${Math.max(
                      circumference - arc.len,
                      0.5,
                    )}`}
                    strokeDashoffset={arc.offset}
                    style={{ transition: 'stroke-width 150ms ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoverKey(arc.key)}
                    onMouseLeave={() => setHoverKey(null)}
                  >
                    <title>{seg?.label || arc.key}</title>
                  </circle>
                )
              })}
            </g>
          </svg>

          {/* Center total — HTML overlay so the numbers stay crisp */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-serif text-2xl tabular-nums text-charcoal">
              {centerText ?? total.toLocaleString()}
            </span>
            {centerHint ? (
              <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                {centerHint}
              </span>
            ) : null}
          </div>
        </div>

        {/* Legend — dot · label · value · share */}
        <div className="w-full space-y-1.5">
          {segments.map((seg) => {
            const share = arcById.get(seg.key)?.share ?? 0
            return (
              <div
                key={seg.key}
                className="flex items-center gap-2 text-xs text-charcoal-mid"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color || '#1f2937' }}
                />
                <span className="min-w-0 flex-1 truncate">{seg.label}</span>
                <span className="font-mono tabular-nums text-charcoal">
                  {legendValue(seg)}
                </span>
                <span className="w-12 text-right font-mono tabular-nums text-charcoal-light">
                  {formatPct(share, 1)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
