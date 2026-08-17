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
  // The mock scan dialect uses 'completed' while the analysis pipeline emits
  // 'complete'; both map to the same presentation so a finished scan's badge
  // never falls back to "Awaiting upload".
  completed: {
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
 * hasActiveScanWork — true when any scan is still moving through the pipeline
 * (queued or processing). Terminal statuses (completed / failed) stop the
 * gate, so live surfaces (dashboard ledger, queue page) can pause their
 * status polling once the queue drains.
 */
export function hasActiveScanWork(scans) {
  if (!Array.isArray(scans)) return false
  return scans.some(scanNeedsPolling)
}

/**
 * scanNeedsPolling — single-scan form of hasActiveScanWork: true while the
 * scan is queued or processing. Used by per-detail surfaces (the report
 * detail pane) that poll just one scan until its pipeline finishes. Null /
 * missing input is safe (returns false).
 */
export function scanNeedsPolling(scan) {
  return Boolean(
    scan && (scan?.status === 'queued' || scan?.status === 'processing'),
  )
}

/**
 * queueNeedsPolling — the queue-snapshot twin of hasActiveScanWork: true
 * while any job is queued or processing, so the queue-posture panels keep
 * polling until the queue is idle.
 */
export function queueNeedsPolling(snapshot) {
  return Boolean(
    snapshot &&
      ((snapshot.queued ?? 0) > 0 || (snapshot.processing ?? 0) > 0),
  )
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
  // Confidence-style ratios are 0..1 by contract (SIGNAL_SCHEMA_SPEC). Clamp
  // so a mis-scaled source can never render above 100% — a 0..100 value fed
  // in by mistake shows 100%, not 6900%.
  return `${Math.min(100, decimal * 100).toFixed(digits)}%`
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

// ---------------------------------------------------------------------------
// Verdict palette — the SINGLE source of truth for verdict colors + tones.
//
// Everything that renders a verdict in color derives from this map:
//   - VERDICT_CHART_SEGMENTS → chart bars/arcs (SVG fill + hover readout tint)
//   - VERDICT_META           → Badge tone mapping (success/warning/info)
//   - applyVerdictPalette()  → exports each hex as CSS custom properties
//     (--color-verdict-{key} + a --color-tone-{tone} alias) so ui primitives
//     like Badge's status dot and StatCard's accent border consume the exact
//     color the charts draw instead of re-declaring Tailwind shades.
// Key order = chart stack order (index 0 = bottom of each stacked bar).
// ---------------------------------------------------------------------------
export const VERDICT_PALETTE = {
  authentic: {
    label: 'Authentic',
    hex: '#10b981',
    tone: 'success',
    readoutClass: 'text-emerald-600',
  },
  suspicious: {
    label: 'Suspicious',
    hex: '#f59e0b',
    tone: 'warning',
    readoutClass: 'text-amber-600',
  },
  inconclusive: {
    label: 'Inconclusive',
    hex: '#38bdf8',
    tone: 'info',
    readoutClass: 'text-sky-600',
  },
}

// StackedBarChart segment config for the verdict mix surface — segment order
// is the stack order (index 0 = bottom of each bar). Colors drive the SVG
// fill; readoutClass tints the hover readout text.
export const VERDICT_CHART_SEGMENTS = Object.entries(VERDICT_PALETTE).map(
  ([key, p]) => ({ key, label: p.label, color: p.hex, readoutClass: p.readoutClass }),
)

export const VERDICT_META = Object.fromEntries(
  Object.entries(VERDICT_PALETTE).map(([key, p]) => [key, { label: p.label, tone: p.tone }]),
)

// Semantic-tone → CSS custom property. Only verdict-mapped tones get a var;
// danger/neutral keep the Tailwind scale (no verdict color backs them).
export const TONE_CSS_VARS = {
  success: '--color-tone-success',
  warning: '--color-tone-warning',
  info: '--color-tone-info',
}

/**
 * Mirror the verdict palette into CSS custom properties on <html> so any
 * stylesheet or ui primitive accent (Badge dot, StatCard border, …) consumes
 * the exact chart colors from one source. Call once at app boot
 * (src/main.jsx) before render. No-op outside a browser (safe in node tests).
 */
export function applyVerdictPalette() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [key, p] of Object.entries(VERDICT_PALETTE)) {
    root.style.setProperty(`--color-verdict-${key}`, p.hex)
    const toneVar = TONE_CSS_VARS[p.tone]
    if (toneVar) root.style.setProperty(toneVar, p.hex)
  }
}

// Analysis verdict classes map onto the display vocabulary the mock rows use.
const VERDICT_CLASS_TO_DISPLAY = {
  likely_authentic: 'authentic',
  suspicious: 'suspicious',
  inconclusive: 'inconclusive',
}

/**
 * Resolve a scan's verdict to { label, tone } for Badge presentation.
 * Accepts both status dialects — 'completed' (mock rows) and 'complete'
 * (API rows) — and reads the flat verdict field or result_payload's verdict
 * class. Non-completed scans (or missing verdicts) map to a neutral "Pending".
 */
export function getVerdictMeta(scan) {
  if (!scan || !['completed', 'complete'].includes(scan.status)) {
    return { label: 'Pending', tone: 'neutral' }
  }
  const verdictClass = scan.verdict || scan.result_payload?.verdict?.class || null
  const display = verdictClass
    ? VERDICT_CLASS_TO_DISPLAY[verdictClass] || verdictClass
    : null
  return VERDICT_META[display] || { label: 'Pending', tone: 'neutral' }
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

