/**
 * useTeamScoping.js — shared team-scoping derivation for workspace surfaces.
 *
 * Wraps useTeamFilterParam (the URL-backed ?team= selection) with the
 * recompute chain the dashboard first introduced, so every consumer scopes
 * identically:
 *
 *   - teamCounts     — per-team counts over the scan list, for the TeamFilter pills
 *   - filteredScans  — the scan list restricted to the active team (all when 'all')
 *   - teamKpis       — analytics-shaped KPIs recomputed from the ledger
 *                      (scans_today / scans_7d / completion_rate /
 *                      suspicious_rate + queue posture counts); null when no
 *                      team is active or the team has no scans
 *   - kpi / kpiLoading / kpiError — teamKpis when scoped, otherwise the
 *                      optional `analytics` resource (dashboard fallback)
 *   - volumeTrend      — a 14-day [{ date, scans, completed, failed,
 *                      suspicious }] series recomputed from the scoped scan
 *                      ledger (the TrendChart's exact data contract), null
 *                      when no team is active; unlike teamKpis it returns
 *                      zero-filled buckets for an empty team so the chart
 *                      shows honest zeros instead of global data
 *
 * Usage:
 *   const { teamFilter, setTeamFilter, teamCounts, filteredScans, teamKpis,
 *           isTeamScoped, teamName, volumeTrend } = useTeamScoping({ scans, analytics })
 */

import { useMemo } from 'react'
import { useTeamFilterParam } from './useTeamFilterParam.js'
import { getTeamMeta } from '../components/app/scanPresentation.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function useTeamScoping({ scans, analytics = null }) {
  const [teamFilter, setTeamFilter] = useTeamFilterParam()
  const isTeamScoped = teamFilter !== 'all'
  const teamName = isTeamScoped ? getTeamMeta(teamFilter).name : null

  const teamCounts = useMemo(() => {
    const counts = {}
    for (const scan of scans.data || []) {
      if (scan.team_id) counts[scan.team_id] = (counts[scan.team_id] || 0) + 1
    }
    return counts
  }, [scans.data])

  const filteredScans = useMemo(
    () =>
      isTeamScoped
        ? (scans.data || []).filter((scan) => scan.team_id === teamFilter)
        : scans.data || [],
    [scans.data, teamFilter, isTeamScoped],
  )

  // Analytics-shaped KPIs recomputed for the active team, mirroring the mock
  // analytics envelope (scans_today / scans_7d / completion_rate /
  // suspicious_rate) plus queue posture counts so the same surfaces render
  // either global or team-scoped values.
  const teamKpis = useMemo(() => {
    if (!isTeamScoped || filteredScans.length === 0) return null
    const now = Date.now()
    const scansToday = filteredScans.filter(
      (scan) => now - new Date(scan.created_at).getTime() <= DAY_MS,
    ).length
    const scans7d = filteredScans.filter(
      (scan) => now - new Date(scan.created_at).getTime() <= 7 * DAY_MS,
    ).length
    const completed = filteredScans.filter((scan) => scan.status === 'completed').length
    const suspicious = filteredScans.filter(
      (scan) => scan.status === 'completed' && scan.verdict === 'suspicious',
    ).length
    return {
      scans_today: scansToday,
      scans_7d: scans7d,
      completion_rate: filteredScans.length ? completed / filteredScans.length : 0,
      suspicious_rate: filteredScans.length ? suspicious / filteredScans.length : 0,
      queued: filteredScans.filter((scan) => scan.status === 'queued').length,
      processing: filteredScans.filter((scan) => scan.status === 'processing').length,
      failed: filteredScans.filter((scan) => scan.status === 'failed').length,
    }
  }, [isTeamScoped, filteredScans])

  // 14-day volume series recomputed from the team-scoped ledger, matching
  // the TrendChart contract ({ date, scans, completed, failed, suspicious }).
  // Zero-filled when the scoped team has no scans so the chart never falls
  // back to global volume under a team filter.
  const volumeTrend = useMemo(() => {
    if (!isTeamScoped) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const buckets = Array.from({ length: 14 }, (_, i) => {
      const day = new Date(now)
      day.setDate(day.getDate() - (13 - i))
      return { date: day.toISOString(), scans: 0, completed: 0, failed: 0, suspicious: 0 }
    })
    for (const scan of filteredScans) {
      const created = new Date(scan.created_at).getTime()
      const index = buckets.findIndex((bucket) => {
        const start = new Date(bucket.date).getTime()
        return created >= start && created < start + DAY_MS
      })
      if (index === -1) continue
      buckets[index].scans += 1
      if (scan.status === 'completed' || scan.status === 'complete') buckets[index].completed += 1
      if (scan.status === 'failed') buckets[index].failed += 1
      if (scan.status === 'completed' && scan.verdict === 'suspicious') {
        buckets[index].suspicious += 1
      }
    }
    return buckets
  }, [isTeamScoped, filteredScans])

  // When a team filter is active the KPI values derive from the scan ledger,
  // so their loading/error state tracks scans (not the analytics endpoint).
  const kpi = teamKpis || analytics?.data
  const kpiLoading = isTeamScoped ? scans.status === 'loading' : analytics?.status === 'loading'
  const kpiError = isTeamScoped ? scans.status === 'error' : analytics?.status === 'error'

  return {
    teamFilter,
    setTeamFilter,
    teamName,
    isTeamScoped,
    teamCounts,
    filteredScans,
    teamKpis,
    volumeTrend,
    kpi,
    kpiLoading,
    kpiError,
  }
}
