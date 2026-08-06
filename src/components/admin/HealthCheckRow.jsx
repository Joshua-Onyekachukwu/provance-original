import { STATUS_CONFIG } from './healthStatus.js'

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
