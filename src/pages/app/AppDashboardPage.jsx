import { Link } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-white-warm p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-3 font-serif text-4xl text-charcoal">{value}</p>
      <p className="mt-2 text-sm text-charcoal-mid">{detail}</p>
    </div>
  )
}

export default function AppDashboardPage() {
  const { profile, permissions, workspaceContext } = useAuth()

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Welcome back
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          {profile?.displayName || 'Provance User'}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          This first signed-in workspace gives approved users a stable landing point,
          core navigation, and clear state handling while uploads, reports, and team
          workflows continue to come online.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Workspace"
            value={workspaceContext === 'team' ? 'Team' : 'Individual'}
            detail="Context-aware navigation is live and saved between sessions."
          />
          <StatCard
            label="Upload queue"
            value="0"
            detail="No media has been submitted yet in this phase."
          />
          <StatCard
            label="Team access"
            value={permissions.team ? 'On' : 'Off'}
            detail="Team routes are permission-checked before access is granted."
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AppStatePanel
          label="Empty"
          title="No uploads have been started yet"
          description="The authenticated shell is ready to receive the real verification workflow next. Users land in a clear zero-state instead of a blank screen."
          action={
            <Link
              to="/app/uploads"
              className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
            >
              Review upload workspace
            </Link>
          }
        />

        <AppStatePanel
          label="Success"
          title="Access is active and protected"
          description="Your session is stored, restored on refresh, and gated behind protected routes so only approved users can reach the product shell."
          variant="success"
        />

        <AppStatePanel
          label="Loading"
          title="Async workflow states are defined"
          description="Loading surfaces are already in place for route protection and will also support future upload processing, report retrieval, and dashboard refresh operations."
          variant="loading"
          children={
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3">
              <div className="h-5 w-5 rounded-full border-2 border-sky-200 border-t-sky-600 animate-spin" />
              <p className="text-sm text-sky-700">
                Preparing the next verification workspace state.
              </p>
            </div>
          }
        />

        <AppStatePanel
          label="Error"
          title="Failure messaging has a dedicated surface"
          description="When uploads, reports, or account actions fail, the shell already has a consistent error presentation instead of forcing users back into generic browser alerts."
          variant="error"
        />
      </section>
    </div>
  )
}
