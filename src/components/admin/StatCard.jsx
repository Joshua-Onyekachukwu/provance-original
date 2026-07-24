import { useMemo } from 'react'

const TONE_BORDERS = {
  default: 'border-l-stone-light',
  info: 'border-l-sky-400',
  success: 'border-l-emerald-400',
  warning: 'border-l-amber-400',
  danger: 'border-l-rose-400',
}

// Backward-compat: old `variant` prop maps to `tone`
const VARIANT_TO_TONE = {
  default: 'default',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

const SIZE_CLASSES = {
  sm: { padding: 'p-4 sm:p-5', value: 'text-2xl sm:text-3xl' },
  md: { padding: 'p-5', value: 'text-3xl sm:text-4xl' },
  lg: { padding: 'p-6', value: 'text-4xl' },
}

/**
 * StatCard — unified metric card used across admin and user dashboards.
 *
 * Props:
 *   label       — mono eyebrow label
 *   value       — large serif number/string
 *   detail      — optional description below value
 *   tone        — 'default' | 'info' | 'success' | 'warning' | 'danger' (preferred)
 *   variant     — (deprecated) alias for `tone`, kept for backward compat
 *   size        — 'sm' | 'md' | 'lg' (default 'md')
 *   compact     — (deprecated) maps to size='sm', kept for backward compat
 *   trend       — { direction: 'up'|'down', value: string } | null
 *   className   — additional classes
 */
export default function StatCard({
  label,
  value,
  detail,
  tone,
  variant,
  size,
  compact = false,
  trend = null,
  className = '',
}) {
  // Resolve tone: `tone` prop takes precedence over `variant`
  const resolvedVariant = tone || variant || 'default'
  const resolvedTone = VARIANT_TO_TONE[resolvedVariant] || 'default'
  const borderColor = TONE_BORDERS[resolvedTone] || TONE_BORDERS.default

  // Resolve size: explicit `size` > `compact` flag > default 'md'
  const resolvedSize = size || (compact ? 'sm' : 'md')
  const sizeStyle = SIZE_CLASSES[resolvedSize] || SIZE_CLASSES.md

  // Resolve trend: support both object form { direction, value } and legacy string
  const trendObj = useMemo(() => {
    if (!trend) return null
    if (typeof trend === 'object' && trend.direction) return trend
    if (typeof trend === 'string') return { direction: trend, value: '' }
    return null
  }, [trend])

  const trendColor = useMemo(() => {
    if (!trendObj) return ''
    if (trendObj.direction === 'up') return 'text-emerald-600'
    if (trendObj.direction === 'down') return 'text-rose-600'
    return 'text-charcoal-mid'
  }, [trendObj])

  const trendArrow = useMemo(() => {
    if (!trendObj) return null
    if (trendObj.direction === 'up') return '▲'
    if (trendObj.direction === 'down') return '▼'
    return '→'
  }, [trendObj])

  return (
    <div
      className={`rounded-3xl border border-stone-light bg-white-warm ${sizeStyle.padding} border-l-[3px] ${borderColor} shadow-sm ${className}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={`font-serif text-charcoal ${sizeStyle.value}`}>
          {value}
        </p>
        {trendObj && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
            {trendArrow} {trendObj.value}
          </span>
        )}
      </div>
      {detail && (
        <p className="mt-2 text-sm text-charcoal-light">{detail}</p>
      )}
    </div>
  )
}
