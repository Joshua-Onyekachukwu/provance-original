import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getVerdictLabel,
} from '../../components/app/scanPresentation.js'
import { getScan, listScans } from '../../lib/api.js'

function ReportMetaItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-2 text-sm text-charcoal">{value}</p>
    </div>
  )
}

export default function AppReportsPage() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const [scansState, setScansState] = useState({
    status: 'loading',
    scans: [],
    error: '',
  })
  const [detailState, setDetailState] = useState({
    status: 'idle',
    scan: null,
    error: '',
  })

  useEffect(() => {
    let isCancelled = false

    async function loadScans() {
      try {
        const response = await listScans()

        if (isCancelled) return
        setScansState({
          status: 'ready',
          scans: response.scans || [],
          error: '',
        })
      } catch (error) {
        if (isCancelled) return
        setScansState({
          status: 'error',
          scans: [],
          error: error.message || 'Failed to load reports.',
        })
      }
    }

    void loadScans()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!scanId) {
      setDetailState({
        status: 'idle',
        scan: null,
        error: '',
      })
      return
    }

    let isCancelled = false
    setDetailState({
      status: 'loading',
      scan: null,
      error: '',
    })

    async function loadDetail() {
      try {
        const response = await getScan(scanId)
        if (isCancelled) return
        setDetailState({
          status: 'ready',
          scan: response.scan,
          error: '',
        })
      } catch (error) {
        if (isCancelled) return
        setDetailState({
          status: 'error',
          scan: null,
          error: error.message || 'Failed to load report detail.',
        })
      }
    }

    void loadDetail()

    return () => {
      isCancelled = true
    }
  }, [scanId])

  const summary = useMemo(() => {
    const scans = scansState.scans
    return {
      total: scans.length,
      completed: scans.filter((scan) => scan.status === 'complete').length,
      active: scans.filter((scan) => ['queued', 'processing'].includes(scan.status)).length,
      failed: scans.filter((scan) => scan.status === 'failed').length,
    }
  }, [scansState.scans])

  const selectedScan = detailState.scan
  const selectedVerdict = selectedScan?.result_payload?.verdict
  const selectedSignals = selectedScan?.result_payload?.signals || []

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Reports
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Case history and report review
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Uploaded media now lands in a report workspace where operators can review case
          status, open completed verdict payloads, and track the queue as the workflow
          matures.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <ReportMetaItem label="Total cases" value={String(summary.total)} />
          <ReportMetaItem label="Completed" value={String(summary.completed)} />
          <ReportMetaItem label="In progress" value={String(summary.active)} />
          <ReportMetaItem label="Failed" value={String(summary.failed)} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Case list
              </p>
              <h3 className="mt-2 font-serif text-2xl text-charcoal">All scans</h3>
            </div>
            <Link
              to="/app/uploads"
              className="text-sm font-medium text-charcoal transition hover:text-charcoal-soft"
            >
              New upload
            </Link>
          </div>

          {scansState.status === 'loading' && (
            <div className="mt-6">
              <AppStatePanel
                label="Loading"
                title="Loading case history"
                description="Fetching uploaded cases and report-ready records."
                variant="loading"
              />
            </div>
          )}

          {scansState.status === 'error' && (
            <div className="mt-6">
              <AppStatePanel
                label="Error"
                title="Report list could not be loaded"
                description={scansState.error}
                variant="error"
              />
            </div>
          )}

          {scansState.status === 'ready' && scansState.scans.length === 0 && (
            <div className="mt-6">
              <AppStatePanel
                label="Empty"
                title="No reports are available yet"
                description="Start a scan in the upload workspace and the resulting case will appear here."
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
          )}

          {scansState.status === 'ready' && scansState.scans.length > 0 && (
            <div className="mt-6 space-y-4">
              {scansState.scans.map((scan) => {
                const isActive = scan.id === scanId

                return (
                  <button
                    key={scan.id}
                    type="button"
                    onClick={() => navigate(`/app/reports/${scan.id}`)}
                    className={`block w-full rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-charcoal bg-parchment'
                        : 'border-stone-light bg-parchment hover:border-charcoal/35'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{scan.original_filename}</p>
                        <p className="mt-1 text-xs text-charcoal-mid">
                          {formatScanTimestamp(scan.created_at)}
                        </p>
                      </div>
                      <ScanStatusBadge status={scan.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-charcoal-mid">
                      <span>{formatFileSize(scan.file_size_bytes)}</span>
                      <span>{scan.mime_type}</span>
                      <span>Verdict: {getVerdictLabel(scan)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {!scanId && (
          <AppStatePanel
            label="Ready"
            title="Choose a case to review"
            description="Select a scan from the case list to inspect verdict details, metadata, and the current report payload."
          />
        )}

        {scanId && detailState.status === 'loading' && (
          <AppStatePanel
            label="Loading"
            title="Loading report detail"
            description="Fetching the latest case payload and status details."
            variant="loading"
          />
        )}

        {scanId && detailState.status === 'error' && (
          <AppStatePanel
            label="Error"
            title="Report detail could not be loaded"
            description={detailState.error}
            variant="error"
          />
        )}

        {scanId && detailState.status === 'ready' && selectedScan && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                    Report detail
                  </p>
                  <h3 className="mt-2 font-serif text-3xl text-charcoal">
                    {selectedScan.original_filename}
                  </h3>
                </div>
                <ScanStatusBadge status={selectedScan.status} />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <ReportMetaItem label="Scan ID" value={selectedScan.id} />
                <ReportMetaItem label="Uploaded" value={formatScanTimestamp(selectedScan.created_at)} />
                <ReportMetaItem label="Last updated" value={formatScanTimestamp(selectedScan.updated_at)} />
                <ReportMetaItem
                  label="File details"
                  value={`${formatFileSize(selectedScan.file_size_bytes)}. ${selectedScan.mime_type}`}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Verdict
              </p>
              <h3 className="mt-3 font-serif text-3xl text-charcoal">
                {selectedVerdict?.display_label || 'Pending'}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                {selectedVerdict?.plain_language_summary ||
                  selectedScan.failure_reason ||
                  'This case has not produced a verdict payload yet.'}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <ReportMetaItem
                  label="Confidence"
                  value={
                    Number.isFinite(selectedVerdict?.confidence_score)
                      ? `${Math.round(selectedVerdict.confidence_score * 100)}%`
                      : 'Pending'
                  }
                />
                <ReportMetaItem
                  label="Confidence level"
                  value={selectedVerdict?.confidence_level || 'Pending'}
                />
                <ReportMetaItem
                  label="Signals completed"
                  value={
                    Number.isFinite(selectedVerdict?.signal_count_completed)
                      ? `${selectedVerdict.signal_count_completed}/${selectedVerdict.signal_count_total || 0}`
                      : String(selectedSignals.length)
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Signals
              </p>
              <h3 className="mt-3 font-serif text-2xl text-charcoal">Evidence pipeline</h3>
              {selectedSignals.length === 0 ? (
                <p className="mt-4 text-sm text-charcoal-mid">
                  No signal detail is available for this case yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {selectedSignals.map((signal) => (
                    <div
                      key={signal.signal_id}
                      className="rounded-2xl border border-stone-light bg-parchment px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-charcoal">
                            {signal.signal_display_name}
                          </p>
                          <p className="mt-1 text-xs text-charcoal-mid">
                            {signal.signal_category}. Methodology {signal.methodology_version}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                          {signal.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-charcoal-mid">
                        {signal.status_reason || 'No status reason provided.'}
                      </p>
                      {signal.findings?.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {signal.findings.map((finding) => (
                            <div
                              key={finding.finding_id}
                              className="rounded-2xl border border-stone-light bg-white-warm px-4 py-3"
                            >
                              <p className="text-sm font-medium text-charcoal">{finding.label}</p>
                              <p className="mt-1 text-sm text-charcoal-mid">
                                {finding.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
