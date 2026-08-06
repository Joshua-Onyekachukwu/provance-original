import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Tabs,
  useRegisterCommands,
  useToast,
} from '../../components/ui'
import { getNotifications } from '../../lib/api.js'
import { formatRelativeTime } from '../../components/app/scanPresentation.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOTIFICATION_TONES = {
  scan: 'bg-sky-500',
  team: 'bg-emerald-500',
  billing: 'bg-amber-500',
  security: 'bg-rose-500',
  system: 'bg-stone-400',
}

const CATEGORY_META = {
  scan: { label: 'Scan' },
  team: { label: 'Team' },
  billing: { label: 'Billing' },
  security: { label: 'Security' },
  system: { label: 'System' },
}

function ListSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading notifications" className="divide-y divide-stone-light">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-5 py-4">
          <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppNotificationsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const demoState = useDemoState()

  const resource = useResource(() =>
    getNotifications({ page: 1, pageSize: 100 }).then((r) => r?.data || r?.notifications || []),
  )
  const notifications = withDemoOverride(resource, demoState, { emptyData: [] })

  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [localReadIds, setLocalReadIds] = useState(() => new Set())

  // Reset the selected category when the list reloads in demo mode so the
  // empty/error surfaces are obvious regardless of the current filter.
  useEffect(() => {
    if (demoState) setActiveCategory('all')
  }, [demoState])

  const list = useMemo(() => notifications.data || [], [notifications.data])

  const categoryCounts = useMemo(() => {
    const counts = { all: list.length }
    for (const item of list) {
      counts[item.category] = (counts[item.category] || 0) + 1
    }
    return counts
  }, [list])

  const unreadCount = useMemo(
    () => list.filter((item) => !item.read && !localReadIds.has(item.id)).length,
    [list, localReadIds],
  )

  const visible = useMemo(() => {
    const filtered =
      activeCategory === 'all'
        ? list
        : list.filter((item) => item.category === activeCategory)
    return [...filtered].sort((a, b) => {
      const aRead = a.read || localReadIds.has(a.id)
      const bRead = b.read || localReadIds.has(b.id)
      if (aRead !== bRead) return aRead ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [list, activeCategory, localReadIds])

  const tabs = useMemo(
    () =>
      [
        { value: 'all', label: 'All' },
        ...Object.entries(CATEGORY_META).map(([value, meta]) => ({ value, label: meta.label })),
      ].map((tab) => ({ ...tab, badge: categoryCounts[tab.value] || 0 })),
    [categoryCounts],
  )

  function markRead(item) {
    setLocalReadIds((current) => {
      const next = new Set(current)
      next.add(item.id)
      return next
    })
  }

  function openNotification(item) {
    const wasUnread = !item.read && !localReadIds.has(item.id)
    markRead(item)
    setExpandedId((current) => (current === item.id ? null : item.id))
    if (item.link) {
      navigate(item.link)
      return
    }
    if (wasUnread) {
      toast.success('Marked as read')
    }
  }

  function markAllRead() {
    const count = unreadCount
    setLocalReadIds((current) => {
      const next = new Set(current)
      for (const item of list) next.add(item.id)
      return next
    })
    if (count > 0) toast.success(`Marked ${count} notification${count === 1 ? '' : 's'} as read`)
  }

  // Page-scoped commands (⌘K) — active only while this page is mounted.
  useRegisterCommands(
    [
      {
        id: 'notifications.mark-all-read',
        group: 'Notifications',
        label: 'Mark all notifications read',
        hint: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up',
        keywords: ['notifications', 'unread', 'clear'],
        onSelect: markAllRead,
      },
      {
        id: 'notifications.filter-unread',
        group: 'Notifications',
        label: 'Show unread notifications',
        hint: 'Pin unread items to the top',
        keywords: ['notifications', 'filter', 'unread'],
        onSelect: () => setActiveCategory('all'),
      },
      ...(unreadCount > 0
        ? [
            {
              id: 'notifications.open-unread',
              group: 'Notifications',
              label: 'Open first unread notification',
              hint: `${unreadCount} unread remaining`,
              keywords: ['notifications', 'read', 'open'],
              onSelect: () => {
                const firstUnread = visible.find(
                  (item) => !item.read && !localReadIds.has(item.id),
                )
                if (firstUnread) openNotification(firstUnread)
              },
            },
          ]
        : []),
    ],
    [visible, unreadCount, localReadIds],
  )

  const status = notifications.status
  const failed = status === 'error'
  const loading = status === 'loading'

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Notifications
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Alerts from your workspace
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Scan completions, team activity, billing updates, and security events. Select a
          notification to expand its details, or open the linked report directly.
        </p>
      </section>

      <Card
        eyebrow="Notification center"
        title={
          unreadCount > 0
            ? `${unreadCount} unread · ${list.length} total`
            : 'You are all caught up'
        }
        description="Newest activity first, unread items pinned to the top."
        actions={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null
        }
      >
        {!loading && !failed && (
          <div className="border-b border-stone-light px-5 pt-4">
            <Tabs
              items={tabs}
              value={activeCategory}
              onChange={setActiveCategory}
              ariaLabel="Filter notifications by category"
            />
          </div>
        )}

        {loading && <ListSkeleton />}

        {failed && (
          <div className="px-5 py-8">
            <EmptyState
              variant="error"
              title="Notifications could not be loaded"
              description={notifications.error}
              action={
                <Button variant="secondary" size="sm" onClick={notifications.reload}>
                  Retry
                </Button>
              }
              compact
            />
          </div>
        )}

        {!loading && !failed && list.length === 0 && (
          <div className="px-5 py-8">
            <EmptyState
              variant="empty"
              title="No notifications yet"
              description="When scans complete, teammates join, or security events occur, alerts will appear here."
              compact
            />
          </div>
        )}

        {!loading && !failed && list.length > 0 && visible.length === 0 && (
          <div className="px-5 py-8">
            <EmptyState
              variant="empty"
              title={`No ${activeCategory === 'all' ? '' : CATEGORY_META[activeCategory]?.label.toLowerCase() + ' '}notifications`}
              description="Nothing in this category yet. Switch the filter to see other activity."
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveCategory('all')}>
                  Show all
                </Button>
              }
              compact
            />
          </div>
        )}

        {!loading && !failed && visible.length > 0 && (
          <ul className="divide-y divide-stone-light">
            {visible.map((item) => {
              const isUnread = !item.read && !localReadIds.has(item.id)
              const isExpanded = expandedId === item.id
              const tone = NOTIFICATION_TONES[item.category] || 'bg-stone-400'
              const categoryLabel = CATEGORY_META[item.category]?.label || item.category

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    aria-expanded={isExpanded}
                    className={`ui-focus-ring flex w-full items-start gap-3 px-5 py-4 text-left transition ${
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
                          {item.title}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-charcoal-mid/80">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-charcoal-mid">
                        {item.description}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral" size="sm">
                          {categoryLabel}
                        </Badge>
                        {item.link && (
                          <span className="text-[11px] font-medium text-sky-700">
                            Open report →
                          </span>
                        )}
                        {isUnread && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                            New
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  {isExpanded && !item.link && (
                    <div className="border-t border-stone-light bg-parchment px-5 py-4">
                      <p className="text-sm leading-relaxed text-charcoal-mid">{item.description}</p>
                      <p className="mt-2 text-xs text-charcoal-light">
                        {item.category}. Created {formatRelativeTime(item.created_at)}.
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
