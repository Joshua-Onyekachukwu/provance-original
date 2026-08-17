/**
 * healthStatus — shared status vocabulary for system health checks.
 *
 * Split into its own module (not exported from a .jsx component file) so
 * fast refresh stays intact; mirrors the popoverOrigin / commandRegistry
 * pattern. Consumed by ServiceStatusList (the legacy HealthCheckRow was
 * archived with the other superseded admin components).
 */
export const STATUS_CONFIG = {
  operational: { dot: 'bg-emerald-500', label: 'Operational', text: 'text-emerald-700' },
  unreachable: { dot: 'bg-rose-500', label: 'Unreachable', text: 'text-rose-700' },
  degraded: { dot: 'bg-amber-500', label: 'Degraded', text: 'text-amber-700' },
  not_configured: { dot: 'bg-stone-400', label: 'Not configured', text: 'text-charcoal-mid' },
  checking: { dot: 'bg-sky-400 animate-pulse', label: 'Checking…', text: 'text-sky-600' },
}
