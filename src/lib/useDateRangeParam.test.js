import { describe, expect, it } from 'vitest'
import { inDateRange, parseDateParam, readFromSearch } from './useDateRangeParam.js'

const noon = '2026-07-15T12:00:00.000Z'

describe('parseDateParam', () => {
  it('accepts a real calendar date in YYYY-MM-DD', () => {
    expect(parseDateParam('2026-07-15')).toBe('2026-07-15')
    expect(parseDateParam('2026-01-01')).toBe('2026-01-01')
    expect(parseDateParam('2026-12-31')).toBe('2026-12-31')
  })

  it('rejects malformed and non-existent dates', () => {
    expect(parseDateParam('2026-7-15')).toBeNull()
    expect(parseDateParam('07/15/2026')).toBeNull()
    expect(parseDateParam('2026-13-40')).toBeNull()
    expect(parseDateParam('2026-02-30')).toBeNull() // overflow guard
    expect(parseDateParam('')).toBeNull()
    expect(parseDateParam(null)).toBeNull()
    expect(parseDateParam(undefined)).toBeNull()
    expect(parseDateParam('not-a-date')).toBeNull()
  })
})

describe('readFromSearch', () => {
  it('extracts valid from/to values', () => {
    expect(readFromSearch('?from=2026-07-01&to=2026-07-15')).toEqual({
      from: '2026-07-01',
      to: '2026-07-15',
    })
  })

  it('treats missing or invalid values as null', () => {
    expect(readFromSearch('')).toEqual({ from: null, to: null })
    expect(readFromSearch('?from=2026-13-40')).toEqual({ from: null, to: null })
    expect(readFromSearch('?to=07/15/2026')).toEqual({ from: null, to: null })
    expect(readFromSearch('?from=2026-07-01')).toEqual({ from: '2026-07-01', to: null })
    expect(readFromSearch('?to=2026-07-15')).toEqual({ from: null, to: '2026-07-15' })
  })

  it('coexists with ?team= and ?state= params', () => {
    expect(readFromSearch('?team=team_legal&from=2026-07-01&state=empty')).toEqual({
      from: '2026-07-01',
      to: null,
    })
  })
})

describe('inDateRange', () => {
  it('passes everything when neither bound is set', () => {
    expect(inDateRange(noon, null, null)).toBe(true)
    expect(inDateRange('not-a-date', null, null)).toBe(true)
  })

  it('is inclusive on both boundaries', () => {
    expect(inDateRange('2026-07-01T00:00:00.000Z', '2026-07-01', null)).toBe(true)
    expect(inDateRange('2026-07-01T23:59:59.999Z', null, '2026-07-01')).toBe(true)
  })

  it('excludes before from and after to', () => {
    expect(inDateRange('2026-06-30T23:59:59.999Z', '2026-07-01', null)).toBe(false)
    expect(inDateRange('2026-07-16T00:00:00.000Z', null, '2026-07-15')).toBe(false)
  })

  it('applies a single bound independently', () => {
    expect(inDateRange('2026-07-20T00:00:00.000Z', '2026-07-01', null)).toBe(true)
    expect(inDateRange('2026-06-20T00:00:00.000Z', null, '2026-07-15')).toBe(true)
    expect(inDateRange('2026-07-20T00:00:00.000Z', null, '2026-07-15')).toBe(false)
  })

  it('yields an empty result when from > to (no time can satisfy both bounds)', () => {
    expect(inDateRange(noon, '2026-07-20', '2026-07-10')).toBe(false)
  })

  it('passes rows with an unparseable created_at instead of dropping them', () => {
    expect(inDateRange(undefined, '2026-07-01', '2026-07-15')).toBe(true)
    expect(inDateRange('garbage', '2026-07-01', '2026-07-15')).toBe(true)
  })
})
