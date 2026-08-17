/**
 * showcaseTone.test.js — locks the per-signal tone derivation the landing
 * ProductShowcase depends on (tone dot, progress bar, flagged count, signal
 * agreement). The key regression: "incomplete" must never match the ok token
 * "complete", and "no X detected" phrasing must still read ok.
 */
import { describe, expect, it } from 'vitest'
import { signalTone } from './showcaseTone.js'

describe('signalTone', () => {
  it('reads clear ok findings as ok', () => {
    expect(signalTone('Normal frequency distribution')).toBe('ok')
    expect(signalTone('C2PA manifest present')).toBe('ok')
    expect(signalTone('Verified signature match')).toBe('ok')
    expect(signalTone('Timeline consistent with source')).toBe('ok')
    expect(signalTone('No anomaly detected')).toBe('ok')
  })

  it('reads anomaly phrasing as warn', () => {
    expect(signalTone('Model signature detected')).toBe('warn')
    expect(signalTone('Metadata chain incomplete')).toBe('warn')
    expect(signalTone('Anomalous spectral energy')).toBe('warn')
    expect(signalTone('Frame continuity breaks')).toBe('warn')
    expect(signalTone('No trusted credential located')).toBe('warn')
  })

  it('does not let "incomplete" short-circuit to ok via "complete"', () => {
    expect(signalTone('Metadata chain incomplete')).toBe('warn')
    expect(signalTone('incomplete')).toBe('warn')
    expect(signalTone('complete')).toBe('ok')
  })

  it('falls back to neutral for ambivalent text and nulls', () => {
    expect(signalTone('Awaiting review')).toBe('neutral')
    expect(signalTone('')).toBe('neutral')
    expect(signalTone(undefined)).toBe('neutral')
    expect(signalTone(null)).toBe('neutral')
  })
})
