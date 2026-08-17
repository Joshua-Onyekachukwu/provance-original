import Skeleton from './Skeleton'

// Accent border classes for tones with no verdict color backing them.
const TONE_BORDER_CLASS = {
  default: 'border-l-stone-light',
  danger: 'border-l-rose-400',
}

// Verdict-mapped tones draw their accent from the verdict palette (see
// VERDICT_PALETTE / applyVerdictPalette in scanPresentation.js) so the card
// accent matches the exact chart colors instead of a re-declared Tailwind
// shade — change a verdict hex once and cards + charts stay in sync.
const VERDICT_TONE_BORDER_VARS = {
  info: 'var(--color-tone-info)',
  success: 'var(--color-tone-success)',
  warning: 'var(--color-tone-warning)',
}

const SIZE_CLASSES = {
  sm: { padding: 'p-4 sm:p-5', value: 'text-2xl sm:text-3xl' },
  md: { padding: 'p-5', value: 'text-3xl sm:text-4xl' },
  lg: { padding: 'p-6', value: 'text-4xl' },
}

/**
 * StatCard — unified metric card (Phase 2 foundation), the single shared
 * StatCard across admin + user dashboards. Supports label/value/detail/tone/
 * trend/size plus full loading / error states.
 *
 * Props:
 *   label, value, detail
 *   tone    — 'default' | 'info' | 'success' | 'warning' | 'danger'
 *   size    — 'sm' | 'md' | 'lg'
 *   trend   — { direction: 'up'|'down'|'flat', value: string } | null
 *   loading — render skeleton state
 *   error   — render error placeholder state
 */
export default function StatCard({
  label,
  value,
  detail,
  tone = 'default',
  size = 'md',
  trend = null,
  loading = false,
  error = false,
  className = '',
}) {
  const borderClass = TONE_BORDER_CLASS[tone] || ''
  const borderVar = VERDICT_TONE_BORDER_VARS[tone] || null
  const sizeStyle = SIZE_CLASSES[size] || SIZE_CLASSES.md

  const trendColor = trend?.direction === 'up' ? 'text-emerald-600' : trend?.direction === 'down' ? 'text-rose-600' : 'text-charcoal-mid'
  const trendArrow = trend?.direction === 'up' ? '▲' : trend?.direction === 'down' ? '▼' : '→'

  return (
    <div
      className={`rounded-3xl border border-stone-light bg-white-warm ${sizeStyle.padding} border-l-[3px] ${borderClass} shadow-sm ${className}`}
      style={borderVar ? { borderLeftColor: borderVar } : undefined}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">{label}</p>

      {loading ? (
        <div className="mt-3 space-y-2" role="status" aria-label="Loading">
          <Skeleton className="h-9 w-24" />
          {detail && <Skeleton className="h-4 w-40" />}
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          Unavailable
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <p className={`font-serif text-charcoal tabular-nums ${sizeStyle.value}`}>{value}</p>
            {trend && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                {trendArrow} {trend.value}
              </span>
            )}
          </div>
          {detail && <p className="mt-2 text-sm text-charcoal-light">{detail}</p>}
        </>
      )}
    </div>
  )
}
