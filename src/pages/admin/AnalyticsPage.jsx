import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useMockData from '../../lib/useMockData.js'
import { useDemoState } from '../../lib/useDemoState.js'
import { getAnalytics } from '../../lib/api.js'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import { useTeamFilterParam } from '../../lib/useTeamFilterParam.js'
import {
  VERDICT_CHART_SEGMENTS,
  formatDurationMs,
  formatPct,
  formatShortDate,
  formatStorageGb,
  getTeamMeta,
} from '../../components/app/scanPresentation.js'
import {
  Button,
  DataTable,
  DonutChart,
  HourlyBarChart,
  StackedBarChart,
  StatCard,
  TrendChart,
  useRegisterCommands,
  useToast,
} from '../../components/ui/index.js'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'

// ---------------------------------------------------------------------------
// Media-type labels + palette
// ---------------------------------------------------------------------------

const MEDIA_LABELS = {
  'video/mp4': 'MP4 Video',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/webp': 'WebP Image',
  'image/gif': 'GIF Image',
  'audio/wav': 'WAV Audio',
  'audio/mpeg': 'MP3 Audio',
  'application/pdf': 'PDF Document',
}

// Hex palette for the DonutChart arcs + legend dots (the old bg- classes only
// worked on the removed percentage-bar rows).
const MEDIA_HEX = {
  'video/mp4': '#818cf8',
  'image/jpeg': '#34d399',
  'image/png': '#38bdf8',
  'image/webp': '#2dd4bf',
  'image/gif': '#a78bfa',
  'audio/wav': '#fbbf24',
  'audio/mpeg': '#fb923c',
  'application/pdf': '#fb7185',
}

// ---------------------------------------------------------------------------
// Empty analytics shape (for the ?state=empty review surface)
// ---------------------------------------------------------------------------

const EMPTY_ANALYTICS = {
  scans_today: 0,
  scans_7d: 0,
  completion_rate: 0,
  failure_rate: 0,
  suspicious_rate: 0,
  media_type_distribution: {},
  volume_trend: [],
  verdict_trend: [],
  queue_throughput: null,
  top_organizations: [],
  team_breakdown: [],
}

// ---------------------------------------------------------------------------
// Skeleton
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

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 h-3 w-32 rounded bg-stone-light/60" />
      <div className="h-48 rounded-xl bg-stone-light/30" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rate meter
// ---------------------------------------------------------------------------

