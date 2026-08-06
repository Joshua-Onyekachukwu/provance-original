import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { mockNotifications } from '../../lib/mockData.js'
import { formatRelativeTime } from './scanPresentation.js'
import { Badge, Button, CommandPalette, CommandRegistryProvider, Popover, useToast } from '../ui'

// ---------------------------------------------------------------------------
// Navigation model — single source of truth for the sidebar, page meta, and
// placeholder wiring. Each item maps to a route registered in App.jsx.
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/app', end: true, icon: 'dashboard', note: 'Workspace at a glance' },
      { label: 'Activity Log', href: '/app/activity', icon: 'activity', note: 'Audit trail of workspace events' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Media Upload', href: '/app/uploads', icon: 'upload', note: 'Submit media for verification' },
      { label: 'Verification Queue', href: '/app/queue', icon: 'queue', note: 'Live status of files in the pipeline' },
      { label: 'Scan History', href: '/app/history', icon: 'history', note: 'Every verification run, searchable' },
      { label: 'Verification Reports', href: '/app/reports', icon: 'reports', note: 'Evidence-backed verification results' },
    ],
  },
  {
    label: 'Organization',
    items: [
      {
        label: 'Team Workspace',
        href: '/app/team',
        icon: 'team',
        note: 'Shared review, roles, and collaboration',
        teamRequired: true,
      },
      { label: 'Organization', href: '/app/organization', icon: 'organization', note: 'Members, roles, and workspace configuration' },
      { label: 'Billing', href: '/app/billing', icon: 'billing', note: 'Plan, usage, and invoices' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { label: 'API Keys', href: '/app/api-keys', icon: 'api', note: 'Tokens for programmatic verification' },
      { label: 'Documentation', href: '/app/docs', icon: 'docs', note: 'API reference and integration guides' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', href: '/app/account', icon: 'profile', note: 'Personal details, preferences, and session controls' },
      { label: 'Security', href: '/app/security', icon: 'security', note: 'Password, sessions, and sign-in controls' },
      { label: 'Notifications', href: '/app/notifications', icon: 'notifications', note: 'Alert preferences and delivery' },
      { label: 'Admin Console', href: '/app/admin', icon: 'dashboard', note: 'Internal platform control room', adminOnly: true },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Help & Support', href: '/app/help', icon: 'help', note: 'Guides, FAQs, and ways to reach the team' },
    ],
  },
]

function flattenNav() {
  return NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({ ...item, sectionLabel: section.label })),
  )
}

const ALL_NAV_ITEMS = flattenNav()

function getPageMeta(pathname) {
  if (pathname.startsWith('/app/reports/') && !pathname.endsWith('/print')) {
    return {
      eyebrow: 'Workspace',
      title: 'Report workspace',
      detail: 'Review the verdict, technical signals, and printable output for this verification.',
    }
  }

  if (pathname.startsWith('/app/reports')) {
    return {
      eyebrow: 'Workspace',
      title: 'Verification Reports',
      detail: 'Browse completed verifications and open any evidence-backed report from one workspace.',
    }
  }

  if (pathname.startsWith('/app/access-denied')) {
    return {
      eyebrow: 'Access',
      title: 'Restricted route',
      detail: 'This workspace area is protected until the required access tier is enabled.',
    }
  }

  const match = ALL_NAV_ITEMS.find((item) =>
    item.end ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
  )

  if (match) {
    return {
      eyebrow: match.sectionLabel,
      title: match.label,
      detail: match.note,
    }
  }

  return {
    eyebrow: 'Overview',
    title: 'Dashboard',
    detail: 'Your verification workspace at a glance.',
  }
}

// ---------------------------------------------------------------------------
// Inline icon set — self-hosted strokes, no external assets
// ---------------------------------------------------------------------------

