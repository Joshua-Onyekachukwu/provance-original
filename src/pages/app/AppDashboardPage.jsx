import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTeamScoping } from '../../lib/useTeamScoping.js'
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, StackedBarChart, StatCard, Tabs, TrendChart, useRegisterCommands, useToast } from '../../components/ui'
import DemoStateBanner from '../../components/app/DemoStateBanner.jsx'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import {
  VERDICT_CHART_SEGMENTS,
  VERDICT_META,
  formatDurationMs,
  formatFileSize,
  formatPct,
  formatRelativeTime,
  formatScanTimestamp,
  getTeamMeta,
  getVerdictMeta,
  hasActiveScanWork,
  queueNeedsPolling,
} from '../../components/app/scanPresentation.js'
import { scanQuotaPct } from '../../lib/scanQuota.js'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getActivityLogs,
  getAnalytics,
  getBilling,
  getNotifications,
  getQueueSnapshot,
  getReports,
  getSystemHealth,
  listScans,
} from '../../lib/api.js'
import { useDemoStateControl, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatAction(action) {
  return String(action || '')
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * ScanQuotaWarningChip — dashboard-level banner linking to Billing when the
 * workspace is at or above 85% of its monthly scan quota. Tones escalate:
 * 85–99% warning, 100%+ danger (exhausted).
 */
export function ScanQuotaWarningChip({ usage }) {
  const pct = scanQuotaPct(usage)
  if (pct == null || pct < 85) return null

  const exhausted = pct >= 100
  const tone = exhausted ? 'danger' : 'warning'
  const toneClasses = {
    warning: 'border-amber-300/60 bg-amber-50 text-amber-800',
    danger: 'border-rose-300/60 bg-rose-50 text-rose-800',
  }

  return (
    <Link
      to="/app/billing"
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors hover:brightness-[0.98] ${toneClasses[tone]}`}
    >
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      {exhausted
        ? 'Monthly scan quota exhausted — view billing'
        : `${pct}% of monthly scan quota used — view billing`}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function VerdictBadge({ scan }) {
  const { label, tone } = getVerdictMeta(scan)
  return <Badge tone={tone}>{label}</Badge>
}

function ConfidenceBar({ score }) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-light">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-charcoal-mid">{pct}%</span>
    </div>
  )
}

function MiniStat({ label, value, tone = 'default' }) {
  const accent = {
    default: 'border-l-stone-light',
    info: 'border-l-sky-400',
    success: 'border-l-emerald-400',
    warning: 'border-l-amber-400',
    danger: 'border-l-rose-400',
  }
  return (
    <div className={`rounded-2xl border border-stone-light bg-parchment px-4 py-4 border-l-[3px] ${accent[tone]}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-1.5 font-serif text-3xl tabular-nums text-charcoal">{value}</p>
    </div>
  )
}

function SystemStatusDot({ label, operational }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2 w-2 rounded-full ${operational ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span className="text-sm text-charcoal-mid">{label}</span>
      <span className={`ml-auto text-xs font-medium ${operational ? 'text-emerald-600' : 'text-rose-600'}`}>
        {operational ? 'Operational' : 'Degraded'}
      </span>
    </div>
  )
}

function NotificationPreviewRow({ notification }) {
  const categoryColors = {
    scan: 'bg-sky-500',
    system: 'bg-stone-400',
    team: 'bg-emerald-500',
    billing: 'bg-amber-500',
    security: 'bg-rose-500',
  }
  const dotColor = categoryColors[notification.category] || 'bg-stone-400'

  return (
    <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{notification.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-charcoal-mid">{notification.description}</p>
      </div>
      <time className="shrink-0 pt-0.5 text-xs tabular-nums whitespace-nowrap text-charcoal-light">
        {formatRelativeTime(notification.created_at)}
      </time>
    </div>
  )
}

const ACTIVITY_TYPE_COLORS = {
  scan: 'bg-emerald-500',
  user: 'bg-sky-500',
  waitlist_application: 'bg-amber-500',
  report: 'bg-violet-500',
  settings: 'bg-stone-400',
  team: 'bg-cyan-500',
  api_key: 'bg-rose-500',
  feature_flag: 'bg-amber-500',
  role: 'bg-sky-500',
  organization: 'bg-violet-500',
  invite: 'bg-emerald-500',
}

function ActivityFeedRow({ event }) {
  const dotColor = ACTIVITY_TYPE_COLORS[event.resource_type] || 'bg-stone-400'
  return (
    <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{formatAction(event.action)}</p>
        <p className="mt-0.5 truncate text-xs text-charcoal-mid">{event.actor_email}</p>
      </div>
      <time className="shrink-0 pt-0.5 text-xs tabular-nums whitespace-nowrap text-charcoal-light">
        {formatRelativeTime(event.created_at)}
      </time>
    </div>
  )
}

/**
 * FeedState — per-tab loading / error / empty presentation for the tabbed
 * workspace activity section (loading skeleton, retryable error, empty state).
 */
function FeedState({ status, error, onRetry, empty, emptyTitle, emptyDescription }) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label="Loading feed" className="space-y-4 py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-2 w-2 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (status === 'error') {
    return (
      <EmptyState
        variant="error"
        title="Could not load feed"
        description={error}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null
        }
        compact
      />
    )
  }
  if (empty) {
    return (
      <EmptyState variant="empty" title={emptyTitle} description={emptyDescription} compact />
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// Hero — greeting header (signature dark surface, primitives inside)
// ---------------------------------------------------------------------------

function DashboardHero({ profile, isTeam, greeting, lastActivity, reading, readingState, healthState, healthData, onRetry }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-charcoal/8 bg-charcoal text-parchment shadow-[0_30px_90px_rgba(26,26,26,0.12)]">
      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
              Workspace overview
            </p>
            <Badge tone={isTeam ? 'success' : 'info'} dot>
              {isTeam ? 'Team workspace' : 'Individual workspace'}
            </Badge>
          </div>

          <h2 className="mt-4 font-serif text-4xl leading-tight text-parchment sm:text-[3.5rem]">
            {greeting}, {profile?.displayName || 'Provance User'}.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment/72">
            Track active processing, completed reports, and risk signals before you move into
            uploads, reports, or admin operations.
          </p>
          {lastActivity && (
            <p className="mt-3 text-xs text-parchment/40">Last activity — {lastActivity}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              to="/app/uploads"
              iconLeft={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
                </svg>
              }
            >
              Start verification
            </Button>
            <Button
              variant="secondary"
              to="/app/reports"
              iconLeft={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.5h8L19 8v11.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V5a1.5 1.5 0 0 1 1.5-1.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 3.5V8H19M9 12.5h6M9 16h4" />
                </svg>
              }
            >
              View reports
            </Button>
            <Button
              variant="secondary"
              to="/app/history"
              iconLeft={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4" />
                </svg>
              }
            >
              Scan history
            </Button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
            System reading
          </p>
          <div className="mt-5 space-y-4">
            {readingState === 'loading' && (
              <div className="space-y-4" role="status" aria-label="Loading system reading">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-white/8 bg-white/5 px-4 py-4">
                    <div className="h-3 w-28 rounded bg-white/10" />
                    <div className="mt-3 h-3 w-48 rounded bg-white/8" />
                  </div>
                ))}
              </div>
            )}
            {readingState === 'error' && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4">
                <p className="text-sm font-medium text-rose-200">Feed unavailable</p>
                <p className="mt-2 text-sm leading-relaxed text-parchment/66">
                  The activity feed could not be reached. You can still use uploads and reports.
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="ui-focus-ring mt-3 rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-parchment transition hover:bg-white/12"
                >
                  Retry
                </button>
              </div>
            )}
            {readingState === 'ready' &&
              reading.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-parchment/70">{item.label}</p>
                    <p className="text-sm font-medium text-parchment">{item.value}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-parchment/66">{item.detail}</p>
                </div>
              ))}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-4">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${healthState === 'ready' && healthData?.api ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className="text-xs text-parchment/50">API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${healthState === 'ready' && healthData?.queue ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className="text-xs text-parchment/50">Queue</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Verification ledger
