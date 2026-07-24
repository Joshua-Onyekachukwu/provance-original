import { useMemo } from 'react'

const BORDER_COLORS = {
  default: 'border-l-stone-light',
  warning: 'border-l-amber-400',
  danger: 'border-l-rose-400',
  success: 'border-l-emerald-400',
  info: 'border-l-sky-400',
}

const TREND_ICONS = {
  up: '↑',
  down: '↓',
  neutral: '→',
}

export default function StatCard({
  label,
  value,
  detail,
  trend = null,
  variant = 'default',
  compact = false,
  className = '',
}) {
  const borderColor = BORDER_COLORS[variant] || BORDER_COLORS.default
  const trendIcon = TREND_ICONS[trend] || null

  const trendColor = useMemo(() => {
    if (!trend) return ''
    if (trend === 'up') return 'text-emerald-600'
    if (trend === 'down') return 'text-rose-600'
    return 'text-charcoal-mid'
  }, [trend])

  const padding = compact ? 'px-3 py-3' : 'px-4 py-4'

  return (
    <div
      className={`rounded-2xl border border-stone-light bg-white-warm ${padding} border-l-4 ${borderColor} shadow-sm ${className}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className={`font-serif text-charcoal ${
            compact ? 'text-2xl' : 'text-3xl'
          }`}
        >
          {value}
        </p>
        {trendIcon && (
          <span className={`text-sm font-medium ${trendColor}`}>
            {trendIcon} {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
          </span>
        )}
      </div>
      {detail && (
        <p className="mt-2 text-sm text-charcoal-mid">{detail}</p>
      )}
    </div>
  )
}
