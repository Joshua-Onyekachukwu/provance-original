import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatCount,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatDurationMs,
  formatFileSize,
  formatHourShort,
  formatPct,
  formatRelativeTime,
  formatScanTimestamp,
  formatShortDate,
  formatStorageGb,
  formatTimeShort,
  getScanStatusMeta,
  getTeamMeta,
  getVerdictMeta,
  hasActiveScanWork,
  percentOf,
  queueNeedsPolling,
  scanNeedsPolling,
  SCAN_STATUS_META,
  TONE_CSS_VARS,
  VERDICT_CHART_SEGMENTS,
  VERDICT_META,
  VERDICT_PALETTE,
  applyVerdictPalette,
} from './scanPresentation.js'

// ---------------------------------------------------------------------------
// formatCount — compact numbers with an em-dash fallback
// ---------------------------------------------------------------------------

describe('formatCount', () => {
  it('returns an em-dash for null and undefined', () => {
    expect(formatCount(null)).toBe('—')
    expect(formatCount(undefined)).toBe('—')
  })

  it('formats small numbers without a suffix', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
  })

  it('hits the compaction boundary at 1000', () => {
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1000)).toBe('1K')
  })

  it('compacts thousands with one decimal', () => {
    expect(formatCount(1200)).toBe('1.2K')
    expect(formatCount(18700)).toBe('18.7K')
  })

  it('compacts millions', () => {
    expect(formatCount(4100000)).toBe('4.1M')
  })

  it('returns an em-dash for non-finite input', () => {
    expect(formatCount(NaN)).toBe('—')
    expect(formatCount(Infinity)).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// formatDate — medium locale date with a configurable fallback
// ---------------------------------------------------------------------------

function mediumDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

describe('formatDate', () => {
  it('returns the fallback for missing values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatDate(null, 'N/A')).toBe('N/A')
  })

  it('renders a medium date for ISO strings and Date objects', () => {
    const iso = '2026-07-24T12:00:00Z'
    expect(formatDate(iso)).toBe(mediumDate(iso))
    expect(formatDate(new Date(iso))).toBe(mediumDate(iso))
  })

  it('returns the fallback for invalid date strings instead of throwing', () => {
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatDate('not-a-date', 'Pending')).toBe('Pending')
  })

  it('pins the en-US medium-date contract (locale-independent)', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      function MockDateTimeFormat() {
        return { format: () => 'Jul 24, 2026' }
      },
    )

    expect(formatDate('2026-07-24T12:00:00Z')).toBe('Jul 24, 2026')
    expect(spy).toHaveBeenCalledWith('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

    spy.mockRestore()
  })

  it('rejects non-string, non-Date values', () => {
    expect(formatDate(0)).toBe('—')
    expect(formatDate(false)).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// formatPct — ratio to percentage string with a fallback
// ---------------------------------------------------------------------------

describe('formatPct', () => {
  it('returns the fallback for null, undefined, and non-finite input', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatPct(undefined)).toBe('—')
    expect(formatPct(NaN)).toBe('—')
    expect(formatPct('not-a-number')).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatPct(NaN, 0, 'Pending')).toBe('Pending')
  })

  it('formats ratios as whole percentages by default', () => {
    expect(formatPct(0.94)).toBe('94%')
    expect(formatPct(0.25)).toBe('25%')
    expect(formatPct(1)).toBe('100%')
  })

  it('handles zero and tiny ratios', () => {
    expect(formatPct(0)).toBe('0%')
    expect(formatPct(0.0001)).toBe('0%')
    expect(formatPct(0.0009, 2)).toBe('0.09%')
  })


  it('rounds to the nearest digit boundary', () => {
    expect(formatPct(1 / 3)).toBe('33%')
    expect(formatPct(2 / 3)).toBe('67%')
    expect(formatPct(0.996, 0)).toBe('100%')
  })

  it('returns the fallback for Infinity and negative zero hazards', () => {
    expect(formatPct(Infinity)).toBe('—')
    expect(formatPct(-Infinity)).toBe('—')
    expect(formatPct(-0)).toBe('0%')
  })

  it('supports decimal digits and zero-padding', () => {
    expect(formatPct(0.956, 1)).toBe('95.6%')
    expect(formatPct(0.125, 2)).toBe('12.50%')
  })

  it('clamps values above 1 so nothing ever renders over 100%', () => {
    // Founder requirement: no percentage may read above 100%. A 0..100
    // value fed in by mistake (the old mock scale) must show 100%, not
    // 6900% — the 0..1 contract is multiplied by 100 and capped.
    expect(formatPct(1.5)).toBe('100%')
    expect(formatPct(69)).toBe('100%')
    expect(formatPct(1)).toBe('100%')
    expect(formatPct(0.94)).toBe('94%')
    // Only the top is clamped; a negative ratio is out-of-contract and stays
    // visible so a scale bug upstream is still noticeable.
    expect(formatPct(-0.25)).toBe('-25%')
  })
})

