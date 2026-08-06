import { useId, useMemo, useState } from 'react'
import { formatShortDate } from '../app/scanPresentation.js'
import { CHART_H, CHART_W, PAD, buildChartGeometry, buildHitAreaCells, pctOfViewBoxX, pctOfViewBoxY } from './chartGeometry.js'

// ---------------------------------------------------------------------------
// TrendChart
//
// Self-hosted SVG line/area chart with:
//   - range toggle (e.g. 7d / 14d) that slices the tail of `data`
//   - hover readout with a guide line + highlighted points
//   - crisp HTML axis labels (positioned from the SVG viewBox percentages)
//   - a legend with totals for scans / completed / failed
//
// Props:
//   data            [{ date, scans, completed, failed, suspicious }] — the full
//                    series; the range toggle slices the tail.
//   title           eyebrow text (default 'Scan volume trend')
//   description     optional one-line subtext under the eyebrow
//   ariaLabel       SVG aria-label
//   ranges          array of range keys, e.g. ['7d', '14d'] (default)
//   defaultRange    initially selected range key
//   emptyTitle      fallback heading when data is empty (defaults supplied)
//   emptyDescription
//   className       extra classes for the panel wrapper
// ---------------------------------------------------------------------------

const RANGE_LABELS = {
  '7d': '7 days',
  '14d': '14 days',
}

export default function TrendChart({
  data = [],
  title = 'Scan volume trend',
  description = null,
  ariaLabel = 'Daily scan volume over the selected range',
  ranges = ['7d', '14d'],
  defaultRange = '14d',
  emptyTitle = 'No volume data in range',
  emptyDescription = 'Extend the range or wait for new scans to land.',
  className = '',
}) {
  const [range, setRange] = useState(() =>
    ranges.includes(defaultRange) ? defaultRange : ranges[0],
  )
  const [hoverIndex, setHoverIndex] = useState(null)
  const gradientId = useId()

  const points = useMemo(() => {
    const slice = range === '7d' ? data.slice(-7) : data.slice(-14)
    return slice
  }, [data, range])

  const geometry = useMemo(() => buildChartGeometry(points), [points])
  const hitAreas = useMemo(() => buildHitAreaCells(points), [points])

  const last = points[points.length - 1]
  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  const totalScans = points.reduce((sum, p) => sum + (p.scans || 0), 0)
  const totalCompleted = points.reduce((sum, p) => sum + (p.completed || 0), 0)
  const totalFailed = points.reduce((sum, p) => sum + (p.failed || 0), 0)

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
        <div className="flex gap-1 rounded-xl border border-stone-light bg-parchment p-1">
          {ranges.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                range === option
                  ? 'bg-white-warm text-charcoal shadow-sm'
                  : 'text-charcoal-mid hover:text-charcoal'
              }`}
            >
              {RANGE_LABELS[option] || option}
            </button>
          ))}
        </div>
      </div>

      {/* Hover readout */}
      <div className="mb-3 mt-3 flex h-6 items-center gap-2 font-mono text-xs text-charcoal-mid" aria-live="polite">
        {hovered ? (
          <>
            <span className="font-semibold text-charcoal">
              {formatShortDate(hovered.date)}
            </span>
            <span className="text-charcoal-light">·</span>
            <span>{hovered.scans} scans</span>
            <span className="text-emerald-600">{hovered.completed} completed</span>
            <span className="text-rose-500">{hovered.failed} failed</span>
          </>
        ) : (
          <span className="text-charcoal-light">Hover a point for day-level detail</span>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-48 w-full sm:h-52"
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f2937" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1f2937" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines (axis labels render as HTML below so they stay crisp) */}
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

          {/* Area + lines */}
          <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
          <path
            d={geometry.completedPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <path
            d={geometry.linePath}
            fill="none"
            stroke="#1f2937"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Failure markers */}
          {points.map((p, i) =>
            p.failed > 0 ? (
              <circle
                key={`fail-${i}`}
                cx={geometry.x(i)}
                cy={geometry.y(p.scans)}
                r="3"
                fill="#f43f5e"
              />
            ) : null,
          )}

          {/* Hover guide + highlights */}
          {hoverIndex !== null && hovered ? (
            <>
              <line
                x1={geometry.x(hoverIndex)}
                y1={PAD.top}
                x2={geometry.x(hoverIndex)}
                y2={PAD.top + geometry.plotH}
                stroke="#1f2937"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.4"
              />
              <circle
                cx={geometry.x(hoverIndex)}
                cy={geometry.y(hovered.completed)}
                r="4"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={geometry.x(hoverIndex)}
                cy={geometry.y(hovered.scans)}
                r="4.5"
                fill="#1f2937"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </>
          ) : null}

          {/* Transparent hover hit-areas — full cells tiled edge-to-edge so
              no point (including the first) falls in a dead zone */}
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

        {/* HTML axis labels — crisp at any container width */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {geometry.gridLines.map((line) => (
            <span
              key={`yl-${line.y}`}
              className="absolute -translate-y-1/2 pr-1 text-right font-mono text-[10px] text-charcoal-light/70"
              style={{ top: pctOfViewBoxY(line.y), left: 0, width: `${PAD.left - 4}px` }}
            >
              {Math.round(line.value)}
            </span>
          ))}
          {points.map((p, i) =>
            i % 2 === 0 || i === points.length - 1 ? (
              <span
                key={`xl-${i}`}
                className="absolute -translate-x-1/2 font-mono text-[10px] text-charcoal-light/70"
                style={{ left: pctOfViewBoxX(geometry.x(i)), bottom: 2 }}
              >
                {formatShortDate(p.date)}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="inline-flex items-center gap-2 text-xs text-charcoal-mid">
          <span className="h-0.5 w-5 rounded-full bg-charcoal" />
          Scans ({totalScans.toLocaleString()})
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-charcoal-mid">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-emerald-500" />
          Completed ({totalCompleted.toLocaleString()})
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-charcoal-mid">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Failed ({totalFailed})
        </span>
        {last ? (
          <span className="ml-auto font-mono text-[11px] text-charcoal-light">
            Last day · {formatShortDate(last.date)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
