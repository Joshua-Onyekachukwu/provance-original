import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import StatCard from '../../components/admin/StatCard.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getVerdictLabel,
} from '../../components/app/scanPresentation.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { listScans } from '../../lib/api.js'

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

// ── Hero section (reused across states) ──────────────────────────────────────

function Hero({ displayName, isTeam, contextLine, lastActivity, showContextPill = true, children }) {
  return (
    <section className="rounded-[2rem] bg-charcoal px-6 py-8 text-parchment sm:px-10 sm:py-10">
      {showContextPill && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
            Workspace overview
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-parchment/15 bg-parchment/8 px-3 py-1 text-[11px] font-medium text-parchment/70">
            {isTeam ? 'Team' : 'Individual'}
          </span>
        </div>
      )}
      {!showContextPill && (
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
          Workspace overview
        </p>
      )}
      <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight sm:text-[3.35rem]">
        {getTimeOfDayGreeting()}, {displayName}.
      </h1>
      {contextLine && (
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment/72">
          {contextLine}
        </p>
      )}
      {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
      {lastActivity && (
        <p className="mt-6 text-xs text-parchment/36">
          Last activity &mdash; {lastActivity}
        </p>
      )}
    </section>
  )
}

// ── Quick action buttons ─────────────────────────────────────────────────────

function PrimaryAction({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl bg-parchment px-5 py-2.5 text-sm font-medium text-charcoal transition hover:bg-white-warm"
    >
      {children}
    </Link>
  )
}

function SecondaryAction({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl border border-parchment/25 bg-transparent px-5 py-2.5 text-sm font-medium text-parchment transition hover:border-parchment/40 hover:bg-white/8"
    >
      {children}
    </Link>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-charcoal px-6 py-8 sm:px-10 sm:py-10">
        <div className="h-4 w-40 animate-pulse rounded-xl bg-white/10" />
        <div className="mt-5 h-12 w-80 animate-pulse rounded-xl bg-white/8 sm:h-14 sm:w-96" />
        <div className="mt-4 h-4 w-64 animate-pulse rounded-xl bg-white/6" />
        <div className="mt-7 flex gap-3">
          <div className="h-11 w-36 animate-pulse rounded-xl bg-white/12" />
          <div className="h-11 w-32 animate-pulse rounded-xl bg-white/6" />
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl border border-stone-light bg-white-warm" />
        ))}
      </div>
      <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6">
        <div className="h-5 w-48 animate-pulse rounded-xl bg-stone-light/50" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mt-4 h-16 animate-pulse rounded-2xl border border-stone-light bg-parchment" />
        ))}
      </section>
    </div>
  )
}

// ── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ scan }) {
  const verdict = getVerdictLabel(scan)
  return (
    <Link
      to={`/app/reports/${scan.id}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-stone-light bg-parchment px-5 py-4 transition hover:border-charcoal/25 hover:shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{scan.original_filename}</p>
        <p className="mt-0.5 text-xs text-charcoal-mid">
          {verdict} &middot; {formatFileSize(scan.file_size_bytes)} &middot; {formatRelativeTime(scan.updated_at)}
        </p>
      </div>
      <div className="flex-shrink-0">
        <ScanStatusBadge status={scan.status} />
      </div>
    </Link>
  )
}

// ── Main page component ──────────────────────────────────────────────────────

export default function AppDashboardPage() {
  const { profile, permissions, workspaceContext } = useAuth()
  const [scanState, setScanState] = useState({ status: 'loading', scans: [], error: '' })

  useEffect(() => {
    let isCancelled = false
    async function loadScans() {
      try {
        const response = await listScans()
        if (isCancelled) return
        setScanState({ status: 'ready', scans: response.scans || [], error: '' })
      } catch (error) {
        if (isCancelled) return
        setScanState({ status: 'error', scans: [], error: error.message || 'Failed to load dashboard activity.' })
      }
    }
    void loadScans()
    return () => { isCancelled = true }
  }, [])

  const stats = useMemo(() => {
    const scans = scanState.scans
    return {
      active: scans.filter((s) => ['queued', 'processing'].includes(s.status)).length,
      complete: scans.filter((s) => s.status === 'complete').length,
      flagged: scans.filter((s) => getVerdictLabel(s) === 'Suspicious').length,
      latest: scans[0] || null,
    }
  }, [scanState.scans])

  const displayName = profile?.displayName || 'Provance User'
  const isTeam = workspaceContext === 'team' || permissions?.team
  const lastActivity = stats.latest?.updated_at ? formatScanTimestamp(stats.latest.updated_at) : null

  const readyCount = stats.complete > 0 ? stats.complete : null
  const contextLine = (() => {
    if (readyCount != null && stats.active === 0) {
      return `${readyCount} report${readyCount === 1 ? '' : 's'} ready for review. Queue is clear.`
    }
    if (readyCount != null && stats.active > 0) {
      return `${readyCount} report${readyCount === 1 ? '' : 's'} ready. ${stats.active} scan${stats.active === 1 ? '' : 's'} in progress.`
    }
    if (readyCount == null && stats.active > 0) {
      return `${stats.active} scan${stats.active === 1 ? '' : 's'} in progress. No reports ready yet.`
    }
    return 'Queue is clear. No reports ready yet.'
  })()

  // ── Loading ──────────────────────────────────────────────────────────────
  if (scanState.status === 'loading') return <DashboardSkeleton />

  // ── Error (no scans at all) ──────────────────────────────────────────────
  if (scanState.status === 'error' && scanState.scans.length === 0) {
    return (
      <div className="space-y-8">
        <Hero displayName={displayName} isTeam={isTeam} showContextPill={false}
          contextLine="We couldn't load your latest activity. Open the upload workspace to start a new scan while the feed recovers.">
          <PrimaryAction to="/app/uploads">Upload &amp; Verify <Arrow /></PrimaryAction>
          <SecondaryAction to="/app/reports">View Reports</SecondaryAction>
        </Hero>
        <section className="rounded-[2rem] border border-rose-100 bg-white-warm p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-rose-700">Error</span>
          <h2 className="mt-4 font-serif text-2xl text-charcoal">Dashboard activity could not be loaded</h2>
          <p className="mt-3 max-w-2xl text-sm text-charcoal-mid">{scanState.error}</p>
          <button type="button" onClick={() => window.location.reload()}
            className="mt-6 inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft">
            Retry
          </button>
        </section>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (scanState.status === 'ready' && scanState.scans.length === 0) {
    return (
      <div className="space-y-8">
        <Hero displayName={displayName} isTeam={isTeam} contextLine="Queue is clear. No reports ready yet.">
          <PrimaryAction to="/app/uploads">Upload &amp; Verify <Arrow /></PrimaryAction>
          <SecondaryAction to="/app/reports">View Reports</SecondaryAction>
        </Hero>
        <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-stone-light px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal">Empty</span>
          <h2 className="mt-4 font-serif text-2xl text-charcoal">Start your first verification</h2>
          <p className="mt-3 max-w-2xl text-sm text-charcoal-mid">
            Upload a media file to begin the verification pipeline. Once processing completes, your dashboard will surface activity, stats, and report outcomes.
          </p>
          <Link to="/app/uploads"
            className="mt-6 inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft">
            Start first scan
          </Link>
        </section>
      </div>
    )
  }

  // ── Populated dashboard ──────────────────────────────────────────────────
  const latestScans = scanState.scans.slice(0, 5)

  return (
    <div className="space-y-8">
      <Hero displayName={displayName} isTeam={isTeam} contextLine={contextLine} lastActivity={lastActivity}>
        <PrimaryAction to="/app/uploads">Upload &amp; Verify <Arrow /></PrimaryAction>
        <SecondaryAction to="/app/reports">View Reports</SecondaryAction>
      </Hero>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active" value={String(stats.active)} detail="Queued &amp; processing" tone="info" />
        <StatCard label="Completed" value={String(stats.complete)} detail="Reports ready to review" tone="success" />
        <StatCard label="Flagged" value={String(stats.flagged)} detail="Merit closer review" tone="warning" />
      </section>

      <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Activity</p>
            <h2 className="mt-2 font-serif text-2xl text-charcoal">Latest scans</h2>
          </div>
          <Link to="/app/reports" className="text-sm font-medium text-charcoal transition hover:text-charcoal-soft">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {latestScans.map((scan) => <ActivityRow key={scan.id} scan={scan} />)}
        </div>
      </section>

      <footer className="text-center text-xs text-charcoal-light/60">
        API operational &bull; Queue healthy &bull; Storage 3.2/10 GB
      </footer>
    </div>
  )
}

// ── Tiny inline arrow ────────────────────────────────────────────────────────

function Arrow() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}
