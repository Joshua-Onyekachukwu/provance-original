import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import { getScan } from '../../lib/api.js'

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
  const signals = state.scan?.result_payload?.signals || []

  if (state.status === 'loading') {
    return (
      <AppStatePanel
        label="Loading"
        title="Preparing printable report"
        description="Loading the latest evidence package for this verification case."
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
    <div className="mx-auto max-w-5xl space-y-6">
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

      <article className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Verification report
        </p>
        <h1 className="mt-3 font-serif text-4xl text-charcoal">
          {report.report_id || `Provance report ${scanId}`}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-charcoal-mid">
          {verdict.plain_language_summary || 'No verdict summary is available yet.'}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Verdict</p>
            <p className="mt-2 text-lg font-medium text-charcoal">
              {verdict.display_label || 'Pending'}
            </p>
          </section>
          <section className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Confidence</p>
            <p className="mt-2 text-lg font-medium text-charcoal">
              {Number.isFinite(verdict.confidence_score)
                ? `${Math.round(verdict.confidence_score * 100)}%`
                : 'Pending'}
            </p>
          </section>
          <section className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Generated</p>
            <p className="mt-2 text-lg font-medium text-charcoal">
              {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'Pending'}
            </p>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-stone-light bg-parchment px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Media fingerprint</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <p className="text-sm text-charcoal-mid">
              <span className="font-medium text-charcoal">File:</span> {media.filename || state.scan.original_filename}
            </p>
            <p className="text-sm text-charcoal-mid">
              <span className="font-medium text-charcoal">SHA-256:</span> {media.sha256 || 'Pending'}
            </p>
            <p className="text-sm text-charcoal-mid">
              <span className="font-medium text-charcoal">Dimensions:</span> {media.width || 'Unknown'} × {media.height || 'Unknown'}
            </p>
            <p className="text-sm text-charcoal-mid">
              <span className="font-medium text-charcoal">MIME type:</span> {media.mime_type || state.scan.mime_type}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Metadata overview</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-sm font-medium text-charcoal">Capture timestamp</p>
              <p className="mt-2 text-sm text-charcoal-mid">{metadata.capture_timestamp || 'Not available'}</p>
            </div>
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-sm font-medium text-charcoal">Software tag</p>
              <p className="mt-2 text-sm text-charcoal-mid">{metadata.software || 'Not available'}</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Signal analysis</p>
          <div className="mt-4 space-y-4">
            {signals.map((signal) => (
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
                      {signal.signal_category} · {signal.status}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-charcoal">
                    {Number.isFinite(signal.score) ? `${Math.round(signal.score * 100)}%` : 'Pending'}
                  </p>
                </div>
                <p className="mt-3 text-sm text-charcoal-mid">
                  {signal.status_reason || 'No status reason provided.'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  )
}
