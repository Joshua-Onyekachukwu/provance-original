import { useMemo } from 'react'

const ACTION_CONFIG = {
  created: { label: 'CREATED', badgeClass: 'bg-emerald-100 text-emerald-800' },
  updated: { label: 'UPDATED', badgeClass: 'bg-sky-100 text-sky-800' },
  deleted: { label: 'DELETED', badgeClass: 'bg-rose-100 text-rose-800' },
  reviewed: { label: 'REVIEWED', badgeClass: 'bg-amber-100 text-amber-800' },
  system: { label: 'SYSTEM', badgeClass: 'bg-stone-100 text-charcoal-mid' },
  approved: { label: 'APPROVED', badgeClass: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'REJECTED', badgeClass: 'bg-rose-100 text-rose-800' },
  deferred: { label: 'DEFERRED', badgeClass: 'bg-amber-100 text-amber-800' },
  invited: { label: 'INVITED', badgeClass: 'bg-sky-100 text-sky-800' },
}

function getActionConfig(action) {
  // action format like "user.invited" → extract last segment "invited"
  const short = action?.split('.')?.pop() || action
  return ACTION_CONFIG[short] || { label: (action || 'ACTION').toUpperCase(), badgeClass: 'bg-stone-light/50 text-charcoal-mid' }
}

function formatRelativeTime(isoString) {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(isoString).toLocaleDateString()
}

/**
 * ActivityRow — a single audit log entry displayed in the activity feed.
 *
 * Props:
 *   event: { id, action, actor_email, description, resource_name, created_at }
 */
export default function ActivityRow({ event }) {
  const actionConfig = useMemo(() => getActionConfig(event.action), [event.action])

  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      {/* Action badge pill */}
      <span
        className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-1 
          text-[10px] font-medium uppercase tracking-[0.14em] ${actionConfig.badgeClass}`}
      >
        {actionConfig.label}
      </span>

      {/* Actor + description */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-charcoal">
          <span className="font-medium">{event.actor_email || 'system'}</span>
        </p>
        <p className="mt-0.5 text-sm text-charcoal-mid truncate">
          {event.description || event.action}
        </p>
      </div>

      {/* Relative timestamp */}
      <time
        className="flex-shrink-0 text-xs text-charcoal-light tabular-nums whitespace-nowrap"
        dateTime={event.created_at}
      >
        {formatRelativeTime(event.created_at)}
      </time>
    </div>
  )
}
