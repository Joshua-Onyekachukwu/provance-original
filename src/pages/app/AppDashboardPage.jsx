import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getVerdictLabel,
} from '../../components/app/scanPresentation.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { listScans } from '../../lib/api.js'

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-white-warm p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-3 font-serif text-4xl text-charcoal">{value}</p>
      <p className="mt-2 text-sm text-charcoal-mid">{detail}</p>
    </div>
  )
}

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

  const stats = useMemo(() => {
    const scans = scanState.scans
    return {
      total: scans.length,
      active: scans.filter((scan) => ['queued', 'processing'].includes(scan.status)).length,
      complete: scans.filter((scan) => scan.status === 'complete').length,
      latest: scans[0] || null,
    }
  }, [scanState.scans])

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Welcome back
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          {profile?.displayName || 'Provance User'}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          This first signed-in workspace gives approved users a stable landing point,
          core navigation, and clear state handling while uploads, reports, and team
          workflows continue to come online.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Workspace"
            value={workspaceContext === 'team' ? 'Team' : 'Individual'}
            detail="Context-aware navigation is live and saved between sessions."
          />
          <StatCard
            label="Active queue"
            value={scanState.status === 'loading' ? '...' : String(stats.active)}
            detail="Queued and processing cases now surface directly in the dashboard."
          />
          <StatCard
            label="Completed cases"
            value={scanState.status === 'loading' ? '...' : String(stats.complete)}
            detail="Completed scans are ready to review in the reports workspace."
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {scanState.status === 'loading' && (
          <AppStatePanel
            label="Loading"
            title="Loading recent cases"
            description="Fetching the latest verification cases so the dashboard can surface queue activity and recent report outcomes."
            variant="loading"
          />
        )}

        {scanState.status === 'error' && (
          <AppStatePanel
            label="Error"
            title="Dashboard activity could not be loaded"
            description={scanState.error}
            variant="error"
            action={
              <Link
                to="/app/uploads"
                className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
              >
                Open upload workspace
              </Link>
            }
          />
        )}

        {scanState.status === 'ready' && scanState.scans.length === 0 && (
          <AppStatePanel
            label="Empty"
            title="No uploads have been started yet"
            description="The workflow is live. Start a scan to create your first case, then return here to monitor queue activity and open the resulting report."
            action={
              <Link
                to="/app/uploads"
                className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
              >
                Start first scan
              </Link>
            }
          />
        )}

        {scanState.status === 'ready' && scanState.scans.length > 0 && (
          <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Recent cases
                </p>
                <h3 className="mt-3 font-serif text-2xl text-charcoal">
                  Latest verification activity
                </h3>
              </div>
              <Link
                to="/app/reports"
                className="text-sm font-medium text-charcoal transition hover:text-charcoal-soft"
              >
                View all reports
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {scanState.scans.slice(0, 4).map((scan) => (
                <Link
                  key={scan.id}
                  to={`/app/reports/${scan.id}`}
                  className="block rounded-2xl border border-stone-light bg-parchment px-4 py-4 transition hover:border-charcoal/35"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{scan.original_filename}</p>
                      <p className="mt-1 text-xs text-charcoal-mid">
                        {formatFileSize(scan.file_size_bytes)}. {formatScanTimestamp(scan.created_at)}
                      </p>
                    </div>
                    <ScanStatusBadge status={scan.status} />
                  </div>
                  <p className="mt-3 text-sm text-charcoal-mid">
                    Verdict: <span className="font-medium text-charcoal">{getVerdictLabel(scan)}</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <AppStatePanel
          label="Success"
          title="Access is active and protected"
          description="Your session is restored on refresh, protected routes are enforced, and dashboard activity now reflects live scan records."
          variant="success"
        />

        <AppStatePanel
          label="Loading"
          title="Async workflow states are active"
          description="Uploads, queued jobs, processing status, and report history now follow the same state-driven product surfaces instead of relying on placeholder messaging."
          variant="loading"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3">
            <div className="h-5 w-5 rounded-full border-2 border-sky-200 border-t-sky-600 animate-spin" />
            <p className="text-sm text-sky-700">
              Preparing the next verification workspace state.
            </p>
          </div>
        </AppStatePanel>

        <AppStatePanel
          label="Workspace"
          title={permissions.team ? 'Team access is enabled' : 'Team access stays gated'}
          description={
            permissions.team
              ? 'This account can move into team-aware workflows once shared case review ships.'
              : 'The current MVP remains individual-first. Team routes stay locked until organization workflows are implemented.'
          }
          variant={permissions.team ? 'success' : 'empty'}
        >
          {stats.latest ? (
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Latest case
              </p>
              <p className="mt-2 text-sm font-medium text-charcoal">
                {stats.latest.original_filename}
              </p>
              <p className="mt-1 text-sm text-charcoal-mid">
                Updated {formatScanTimestamp(stats.latest.updated_at)}
              </p>
            </div>
          ) : null}
        </AppStatePanel>
      </section>
    </div>
  )
}
