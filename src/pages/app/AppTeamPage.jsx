import { Link, useNavigate } from 'react-router-dom'
import { useRegisterCommands } from '../../components/ui'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'

export default function AppTeamPage() {
  const navigate = useNavigate()

  useRegisterCommands(
    [
      {
        id: 'team.organization',
        group: 'Team',
        label: 'Open organization management',
        hint: 'Members, roles, and teams',
        keywords: ['team', 'organization', 'members', 'roles'],
        onSelect: () => navigate('/app/organization'),
      },
      {
        id: 'team.account',
        group: 'Team',
        label: 'Review account settings',
        hint: 'Default workspace and profile',
        keywords: ['team', 'account', 'settings', 'workspace'],
        onSelect: () => navigate('/app/account'),
      },
    ],
    [navigate],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Team workspace
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Team collaboration is reserved for enabled accounts
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          This route is already protected so future shared workflows can be added without
          rewriting access control at the routing layer.
        </p>
      </section>

      <AppStatePanel
        label="Success"
        title="Team route protection is defined"
        description="When team access is enabled for an account, this area can hold shared queue views, assignments, internal notes, and report collaboration without another navigation reset."
        variant="success"
        action={
          <Link
            to="/app/account"
            className="inline-flex rounded-xl border border-stone-light px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal"
          >
            Review account settings
          </Link>
        }
      />
    </div>
  )
}
