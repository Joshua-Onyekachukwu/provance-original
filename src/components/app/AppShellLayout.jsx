import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

function getNavItems(permissions) {
  const items = [
    { label: 'Dashboard', href: '/app', note: 'Operations overview' },
    { label: 'Uploads', href: '/app/uploads', note: 'Media intake' },
    { label: 'Reports', href: '/app/reports', note: 'Verification results' },
    { label: 'Account', href: '/app/account', note: 'Profile and settings' },
    { label: 'Team', href: '/app/team', note: 'Shared workspace' },
  ]

  if (permissions.admin) {
    items.push({ label: 'Admin', href: '/app/admin', note: 'Internal control room' })
  }

  return items
}

function getPageMeta(pathname) {
  if (pathname.startsWith('/app/uploads')) {
    return {
      eyebrow: 'Intake',
      title: 'Verification intake',
      detail: 'Create a verification job, upload media securely, and send it into the processing queue.',
    }
  }

  if (pathname.startsWith('/app/reports/')) {
    return {
      eyebrow: 'Verification results',
      title: 'Report workspace',
      detail: 'Review the verdict, technical signals, report ID, and printable output for each upload.',
    }
  }

  if (pathname.startsWith('/app/reports')) {
    return {
      eyebrow: 'Verification results',
      title: 'Report library',
      detail: 'Browse recent verification activity and open any completed report from one workspace.',
    }
  }

  if (pathname.startsWith('/app/account')) {
    return {
      eyebrow: 'Identity',
      title: 'Account settings',
      detail: 'Manage profile details, workspace preferences, and session context.',
    }
  }

  if (pathname.startsWith('/app/team')) {
    return {
      eyebrow: 'Organization',
      title: 'Team workspace',
      detail: 'Reserved for shared review, organization roles, and future collaboration controls.',
    }
  }

  if (pathname.startsWith('/app/admin')) {
    return {
      eyebrow: 'Operations',
      title: 'Admin control room',
      detail: 'Internal workspace for waitlist review, user management, system monitoring, and platform configuration.',
    }
  }

  if (pathname.startsWith('/app/access-denied')) {
    return {
      eyebrow: 'Access',
      title: 'Restricted route',
      detail: 'This workspace is protected until the required access tier is enabled.',
    }
  }

  return {
    eyebrow: 'Overview',
    title: 'Verification operations',
    detail: 'Track queue posture, report readiness, and workspace activity from a single command surface.',
  }
}

function WorkspaceToggle() {
  const { permissions, workspaceContext, setWorkspaceContext } = useAuth()

  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => setWorkspaceContext('individual')}
        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
          workspaceContext === 'individual'
            ? 'bg-parchment text-charcoal'
            : 'text-parchment/62 hover:text-parchment'
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
            ? 'bg-parchment text-charcoal'
            : 'text-parchment/62 hover:text-parchment'
        } ${!permissions.team ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        Team
      </button>
    </div>
  )
}

export default function AppShellLayout() {
  const { profile, user, signOut, permissions } = useAuth()
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const navItems = getNavItems(permissions)
  const pageMeta = getPageMeta(location.pathname)

  useEffect(() => {
    setIsNavOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-parchment-light">
      <div className="min-h-screen lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-charcoal-soft bg-charcoal text-parchment lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-4 sm:p-6 lg:h-screen lg:overflow-y-auto lg:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 font-serif text-lg text-parchment shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  P
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif text-2xl text-parchment">Provance</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-parchment/55">
                    Verification Workspace
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setIsNavOpen((current) => !current)}
                  className="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm text-parchment/80 transition hover:border-white/22 hover:bg-white/8"
                >
                  {isNavOpen ? 'Close' : 'Menu'}
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm text-parchment/80 transition hover:border-white/22 hover:bg-white/8"
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className={`${isNavOpen ? 'mt-6 block' : 'mt-0 hidden'} lg:mt-0 lg:block`}>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-parchment/72">
                A secure workspace for media intake, verification review, and internal
                operations across the current Provance MVP.
              </p>
            </div>

            <div
              className={`${
                isNavOpen ? 'mt-6 block' : 'mt-4 hidden'
              } rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm lg:mt-6 lg:block`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                Signed in as
              </p>
              <p className="mt-3 font-medium text-parchment">
                {profile?.displayName || user?.email}
              </p>
              <p className="mt-1 text-sm text-parchment/65">{user?.email}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200">
                  Active session
                </span>
                <span className="rounded-full border border-amber-300/18 bg-amber-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-100">
                  {permissions.team ? 'Team ready' : 'Individual workspace'}
                </span>
                {permissions.admin && (
                  <span className="rounded-full border border-sky-300/18 bg-sky-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-100">
                    Admin access
                  </span>
                )}
              </div>
              <div className="mt-4 border-t border-white/8 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                Workspace
                </p>
                <div className="mt-3">
                  <WorkspaceToggle />
                </div>
              </div>
            </div>

            <div className={`${isNavOpen ? 'mt-8 block' : 'hidden'} lg:block`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                Navigation
              </p>
            </div>

            <nav className={`${isNavOpen ? 'mt-4 grid' : 'hidden'} gap-2 lg:grid`}>
              {navItems.map((item) => {
                const isLocked = item.href === '/app/team' && !permissions.team

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? 'border-parchment/18 bg-parchment text-charcoal shadow-[0_18px_50px_rgba(0,0,0,0.16)]'
                          : 'border-white/8 bg-white/4 text-parchment/78 hover:border-white/16 hover:bg-white/7'
                      } ${isLocked ? 'opacity-70' : ''}`
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-75">{item.note}</p>
                    </div>
                    {isLocked && (
                      <span className="pt-0.5 text-[11px] uppercase tracking-[0.18em]">
                        Locked
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={signOut}
              className="mt-8 hidden w-full rounded-xl border border-white/12 bg-white/4 px-4 py-3 text-sm text-parchment/80 transition hover:border-white/24 hover:bg-white/8 lg:inline-flex lg:justify-center"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-stone-light bg-parchment-light/88 px-6 py-6 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                  {pageMeta.eyebrow}
                </p>
                <h1 className="mt-2 font-serif text-3xl text-charcoal sm:text-4xl">
                  {pageMeta.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-charcoal-mid">
                  {pageMeta.detail}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-light bg-white-warm/80 px-4 py-3 backdrop-blur-sm">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                    Workspace
                  </p>
                  <p className="mt-2 text-sm font-medium text-charcoal">
                    {permissions.team && location.pathname.startsWith('/app/team')
                      ? 'Team context'
                      : 'Individual context'}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-light bg-white-warm/80 px-4 py-3 backdrop-blur-sm">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                    Route
                  </p>
                  <p className="mt-2 truncate text-sm font-medium text-charcoal">
                    {location.pathname}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-light bg-white-warm/80 px-4 py-3 backdrop-blur-sm">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                    Access
                  </p>
                  <p className="mt-2 text-sm font-medium text-charcoal">
                    {permissions.admin
                      ? permissions.team
                        ? 'Admin. Team ready'
                        : 'Admin. Individual'
                      : permissions.team
                        ? 'Member. Team ready'
                        : 'Member. Individual'}
                  </p>
                </div>
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
