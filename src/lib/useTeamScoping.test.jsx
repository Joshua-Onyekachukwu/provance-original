// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useTeamScoping } from './useTeamScoping.js'

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

const scansData = [
  {
    id: 's1',
    team_id: 'team_legal',
    status: 'completed',
    verdict: 'suspicious',
    created_at: daysAgo(2),
  },
  {
    id: 's2',
    team_id: 'team_legal',
    status: 'queued',
    verdict: null,
    created_at: daysAgo(0.01), // within the last 24h
  },
  {
    id: 's3',
    team_id: 'team_product',
    status: 'completed',
    verdict: 'authentic',
    created_at: daysAgo(30), // outside the 7-day window
  },
]

const analyticsData = { scans_today: 9, scans_7d: 42, completion_rate: 0.8, suspicious_rate: 0.1 }

function renderScoping(initialEntries = ['/']) {
  return renderHook(
    (props) => useTeamScoping(props),
    {
      initialProps: {
        scans: { data: scansData, status: 'ready' },
        analytics: { data: analyticsData, status: 'ready' },
      },
      wrapper: ({ children }) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>,
    },
  )
}

describe('useTeamScoping', () => {
  it('defaults to "all" — full list, counts, no teamKpis, KPI falls back to analytics', () => {
    const { result } = renderScoping()

    expect(result.current.teamFilter).toBe('all')
    expect(result.current.isTeamScoped).toBe(false)
    expect(result.current.teamName).toBeNull()
    expect(result.current.filteredScans).toHaveLength(3)
    expect(result.current.teamCounts).toEqual({ team_legal: 2, team_product: 1 })
    expect(result.current.teamKpis).toBeNull()
    expect(result.current.kpi).toBe(analyticsData)
  })

  it('scopes to the URL team: filter, list, counts, name, and recomputed KPIs', () => {
    const { result } = renderScoping(['/?team=team_legal'])

    expect(result.current.teamFilter).toBe('team_legal')
    expect(result.current.isTeamScoped).toBe(true)
    expect(result.current.teamName).toBe('Legal & Compliance')
    expect(result.current.filteredScans.map((s) => s.id)).toEqual(['s1', 's2'])

    const kpis = result.current.teamKpis
    expect(kpis).not.toBeNull()
    expect(kpis.scans_today).toBe(1) // only s2 is within 24h
    expect(kpis.scans_7d).toBe(2) // s1 + s2
    expect(kpis.completion_rate).toBe(0.5) // 1 completed of 2
    expect(kpis.suspicious_rate).toBe(0.5) // 1 suspicious of 2
    expect(kpis.queued).toBe(1)
    expect(kpis.processing).toBe(0)
    expect(kpis.failed).toBe(0)
    // The scoped KPIs win over the global analytics fallback.
    expect(result.current.kpi).toBe(kpis)
  })

  it('returns null teamKpis when the scoped team has no scans (KPI falls back)', () => {
    const { result } = renderScoping(['/?team=team_growth'])

    expect(result.current.isTeamScoped).toBe(true)
    expect(result.current.filteredScans).toEqual([])
    expect(result.current.teamKpis).toBeNull()
    expect(result.current.kpi).toBe(analyticsData)
  })

  it('handles an empty scan list', () => {
    const { result } = renderHook(
      (props) => useTeamScoping(props),
      {
        initialProps: { scans: { data: [], status: 'ready' } },
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      },
    )

    expect(result.current.teamCounts).toEqual({})
    expect(result.current.filteredScans).toEqual([])
    expect(result.current.teamKpis).toBeNull()
  })

  it('returns null volumeTrend when no team is scoped', () => {
    const { result } = renderScoping()

    expect(result.current.volumeTrend).toBeNull()
  })

  it('recomputes a 14-day volume series from the scoped ledger', () => {
    const { result } = renderScoping(['/?team=team_legal'])

    const trend = result.current.volumeTrend
    expect(trend).toHaveLength(14)
    // s1 (2 days ago) + s2 (today) land in buckets; s3 is another team.
    expect(trend.reduce((sum, p) => sum + p.scans, 0)).toBe(2)

    // Locate buckets by their local calendar day rather than fixed indices,
    // so the assertions hold even if the run straddles a local-midnight
    // boundary between fixture creation and hook execution.
    const bucketFor = (isoDate) =>
      trend.find((b) => new Date(b.date).toDateString() === new Date(isoDate).toDateString())

    const today = bucketFor(scansData[1].created_at) // s2, created within 24h
    const twoDaysAgo = bucketFor(scansData[0].created_at) // s1
    expect(today.scans).toBe(1)
    expect(twoDaysAgo.scans).toBe(1)
    expect(twoDaysAgo.completed).toBe(1)
    expect(twoDaysAgo.suspicious).toBe(1)
    expect(twoDaysAgo.failed).toBe(0)
  })

  it('zero-fills the series for a scoped team with no scans (no global fallback)', () => {
    const { result } = renderScoping(['/?team=team_growth'])

    const trend = result.current.volumeTrend
    expect(trend).toHaveLength(14)
    expect(trend.every((p) => p.scans === 0 && p.completed === 0 && p.failed === 0)).toBe(true)
  })

  it('derives KPI loading/error from scans when scoped, analytics otherwise', () => {
    const { result } = renderHook(
      (props) => useTeamScoping(props),
      {
        initialProps: {
          scans: { data: [], status: 'error' },
          analytics: { data: analyticsData, status: 'loading' },
        },
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      },
    )
    // Unscoped: follows the analytics resource.
    expect(result.current.kpiLoading).toBe(true)
    expect(result.current.kpiError).toBe(false)

    act(() => result.current.setTeamFilter('team_legal'))
    // Scoped: follows the scans resource.
    expect(result.current.kpiLoading).toBe(false)
    expect(result.current.kpiError).toBe(true)
  })
})
