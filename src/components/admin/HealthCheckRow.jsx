const STATUS_CONFIG = {
  operational: { dot: 'bg-emerald-500', label: 'Operational', text: 'text-emerald-700' },
  unreachable: { dot: 'bg-rose-500', label: 'Unreachable', text: 'text-rose-700' },
  degraded: { dot: 'bg-amber-500', label: 'Degraded', text: 'text-amber-700' },
  not_configured: { dot: 'bg-stone-400', label: 'Not configured', text: 'text-charcoal-mid' },
  checking: { dot: 'bg-sky-400 animate-pulse', label: 'Checking…', text: 'text-sky-600' },
}

/**
 * HealthCheckRow — a single system health check row with colored status dot.
 *
 * Props:
 *   service — display name, e.g. "API", "Database"
 *   status  — 'operational' | 'unreachable' | 'degraded' | 'not_configured' | 'checking'
 */
export default function HealthCheckRow({ service, status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.not_configured

  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-light/50 last:border-b-0">
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`}
        aria-label={`${service}: ${s.label}`}
      />
      <span className="text-sm text-charcoal flex-1">{service}</span>
      <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
    </div>
  )
}
