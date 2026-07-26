import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import { formatFileSize, formatScanTimestamp } from '../../components/app/scanPresentation.js'
import { getScan } from '../../lib/api.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'Pending'
}

function getVerdictMeta(verdictClass) {
  const map = {
    likely_authentic: {
      label: 'Likely Authentic',
      accent: 'emerald',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      bar: 'bg-emerald-500',
    },
    suspicious: {
      label: 'Suspicious',
      accent: 'rose',
      bg: 'bg-rose-50/70',
      border: 'border-rose-200',
      text: 'text-rose-800',
      bar: 'bg-rose-500',
    },
    inconclusive: {
      label: 'Inconclusive',
      accent: 'amber',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      text: 'text-amber-800',
      bar: 'bg-amber-500',
    },
  }
  return map[verdictClass] || {
    label: 'Pending',
    accent: 'stone',
    bg: 'bg-stone-50/70',
    border: 'border-stone-light',
    text: 'text-charcoal-light',
    bar: 'bg-stone-300',
  }
}

function getFileTypeIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📑'
  return '📄'
}

function getFileTypeLabel(mimeType) {
  if (!mimeType) return 'Unknown file'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('video/')) return 'Video'
  if (mimeType.startsWith('audio/')) return 'Audio'
  if (mimeType.includes('pdf')) return 'PDF Document'
  return 'File'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-2 text-sm text-charcoal">{value || 'Not available'}</p>
    </div>
  )
}