// ---------------------------------------------------------------------------
// percentOf — used/limit ratio clamped to a 0..100 integer
// ---------------------------------------------------------------------------

describe('percentOf', () => {
  it('returns 0 when the limit is missing or zero', () => {
    expect(percentOf(50, 0)).toBe(0)
    expect(percentOf(50, null)).toBe(0)
    expect(percentOf(50, undefined)).toBe(0)
  })

  it('returns 0 when nothing is used', () => {
    expect(percentOf(0, 100)).toBe(0)
  })

  it('computes simple ratios', () => {
    expect(percentOf(50, 200)).toBe(25)
    expect(percentOf(150, 200)).toBe(75)
    expect(percentOf(200, 200)).toBe(100)
  })

  it('clamps at 100 when usage exceeds the limit', () => {
    expect(percentOf(300, 200)).toBe(100)
  })

  it('rounds fractional ratios to the nearest integer', () => {
    expect(percentOf(1, 3)).toBe(33)
    expect(percentOf(2, 3)).toBe(67)
  })

  it('does not clamp below zero (documented behavior)', () => {
    expect(percentOf(-25, 100)).toBe(-25)
  })
})

// ---------------------------------------------------------------------------
// formatHourShort — hour-only 12-hour labels for hourly axes
// ---------------------------------------------------------------------------

describe('formatHourShort', () => {
  it('returns the fallback for missing and invalid values', () => {
    expect(formatHourShort(null)).toBe('—')
    expect(formatHourShort(undefined)).toBe('—')
    expect(formatHourShort('not-a-date')).toBe('—')
  })

  it('formats 12-hour labels without leading zeros', () => {
    // Local-time constructors keep the assertions deterministic in any TZ.
    expect(formatHourShort(new Date(2026, 6, 24, 9, 0))).toBe('9 AM')
    expect(formatHourShort(new Date(2026, 6, 24, 15, 0))).toBe('3 PM')
    expect(formatHourShort(new Date(2026, 6, 24, 0, 0))).toBe('12 AM')
    expect(formatHourShort(new Date(2026, 6, 24, 12, 0))).toBe('12 PM')
  })

  it('returns the fallback for empty and non-date primitives', () => {
    expect(formatHourShort('')).toBe('—')
    expect(formatHourShort(0)).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatHourShort('junk', 'Pending')).toBe('Pending')
  })

  it('labels hour-granularity regardless of the minute component', () => {
    expect(formatHourShort(new Date(2026, 6, 24, 9, 45))).toBe('9 AM')
    expect(formatHourShort(new Date(2026, 6, 24, 23, 59))).toBe('11 PM')
  })
})

