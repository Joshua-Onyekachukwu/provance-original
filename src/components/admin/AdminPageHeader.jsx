import { Link } from 'react-router-dom'

export default function AdminPageHeader({
  eyebrow = 'Admin Module',
  title,
  description,
  primaryAction = null,
  secondaryAction = null,
  meta = [],
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-stone-light bg-white-warm shadow-[0_20px_60px_rgba(19,22,29,0.06)]">
      <div className="border-b border-stone-light bg-[linear-gradient(135deg,rgba(243,246,255,0.82),rgba(255,253,249,0.96))] px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-charcoal-light">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-charcoal sm:text-[2.5rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-mid sm:text-[0.95rem]">
                {description}
              </p>
            ) : null}
          </div>

          {(primaryAction || secondaryAction) && (
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {secondaryAction}
              {primaryAction}
            </div>
          )}
        </div>
      </div>

      {meta.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 sm:px-8">
          {meta.map((item) => {
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-light bg-parchment px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-charcoal-mid transition hover:border-charcoal/20 hover:text-charcoal"
                >
                  {item.label}
                </Link>
              )
            }

            return (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-stone-light bg-parchment px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-charcoal-mid"
              >
                {item.label}
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}
