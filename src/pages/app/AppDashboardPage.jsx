import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import StatCard from '../../components/admin/StatCard.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getVerdictLabel,
} from '../../components/app/scanPresentation.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { listScans } from '../../lib/api.js'
import {
  mockReports,
  mockNotifications,
  mockQueueSnapshot,
  mockSystemHealth,
} from '../../lib/mockData.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(isoString).toLocaleDateString()
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VerificationRow({ scan, index }) {
  return (
    <Link
      to={`/app/reports/${scan.id}`}
      className="grid gap-4 rounded-3xl border border-stone-light bg-white-warm px-5 py-5 transition hover:border-charcoal/25 hover:shadow-sm lg:grid-cols-[64px_minmax(0,1.3fr)_160px_160px_180px]"
    >
      <div className="flex items-center gap-4 lg:block">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Item
        </p>
        <p className="mt-1 font-serif text-3xl text-charcoal lg:mt-3">
          {String(index + 1).padStart(2, '0')}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{scan.original_filename}</p>
        <p className="mt-1 text-sm text-charcoal-mid">
          {formatFileSize(scan.file_size_bytes)}. Created {formatScanTimestamp(scan.created_at)}
        </p>
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Verdict
        </p>
        <p className="mt-2 text-sm font-medium text-charcoal">{getVerdictLabel(scan)}</p>
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Report ID
        </p>
        <p className="mt-2 text-sm font-medium text-charcoal">
          {scan.result_payload?.report?.report_id || 'Pending'}
        </p>
      </div>
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Status
          </p>
          <div className="mt-2">
            <ScanStatusBadge status={scan.status} />
          </div>
        </div>
        <p className="text-xs text-charcoal-mid lg:mt-3">
          Updated {formatScanTimestamp(scan.updated_at)}
        </p>
      </div>
    </Link>
  )
}

function QuickActionCard({ icon, label, description, iconColor, to }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg transition group-hover:scale-110 ${iconColor}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-parchment">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-parchment/58">{description}</p>
      </div>
    </Link>
  )
}