// ---------------------------------------------------------------------------
// formatRelativeTime — compact "x ago" labels
// ---------------------------------------------------------------------------

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString()

  it('returns an empty string for missing values', () => {
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime('')).toBe('')
  })

  it('labels sub-minute diffs as "just now"', () => {
    expect(formatRelativeTime(iso(30_000))).toBe('just now')
  })

  it('labels minute, hour, and day diffs with suffixes', () => {
    expect(formatRelativeTime(iso(5 * 60_000))).toBe('5m ago')
    expect(formatRelativeTime(iso(3 * 3_600_000))).toBe('3h ago')
    expect(formatRelativeTime(iso(2 * 86_400_000))).toBe('2d ago')
  })

  it('hits the exact unit boundaries', () => {
    expect(formatRelativeTime(iso(60_000))).toBe('1m ago')
    expect(formatRelativeTime(iso(3_600_000))).toBe('1h ago')
    expect(formatRelativeTime(iso(86_400_000))).toBe('1d ago')
  })

  it('falls back to the shared pinned date format past a week', () => {
    const oldIso = iso(10 * 86_400_000)
    expect(formatRelativeTime(oldIso)).toBe(formatDate(oldIso))
  })
})

// ---------------------------------------------------------------------------
// formatDateTime — medium date + short time, pinned en-US
// ---------------------------------------------------------------------------

describe('formatDateTime', () => {
  it('returns the fallback for missing and invalid values', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('')).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatDateTime('not-a-date', 'Not available')).toBe('Not available')
  })

  it('renders medium date + short time for local-time constructors (TZ-deterministic)', () => {
    expect(formatDateTime(new Date(2026, 6, 24, 15, 45))).toBe('Jul 24, 2026, 3:45 PM')
    expect(formatDateTime(new Date(2026, 6, 24, 9, 5))).toBe('Jul 24, 2026, 9:05 AM')
  })

  it('renders for ISO strings via the en-US contract', () => {
    const iso = '2026-07-24T12:00:00Z'
    const expected = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
    expect(formatDateTime(iso)).toBe(expected)
  })

  it('rejects non-string, non-Date values', () => {
    expect(formatDateTime(0)).toBe('—')
    expect(formatDateTime(false)).toBe('—')
  })

  it('renders midnight and noon with the 12-hour zero-padded time', () => {
    expect(formatDateTime(new Date(2026, 6, 24, 0, 0))).toBe('Jul 24, 2026, 12:00 AM')
    expect(formatDateTime(new Date(2026, 6, 24, 12, 0))).toBe('Jul 24, 2026, 12:00 PM')
  })

  it('pins the en-US medium-date + short-time contract (locale-independent)', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      function MockDateTimeFormat() {
        return { format: () => 'Jul 24, 2026, 3:45 PM' }
      },
    )

    expect(formatDateTime('2026-07-24T15:45:00Z')).toBe('Jul 24, 2026, 3:45 PM')
    expect(spy).toHaveBeenCalledWith('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// formatScanTimestamp — formatDateTime with the 'Not available' fallback
// ---------------------------------------------------------------------------

describe('formatScanTimestamp', () => {
  it('uses the legacy Not available fallback', () => {
    expect(formatScanTimestamp(null)).toBe('Not available')
    expect(formatScanTimestamp('not-a-date')).toBe('Not available')
  })

  it('delegates to the shared datetime rendering', () => {
    expect(formatScanTimestamp(new Date(2026, 6, 24, 15, 45))).toBe(
      formatDateTime(new Date(2026, 6, 24, 15, 45)),
    )
  })
})

// ---------------------------------------------------------------------------
// formatDateLong — full month name date, pinned en-US
// ---------------------------------------------------------------------------

describe('formatDateLong', () => {
  it('returns the fallback for missing and invalid values', () => {
    expect(formatDateLong(null)).toBe('—')
    expect(formatDateLong('not-a-date')).toBe('—')
  })

  it('renders the long month name', () => {
    expect(formatDateLong(new Date(2026, 6, 24))).toBe('July 24, 2026')
    expect(formatDateLong(new Date(2026, 0, 5))).toBe('January 5, 2026')
  })

  it('returns the fallback for undefined, empty, and non-date primitives', () => {
    expect(formatDateLong(undefined)).toBe('—')
    expect(formatDateLong('')).toBe('—')
    expect(formatDateLong(0)).toBe('—')
    expect(formatDateLong(false)).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatDateLong('junk', 'Pending')).toBe('Pending')
  })

  it('renders a Date object at the year boundary', () => {
    expect(formatDateLong(new Date(2026, 11, 31))).toBe('December 31, 2026')
  })
})

