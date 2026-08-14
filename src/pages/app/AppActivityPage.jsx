import { useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, Tabs, useRegisterCommands, useToast } from '../../components/ui'
import {
  formatDateTime,
  formatRelativeTime,
} from '../../components/app/scanPresentation.js'
import { getActivityLogs } from '../../lib/api.js'
import { buildCsv, downloadCsv } from '../../lib/csv.js'
import {
  ACTIVITY_CATEGORIES,
  getActivityCategory,
} from '../../lib/activityCategories.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Action presentation
// ---------------------------------------------------------------------------

const ACTION_META = {
  'user.invited': { label: 'Invited', verb: 'invited', tone: 'info' },
  'user.activated': { label: 'Activated', verb: 'activated', tone: 'success' },
  'scan.submitted': { label: 'Submitted', verb: 'submitted a scan', tone: 'neutral' },
  'scan.completed': { label: 'Completed', verb: 'completed a scan', tone: 'success' },
  'scan.failed': { label: 'Failed', verb: 'had a scan fail', tone: 'error' },
  'waitlist.reviewed': { label: 'Reviewed', verb: 'reviewed a waitlist application', tone: 'neutral' },
  // Real backend services write the underscore forms; keep parity so real
  // events render with the same chips and count toward the same tabs.
  'waitlist_reviewed': { label: 'Reviewed', verb: 'reviewed a waitlist application', tone: 'neutral' },
  'waitlist.approved': { label: 'Approved', verb: 'approved a waitlist application', tone: 'success' },
  'waitlist.rejected': { label: 'Rejected', verb: 'rejected a waitlist application', tone: 'error' },
  'waitlist.deferred': { label: 'Deferred', verb: 'deferred a waitlist application', tone: 'warning' },
  'invite_created': { label: 'Invite created', verb: 'created an access invite', tone: 'info' },
  'report.exported': { label: 'Exported', verb: 'exported a report', tone: 'info' },
  'report.viewed': { label: 'Viewed', verb: 'viewed a report', tone: 'neutral' },
  'settings.updated': { label: 'Updated', verb: 'updated settings', tone: 'neutral' },
  'team.member_added': { label: 'Added', verb: 'added a team member', tone: 'success' },
  'team.member_removed': { label: 'Removed', verb: 'removed a team member', tone: 'error' },
  'api_key.created': { label: 'Created', verb: 'created an API key', tone: 'info' },
  'api_key.revoked': { label: 'Revoked', verb: 'revoked an API key', tone: 'error' },
  'feature_flag.toggled': { label: 'Toggled', verb: 'toggled a feature flag', tone: 'warning' },
  'role.changed': { label: 'Role changed', verb: 'changed a role', tone: 'info' },
  'org.created': { label: 'Created', verb: 'created the organization', tone: 'success' },
  'invite.accepted': { label: 'Accepted', verb: 'accepted an invite', tone: 'success' },
  // Resolved incidents surface from the monitoring feed; severity drives the
  // tone below, so the dot matches the Monitoring page's incident accordion.
  'incident.resolved': { label: 'Resolved', verb: 'resolved an incident', tone: 'neutral' },
}

// Incident severity → activity tone (mirrors the Monitoring page accordion:
// critical=rose, major=amber, minor=sky).
const SEVERITY_TONE = {
  critical: 'error',
  major: 'warning',
  minor: 'info',
}

function getActionMeta(action) {
  return (
    ACTION_META[action] || {
      label: (action || 'event').split('.').pop().replace(/_/g, ' '),
      verb: action || 'acted',
      tone: 'neutral',
    }
  )
}

const RESOURCE_LABELS = {
  scan: 'scan',
  report: 'report',
  waitlist_application: 'waitlist application',
  api_key: 'API key',
  feature_flag: 'feature flag',
  organization: 'organization',
  invite: 'invite',
  settings: 'settings',
  team: 'team',
  user: 'user',
  role: 'role',
}

