import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const ADMIN_MODULES = [
  {
    group: 'Overview',
    items: [
      { label: 'Overview', href: '/app/admin/overview', icon: '◈' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Waitlist', href: '/app/admin/waitlist', icon: '☰' },
      { label: 'Users', href: '/app/admin/users', icon: '⚙' },
      { label: 'Organizations', href: '/app/admin/organizations', icon: '◫' },
      { label: 'Jobs', href: '/app/admin/jobs', icon: '⟳' },
      { label: 'Reports', href: '/app/admin/reports', icon: '◉' },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Analytics', href: '/app/admin/analytics', icon: '◷' },
      { label: 'Monitoring', href: '/app/admin/monitoring', icon: '⬡' },
      { label: 'Feature Flags', href: '/app/admin/feature-flags', icon: '⚑' },
      { label: 'Audit Logs', href: '/app/admin/audit-logs', icon: '☰' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { label: 'Roles & Permissions', href: '/app/admin/roles', icon: '🔑' },
      { label: 'Admin Settings', href: '/app/admin/settings', icon: '⚙' },
    ],
  },
]

function getModuleLabel(pathname) {
  for (const group of ADMIN_MODULES) {
    for (const item of group.items) {
      if (pathname.startsWith(item.href)) {
        return item.label
      }
    }
  }
  return 'Overview'
}

export default function AdminShell() {
  const { profile, user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const currentModule = getModuleLabel(location.pathname)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-parchment">
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="border-b border-charcoal-soft bg-charcoal text-parchment lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-4 sm:p-5 lg:h-screen lg:overflow-y-auto lg:p-6">
            {/* Brand + mobile toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 font-serif text-base text-amber-100">
                  A
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif text-xl text-parchment">Admin</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-parchment/45">
                    Control Room
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-parchment/80 transition hover:border-white/22 hover:bg-white/8 lg:hidden"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? 'Close' : 'Menu'}
              </button>
            </div>

            {/* User indicator */}
            <div
              className={`${
                sidebarOpen ? 'mt-4 block' : 'hidden'
              } rounded-2xl border border-white/8 bg-white/4 p-3 lg:mt-5 lg:block`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-parchment/40">
                Admin user
              </p>
              <p className="mt-2 truncate text-sm font-medium text-parchment">
                {profile?.displayName || user?.email}
              </p>
              <p className="mt-0.5 truncate text-xs text-parchment/55">{user?.email}</p>
            </div>

            {/* Context badge */}
            <div
              className={`${
                sidebarOpen ? 'mt-4 block' : 'hidden'
              } lg:mt-4 lg:block`}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-100">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden="true" />
                Internal Control Room
              </span>
            </div>

            {/* Navigation */}
            <nav
              className={`${
                sidebarOpen ? 'mt-6 block' : 'hidden'
              } space-y-5 lg:mt-6 lg:block`}
            >
              {ADMIN_MODULES.map((group) => (
                <div key={group.group}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-parchment/35">
                    {group.group}
                  </p>
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.href || 
                        (item.href !== '/app/admin/overview' && location.pathname.startsWith(item.href))

                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                            isActive
                              ? 'bg-parchment text-charcoal shadow-[0_8px_24px_rgba(0,0,0,0.18)]'
                              : 'text-parchment/65 hover:bg-white/6 hover:text-parchment/85'
                          }`}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg text-xs" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-charcoal" aria-hidden="true" />
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Bottom actions */}
            <div
              className={`${
                sidebarOpen ? 'mt-6 block' : 'hidden'
              } space-y-2 border-t border-white/8 pt-5 lg:mt-auto lg:block lg:pt-5`}
            >
              <NavLink
                to="/app"
                className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-parchment/70 transition hover:bg-white/8 hover:text-parchment"
              >
                ← Back to workspace
              </NavLink>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-parchment/70 transition hover:bg-white/8 hover:text-parchment"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="min-w-0">
          {/* Top bar */}
          <header className="border-b border-stone-light bg-white-warm/90 px-6 py-5 backdrop-blur-sm sm:px-8 lg:px-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <nav className="flex items-center gap-2 text-sm text-charcoal-mid" aria-label="Breadcrumb">
                  <NavLink to="/app/admin" className="hover:text-charcoal transition" end>
                    Admin
                  </NavLink>
                  <span className="text-charcoal-light" aria-hidden="true">/</span>
                  <span className="font-medium text-charcoal">{currentModule}</span>
                </nav>
                <h1 className="mt-2 font-serif text-3xl text-charcoal sm:text-4xl">
                  {currentModule}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-700">
                  Internal Control Room
                </span>
                <span className="hidden rounded-full border border-stone-light bg-parchment px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-charcoal-mid sm:inline-flex">
                  {profile?.displayName || 'Admin'}
                </span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