// ---------------------------------------------------------------------------
// formatTimeShort — time-only, pinned en-US
// ---------------------------------------------------------------------------

describe('formatTimeShort', () => {
  it('returns the fallback for missing and invalid values', () => {
    expect(formatTimeShort(null)).toBe('—')
    expect(formatTimeShort('not-a-date')).toBe('—')
  })

  it('renders 12-hour time without leading zeros', () => {
    expect(formatTimeShort(new Date(2026, 6, 24, 15, 45))).toBe('3:45 PM')
    expect(formatTimeShort(new Date(2026, 6, 24, 0, 5))).toBe('12:05 AM')
  })

  it('returns the fallback for undefined, empty, and non-date primitives', () => {
    expect(formatTimeShort(undefined)).toBe('—')
    expect(formatTimeShort('')).toBe('—')
    expect(formatTimeShort(0)).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatTimeShort('junk', 'Pending')).toBe('Pending')
  })

  it('renders noon with the 12-hour cycle', () => {
    expect(formatTimeShort(new Date(2026, 6, 24, 12, 0))).toBe('12:00 PM')
  })
})

// ---------------------------------------------------------------------------
// formatShortDate — short month + day, pinned en-US
// ---------------------------------------------------------------------------

describe('formatShortDate', () => {
  it('returns the fallback for missing and invalid values', () => {
    expect(formatShortDate(null)).toBe('—')
    expect(formatShortDate('not-a-date')).toBe('—')
  })

  it('renders the short month + day', () => {
    expect(formatShortDate(new Date(2026, 6, 24))).toBe('Jul 24')
    expect(formatShortDate(new Date(2026, 11, 1))).toBe('Dec 1')
  })

  it('honors a custom fallback', () => {
    expect(formatShortDate('junk', 'Pending')).toBe('Pending')
  })
})

// ---------------------------------------------------------------------------
// formatCurrency — whole-dollar USD with an em-dash fallback
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('returns the fallback for missing and non-finite input', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency(NaN)).toBe('—')
    expect(formatCurrency(Infinity)).toBe('—')
  })

  it('honors a custom fallback', () => {
    expect(formatCurrency(NaN, 'N/A')).toBe('N/A')
  })

  it('formats whole dollars with grouping', () => {
    expect(formatCurrency(0)).toBe('$0')
    expect(formatCurrency(1234)).toBe('$1,234')
    expect(formatCurrency(1_000_000)).toBe('$1,000,000')
  })

  it('rounds fractional amounts to whole dollars', () => {
    expect(formatCurrency(1234.6)).toBe('$1,235')
    expect(formatCurrency(9.2)).toBe('$9')
  })

  it('renders negative amounts with a leading minus', () => {
    expect(formatCurrency(-1234)).toBe('-$1,234')
  })

  it('rejects numeric strings instead of coercing them', () => {
    expect(formatCurrency('1234')).toBe('—')
  })

  it('rounds half-away-from-zero at the whole-dollar boundary', () => {
    expect(formatCurrency(999.5)).toBe('$1,000')
    expect(formatCurrency(1234.5)).toBe('$1,235')
  })

  it('passes negative zero through (behavior pin)', () => {
    // ICU renders -0 with its sign; callers never feed negative zero, but the
    // output is pinned so a future Intl behavior change becomes visible.
    expect(formatCurrency(-0)).toBe('-$0')
  })
})

// ---------------------------------------------------------------------------
// formatDurationMs — ms / seconds human-readable label
// ---------------------------------------------------------------------------

