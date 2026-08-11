import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, useRegisterCommands, useToast } from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import { formatDateTime, formatRelativeTime } from '../../components/app/scanPresentation.js'
import { getAdminAuditLogs } from '../../lib/api.js'
import { buildCsv, downloadCsv } from '../../lib/csv.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Presentation meta
// ---------------------------------------------------------------------------

const SEVERITY_META = {
  critical: { label: 'Critical', tone: 'danger' },
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'neutral' },
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

// Short action (last dotted/underscore segment, spaces for readability) →
// Badge tone, mirroring the admin ActivityRow badge-pill treatment on the ui
// Badge palette. Keys must match shortAction()'s output exactly — spaced form
// (member_added → 'member added').
const SHORT_ACTION_TONES = {
  invited: 'info',
  activated: 'success',
  submitted: 'info',
  completed: 'success',
  reviewed: 'neutral',
  approved: 'success',
  rejected: 'danger',
  deferred: 'warning',
  exported: 'info',
  viewed: 'neutral',
  updated: 'neutral',
  'member added': 'success',
  'member removed': 'danger',
  created: 'success',
  revoked: 'danger',
  toggled: 'warning',
  changed: 'info',
  accepted: 'success',
  retried: 'info',
  failed: 'danger',
  'invite created': 'success',
  'waitlist reviewed': 'neutral',
  'member session revoked': 'danger',
  'member sessions revoked': 'danger',
}

function shortAction(action) {
  return (action || 'event').split('.').pop().replace(/_/g, ' ')
}