function SignalCard({ signal }) {
  const scorePercent = Number.isFinite(signal.score) ? Math.round(signal.score * 100) : null
  const scoreColor =
    signal.status === 'anomaly_detected' || signal.status === 'incomplete_metadata' || signal.status === 'no_credentials'
      ? 'text-rose-600'
      : 'text-emerald-600'

  return (
    <div className="rounded-2xl border border-stone-light bg-parchment px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-charcoal">{signal.signal_display_name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-charcoal-light">
            {signal.signal_category} · v{signal.methodology_version}
          </p>
        </div>
        <div className="text-right">
          {scorePercent !== null && (
            <p className={`text-lg font-semibold tabular-nums ${scoreColor}`}>{scorePercent}%</p>
          )}
          <p className={`mt-0.5 text-[11px] uppercase tracking-[0.16em] ${scoreColor}`}>
            {signal.status}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
        {signal.status_reason || 'No analysis available.'}
      </p>
      {signal.findings?.length > 0 && (
        <div className="mt-4 space-y-3">
          {signal.findings.map((finding) => (
            <div
              key={finding.finding_id}
              className="rounded-xl border border-stone-light bg-white-warm px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-charcoal">{finding.label}</p>
                {finding.severity && (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    finding.severity === 'high'
                      ? 'bg-rose-100 text-rose-700'
                      : finding.severity === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-stone-100 text-charcoal-light'
                  }`}>
                    {finding.severity}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-charcoal-mid">{finding.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineStep({ label, timestamp, status, isLast = false }) {
  const isActive = status === 'active'
  const isDone = status === 'done'
  const isPending = status === 'pending'

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs ${
            isDone
              ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
              : isActive
                ? 'border-charcoal bg-charcoal text-parchment'
                : 'border-stone-light bg-parchment text-charcoal-light'
          }`}
        >
          {isDone ? '✓' : isActive ? '●' : '○'}
        </div>
        {!isLast && (
          <div className={`mt-1 h-6 w-0.5 ${isDone ? 'bg-emerald-200' : 'bg-stone-light'}`} />
        )}
      </div>
      <div className="pb-4">
        <p className={`text-sm font-medium ${isPending ? 'text-charcoal-light' : 'text-charcoal'}`}>
          {label}
        </p>
        {timestamp && (
          <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-charcoal-light">
            {formatScanTimestamp(timestamp)}
          </p>
        )}
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation, index, verdictClass }) {
  const borderColor =
    verdictClass === 'likely_authentic'
      ? 'border-l-emerald-400'
      : verdictClass === 'suspicious'
        ? 'border-l-rose-400'
        : 'border-l-amber-400'

  return (
    <div
      className={`rounded-2xl border border-stone-light bg-white-warm px-4 py-4 border-l-[3px] ${borderColor}`}
    >
      <p className="text-sm leading-relaxed text-charcoal-mid">{recommendation}</p>
    </div>
  )
}

// ── Loading skeleton components ───────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Media preview skeleton */}
      <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-stone-light/50" />
        <div className="h-64 animate-pulse rounded-2xl bg-stone-light/50" />
      </div>

      {/* Verdict skeleton */}
      <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="mb-3 h-4 w-16 animate-pulse rounded bg-stone-light/50" />
        <div className="mb-3 h-8 w-48 animate-pulse rounded bg-stone-light/50" />
        <div className="mb-4 h-16 animate-pulse rounded bg-stone-light/50" />
        <div className="mb-2 h-4 w-full animate-pulse rounded bg-stone-light/50" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-light/50" />
          ))}
        </div>
      </div>

      {/* Signals skeleton */}
      <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="mb-3 h-4 w-20 animate-pulse rounded bg-stone-light/50" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-stone-light/50" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AppReportDetailPage() {
  const { scanId } = useParams()
  const [state, setState] = useState({ status: 'loading', scan: null, error: '' })

  useEffect(() => {
    if (!scanId) {
      setState({ status: 'error', scan: null, error: 'No scan ID provided.' })
      return
    }

    let cancelled = false

    async function load() {
      try {
        const response = await getScan(scanId)
        if (cancelled) return
        setState({ status: 'ready', scan: response.scan || response, error: '' })
      } catch (err) {
        if (cancelled) return
        setState({ status: 'error', scan: null, error: err.message || 'Failed to load report.' })
      }
    }

    setState({ status: 'loading', scan: null, error: '' })
    void load()

    return () => { cancelled = true }
  }, [scanId])

  // ── Derived data ──────────────────────────────────────────────────────────
  const scan = state.scan
  const resultPayload = scan?.result_payload
  const verdict = resultPayload?.verdict || {}
  const signals = resultPayload?.signals || []
  const media = resultPayload?.media || {}
  const metadata = resultPayload?.metadata || {}
  const methodology = resultPayload?.methodology || {}
  const report = resultPayload?.report || {}
  const recommendations = metadata.recommendations || []

  const verdictMeta = getVerdictMeta(verdict.class)
  const confidencePercent = Number.isFinite(verdict.confidence_score)
    ? Math.round(verdict.confidence_score * 100)
    : null

  // Build timeline
  const timeline = useMemo(() => {
    if (!scan) return []

    const steps = []

    // Created
    steps.push({
      label: 'Created',
      timestamp: scan.created_at,
      status: 'done',
    })

    // Uploaded (same as created for MVP)
    steps.push({
      label: 'Uploaded',
      timestamp: scan.created_at,
      status: 'done',
    })

    // Queued
    if (['queued', 'processing', 'completed', 'failed'].includes(scan.status)) {
      steps.push({
        label: 'Queued',
        timestamp: scan.created_at,
        status: 'done',
      })
    } else if (scan.status === 'created') {
      steps.push({
        label: 'Queued',
        timestamp: null,
        status: 'pending',
      })
    }

    // Processing
    if (['processing', 'completed', 'failed'].includes(scan.status)) {
      steps.push({
        label: 'Processing',
        timestamp: null,
        status: scan.status === 'processing' ? 'active' : 'done',
      })
    } else if (scan.status === 'queued') {
      steps.push({
        label: 'Processing',
        timestamp: null,
        status: 'pending',
      })
    }

    // Complete / Failed
    if (scan.status === 'completed') {
      steps.push({
        label: 'Complete',
        timestamp: scan.completed_at,
        status: 'done',
      })
    } else if (scan.status === 'failed') {
      steps.push({
        label: 'Failed',
        timestamp: scan.completed_at,
        status: 'done',
      })
    } else {
      steps.push({
        label: scan.status === 'processing' ? 'Complete' : 'Complete',
        timestamp: null,
        status: 'pending',
      })
    }

    return steps
  }, [scan])

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return <DetailSkeleton />
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (state.status === 'error') {
    return (
      <AppStatePanel
        label="Error"
        title="Report could not be loaded"
        description={state.error}
        variant="error"
        action={
          <Link
            to="/app/reports"
            className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
          >
            Back to reports
          </Link>
        }
      />
    )
  }

  // ── Processing state ─────────────────────────────────────────────────────────

  if (scan && (scan.status === 'queued' || scan.status === 'processing')) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Report detail
              </p>
              <h2 className="mt-2 font-serif text-3xl text-charcoal">{scan.original_filename}</h2>
            </div>
            <ScanStatusBadge status={scan.status} />
          </div>
        </section>

        {/* Processing panel */}
        <AppStatePanel
          label="Processing"
          title={scan.status === 'queued' ? 'Verification queued' : 'Analysis in progress'}
          description={
            scan.status === 'queued'
              ? 'This file is waiting in the verification queue. Processing will begin shortly.'
              : 'Provance is analyzing this media across multiple forensic signal categories. This typically takes 15–60 seconds.'
          }
          variant="loading"
        >
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-light">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-400" />
              </div>
              <span className="text-xs text-charcoal-light">In progress</span>
            </div>
          </div>
        </AppStatePanel>

        {/* Timeline (partial) */}
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Verification timeline
          </p>
          <div className="mt-5">
            {timeline.map((step, idx) => (
              <TimelineStep
                key={step.label}
                label={step.label}
                timestamp={step.timestamp}
                status={step.status}
                isLast={idx === timeline.length - 1}
              />
            ))}
          </div>
        </section>
      </div>
    )
  }

  // ── Failed state ─────────────────────────────────────────────────────────────

  if (scan && scan.status === 'failed') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Report detail
              </p>
              <h2 className="mt-2 font-serif text-3xl text-charcoal">{scan.original_filename}</h2>
            </div>
            <ScanStatusBadge status={scan.status} />
          </div>
        </section>

        {/* Failure panel */}
        <AppStatePanel
          label="Failed"
          title="Verification could not be completed"
          description={scan.failure_reason || 'An unexpected error occurred during the verification pipeline.'}
          variant="error"
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app/uploads"
                className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
              >
                Upload new file
              </Link>
              <Link
                to="/app/reports"
                className="inline-flex rounded-xl border border-stone-light px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal"
              >
                Back to reports
              </Link>
            </div>
          }
        />

        {/* Metadata */}
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            File details
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem label="Scan ID" value={scan.id} />
            <MetaItem label="File size" value={formatFileSize(scan.file_size_bytes)} />
            <MetaItem label="Type" value={scan.mime_type} />
            <MetaItem label="Uploaded" value={formatScanTimestamp(scan.created_at)} />
            <MetaItem label="Processing mode" value={scan.processing_mode || 'standard'} />
          </div>
        </section>
      </div>
    )
  }

  // ── Completed / Populated ────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Report detail</p>
            <h2 className="mt-2 font-serif text-3xl text-charcoal">{scan.original_filename}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/app/reports/${scan.id}/print`}
              className="inline-flex items-center rounded-xl border border-stone-light px-4 py-2 text-sm font-medium text-charcoal transition hover:border-charcoal"
            >
              Printable report
            </Link>
            <ScanStatusBadge status={scan.status} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem
            label="Report ID"
            value={report.report_id || resultPayload?.report_id || 'Pending'}
          />
          <MetaItem label="Uploaded" value={formatScanTimestamp(scan.created_at)} />
          <MetaItem label="Completed" value={formatScanTimestamp(scan.completed_at)} />
          <MetaItem
            label="Processing time"
            value={
              metadata.total_processing_time_ms
                ? `${(metadata.total_processing_time_ms / 1000).toFixed(1)}s`
                : 'Not available'
            }
          />
        </div>
      </section>

      {/* ── Media Preview ───────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Media preview
        </p>
        <h3 className="mt-2 font-serif text-2xl text-charcoal">Analyzed file</h3>

        <div className="mt-5">
          {scan.asset_preview_url && scan.mime_type?.startsWith('image/') ? (
            <img
              src={scan.asset_preview_url}
              alt={scan.original_filename}
              className="max-h-[32rem] w-full rounded-2xl border border-stone-light object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-light bg-parchment px-6 py-12">
              <span className="text-5xl opacity-40">{getFileTypeIcon(scan.mime_type)}</span>
              <p className="text-sm text-charcoal-mid">
                {getFileTypeLabel(scan.mime_type)} preview — {scan.original_filename}
              </p>
              <div className="grid w-full max-w-md gap-3">
                <MetaItem label="File type" value={scan.mime_type} />
                <MetaItem label="File size" value={formatFileSize(scan.file_size_bytes)} />
                {media.width && media.height && (
                  <MetaItem label="Resolution" value={`${media.width} × ${media.height}`} />
                )}
                {media.duration_seconds && (
                  <MetaItem label="Duration" value={`${media.duration_seconds}s`} />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Verdict Panel ───────────────────────────────────────────────────── */}
      <section className={`rounded-3xl border ${verdictMeta.border} ${verdictMeta.bg} p-6 shadow-sm`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Verdict</p>
        <h3 className={`mt-2 font-serif text-3xl ${verdictMeta.text}`}>
          {verdict.display_label || 'Pending'}
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-charcoal-mid">
          {verdict.plain_language_summary || 'This upload has not produced a verdict payload yet.'}
        </p>

        {/* Confidence bar */}
        {confidencePercent !== null && (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Confidence
              </p>
              <p className="text-sm font-medium tabular-nums text-charcoal">{confidencePercent}%</p>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className={`h-full rounded-full transition-all ${verdictMeta.bar}`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-charcoal-light">
              {verdict.confidence_level || 'Pending'} confidence level
            </p>
          </div>
        )}

        {/* Verdict metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetaItem
            label="Signals completed"
            value={
              Number.isFinite(verdict.signal_count_completed)
                ? `${verdict.signal_count_completed}/${verdict.signal_count_total || signals.length}`
                : `${signals.length} signals`
            }
          />
          <MetaItem
            label="Methodology"
            value={methodology.version || 'Not available'}
          />
          <MetaItem
            label="Node"
            value={methodology.processing_node || 'Not available'}
          />
        </div>
      </section>

      {/* ── Key Findings / Signals ──────────────────────────────────────────── */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Key findings
        </p>
        <h3 className="mt-2 font-serif text-2xl text-charcoal">Signal analysis</h3>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">
          Each signal below was evaluated independently and contributes a weighted score to the overall verdict.
        </p>

        {signals.length === 0 ? (
          <p className="mt-5 text-sm text-charcoal-mid">
            No signal detail is available for this upload yet.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {signals.map((signal) => (
              <SignalCard key={signal.signal_id} signal={signal} />
            ))}
          </div>
        )}
      </section>

      {/* ── Verification Timeline ───────────────────────────────────────────── */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Verification timeline
        </p>
        <h3 className="mt-2 font-serif text-2xl text-charcoal">Processing history</h3>
        <div className="mt-5">
          {timeline.map((step, idx) => (
            <TimelineStep
              key={step.label}
              label={step.label}
              timestamp={step.timestamp}
              status={step.status}
              isLast={idx === timeline.length - 1}
            />
          ))}
        </div>
      </section>

      {/* ── Recommendations ─────────────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Recommendations
          </p>
          <h3 className="mt-2 font-serif text-2xl text-charcoal">Suggested next steps</h3>
          <div className="mt-5 space-y-3">
            {recommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                recommendation={rec}
                index={idx}
                verdictClass={verdict.class}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Footer links ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/app/reports/${scan.id}/print`}
          className="inline-flex items-center rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
        >
          View printable report
        </Link>
        <Link
          to="/app/reports"
          className="inline-flex items-center rounded-xl border border-stone-light px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal"
        >
          Back to reports
        </Link>
      </div>
    </div>
  )
}
