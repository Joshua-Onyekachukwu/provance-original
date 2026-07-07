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

function StatCard({ label, value, detail, tone = 'default' }) {
  const toneClasses = {
    default: 'border-stone-light bg-white-warm',
    active: 'border-sky-100 bg-sky-50/72',
    success: 'border-emerald-100 bg-emerald-50/72',
    warning: 'border-amber-200 bg-amber-50/82',
  }

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone] || toneClasses.default}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">{label}</p>
      <p className="mt-3 font-serif text-4xl text-charcoal">{value}</p>
      <p className="mt-2 text-sm text-charcoal-soft">{detail}</p>
    </div>
  )
}

function CaseLedgerRow({ scan, index }) {
  return (
    <Link
      to={`/app/reports/${scan.id}`}
      className="grid gap-4 rounded-3xl border border-stone-light bg-white-warm px-5 py-5 transition hover:border-charcoal/25 hover:shadow-sm lg:grid-cols-[64px_minmax(0,1.3fr)_160px_160px_180px]"
    >
      <div className="flex items-center gap-4 lg:block">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Case
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
            ? 'No scans are currently waiting in the live queue.'
            : `${stats.queued} queued and ${stats.processing} processing.`,
      },
      {
        label: 'Report coverage',
        value: `${stats.complete}/${stats.total || 0}`,
        detail:
          stats.complete > 0
            ? 'Completed cases are available for structured report review.'
            : 'No completed report packages are available yet.',
      },
      {
        label: 'Review pressure',
        value: stats.suspicious > 0 ? `${stats.suspicious} flagged` : 'Stable',
        detail:
          stats.suspicious > 0
            ? 'Suspicious verdicts should be escalated into manual review.'
            : 'No suspicious verdicts are currently surfaced in the latest case set.',
      },
    ]
  }, [scanState.status, stats])

  const latestSignals = stats.latest?.result_payload?.signals || []
  const heroPanel = (() => {
    if (scanState.status === 'loading') {
      return {
        label: 'System reading',
        rows: [
          {
            label: 'Queue posture',
            value: 'Loading',
            detail: 'The dashboard is loading the latest scan ledger and queue state now.',
          },
          {
            label: 'Report coverage',
            value: 'Loading',
            detail: 'Completed case coverage will appear here as soon as the feed responds.',
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
            label: 'Operator action',
            value: 'Use uploads',
            detail:
              'You can continue into the upload workspace while the dashboard feed is recovering.',
          },
        ],
      }
    }

    return {
      label: 'System reading',
      rows: readiness,
    }
  })()

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-charcoal/8 bg-charcoal px-6 py-6 text-parchment shadow-[0_30px_90px_rgba(26,26,26,0.12)] sm:px-8 sm:py-7">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-parchment/48">
              Analyst overview
            </p>
            <h2 className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-parchment sm:text-[3.35rem]">
              {profile?.displayName || 'Provance Operator'}, the verification ledger is live.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-parchment/72">
              The dashboard now acts as a forensic command surface. It highlights active
              queue pressure, recent case readiness, and the current review posture before
              you drop into uploads, reports, or admin operations.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Workspace"
                value={workspaceContext === 'team' ? 'Team' : 'Individual'}
                detail="The current working context saved for this session."
              />
              <StatCard
                label="Queue"
                value={scanState.status === 'loading' ? '...' : String(stats.active)}
                detail="Active cases currently queued or processing."
                tone="active"
              />
              <StatCard
                label="Completed"
                value={scanState.status === 'loading' ? '...' : String(stats.complete)}
                detail="Cases ready for structured report review."
                tone="success"
              />
              <StatCard
                label="Flagged"
                value={scanState.status === 'loading' ? '...' : String(stats.suspicious)}
                detail="Recent cases with suspicious verdict posture."
                tone="warning"
              />
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

      <section className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
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
          <section className="rounded-[2rem] border border-stone-light bg-parchment p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                  Verification ledger
                </p>
                <h3 className="mt-3 font-serif text-3xl text-charcoal">
                  Latest analyst-ready cases
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-charcoal-mid">
                  This ledger condenses the newest cases into one review surface so an
                  operator can scan filename, verdict, report identity, and queue status
                  before opening the full report.
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
                <CaseLedgerRow key={scan.id} scan={scan} index={index} />
              ))}
            </div>
          </section>
        )}

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Analyst notes
            </p>
            <h3 className="mt-3 font-serif text-3xl text-charcoal">
              Current working posture
            </h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-sm font-medium text-charcoal">Authenticated access</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                  Session refresh is active and protected routes now reflect the current user
                  permission model without forcing repeated sign-in loops.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-sm font-medium text-charcoal">Team posture</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                  {permissions.team
                    ? 'Team access is available for this operator. Collaboration workflows remain the next major expansion.'
                    : 'This workspace stays individual-first until the Phase 7 organization layer is opened.'}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-sm font-medium text-charcoal">Latest case heartbeat</p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
                  {stats.latest
                    ? `${stats.latest.original_filename} last changed ${formatScanTimestamp(stats.latest.updated_at)}.`
                    : 'No case heartbeat is available yet.'}
                </p>
              </div>
            </div>
          </section>

          {stats.latest ? (
            <section className="rounded-[2rem] border border-stone-light bg-white-warm p-6 shadow-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Latest evidence package
              </p>
              <h3 className="mt-3 font-serif text-3xl text-charcoal">
                Current case signal readout
              </h3>
              <div className="mt-5 grid gap-3">
                {latestSignals.length > 0 ? (
                  latestSignals.slice(0, 4).map((signal) => (
                    <div
                      key={signal.signal_id}
                      className="rounded-2xl border border-stone-light bg-parchment px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-charcoal">
                            {signal.signal_display_name}
                          </p>
                          <p className="mt-1 text-xs text-charcoal-mid">
                            {signal.signal_category}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-charcoal">
                          {Number.isFinite(signal.score)
                            ? `${Math.round(signal.score * 100)}%`
                            : 'Pending'}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                        {signal.status_reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <AppStatePanel
                    label="Pending"
                    title="No signal package is available yet"
                    description="This card will summarize the latest signal outputs once the newest case finishes processing."
                  />
                )}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  )
}
