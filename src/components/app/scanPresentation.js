export const SCAN_STATUS_META = {
  awaiting_upload: {
    label: 'Awaiting upload',
    badge: 'bg-stone-light text-charcoal',
    tone: 'text-charcoal-mid',
  },
  queued: {
    label: 'Queued',
    badge: 'bg-sky-50 text-sky-700',
    tone: 'text-sky-700',
  },
  processing: {
    label: 'Processing',
    badge: 'bg-sky-50 text-sky-700',
    tone: 'text-sky-700',
  },
  complete: {
    label: 'Complete',
    badge: 'bg-emerald-50 text-emerald-700',
    tone: 'text-emerald-700',
  },
  failed: {
    label: 'Failed',
    badge: 'bg-rose-50 text-rose-700',
    tone: 'text-rose-700',
  },
}

export function getScanStatusMeta(status) {
  return SCAN_STATUS_META[status] || SCAN_STATUS_META.awaiting_upload
}

/**
 * formatRelativeTime — compact human "x ago" label for timestamps.
 *
 * Shared home for the per-file copies that previously lived in
 * AppShellLayout, AppDashboardPage, AppNotificationsPage, AppSecurityPage,
 * and admin/ActivityRow. Returns '' for missing values, "just now" under a
 * minute, m/h/d suffixes up to a week, then a locale date.
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return formatDate(isoString)
}

/**
 * formatCount — compact number label ("18.7K", "4.1M") with an em-dash
 * fallback for missing values. Shared by the Billing and API Keys pages.
 */
export function formatCount(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/**
 * formatDate — medium date ("Jul 31, 2026") pinned to en-US with a
 * configurable fallback for missing values. The locale is fixed (matching
 * every other date formatter in this module) so output never shifts with the
 * viewer's browser locale. Shared by Billing, API Keys, and admin Users.
 */
export function formatDate(value, fallback = '—') {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(timestamp)
}

/**
 * formatPct — ratio (0..1) to a percentage string ("94%"). The shared
 * canonical form replaces the duplicated Dashboard / admin Overview versions;
 * Billing's used/limit variant is a separate `percentOf` helper below.
 */
export function formatPct(decimal, digits = 0, fallback = '—') {
  if (decimal == null || !Number.isFinite(decimal)) return fallback
  return `${(decimal * 100).toFixed(digits)}%`
}

/**
 * percentOf — used/limit ratio clamped to a 0..100 integer, for meter widths
 * and tone thresholds (Billing usage meters).
 */
export function percentOf(used, limit) {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * parseTimestamp — shared validation for all date formatters. Returns a
 * usable Date or null for null/empty/invalid input.
 */
function parseTimestamp(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? null : timestamp
}

/**
 * formatDateTime — medium date + short time ("Jul 31, 2026, 3:45 PM") with a
 * configurable fallback. Canonical form replacing the duplicated UsersPage /
 * ReportPrint local versions; the ReportPrint variant differs only in its
 * 'Not available' fallback, and UsersPage's differs only in a 2-digit hour.
 */
export function formatDateTime(value, fallback = '—') {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

/**
 * formatScanTimestamp — formatDateTime with the legacy 'Not available'
 * fallback, kept as the canonical scan-timestamp surface for scan lists.
 */
export function formatScanTimestamp(value) {
  return formatDateTime(value, 'Not available')
}

/**
 * formatShortDate — short month + day ("Jul 22") for chart axes and compact
 * labels. Shared by the analytics trend chart (previously 3 inline copies).
 */
export function formatShortDate(value, fallback = '—') {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp)
}

/**
 * formatDateLong — full month name date ("July 31, 2026") for detail views.
 */
export function formatDateLong(value, fallback = '—') {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(timestamp)
}

/**
 * formatTimeShort — time-only ("3:45 PM") for last-updated/last-checked labels.
 */
export function formatTimeShort(value, fallback = '—') {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short',
  }).format(timestamp)
}

/**
 * formatHourShort — hour-only 12-hour label ("9 AM") for hourly chart axes.
 * Compact sibling of formatTimeShort for hour-granularity surfaces.
 */
export function formatHourShort(value, fallback = '—') {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return fallback
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
  }).format(timestamp)
}

export function formatCurrency(amountUsd, fallback = '—') {
  if (!Number.isFinite(amountUsd)) return fallback
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountUsd)
}

/**
 * formatDurationMs — human-readable duration ("850ms", "2.5s") with an
 * em-dash fallback. Shared by the queue surfaces (admin snapshot + user
 * dashboard + queue page).
 */
export function formatDurationMs(ms) {
  if (!Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * formatStorageGb — storage volume ("18.4 GB", "1.2 TB") with an em-dash
 * fallback. Shared by the admin org surfaces and analytics page.
 */
export function formatStorageGb(gb) {
  if (!Number.isFinite(gb)) return '—'
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
  return `${gb.toFixed(1)} GB`
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function getVerdictLabel(scan) {
  return scan?.result_payload?.verdict?.display_label || 'Pending'
}

export const VERDICT_META = {
  authentic: { label: 'Authentic', tone: 'success' },
  suspicious: { label: 'Suspicious', tone: 'warning' },
  inconclusive: { label: 'Inconclusive', tone: 'info' },
}

/**
 * Resolve a scan's verdict to { label, tone } for Badge presentation.
 * Non-completed scans (or missing verdicts) map to a neutral "Pending".
 */
export function getVerdictMeta(scan) {
  if (!scan || scan.status !== 'completed') {
    return { label: 'Pending', tone: 'neutral' }
  }
  return VERDICT_META[scan.verdict] || { label: 'Pending', tone: 'neutral' }
}

/**
 * TEAM_META — workspace team registry for team-scoped surfaces (scan ledger,
 * queue, reports). Mirror of mockOrgTeams in mockData.js; tones map onto the
 * ui Badge palette (neutral | success | info | warning | danger).
 */
export const TEAM_META = {
  team_legal: { name: 'Legal & Compliance', short: 'Legal', tone: 'info' },
  team_product: { name: 'Product & Engineering', short: 'Product', tone: 'neutral' },
  team_growth: { name: 'Growth & Marketing', short: 'Growth', tone: 'success' },
}

export const TEAM_IDS = Object.keys(TEAM_META)

/**
 * Resolve a team id to { name, short, tone } for Badge/filter presentation.
 * Unknown ids map to a neutral "Unassigned" so nothing renders blank.
 */
export function getTeamMeta(teamId) {
  return TEAM_META[teamId] || { name: 'Unassigned', short: '—', tone: 'neutral' }
}

