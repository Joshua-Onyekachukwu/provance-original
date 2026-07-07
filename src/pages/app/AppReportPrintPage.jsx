import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import { getScan } from '../../lib/api.js'
import { formatFileSize, formatScanTimestamp } from '../../components/app/scanPresentation.js'

function ReportMetric({ label, value, detail, accent = 'default' }) {
  const accentClasses = {
    default: 'border-stone-light bg-parchment',
    success: 'border-emerald-100 bg-emerald-50/70',
    warning: 'border-amber-200 bg-amber-50/80',
    neutral: 'border-sky-100 bg-sky-50/70',
  }

  return (
    <section className={`rounded-2xl border px-4 py-4 ${accentClasses[accent] || accentClasses.default}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-3 font-serif text-3xl text-charcoal">{value}</p>
      {detail ? <p className="mt-2 text-sm text-charcoal-mid">{detail}</p> : null}
    </section>
  )
}

function ReportDataCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-charcoal">{value}</p>
    </div>
  )
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'Pending'
}

function formatDateTime(value) {
  return value ? formatScanTimestamp(value) : 'Not available'
}

function getRiskLevel(verdictClass, suspicionScore) {
  if (verdictClass === 'suspicious' || suspicionScore >= 0.55) {
    return 'Elevated'
  }

  if (verdictClass === 'inconclusive' || suspicionScore >= 0.3) {
    return 'Moderate'
  }

  return 'Low'
}

function getRiskAccent(riskLevel) {
  if (riskLevel === 'Elevated') return 'warning'
  if (riskLevel === 'Moderate') return 'neutral'
  return 'success'
}

function buildScoreSummary(signals, verdict) {
  if (!signals.length) {
    return {
      suspicionScore: null,
      authenticityScore: null,
    }
  }

  const weightedSignals = signals.reduce(
    (accumulator, signal) => {
      const weight = Number.isFinite(signal.signal_weight) ? signal.signal_weight : 1
      const score = Number.isFinite(signal.score) ? signal.score : 0

      return {
        totalWeight: accumulator.totalWeight + weight,
        totalScore: accumulator.totalScore + score * weight,
      }
    },
    { totalWeight: 0, totalScore: 0 },
  )

  const averageScore =
    weightedSignals.totalWeight > 0 ? weightedSignals.totalScore / weightedSignals.totalWeight : 0
  const verdictAdjustment =
    verdict?.class === 'likely_authentic'
      ? -0.08
      : verdict?.class === 'suspicious'
        ? 0.08
        : 0
  const suspicionScore = clamp(averageScore + verdictAdjustment, 0.05, 0.95)

  return {
    suspicionScore,
    authenticityScore: clamp(1 - suspicionScore, 0.05, 0.95),
  }
}

function buildKeyFindings(signals) {
  return signals.flatMap((signal) =>
    (signal.findings || []).map((finding) => ({
      id: finding.finding_id,
      label: finding.label,
      description: finding.description,
      severity: finding.severity || 'informational',
      signalDisplayName: signal.signal_display_name,
    })),
  )
}

function splitSignals(signals) {
  const aiSignals = signals.filter((signal) =>
    ['provenance', 'metadata'].includes(signal.signal_category),
  )
  const manipulationSignals = signals.filter((signal) =>
    ['integrity', 'image_analysis'].includes(signal.signal_category),
  )

  return { aiSignals, manipulationSignals }
}

function renderMediaPreview(scan, media) {
  const previewUrl = scan.asset_preview_url
  const mimeType = media.mime_type || scan.mime_type || ''

  if (previewUrl && mimeType.startsWith('image/')) {
    return (
      <img
        src={previewUrl}
        alt={media.filename || scan.original_filename}
        className="max-h-[32rem] w-full rounded-[1.5rem] border border-stone-light bg-white object-contain"
      />
    )
  }

  if (mimeType.startsWith('video/')) {
    return (
      <div className="rounded-[1.5rem] border border-stone-light bg-white px-6 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Video preview</p>
        <p className="mt-3 font-serif text-3xl text-charcoal">Representative frame pending</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
          Video report support is designed to show a key frame, duration, and motion summary.
          The current MVP upload pipeline remains image-first.
        </p>
      </div>
    )
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <div className="rounded-[1.5rem] border border-stone-light bg-white px-6 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Audio summary</p>
        <p className="mt-3 font-serif text-3xl text-charcoal">Waveform preview pending</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
          Audio report support is designed to show waveform context, duration, and playback
          summary. The current MVP upload pipeline remains image-first.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[1.5rem] border border-stone-light bg-white px-6 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Media preview</p>
      <p className="mt-3 font-serif text-3xl text-charcoal">Preview unavailable</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
        Provance could not generate a preview for this file, but the report still reflects
        the uploaded media and its verification record.
      </p>
    </div>
  )
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function AppReportPrintPage() {
  const { scanId } = useParams()
  const [state, setState] = useState({
    status: 'loading',
    scan: null,
    error: '',
  })

  useEffect(() => {
    let isCancelled = false

    async function loadScan() {
      try {
        const response = await getScan(scanId)

        if (isCancelled) return

        setState({
          status: 'ready',
          scan: response.scan,
          error: '',
        })
      } catch (error) {
        if (isCancelled) return

        setState({
          status: 'error',
          scan: null,
          error: error.message || 'Failed to load printable report.',
        })
      }
    }

    void loadScan()

    return () => {
      isCancelled = true
    }
  }, [scanId])

  const report = useMemo(() => state.scan?.result_payload?.report || {}, [state.scan])
  const verdict = state.scan?.result_payload?.verdict || {}
  const media = state.scan?.result_payload?.media || {}
  const metadata = state.scan?.result_payload?.metadata || {}
  const methodology = state.scan?.result_payload?.methodology || {}
  const signals = state.scan?.result_payload?.signals || []
  const recommendations = metadata.recommendations || []
  const keyFindings = useMemo(() => buildKeyFindings(signals), [signals])
  const { suspicionScore, authenticityScore } = useMemo(
    () => buildScoreSummary(signals, verdict),
    [signals, verdict],
  )
  const riskLevel = getRiskLevel(verdict.class, suspicionScore || 0)
  const { aiSignals, manipulationSignals } = useMemo(() => splitSignals(signals), [signals])

  if (state.status === 'loading') {
    return (
      <AppStatePanel
        label="Loading"
        title="Preparing printable report"
        description="Loading the latest verification package for this uploaded file."
        variant="loading"
      />
    )
  }

  if (state.status === 'error') {
    return (
      <AppStatePanel
        label="Error"
        title="Printable report could not be loaded"
        description={state.error}
        variant="error"
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/app/reports/${scanId}`}
          className="rounded-xl border border-stone-light px-4 py-2 text-sm text-charcoal transition hover:border-charcoal"
        >
          Back to report detail
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-charcoal px-4 py-2 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
        >
          Print report
        </button>
      </div>

      <article className="rounded-[2rem] border border-stone-light bg-white-warm p-8 shadow-sm sm:p-10">
        <div className="flex flex-col gap-6 border-b border-stone-light pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Verification report
            </p>
            <h1 className="mt-3 font-serif text-4xl text-charcoal sm:text-5xl">
              {report.report_id || `Provance report ${scanId}`}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
              {verdict.plain_language_summary ||
                'No verdict summary is available yet for this upload.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ReportDataCard label="Verification ID" value={state.scan.id} />
            <ReportDataCard label="Analysis timestamp" value={formatDateTime(report.generated_at)} />
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportMetric
            label="Overall verdict"
            value={verdict.display_label || 'Pending'}
            detail="Final outcome from the current signal set."
            accent={riskLevel === 'Low' ? 'success' : riskLevel === 'Moderate' ? 'neutral' : 'warning'}
          />
          <ReportMetric
            label="Authenticity score"
            value={formatPercent(authenticityScore)}
            detail="Higher values indicate stronger signs of authenticity."
            accent="success"
          />
          <ReportMetric
            label="Confidence score"
            value={formatPercent(verdict.confidence_score)}
            detail={verdict.confidence_level || 'Pending'}
            accent="neutral"
          />
          <ReportMetric
            label="Risk level"
            value={riskLevel}
            detail="Indicates how much caution this result requires."
            accent={getRiskAccent(riskLevel)}
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Uploaded media
              </p>
              <h2 className="mt-3 font-serif text-3xl text-charcoal">
                Preview of analyzed file
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
                This preview ties the report to the exact media file processed during this
                verification run.
              </p>
              <div className="mt-5">{renderMediaPreview(state.scan, media)}</div>
            </div>

            <div className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Executive summary
              </p>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                {verdict.plain_language_summary ||
                  'Provance did not receive enough completed signals to generate a full summary.'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Media information
              </p>
              <div className="mt-4 grid gap-4">
                <ReportDataCard
                  label="File name"
                  value={media.filename || state.scan.original_filename || 'Not available'}
                />
                <ReportDataCard
                  label="Type"
                  value={media.mime_type || state.scan.mime_type || 'Not available'}
                />
                <ReportDataCard
                  label="Size"
                  value={formatFileSize(media.file_size_bytes || state.scan.file_size_bytes)}
                />
                <ReportDataCard
                  label="Resolution"
                  value={
                    media.width && media.height
                      ? `${media.width} x ${media.height}`
                      : 'Not available'
                  }
                />
                <ReportDataCard
                  label="Duration"
                  value={
                    Number.isFinite(media.duration_seconds)
                      ? `${media.duration_seconds} seconds`
                      : 'Not applicable'
                  }
                />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Digital fingerprint
              </p>
              <div className="mt-4 grid gap-4">
                <ReportDataCard label="SHA-256" value={media.sha256 || 'Pending'} />
                <ReportDataCard label="MD5" value={media.md5 || 'Pending'} />
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Metadata summary
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ReportDataCard label="Capture timestamp" value={formatDateTime(metadata.capture_timestamp)} />
              <ReportDataCard label="Software tag" value={metadata.software || 'Not available'} />
              <ReportDataCard label="Camera make" value={metadata.make || 'Not available'} />
              <ReportDataCard label="Camera model" value={metadata.model || 'Not available'} />
              <ReportDataCard label="Color space" value={metadata.color_space || 'Not available'} />
              <ReportDataCard label="Orientation" value={metadata.orientation || 'Not available'} />
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Processing timeline
            </p>
            <div className="mt-4 grid gap-4">
              <ReportDataCard label="Uploaded" value={formatDateTime(metadata.scan_created_at || state.scan.created_at)} />
              <ReportDataCard label="Completed" value={formatDateTime(metadata.scan_completed_at || report.generated_at)} />
              <ReportDataCard
                label="Processing time"
                value={
                  Number.isFinite(metadata.total_processing_time_ms)
                    ? `${metadata.total_processing_time_ms} ms`
                    : 'Not available'
                }
              />
              <ReportDataCard label="Methodology version" value={methodology.version || 'Not available'} />
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              AI detection results
            </p>
            <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
              The current MVP does not run a dedicated generative-media classifier. This
              section summarizes indirect indicators from provenance and metadata review.
            </p>
            <div className="mt-5 space-y-3">
              {aiSignals.length > 0 ? (
                aiSignals.map((signal) => (
                  <div
                    key={signal.signal_id}
                    className="rounded-2xl border border-stone-light bg-white-warm px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {signal.signal_display_name}
                        </p>
                        <p className="mt-1 text-xs text-charcoal-mid">{signal.status}</p>
                      </div>
                      <p className="text-sm font-medium text-charcoal">{formatPercent(signal.score)}</p>
                    </div>
                    <p className="mt-3 text-sm text-charcoal-mid">
                      {signal.status_reason || 'No summary available.'}
                    </p>
                  </div>
                ))
              ) : (
                <ReportDataCard
                  label="Current status"
                  value="No AI-specific signal group is available for this file yet."
                />
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Manipulation detection results
            </p>
            <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
              This section summarizes integrity and visual checks used to surface editing,
              compression, or structural anomalies.
            </p>
            <div className="mt-5 space-y-3">
              {manipulationSignals.length > 0 ? (
                manipulationSignals.map((signal) => (
                  <div
                    key={signal.signal_id}
                    className="rounded-2xl border border-stone-light bg-white-warm px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {signal.signal_display_name}
                        </p>
                        <p className="mt-1 text-xs text-charcoal-mid">{signal.status}</p>
                      </div>
                      <p className="text-sm font-medium text-charcoal">{formatPercent(signal.score)}</p>
                    </div>
                    <p className="mt-3 text-sm text-charcoal-mid">
                      {signal.status_reason || 'No summary available.'}
                    </p>
                  </div>
                ))
              ) : (
                <ReportDataCard
                  label="Current status"
                  value="No manipulation-specific signal group is available for this file yet."
                />
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-stone-light bg-parchment p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
            Key findings
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {keyFindings.length > 0 ? (
              keyFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-2xl border border-stone-light bg-white-warm px-4 py-4"
                >
                  <p className="text-sm font-medium text-charcoal">{finding.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-charcoal-light">
                    {finding.signalDisplayName} · {finding.severity}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                    {finding.description}
                  </p>
                </div>
              ))
            ) : (
              <ReportDataCard
                label="Findings"
                value="No detailed findings were recorded for this report."
              />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-stone-light bg-parchment p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
            Signal-by-signal analysis
          </p>
          <div className="mt-5 space-y-4">
            {signals.map((signal) => (
              <div
                key={signal.signal_id}
                className="rounded-2xl border border-stone-light bg-white-warm px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-medium text-charcoal">
                      {signal.signal_display_name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-charcoal-light">
                      {signal.signal_category} · {signal.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-charcoal">{formatPercent(signal.score)}</p>
                    <p className="mt-1 text-xs text-charcoal-mid">
                      Weight {formatPercent(signal.signal_weight)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                  {signal.status_reason || 'No status reason provided.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Recommendations
            </p>
            <div className="mt-5 space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((recommendation) => (
                  <div
                    key={recommendation}
                    className="rounded-2xl border border-stone-light bg-white-warm px-4 py-4 text-sm leading-relaxed text-charcoal-mid"
                  >
                    {recommendation}
                  </div>
                ))
              ) : (
                <ReportDataCard
                  label="Recommendations"
                  value="No follow-up recommendations are available yet."
                />
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-light bg-parchment p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Supporting evidence
            </p>
            <div className="mt-4 grid gap-4">
              <ReportDataCard
                label="Header and MIME check"
                value={
                  metadata.header_matches_mime
                    ? 'Detected file header matches the declared upload type.'
                    : 'Detected file header does not match the declared upload type.'
                }
              />
              <ReportDataCard
                label="Provenance marker"
                value={
                  metadata.c2pa_marker_detected
                    ? 'A possible provenance or content credential marker was detected.'
                    : 'No provenance or content credential marker was detected.'
                }
              />
              <ReportDataCard
                label="Primary contributing signals"
                value={
                  verdict.primary_contributing_signals?.length
                    ? verdict.primary_contributing_signals.join(', ')
                    : 'Not available'
                }
              />
            </div>
          </section>
        </section>
      </article>
    </div>
  )
}
