import { Link } from 'react-router-dom'
import { scanQuotaPct } from '../lib/scanQuota.js'

/**
 * ScanQuotaWarningChip — workspace-level banner linking to Billing when the
 * workspace is at or above 85% of its monthly scan quota. Shared by the
 * dashboard hero and the Uploads page (the surface where the user actually
 * hits the limit), so both surfaces agree on the same resolveUsage source of
 * truth. Tones escalate: 85–99% warning, 100%+ danger (exhausted).
 *
 * Renders nothing until the quota reaches the warning threshold, so callers
 * can place it unconditionally and it stays invisible during loading/error
 * (usage is null).
 */
export default function ScanQuotaWarningChip({ usage }) {
  const pct = scanQuotaPct(usage)
  if (pct == null || pct < 85) return null

  const exhausted = pct >= 100
  const tone = exhausted ? 'danger' : 'warning'
  const toneClasses = {
    warning: 'border-amber-300/60 bg-amber-50 text-amber-800',
    danger: 'border-rose-300/60 bg-rose-50 text-rose-800',
  }

  return (
    <Link
      to="/app/billing"
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors hover:brightness-[0.98] ${toneClasses[tone]}`}
    >
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      {exhausted
        ? 'Monthly scan quota exhausted — view billing'
        : `${pct}% of monthly scan quota used — view billing`}
    </Link>
  )
}