// ---------------------------------------------------------------------------

const LEDGER_COLUMNS = [
  {
    key: 'original_filename',
    header: 'File',
    sortable: true,
    width: '34%',
    render: (scan) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-charcoal">{scan.original_filename}</p>
        <p className="mt-0.5 text-xs text-charcoal-light">
          {formatFileSize(scan.file_size_bytes)} · {scan.processing_mode}
        </p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (scan) => scan.status,
    render: (scan) => <ScanStatusBadge status={scan.status} />,
  },
  {
    key: 'verdict',
    header: 'Verdict',
    render: (scan) => <VerdictBadge scan={scan} />,
  },
  {
    key: 'team_id',
    header: 'Team',
    render: (scan) => <TeamBadge teamId={scan.team_id} />,
  },
  {
    key: 'report_id',
    header: 'Report',
    render: (scan) => scan.result_payload?.report_id || '—',
  },
  {
    key: 'created_at',
    header: 'Updated',
    align: 'right',
    sortable: true,
    sortValue: (scan) => new Date(scan.completed_at || scan.created_at).getTime(),
    render: (scan) => formatScanTimestamp(scan.completed_at || scan.created_at),
  },
]

function LedgerPanel({ scans, onRetry, navigate, pageSize = 5, teamFilter, onTeamFilterChange, teamCounts }) {
  const filtered = useMemo(
    () =>
      teamFilter === 'all'
        ? scans.data || []
        : (scans.data || []).filter((scan) => scan.team_id === teamFilter),
    [scans.data, teamFilter],
  )
  const hasActiveFilter = teamFilter !== 'all'

  return (
    <Card
      eyebrow="Verification ledger"
      title="Latest verification activity"
      description="Your newest uploads — filename, status, verdict, team, and report ID before opening the full report."
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/reports')}>
          View all reports
        </Button>
      }
    >
      <TeamFilter counts={teamCounts} value={teamFilter} onChange={onTeamFilterChange} />
      <div className="mt-4">
        <DataTable
          columns={LEDGER_COLUMNS}
          rows={filtered}
          keyField="id"
          loading={scans.status === 'loading'}
          error={scans.status === 'error' ? scans.error : null}
          onRetry={onRetry}
          searchable
          searchPlaceholder="Search files…"
          searchKeys={['original_filename']}
          pagination
          pageSize={pageSize}
          onRowClick={(scan) => navigate(`/app/reports/${scan.id}`)}
          emptyTitle={hasActiveFilter ? 'No scans in this team' : 'No verifications yet'}
          emptyDescription={
            hasActiveFilter
              ? 'Try a different team — or clear the filter to see everything.'
              : 'Upload a media file to start the verification pipeline — results will appear here.'
          }
        />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Right column: queue, risk, system status
// ---------------------------------------------------------------------------

function QueuePosturePanel({ queue, teamFilter, teamQueue, onRetry }) {
  const data = queue.data
  // When a team filter is active the queue counts are recomputed from the
  // team-scoped scan list; otherwise the live queue snapshot is used.
  const isTeamScoped = Boolean(teamFilter && teamFilter !== 'all' && teamQueue)
  const queued = isTeamScoped ? teamQueue.queued : data?.queued ?? 0
  const processing = isTeamScoped ? teamQueue.processing : data?.processing ?? 0
  const failed = isTeamScoped ? teamQueue.failed : data?.failed ?? 0
  const avgDuration = isTeamScoped
    ? '—'
    : data
      ? formatDurationMs(data.avg_processing_time_ms)
      : '—'
  const backlog = queued > 5

  return (
    <Card
      eyebrow="Queue posture"
      title={isTeamScoped ? `Live queue · ${getTeamMeta(teamFilter).short}` : 'Live queue'}
      state={queue.status === 'loading' ? 'loading' : queue.status === 'error' ? 'error' : 'default'}
      loadingRows={4}
      errorDescription={queue.error}
      onRetry={onRetry}
    >
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Queued" value={queued} tone="info" />
        <MiniStat label="Processing" value={processing} tone="info" />
        <MiniStat label="Failed" value={failed} tone={failed > 0 ? 'danger' : 'default'} />
      </div>
      {isTeamScoped ? (
        <p className="mt-4 text-xs text-charcoal-light">
          Queue counts scoped to the {getTeamMeta(teamFilter).name} team from the scan ledger.
        </p>
      ) : backlog ? (
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-800">
          Backlog forming — {queued} items queued. Average processing time {avgDuration} per item.
        </p>
      ) : (
        <p className="mt-4 text-xs text-charcoal-light">
          Queue is healthy — average processing time {avgDuration} per item.
        </p>
      )}
    </Card>
  )
}

function RiskWatchPanel({ scans, onRetry, navigate }) {
  const flagged = useMemo(
    () =>
      (scans.data || []).filter(
        (scan) => scan.status === 'completed' && scan.verdict === 'suspicious',
      ),
    [scans.data],
  )
  const isEmpty = scans.status === 'ready' && flagged.length === 0

  return (
    <Card
      eyebrow="Risk watch"
      title="Flagged uploads"
      state={
        scans.status === 'loading' ? 'loading' : scans.status === 'error' ? 'error' : isEmpty ? 'empty' : 'default'
      }
      loadingRows={3}
      errorDescription={scans.error}
      onRetry={onRetry}
      emptyTitle="No flagged uploads"
      emptyDescription="Uploads with elevated risk will appear here for review before you share results."
    >
      <div className="space-y-3">
        {flagged.slice(0, 4).map((scan) => (
          <Link
            key={scan.id}
            to={`/app/reports/${scan.id}`}
            className="ui-focus-ring block rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3.5 transition hover:border-amber-200 hover:bg-amber-50"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-charcoal">{scan.original_filename}</p>
              <VerdictBadge scan={scan} />
            </div>
            <p className="mt-1.5 text-xs text-charcoal-mid">
              {scan.result_payload?.report_id || 'Report pending'} · {formatScanTimestamp(scan.created_at)}
            </p>
          </Link>
        ))}
        {flagged.length > 4 && (
          <button
            type="button"
            onClick={() => navigate('/app/reports')}
            className="ui-focus-ring w-full rounded-xl px-4 py-2 text-xs font-medium text-charcoal-mid transition hover:bg-parchment hover:text-charcoal"
          >
            View all {flagged.length} flagged uploads
          </button>
        )}
      </div>
    </Card>
  )
}

function SystemStatusPanel({ health, onRetry }) {
  const rows = health.data
    ? [
        { label: 'API', operational: health.data.api },
        { label: 'Database', operational: health.data.database },
        { label: 'Storage', operational: health.data.storage },
        { label: 'Queue', operational: health.data.queue },
        { label: 'Worker', operational: health.data.worker },
        { label: 'Email', operational: health.data.email },
      ]
    : []

  return (
    <Card
      eyebrow="System status"
      title="Infrastructure"
      state={health.status === 'loading' ? 'loading' : health.status === 'error' ? 'error' : 'default'}
      loadingRows={4}
      errorDescription={health.error}
      onRetry={onRetry}
    >
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <SystemStatusDot key={row.label} label={row.label} operational={row.operational} />
          ))}
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Workspace tabs — Triage vs History
// ---------------------------------------------------------------------------