describe('formatDurationMs', () => {
  it('returns an em-dash for missing and non-finite input', () => {
    expect(formatDurationMs(null)).toBe('—')
    expect(formatDurationMs(undefined)).toBe('—')
    expect(formatDurationMs(NaN)).toBe('—')
    expect(formatDurationMs(Infinity)).toBe('—')
    expect(formatDurationMs('fast')).toBe('—')
  })

  it('labels sub-second values in milliseconds', () => {
    expect(formatDurationMs(0)).toBe('0ms')
    expect(formatDurationMs(850)).toBe('850ms')
    expect(formatDurationMs(999)).toBe('999ms')
  })

  it('switches to seconds at the 1s boundary', () => {
    expect(formatDurationMs(1000)).toBe('1.0s')
    expect(formatDurationMs(2500)).toBe('2.5s')
    expect(formatDurationMs(60_000)).toBe('60.0s')
  })

  it('rounds sub-second values to whole ms', () => {
    expect(formatDurationMs(850.4)).toBe('850ms')
    // Behavior pin: the < 1000 branch runs before Math.round, so 999.6ms
    // renders as "1000ms" (not "1.0s"). Intentional — do not "fix".
    expect(formatDurationMs(999.6)).toBe('1000ms')
  })

  it('rounds second-scale values to one decimal', () => {
    expect(formatDurationMs(2499.6)).toBe('2.5s')
    expect(formatDurationMs(1999.4)).toBe('2.0s')
  })

  it('labels negative durations in the ms branch below 1000 (behavior pin)', () => {
    expect(formatDurationMs(-500)).toBe('-500ms')
    expect(formatDurationMs(-1500)).toBe('-1500ms')
  })

  it('collapses sub-ms fractions to 0ms', () => {
    expect(formatDurationMs(0.4)).toBe('0ms')
  })
})

// ---------------------------------------------------------------------------
// formatStorageGb — GB / TB human-readable label
// ---------------------------------------------------------------------------

describe('formatStorageGb', () => {
  it('returns an em-dash for missing and non-finite input', () => {
    expect(formatStorageGb(null)).toBe('—')
    expect(formatStorageGb(undefined)).toBe('—')
    expect(formatStorageGb(NaN)).toBe('—')
  })

  it('formats gigabytes with one decimal', () => {
    expect(formatStorageGb(0)).toBe('0.0 GB')
    expect(formatStorageGb(18.4)).toBe('18.4 GB')
    expect(formatStorageGb(999.9)).toBe('999.9 GB')
  })

  it('switches to terabytes at 1000 GB', () => {
    expect(formatStorageGb(1000)).toBe('1.0 TB')
    expect(formatStorageGb(1234.5)).toBe('1.2 TB')
  })

  it('returns an em-dash for Infinity', () => {
    expect(formatStorageGb(Infinity)).toBe('—')
  })

  it('rounds GB at the toFixed boundary before the TB switch', () => {
    // 999.96 stays in the GB branch (the >= 1000 check runs pre-rounding),
    // so it renders as "1000.0 GB" — not "1.0 TB". Intentional.
    expect(formatStorageGb(999.96)).toBe('1000.0 GB')
    expect(formatStorageGb(999.94)).toBe('999.9 GB')
  })

  it('rounds TB values to one decimal', () => {
    expect(formatStorageGb(1999.96)).toBe('2.0 TB')
  })

  it('passes negative values through (behavior pin)', () => {
    expect(formatStorageGb(-5)).toBe('-5.0 GB')
  })
})

// ---------------------------------------------------------------------------
// formatFileSize — bytes to B/KB/MB/GB label
// ---------------------------------------------------------------------------

