import { Link } from 'react-router-dom'
import HealthCheckRow from './HealthCheckRow.jsx'

const WORKER_CONFIG = {
  running: { dot: 'bg-emerald-500', label: 'Running', text: 'text-emerald-700' },
  degraded: { dot: 'bg-amber-500', label: 'Degraded', text: 'text-amber-700' },
  stopped: { dot: 'bg-rose-500', label: 'Stopped', text: 'text-rose-700' },
}

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * QueueSnapshotPanel — shows queue metrics and worker status.
 *
 * Props:
 *   data:   { queued, processing, failed, avgProcessingTimeMs, workerStatus }
 *   error:  string | null (for partial-error inline state)
 *   onRetry: () => void
 *   linkTo: string (default /app/admin/jobs)
 */
export default function QueueSnapshotPanel({
  data,
  error = null,
  onRetry = null,
  linkTo = '/app/admin/jobs',
}) {
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Queue snapshot
        </p>
        <p className="mt-3 text-sm font-medium text-rose-700">Queue data unavailable</p>
        <p className="mt-1 text-sm text-charcoal-mid">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-xl border border-stone-light px-4 py-2 text-sm text-charcoal hover:border-charcoal/25 transition"
          >
            Retry queue data
          </button>
        )}
      </div>
    )
  }

  if (!data) return null

  const worker = WORKER_CONFIG[data.workerStatus] || WORKER_CONFIG.stopped

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
        Queue snapshot
      </p>

      <div className="mt-4">
        {/* Queued */}
        <div className="flex items-center justify-between py-3 border-b border-stone-light/50">
          <span className="text-sm text-charcoal-mid">Queued</span>
          <span className="text-sm font-semibold font-mono text-charcoal">{data.queued}</span>
        </div>
        {/* Processing */}
        <div className="flex items-center justify-between py-3 border-b border-stone-light/50">
          <span className="text-sm text-charcoal-mid">Processing</span>
          <span className="text-sm font-semibold font-mono text-charcoal">{data.processing}</span>
        </div>
        {/* Failed */}
        <div className="flex items-center justify-between py-3 border-b border-stone-light/50">
          <span className="text-sm text-charcoal-mid">Failed</span>
          <span className={`text-sm font-semibold font-mono ${data.failed > 0 ? 'text-rose-600' : 'text-charcoal'}`}>
            {data.failed}
          </span>
        </div>
        {/* Avg Processing Time */}
        <div className="flex items-center justify-between py-3 border-b border-stone-light/50">
          <span className="text-sm text-charcoal-mid">Avg Processing</span>
          <span className="text-sm font-semibold font-mono text-charcoal">
            {formatMs(data.avgProcessingTimeMs || data.avg_processing_time_ms || 0)}
          </span>
        </div>
        {/* Worker Status */}
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-charcoal-mid">Worker Status</span>
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${worker.dot}`} aria-hidden="true" />
            <span className={worker.text}>{worker.label}</span>
          </span>
        </div>
      </div>

      <Link
        to={linkTo}
        className="mt-4 inline-flex items-center gap-1 text-xs text-charcoal-mid hover:text-charcoal transition-colors focus-visible:ring-2 focus-visible:ring-charcoal rounded"
      >
        View queue details →
      </Link>
    </div>
  )
}
