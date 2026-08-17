import { describe, expect, it } from 'vitest'
import { buildReportAppendix } from './reportAppendix.js'

describe('buildReportAppendix', () => {
  it('returns methodology + limitations blocks of the expected size', () => {
    const appendix = buildReportAppendix({ methodologyVersion: 'v2.4.1-stable' })

    expect(appendix.methodology).toHaveLength(3)
    expect(appendix.limitations).toHaveLength(4)
  })

  it('interpolates the methodology version into the copy', () => {
    const appendix = buildReportAppendix({ methodologyVersion: 'v2.4.1-stable' })
    expect(appendix.methodology[2]).toContain('v2.4.1-stable')
  })

  it('falls back to Not assessed when no version is provided', () => {
    const appendix = buildReportAppendix()
    expect(appendix.methodology[2]).toContain('Not assessed')
  })

  it('falls back when given an empty version string', () => {
    const appendix = buildReportAppendix({ methodologyVersion: '' })
    expect(appendix.methodology[2]).toContain('Not assessed')
  })

  it('keeps the honest framing — never overstates certainty', () => {
    const appendix = buildReportAppendix({ methodologyVersion: 'v1' })
    const all = [...appendix.methodology, ...appendix.limitations].join(' ')

    expect(all).toContain('cannot prove original provenance')
    expect(all).toContain('not to substitute for legal, editorial, or security judgments')
    // No absolute certainty claims anywhere in the copy.
    expect(all.toLowerCase()).not.toContain('guarantee')
  })

  it('returns fresh arrays on every call (no shared mutable state)', () => {
    const a = buildReportAppendix({ methodologyVersion: 'v1' })
    const b = buildReportAppendix({ methodologyVersion: 'v2' })
    expect(a).not.toBe(b)
    expect(a.methodology[2]).toContain('v1')
    expect(b.methodology[2]).toContain('v2')
  })
})
