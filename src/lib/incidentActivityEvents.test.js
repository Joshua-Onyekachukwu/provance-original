import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_CATEGORIES,
} from './activityCategories.js'
import {
  buildIncidentActivityEvents,
  mockAuditEvents,
  mockMonitoring,
} from './mockData.js'

// ---------------------------------------------------------------------------
// buildIncidentActivityEvents — resolved incidents surface in the Activity
// Log as system events, carrying the post-mortem summary and the severity
// that drives the same tone dots as the Monitoring page's accordion.
// ---------------------------------------------------------------------------

describe('buildIncidentActivityEvents', () => {
  const events = buildIncidentActivityEvents()

  it('maps every resolved incident to an incident.resolved system event', () => {
    const resolvedIncidents = mockMonitoring.incidents.filter(
      (incident) => incident.status === 'resolved',
    )
    expect(resolvedIncidents.length).toBeGreaterThan(0)
    expect(events).toHaveLength(resolvedIncidents.length)

    for (const event of events) {
      expect(event.action).toBe('incident.resolved')
      expect(event.actor_email).toBe('system')
      expect(event.resource_type).toBe('incident')
    }
  })

  it('excludes open (non-resolved) incidents — they stay on Monitoring only', () => {
    const openIncidents = mockMonitoring.incidents.filter(
      (incident) => incident.status !== 'resolved',
    )
    if (openIncidents.length > 0) {
      for (const incident of openIncidents) {
        expect(events.some((event) => event.resource_id === incident.id)).toBe(false)
      }
    }
  })

  it('carries the post-mortem summary verbatim from the incident accordion', () => {
    const resolved = mockMonitoring.incidents.filter(
      (incident) => incident.status === 'resolved',
    )
    const resolvedById = Object.fromEntries(resolved.map((incident) => [incident.id, incident]))
    for (const event of events) {
      const incident = resolvedById[event.resource_id]
      expect(event.summary).toBe(incident.summary)
      expect(event.summary).toBeTruthy()
    }
  })

  it('carries severity and stamps the resolution timestamp', () => {
    const resolved = mockMonitoring.incidents.filter(
      (incident) => incident.status === 'resolved',
    )
    const resolvedById = Object.fromEntries(resolved.map((incident) => [incident.id, incident]))
    for (const event of events) {
      const incident = resolvedById[event.resource_id]
      expect(event.severity).toBe(incident.severity)
      expect(['critical', 'major', 'minor']).toContain(event.severity)
      expect(event.created_at).toBe(incident.resolved_at || incident.started_at)
    }
  })

  it('every emitted id is unique (stable keys for the accordion expansion)', () => {
    const ids = events.map((event) => event.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('incidents belong only to the system tab in the merged feed (no double-count)', () => {
    const merged = [...events, ...mockAuditEvents]
    const systemCount = merged.filter(ACTIVITY_CATEGORIES.system.match).length
    const otherCategories = ['scans', 'exports', 'account', 'team']
    const otherCount = otherCategories.reduce(
      (sum, key) => sum + merged.filter(ACTIVITY_CATEGORIES[key].match).length,
      0,
    )
    // System gains exactly the incident events; the rest stays the audit total.
    expect(systemCount).toBe(
      mockAuditEvents.filter(ACTIVITY_CATEGORIES.system.match).length + events.length,
    )
    expect(otherCount).toBe(
      otherCategories.reduce(
        (sum, key) =>
          sum + mockAuditEvents.filter(ACTIVITY_CATEGORIES[key].match).length,
        0,
      ),
    )
  })
})