describe('formatFileSize', () => {
  it('returns Unknown size for missing, non-finite, and zero/negative input', () => {
    expect(formatFileSize(null)).toBe('Unknown size')
    expect(formatFileSize(undefined)).toBe('Unknown size')
    expect(formatFileSize(NaN)).toBe('Unknown size')
    expect(formatFileSize(0)).toBe('Unknown size')
    expect(formatFileSize(-5)).toBe('Unknown size')
  })

  it('labels bytes without a decimal', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(999)).toBe('999 B')
  })

  it('steps through KB/MB/GB at 1024 boundaries', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3.0 GB')
  })

  it('rounds fractional units to one decimal', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })

  it('caps the unit ladder at GB (documented behavior)', () => {
    // The unit list stops at GB, so values >= 1 TiB render as large GB
    // rather than escalating further.
    expect(formatFileSize(2 * 1024 * 1024 * 1024 * 1024)).toBe('2048.0 GB')
  })

  it('returns Unknown size for Infinity', () => {
    expect(formatFileSize(Infinity)).toBe('Unknown size')
  })

  it('rounds fractional bytes at the whole-byte boundary', () => {
    expect(formatFileSize(999.5)).toBe('1000 B')
    expect(formatFileSize(1023.6)).toBe('1024 B')
  })

  it('stays in KB just below the MB step', () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB')
  })
})

// ---------------------------------------------------------------------------
// getScanStatusMeta — status badge vocabulary, both dialects
// ---------------------------------------------------------------------------

describe('getScanStatusMeta', () => {
  it("maps the API 'complete' dialect to the Complete presentation", () => {
    const meta = getScanStatusMeta('complete')
    expect(meta.label).toBe('Complete')
  })

  it("maps the mock 'completed' dialect to the same Complete presentation", () => {
    const api = getScanStatusMeta('complete')
    const mock = getScanStatusMeta('completed')
    expect(mock.label).toBe('Complete')
    expect(mock.badge).toBe(api.badge)
  })

  it('passes through queued, processing, and failed', () => {
    expect(getScanStatusMeta('queued').label).toBe('Queued')
    expect(getScanStatusMeta('processing').label).toBe('Processing')
    expect(getScanStatusMeta('failed').label).toBe('Failed')
  })

  it('falls back to awaiting_upload for unknown statuses', () => {
    expect(getScanStatusMeta('banana').label).toBe('Awaiting upload')
    expect(getScanStatusMeta(undefined).label).toBe('Awaiting upload')
  })

  it('falls back for null, empty, and non-string statuses', () => {
    expect(getScanStatusMeta(null).label).toBe('Awaiting upload')
    expect(getScanStatusMeta('').label).toBe('Awaiting upload')
    expect(getScanStatusMeta(42).label).toBe('Awaiting upload')
  })

  it('returns the exact awaiting_upload meta object on fallback', () => {
    // Badge + tone must ride along with the label so an unknown status never
    // renders with a mismatched presentation.
    expect(getScanStatusMeta('banana')).toEqual(SCAN_STATUS_META.awaiting_upload)
  })
})

// ---------------------------------------------------------------------------
// hasActiveScanWork / queueNeedsPolling — polling gates for live surfaces
// ---------------------------------------------------------------------------

describe('hasActiveScanWork', () => {
  it('returns false for missing and non-array input', () => {
    expect(hasActiveScanWork(null)).toBe(false)
    expect(hasActiveScanWork(undefined)).toBe(false)
    expect(hasActiveScanWork('nope')).toBe(false)
    expect(hasActiveScanWork([])).toBe(false)
  })

  it('is true while any scan is queued or processing', () => {
    expect(hasActiveScanWork([{ status: 'queued' }])).toBe(true)
    expect(hasActiveScanWork([{ status: 'processing' }, { status: 'completed' }])).toBe(true)
  })

  it('is false once every scan is terminal', () => {
    expect(hasActiveScanWork([{ status: 'completed' }, { status: 'failed' }])).toBe(false)
    expect(hasActiveScanWork([{ status: 'awaiting_upload' }])).toBe(false)
  })

  it('tolerates rows missing a status', () => {
    expect(hasActiveScanWork([{ id: 'x' }, { status: 'queued' }])).toBe(true)
    expect(hasActiveScanWork([{ id: 'x' }])).toBe(false)
  })
})

