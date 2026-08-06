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
  percentOf,
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

  it('does not clamp values outside 0..1', () => {
    expect(formatPct(1.5)).toBe('150%')
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
})
