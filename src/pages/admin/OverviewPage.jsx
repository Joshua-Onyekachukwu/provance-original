import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useMockData from '../../lib/useMockData.js'
import {
  getAdminDashboard,
  getQueueSnapshot,
  getSystemHealth,
  getAuditLogs,
} from '../../lib/api.js'
import { mockAnalytics } from '../../lib/mockData.js'
import { formatPct, formatTimeShort } from '../../components/app/scanPresentation.js'
import { Button, StatCard, TrendChart, useRegisterCommands } from '../../components/ui/index.js'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import AttentionCard from '../../components/admin/AttentionCard.jsx'
import ActivityRow from '../../components/admin/ActivityRow.jsx'
import AdminOverviewSkeleton from '../../components/admin/AdminOverviewSkeleton.jsx'
import QueueSnapshotPanel from '../../components/admin/QueueSnapshotPanel.jsx'
import SystemHealthPanel from '../../components/admin/SystemHealthPanel.jsx'

// Map boolean health values → status strings
function mapHealthStatus(value, service) {
  if (service === 'email') return 'not_configured'
  if (value === true) return 'operational'
  return 'unreachable'
}

// Format rate as percentage string
// Derive worker status from queue health
function deriveWorkerStatus(queueHealth) {
  if (queueHealth === false) return 'stopped'
  return 'running'
}

