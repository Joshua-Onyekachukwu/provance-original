/**
 * webhookPresentation.test.js — unit coverage for the Webhooks presentation
 * helpers: event meta fallbacks, status tone mapping (including HTTP status
 * boundaries), and the guarded failure-rate helper.
 */
import { describe, expect, it } from 'vitest'
import {
  failureRate,
  getDeliveryStatusMeta,
  getWebhookEventMeta,
  getWebhookStatusMeta,
} from './webhookPresentation.js'

describe('getWebhookEventMeta', () => {
  it('resolves a known event from the catalog', () => {
    const meta = getWebhookEventMeta('scan.completed')
    expect(meta.label).toBe('Scan completed')
    expect(meta.description.length).toBeGreaterThan(0)
  })

  it('falls back gracefully for unknown, empty, and missing events', () => {
    expect(getWebhookEventMeta('bogus.event').label).toBe('bogus.event')
    expect(getWebhookEventMeta('').label).toBe('Unknown event')
    expect(getWebhookEventMeta(undefined).label).toBe('Unknown event')
    expect(getWebhookEventMeta(null).label).toBe('Unknown event')
  })

  it('accepts a custom catalog', () => {
    const meta = getWebhookEventMeta('custom.event', [
      { value: 'custom.event', label: 'Custom', description: 'D' },
    ])
    expect(meta.label).toBe('Custom')
  })
})

describe('getWebhookStatusMeta', () => {
  it('maps active/paused to success/warning tones', () => {
    expect(getWebhookStatusMeta('active')).toEqual({ label: 'Active', tone: 'success' })
    expect(getWebhookStatusMeta('paused')).toEqual({ label: 'Paused', tone: 'warning' })
  })

  it('falls back to neutral for unknown or missing statuses', () => {
    expect(getWebhookStatusMeta('deleted').tone).toBe('neutral')
    expect(getWebhookStatusMeta(undefined).label).toBe('Unknown')
  })
})

describe('getDeliveryStatusMeta', () => {
  it('maps 2xx to success', () => {
    expect(getDeliveryStatusMeta(200)).toEqual({ label: '200', tone: 'success' })
    expect(getDeliveryStatusMeta(299).tone).toBe('success')
  })

  it('maps 4xx to warning and 5xx to error', () => {
    expect(getDeliveryStatusMeta(404)).toEqual({ label: '404', tone: 'warning' })
    expect(getDeliveryStatusMeta(429).tone).toBe('warning')
    expect(getDeliveryStatusMeta(500)).toEqual({ label: '500', tone: 'error' })
    expect(getDeliveryStatusMeta(599).tone).toBe('error')
  })

  it('treats boundary statuses (1xx, 3xx) as neutral', () => {
    expect(getDeliveryStatusMeta(199).tone).toBe('neutral')
    expect(getDeliveryStatusMeta(300).tone).toBe('neutral')
    expect(getDeliveryStatusMeta(399).tone).toBe('neutral')
  })

  it('handles invalid inputs as "No response"', () => {
    expect(getDeliveryStatusMeta()).toEqual({ label: 'No response', tone: 'neutral' })
    expect(getDeliveryStatusMeta(null)).toEqual({ label: 'No response', tone: 'neutral' })
    expect(getDeliveryStatusMeta('200')).toEqual({ label: 'No response', tone: 'neutral' })
    expect(getDeliveryStatusMeta(NaN)).toEqual({ label: 'No response', tone: 'neutral' })
  })
})

describe('failureRate', () => {
  it('computes a rounded percentage', () => {
    expect(failureRate(10, 3)).toBe(30)
    expect(failureRate(482, 7)).toBe(1)
  })

  it('returns null for a zero or absent denominator', () => {
    expect(failureRate(0, 0)).toBeNull()
    expect(failureRate(undefined, 1)).toBeNull()
    expect(failureRate(null, null)).toBeNull()
  })

  it('coerces non-numeric counts to zero', () => {
    expect(failureRate('12', '2')).toBe(17)
    expect(failureRate('abc', 'def')).toBeNull()
  })
})
