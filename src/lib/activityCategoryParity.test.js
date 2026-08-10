import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_ACTION_LISTS,
} from './activityCategories.js'
// Direct import of the backend's pure contract module — no Nest DI graph —
// so this test locks the mock/real category semantics against the server's
// own source of truth.
import {
  ACTIVITY_CATEGORY_ACTIONS,
  ACTIVITY_CATEGORY_LIKE_PATTERNS,
} from '../../backend/src/account/activity-categories.ts'

describe('Activity category contract parity (frontend ↔ backend)', () => {
  it('defines the same six tab keys as the backend ActivityCategory union', () => {
    expect(Object.keys(ACTIVITY_CATEGORIES)).toEqual([
      'all',
      'scans',
      'exports',
      'account',
      'team',
      'system',
    ])
    expect(Object.keys(ACTIVITY_CATEGORY_ACTIONS)).toEqual([
      'account',
      'team',
      'system',
    ])
    expect(Object.keys(ACTIVITY_CATEGORY_LIKE_PATTERNS)).toEqual([
      'scans',
      'exports',
    ])
  })

  it('gives every tab a unique label', () => {
    const labels = Object.values(ACTIVITY_CATEGORIES).map((c) => c.label)
    expect(labels.every((label) => Boolean(label))).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('locks the account/team/system action lists to the backend exactly (both directions)', () => {
    for (const category of Object.keys(ACTIVITY_CATEGORY_ACTIONS)) {
      const frontend = [...ACTIVITY_CATEGORY_ACTION_LISTS[category]].sort()
      const backend = [...ACTIVITY_CATEGORY_ACTIONS[category]].sort()
      expect(frontend, `${category}: frontend actions ≠ backend actions`).toEqual(
        backend,
      )
    }
  })

  it('every backend action still matches its frontend tab predicate (behavioral)', () => {
    for (const [category, actions] of Object.entries(ACTIVITY_CATEGORY_ACTIONS)) {
      for (const action of actions) {
        expect(
          ACTIVITY_CATEGORIES[category].match({ action }),
          `${category} tab should match backend action "${action}"`,
        ).toBe(true)
      }
    }
  })

  it('scans/exports like patterns line up with the frontend startsWith predicates', () => {
    for (const [category, pattern] of Object.entries(
      ACTIVITY_CATEGORY_LIKE_PATTERNS,
    )) {
      const prefix = pattern.replace(/\.%$/, '')
      // An action the backend LIKE accepts lands on the frontend tab…
      expect(
        ACTIVITY_CATEGORIES[category].match({ action: `${prefix}.anything` }),
        `${category}: LIKE ${pattern} should match "${prefix}.anything"`,
      ).toBe(true)
      // …and an unrelated action is excluded.
      expect(
        ACTIVITY_CATEGORIES[category].match({ action: 'other.event' }),
      ).toBe(false)
    }
  })
})
