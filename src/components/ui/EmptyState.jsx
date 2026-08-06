const VARIANTS = {
  empty: 'border-stone-light bg-parchment text-charcoal-light',
  error: 'border-rose-200/70 bg-rose-50 text-rose-600',
}

function DefaultIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  )
}

/**
 * EmptyState — empty / error presentation primitive.
 *
 * Props:
 *   variant  — 'empty' | 'error'
 *   icon     — optional custom icon node
 *   title, description, action
 *   compact  — reduced vertical padding for use inside cards
 */
export default function EmptyState({
  icon = null,
  title,
  description,
  action = null,
  variant = 'empty',
  compact = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-14'} ${className}`}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${VARIANTS[variant] || VARIANTS.empty}`}
      >
        {icon || <DefaultIcon />}
      </div>
      <h3 className="mt-4 font-serif text-lg text-charcoal">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-mid">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
