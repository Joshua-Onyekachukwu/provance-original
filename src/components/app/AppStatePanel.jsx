const VARIANT_STYLES = {
  empty: {
    badge: 'bg-stone-light text-charcoal',
    border: 'border-stone-light',
    surface: 'bg-white-warm',
  },
  loading: {
    badge: 'bg-sky-50 text-sky-700',
    border: 'border-sky-100',
    surface: 'bg-white-warm',
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-100',
    surface: 'bg-white-warm',
  },
  error: {
    badge: 'bg-rose-50 text-rose-700',
    border: 'border-rose-100',
    surface: 'bg-white-warm',
  },
}

export default function AppStatePanel({
  label,
  title,
  description,
  variant = 'empty',
  action = null,
  children = null,
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.empty

  return (
    <section className={`rounded-3xl border ${styles.border} ${styles.surface} p-6 shadow-sm`}>
      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${styles.badge}`}>
        {label}
      </span>
      <h2 className="mt-4 font-serif text-2xl text-charcoal">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
