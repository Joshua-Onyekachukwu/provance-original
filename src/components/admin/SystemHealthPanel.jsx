import { useState } from 'react'
import HealthCheckRow from './HealthCheckRow.jsx'

/**
 * SystemHealthPanel — displays service health status rows with a refresh button.
 *
 * Props:
 *   healthData:  { api, database, storage, queue, email, lastCheckedAt } (status strings)
 *   error:       string | null
 *   onRefresh:   () => void
 */
export default function SystemHealthPanel({
  healthData,
  error = null,
  onRefresh = null,
}) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setRefreshing(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          System health
        </p>
        <p className="mt-3 text-sm font-medium text-rose-700">Health data unavailable</p>
        <p className="mt-1 text-sm text-charcoal-mid">{error}</p>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="mt-4 rounded-xl border border-stone-light px-4 py-2 text-sm text-charcoal hover:border-charcoal/25 transition"
          >
            Retry health check
          </button>
        )}
      </div>
    )
  }

  if (!healthData) return null

  const checks = [
    { service: 'API', status: healthData.api },
    { service: 'Database', status: healthData.database },
    { service: 'Storage', status: healthData.storage },
    { service: 'Queue', status: healthData.queue },
    { service: 'Email', status: healthData.email },
  ]

  const lastChecked = healthData.lastCheckedAt
    ? new Date(healthData.lastCheckedAt).toLocaleTimeString()
    : null

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
        System health
      </p>

      <div className="mt-4">
        {checks.map((check) => (
          <HealthCheckRow
            key={check.service}
            service={check.service}
            status={refreshing ? 'checking' : check.status}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between">
        {lastChecked && (
          <p className="text-xs text-charcoal-light">
            Last checked: {lastChecked}
          </p>
        )}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl border border-stone-light px-4 py-2 text-sm text-charcoal hover:border-charcoal/25 transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-charcoal"
          >
            {refreshing ? 'Checking…' : 'Refresh checks'}
          </button>
        )}
      </div>
    </div>
  )
}
