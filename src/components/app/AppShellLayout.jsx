import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/app' },
  { label: 'Uploads', href: '/app/uploads' },
  { label: 'Reports', href: '/app/reports' },
  { label: 'Account', href: '/app/account' },
  { label: 'Team', href: '/app/team' },
]

function WorkspaceToggle() {
  const { permissions, workspaceContext, setWorkspaceContext } = useAuth()

  return (
    <div className="inline-flex rounded-xl border border-stone-light bg-parchment p-1">
      <button
        type="button"
        onClick={() => setWorkspaceContext('individual')}
        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
          workspaceContext === 'individual'
            ? 'bg-charcoal text-parchment'
            : 'text-charcoal-mid hover:text-charcoal'
        }`}
      >
        Individual
      </button>
      <button
        type="button"
        onClick={() => permissions.team && setWorkspaceContext('team')}
        disabled={!permissions.team}
        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
          workspaceContext === 'team'
            ? 'bg-charcoal text-parchment'
            : 'text-charcoal-mid hover:text-charcoal'
        } ${!permissions.team ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        Team
      </button>
    </div>
  )
}

export default function AppShellLayout() {
  const { profile, user, signOut, permissions } = useAuth()

  return (
    <div className="min-h-screen bg-parchment">
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-stone-light bg-white-warm lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-6 lg:p-8">
            <div className="flex items-center justify-between gap-3 lg:block">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-charcoal text-parchment font-serif text-lg">
                    P
                  </div>
                  <div>
                    <p className="font-serif text-2xl text-charcoal">Provance</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                      Authenticated Workspace
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-charcoal-mid">
                  The first signed-in shell is live with protected navigation, account
                  preferences, and guided empty states for the product workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-xl border border-stone-light px-4 py-2 text-sm text-charcoal-mid transition hover:border-charcoal hover:text-charcoal lg:hidden"
              >
                Sign out
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-stone-light bg-parchment p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Signed in as
              </p>
              <p className="mt-2 font-medium text-charcoal">
                {profile?.displayName || user?.email}
              </p>
              <p className="mt-1 text-sm text-charcoal-mid">{user?.email}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                  Active session
                </span>
                <span className="rounded-full bg-amber-subtle px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal">
                  {permissions.team ? 'Team enabled' : 'Individual access'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Workspace
              </p>
              <div className="mt-3">
                <WorkspaceToggle />
              </div>
            </div>

            <nav className="mt-8 grid gap-2">
              {NAV_ITEMS.map((item) => {
                const isLocked = item.href === '/app/team' && !permissions.team

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? 'border-charcoal bg-charcoal text-parchment'
                          : 'border-stone-light bg-white-warm text-charcoal hover:border-charcoal/35'
                      } ${isLocked ? 'opacity-70' : ''}`
                    }
                  >
                    <span>{item.label}</span>
                    {isLocked && <span className="text-[11px] uppercase tracking-[0.18em]">Locked</span>}
                  </NavLink>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={signOut}
              className="mt-8 hidden w-full rounded-xl border border-stone-light px-4 py-3 text-sm text-charcoal-mid transition hover:border-charcoal hover:text-charcoal lg:inline-flex lg:justify-center"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-stone-light bg-parchment/90 px-6 py-5 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Phase 4
                </p>
                <h1 className="mt-2 font-serif text-3xl text-charcoal sm:text-4xl">
                  Authenticated app shell
                </h1>
              </div>
              <div className="rounded-2xl border border-stone-light bg-white-warm px-4 py-3 text-sm text-charcoal-mid">
                Protected routes, account preferences, and product-ready navigation are
                now available inside the signed-in experience.
              </div>
            </div>
          </header>

          <main className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
