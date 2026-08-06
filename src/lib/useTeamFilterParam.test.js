import { describe, expect, it } from 'vitest'
import { TEAM_IDS } from '../components/app/scanPresentation.js'
import {
  isValidTeamFilter,
  TEAM_FILTER_VALUES,
  readFromSearch,
} from './useTeamFilterParam.js'

describe('useTeamFilterParam URL validation', () => {
  it('accepts "all" and every known team id', () => {
    expect(TEAM_FILTER_VALUES).toEqual(['all', ...TEAM_IDS])
    for (const value of TEAM_FILTER_VALUES) {
      expect(isValidTeamFilter(value)).toBe(true)
    }
  })

  it('rejects unknown, malformed, and empty values', () => {
    expect(isValidTeamFilter('team_unknown')).toBe(false)
    expect(isValidTeamFilter('legal')).toBe(false) // team ids are prefixed, not bare names
    expect(isValidTeamFilter('')).toBe(false)
    expect(isValidTeamFilter(null)).toBe(false)
    expect(isValidTeamFilter(undefined)).toBe(false)
    expect(isValidTeamFilter(42)).toBe(false)
  })

  it('reads a valid ?team= value from the search string', () => {
    const firstTeam = TEAM_IDS[0]
    expect(readFromSearch(`?team=${firstTeam}`)).toBe(firstTeam)
  })

  it('falls back to "all" when ?team= is absent or invalid', () => {
    expect(readFromSearch('')).toBe('all')
    expect(readFromSearch('?state=empty')).toBe('all')
    expect(readFromSearch('?team=not_a_team')).toBe('all')
    expect(readFromSearch('?team=&state=empty')).toBe('all')
  })

  it('ignores other query params when extracting the team', () => {
    const firstTeam = TEAM_IDS[0]
    expect(readFromSearch(`?state=empty&team=${firstTeam}`)).toBe(firstTeam)
    expect(readFromSearch(`?team=${firstTeam}&state=error`)).toBe(firstTeam)
  })
})
