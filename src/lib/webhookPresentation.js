/**
 * webhookPresentation.js — pure presentation helpers for the Webhooks surface.
 *
 * Kept dependency-free (no React, no api imports) so the tone/label mapping
 * for delivery statuses, endpoint statuses, and events is unit-testable in
 * isolation, mirroring scanPresentation.js. The event catalog itself lives in
 * mockData.js (WEBHOOK_EVENTS) and is passed in for fallback resolution.
 */

import { WEBHOOK_EVENTS } from './mockData.js'

export function getWebhookEventMeta(value, catalog = WEBHOOK_EVENTS) {
  const match = catalog.find((event) => event.value === value)
  return {
    label: match?.label || value || 'Unknown event',
    description: match?.description || 'No description recorded for this event.',
  }
}

export function getWebhookStatusMeta(status) {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success' }
    case 'paused':
      return { label: 'Paused', tone: 'warning' }
    default:
      return { label: status || 'Unknown', tone: 'neutral' }
  }
}

/**
 * Delivery HTTP status → display tone. 2xx is a successful delivery, 4xx a
 * problem with the endpoint (auth/rate-limit), 5xx a failure on the receiver.
 * Anything else (redirects, 1xx) renders neutral — a webhook delivery that
 * redirects is unusual enough to not claim success.
 */
export function getDeliveryStatusMeta(status) {
  if (typeof status !== 'number' || !Number.isFinite(status)) {
    return { label: 'No response', tone: 'neutral' }
  }
  if (status >= 200 && status < 300) return { label: String(status), tone: 'success' }
  if (status >= 400 && status < 500) return { label: String(status), tone: 'warning' }
  if (status >= 500 && status < 600) return { label: String(status), tone: 'error' }
  return { label: String(status), tone: 'neutral' }
}

/**
 * Failure rate helper — percentage of deliveries that failed (5xx), guarded
 * against a zero-delivery denominator.
 */
export function failureRate(deliveryCount, failureCount) {
  const total = Number(deliveryCount) || 0
  const failed = Number(failureCount) || 0
  if (total <= 0) return null
  return Math.round((failed / total) * 100)
}
