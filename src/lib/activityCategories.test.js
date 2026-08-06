import { describe, expect, it } from 'vitest'
import { mockAuditEvents } from './mockData.js'
import {
  ACTIVITY_CATEGORIES,
  getActivityCategory,
} from './activityCategories.js'

// Partition helper (test-only) — every category's matched subset in one map.
function categorizeEvents(events) {
  const result = {}
  for (const key of Object.keys(ACTIVITY_CATEGORIES)) {
    result[key] = events.filter(ACTIVITY_CATEGORIES[key].match)
  }
  return result
}

// ---------------------------------------------------------------------------
// Category match predicates — tested against the real mock audit events so
// the tab counts shown on the Activity page are locked in by tests.
// ---------------------------------------------------------------------------

const MOCK_ACTIONS = [...new Set(mockAuditEvents.map((e) => e.action))].sort()

describe('ACTIVITY_CATEGORIES', () => {
  it('defines the six tabs with all + five filtered categories', () => {
    expect(Object.keys(ACTIVITY_CATEGORIES)).toEqual([
      'all',
      'scans',
      'exports',
      'account',
      'team',
      'system',
    ])
  })

  it('all matches every event', () => {
    expect(mockAuditEvents.filter(ACTIVITY_CATEGORIES.all.match)).toHaveLength(
      mockAuditEvents.length,
    )
  })

  it('scans matches only scan.* actions', () => {
    const matched = mockAuditEvents.filter(ACTIVITY_CATEGORIES.scans.match)
    expect(matched.length).toBeGreaterThan(0)
    expect(matched.every((e) => e.action.startsWith('scan.'))).toBe(true)
    expect(MOCK_ACTIONS.filter((a) => a.startsWith('scan.'))).toEqual([
      'scan.completed',
      'scan.failed',
      'scan.submitted',
    ])
  })

  it('exports matches only report.* actions', () => {
    const matched = mockAuditEvents.filter(ACTIVITY_CATEGORIES.exports.match)
    expect(matched.length).toBeGreaterThan(0)
    expect(matched.every((e) => e.action.startsWith('report.'))).toBe(true)
    expect(MOCK_ACTIONS.filter((a) => a.startsWith('report.'))).toEqual([
      'report.exported',
      'report.viewed',
    ])
  })

  it('account matches the account-family action list', () => {
    const matched = mockAuditEvents.filter(ACTIVITY_CATEGORIES.account.match)
    expect(matched.length).toBeGreaterThan(0)
    for (const event of matched) {
      expect(
        [
          'user.invited',
          'user.activated',
          'settings.updated',
          'api_key.created',
          'api_key.revoked',
          'invite.accepted',
          'invite_created',
        ],
      ).toContain(event.action)
    }
  })

  it('team matches the team-family action list', () => {
    const matched = mockAuditEvents.filter(ACTIVITY_CATEGORIES.team.match)
    expect(matched.length).toBeGreaterThan(0)
    for (const event of matched) {
      expect(
        ['team.member_added', 'team.member_removed', 'role.changed', 'org.created'],
      ).toContain(event.action)
    }
  })

  it('system matches the system-family action list', () => {
    const matched = mockAuditEvents.filter(ACTIVITY_CATEGORIES.system.match)
    expect(matched.length).toBeGreaterThan(0)
    for (const event of matched) {
      expect(
        [
          'waitlist.reviewed',
          'waitlist_reviewed',
          'waitlist.approved',
          'waitlist.rejected',
          'waitlist.deferred',
          'feature_flag.toggled',
          'incident.resolved',
        ],
      ).toContain(event.action)
    }
  })
})

// ---------------------------------------------------------------------------
// Category partition — every mock action belongs to exactly one tab, so tab
// counts never double-count or drop events.
// ---------------------------------------------------------------------------

describe('categorizeEvents — mock data partition', () => {
  it('classifies every mock action (coverage) with no double-count (disjointness)', () => {
    const byCategory = categorizeEvents(mockAuditEvents)
    const classified = new Set([
      ...byCategory.scans.map((e) => e.action),
      ...byCategory.exports.map((e) => e.action),
      ...byCategory.account.map((e) => e.action),
      ...byCategory.team.map((e) => e.action),
      ...byCategory.system.map((e) => e.action),
    ])
    // Coverage: every distinct mock action appears in some category.
    expect(classified.size).toBe(MOCK_ACTIONS.length)
    // Disjointness: no event matches more than one filtered category, so the
    // per-category counts sum exactly to the 'all' count.
    const sum = ['scans', 'exports', 'account', 'team', 'system'].reduce(
      (acc, key) => acc + byCategory[key].length,
      0,
    )
    expect(sum).toBe(byCategory.all.length)
  })
})

// ---------------------------------------------------------------------------
// Real-backend parity — the underscore forms services write must count toward
// the same tabs as their dotted mock equivalents.
// ---------------------------------------------------------------------------

describe('real-backend action parity', () => {
  const event = (action) => ({ id: 'x', action })

  it('invite_created counts as account (same as invite.accepted)', () => {
    expect(ACTIVITY_CATEGORIES.account.match(event('invite_created'))).toBe(true)
    expect(ACTIVITY_CATEGORIES.account.match(event('invite.accepted'))).toBe(true)
  })

  it('waitlist_reviewed counts as system (same as waitlist.reviewed)', () => {
    expect(ACTIVITY_CATEGORIES.system.match(event('waitlist_reviewed'))).toBe(true)
    expect(ACTIVITY_CATEGORIES.system.match(event('waitlist.reviewed'))).toBe(true)
  })

  it('incident.resolved counts as system and nowhere else', () => {
    expect(ACTIVITY_CATEGORIES.system.match(event('incident.resolved'))).toBe(true)
    expect(ACTIVITY_CATEGORIES.scans.match(event('incident.resolved'))).toBe(false)
    expect(ACTIVITY_CATEGORIES.exports.match(event('incident.resolved'))).toBe(false)
    expect(ACTIVITY_CATEGORIES.account.match(event('incident.resolved'))).toBe(false)
    expect(ACTIVITY_CATEGORIES.team.match(event('incident.resolved'))).toBe(false)
  })

  it('underscore forms never bleed into other categories', () => {
    expect(ACTIVITY_CATEGORIES.scans.match(event('invite_created'))).toBe(false)
    expect(ACTIVITY_CATEGORIES.team.match(event('waitlist_reviewed'))).toBe(false)
  })

  it('unknown actions fall through every filtered category', () => {
    const mystery = event('zebra.dance')
    for (const key of ['scans', 'exports', 'account', 'team', 'system']) {
      expect(ACTIVITY_CATEGORIES[key].match(mystery)).toBe(false)
    }
    expect(ACTIVITY_CATEGORIES.all.match(mystery)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getActivityCategory — unknown/absent values fall back to 'all'
// ---------------------------------------------------------------------------

describe('getActivityCategory', () => {
  it('resolves known keys', () => {
    expect(getActivityCategory('scans')).toBe(ACTIVITY_CATEGORIES.scans)
    expect(getActivityCategory('all')).toBe(ACTIVITY_CATEGORIES.all)
  })

  it('falls back to all for unknown, undefined, and null', () => {
    expect(getActivityCategory('nope')).toBe(ACTIVITY_CATEGORIES.all)
    expect(getActivityCategory(undefined)).toBe(ACTIVITY_CATEGORIES.all)
    expect(getActivityCategory(null)).toBe(ACTIVITY_CATEGORIES.all)
  })
})