function NavIcon({ name, className = 'h-5 w-5' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    className,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      )
    case 'activity':
      return (
        <svg {...common}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 15V4" />
          <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
          <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
        </svg>
      )
    case 'queue':
      return (
        <svg {...common}>
          <rect x="3.5" y="4" width="17" height="6" rx="1.5" />
          <rect x="3.5" y="14" width="10.5" height="6" rx="1.5" />
          <path d="M16.5 17h4M16.5 20h2" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 4v4h4" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      )
    case 'reports':
      return (
        <svg {...common}>
          <path d="M6.5 3.5h8L19 8v11.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V5a1.5 1.5 0 0 1 1.5-1.5z" />
          <path d="M14.5 3.5V8H19" />
          <path d="M9 12.5h6M9 16h4" />
        </svg>
      )
    case 'team':
      return (
        <svg {...common}>
          <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
          <circle cx="9.5" cy="7.5" r="3.5" />
          <path d="M21 20v-1.5a4 4 0 0 0-2.5-3.7" />
          <path d="M15.5 4.2a3.5 3.5 0 0 1 0 6.6" />
        </svg>
      )
    case 'organization':
      return (
        <svg {...common}>
          <path d="M4 20.5V5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5v15.5" />
          <path d="M8.5 7.5h2M13.5 7.5h2M8.5 11.5h2M13.5 11.5h2M8.5 15.5h2M13.5 15.5h2" />
          <path d="M2.5 20.5h19" />
        </svg>
      )
    case 'billing':
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 9.5h19" />
          <path d="M6.5 14.5h5" />
        </svg>
      )
    case 'api':
      return (
        <svg {...common}>
          <circle cx="7.5" cy="15.5" r="3.5" />
          <path d="m10.2 12.8 8.3-8.3" />
          <path d="m15.5 7.5 3 3" />
          <path d="m13 10 2 2" />
        </svg>
      )
    case 'docs':
      return (
        <svg {...common}>
          <path d="M12 6.5C10.5 5 8 4.5 4.5 5v13c3.5-.5 6 0 7.5 1.5 1.5-1.5 4-2 7.5-1.5V5c-3.5-.5-6 0-7.5 1.5z" />
          <path d="M12 6.5v13" />
        </svg>
      )
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
        </svg>
      )
    case 'security':
      return (
        <svg {...common}>
          <path d="M12 3 5 5.5v5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5v-5L12 3z" />
          <path d="m9.5 11.5 2 2 3.5-4" />
        </svg>
      )
    case 'notifications':
      return (
        <svg {...common}>
          <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
          <path d="M10 19a2.2 2.2 0 0 0 4 0" />
        </svg>
      )
    case 'help':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.7 9.3a2.4 2.4 0 0 1 4.6.8c0 1.6-2.3 2-2.3 3.4" />
          <path d="M12 17h.01" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
          <path d="M10 19a2.2 2.2 0 0 0 4 0" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      )
    case 'signout':
      return (
        <svg {...common}>
          <path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9" />
          <path d="M15 8l4 4-4 4" />
          <path d="M19 12H10" />
        </svg>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

const NOTIFICATION_TONES = {
  scan: 'bg-sky-500',
  team: 'bg-emerald-500',
  billing: 'bg-amber-500',
  security: 'bg-rose-500',
  system: 'bg-stone-400',
}

function getInitials(displayName, email) {
  const source = displayName || email || 'Provance User'
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Signs out and confirms via toast — shared by the avatar menu, sidebar, and palette. */
function signOutWithToast(signOut, toast) {
  signOut()
  toast.info('Signed out', { description: 'Your session has ended.' })
}

function WorkspaceToggle() {
  const { permissions, workspaceContext, setWorkspaceContext } = useAuth()
  const toast = useToast()

  function switchTo(next) {
    if (next === workspaceContext) return
    if (next === 'team' && !permissions.team) return
    setWorkspaceContext(next)
    toast.info(next === 'team' ? 'Team workspace' : 'Individual workspace', {
      description:
        next === 'team'
          ? 'Switched to the shared team workspace.'
          : 'Switched to your individual workspace.',
    })
  }

  return (
    <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => switchTo('individual')}
        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
          workspaceContext === 'individual'
            ? 'bg-parchment text-charcoal'
            : 'text-parchment/60 hover:text-parchment'
        }`}
      >
        Individual
      </button>
      <button
        type="button"
        onClick={() => switchTo('team')}
        disabled={!permissions.team}
        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
          workspaceContext === 'team'
            ? 'bg-parchment text-charcoal'
            : 'text-parchment/60 hover:text-parchment'
        } ${!permissions.team ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        Team
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notification bell
// ---------------------------------------------------------------------------

function NotificationBell() {
  const toast = useToast()
  const [notifications, setNotifications] = useState(() =>
    mockNotifications.map((notification) => ({ ...notification })),
  )
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const visibleNotifications = notifications.slice(0, 8)

  function markAllRead() {
    const count = notifications.filter((n) => !n.read).length
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    if (count > 0) {
      toast.success('All caught up', {
        description: `Marked ${count} notification${count === 1 ? '' : 's'} as read.`,
      })
    }
  }

  function markRead(id) {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  // Note: mockNotifications[].link is intentionally not navigated in this phase —
  // the mock links point at report routes that are not yet wired to the bell.

  return (
    <Popover
      role="dialog"
      ariaLabel="Notifications"
      desktopClassName="sm:w-[380px]"
      trigger={({ open, triggerRef, isOpen }) => (
        <button
          ref={triggerRef}
          type="button"
          onClick={open}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="ui-focus-ring relative grid h-10 w-10 place-items-center rounded-xl border border-stone-light bg-white-warm text-charcoal-mid transition hover:border-charcoal/25 hover:text-charcoal"
        >
          <NavIcon name="bell" className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-parchment-light">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-stone-light px-5 py-4">
            <div>
              <p className="font-serif text-lg text-charcoal">Notifications</p>
              <p className="mt-0.5 text-xs text-charcoal-mid">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>

          <ul className="max-h-[min(420px,60vh)] divide-y divide-stone-light overflow-y-auto">
            {visibleNotifications.map((notification) => {
              const isUnread = !notification.read
              const tone = NOTIFICATION_TONES[notification.category] || 'bg-stone-400'

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => markRead(notification.id)}
                    className={`ui-focus-ring flex w-full items-start gap-3 px-5 py-3.5 text-left transition ${
                      isUnread ? 'bg-sky-50/50 hover:bg-sky-50' : 'hover:bg-stone-light/60'
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span
                          className={`truncate text-sm ${
                            isUnread ? 'font-semibold text-charcoal' : 'font-medium text-charcoal'
                          }`}
                        >
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-charcoal-mid/80">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-charcoal-mid">
                        {notification.description}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-stone-light px-5 py-3">
            <Link
              to="/app/notifications"
              onClick={close}
              className="ui-focus-ring inline-flex text-sm font-medium text-charcoal transition hover:text-charcoal-light"
            >
              View all notifications →
            </Link>
          </div>
        </>
      )}
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Avatar menu
// ---------------------------------------------------------------------------

const MENU_LINKS = [
  { label: 'Profile', href: '/app/account', icon: 'profile' },
  { label: 'Security', href: '/app/security', icon: 'security' },
  { label: 'Notifications', href: '/app/notifications', icon: 'notifications' },
  { label: 'Billing', href: '/app/billing', icon: 'billing' },
]

function AvatarMenu() {
  const { profile, user, signOut } = useAuth()
  const toast = useToast()
  const initials = getInitials(profile?.displayName, user?.email)

  return (
    <Popover
      role="menu"
      ariaLabel="Account menu"
      desktopClassName="sm:w-[280px]"
      trigger={({ open, triggerRef, isOpen }) => (
        <button
          ref={triggerRef}
          type="button"
          onClick={open}
          aria-label="Account menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="ui-focus-ring flex items-center gap-2 rounded-xl border border-stone-light bg-white-warm py-1.5 pl-1.5 pr-2.5 transition hover:border-charcoal/25"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-charcoal text-xs font-semibold tracking-wide text-parchment">
            {initials}
          </span>
          <span className="hidden max-w-[9rem] truncate text-sm font-medium text-charcoal md:block">
            {profile?.displayName || user?.email}
          </span>
          <NavIcon
            name="chevron"
            className={`hidden h-3.5 w-3.5 text-charcoal-mid transition-transform duration-200 md:block ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="border-b border-stone-light px-5 py-4">
            <p className="truncate text-sm font-semibold text-charcoal">
              {profile?.displayName || 'Provance User'}
            </p>
            <p className="mt-0.5 truncate text-xs text-charcoal-mid">{user?.email}</p>
          </div>

          <div className="p-1.5">
            {MENU_LINKS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                role="menuitem"
                onClick={close}
                className="ui-focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-charcoal-mid transition hover:bg-stone-light hover:text-charcoal"
              >
                <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-stone-light p-1.5">
            <Link
              to="/app/help"
              role="menuitem"
              onClick={close}
              className="ui-focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-charcoal-mid transition hover:bg-stone-light hover:text-charcoal"
            >
              <NavIcon name="help" className="h-[18px] w-[18px]" />
              Help &amp; Support
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                signOutWithToast(signOut, toast)
              }}
              className="ui-focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
            >
              <NavIcon name="signout" className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </>
      )}
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Command palette items — navigation from NAV_SECTIONS + workspace actions
// ---------------------------------------------------------------------------

function usePaletteItems(sections, signOut, setWorkspaceContext, permissions, workspaceContext) {
  const navigate = useNavigate()

  return useMemo(() => {
    const navItems = sections.flatMap((section) =>
      section.items
        .filter((item) => !(item.teamRequired && !permissions.team))
        .map((item) => ({
          id: `nav-${item.href}`,
          group: section.label,
          label: item.label,
          hint: item.href === '/app' ? 'Dashboard' : item.href,
          keywords: [item.note],
          icon: <NavIcon name={item.icon} className="h-4 w-4" />,
          onSelect: () => navigate(item.href),
        })),
    )

    const actionItems = [
      {
        id: 'action-upload',
        group: 'Actions',
        label: 'Start a verification',
        hint: 'Upload media',
        keywords: ['upload', 'scan', 'new'],
        icon: <NavIcon name="upload" className="h-4 w-4" />,
        onSelect: () => navigate('/app/uploads'),
      },
      {
        id: 'action-reports',
        group: 'Actions',
        label: 'Browse verification reports',
        hint: 'Report library',
        keywords: ['results', 'outcomes', 'library'],
        icon: <NavIcon name="reports" className="h-4 w-4" />,
        onSelect: () => navigate('/app/reports'),
      },
      {
        id: 'action-workspace',
        group: 'Actions',
        label:
          workspaceContext === 'team' ? 'Switch to individual workspace' : 'Switch to team workspace',
        hint: permissions.team ? 'Workspace context' : 'Requires team access',
        keywords: ['workspace', 'context', 'individual', 'team'],
        icon: <NavIcon name="team" className="h-4 w-4" />,
        onSelect: () => {
          if (!permissions.team) return
          const next = workspaceContext === 'team' ? 'individual' : 'team'
          setWorkspaceContext(next)
          toast.info(next === 'team' ? 'Team workspace' : 'Individual workspace', {
            description:
              next === 'team'
                ? 'Switched to the shared team workspace.'
                : 'Switched to your individual workspace.',
          })
        },
      },
      {
        id: 'action-signout',
        group: 'Actions',
        label: 'Sign out',
        hint: 'End this session',
        keywords: ['logout', 'exit', 'session'],
        icon: <NavIcon name="signout" className="h-4 w-4" />,
        onSelect: () => signOutWithToast(signOut, toast),
      },
    ]

    return [...navItems, ...actionItems]
  }, [
    sections,
    permissions.team,
    workspaceContext,
    setWorkspaceContext,
    signOut,
    navigate,
  ])
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export default function AppShellLayout() {
  const { profile, user, signOut, permissions, workspaceContext, setWorkspaceContext } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const pageMeta = getPageMeta(location.pathname)

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.adminOnly || permissions.admin),
      })),
    [permissions.admin],
  )

  const paletteItems = usePaletteItems(
    sections,
    signOut,
    setWorkspaceContext,
    permissions,
    workspaceContext,
  )

  useEffect(() => {
    setIsNavOpen(false)
  }, [location.pathname])

  return (
    <CommandRegistryProvider>
    <div className="app-shell-surface min-h-screen bg-parchment-light">
      <div className="min-h-screen lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-charcoal-soft bg-charcoal text-parchment lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex flex-col px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:h-screen lg:px-6 lg:py-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/8 text-base font-semibold tracking-[-0.04em] text-parchment shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  P
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold tracking-[-0.05em] text-parchment">
                    Provance
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-parchment/55">
                    Verification Workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavOpen((current) => !current)}
                aria-expanded={isNavOpen}
                aria-controls="app-shell-nav"
                aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
                className="ui-focus-ring rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-parchment/80 transition hover:border-white/22 hover:bg-white/8 lg:hidden"
              >
                {isNavOpen ? 'Close' : 'Menu'}
              </button>
            </div>

            <div
              id="app-shell-nav"
              className={`${isNavOpen ? 'mt-5 block' : 'hidden'} lg:mt-7 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col`}
            >
              <nav
                aria-label="Workspace navigation"
                className="space-y-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
              >
                {sections.map((section) => (
                  <div key={section.label}>
                    <p className="px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-parchment/45">
                      {section.label}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {section.items.map((item) => {
                        const isLocked = item.teamRequired && !permissions.team

                        return (
                          <li key={item.href}>
                            <NavLink
                              to={item.href}
                              end={item.end}
                              className={({ isActive }) =>
                                `group ui-focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                                  isActive
                                    ? 'bg-parchment font-semibold text-charcoal shadow-[0_14px_34px_rgba(0,0,0,0.22)]'
                                    : 'text-parchment/70 hover:bg-white/7 hover:text-parchment'
                                } ${isLocked ? 'opacity-60' : ''}`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <NavIcon
                                    name={item.icon}
                                    className={`h-[18px] w-[18px] shrink-0 ${
                                      isActive
                                        ? 'text-charcoal'
                                        : 'text-parchment/45 group-hover:text-parchment/75'
                                    }`}
                                  />
                                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  {isLocked && (
                                    <Badge tone="warning" size="sm" className="shrink-0">
                                      Locked
                                    </Badge>
                                  )}
                                </>
                              )}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </nav>

              <div className="mt-6 border-t border-white/8 pt-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-parchment/90 text-xs font-semibold tracking-wide text-charcoal">
                    {getInitials(profile?.displayName, user?.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-parchment">
                      {profile?.displayName || user?.email}
                    </p>
                    <p className="truncate text-xs text-parchment/55">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-parchment/45">
                    Workspace
                  </p>
                  <div className="mt-2.5">
                    <WorkspaceToggle />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOutWithToast(signOut, toast)}
                  className="ui-focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/4 px-4 py-2.5 text-sm text-parchment/75 transition hover:border-white/24 hover:bg-white/8 hover:text-parchment"
                >
                  <NavIcon name="signout" className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="relative z-30 border-b border-stone-light bg-parchment-light/88 px-5 py-5 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                  {pageMeta.eyebrow}
                </p>
                <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-[-0.05em] text-charcoal sm:text-3xl">
                  {pageMeta.title}
                </h1>
                <p className="mt-2 hidden max-w-2xl text-sm leading-relaxed text-charcoal-mid sm:block">
                  {pageMeta.detail}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <div className="hidden xl:block">
                  <Badge
                    tone={workspaceContext === 'team' ? 'success' : 'info'}
                    dot
                  >
                    {workspaceContext === 'team' ? 'Team workspace' : 'Individual workspace'}
                  </Badge>
                </div>
                <CommandPalette
                  items={paletteItems}
                  trigger={({ open, triggerRef }) => (
                    <button
                      ref={triggerRef}
                      type="button"
                      onClick={open}
                      aria-label="Search routes and actions"
                      className="ui-focus-ring flex h-10 w-10 items-center justify-center gap-2 rounded-xl border border-stone-light bg-white-warm text-sm text-charcoal-mid transition hover:border-charcoal/25 hover:text-charcoal md:w-auto md:px-3"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.8"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                      </svg>
                      <span className="hidden lg:inline">Search</span>
                      <kbd className="hidden rounded-md border border-stone-light bg-parchment px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal-light sm:block">
                        ⌘K
                      </kbd>
                    </button>
                  )}
                  placeholder="Search routes and actions…"
                />
                <NotificationBell />
                <AvatarMenu />
              </div>
            </div>
          </header>

          <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            {/* Location-keyed so the shell survives a page crash and
                navigating away resets the boundary. */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
    </CommandRegistryProvider>
  )
}
