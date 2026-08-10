import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useToast } from '../ui'
import { copyText, shareableUrl } from '../../lib/clipboard.js'
import { TEAM_IDS, getTeamMeta } from './scanPresentation.js'

// Dev-only demo params (?state=loading|empty|error, ?noisy=0) must not leak
// into a shared link — a recipient would open the page forced into a demo
// state instead of the live view.
const SHARE_EXCLUDE_KEYS = ['state', 'noisy']

function LinkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/**
 * TeamFilter — pill-chip team scoping for the workspace surfaces (scan
 * ledger, queue, reports) and the admin Users/Organizations/Analytics views.
 * Shows "All teams" plus one chip per workspace team with a live count;
 * selection is a controlled value + onChange pair.
 *
 * A "Copy link" affordance copies the current shareable URL (the active
 * ?team= plus any co-scoped params like ?from= / ?to= / ?state=) so a
 * filtered view can be shared or bookmarked in one click.
 */
export default function TeamFilter({ counts = {}, value = 'all', onChange, label = 'Team' }) {
  const toast = useToast()
  const location = useLocation()
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)

  // Clear any pending "Copied" reset on unmount.
  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0)

  const options = [
    { id: 'all', name: 'All teams', count: total },
    ...TEAM_IDS.map((id) => {
      const meta = getTeamMeta(id)
      return { id, name: meta.short, count: counts[id] || 0, fullName: meta.name }
    }),
  ]

  const handleCopyLink = async () => {
    // Copy the current view as a shareable link: ?team= plus any real filters
    // (?from= / ?to=), but never the dev-only demo params.
    const ok = await copyText(shareableUrl(location.pathname, location.search, SHARE_EXCLUDE_KEYS))
    if (ok) {
      setCopied(true)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
      toast.success('Shareable link copied to clipboard')
    } else {
      toast.error('Could not copy the link')
    }
  }

  return (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-1.5">
      <span className="pr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
        {label}
      </span>
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={option.fullName || option.name}
            onClick={() => onChange(option.id)}
            className={`ui-focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? 'border-charcoal bg-charcoal text-parchment'
                : 'border-stone-light bg-parchment text-charcoal-mid hover:border-charcoal/30 hover:text-charcoal'
            }`}
          >
            {option.name}
            <span className={`tabular-nums ${active ? 'text-parchment/60' : 'text-charcoal-light'}`}>
              {option.count}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        aria-label={copied ? 'Shareable link copied' : 'Copy shareable link'}
        title="Copy the current filtered view as a shareable link"
        onClick={handleCopyLink}
        className={`ui-focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
          copied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-stone-light bg-white-warm text-charcoal-mid hover:border-charcoal/30 hover:text-charcoal'
        }`}
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}
