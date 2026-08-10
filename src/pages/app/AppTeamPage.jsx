import { Link, useNavigate } from 'react-router-dom'
import { Button, useRegisterCommands } from '../../components/ui'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import DemoStateBanner from '../../components/app/DemoStateBanner.jsx'
import { useDemoStateControl } from '../../lib/useDemoState.js'

export default function AppTeamPage() {
  const navigate = useNavigate()
  const { demoState, selectDemoState } = useDemoStateControl()

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

      {demoState === 'loading' ? (
        <div
          role="status"
          aria-label="Loading team workspace"
          className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm"
        >
          <div className="h-6 w-32 animate-pulse rounded-full bg-stone-light/70" />
          <div className="mt-5 h-8 w-3/4 animate-pulse rounded-xl bg-stone-light/50" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-stone-light/40" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-stone-light/40" />
        </div>
      ) : demoState === 'empty' ? (
        <AppStatePanel
          label="No team yet"
          title="Team workspace is not configured"
          description="Demo state — this is how the area reads before any team is provisioned for the account."
          variant="empty"
        />
      ) : demoState === 'error' ? (
        <AppStatePanel
          label="Unavailable"
          title="Team workspace could not be loaded"
          description="Demo state — forced failure for review. This is not a real outage."
          variant="error"
          action={
            <Button variant="secondary" size="sm" onClick={() => selectDemoState(null)}>
              Return to live view
            </Button>
          }
        />
      ) : (
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
      )}

      <DemoStateBanner demoState={demoState} onSelect={selectDemoState} />
    </div>
  )
}
