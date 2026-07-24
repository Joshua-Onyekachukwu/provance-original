import { Link } from 'react-router-dom'

const TONE_BORDERS = {
  danger: 'border-l-rose-400',
  warning: 'border-l-amber-400',
  info: 'border-l-sky-400',
  success: 'border-l-emerald-400',
  default: 'border-l-stone-light',
}

/**
 * AttentionCard — clickable tile linking to an admin module with an issue count.
 *
 * When count is 0, shows a green "All clear" indicator instead of a number.
 */
export default function AttentionCard({
  icon,
  label,
  count,
  tone = 'default',
  linkTo,
}) {
  const borderClass = TONE_BORDERS[tone] || TONE_BORDERS.default

  return (
    <Link
      to={linkTo}
      className={`block rounded-2xl border border-stone-light bg-white-warm p-4 
        border-l-[3px] ${borderClass} 
        shadow-sm transition hover:shadow-md hover:border-charcoal/25
        focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2`}
    >
      <div className="text-xl mb-2" aria-hidden="true">{icon}</div>
      <p className="text-sm font-medium text-charcoal">{label}</p>

      {count === 0 ? (
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="text-xs text-emerald-700 font-medium">All clear</span>
        </div>
      ) : (
        <p className="mt-3 font-serif text-3xl text-charcoal">{count}</p>
      )}

      <p className="mt-2 text-xs text-charcoal-mid hover:text-charcoal transition-colors">
        View →
      </p>
    </Link>
  )
}