function MiniConfidenceBar({ score }) {
  const pct = Math.max(0, Math.min(100, score))
  const color =
    pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'

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

function ReportCard({ report }) {
  const verdictMeta = {
    authentic: { badge: 'bg-emerald-50 text-emerald-700', label: 'Authentic' },
    suspicious: { badge: 'bg-amber-50 text-amber-700', label: 'Suspicious' },
    inconclusive: { badge: 'bg-sky-50 text-sky-700', label: 'Inconclusive' },
  }
  const meta = verdictMeta[report.verdict] || verdictMeta.inconclusive

  return (
    <Link
      to={`/app/reports/${report.id}`}
      className="block rounded-2xl border border-stone-light bg-parchment p-4 transition hover:border-charcoal/25 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal">{report.report_id}</p>
          <p className="mt-0.5 text-xs text-charcoal-mid">
            {report.signals?.length || 0} signals analyzed
          </p>
        </div>
        <span
          className={`inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-light">Confidence</p>
        <div className="mt-1.5">
          <MiniConfidenceBar score={report.confidence_score} />
        </div>
      </div>
      <p className="mt-3 text-xs text-charcoal-light">
        {formatRelativeTime(report.created_at)}
      </p>
    </Link>
  )
}

function NotificationPreviewRow({ notification }) {
  const categoryColors = {
    scan: 'bg-sky-400',
    system: 'bg-charcoal-mid',
    team: 'bg-emerald-400',
    billing: 'bg-amber-400',
    security: 'bg-rose-400',
  }
  const dotColor = categoryColors[notification.category] || 'bg-stone'

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="relative flex-shrink-0 pt-1.5">
        {!notification.read && (
          <span className={`block h-2 w-2 rounded-full ${dotColor}`} />
        )}
        {notification.read && <span className="block h-2 w-2 rounded-full bg-stone-light" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal">{notification.title}</p>
        <p className="mt-0.5 text-xs text-charcoal-mid line-clamp-1">
          {notification.description}
        </p>
      </div>
      <time className="flex-shrink-0 pt-0.5 text-xs text-charcoal-light tabular-nums whitespace-nowrap">
        {formatRelativeTime(notification.created_at)}
      </time>
    </div>
  )
}

function StorageUsageBar({ usedGB = 3.2, limitGB = 10 }) {
  const pct = Math.min(100, Math.round((usedGB / limitGB) * 100))
  const barColor =
    pct >= 80 ? 'bg-rose-400' : pct >= 60 ? 'bg-amber-400' : 'bg-charcoal'

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-charcoal-mid">
          {usedGB.toFixed(1)} GB of {limitGB} GB used
        </p>
        <p className="text-xs font-medium tabular-nums text-charcoal">{pct}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-light">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SystemStatusDot({ label, operational }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`block h-1.5 w-1.5 rounded-full ${
          operational ? 'bg-emerald-400' : 'bg-rose-400'
        }`}
      />
      <span className="text-xs text-charcoal-mid">{label}</span>
    </div>
  )
}

// ── Dashboard page skeleton ──────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <section className="rounded-[2rem] bg-charcoal px-6 py-6 sm:px-8 sm:py-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded-xl bg-white/10" />
            <div className="h-10 w-72 animate-pulse rounded-xl bg-white/8 sm:h-14 sm:w-96" />
            <div className="h-4 w-80 animate-pulse rounded-xl bg-white/6" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/6" />
              ))}
            </div>
          </div>
          <div className="h-48 animate-pulse rounded-[1.75rem] bg-white/5" />
        </div>
      </section>

      {/* StatCards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-white-warm border border-stone-light" />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded-xl bg-stone-light/50" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-white-warm border border-stone-light" />
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[2rem] bg-white-warm border border-stone-light" />
          ))}
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-6 w-36 animate-pulse rounded-xl bg-stone-light/50" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-white-warm border border-stone-light" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-44 animate-pulse rounded-xl bg-stone-light/50" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-white-warm border border-stone-light" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page component ──────────────────────────────────────────────────────

export default function AppDashboardPage() {
  const { profile, permissions, workspaceContext } = useAuth()
  const [scanState, setScanState] = useState({
    status: 'loading',
    scans: [],
    error: '',
  })
  useEffect(() => {
    let isCancelled = false

    async function loadScans() {
      try {
        const response = await listScans()

        if (isCancelled) return
        setScanState({
          status: 'ready',
          scans: response.scans || [],
          error: '',
        })
      } catch (error) {
        if (isCancelled) return
        setScanState({
          status: 'error',
          scans: [],
          error: error.message || 'Failed to load dashboard activity.',
        })
      }
    }

    void loadScans()

    return () => {
      isCancelled = true
    }
  }, [])

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const scans = scanState.scans
    const failed = scans.filter((scan) => scan.status === 'failed').length
    const queued = scans.filter((scan) => scan.status === 'queued').length
    const processing = scans.filter((scan) => scan.status === 'processing').length
    const suspicious = scans.filter((scan) => getVerdictLabel(scan) === 'Suspicious').length
    return {
      total: scans.length,
      active: scans.filter((scan) => ['queued', 'processing'].includes(scan.status)).length,
      complete: scans.filter((scan) => scan.status === 'complete').length,
      failed,
      queued,
      processing,
      suspicious,
      latest: scans[0] || null,
    }
  }, [scanState.scans])

  // ── System reading rows ──────────────────────────────────────────────────
  const readiness = useMemo(() => {
    if (scanState.status !== 'ready') {
      return []
    }

    return [
      {
        label: 'Queue posture',
        value:
          stats.active === 0
            ? 'Clear'
            : `${stats.active} active job${stats.active === 1 ? '' : 's'}`,
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
            ? 'Uploads with elevated risk should be reviewed before you share results.'
            : 'No elevated-risk uploads are currently surfaced in the latest results.',
      },
    ]
  }, [scanState.status, stats])

  // ── Static mock data for new sections ────────────────────────────────────
  const recentReports = useMemo(() => mockReports.slice(0, 3), [])
  const recentNotifications = useMemo(
    () =>
      mockNotifications
        .filter((n) => !n.read)
        .slice(0, 3),
    [],
  )

  // ── Hero panel data ──────────────────────────────────────────────────────
  const heroPanel = (() => {
    if (scanState.status === 'loading') {
      return {
        label: 'System reading',
        rows: [
          {
            label: 'Queue posture',
            value: 'Loading',
            detail: 'The dashboard is loading the latest verification activity and queue state now.',
          },
          {
            label: 'Report coverage',
            value: 'Loading',
            detail: 'Completed report coverage will appear here as soon as the feed responds.',
          },
        ],
      }
    }

    if (scanState.status === 'error') {
      return {
        label: 'System reading',
        rows: [
          {
            label: 'Feed status',
            value: 'Offline',
            detail: scanState.error,
          },
          {
            label: 'Next action',
            value: 'Use uploads',
            detail:
              'You can continue in the upload workspace while the dashboard feed recovers.',
          },
        ],
      }
    }

    return {
      label: 'System reading',
      rows: readiness,
    }
  })()

  const greeting = getTimeOfDayGreeting()
  const displayName = profile?.displayName || 'Provance User'
  const isTeam = workspaceContext === 'team' || permissions?.team
  const lastActivity =
    stats.latest?.updated_at
      ? `${formatScanTimestamp(stats.latest.updated_at)}`
      : null

  // ── Loading state ────────────────────────────────────────────────────────
  if (scanState.status === 'loading') {
    return <DashboardSkeleton />
  }

  // ── Full error state ─────────────────────────────────────────────────────
  if (scanState.status === 'error' && scanState.scans.length === 0) {
    return (
      <div className="space-y-8">
        {/* Hero still visible in error state */}
        <section className="rounded-[2rem] border border-charcoal/8 bg-charcoal px-6 py-6 text-parchment shadow-[0_30px_90px_rgba(26,26,26,0.12)] sm:px-8 sm:py-7">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                Workspace overview
              </p>
              <h2 className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-parchment sm:text-[3.75rem]">
                {greeting}, {displayName}.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment/72">
                Your verification workspace is ready, but we couldn&apos;t load the latest
                activity. Open the upload workspace to start a new scan while the feed recovers.
              </p>
              <div className="mt-6">
                <Link
                  to="/app/uploads"
                  className="inline-flex items-center gap-2 rounded-xl bg-parchment px-5 py-3 text-sm font-medium text-charcoal transition hover:bg-white-warm"
                >
                  Start verification
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
                </Link>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                {heroPanel.label}
              </p>
              <div className="mt-5 space-y-4">
                {heroPanel.rows.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-parchment/70">{item.label}</p>
                      <p className="text-sm font-medium text-parchment">{item.value}</p>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-parchment/66">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <AppStatePanel
          label="Error"
          title="Dashboard activity could not be loaded"
          description={scanState.error}
          variant="error"
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
            >
              Retry
            </button>
          }
        />
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  const isEmpty = scanState.status === 'ready' && scanState.scans.length === 0

  if (isEmpty) {
    return (
      <div className="space-y-8">
        {/* Hero with empty context */}
        <section className="rounded-[2rem] border border-charcoal/8 bg-charcoal px-6 py-6 text-parchment shadow-[0_30px_90px_rgba(26,26,26,0.12)] sm:px-8 sm:py-7">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                  Workspace overview
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-parchment/15 bg-parchment/8 px-3 py-1 text-[11px] font-medium text-parchment/70">
                  {isTeam ? 'Team workspace' : 'Individual workspace'}
                </span>
              </div>
              <h2 className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-parchment sm:text-[3.75rem]">
                {greeting}, {displayName}.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment/72">
                Your verification workspace is live and ready. Upload your first media file
                to start the verification pipeline and unlock the full dashboard experience.
              </p>

              {/* Quick action cards */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                    </svg>
                  }
                  label="Start verification"
                  description="Upload media and begin a new authenticity scan"
                  iconColor="text-emerald-300"
                  to="/app/uploads"
                />
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  }
                  label="View reports"
                  description="Access your report library and results"
                  iconColor="text-sky-300"
                  to="/app/reports"
                />
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  }
                  label="View history"
                  description="Review past scans and activity timeline"
                  iconColor="text-amber-300"
                  to="/app/reports"
                />
              </div>
            </div>

            {/* System Reading panel */}
            <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                System reading
              </p>
              <div className="mt-5 space-y-4">
                {[
                  { label: 'Queue posture', value: 'Clear', detail: 'No files queued — ready for intake.' },
                  { label: 'Report coverage', value: '0/0', detail: 'Completed reports will appear after first scan.' },
                  { label: 'Risk watch', value: 'Stable', detail: 'No suspicious activity detected.' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-parchment/70">{item.label}</p>
                      <p className="text-sm font-medium text-parchment">{item.value}</p>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-parchment/66">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-parchment/50">API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-parchment/50">Queue</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AppStatePanel
          label="Empty"
          title="Start your first verification"
          description="Upload a media file to begin the verification pipeline. Once processing completes, your dashboard will surface queue activity, report outcomes, and workspace stats."
          variant="empty"
          action={
            <Link
              to="/app/uploads"
              className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
            >
              Start first scan
            </Link>
          }
        />
      </div>
    )
  }

  // ── Full populated dashboard ─────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── 1. Hero Panel ────────────────────────────────────────────────── */}
      <section className="rounded-[2rem] border border-charcoal/8 bg-charcoal px-6 py-6 text-parchment shadow-[0_30px_90px_rgba(26,26,26,0.12)] sm:px-8 sm:py-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            {/* Eyebrow + context pill */}
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
                Workspace overview
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-parchment/15 bg-parchment/8 px-3 py-1 text-[11px] font-medium text-parchment/70">
                {isTeam ? 'Team workspace' : 'Individual workspace'}
              </span>
            </div>

            {/* Greeting with trust mark */}
            <div className="mt-3 flex items-start gap-4">
              <h2 className="max-w-4xl font-serif text-4xl leading-tight text-parchment sm:text-[3.75rem]">
                {greeting}, {displayName}.
              </h2>
              {/* Trust mark SVG — subtle geometric emblem */}
              <svg
                className="mt-2 hidden h-8 w-8 flex-shrink-0 text-parchment/20 sm:block"
                viewBox="0 0 32 32"
                fill="none"
              >
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1" />
                <path
                  d="M10 16.5L14 20.5L22 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              </svg>
            </div>

            <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment/72">
              Track active processing, completed reports, and recent verification outcomes
              before you move into uploads, reports, or admin operations.
            </p>

            {/* Last activity timestamp */}
            {lastActivity && (
              <p className="mt-3 text-xs text-parchment/40">
                Last activity &mdash; {lastActivity}
              </p>
            )}

            {/* Quick action cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <QuickActionCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                  </svg>
                }
                label="Start verification"
                description="Upload media and begin a new scan"
                iconColor="text-emerald-300"
                to="/app/uploads"
              />
              <QuickActionCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                }
                label="View reports"
                description="Open your report library"
                iconColor="text-sky-300"
                to="/app/reports"
              />
              <QuickActionCard
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                }
                label="View history"
                description="Review past activity"
                iconColor="text-amber-300"
                to="/app/reports"
              />
            </div>
          </div>

          {/* System Reading panel (glass-morphism) */}
          <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
              {heroPanel.label}
            </p>
            <div className="mt-5 space-y-4">
              {heroPanel.rows.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-parchment/70">{item.label}</p>
                    <p className="text-sm font-medium text-parchment">{item.value}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-parchment/66">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
            {/* API + Queue status dots */}
            <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-parchment/50">API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-parchment/50">Queue</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. StatCard Grid ──────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Workspace"
          value={isTeam ? 'Team' : 'Individual'}
          detail="Current working context for this session"
          tone="default"
        />
        <StatCard
          label="Queue"
          value={String(stats.active)}
          detail={`${stats.queued} queued, ${stats.processing} processing`}
          tone="info"
        />
        <StatCard
          label="Completed"
          value={String(stats.complete)}
          detail="Reports ready to review or export"
          tone="success"
        />
        <StatCard
          label="Flagged"
          value={String(stats.suspicious)}
          detail="Uploads that merit closer review"
          tone="warning"
        />
      </section>

      {/* ── 3 + 6. Recent Scans + Right Column ────────────────────────────── */}
      <section className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        {/* ── 3. Recent Scans (Verification Ledger) ──────────────────────── */}
        <section className="rounded-[2rem] border border-stone-light bg-parchment p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Verification ledger
              </p>
              <h3 className="mt-3 font-serif text-3xl text-charcoal">
                Latest verification activity
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-charcoal-mid">
                Condensed view of your newest uploads — filename, verdict, report ID, and
                queue status before opening the full report.
              </p>
            </div>
            <Link
              to="/app/reports"
              className="inline-flex rounded-xl border border-stone-light bg-white-warm px-4 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal/35"
            >
              View all reports
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {scanState.scans.slice(0, 5).map((scan, index) => (
              <VerificationRow key={scan.id} scan={scan} index={index} />
            ))}
          </div>
        </section>

        {/* ── 6. Right Column Stack ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Workspace Notes */}
          <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Workspace notes
            </p>
            <h3 className="mt-3 font-serif text-3xl text-charcoal">
              Current platform status
            </h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-sm font-medium text-charcoal">Authenticated access</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                  Session refresh is active. Protected routes reflect the current user
                  permission model without forcing repeated sign-in loops.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-sm font-medium text-charcoal">Collaboration status</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                  {permissions.team
                    ? 'Team access is available for this account. Shared review workflows remain the next major expansion.'
                    : 'This workspace stays individual-first until the organization layer is opened.'}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-sm font-medium text-charcoal">Latest activity</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                  {stats.latest
                    ? `${stats.latest.original_filename} last changed ${formatScanTimestamp(stats.latest.updated_at)}.`
                    : 'No recent upload activity is available yet.'}
                </p>
              </div>
            </div>
          </section>

          {/* Queue Posture */}
          <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Queue posture
            </p>
            <h3 className="mt-3 font-serif text-2xl text-charcoal">Live queue</h3>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/72 px-4 py-4">
                <p className="text-xs text-charcoal-mid">Queued</p>
                <p className="mt-1 font-serif text-2xl text-charcoal">{mockQueueSnapshot.queued}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/72 px-4 py-4">
                <p className="text-xs text-charcoal-mid">Processing</p>
                <p className="mt-1 font-serif text-2xl text-charcoal">{mockQueueSnapshot.processing}</p>
              </div>
            </div>
            {mockQueueSnapshot.queued > 5 && (
              <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-800">
                Backlog forming — {mockQueueSnapshot.queued} items queued. Average processing time:{' '}
                {(mockQueueSnapshot.avg_processing_time_ms / 1000).toFixed(1)}s per item.
              </p>
            )}
            {mockQueueSnapshot.queued <= 5 && (
              <p className="mt-4 text-xs text-charcoal-light">
                Queue is healthy — average processing time{' '}
                {(mockQueueSnapshot.avg_processing_time_ms / 1000).toFixed(1)}s per item.
              </p>
            )}
          </section>

          {/* Storage Usage */}
          <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Storage
            </p>
            <h3 className="mt-3 font-serif text-2xl text-charcoal">Usage</h3>
            <div className="mt-5">
              <StorageUsageBar usedGB={3.2} limitGB={10} />
            </div>
            <p className="mt-3 text-xs text-charcoal-light">
              Free tier includes 10 GB storage. Contact support about plan upgrades.
            </p>
          </section>

          {/* System Status */}
          <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              System status
            </p>
            <h3 className="mt-3 font-serif text-2xl text-charcoal">Infrastructure</h3>
            <div className="mt-5 space-y-3">
              <SystemStatusDot label="API" operational={mockSystemHealth.api} />
              <SystemStatusDot label="Database" operational={mockSystemHealth.database} />
              <SystemStatusDot label="Storage" operational={mockSystemHealth.storage} />
              <SystemStatusDot label="Queue" operational={mockSystemHealth.queue} />
              <SystemStatusDot label="Worker" operational={mockSystemHealth.worker} />
              <SystemStatusDot label="Email" operational={mockSystemHealth.email} />
            </div>
          </section>
        </div>
      </section>

      {/* ── 7 + 8. Recent Reports + Notifications Preview ─────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* ── 7. Recent Reports ──────────────────────────────────────────── */}
        <section className="rounded-[2rem] border border-stone-light bg-parchment p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Recent reports
              </p>
              <h3 className="mt-3 font-serif text-2xl text-charcoal">Latest outcomes</h3>
            </div>
            <Link
              to="/app/reports"
              className="text-sm font-medium text-charcoal transition hover:text-charcoal-soft"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {recentReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>

        {/* ── 8. Notifications Preview ───────────────────────────────────── */}
        <section className="rounded-[2rem] border border-stone-light bg-parchment p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Notifications
              </p>
              <h3 className="mt-3 font-serif text-2xl text-charcoal">Recent alerts</h3>
            </div>
            <div className="flex items-center gap-2">
              {recentNotifications.length > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[10px] font-medium text-parchment">
                  {recentNotifications.length}
                </span>
              )}
            </div>
          </div>
          <div className="mt-5 divide-y divide-stone-light">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((n) => (
                <NotificationPreviewRow key={n.id} notification={n} />
              ))
            ) : (
              <p className="py-4 text-sm text-charcoal-mid">All caught up — no unread notifications.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}