export default function OverviewPage() {
  const navigate = useNavigate()

  // ── Data fetching (parallel, independent) ──────────────────────────────────
  const {
    data: dashboardData,
    loading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis,
  } = useMockData(getAdminDashboard)

  const {
    data: queueRaw,
    loading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useMockData(getQueueSnapshot)

  const {
    data: healthRaw,
    loading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useMockData(getSystemHealth)

  const {
    data: auditData,
    loading: auditLoading,
    error: auditError,
    refetch: refetchAudit,
  } = useMockData(() => getAuditLogs({ page: 1, pageSize: 20 }))

  // ── Activity pagination ──────────────────────────────────────────────────
  const [activityPage, setActivityPage] = useState(1)
  const [allEvents, setAllEvents] = useState([])

  const events = useMemo(() => {
    if (!auditData?.data) return []
    const merged = activityPage === 1
      ? auditData.data
      : [...allEvents, ...auditData.data]
    return merged
  }, [auditData, activityPage])

  const hasMore = auditData ? auditData.total > events.length : false

  const handleShowMore = useCallback(async () => {
    const nextPage = activityPage + 1
    setAllEvents(events)
    setActivityPage(nextPage)
    // Re-fetch with next page — we append results
    const result = await getAuditLogs({ page: nextPage, pageSize: 20 })
    if (result?.data) {
      setAllEvents((prev) => [...prev, ...result.data])
    }
  }, [activityPage, events])

  // ── Derived data ──────────────────────────────────────────────────────────
  const isAnyLoading = kpisLoading || queueLoading || healthLoading || auditLoading
  const allFailed = kpisError && queueError && healthError && auditError
  const allLoaded = !isAnyLoading && dashboardData && queueRaw && healthRaw && auditData

  // KPI values
  const kpis = useMemo(() => {
    const d = dashboardData?.kpis || {}
    return {
      activeUsers: d.totalUsers ?? 0,
      newUsersThisWeek: d.activeUsers7d ?? 0,
      scansToday: d.scansToday ?? 0,
      scansLast7Days: mockAnalytics?.scans_7d ?? 0,
      completionRate: d.completionRate != null ? d.completionRate : 0,
      failureRate: mockAnalytics?.failure_rate ?? 0,
      suspiciousRate: mockAnalytics?.suspicious_rate ?? 0,
    }
  }, [dashboardData])

  // Determine if data is truly empty (all KPIs zero)
  const isEmpty = useMemo(() => {
    if (!dashboardData) return false
    return (
      kpis.activeUsers === 0 &&
      kpis.newUsersThisWeek === 0 &&
      kpis.scansToday === 0 &&
      kpis.scansLast7Days === 0
    )
  }, [kpis, dashboardData])

  // ── Page-scoped commands (must precede any conditional return) ──────────────
  useRegisterCommands(
    [
      {
        id: 'admin.go-waitlist',
        group: 'Admin',
        label: 'Open waitlist management',
        hint: 'Review and approve applications',
        keywords: ['admin', 'waitlist', 'approve'],
        onSelect: () => navigate('/app/admin/waitlist'),
      },
      {
        id: 'admin.go-users',
        group: 'Admin',
        label: 'Open user administration',
        hint: 'Manage accounts and roles',
        keywords: ['admin', 'users', 'roles', 'accounts'],
        onSelect: () => navigate('/app/admin/users'),
      },
    ],
    [navigate],
  )

  // Needs Attention
  const needsAttention = useMemo(() => {
    const s = dashboardData?.summary || {}
    return {
      failedScans: queueRaw?.failed ?? 0,
      suspiciousScans: Math.round((mockAnalytics?.suspicious_rate || 0) * (kpis.scansToday || 47)),
      pendingReviews: s.pendingReview ?? 0,
      inviteIssues: s.invitesPending ?? 0,
    }
  }, [dashboardData, queueRaw, kpis])

  const allAttentionClear = useMemo(
    () =>
      needsAttention.failedScans === 0 &&
      needsAttention.suspiciousScans === 0 &&
      needsAttention.pendingReviews === 0 &&
      needsAttention.inviteIssues === 0,
    [needsAttention],
  )

  // Queue data with worker status derived
  const queueData = useMemo(() => {
    if (!queueRaw) return null
    return {
      ...queueRaw,
      workerStatus: deriveWorkerStatus(healthRaw?.queue),
      avgProcessingTimeMs: queueRaw.avg_processing_time_ms ?? queueRaw.avgProcessingTimeMs ?? 0,
    }
  }, [queueRaw, healthRaw])

  // Health data mapped to status strings
  const healthData = useMemo(() => {
    if (!healthRaw) return null
    return {
      api: mapHealthStatus(healthRaw.api, 'api'),
      database: mapHealthStatus(healthRaw.database, 'database'),
      storage: mapHealthStatus(healthRaw.storage, 'storage'),
      queue: mapHealthStatus(healthRaw.queue, 'queue'),
      email: mapHealthStatus(healthRaw.email, 'email'),
      lastCheckedAt: healthRaw.lastCheckedAt || new Date().toISOString(),
    }
  }, [healthRaw])

  // System status for context badge
  const systemStatus = useMemo(() => {
    if (!healthData) return 'unknown'
    const critical = ['api', 'database']
    const hasDown = critical.some((s) => healthData[s] === 'unreachable')
    if (hasDown) return 'down'
    const hasDegraded = Object.values(healthData).some((v) => v === 'degraded')
    if (hasDegraded) return 'degraded'
    return 'active'
  }, [healthData])

  const systemStatusConfig = {
    active: { dot: 'bg-emerald-500', label: 'System Active', cls: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
    degraded: { dot: 'bg-amber-500', label: 'Degraded', cls: 'border-amber-100 bg-amber-50 text-amber-700' },
    down: { dot: 'bg-rose-500', label: 'Down', cls: 'border-rose-100 bg-rose-50 text-rose-700' },
    unknown: { dot: 'bg-stone-400', label: 'Unknown', cls: 'border-stone-light bg-stone-50 text-charcoal-mid' },
  }
  const statusCfg = systemStatusConfig[systemStatus]

  const lastUpdatedStr = formatTimeShort(new Date())

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (isAnyLoading && !dashboardData && !queueRaw && !healthRaw && !auditData) {
    return <AdminOverviewSkeleton />
  }

  // ── Render: Full Error ─────────────────────────────────────────────────────
  if (allFailed) {
    return (
      <AppStatePanel
        label="Error"
        title="Unable to load admin dashboard"
        description={kpisError || 'The dashboard data could not be retrieved. The API may be temporarily unavailable.'}
        variant="error"
        action={
          <Button
            onClick={() => { refetchKpis(); refetchQueue(); refetchHealth(); refetchAudit() }}
          >
            Retry
          </Button>
        }
      />
    )
  }

  // ── Render: Empty ──────────────────────────────────────────────────────────
  if (isEmpty && allLoaded) {
    return (
      <AppStatePanel
        label="Ready"
        title="Admin workspace is ready"
        description="The administration control room is active. As users, scans, and waitlist applications flow through the platform, metrics will populate here automatically."
        variant="empty"
      >
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Waitlist', to: '/app/admin/waitlist', desc: 'Review and manage access applications' },
            { label: 'Users', to: '/app/admin/users', desc: 'Manage user accounts and roles' },
            { label: 'Jobs', to: '/app/admin/jobs', desc: 'Monitor verification job queue' },
            { label: 'Audit Logs', to: '/app/admin/audit-logs', desc: 'Review system activity records' },
          ].map((mod) => (
            <Link
              key={mod.label}
              to={mod.to}
              className="rounded-xl border border-stone-light bg-white-warm px-4 py-3 transition hover:border-charcoal/35 focus-visible:ring-2 focus-visible:ring-charcoal"
            >
              <p className="text-sm font-medium text-charcoal">{mod.label}</p>
              <p className="mt-1 text-xs text-charcoal-mid">{mod.desc}</p>
            </Link>
          ))}
        </div>
      </AppStatePanel>
    )
  }

  // ── Render: Populated (with possible partial errors) ───────────────────────
  return (
    <div className="space-y-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Admin Overview"
        title="Platform command surface"
        description="A live summary of queue posture, system health, waitlist pressure, and the signals that need operator attention first."
        meta={[
          { label: statusCfg.label },
          { label: `Last updated ${lastUpdatedStr}` },
          { label: 'Source: live waitlist + operational telemetry' },
        ]}
      />

      {/* ── Section 1: Platform KPIs ──────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Platform metrics
          </p>
          <span className="inline-flex rounded-full bg-stone-light/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-charcoal-mid">
            Last 24h
          </span>
        </div>

        {kpisError ? (
          <div className="rounded-3xl border border-rose-100 bg-white-warm p-6 shadow-sm">
            <p className="text-sm font-medium text-rose-700">KPI data unavailable</p>
            <p className="mt-1 text-sm text-charcoal-mid">{kpisError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={refetchKpis}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              size="sm" tone="default"
              label="Active Users"
              value={kpis.activeUsers.toLocaleString()}
              detail="Currently registered accounts"
              trend={{ direction: 'up', value: '12%' }}
            />
            <StatCard
              size="sm" tone="default"
              label="New Users"
              value={String(kpis.newUsersThisWeek)}
              detail="New this week"
            />
            <StatCard
              size="sm" tone="info"
              label="Scans Today"
              value={String(kpis.scansToday)}
              detail="Submitted in last 24h"
            />
            <StatCard
              size="sm" tone="info"
              label="Scans 7-Day"
              value={kpis.scansLast7Days.toLocaleString()}
              detail="Weekly volume"
            />
            <StatCard
              size="sm" tone="success"
              label="Completion Rate"
              value={formatPct(kpis.completionRate, 1)}
              detail="Of submitted scans"
              trend={{ direction: 'up', value: '1.3%' }}
            />
            <StatCard
              size="sm" tone="warning"
              label="Fail / Suspicious"
              value={`${formatPct(kpis.failureRate, 1)} / ${formatPct(kpis.suspiciousRate, 1)}`}
              detail="Failure and suspicious rates"
            />
          </div>
        )}
      </section>

      {/* ── Section 2: Scan Volume Trend ──────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Scan volume trend
          </p>
          <Link
            to="/app/admin/analytics"
            className="text-xs text-charcoal-mid hover:text-charcoal transition-colors focus-visible:ring-2 focus-visible:ring-charcoal rounded"
          >
            Open analytics →
          </Link>
        </div>
        <TrendChart
          data={mockAnalytics?.volume_trend || []}
          title="Scan volume trend"
          description="Daily scan volume, completions, and failures across the platform."
          emptyTitle="No volume data yet"
          emptyDescription="Scan volume will populate here as verifications flow through the platform."
        />
      </section>

      {/* ── Section 3: Queue Snapshot + System Health ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QueueSnapshotPanel
          data={queueData}
          error={queueError}
          onRetry={refetchQueue}
          linkTo="/app/admin/jobs"
        />
        <SystemHealthPanel
          healthData={healthData}
          error={healthError}
          onRefresh={refetchHealth}
        />
      </div>

      {/* ── Section 4: Needs Attention ────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light mb-5">
          Needs attention
        </p>

        {allAttentionClear ? (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-6 text-center shadow-sm">
            <div className="flex justify-center mb-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xl">
                ✓
              </span>
            </div>
            <p className="font-serif text-xl text-charcoal">
              All systems operational
            </p>
            <p className="mt-2 text-sm text-charcoal-mid max-w-md mx-auto">
              Nothing needs attention — no failed scans, no suspicious results,
              no pending reviews, and no invite issues.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <AttentionCard
              icon="⚠"
              label="Failed Scans"
              count={needsAttention.failedScans}
              tone="danger"
              linkTo="/app/admin/jobs?status=failed"
            />
            <AttentionCard
              icon="🔍"
              label="Suspicious Scans"
              count={needsAttention.suspiciousScans}
              tone="warning"
              linkTo="/app/admin/jobs?verdict=suspicious"
            />
            <AttentionCard
              icon="📋"
              label="Pending Reviews"
              count={needsAttention.pendingReviews}
              tone="info"
              linkTo="/app/admin/waitlist?status=waitlist_submitted"
            />
            <AttentionCard
              icon="📨"
              label="Invite Issues"
              count={needsAttention.inviteIssues}
              tone="default"
              linkTo="/app/admin/users?has_pending_invites=true"
            />
          </div>
        )}
      </section>

      {/* ── Section 5: Recent Activity ────────────────────────────────────── */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="flex items-end justify-between mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Recent activity
          </p>
          <Link
            to="/app/admin/audit-logs"
            className="text-xs text-charcoal-mid hover:text-charcoal transition-colors focus-visible:ring-2 focus-visible:ring-charcoal rounded"
          >
            View all →
          </Link>
        </div>

        {auditError ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-rose-700">Activity feed unavailable</p>
            <p className="mt-1 text-sm text-charcoal-mid">{auditError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={refetchAudit}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-serif text-lg text-charcoal">No recent admin activity</p>
            <p className="mt-1 text-sm text-charcoal-mid">
              Audit events will appear here as actions are taken.
            </p>
            <Link
              to="/app/admin/audit-logs"
              className="mt-3 inline-flex text-sm text-charcoal-mid hover:text-charcoal transition-colors"
            >
              View full audit log →
            </Link>
          </div>
        ) : (
          <>
            <ol className="divide-y divide-stone-light/50" aria-label="Recent admin activity">
              {events.map((event) => (
                <li key={event.id}>
                  <ActivityRow event={event} />
                </li>
              ))}
            </ol>

            {hasMore && (
              <Button
                variant="secondary"
                fullWidth
                onClick={handleShowMore}
                className="mt-4"
                aria-label={`Show more activity events, ${auditData.total - events.length} remaining`}
              >
                Show more ({auditData.total - events.length} remaining) →
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