function actionTone(action) {
  return SHORT_ACTION_TONES[shortAction(action)] || 'neutral'
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
// Row (expandable, mirrors the workspace ActivityRow pattern)
// ---------------------------------------------------------------------------

function AuditRow({ event, open, onToggle }) {
  const severity = SEVERITY_META[event.severity] || SEVERITY_META.low
  const actorName = (event.actor_email || 'system').split('@')[0].replace(/\./g, ' ')

  return (
    <div className="border-b border-stone-light/70 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`audit-detail-${event.id}`}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-parchment/60"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-charcoal/5 text-xs font-semibold uppercase text-charcoal-mid">
          {actorName.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Severity badge */}
            <Badge tone={severity.tone} size="sm">
              {severity.label}
            </Badge>
            {/* Action badge */}
            <Badge tone={actionTone(event.action)} size="sm">
              {shortAction(event.action).toUpperCase()}
            </Badge>
          </span>
          <span className="mt-1.5 block text-sm text-charcoal">
            <span className="font-medium capitalize">{actorName}</span>
            <span className="text-charcoal-light"> · {event.actor_email}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            {/* Resource target chip */}
            <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-light bg-parchment px-2 py-0.5 font-mono text-[11px]">
              <span className="text-charcoal-light">{resourceLabel(event.resource_type)}</span>
              {event.resource_id && <span className="text-charcoal">{event.resource_id}</span>}
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
          id={`audit-detail-${event.id}`}
          role="region"
          aria-label={`Details for ${event.action}`}
          className="mx-5 mb-4 rounded-2xl border border-stone-light bg-parchment/60 px-5 py-4"
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Event</dt>
              <dd className="mt-1 font-mono text-xs text-charcoal">{event.action}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Severity</dt>
              <dd className="mt-1 text-xs text-charcoal">{severity.label}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Actor</dt>
              <dd className="mt-1 text-xs text-charcoal">{event.actor_email || 'system'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Occurred</dt>
              <dd className="mt-1 text-xs text-charcoal">{formatDateTime(event.created_at)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 8

export default function AuditLogsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  // Active filter state is pushed to the API (real path GET /admin/audit-logs
  // applies the same severity/actor/action/resourceType/search filters
  // server-side, mirroring the account activity pattern); the page keeps its
  // client-side pass so dropdown options and the CSV export always reflect
  // the current view. A generous pageSize keeps the facet derivation working.
  const [severity, setSeverity] = useState('all')
  const [actor, setActor] = useState('all')
  const [action, setAction] = useState('all')
  const [resourceType, setResourceType] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState({})

  const resource = useResource(
    () =>
      getAdminAuditLogs({
        page: 1,
        pageSize: 500,
        severity,
        actor,
        action,
        resourceType,
        search: query.trim() || undefined,
      }).then((r) => r.data || []),
    [severity, actor, action, resourceType, query],
  )
  const logs = withDemoOverride(resource, demoState, { emptyData: [] })

  const status = logs.status
  const loading = status === 'loading'
  const failed = status === 'error'

  // ── Derived (keyed off logs.data so memo deps stay stable) ────────────────
  const allEvents = useMemo(() => logs.data || [], [logs.data])

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    allEvents.forEach((event) => {
      counts[event.severity] = (counts[event.severity] || 0) + 1
    })
    return counts
  }, [allEvents])

  const actors = useMemo(
    () => [...new Set(allEvents.map((event) => event.actor_email).filter(Boolean))].sort(),
    [allEvents],
  )
  const actions = useMemo(
    () => [...new Set(allEvents.map((event) => event.action).filter(Boolean))].sort(),
    [allEvents],
  )
  const resourceTypes = useMemo(
    () => [...new Set(allEvents.map((event) => event.resource_type).filter(Boolean))].sort(),
    [allEvents],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allEvents.filter((event) => {
      if (severity !== 'all' && event.severity !== severity) return false
      if (actor !== 'all' && event.actor_email !== actor) return false
      if (action !== 'all' && event.action !== action) return false
      if (resourceType !== 'all' && event.resource_type !== resourceType) return false
      if (!q) return true
      return (
        (event.actor_email || '').toLowerCase().includes(q) ||
        (event.action || '').toLowerCase().includes(q) ||
        (event.resource_type || '').toLowerCase().includes(q) ||
        (event.resource_id || '').toLowerCase().includes(q)
      )
    })
  }, [allEvents, severity, actor, action, resourceType, query])

  const hasActiveFilters =
    severity !== 'all' || actor !== 'all' || action !== 'all' || resourceType !== 'all' || query.trim() !== ''

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  function resetPage() {
    setPage(1)
    setExpanded({})
  }

  function clearFilters() {
    setSeverity('all')
    setActor('all')
    setAction('all')
    setResourceType('all')
    setQuery('')
    resetPage()
  }

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
    downloadCsv('provance-audit-log.csv', csv)
    toast('Audit log exported', {
      description: `${filtered.length} event${filtered.length === 1 ? '' : 's'} in the CSV.`,
      type: 'success',
    })
  }

  // ── Page-scoped commands (must precede conditional returns) ───────────────
  useRegisterCommands(
    [
      {
        id: 'admin.audit-export',
        group: 'Audit Logs',
        label: 'Export audit log (CSV)',
        hint: `${filtered.length} events in the current view`,
        keywords: ['audit', 'export', 'csv', 'log'],
        onSelect: handleExport,
      },
      {
        id: 'admin.audit-high-severity',
        group: 'Audit Logs',
        label: 'Filter to high severity',
        hint: `${severityCounts.high || 0} events`,
        keywords: ['audit', 'severity', 'high', 'filter'],
        onSelect: () => {
          setSeverity('high')
          resetPage()
        },
      },
      {
        id: 'admin.audit-clear-filters',
        group: 'Audit Logs',
        label: 'Clear audit filters',
        hint: hasActiveFilters ? 'Reset the current view' : 'No filters active',
        keywords: ['audit', 'clear', 'reset', 'filters'],
        onSelect: clearFilters,
      },
      {
        id: 'admin.go-overview',
        group: 'Audit Logs',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['audit', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [filtered, severityCounts, hasActiveFilters, navigate, toast],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Audit Logs"
        title="The full admin event trail"
        description="Every actor, action, and resource touched across the platform — filter by severity, actor, action, or resource, and export the current view as CSV."
        meta={[
          { label: `${allEvents.length} events` },
          { label: `${filtered.length} in view` },
          {
            label: `${severityCounts.high || 0} high severity`,
          },
        ]}
        primaryAction={
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Card
        eyebrow="Audit trail"
        title="Event ledger"
        description="Newest first — severity and action badges per event. Expand a row for the full detail and timestamp."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={logs.error}
        onRetry={logs.reload}
        loadingRows={6}
      >
        {!loading && !failed && (
          <>
            {/* ── Filter bar ─────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-light">
                  Severity
                </span>
                {['all', ...SEVERITY_ORDER].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={severity === value}
                    onClick={() => {
                      setSeverity(value)
                      resetPage()
                    }}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
                      severity === value
                        ? 'border-charcoal bg-charcoal text-white-warm'
                        : 'border-stone-light bg-parchment text-charcoal-mid hover:text-charcoal'
                    }`}
                  >
                    {value === 'all' ? 'All' : SEVERITY_META[value].label}
                    <span className="ml-1.5 opacity-70">
                      {value === 'all' ? allEvents.length : severityCounts[value] || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="sr-only" htmlFor="audit-actor">
                  Filter by actor
                </label>
                <select
                  id="audit-actor"
                  value={actor}
                  onChange={(event) => {
                    setActor(event.target.value)
                    resetPage()
                  }}
                  className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-sm text-charcoal"
                >
                  <option value="all">All actors</option>
                  {actors.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="audit-action">
                  Filter by action
                </label>
                <select
                  id="audit-action"
                  value={action}
                  onChange={(event) => {
                    setAction(event.target.value)
                    resetPage()
                  }}
                  className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-sm text-charcoal"
                >
                  <option value="all">All actions</option>
                  {actions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="audit-resource">
                  Filter by resource
                </label>
                <select
                  id="audit-resource"
                  value={resourceType}
                  onChange={(event) => {
                    setResourceType(event.target.value)
                    resetPage()
                  }}
                  className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-sm text-charcoal"
                >
                  <option value="all">All resources</option>
                  {resourceTypes.map((value) => (
                    <option key={value} value={value}>
                      {resourceLabel(value)}
                    </option>
                  ))}
                </select>

                <label className="relative block w-full sm:w-64">
                  <span className="sr-only">Search audit events</span>
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

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {/* ── Ledger ────────────────────────────────────────────────────── */}
            {filtered.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  variant="empty"
                  title={hasActiveFilters ? 'No matching events' : 'No audit events yet'}
                  description={
                    hasActiveFilters
                      ? 'Try different filters or clear them to see the full trail.'
                      : 'Platform events will appear here as they happen.'
                  }
                  compact
                />
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-stone-light bg-white-warm">
                {visible.map((event) => (
                  <AuditRow
                    key={event.id}
                    event={event}
                    open={Boolean(expanded[event.id])}
                    onToggle={() =>
                      setExpanded((current) => ({ ...current, [event.id]: !current[event.id] }))
                    }
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