function resourceLabel(type) {
  return RESOURCE_LABELS[type] || (type || 'item').replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ActivityRow({ event, open, onToggle }) {
  const meta = getActionMeta(event.action)
  // Incident events carry their own severity so the tone dot matches the
  // Monitoring page's accordion (critical=rose, major=amber, minor=sky).
  const tone = SEVERITY_TONE[event.severity] || meta.tone
  const actorName = (event.actor_email || 'system').split('@')[0].replace(/\./g, ' ')

  return (
    <div className="border-b border-stone-light/70 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`activity-detail-${event.id}`}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-parchment/60"
      >
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            tone === 'success'
              ? 'bg-emerald-500'
              : tone === 'error'
                ? 'bg-rose-500'
                : tone === 'warning'
                  ? 'bg-amber-500'
                  : tone === 'info'
                    ? 'bg-sky-500'
                    : 'bg-stone-400'
          }`}
        />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-charcoal/5 text-xs font-semibold uppercase text-charcoal-mid">
          {actorName.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-charcoal">
            <span className="font-medium capitalize">{actorName}</span>{' '}
            <span className="text-charcoal-mid">{meta.verb}</span>{' '}
            <span className="font-medium text-charcoal">{resourceLabel(event.resource_type)}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            {/* Action chip */}
            <Badge tone={tone} size="sm">
              {meta.label}
            </Badge>
            {/* Target chip — min-w-0 + truncate: resource ids like
                waitlist_application_0007 are unbroken strings that otherwise
                blow the chip wider than the viewport on narrow columns. */}
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-stone-light bg-parchment px-2 py-0.5 font-mono text-[11px]">
              <span className="shrink-0 text-charcoal-light">{resourceLabel(event.resource_type)}</span>
              {event.resource_id && (
                <span title={event.resource_id} className="min-w-0 truncate text-charcoal">
                  {event.resource_id}
                </span>
              )}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <time dateTime={event.created_at} className="text-xs text-charcoal-light tabular-nums">
            {formatRelativeTime(event.created_at)}
          </time>
          <span
            aria-hidden="true"
            className={`text-charcoal-light transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </span>
      </button>
      {open && (
        <div
          id={`activity-detail-${event.id}`}
          role="region"
          aria-label={`Details for ${event.action}`}
          className="mx-5 mb-4 rounded-2xl border border-stone-light bg-parchment/60 px-5 py-4"
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Event</dt>
              <dd className="mt-1 font-mono text-xs text-charcoal">{event.action}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Actor</dt>
              <dd className="mt-1 text-xs text-charcoal">{event.actor_email || 'system'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Resource</dt>
              <dd className="mt-1 font-mono text-xs text-charcoal">{event.resource_id}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Occurred</dt>
              <dd className="mt-1 text-xs text-charcoal">
                {formatDateTime(event.created_at)}
              </dd>
            </div>
          </dl>
          {event.summary && (
            <div className="mt-4 rounded-2xl border border-stone-light bg-white-warm px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                Post-mortem summary
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-charcoal-mid">{event.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppActivityPage() {
  const demoState = useDemoState()
  const { toast } = useToast()
  const resource = useResource(() => getActivityLogs({ pageSize: 100 }).then((r) => r.data || []))
  const logs = withDemoOverride(resource, demoState, {
    emptyData: [],
  })

  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState({})
  const PAGE_SIZE = 8

  const status = logs.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const allEvents = useMemo(() => logs.data || [], [logs.data])
  const filtered = useMemo(() => {
    const cat = getActivityCategory(category)
    const q = query.trim().toLowerCase()
    return allEvents.filter((e) => {
      if (!cat.match(e)) return false
      if (!q) return true
      return (
        (e.actor_email || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        (e.resource_type || '').toLowerCase().includes(q) ||
        (e.resource_id || '').toLowerCase().includes(q)
      )
    })
  }, [allEvents, category, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  function toggleRow(eventId) {
    setExpanded((current) => ({ ...current, [eventId]: !current[eventId] }))
  }

  function resetPage() {
    setPage(1)
    setExpanded({})
  }

  // Same CSV helper and column contract as the admin Audit Logs page so both
  // surfaces export identically (src/lib/csv.js + the 6-column ledger).
  function handleExport() {
    const csv = buildCsv(
      ['Timestamp', 'Actor', 'Action', 'Severity', 'Resource type', 'Resource id'],
      filtered.map((event) => [
        event.created_at,
        event.actor_email || 'system',
        event.action,
        event.severity,
        event.resource_type,
        event.resource_id,
      ]),
    )
    downloadCsv('provance-activity-log.csv', csv)
    toast('Activity log exported', {
      description: `${filtered.length} event${filtered.length === 1 ? '' : 's'} in the CSV.`,
      type: 'success',
    })
  }

  const tabItems = Object.entries(ACTIVITY_CATEGORIES).map(([value, { label }]) => ({
    value,
    label: value === 'all' ? label : `${label} · ${allEvents.filter(ACTIVITY_CATEGORIES[value].match).length}`,
  }))

  useRegisterCommands(
    [
      {
        id: 'activity.toggle-expand-all',
        group: 'Activity',
        label: 'Expand all activity rows',
        hint: `${filtered.length} event${filtered.length === 1 ? '' : 's'}`,
        keywords: ['activity', 'log', 'expand', 'events'],
        onSelect: () =>
          setExpanded((current) => {
            const anyOpen = visible.some((e) => current[e.id])
            const next = {}
            visible.forEach((e) => {
              next[e.id] = !anyOpen
            })
            return { ...current, ...next }
          }),
      },
      {
        id: 'activity.scan-events',
        group: 'Activity',
        label: 'Filter to scan events',
        hint: `${allEvents.filter(ACTIVITY_CATEGORIES.scans.match).length} events`,
        keywords: ['activity', 'scans', 'filter'],
        onSelect: () => {
          setCategory('scans')
          resetPage()
        },
      },
      {
        id: 'activity.export-csv',
        group: 'Activity',
        label: 'Export activity log (CSV)',
        hint: `${filtered.length} event${filtered.length === 1 ? '' : 's'} in the current view`,
        keywords: ['activity', 'log', 'export', 'csv'],
        onSelect: handleExport,
      },
    ],
    [allEvents, visible, filtered, toast],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Activity log
            </p>
            <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
              Everything that happened in your workspace
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
              A running record of scans, exports, and account events — filter by category, search by
              actor or resource, and expand any row for the full detail.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
            iconLeft={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            }
          >
            Export CSV
          </Button>
        </div>
      </section>

      <Card
        eyebrow="Event ledger"
        title="Workspace activity"
        description="Newest first — actor, action, and target chips per event. Expand a row for the full detail and timestamp."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={logs.error}
        onRetry={logs.reload}
        loadingRows={6}
      >
        {!loading && !failed && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                items={tabItems}
                value={category}
                onChange={(value) => {
                  setCategory(value)
                  resetPage()
                }}
                variant="pill"
                ariaLabel="Activity categories"
              />
              <label className="relative block w-full sm:w-72">
                <span className="sr-only">Search activity</span>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-light"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    resetPage()
                  }}
                  placeholder="Search actor, action, resource…"
                  className="w-full rounded-xl border border-stone-light bg-parchment py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal-light"
                />
              </label>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                variant="empty"
                title={query ? 'No matching events' : 'No activity yet'}
                description={
                  query
                    ? 'Try a different search or clear the filters.'
                    : 'Scans, exports, and account events will appear here as they happen.'
                }
                compact
              />
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-stone-light bg-white-warm">
                {visible.map((event) => (
                  <ActivityRow
                    key={event.id}
                    event={event}
                    open={Boolean(expanded[event.id])}
                    onToggle={() => toggleRow(event.id)}
                  />
                ))}
              </div>
            )}

            {filtered.length > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-between border-t border-stone-light pt-4">
                <p className="text-xs text-charcoal-light">
                  Showing {Math.min(filtered.length, (safePage - 1) * PAGE_SIZE + PAGE_SIZE)} of{' '}
                  {filtered.length} events
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-white-warm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs text-charcoal-mid tabular-nums">
                    {safePage} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-white-warm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
