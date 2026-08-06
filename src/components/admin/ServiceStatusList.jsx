import { STATUS_CONFIG } from './healthStatus.js'
import { formatDurationMs, formatPct, formatTimeShort } from '../app/scanPresentation.js'

/**
 * ServiceStatusList — detailed per-service health rows for the monitoring page.
 *
 * Reuses the shared HealthCheckRow status vocabulary (operational | unreachable
 * | degraded | not_configured) so the page's status dots always match.
 *
 * Props:
 *   services — [{ id, name, status, latency_ms, region, uptime_30d, last_checked_at }]
 */
export default function ServiceStatusList({ services }) {
  return (
    <div>
      {/* Header row */}
      <div className="hidden grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-stone-light/50 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light sm:grid">
        <span>Service</span>
        <span className="w-16 text-right">Latency</span>
        <span className="w-20 text-right">Uptime 30d</span>
        <span className="w-24 text-right">Last check</span>
      </div>

      {services.map((service) => {
        const s = STATUS_CONFIG[service.status] || STATUS_CONFIG.not_configured
        return (
          <div
            key={service.id}
            className="grid grid-cols-2 items-center gap-x-4 gap-y-1 border-b border-stone-light/50 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`}
                aria-label={`${service.name}: ${s.label}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal">{service.name}</p>
                <p className="font-mono text-[11px] text-charcoal-light">{service.region}</p>
              </div>
            </div>
            <div className="text-right sm:w-16">
              <p className="font-mono text-xs text-charcoal tabular-nums">
                {service.latency_ms != null ? formatDurationMs(service.latency_ms) : '—'}
              </p>
              <p className="text-[11px] text-charcoal-light sm:hidden">{s.label}</p>
            </div>
            <div className="text-right sm:w-20">
              <p className="font-mono text-xs text-charcoal tabular-nums">
                {service.uptime_30d != null ? formatPct(service.uptime_30d, 2) : '—'}
              </p>
              <p className="text-[11px] text-charcoal-light sm:hidden">uptime</p>
            </div>
            <div className="col-span-2 text-left sm:col-span-1 sm:w-24 sm:text-right">
              <p className={`font-mono text-xs tabular-nums ${s.text}`}>{s.label}</p>
              <p className="text-[11px] text-charcoal-light">
                {service.last_checked_at ? formatTimeShort(service.last_checked_at) : '—'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