function RateMeter({ label, value, tone, detail }) {
  const barTone = {
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
  }[tone] || 'bg-charcoal'

  const chipTone = {
    success: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    danger: 'text-rose-700 bg-rose-50 border-rose-100',
    warning: 'text-amber-700 bg-amber-50 border-amber-100',
  }[tone] || 'text-charcoal bg-parchment border-stone-light'

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-charcoal">{label}</p>
        <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${chipTone}`}>
          {formatPct(value, 1)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-light">
        <div
          className={`h-2 rounded-full ${barTone} transition-all duration-500`}
          style={{ width: `${Math.min(Math.max((value || 0) * 100, 0), 100)}%` }}
        />
      </div>
      {detail ? <p className="mt-1.5 text-xs text-charcoal-light">{detail}</p> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Queue throughput (headline stats + shared HourlyBarChart primitive)
// ---------------------------------------------------------------------------

function QueueThroughputPanel({ throughput }) {
  const hourly = useMemo(() => throughput?.hourly_series || [], [
    throughput?.hourly_series,
  ])
  // Series max — kept here only to gate the chart block below (the
  // HourlyBarChart primitive recomputes it internally).
  const hourlyMax = useMemo(
    () => hourly.reduce((max, p) => Math.max(max, p.processed || 0), 0),
    [hourly],
  )

  if (!throughput) return null

  const lastHour = hourly[hourly.length - 1] || null

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Queue throughput
        </p>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          12h
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Last hour</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {throughput.processed_last_hour ?? lastHour?.processed ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">scans / hr</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Avg time</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {formatDurationMs(throughput.avg_processing_time_ms)}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">per scan</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Queue depth</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {throughput.queue_depth ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">
            {throughput.in_flight ?? 0} in flight
          </p>
        </div>
      </div>

      {hourly.length > 0 && hourlyMax > 0 && (
        <div className="mt-5">
          {/* Shared HourlyBarChart primitive — bars, hover readout/guide,
              hit cells, and axis labels all live in the ui kit now */}
          <HourlyBarChart
            points={hourly}
            ariaLabel="Scans processed per hour over the last 12 hours"
          />
        </div>
      )}

      <p className="mt-4 flex items-center justify-between border-t border-stone-light pt-4 text-xs text-charcoal-light">
        <span>
          Last 24h: {(throughput.processed_24h ?? 0).toLocaleString()} processed
        </span>
        <span className="font-medium text-rose-500">
          {formatPct(throughput.failure_rate, 0)} failure
        </span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top organizations table
// ---------------------------------------------------------------------------

const TOP_ORG_COLUMNS = [
  { key: 'name', header: 'Organization', sortable: true },
  { key: 'member_count', header: 'Members', sortable: true },
  {
    key: 'scan_count',
    header: 'Scans',
    sortable: true,
    render: (row) => row.scan_count.toLocaleString(),
  },
  {
    key: 'completion_rate',
    header: 'Completion',
    sortable: true,
    render: (row) => formatPct(row.completion_rate, 0),
  },
  {
    key: 'storage_used_gb',
    header: 'Storage',
    sortable: true,
    render: (row) => formatStorageGb(row.storage_used_gb),
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  // URL-backed (?team=) like the workspace surfaces. The team filter drives a
  // real query: getAnalytics forwards ?team= to the backend (or the mock
  // recomputes the top-org split from the ledger), so the top-orgs table and
  // chip counts reflect that team's actual usage instead of a client-side
  // mock join.
  const [teamFilter, setTeamFilter] = useTeamFilterParam()

  const { data: rawAnalytics, loading, error, refetch } = useMockData(
    getAnalytics,
    teamFilter !== 'all' ? { team: teamFilter } : null,
  )

  // Refetch when the team filter changes — useMockData reads its params from a
  // ref at call time, so switching teams needs an explicit reload (skipped on
  // first mount, where the hook already fires its initial load).
  const prevTeamRef = useRef(teamFilter)
  useEffect(() => {
    if (prevTeamRef.current !== teamFilter) {
      prevTeamRef.current = teamFilter
      refetch()
    }
  }, [teamFilter, refetch])

  // ── Demo-state forcing (dev-only, ?state=loading|empty|error) ─────────────
  const analytics = useMemo(() => {
    if (demoState === 'empty') return EMPTY_ANALYTICS
    return rawAnalytics
  }, [demoState, rawAnalytics])

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'

  // ── Derived ────────────────────────────────────────────────────────────────
  const mediaEntries = useMemo(() => {
    if (!analytics?.media_type_distribution) return []
    return Object.entries(analytics.media_type_distribution)
      .map(([mimeType, count]) => ({ mimeType, count }))
      .sort((a, b) => b.count - a.count)
  }, [analytics])

  const mediaTotal = useMemo(
    () => mediaEntries.reduce((sum, entry) => sum + entry.count, 0),
    [mediaEntries],
  )

  const trend = useMemo(() => analytics?.volume_trend || [], [analytics])
  const verdictTrend = useMemo(() => analytics?.verdict_trend || [], [analytics])
  const queueThroughput = useMemo(() => analytics?.queue_throughput || null, [analytics])
  const topOrgs = useMemo(() => analytics?.top_organizations || [], [analytics])

  // ── Trend deltas derived from the actual series (no magic thresholds) ───────
  const trendDeltas = useMemo(() => {
    if (trend.length < 3) return null

    const last = trend[trend.length - 1]
    const previous = trend[trend.length - 2]

    const daily = previous.scans > 0
      ? Math.round(((last.scans - previous.scans) / previous.scans) * 100)
      : null

    if (trend.length >= 14) {
      const last7 = trend.slice(-7).reduce((sum, p) => sum + p.scans, 0)
      const prev7 = trend.slice(-14, -7).reduce((sum, p) => sum + p.scans, 0)
      const weekly = prev7 > 0
        ? Math.round(((last7 - prev7) / prev7) * 100)
        : null

      const last7Rate =
        trend.slice(-7).reduce((sum, p) => sum + p.completed, 0) / last7
      const prev7Rate =
        trend.slice(-14, -7).reduce((sum, p) => sum + p.completed, 0) / prev7
      const completion = prev7Rate > 0
        ? Math.round((last7Rate - prev7Rate) * 1000) / 10
        : null

      return { daily, weekly, completion }
    }

    return { daily, weekly: null, completion: null }
  }, [trend])

  const trendToday = trendDeltas?.daily != null
    ? { direction: trendDeltas.daily >= 0 ? 'up' : 'down', value: `${Math.abs(trendDeltas.daily)}%` }
    : null
  const trendWeek = trendDeltas?.weekly != null
    ? { direction: trendDeltas.weekly >= 0 ? 'up' : 'down', value: `${Math.abs(trendDeltas.weekly)}%` }
    : null
  const trendCompletion = trendDeltas?.completion != null
    ? { direction: trendDeltas.completion >= 0 ? 'up' : 'down', value: `${Math.abs(trendDeltas.completion)}%` }
    : null

  // ── Team filter chips ──────────────────────────────────────────────────────
  // Counts come from the analytics payload's team_breakdown (real scans in
  // real mode, ledger-derived in mock mode) so the chips reflect live volume.
  const teamCounts = useMemo(() => {
    const counts = {}
    for (const entry of analytics?.team_breakdown || []) {
      if (entry.team_id) counts[entry.team_id] = entry.scans
    }
    return counts
  }, [analytics])

  // Sorting is handled by the DataTable primitive itself (per-column
  // sortable + internal sort state), so the top-orgs rows are passed
  // through in their natural order and the table owns the sort UI. When a
  // team is active, top_organizations is already scoped server-side (or by
  // the mock), so the page renders it directly.
  const topOrgRows = topOrgs

  const isEmpty =
    demoState === 'empty' ||
    (analytics &&
      !isLoading &&
      !hasError &&
      (analytics.scans_today || 0) === 0 &&
      trend.length === 0 &&
      topOrgs.length === 0)

  const lastTrendPoint = trend.length > 0 ? trend[trend.length - 1] : null
  const updatedLabel = lastTrendPoint
    ? formatShortDate(lastTrendPoint.date)
    : 'No activity yet'

  // ── Page-scoped commands (must precede conditional returns) ───────────────
  useRegisterCommands(
    [
      {
        id: 'admin.go-overview',
        group: 'Analytics',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['analytics', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
      {
        id: 'admin.go-users',
        group: 'Analytics',
        label: 'Open user administration',
        hint: 'Manage accounts and roles',
        keywords: ['analytics', 'admin', 'users'],
        onSelect: () => navigate('/app/admin/users'),
      },
      {
        id: 'admin.export-analytics',
        group: 'Analytics',
        label: 'Export analytics snapshot',
        hint: 'Generate a CSV of current metrics',
        keywords: ['analytics', 'export', 'csv', 'report'],
        onSelect: () =>
          toast('Analytics snapshot queued', {
            description: 'A CSV export will be emailed to your admin address.',
            type: 'success',
          }),
      },
    ],
    [navigate, toast],
  )

  // ── Loading (demo ?state=loading forces the skeleton even with data) ────────
  if (demoState === 'loading' || (isLoading && !analytics)) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse rounded-[1.75rem] border border-stone-light bg-white-warm p-6 sm:p-8">
          <div className="h-3 w-28 rounded bg-stone-light/60" />
          <div className="mt-3 h-8 w-72 max-w-full rounded bg-stone-light/50" />
          <div className="mt-3 h-3 w-96 max-w-full rounded bg-stone-light/40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <div className="mb-5 h-3 w-28 rounded bg-stone-light/60" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-stone-light/30" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <AppStatePanel
        label="Error"
        title="Analytics could not be loaded"
        description={
          demoState === 'error'
            ? 'Demo state — forced error for review. This is not a real outage.'
            : error || 'The analytics feed is temporarily unavailable. Retry to pull the latest metrics.'
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
        title="No analytics yet"
        description="Scan volume, completion rates, and adoption metrics will populate as verifications run through the platform. Upload a media file or invite an organization to generate the first data points."
        variant="empty"
      >
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button to="/app/uploads" variant="secondary">
            Run a verification
          </Button>
          <Button to="/app/admin/waitlist" variant="ghost">
            Review waitlist
          </Button>
        </div>
      </AppStatePanel>
    )
  }

  const kpiTrendToday = trendToday
  const kpiTrendWeek = trendWeek
  const kpiTrendCompletion = trendCompletion

  // ── Populated ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Volume and quality signals"
        description="Scan volume, verdict mix, queue throughput, and organization adoption across the platform."
        meta={[
          { label: `${analytics.scans_today.toLocaleString()} scans today` },
          { label: `${formatPct(analytics.completion_rate, 1)} completion` },
          { label: `Updated ${updatedLabel}` },
        ]}
      />

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          size="sm"
          tone="info"
          label="Scans Today"
          value={analytics.scans_today.toLocaleString()}
          detail="Submitted in the last 24h"
          trend={kpiTrendToday}
        />
        <StatCard
          size="sm"
          tone="info"
          label="Scans 7-Day"
          value={analytics.scans_7d.toLocaleString()}
          detail="Rolling weekly volume"
          trend={kpiTrendWeek}
        />
        <StatCard
          size="sm"
          tone="success"
          label="Completion Rate"
          value={formatPct(analytics.completion_rate, 1)}
          detail="Scans finished successfully"
          trend={kpiTrendCompletion}
        />
        <StatCard
          size="sm"
          tone="warning"
          label="Failure Rate"
          value={formatPct(analytics.failure_rate, 1)}
          detail="Scans that errored out"
        />
        <StatCard
          size="sm"
          tone="danger"
          label="Suspicious Rate"
          value={formatPct(analytics.suspicious_rate, 1)}
          detail="Flagged for manual review"
        />
      </div>

      {/* ── Trend + rates ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart
            data={trend}
            emptyTitle="No volume data in range"
            emptyDescription="Extend the range or wait for new scans to land."
          />
        </div>

        <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Outcome rates
          </p>
          <div className="space-y-6">
            <RateMeter
              label="Completion"
              value={analytics.completion_rate}
              tone="success"
              detail="Finished with a full evidence payload"
            />
            <RateMeter
              label="Failure"
              value={analytics.failure_rate}
              tone="danger"
              detail="Errored before a verdict was produced"
            />
            <RateMeter
              label="Suspicious"
              value={analytics.suspicious_rate}
              tone="warning"
              detail="Flagged for manual review"
            />
          </div>
        </div>
      </div>

      {/* ── Verdict mix + queue throughput ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StackedBarChart
            data={verdictTrend}
            segments={VERDICT_CHART_SEGMENTS}
            title="Scan volume by verdict"
            ariaLabel="Daily scan volume split by verdict over the last 14 days"
            emptyTitle="No verdict data in range"
            emptyDescription="Completed scans will split by verdict here as they land."
          />
        </div>
        <QueueThroughputPanel throughput={queueThroughput} />
      </div>

      {/* ── Media mix + top orgs ───────────────────────────────────────────── */}
      {/* min-w-0 lets the DataTable scroll internally instead of stretching the grid track */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutChart
          segments={mediaEntries.map((entry) => ({
            key: entry.mimeType,
            label: MEDIA_LABELS[entry.mimeType] || entry.mimeType,
            value: entry.count,
            color: MEDIA_HEX[entry.mimeType] || '#1f2937',
          }))}
          title="Media-type distribution"
          description={`${mediaTotal.toLocaleString()} total uploads in range`}
          badge={`${mediaEntries.length} types`}
          ariaLabel="Media-type distribution by upload count"
          centerHint="uploads"
          emptyTitle="No media types recorded yet"
          emptyDescription="Uploads will be broken down by media type here as they land."
          className="min-w-0"
        />

        <div className="min-w-0 space-y-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Top organizations by usage
            </p>
            <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
              {teamFilter === 'all'
                ? `${topOrgs.length} of ${topOrgs.length} ranked`
                : `${getTeamMeta(teamFilter).short} scoped`}
            </span>
          </div>
          <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} label="Team" />
          {teamFilter !== 'all' && topOrgs.length === 0 && (
            <p className="mt-3 rounded-xl border border-stone-light bg-white-warm px-4 py-3 text-xs text-charcoal-mid">
              No organization usage recorded for the {getTeamMeta(teamFilter).name} team yet.
            </p>
          )}
          <div className="mt-3">
            <DataTable
              columns={TOP_ORG_COLUMNS}
              rows={topOrgRows}
              keyField="id"
              emptyTitle="No organization usage recorded yet."
              emptyDescription="Organizations appear here as scans flow through the platform."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
