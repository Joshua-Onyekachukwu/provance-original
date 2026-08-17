import { PAD, pctOfViewBoxX, pctOfViewBoxY } from './chartGeometry.js'

// ---------------------------------------------------------------------------
// ChartHoverReadout
//
// The single-line readout bar that sits above every self-hosted chart (line,
// stacked bar, hourly bars). Extracted from TrendChart so the verdict/queue
// charts share the exact same styling instead of each re-declaring the
// font-mono strip:
//
//   <ChartHoverReadout
//     label={hovered ? formatShortDate(hovered.date) : null}
//     hint="Hover a point for day-level detail"
//     items={hovered ? [
//       { key: 'scans', text: `${hovered.scans} scans` },
//       { key: 'completed', text: `${hovered.completed} completed`, className: 'text-emerald-600' },
//       { key: 'failed', text: `${hovered.failed} failed`, className: 'text-rose-500' },
//     ] : []}
//     size="compact"          // tighter strip for the small hourly panels
//   />
//
// Props:
//   label    bold lead value (formatted date/hour), or null to show `hint`
//   hint     idle text when nothing is hovered
//   items    [{ key, text, className? }] rendered after the label separator
//   size     'default' | 'compact' — compact trims the vertical margins + height
// ---------------------------------------------------------------------------

export default function ChartHoverReadout({
  label = null,
  hint = '',
  items = [],
  size = 'default',
}) {
  const stripClass =
    size === 'compact'
      ? 'mb-2 flex h-5 items-center gap-2 font-mono text-xs text-charcoal-mid'
      : 'mb-3 mt-3 flex h-6 items-center gap-2 font-mono text-xs text-charcoal-mid'

  return (
    <div className={stripClass} aria-live="polite">
      {label ? (
        <>
          <span className="font-semibold text-charcoal">{label}</span>
          <span className="text-charcoal-light">·</span>
          {items.map((item) => (
            <span key={item.key} className={item.className || 'text-charcoal-mid'}>
              {item.text}
            </span>
          ))}
        </>
      ) : (
        <span className="text-charcoal-light">{hint}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChartAxisLabels
//
// The crisp HTML axis labels that overlay the SVG (SVG <text> is blurry at
// arbitrary widths; HTML spans positioned from the viewBox stay sharp).
// Extracted from TrendChart/StackedBarChart so both charts render identical
// grid-line labels and the same every-other-point x-label cadence.
//
// Props:
//   geometry    from buildChartGeometry / buildStackedBarGeometry (gridLines)
//   points      the rendered series (for x-label dates)
//   xLabel      (point) => string — the x-label text (e.g. formatShortDate).
//               When omitted, x labels are skipped (y grid labels still render).
//   xLabelX     (index) => viewBox x for the x-label anchor. Defaults to the
//               point's geometry.x(i); bar charts pass a bar-center variant.
//
// NOTE: the y-label strip width is tied to the shared PAD (`PAD.left - 4`).
// Charts with a custom viewBox/padding (e.g. the queue panels' QUEUE_PAD)
// must NOT reuse this overlay — they render their own simple hour row.
// ---------------------------------------------------------------------------

export function ChartAxisLabels({ geometry, points = [], xLabel = null, xLabelX = null }) {
  return (
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
      {xLabel
        ? points.map((p, i) =>
            i % 2 === 0 || i === points.length - 1 ? (
              <span
                key={`xl-${i}`}
                className="absolute -translate-x-1/2 font-mono text-[10px] text-charcoal-light/70"
                style={{ left: pctOfViewBoxX(xLabelX ? xLabelX(i) : geometry.x(i)), bottom: 2 }}
              >
                {xLabel(p, i)}
              </span>
            ) : null,
          )
        : null}
    </div>
  )
}
