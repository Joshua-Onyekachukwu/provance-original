import { Link } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'

export default function AppAccessDeniedPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Access control
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">Team access is not enabled</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Your account is signed in successfully, but it does not yet have access to this
          shared workspace. Your individual workspace remains available.
        </p>
      </section>

      <AppStatePanel
        label="Error"
        title="Permission check blocked this route"
        description="Route-level permission handling keeps shared and restricted areas from appearing before the required access is enabled."
        variant="error"
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              to="/app"
              className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
            >
              Return to dashboard
            </Link>
            <Link
              to="/contact"
              className="inline-flex rounded-xl border border-stone-light px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal"
            >
              Contact support
            </Link>
          </div>
        }
      />
    </div>
  )
}