describe('scanNeedsPolling', () => {
  it('returns false for missing and non-scan input', () => {
    expect(scanNeedsPolling(null)).toBe(false)
    expect(scanNeedsPolling(undefined)).toBe(false)
    expect(scanNeedsPolling({})).toBe(false)
  })

  it('is true while the scan is queued or processing', () => {
    expect(scanNeedsPolling({ status: 'queued' })).toBe(true)
    expect(scanNeedsPolling({ status: 'processing' })).toBe(true)
  })

  it('is false once the scan is terminal', () => {
    expect(scanNeedsPolling({ status: 'completed' })).toBe(false)
    expect(scanNeedsPolling({ status: 'complete' })).toBe(false)
    expect(scanNeedsPolling({ status: 'failed' })).toBe(false)
    expect(scanNeedsPolling({ status: 'awaiting_upload' })).toBe(false)
  })

  it('is false for a scan missing a status', () => {
    expect(scanNeedsPolling({ id: 'x' })).toBe(false)
  })
})

describe('queueNeedsPolling', () => {
  it('returns false for missing input and idle snapshots', () => {
    expect(queueNeedsPolling(null)).toBe(false)
    expect(queueNeedsPolling(undefined)).toBe(false)
    expect(queueNeedsPolling({})).toBe(false)
    expect(queueNeedsPolling({ queued: 0, processing: 0, failed: 3 })).toBe(false)
  })

  it('is true while any job is queued or processing', () => {
    expect(queueNeedsPolling({ queued: 1, processing: 0, failed: 0 })).toBe(true)
    expect(queueNeedsPolling({ queued: 0, processing: 2, failed: 1 })).toBe(true)
  })

  it('treats missing count fields as zero', () => {
    expect(queueNeedsPolling({ queued: undefined, processing: 1 })).toBe(true)
    expect(queueNeedsPolling({ queued: null, processing: 0 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getVerdictMeta — verdict badge resolution across row dialects
// ---------------------------------------------------------------------------

describe('getVerdictMeta', () => {
  it('returns Pending for null and non-completed scans', () => {
    expect(getVerdictMeta(null)).toEqual({ label: 'Pending', tone: 'neutral' })
    expect(
      getVerdictMeta({ status: 'queued', verdict: 'authentic' }),
    ).toEqual({ label: 'Pending', tone: 'neutral' })
  })

  it('resolves the flat mock verdict field', () => {
    expect(
      getVerdictMeta({ status: 'completed', verdict: 'suspicious' }),
    ).toEqual({ label: 'Suspicious', tone: 'warning' })
  })

  it('resolves the API verdict class from result_payload', () => {
    expect(
      getVerdictMeta({
        status: 'complete',
        result_payload: { verdict: { class: 'likely_authentic' } },
      }),
    ).toEqual({ label: 'Authentic', tone: 'success' })
    expect(
      getVerdictMeta({
        status: 'completed',
        result_payload: { verdict: { class: 'inconclusive' } },
      }),
    ).toEqual({ label: 'Inconclusive', tone: 'info' })
  })

  it('prefers the flat verdict over the payload class when both exist', () => {
    expect(
      getVerdictMeta({
        status: 'completed',
        verdict: 'suspicious',
        result_payload: { verdict: { class: 'likely_authentic' } },
      }),
    ).toEqual({ label: 'Suspicious', tone: 'warning' })
  })

  it('returns Pending for a completed scan with no verdict', () => {
    expect(getVerdictMeta({ status: 'completed', verdict: null })).toEqual({
      label: 'Pending',
      tone: 'neutral',
    })
  })

  it('returns Pending for a completed scan with no payload at all', () => {
    expect(getVerdictMeta({ status: 'complete' })).toEqual({ label: 'Pending', tone: 'neutral' })
    expect(getVerdictMeta({ status: 'completed', result_payload: {} })).toEqual({
      label: 'Pending',
      tone: 'neutral',
    })
  })

  it('returns Pending for an empty-string verdict', () => {
    expect(getVerdictMeta({ status: 'completed', verdict: '' })).toEqual({
      label: 'Pending',
      tone: 'neutral',
    })
  })

  it('returns Pending when the verdict class is unknown', () => {
    // Unknown classes pass through the display map but miss VERDICT_META,
    // so they degrade to the neutral Pending badge rather than crashing.
    expect(getVerdictMeta({ status: 'completed', verdict: 'weird_class' })).toEqual({
      label: 'Pending',
      tone: 'neutral',
    })
    expect(
      getVerdictMeta({
        status: 'complete',
        result_payload: { verdict: { class: 'mystery' } },
      }),
    ).toEqual({ label: 'Pending', tone: 'neutral' })
  })

  it('ignores the payload verdict until the scan is completed', () => {
    // A queued scan carrying a payload verdict must still show Pending —
    // verdicts are only meaningful once the pipeline finished.
    expect(
      getVerdictMeta({
        status: 'processing',
        verdict: 'suspicious',
        result_payload: { verdict: { class: 'likely_authentic' } },
      }),
    ).toEqual({ label: 'Pending', tone: 'neutral' })
  })
})

// ---------------------------------------------------------------------------
// getTeamMeta — team badge resolution with an Unassigned fallback
// ---------------------------------------------------------------------------

describe('getTeamMeta', () => {
  it('resolves every known team to its full meta', () => {
    expect(getTeamMeta('team_legal')).toEqual({
      name: 'Legal & Compliance',
      short: 'Legal',
      tone: 'info',
    })
    expect(getTeamMeta('team_product')).toEqual({
      name: 'Product & Engineering',
      short: 'Product',
      tone: 'neutral',
    })
    expect(getTeamMeta('team_growth')).toEqual({
      name: 'Growth & Marketing',
      short: 'Growth',
      tone: 'success',
    })
  })

  it('falls back to Unassigned for unknown team ids', () => {
    expect(getTeamMeta('team_unknown')).toEqual({
      name: 'Unassigned',
      short: '—',
      tone: 'neutral',
    })
  })

  it('falls back for null, undefined, and empty values', () => {
    expect(getTeamMeta(null)).toEqual({ name: 'Unassigned', short: '—', tone: 'neutral' })
    expect(getTeamMeta(undefined)).toEqual({ name: 'Unassigned', short: '—', tone: 'neutral' })
    expect(getTeamMeta('')).toEqual({ name: 'Unassigned', short: '—', tone: 'neutral' })
  })
})

// ---------------------------------------------------------------------------
// Verdict palette — single source of truth for chart colors + Badge/StatCard
// tones (VERDICT_PALETTE → VERDICT_CHART_SEGMENTS / VERDICT_META / CSS vars)
// ---------------------------------------------------------------------------

describe('verdict palette single source', () => {
  const ORDER = ['authentic', 'suspicious', 'inconclusive']

  it('derives VERDICT_CHART_SEGMENTS from VERDICT_PALETTE in stack order', () => {
    expect(VERDICT_CHART_SEGMENTS.map((s) => s.key)).toEqual(ORDER)
    for (const seg of VERDICT_CHART_SEGMENTS) {
      const palette = VERDICT_PALETTE[seg.key]
      expect(seg.color).toBe(palette.hex)
      expect(seg.label).toBe(palette.label)
      expect(seg.readoutClass).toBe(palette.readoutClass)
    }
  })

  it('derives VERDICT_META tones + labels from VERDICT_PALETTE', () => {
    expect(Object.keys(VERDICT_META)).toEqual(ORDER)
    for (const [key, meta] of Object.entries(VERDICT_META)) {
      expect(meta.tone).toBe(VERDICT_PALETTE[key].tone)
      expect(meta.label).toBe(VERDICT_PALETTE[key].label)
    }
  })

  it('maps every palette tone to a --color-tone-* CSS var', () => {
    for (const p of Object.values(VERDICT_PALETTE)) {
      expect(TONE_CSS_VARS[p.tone]).toMatch(/^--color-tone-[a-z]+$/)
    }
    expect(Object.keys(TONE_CSS_VARS).sort()).toEqual(['info', 'success', 'warning'])
  })

  it('no-ops outside a browser (node env)', () => {
    expect(() => applyVerdictPalette()).not.toThrow()
  })
})
