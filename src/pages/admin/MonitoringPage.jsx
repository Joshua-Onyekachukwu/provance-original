import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useMockData from '../../lib/useMockData.js'
import { useDemoState } from '../../lib/useDemoState.js'
import { getMonitoring } from '../../lib/api.js'
import {
  formatDurationMs,
  formatPct,
  formatDate,
  formatTimeShort,
  formatStorageGb,
  percentOf,
} from '../../components/app/scanPresentation.js'
import {
  Button,
  HourlyBarChart,
  StatCard,
  TrendChart,
  useRegisterCommands,
} from '../../components/ui/index.js'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import SystemHealthPanel from '../../components/admin/SystemHealthPanel.jsx'
import ServiceStatusList from '../../components/admin/ServiceStatusList.jsx'

// ---------------------------------------------------------------------------
// Presentation meta (mirrors HealthCheckRow status vocabulary)
// ---------------------------------------------------------------------------

const OVERALL_STATUS = {
  operational: { label: 'All systems operational', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  degraded: { label: 'Partial degradation', chip: 'bg-amber-50 text-amber-700 border-amber-100' },
  unreachable: { label: 'Major outage', chip: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const SEVERITY_META = {
  critical: { label: 'Critical', dot: 'bg-rose-500', text: 'text-rose-700' },
  major: { label: 'Major', dot: 'bg-amber-500', text: 'text-amber-700' },
  minor: { label: 'Minor', dot: 'bg-sky-500', text: 'text-sky-700' },
}

const INCIDENT_STATUS = {
  investigating: { label: 'Investigating', chip: 'bg-amber-50 text-amber-700 border-amber-100' },
  monitoring: { label: 'Monitoring', chip: 'bg-sky-50 text-sky-700 border-sky-100' },
  resolved: { label: 'Resolved', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
}

// ---------------------------------------------------------------------------
// Empty monitoring shape (for the ?state=empty review surface)
// ---------------------------------------------------------------------------

const EMPTY_MONITORING = {
  overall: { status: 'operational', uptime_30d: 0, avg_response_ms: 0, open_incidents: 0, checks_24h: 0 },
  services: [],
  incidents: [],
  queue_health: null,
  storage_utilization: null,
  db_performance: null,
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-4 sm:p-5 shadow-sm">
      <div className="mb-2 h-3 w-20 rounded bg-stone-light/60" />
      <div className="mb-2 h-7 w-14 rounded bg-stone-light/50" />
      <div className="h-3 w-28 rounded bg-stone-light/40" />
    </div>
  )
}

function PanelSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 h-3 w-32 rounded bg-stone-light/60" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-stone-light/30" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Queue health (headline stats + shared HourlyBarChart primitive)
// ---------------------------------------------------------------------------

function QueueHealthPanel({ queue }) {
  const hourly = useMemo(() => queue?.hourly_series || [], [queue?.hourly_series])
  // Series max — kept here only to gate the chart block below (the
  // HourlyBarChart primitive recomputes it internally).
  const hourlyMax = useMemo(
    () => hourly.reduce((max, p) => Math.max(max, p.processed || 0), 0),
    [hourly],
  )
  // Daily trend — TrendChart expects { date, scans, completed, failed }; map
  // the queue series (processed / completed / failed per day) onto it and
  // relabel via the `labels` prop so the legend reads in queue vocabulary.
  const daily = useMemo(
    () =>
      (queue?.daily_series || []).map((p) => ({
        date: p.date,
        scans: p.processed || 0,
        completed: p.completed || 0,
        failed: p.failed || 0,
      })),
    [queue?.daily_series],
  )

  if (!queue) return null

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Queue health
          </p>
          <p className="mt-1 text-sm text-charcoal-mid">Backlog and worker cadence over 12h</p>
        </div>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          Job queue
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Queued</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {queue.queued ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">waiting for a worker</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">In flight</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {queue.in_flight ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">processing now</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Throughput</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {queue.throughput_per_hour ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">scans / hour</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Avg time</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {formatDurationMs(queue.avg_processing_time_ms)}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">per scan</p>
        </div>
      </div>

      {hourly.length > 0 && hourlyMax > 0 && (
        <div className="mt-5">
          {/* Shared HourlyBarChart primitive — bars, hover readout/guide,
              hit cells, and axis labels all live in the ui kit now. This
              panel keeps its custom viewBox (720×120, 8-unit pads, taller
              bars) via the geometry props. */}
          <HourlyBarChart
            points={hourly}
            ariaLabel="Scans processed per hour over the last 12 hours"
            chartW={720}
            chartH={120}
            pad={{ left: 8, right: 8 }}
            barAreaH={92}
            barBaseY={104}
            guideTop={0}
            svgClassName="h-20 w-full"
          />
        </div>
      )}

      {/* 14-day throughput trend — reuses the TrendChart primitive with queue
          vocabulary via the `labels` prop */}
      <div className="mt-5 border-t border-stone-light pt-5">
        <TrendChart
          data={daily}
          title="Daily throughput"
          description="Jobs processed, completed, and failed per day over the last 14 days."
          ariaLabel="Daily scan jobs processed over the last 14 days"
          labels={{ scans: 'Processed', completed: 'Completed', failed: 'Failed' }}
          emptyTitle="No daily throughput yet"
          emptyDescription="Worker activity will trend here as scans flow through the queue."
        />
      </div>

      <p className="mt-4 flex items-center justify-between border-t border-stone-light pt-4 text-xs text-charcoal-light">
        <span>Failed 24h: {queue.failed_24h ?? '—'}</span>
        <span
          className={`font-medium ${queue.failure_rate > 0.05 ? 'text-rose-500' : 'text-emerald-600'}`}
        >
          {formatPct(queue.failure_rate, 1)} failure
        </span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Storage utilization (overall meter + per-bucket rows)
// ---------------------------------------------------------------------------

function StorageUtilizationPanel({ storage }) {
  const buckets = useMemo(() => storage?.buckets || [], [storage?.buckets])

  if (!storage) return null

  const totalPct = percentOf(storage.total_used_gb, storage.total_capacity_gb)

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Storage utilization
          </p>
          <p className="mt-1 text-sm text-charcoal-mid">
            {formatStorageGb(storage.total_used_gb)} of {formatStorageGb(storage.total_capacity_gb)} used
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${
            totalPct >= 90
              ? 'border-rose-100 bg-rose-50 text-rose-700'
              : totalPct >= 75
                ? 'border-amber-100 bg-amber-50 text-amber-700'
                : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
        >
          {totalPct}% used
        </span>
      </div>

      {/* Overall meter */}
      <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-stone-light">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            totalPct >= 90 ? 'bg-rose-500' : totalPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${totalPct}%` }}
        />
      </div>

      {buckets.length === 0 ? (
        <p className="py-6 text-center text-sm text-charcoal-mid">No storage buckets recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {buckets.map((bucket) => {
            const bucketPct = percentOf(bucket.used_gb, bucket.capacity_gb)
            const share = storage.total_used_gb > 0 ? bucket.used_gb / storage.total_used_gb : 0
            const growth = bucket.growth_30d ?? 0
            return (
              <div key={bucket.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-charcoal">{bucket.label}</p>
                  <p className="font-mono text-xs text-charcoal-mid tabular-nums">
                    {formatStorageGb(bucket.used_gb)}{' '}
                    <span className="text-charcoal-light">/ {formatStorageGb(bucket.capacity_gb)}</span>
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-light">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      bucketPct >= 90 ? 'bg-rose-500' : bucketPct >= 75 ? 'bg-amber-500' : 'bg-charcoal'
                    }`}
                    style={{ width: `${bucketPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-charcoal-light">
                  <span>
                    {bucketPct}% of bucket · {formatPct(share, 0)} of total
                  </span>
                  <span className={growth >= 0.1 ? 'font-medium text-amber-600' : 'font-medium text-emerald-600'}>
                    {growth >= 0.1 ? '▲' : '▸'} {formatPct(growth, 0)} 30d
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Database performance (latency, connections, cache, table stats)
// ---------------------------------------------------------------------------

function DBPerformancePanel({ db }) {
  if (!db) return null

  const conns = db.connections || { active: 0, max: 1 }
  const connPct = percentOf(conns.active, conns.max)
  const cachePct = percentOf(db.cache_hit_rate, 1)
  const tables = db.tables || []

  const maxDeadTuples = tables.reduce((max, t) => Math.max(max, t.dead_tuples_pct || 0), 0)

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Database performance
          </p>
          <p className="mt-1 text-sm text-charcoal-mid">Postgres (Neon) · read-path health</p>
        </div>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          Primary
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Avg query</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {formatDurationMs(db.avg_query_ms)}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">p50 across reads</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">p95 query</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {formatDurationMs(db.p95_query_ms)}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">slow tail</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Connections</p>
          <p className={`mt-1 font-serif text-2xl tabular-nums ${connPct >= 80 ? 'text-rose-600' : 'text-charcoal'}`}>
            {conns.active}/{conns.max}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">pool utilization</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Cache hit</p>
          <p className={`mt-1 font-serif text-2xl tabular-nums ${cachePct >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {formatPct(db.cache_hit_rate, 1)}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">shared buffers</p>
        </div>
      </div>

      <div className="mt-5 border-t border-stone-light pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
            Table stats
          </p>
          <span className="font-mono text-[11px] text-charcoal-light">
            {db.slow_queries_24h ?? '—'} slow queries 24h
          </span>
        </div>

        {tables.length === 0 ? (
          <p className="py-6 text-center text-sm text-charcoal-mid">No table statistics yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-light bg-white-warm">
            <div className="hidden grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-stone-light/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light sm:grid">
              <span>Table</span>
              <span className="w-16 text-right">Rows</span>
              <span className="w-16 text-right">Size</span>
              <span className="w-28 text-right">Dead tuples</span>
            </div>
            {tables.map((table) => (
              <div
                key={table.name}
                className="grid grid-cols-2 items-center gap-x-4 gap-y-1 border-b border-stone-light/50 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="truncate font-mono text-xs text-charcoal">{table.name}</p>
                  <p className="text-[11px] text-charcoal-light sm:hidden">
                    {table.rows.toLocaleString()} rows · {table.size_mb} MB
                  </p>
                </div>
                <div className="text-right sm:w-16">
                  <p className="font-mono text-xs text-charcoal tabular-nums">
                    {table.rows.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-charcoal-light sm:hidden">rows</p>
                </div>
                <div className="text-right sm:w-16">
                  <p className="font-mono text-xs text-charcoal tabular-nums">{table.size_mb} MB</p>
                  <p className="text-[11px] text-charcoal-light sm:hidden">size</p>
                </div>
                <div className="col-span-2 sm:col-span-1 sm:w-28 sm:text-right">
                  <div className="flex items-center gap-2 sm:justify-end">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-stone-light sm:w-16">
                      <div
                        className="h-1.5 rounded-full bg-amber-500"
                        style={{
                          width: `${maxDeadTuples > 0 ? (table.dead_tuples_pct / maxDeadTuples) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-charcoal-light">
                      {formatPct(table.dead_tuples_pct, 1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-light sm:hidden">dead tuples</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Incident row (expandable)
// ---------------------------------------------------------------------------

function IncidentRow({ incident, open, onToggle }) {
  const severity = SEVERITY_META[incident.severity] || SEVERITY_META.minor
  const status = INCIDENT_STATUS[incident.status] || INCIDENT_STATUS.resolved
  const duration =
    incident.duration_hours != null
      ? (() => {
          const hours = Math.floor(incident.duration_hours)
          const minutes = Math.round((incident.duration_hours % 1) * 60)
          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
        })()
      : null

  return (
    <div className="border-b border-stone-light/70 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`incident-detail-${incident.id}`}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-parchment/60"
      >
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severity.dot}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-charcoal">{incident.title}</span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${status.chip}`}
            >
              {status.label}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-charcoal-light">
            <span className={severity.text}>{severity.label}</span>
            <span>
              {formatDate(incident.started_at)} →{' '}
              {incident.resolved_at ? formatDate(incident.resolved_at) : 'Ongoing'}
            </span>
            {duration && <span className="font-mono tabular-nums">{duration}</span>}
            {incident.services?.length > 0 && (
              <span className="font-mono">{incident.services.join(' · ')}</span>
            )}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`mt-1 shrink-0 text-charcoal-light transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          id={`incident-detail-${incident.id}`}
          role="region"
          aria-label={`Details for ${incident.title}`}
          className="mx-5 mb-4 rounded-2xl border border-stone-light bg-parchment/60 px-5 py-4"
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Started</dt>
              <dd className="mt-1 text-xs text-charcoal">{formatTimeShort(incident.started_at)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Resolved</dt>
              <dd className="mt-1 text-xs text-charcoal">
                {incident.resolved_at ? formatTimeShort(incident.resolved_at) : 'Still active'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Duration</dt>
              <dd className="mt-1 text-xs text-charcoal">{duration || '—'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">{incident.summary}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonitoringPage() {
  const navigate = useNavigate()
  const demoState = useDemoState()

  const { data: rawMonitoring, loading, error, refetch } = useMockData(getMonitoring)

  // ── Demo-state forcing (dev-only, ?state=loading|empty|error) ─────────────
  const monitoring = useMemo(() => {
    if (demoState === 'empty') return EMPTY_MONITORING
    return rawMonitoring
  }, [demoState, rawMonitoring])

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'

  // ── Derived (keyed off raw refs so the memo deps stay stable) ─────────────
  const services = useMemo(() => monitoring?.services || [], [monitoring?.services])
  const incidents = useMemo(() => monitoring?.incidents || [], [monitoring?.incidents])
  const queueHealth = useMemo(() => monitoring?.queue_health || null, [monitoring?.queue_health])
  const storageUtilization = useMemo(
    () => monitoring?.storage_utilization || null,
    [monitoring?.storage_utilization],
  )
  const dbPerformance = useMemo(
    () => monitoring?.db_performance || null,
    [monitoring?.db_performance],
  )
  const overall = monitoring?.overall || EMPTY_MONITORING.overall

  const healthData = useMemo(() => {
    if (services.length === 0) return null
    const byId = Object.fromEntries(services.map((s) => [s.id, s]))
    return {
      api: byId.api?.status || 'not_configured',
      database: byId.database?.status || 'not_configured',
      storage: byId.storage?.status || 'not_configured',
      queue: byId.queue?.status || 'not_configured',
      email: byId.email?.status || 'not_configured',
      lastCheckedAt: byId.api?.last_checked_at || null,
    }
  }, [services])

  const [openOnly, setOpenOnly] = useState(false)
  const [expanded, setExpanded] = useState({})

  const visibleIncidents = useMemo(() => {
    if (!openOnly) return incidents
    return incidents.filter((incident) => incident.status !== 'resolved')
  }, [incidents, openOnly])

  const openIncidentCount = useMemo(
    () => incidents.filter((incident) => incident.status !== 'resolved').length,
    [incidents],
  )

  const overallStatus = OVERALL_STATUS[overall.status] || OVERALL_STATUS.operational

  const isEmpty =
    demoState === 'empty' ||
    (monitoring && !isLoading && !hasError && services.length === 0 && incidents.length === 0)

  // ── Page-scoped commands (must precede conditional returns) ───────────────
  useRegisterCommands(
    [
      {
        id: 'admin.refresh-monitoring',
        group: 'Monitoring',
        label: 'Refresh health checks',
        hint: 'Re-run all service probes',
        keywords: ['monitoring', 'health', 'refresh', 'services'],
        onSelect: () => refetch(),
      },
      {
        id: 'admin.toggle-open-incidents',
        group: 'Monitoring',
        label: openOnly ? 'Show all incidents' : 'Show open incidents only',
        hint: `${openIncidentCount} open`,
        keywords: ['monitoring', 'incidents', 'open', 'filter'],
        onSelect: () => setOpenOnly((current) => !current),
      },
      {
        id: 'admin.go-overview',
        group: 'Monitoring',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['monitoring', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [navigate, refetch, openOnly, openIncidentCount],
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (demoState === 'loading' || (isLoading && !monitoring)) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse rounded-[1.75rem] border border-stone-light bg-white-warm p-6 sm:p-8">
          <div className="h-3 w-28 rounded bg-stone-light/60" />
          <div className="mt-3 h-8 w-72 max-w-full rounded bg-stone-light/50" />
          <div className="mt-3 h-3 w-96 max-w-full rounded bg-stone-light/40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PanelSkeleton rows={5} />
          <div className="lg:col-span-2">
            <PanelSkeleton rows={6} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PanelSkeleton rows={6} />
          <PanelSkeleton rows={6} />
        </div>
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={4} />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <AppStatePanel
        label="Error"
        title="Monitoring data could not be loaded"
        description={
          demoState === 'error'
            ? 'Demo state — forced error for review. This is not a real outage.'
            : error || 'Health checks are temporarily unavailable. Retry to re-probe the services.'
        }
        variant="error"
        action={<Button onClick={refetch}>Retry</Button>}
      />
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <AppStatePanel
        label="Ready"
        title="No monitoring data yet"
        description="Service status and incident history will populate as the platform runs its first health checks."
        variant="empty"
      />
    )
  }

  // ── Populated ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Monitoring"
        title="Platform health at a glance"
        description="Queue health, storage utilization, database performance, external service status, and incident history across the Provance infrastructure."
        meta={[
          { label: overallStatus.label },
          { label: `${formatPct(overall.uptime_30d, 2)} uptime (30d)` },
          { label: `${openIncidentCount} open incident${openIncidentCount === 1 ? '' : 's'}` },
        ]}
      />

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          size="sm"
          tone={overall.uptime_30d >= 0.999 ? 'success' : 'warning'}
          label="Uptime 30-Day"
          value={formatPct(overall.uptime_30d, 2)}
          detail="Across all core services"
        />
        <StatCard
          size="sm"
          tone="info"
          label="Avg Response"
          value={formatDurationMs(overall.avg_response_ms)}
          detail="Across checks this hour"
        />
        <StatCard
          size="sm"
          tone={openIncidentCount > 0 ? 'danger' : 'success'}
          label="Open Incidents"
          value={openIncidentCount}
          detail={openIncidentCount > 0 ? 'Being tracked' : 'Nothing in flight'}
        />
        <StatCard
          size="sm"
          tone="default"
          label="Checks 24h"
          value={(overall.checks_24h ?? 0).toLocaleString()}
          detail="Automated probes run"
        />
      </div>

      {/* ── Health panel + service list ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SystemHealthPanel healthData={healthData} onRefresh={refetch} />

        <div className="min-w-0 rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                External service status
              </p>
              <p className="mt-1 text-sm text-charcoal-mid">
                {services.filter((s) => s.status === 'operational').length} of {services.length}{' '}
                services operational
              </p>
            </div>
            <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
              {services.length} services
            </span>
          </div>
          <ServiceStatusList services={services} />
        </div>
      </div>

      {/* ── Queue health + database performance ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QueueHealthPanel queue={queueHealth} />
        <DBPerformancePanel db={dbPerformance} />
      </div>

      {/* ── Storage utilization ────────────────────────────────────────────── */}
      <StorageUtilizationPanel storage={storageUtilization} />

      {/* ── Incident history ───────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Incident history
            </p>
            <p className="mt-1 text-sm text-charcoal-mid">
              {incidents.length} incidents in the last 30 days · expand for the post-mortem summary
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenOnly((current) => !current)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
              openOnly
                ? 'border-charcoal bg-charcoal text-white-warm'
                : 'border-stone-light bg-parchment text-charcoal-mid hover:text-charcoal'
            }`}
          >
            {openOnly ? 'Showing open only' : `Open only (${openIncidentCount})`}
          </button>
        </div>

        {visibleIncidents.length === 0 ? (
          <p className="py-8 text-center text-sm text-charcoal-mid">No open incidents — all clear.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-light bg-white-warm">
            {visibleIncidents.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                open={Boolean(expanded[incident.id])}
                onToggle={() =>
                  setExpanded((current) => ({ ...current, [incident.id]: !current[incident.id] }))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
