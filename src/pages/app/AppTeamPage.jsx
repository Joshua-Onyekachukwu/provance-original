import { Link } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'

export default function AppTeamPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Team workspace
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Team collaboration is reserved for permissioned accounts
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          This route is already protected so future organization workflows can be added
          without rewriting access control at the routing layer.
        </p>
      </section>

      <AppStatePanel
        label="Success"
        title="Team route protection is defined"
        description="When team access is enabled for an account, this area can hold shared queue views, reviewer assignments, internal notes, and report collaboration without another navigation reset."
        variant="success"
        action={
          <Link
            to="/app/account"
            className="inline-flex rounded-xl border border-stone-light px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal"
          >
            Review account preferences
          </Link>
        }
      />
    </div>
  )
}