/**
 * WorkspaceTabs — the primary workspace surface. Triage shows the Card-based
 * state panels (queue posture, risk watch, system status) for attention;
 * History shows the full scan ledger DataTable. Built on the Tabs primitive
 * with the same per-panel loading / error / empty behavior.
 */
function WorkspaceTabs({ scans, queue, health, navigate, teamFilter, onTeamFilterChange, teamCounts, teamQueue }) {
  const [activeTab, setActiveTab] = useState('triage')

  const items = [
    { value: 'triage', label: 'Triage' },
    { value: 'history', label: 'History' },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Workspace view
          </p>
          <h2 className="mt-2 font-serif text-2xl text-charcoal sm:text-3xl">
            Triage and history
          </h2>
        </div>
        <Tabs
          items={items}
          value={activeTab}
          onChange={setActiveTab}
          variant="pill"
          ariaLabel="Workspace view"
          id="workspace-triage-history"
        />
      </div>

      <div
        role="tabpanel"
        id="workspace-triage-history-panel-triage"
        aria-labelledby="workspace-triage-history-tab-triage"
        hidden={activeTab !== 'triage'}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RiskWatchPanel scans={scans} onRetry={scans.reload} navigate={navigate} />
          <div className="space-y-6">
            <QueuePosturePanel
              queue={queue}
              teamFilter={teamFilter}
              teamQueue={teamQueue}
              onRetry={queue.reload}
            />
            <SystemStatusPanel health={health} onRetry={health.reload} />
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id="workspace-triage-history-panel-history"
        aria-labelledby="workspace-triage-history-tab-history"
        hidden={activeTab !== 'history'}
      >
        <LedgerPanel
          scans={scans}
          onRetry={scans.reload}
          navigate={navigate}
          pageSize={8}
          teamFilter={teamFilter}
          onTeamFilterChange={onTeamFilterChange}
          teamCounts={teamCounts}
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Reports feed body (used inside the activity Tabs)
// ---------------------------------------------------------------------------

function ReportsFeedBody({ reports, onRetry }) {
  const list = reports.data || []

  return (
    <>
      <FeedState
        status={reports.status}
        error={reports.error}
        onRetry={onRetry}
        empty={reports.status === 'ready' && list.length === 0}
        emptyTitle="No reports yet"
        emptyDescription="Completed verifications will appear here as report packages ready to review or export."
      />
      {reports.status === 'ready' && list.length > 0 && (
        <div className="grid gap-4">
          {list.slice(0, 3).map((report) => (
            <Link
              key={report.id}
              to={`/app/reports/${report.scan_id}`}
              className="ui-focus-ring block rounded-2xl border border-stone-light bg-parchment p-4 transition hover:border-charcoal/25 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-charcoal">{report.report_id}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-charcoal-mid">
                    <span>{report.signals?.length || 0} signals analyzed</span>
                    <TeamBadge teamId={report.team_id} />
                    <span>{formatRelativeTime(report.created_at)}</span>
                  </p>
                </div>
                <Badge tone={VERDICT_META[report.verdict]?.tone || 'neutral'}>
                  {VERDICT_META[report.verdict]?.label || 'Inconclusive'}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-light">Confidence</p>
                <div className="mt-1.5">
                  <ConfidenceBar score={report.confidence_score} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function NotificationsFeedBody({ notifications, onRetry }) {
  const unread = (notifications.data || []).filter((n) => !n.read)

  return (
    <>
      <FeedState
        status={notifications.status}
        error={notifications.error}
        onRetry={onRetry}
        empty={notifications.status === 'ready' && unread.length === 0}
        emptyTitle="All caught up"
        emptyDescription="Scan completions, team activity, billing, and security alerts will appear here."
      />
      {notifications.status === 'ready' && unread.length > 0 && (
        <div className="divide-y divide-stone-light">
          {unread.slice(0, 4).map((notification) => (
            <NotificationPreviewRow key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Activity feed body (Tabs: Activity / Reports / Notifications)
// ---------------------------------------------------------------------------

function ActivityFeedBody({ activity, onRetry }) {
  const events = activity.data || []

  return (
    <>
      <FeedState
        status={activity.status}
        error={activity.error}
        onRetry={onRetry}
        empty={activity.status === 'ready' && events.length === 0}
        emptyTitle="No activity yet"
        emptyDescription="Scan submissions, report views, and workspace events will appear here."
      />
      {activity.status === 'ready' && events.length > 0 && (
        <div className="divide-y divide-stone-light">
          {events.slice(0, 6).map((event) => (
            <ActivityFeedRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  )
}

/**
 * ActivityTabsPanel — the tabbed workspace activity surface. Switches between
 * the live activity feed, recent reports, and notifications via the Tabs
 * primitive; each tab manages its own loading / error / empty state.
 */
function ActivityTabsPanel({ activity, reports, notifications, onRetryActivity, onRetryReports, onRetryNotifications }) {
  const [activeTab, setActiveTab] = useState('activity')

  const unreadCount = (notifications.data || []).filter((n) => !n.read).length

  const items = [
    { value: 'activity', label: 'Activity' },
    { value: 'reports', label: 'Recent reports' },
    {
      value: 'notifications',
      label: 'Notifications',
      badge: notifications.status === 'ready' && unreadCount > 0 ? unreadCount : undefined,
    },
  ]

  return (
    <Card
      eyebrow="Workspace activity"
      title="Live feed"
      description="Verification events, report outcomes, and alerts — switch tabs to focus a stream."
    >
      <Tabs
        items={items}
        value={activeTab}
        onChange={setActiveTab}
        variant="pill"
        ariaLabel="Workspace activity"
        id="workspace-activity"
      />
      <div className="mt-6">
        <div
          role="tabpanel"
          id="workspace-activity-panel-activity"
          aria-labelledby="workspace-activity-tab-activity"
          hidden={activeTab !== 'activity'}
        >
          <ActivityFeedBody activity={activity} onRetry={onRetryActivity} />
        </div>
        <div
          role="tabpanel"
          id="workspace-activity-panel-reports"
          aria-labelledby="workspace-activity-tab-reports"
          hidden={activeTab !== 'reports'}
        >
          <ReportsFeedBody reports={reports} onRetry={onRetryReports} />
        </div>
        <div
          role="tabpanel"
          id="workspace-activity-panel-notifications"
          aria-labelledby="workspace-activity-tab-notifications"
          hidden={activeTab !== 'notifications'}
        >
          <NotificationsFeedBody notifications={notifications} onRetry={onRetryNotifications} />
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AppDashboardPage() {
  const { profile, permissions, workspaceContext, setWorkspaceContext } = useAuth()
  const navigate = useNavigate()
  const { demoState, selectDemoState } = useDemoStateControl()
  const toast = useToast()

  // Live status polling: the scans ledger and queue posture refresh every 5s
  // while work is in flight (queued / processing), so worker-driven
  // queued → processing → complete transitions land without a reload. Polling
  // idles once the queue drains — see hasActiveScanWork / queueNeedsPolling.
  const scans = withDemoOverride(
    useResource(
      () => listScans({ pageSize: 100 }).then((r) => r.data || []),
      [],
      {
        pollMs: 5000,
        pollWhen: (state) => hasActiveScanWork(state.data),
      },
    ),
    demoState,
    { emptyData: [] },
  )
  const reports = withDemoOverride(
    useResource(() => getReports({ pageSize: 100 }).then((r) => r.data || [])),
    demoState,
    { emptyData: [] },
  )
  const notifications = withDemoOverride(
    useResource(() => getNotifications({ pageSize: 100 }).then((r) => r.data || [])),
    demoState,
    { emptyData: [] },
  )
  const queue = withDemoOverride(
    useResource(
      () => getQueueSnapshot(),
      [],
      {
        pollMs: 5000,
        pollWhen: (state) => queueNeedsPolling(state.data),
      },
    ),
    demoState,
    { emptyData: { queued: 0, processing: 0, failed: 0, avg_processing_time_ms: 0 } },
  )
  const health = withDemoOverride(useResource(() => getSystemHealth()), demoState, {
    emptyData: { api: true, database: true, storage: true, queue: true, worker: true, email: true },
  })
  // Billing usage (scansUsed/scansLimit) — same resolveUsage source of truth
  // as the Billing page and the initiateScan quota gate. Powers the ≥85%
  // quota warning chip without a second round-trip contract.
  const billing = withDemoOverride(useResource(() => getBilling()), demoState, {
    emptyData: { profile: { usage: { scansUsed: 0, scansLimit: 0 } } },
  })
  const analytics = withDemoOverride(useResource(() => getAnalytics()), demoState, {
    emptyData: { scans_today: 0, scans_7d: 0, completion_rate: 0, suspicious_rate: 0 },
  })
  const activity = withDemoOverride(
    useResource(() => getActivityLogs({ pageSize: 50 }).then((r) => r.data || [])),
    demoState,
    { emptyData: [] },
  )

  // ── Team scoping ───────────────────────────────────────────────────────
  // One shared filter drives the KPI row, queue posture, and ledger so a
  // team-scoped dashboard recomputes every metric from the scan ledger. The
  // selection is persisted to ?team= (URL-backed) so it survives navigation
  // and is shareable — see useTeamScoping.
  const {
    teamFilter,
    setTeamFilter,
    teamName,
    isTeamScoped,
    teamCounts,
    teamKpis,
    volumeTrend,
    kpi,
    kpiLoading,
    kpiError,
  } = useTeamScoping({ scans, analytics })

  // The volume trend chart is team-aware too: when a team filter is active
  // the 14-day series is recomputed from the ledger (useTeamScoping), and its
  // loading/error state tracks scans rather than the analytics endpoint.
  const trendData = isTeamScoped ? volumeTrend : analytics.data?.volume_trend || []

  const stats = useMemo(() => {
    const list = scans.data || []
    return {
      total: list.length,
      queued: list.filter((scan) => scan.status === 'queued').length,
      processing: list.filter((scan) => scan.status === 'processing').length,
      active: list.filter((scan) => ['queued', 'processing'].includes(scan.status)).length,
      complete: list.filter((scan) => scan.status === 'completed').length,
      failed: list.filter((scan) => scan.status === 'failed').length,
      suspicious: list.filter((scan) => scan.status === 'completed' && scan.verdict === 'suspicious').length,
      latest: list[0] || null,
    }
  }, [scans.data])

  const heroReading = useMemo(() => {
    if (scans.status !== 'ready') return []
    return [
      {
        label: 'Queue posture',
        value: stats.active === 0 ? 'Clear' : `${stats.active} active job${stats.active === 1 ? '' : 's'}`,
        detail:
          stats.active === 0
            ? 'No files are currently waiting in the live queue.'
            : `${stats.queued} queued and ${stats.processing} processing.`,
      },
      {
        label: 'Report coverage',
        value: `${stats.complete}/${stats.total || 0}`,
        detail:
          stats.complete > 0
            ? 'Completed uploads are available for report review.'
            : 'No completed report packages are available yet.',
      },
      {
        label: 'Risk watch',
        value: stats.suspicious > 0 ? `${stats.suspicious} flagged` : 'Stable',
        detail:
          stats.suspicious > 0
            ? 'Uploads with elevated risk should be reviewed before sharing results.'
            : 'No elevated-risk uploads are currently surfaced.',
      },
    ]
  }, [scans.status, stats])

  const isTeam = workspaceContext === 'team' || permissions?.team
  const lastActivity = stats.latest
    ? formatScanTimestamp(stats.latest.completed_at || stats.latest.created_at)
    : null

  // ── Page-scoped commands: appear in ⌘K while the dashboard is mounted ──
  const latestCompletedScan = useMemo(
    () =>
      (scans.data || []).find(
        (scan) => scan.status === 'completed' && scan.result_payload?.report_id,
      ) || null,
    [scans.data],
  )

  const dashboardCommands = useMemo(() => {
    const exportPdf = {
      id: 'dashboard-export-report',
      group: 'Dashboard',
      label: 'Export report PDF',
      hint: latestCompletedScan
        ? `Latest report — ${latestCompletedScan.original_filename}`
        : 'No completed report yet',
      keywords: ['pdf', 'export', 'download', 'report', 'print'],
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
        </svg>
      ),
      onSelect: () => {
        if (latestCompletedScan) {
          navigate(`/app/reports/${latestCompletedScan.id}/print`)
        } else {
          toast.info('No report to export', {
            description: 'Complete a verification to generate a printable report.',
          })
        }
      },
    }

    const toggleWorkspace = {
      id: 'action-workspace', // overrides the shell's same-id action while on the dashboard
      group: 'Dashboard',
      label:
        workspaceContext === 'team' ? 'Switch to individual workspace' : 'Switch to team workspace',
      hint: permissions.team ? 'Workspace context' : 'Requires team access',
      keywords: ['workspace', 'team', 'individual', 'context', 'toggle'],
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5v7M8.5 12h7" />
        </svg>
      ),
      onSelect: () => {
        if (!permissions.team) {
          toast.info('Team access required', {
            description: 'Your account needs team access to switch workspaces.',
          })
          return
        }
        const next = workspaceContext === 'team' ? 'individual' : 'team'
        setWorkspaceContext(next)
        toast.info(next === 'team' ? 'Team workspace' : 'Individual workspace', {
          description:
            next === 'team'
              ? 'Switched to the shared team workspace.'
              : 'Switched to your individual workspace.',
        })
      },
    }

    return [exportPdf, toggleWorkspace]
  }, [
    latestCompletedScan,
    workspaceContext,
    permissions.team,
    setWorkspaceContext,
    navigate,
    toast,
  ])

  useRegisterCommands(dashboardCommands, [dashboardCommands])

  return (
    <div className="space-y-8">
      {/* ── 1. Greeting header ─────────────────────────────────────────── */}
      <DashboardHero
        profile={profile}
        isTeam={isTeam}
        greeting={getTimeOfDayGreeting()}
        lastActivity={lastActivity}
        reading={heroReading}
        readingState={scans.status}
        healthState={health.status}
        healthData={health.data}
        onRetry={scans.reload}
      />

      {/* ── 1.5. Scan-quota warning (≥85% this cycle → Billing) ──────────── */}
      <ScanQuotaWarningChip usage={billing.data?.profile?.usage} />

      {/* ── 2. KPI StatCards (mockAnalytics-driven; team-scoped when filtered) ── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} />
          {teamFilter !== 'all' && (
            <Badge tone="info">Showing {teamName} data</Badge>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Scans Today"
            value={kpi ? String(kpi.scans_today ?? 0) : '—'}
            detail={
              teamFilter !== 'all'
                ? `Submitted in the last 24h · ${teamName}`
                : 'Submitted in the last 24h'
            }
            tone="info"
            loading={kpiLoading}
            error={kpiError}
          />
          <StatCard
            label="7-Day Volume"
            value={kpi ? String(kpi.scans_7d ?? 0) : '—'}
            detail={
              teamFilter !== 'all'
                ? `Total scans over the trailing week · ${teamName}`
                : 'Total scans over the trailing week'
            }
            tone="default"
            loading={kpiLoading}
            error={kpiError}
          />
          <StatCard
            label="Completion Rate"
            value={formatPct(kpi?.completion_rate)}
            detail={teamFilter !== 'all' ? `Of ${teamName} scans` : 'Of submitted scans'}
            tone="success"
            loading={kpiLoading}
            error={kpiError}
          />
          <StatCard
            label="Suspicious Rate"
            value={formatPct(kpi?.suspicious_rate)}
            detail={
              teamFilter !== 'all'
                ? `Elevated-risk share of ${teamName} scans`
                : 'Elevated-risk share of scans'
            }
            tone="warning"
            loading={kpiLoading}
            error={kpiError}
          />
        </div>
      </section>

      {/* ── 3. Scan volume trend ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Scan volume trend
            </p>
            <h2 className="mt-2 font-serif text-2xl text-charcoal sm:text-3xl">
              Verification volume
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isTeamScoped && teamName && <Badge tone="info">Team-scoped · {teamName}</Badge>}
            <Link
              to="/app/history"
              className="text-xs text-charcoal-mid hover:text-charcoal transition-colors focus-visible:ring-2 focus-visible:ring-charcoal rounded"
            >
              View scan history →
            </Link>
          </div>
        </div>

        {kpiLoading ? (
          <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <div className="mb-5 h-3 w-32 rounded bg-stone-light/60" />
            <div className="h-48 rounded-xl bg-stone-light/30" />
          </div>
        ) : kpiError ? (
          <div className="rounded-3xl border border-rose-100 bg-white-warm p-6 text-center shadow-sm">
            <p className="font-serif text-lg text-charcoal">Volume data unavailable</p>
            <p className="mt-1 text-sm text-charcoal-mid">
              {isTeamScoped ? scans.error : analytics.error}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={isTeamScoped ? scans.reload : analytics.reload}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TrendChart
              data={trendData}
              title="Scan volume trend"
              description={
                isTeamScoped && teamName
                  ? `Daily scan volume, completions, and failures across the ${teamName} team.`
                  : 'Daily scan volume, completions, and failures across your workspace.'
              }
              emptyTitle="No volume data yet"
              // NOTE: when a team is scoped the series is zero-filled (14
              // points), so the chart renders honest zeros instead of this
              // empty branch — the text below only applies to the global view.
              emptyDescription="Upload a media file to start the verification pipeline — volume will build here."
            />
            <StackedBarChart
              data={analytics.data?.verdict_trend || []}
              segments={VERDICT_CHART_SEGMENTS}
              title="Verdict mix"
              description="Completed scans split by outcome — authentic, suspicious, and inconclusive."
              ariaLabel="Daily verdict mix over the last 14 days"
              emptyTitle="No verdict data yet"
              emptyDescription="Completed verifications will split by verdict here as they land."
            />
          </div>
        )}
      </section>

      {/* ── 4. Workspace tabs: Triage vs History ──────────────────────── */}
      <WorkspaceTabs
        scans={scans}
        queue={queue}
        health={health}
        navigate={navigate}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
        teamCounts={teamCounts}
        teamQueue={teamKpis}
      />

      {/* ── 5. Workspace activity (Tabs: Activity / Reports / Notifications) ── */}
      <ActivityTabsPanel
        activity={activity}
        reports={reports}
        notifications={notifications}
        onRetryActivity={activity.reload}
        onRetryReports={reports.reload}
        onRetryNotifications={notifications.reload}
      />

      // Dev-only: force loading / empty / error for review & screenshots
  <DemoStateBanner demoState={demoState} onSelect={selectDemoState} />
    </div>
  )
}
