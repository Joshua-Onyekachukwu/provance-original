import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTeamScoping } from '../../lib/useTeamScoping.js'
import { Button, EmptyState, LivePollIndicator, Skeleton, useRegisterCommands, useToast } from '../../components/ui'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import {
  formatFileSize,
  formatPct,
  formatScanTimestamp,
  getVerdictLabel,
  hasActiveScanWork,
  scanNeedsPolling,
} from '../../components/app/scanPresentation.js'
import { getScan, listScans, USE_MOCK } from '../../lib/api.js'
import { downloadReportPdf } from '../../lib/reportPdfDownload.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

function ReportMetaItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      {/* break-words: real backend ids (scan UUIDs, report ids) are unbroken
          strings that would blow the meta card wider than the viewport. */}
      <p className="mt-2 break-words text-sm text-charcoal">{value}</p>
    </div>
  )
}

function DownloadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0 4-4m-4 4-4-4M5 19.5h14" />
    </svg>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading verification history" className="mt-6 space-y-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-stone-light bg-parchment p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-3 flex gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AppReportsPage() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  // The list is the page's primary data surface — ?state= forcing covers its
  // loading / empty / error branches. The detail pane keeps its own
  // per-scan loading / error rendering.
  const demoState = useDemoState()
  // Live status polling: the list and the open detail both refresh every 5s
  // while work is in flight (queued / processing), so a report that is still
  // processing flips to completed live without a reload — same pattern as the
  // dashboard. Polling idles once the queue drains.
  const scans = withDemoOverride(
    useResource(
      () => listScans({ pageSize: 100 }).then((r) => r?.data || r?.scans || []),
      [],
      {
        pollMs: 5000,
        pollWhen: (state) => hasActiveScanWork(state.data),
      },
    ),
    demoState,
    { emptyData: [] },
  )
  const detail = useResource(
    () => (scanId ? getScan(scanId).then((r) => r?.scan || r) : Promise.resolve(null)),
    [scanId],
    {
      pollMs: 5000,
      pollWhen: (state) => scanNeedsPolling(state.data?.scan || state.data),
    },
  )

  // Team scoping — shared with the dashboard/history/queue via ?team=.
  const { teamFilter, setTeamFilter, teamCounts, filteredScans } = useTeamScoping({ scans })

  const summary = useMemo(() => {
    const list = scans.data || []
    return {
      total: list.length,
      completed: list.filter((scan) => scan.status === 'complete' || scan.status === 'completed').length,
      active: list.filter((scan) => ['queued', 'processing'].includes(scan.status)).length,
      failed: list.filter((scan) => scan.status === 'failed').length,
    }
  }, [scans.data])


  const selectedScan = detail.status === 'ready' ? detail.data : null
  // The detail pane polls GET /scans/:id while the scan is queued/processing
  // (scanNeedsPolling) so the report swaps in the moment it completes — the
  // live indicator surfaces exactly that tracking.
  const detailLive = Boolean(selectedScan) && scanNeedsPolling(selectedScan)
  const selectedVerdict = selectedScan?.result_payload?.verdict
  const selectedSignals = selectedScan?.result_payload?.signals || []

  // Export PDF action. Mock mode keeps the printable view + browser print
  // dialog; real mode downloads the server-generated PDF (GET /reports/:id/pdf)
  // directly, so the report never has to go through the print dialog.
  function handleExportPdf(scanId) {
    if (USE_MOCK) {
      navigate(`/app/reports/${scanId}/print`)
      toast.info('Preparing PDF export', {
        description:
          "Opening the printable report — choose 'Save as PDF' from the print dialog to download.",
        duration: 8000,
      })
      return
    }

    downloadReportPdf(scanId)
      .then(({ filename }) =>
        toast.success('PDF downloaded', {
          description: `${filename} saved to your downloads.`,
          duration: 6000,
        }),
      )
      .catch(() =>
        toast.error('PDF export failed', {
          description:
            'The server could not generate the PDF. Please try again.',
          duration: 6000,
        }),
      )
  }

  useRegisterCommands(
    [
      {
        id: 'reports.upload-new',
        group: 'Reports',
        label: 'Upload a new verification',
        hint: 'Start a fresh scan',
        keywords: ['reports', 'upload', 'verify', 'new'],
        onSelect: () => navigate('/app/uploads'),
      },
      {
        id: 'reports.open-first',
        group: 'Reports',
        label: 'Open the latest report',
        hint: `${(scans.data || []).length} reports`,
        keywords: ['reports', 'report', 'open', 'latest'],
        onSelect: () => {
          const latest = (scans.data || []).find((s) => s.status === 'completed' || s.status === 'complete')
          if (latest) navigate(`/app/reports/${latest.id}`)
        },
      },          ...(scanId && selectedScan
        ? [
            {
              id: 'reports.export-pdf',
              group: 'Reports',
              label: 'Export current report as PDF',
              hint: 'Printable report view',
              keywords: ['reports', 'export', 'pdf', 'print', 'download'],
              onSelect: () => handleExportPdf(selectedScan.id),
            },
          ]
        : []),
    ].filter(Boolean),
    [navigate, scans.data, scanId, selectedScan, toast],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Reports
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Verification history and reports
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Uploaded media lands in a report workspace where teams can review status,
          open completed verdict payloads, and track the queue as the workflow matures.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <ReportMetaItem label="Total uploads" value={String(summary.total)} />
          <ReportMetaItem label="Completed" value={String(summary.completed)} />
          <ReportMetaItem label="In progress" value={String(summary.active)} />
          <ReportMetaItem label="Failed" value={String(summary.failed)} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Verification list
              </p>
              <h3 className="mt-2 font-serif text-2xl text-charcoal">All uploads</h3>
            </div>
            <Link
              to="/app/uploads"
              className="text-sm font-medium text-charcoal transition hover:text-charcoal-soft"
            >
              New upload
            </Link>
          </div>

          <div className="mt-5">
            <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} />
          </div>

          {scans.status === 'loading' && <ListSkeleton />}

          {scans.status === 'error' && (
            <div className="mt-6">
              <EmptyState
                variant="error"
                title="Report list could not be loaded"
                description={scans.error}
                action={
                  <button
                    type="button"
                    onClick={scans.reload}
                    className="ui-focus-ring inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                  >
                    Retry
                  </button>
                }
                compact
              />
            </div>
          )}

          {scans.status === 'ready' && scans.data.length === 0 && (
            <div className="mt-6">
              <EmptyState
                variant="empty"
                title="No reports are available yet"
                description="Start a verification in the upload workspace and the resulting report will appear here."
                action={
                  <Link
                    to="/app/uploads"
                    className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                  >
                    Start first scan
                  </Link>
                }
                compact
              />
            </div>
          )}

          {scans.status === 'ready' && scans.data.length > 0 && filteredScans.length === 0 && (
            <div className="mt-6">
              <EmptyState
                variant="empty"
                title="No scans in this team"
                description="Try a different team — or clear the filter to see the full verification list."
                compact
              />
            </div>
          )}

          {scans.status === 'ready' && scans.data.length > 0 && filteredScans.length > 0 && (
            <div className="mt-6 space-y-4">
              {filteredScans.map((scan) => {
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
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-charcoal">{scan.original_filename}</p>
                        <p className="mt-1 text-xs text-charcoal-mid">
                          {formatScanTimestamp(scan.created_at)}
                        </p>
                      </div>
                      <ScanStatusBadge status={scan.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-charcoal-mid">
                      <span>{formatFileSize(scan.file_size_bytes)}</span>
                      <span>{scan.mime_type}</span>
                      <TeamBadge teamId={scan.team_id} />
                      <span>Verdict: {getVerdictLabel(scan)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {!scanId && (
          <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <EmptyState
              variant="empty"
              title="Choose a report to review"
              description="Select an upload from the list to inspect verdict details, metadata, and the current report payload."
              compact
            />
          </div>
        )}

        {scanId && detail.status === 'loading' && (
          <div role="status" aria-label="Loading report detail" className="space-y-6">
            {[0, 1, 2].map((i) => (
              <section key={i} className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-2/3" />
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Skeleton className="h-16 rounded-2xl" />
                  <Skeleton className="h-16 rounded-2xl" />
                </div>
              </section>
            ))}
          </div>
        )}

        {scanId && detail.status === 'error' && (
          <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <EmptyState
              variant="error"
              title="Report detail could not be loaded"
              description={detail.error}
              action={
                <button
                  type="button"
                  onClick={detail.reload}
                  className="ui-focus-ring inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                >
                  Retry
                </button>
              }
              compact
            />
          </div>
        )}

        {scanId && detail.status === 'ready' && selectedScan && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* min-w-0 + break-words: real filenames (e.g.
                    IMG_20260715_143022.jpg) are unbroken strings that blow
                    the text-3xl header wider than the viewport on phones. */}
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                    Report detail
                  </p>
                  <h3 className="mt-2 break-words font-serif text-3xl leading-tight text-charcoal">
                    {selectedScan.original_filename}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {detailLive && <LivePollIndicator onRefresh={detail.refresh} />}
                  <Button
                    {...(USE_MOCK
                      ? { to: `/app/reports/${selectedScan.id}/print` }
                      : {})}
                    variant="primary"
                    iconLeft={<DownloadIcon />}
                    onClick={() => handleExportPdf(selectedScan.id)}
                  >
                    Export PDF
                  </Button>
                  <ScanStatusBadge status={selectedScan.status} />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReportMetaItem label="Scan ID" value={selectedScan.id} />
                <ReportMetaItem
                  label="Report ID"
                  value={selectedScan.result_payload?.report?.report_id || 'Pending'}
                />
                <ReportMetaItem label="Uploaded" value={formatScanTimestamp(selectedScan.created_at)} />
                <ReportMetaItem label="Last updated" value={formatScanTimestamp(selectedScan.updated_at)} />
                <ReportMetaItem
                  label="File details"
                  value={`${formatFileSize(selectedScan.file_size_bytes)}. ${selectedScan.mime_type}`}
                />
              </div>
              {selectedScan.result_payload?.deduplicated_from && (
                <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
                    <svg
                      className="h-4 w-4 shrink-0 text-sky-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Reused from a prior verification
                  </p>
                  <p className="mt-1.5 break-words text-xs leading-relaxed text-charcoal-mid">
                    This file is byte-identical to an earlier upload — the evidence payload from scan{' '}
                    <span className="font-mono font-medium text-charcoal">
                      {selectedScan.result_payload.deduplicated_from.source_scan_id}
                    </span>{' '}
                    (report{' '}
                    <span className="font-mono font-medium text-charcoal">
                      {selectedScan.result_payload.deduplicated_from.source_report_id || '—'}
                    </span>
                    ) was reused instead of reprocessing the media.{' '}
                    {selectedScan.result_payload.deduplicated_from.reused_at
                      ? `Reused at ${formatScanTimestamp(selectedScan.result_payload.deduplicated_from.reused_at)}.`
                      : ''}
                  </p>
                </div>
              )}
              {selectedScan.asset_preview_url && (
                <div className="mt-6 rounded-2xl border border-stone-light bg-parchment p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                    Media preview
                  </p>
                  {selectedScan.mime_type?.startsWith('video/') ? (
                    <video
                      src={selectedScan.asset_preview_url}
                      controls
                      preload="metadata"
                      className="mt-4 max-h-[24rem] w-full rounded-2xl bg-charcoal"
                      aria-label={selectedScan.original_filename}
                    >
                      Your browser does not support embedded video playback.
                    </video>
                  ) : (
                    <img
                      src={selectedScan.asset_preview_url}
                      alt={selectedScan.original_filename}
                      className="mt-4 max-h-[24rem] w-full rounded-2xl object-contain"
                    />
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Verdict</p>
              <h3 className="mt-3 break-words font-serif text-3xl text-charcoal">
                {selectedVerdict?.display_label || 'Pending'}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                {selectedVerdict?.plain_language_summary ||
                  selectedScan.failure_reason ||
                  'This upload has not produced a verdict payload yet.'}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <ReportMetaItem
                  label="Confidence"
                  value={
                    formatPct(selectedVerdict?.confidence_score, 0, 'Pending')
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
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Signals</p>
              <h3 className="mt-3 font-serif text-2xl text-charcoal">Signal analysis</h3>
              {selectedSignals.length === 0 ? (
                <p className="mt-4 text-sm text-charcoal-mid">
                  No signal detail is available for this upload yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {selectedSignals.map((signal) => (
                    <div
                      key={
                        signal.signal_id ||
                        signal.model ||
                        signal.label ||
                        signal.signal_category
                      }
                      className="rounded-2xl border border-stone-light bg-parchment px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-charcoal">
                            {signal.signal_display_name}
                          </p>
                          <p className="mt-1 break-words text-xs text-charcoal-mid">
                            {signal.signal_category}. Methodology {signal.methodology_version}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                          {signal.status}
                        </span>
                      </div>
                      <p className="mt-3 break-words text-sm text-charcoal-mid">
                        {signal.status_reason || 'No status reason provided.'}
                      </p>
                      {signal.findings?.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {signal.findings.map((finding) => (
                            <div
                              key={finding.finding_id}
                              className="rounded-2xl border border-stone-light bg-white-warm px-4 py-3"
                            >
                              <p className="break-words text-sm font-medium text-charcoal">{finding.label}</p>
                              <p className="mt-1 break-words text-sm text-charcoal-mid">{finding.description}</p>
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
