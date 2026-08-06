import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useMockData from '../../lib/useMockData.js'
import { useDemoState } from '../../lib/useDemoState.js'
import { getAnalytics } from '../../lib/api.js'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import { useTeamFilterParam } from '../../lib/useTeamFilterParam.js'
import {
  formatDurationMs,
  formatHourShort,
  formatPct,
  formatShortDate,
  formatStorageGb,
  getTeamMeta,
} from '../../components/app/scanPresentation.js'
import { mockOrganizations, mockScans, mockUsers } from '../../lib/mockData.js'
import {
  Button,
  CHART_H,
  CHART_W,
  PAD,
  StatCard,
  TrendChart,
  pctOfViewBoxX,
  pctOfViewBoxY,
  useRegisterCommands,
  useToast,
} from '../../components/ui/index.js'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'

// ---------------------------------------------------------------------------
// Media-type labels + palette
// ---------------------------------------------------------------------------

const MEDIA_LABELS = {
  'video/mp4': 'MP4 Video',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/webp': 'WebP Image',
  'image/gif': 'GIF Image',
  'audio/wav': 'WAV Audio',
  'audio/mpeg': 'MP3 Audio',
  'application/pdf': 'PDF Document',
}

const MEDIA_COLORS = {
  'video/mp4': 'bg-indigo-400',
  'image/jpeg': 'bg-emerald-400',
  'image/png': 'bg-sky-400',
  'image/webp': 'bg-teal-400',
  'image/gif': 'bg-violet-400',
  'audio/wav': 'bg-amber-400',
  'audio/mpeg': 'bg-orange-400',
  'application/pdf': 'bg-rose-400',
}

// ---------------------------------------------------------------------------
// Empty analytics shape (for the ?state=empty review surface)
// ---------------------------------------------------------------------------

const EMPTY_ANALYTICS = {
  scans_today: 0,
  scans_7d: 0,
  completion_rate: 0,
  failure_rate: 0,
  suspicious_rate: 0,
  media_type_distribution: {},
  volume_trend: [],
  verdict_trend: [],
  queue_throughput: null,
  top_organizations: [],
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-4 sm:p-5 shadow-sm">
      <div className="mb-2 h-3 w-20 rounded bg-stone-light/60" />
      <div className="mb-2 h-7 w-14 rounded bg-stone-light/50" />
      <div className="h-3 w-28 rounded bg-stone-light/40" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 h-3 w-32 rounded bg-stone-light/60" />
      <div className="h-48 rounded-xl bg-stone-light/30" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rate meter
// ---------------------------------------------------------------------------

function RateMeter({ label, value, tone, detail }) {
  const barTone = {
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
  }[tone] || 'bg-charcoal'

  const chipTone = {
    success: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    danger: 'text-rose-700 bg-rose-50 border-rose-100',
    warning: 'text-amber-700 bg-amber-50 border-amber-100',
  }[tone] || 'text-charcoal bg-parchment border-stone-light'

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-charcoal">{label}</p>
        <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${chipTone}`}>
          {formatPct(value, 1)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-light">
        <div
          className={`h-2 rounded-full ${barTone} transition-all duration-500`}
          style={{ width: `${Math.min(Math.max((value || 0) * 100, 0), 100)}%` }}
        />
      </div>
      {detail ? <p className="mt-1.5 text-xs text-charcoal-light">{detail}</p> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Media-type distribution bar
// ---------------------------------------------------------------------------

function MediaTypeBar({ mimeType, count, total, max }) {
  const label = MEDIA_LABELS[mimeType] || mimeType
  const share = total > 0 ? count / total : 0
  const width = max > 0 ? Math.max((count / max) * 100, 2) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-charcoal">{label}</span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-stone-light/60">
        <div
          className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: 'currentColor' }}
        />
        <div className="relative flex h-full items-center justify-between px-2.5">
          <span className="font-mono text-[11px] font-semibold text-charcoal">{count.toLocaleString()}</span>
          <span className="font-mono text-[11px] text-charcoal-light">{formatPct(share, 1)}</span>
        </div>
      </div>
      <span className="sr-only">{label}: {count} scans ({formatPct(share, 1)})</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scan volume by verdict (self-hosted SVG stacked bars)
// ---------------------------------------------------------------------------

const VERDICT_SEGMENTS = [
  { key: 'authentic', label: 'Authentic', color: '#10b981' },
  { key: 'suspicious', label: 'Suspicious', color: '#f59e0b' },
  { key: 'inconclusive', label: 'Inconclusive', color: '#38bdf8' },
]

function buildVerdictGeometry(points) {
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const maxTotal = Math.max(
    1,
    ...points.map((p) => (p.authentic || 0) + (p.suspicious || 0) + (p.inconclusive || 0)),
  )
  const yMax = Math.ceil((maxTotal * 1.2) / 10) * 10
  const groupW = plotW / points.length
  const barW = Math.max(6, groupW * 0.62)

  const x = (i) => PAD.left + groupW * i + (groupW - barW) / 2
  const y = (value) => PAD.top + plotH - (value / yMax) * plotH

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = (yMax / 4) * i
    return { value, y: y(value) }
  })

  return { yMax, x, y, gridLines, barW, groupW, plotH }
}

function VerdictVolumeChart({ trend }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const points = useMemo(() => trend.slice(-14), [trend])
  const geometry = useMemo(() => buildVerdictGeometry(points), [points])

  const totals = useMemo(() => {
    const acc = { authentic: 0, suspicious: 0, inconclusive: 0 }
    points.forEach((p) => {
      acc.authentic += p.authentic || 0
      acc.suspicious += p.suspicious || 0
      acc.inconclusive += p.inconclusive || 0
    })
    return acc
  }, [points])

  const grandTotal = totals.authentic + totals.suspicious + totals.inconclusive
  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  // Stacked segment bounds per bar, bottom → top: authentic, suspicious, inconclusive.
  const stackBounds = (p) => {
    const a = p.authentic || 0
    const s = p.suspicious || 0
    const i0 = p.inconclusive || 0
    const bottom = geometry.y(0)
    return {
      yInconclusive: geometry.y(a + s + i0),
      ySuspicious: geometry.y(a + s),
      yAuthentic: geometry.y(a),
      bottom,
    }
  }

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Scan volume by verdict
        </p>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          {points.length} days · {grandTotal.toLocaleString()} scans
        </span>
      </div>

      {/* Hover readout */}
      <div className="mb-3 flex h-6 items-center gap-2 font-mono text-xs text-charcoal-mid" aria-live="polite">
        {hovered ? (
          <>
            <span className="font-semibold text-charcoal">{formatShortDate(hovered.date)}</span>
            <span className="text-charcoal-light">·</span>
            <span className="text-emerald-600">{hovered.authentic} authentic</span>
            <span className="text-amber-600">{hovered.suspicious} suspicious</span>
            <span className="text-sky-600">{hovered.inconclusive} inconclusive</span>
          </>
        ) : (
          <span className="text-charcoal-light">Hover a bar for the daily verdict split</span>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-48 w-full sm:h-52"
          role="img"
          aria-label="Daily scan volume split by verdict over the last 14 days"
          preserveAspectRatio="none"
        >
          {/* Grid lines (HTML labels below stay crisp at any width) */}
          {geometry.gridLines.map((line) => (
            <line
              key={line.y}
              x1={PAD.left}
              y1={line.y}
              x2={CHART_W - PAD.right}
              y2={line.y}
              stroke="#e7e4dc"
              strokeWidth="1"
            />
          ))}

          {/* Stacked bars — inconclusive on top, authentic at the base */}
          {points.map((p, i) => {
            const { yInconclusive, ySuspicious, yAuthentic, bottom } = stackBounds(p)
            return (
              <g key={p.date}>
                <rect
                  x={geometry.x(i)}
                  y={yInconclusive}
                  width={geometry.barW}
                  height={Math.max(0, ySuspicious - yInconclusive)}
                  fill={VERDICT_SEGMENTS[2].color}
                />
                <rect
                  x={geometry.x(i)}
                  y={ySuspicious}
                  width={geometry.barW}
                  height={Math.max(0, yAuthentic - ySuspicious)}
                  fill={VERDICT_SEGMENTS[1].color}
                />
                <rect
                  x={geometry.x(i)}
                  y={yAuthentic}
                  width={geometry.barW}
                  height={Math.max(0, bottom - yAuthentic)}
                  fill={VERDICT_SEGMENTS[0].color}
                />
              </g>
            )
          })}

          {/* Hover guide + outlined bar */}
          {hoverIndex !== null && hovered ? (
            <>
              <line
                x1={geometry.x(hoverIndex) + geometry.barW / 2}
                y1={PAD.top}
                x2={geometry.x(hoverIndex) + geometry.barW / 2}
                y2={PAD.top + geometry.plotH}
                stroke="#1f2937"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.4"
              />
              <rect
                x={geometry.x(hoverIndex)}
                y={stackBounds(hovered).yInconclusive}
                width={geometry.barW}
                height={Math.max(0, stackBounds(hovered).bottom - stackBounds(hovered).yInconclusive)}
                fill="none"
                stroke="#1f2937"
                strokeWidth="1.5"
                rx="2"
              />
            </>
          ) : null}

          {/* Transparent hover hit-areas — one full cell per bar so no bar
              (including the first) falls in a dead zone */}
          {points.map((p, i) => (
            <rect
              key={`hit-${i}`}
              x={PAD.left + i * geometry.groupW}
              y={PAD.top}
              width={geometry.groupW}
              height={geometry.plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>

        {/* HTML axis labels */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {geometry.gridLines.map((line) => (
            <span
              key={`yl-${line.y}`}
              className="absolute -translate-y-1/2 pr-1 text-right font-mono text-[10px] text-charcoal-light/70"
              style={{ top: pctOfViewBoxY(line.y), left: 0, width: `${PAD.left - 4}px` }}
            >
              {Math.round(line.value)}
            </span>
          ))}
          {points.map((p, i) =>
            i % 2 === 0 || i === points.length - 1 ? (
              <span
                key={`xl-${i}`}
                className="absolute -translate-x-1/2 font-mono text-[10px] text-charcoal-light/70"
                style={{ left: pctOfViewBoxX(geometry.x(i) + geometry.barW / 2), bottom: 2 }}
              >
                {formatShortDate(p.date)}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {/* Legend with totals + shares */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {VERDICT_SEGMENTS.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-2 text-xs text-charcoal-mid">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.label} ({totals[segment.key].toLocaleString()} ·{' '}
            {formatPct(grandTotal > 0 ? totals[segment.key] / grandTotal : 0, 0)})
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Queue throughput (headline stats + self-hosted SVG hourly bars)
// ---------------------------------------------------------------------------

function QueueThroughputPanel({ throughput }) {
  const hourly = useMemo(() => throughput?.hourly_series || [], [
    throughput?.hourly_series,
  ])
  const hourlyMax = useMemo(
    () => hourly.reduce((max, p) => Math.max(max, p.processed || 0), 0),
    [hourly],
  )

  if (!throughput) return null

  const lastHour = hourly[hourly.length - 1] || null

  const barAreaH = 64
  const barBaseY = CHART_H - 20

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Queue throughput
        </p>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          12h
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Last hour</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {throughput.processed_last_hour ?? lastHour?.processed ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">scans / hr</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Avg time</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {formatDurationMs(throughput.avg_processing_time_ms)}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">per scan</p>
        </div>
        <div className="rounded-2xl border border-stone-light bg-parchment/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal-light">Queue depth</p>
          <p className="mt-1 font-serif text-2xl text-charcoal tabular-nums">
            {throughput.queue_depth ?? '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-light">
            {throughput.in_flight ?? 0} in flight
          </p>
        </div>
      </div>

      {hourly.length > 0 && hourlyMax > 0 && (
        <div className="mt-5">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="h-24 w-full"
            role="img"
            aria-label="Scans processed per hour over the last 12 hours"
            preserveAspectRatio="none"
          >
            {hourly.map((p, i) => {
              const slotW = (CHART_W - PAD.left - PAD.right) / hourly.length
              const barW = slotW * 0.64
              const barH = ((p.processed || 0) / hourlyMax) * barAreaH
              return (
                <rect
                  key={p.hour}
                  x={PAD.left + slotW * i + (slotW - barW) / 2}
                  y={barBaseY - barH}
                  width={barW}
                  height={barH}
                  rx="2"
                  fill={i === hourly.length - 1 ? '#1f2937' : '#c7c3b8'}
                />
              )
            })}
          </svg>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-charcoal-light/70">
            <span>{formatHourShort(hourly[0].hour)}</span>
            <span>{formatHourShort(hourly[Math.floor(hourly.length / 2)].hour)}</span>
            <span>{formatHourShort(lastHour.hour)}</span>
          </div>
        </div>
      )}

      <p className="mt-4 flex items-center justify-between border-t border-stone-light pt-4 text-xs text-charcoal-light">
        <span>
          Last 24h: {(throughput.processed_24h ?? 0).toLocaleString()} processed
        </span>
        <span className="font-medium text-rose-500">
          {formatPct(throughput.failure_rate, 0)} failure
        </span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top organizations table
// ---------------------------------------------------------------------------

const TOP_ORG_COLUMNS = [
  { key: 'name', label: 'Organization', sortable: true },
  { key: 'member_count', label: 'Members', sortable: true },
  {
    key: 'scan_count',
    label: 'Scans',
    sortable: true,
    render: (row) => row.scan_count.toLocaleString(),
  },
  {
    key: 'completion_rate',
    label: 'Completion',
    sortable: true,
    render: (row) => formatPct(row.completion_rate, 0),
  },
  {
    key: 'storage_used_gb',
    label: 'Storage',
    sortable: true,
    render: (row) => formatStorageGb(row.storage_used_gb),
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  const { data: rawAnalytics, loading, error, refetch } = useMockData(getAnalytics)

  // ── Demo-state forcing (dev-only, ?state=loading|empty|error) ─────────────
  const analytics = useMemo(() => {
    if (demoState === 'empty') return EMPTY_ANALYTICS
    return rawAnalytics
  }, [demoState, rawAnalytics])

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'

  // ── Derived ────────────────────────────────────────────────────────────────
  const mediaEntries = useMemo(() => {
    if (!analytics?.media_type_distribution) return []
    return Object.entries(analytics.media_type_distribution)
      .map(([mimeType, count]) => ({ mimeType, count }))
      .sort((a, b) => b.count - a.count)
  }, [analytics])

  const mediaTotal = useMemo(
    () => mediaEntries.reduce((sum, entry) => sum + entry.count, 0),
    [mediaEntries],
  )
  const mediaMax = useMemo(
    () => mediaEntries.reduce((max, entry) => Math.max(max, entry.count), 0),
    [mediaEntries],
  )

  const trend = useMemo(() => analytics?.volume_trend || [], [analytics])
  const verdictTrend = useMemo(() => analytics?.verdict_trend || [], [analytics])
  const queueThroughput = useMemo(() => analytics?.queue_throughput || null, [analytics])
  const topOrgs = useMemo(() => analytics?.top_organizations || [], [analytics])

  // ── Trend deltas derived from the actual series (no magic thresholds) ───────
  const trendDeltas = useMemo(() => {
    if (trend.length < 3) return null

    const last = trend[trend.length - 1]
    const previous = trend[trend.length - 2]

    const daily = previous.scans > 0
      ? Math.round(((last.scans - previous.scans) / previous.scans) * 100)
      : null

    if (trend.length >= 14) {
      const last7 = trend.slice(-7).reduce((sum, p) => sum + p.scans, 0)
      const prev7 = trend.slice(-14, -7).reduce((sum, p) => sum + p.scans, 0)
      const weekly = prev7 > 0
        ? Math.round(((last7 - prev7) / prev7) * 100)
        : null

      const last7Rate =
        trend.slice(-7).reduce((sum, p) => sum + p.completed, 0) / last7
      const prev7Rate =
        trend.slice(-14, -7).reduce((sum, p) => sum + p.completed, 0) / prev7
      const completion = prev7Rate > 0
        ? Math.round((last7Rate - prev7Rate) * 1000) / 10
        : null

      return { daily, weekly, completion }
    }

    return { daily, weekly: null, completion: null }
  }, [trend])

  const trendToday = trendDeltas?.daily != null
    ? { direction: trendDeltas.daily >= 0 ? 'up' : 'down', value: `${Math.abs(trendDeltas.daily)}%` }
    : null
  const trendWeek = trendDeltas?.weekly != null
    ? { direction: trendDeltas.weekly >= 0 ? 'up' : 'down', value: `${Math.abs(trendDeltas.weekly)}%` }
    : null
  const trendCompletion = trendDeltas?.completion != null
    ? { direction: trendDeltas.completion >= 0 ? 'up' : 'down', value: `${Math.abs(trendDeltas.completion)}%` }
    : null

  // ── Top-org sort state ──────────────────────────────────────────────────────
  // ── Team scoping (top-orgs panel) ────────────────────────────────────────
  // URL-backed (?team=) like the workspace surfaces. When a team is active the
  // top-orgs table recomputes from the scan ledger: scans carry team_id, and
  // each scan's user resolves to an org via the user registry, so the org
  // rows show that team's actual usage split.
  const [teamFilter, setTeamFilter] = useTeamFilterParam()

  const teamCounts = useMemo(() => {
    const counts = {}
    for (const scan of mockScans) {
      if (scan.team_id) counts[scan.team_id] = (counts[scan.team_id] || 0) + 1
    }
    return counts
  }, [])

  const userOrgByTeam = useMemo(() => {
    const orgByUser = new Map(mockUsers.map((u) => [u.id, u.org_id]))
    const byTeam = {}
    for (const scan of mockScans) {
      if (!scan.team_id) continue
      const orgId = orgByUser.get(scan.user_id)
      if (!orgId) continue
      const key = `${scan.team_id}::${orgId}`
      const entry = (byTeam[key] ||= { scans: 0, completed: 0 })
      entry.scans += 1
      if (scan.status === 'completed') entry.completed += 1
    }
    return byTeam
  }, [])

  const teamScopedTopOrgs = useMemo(() => {
    if (teamFilter === 'all') return null
    const orgNameById = new Map(mockOrganizations.map((o) => [o.id, o.name]))
    const storageByOrg = new Map(
      mockOrganizations.map((o) => [o.id, { member_count: o.member_count, storage_used_gb: o.storage_used_gb }]),
    )
    const prefix = `${teamFilter}::`
    return Object.entries(userOrgByTeam)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, stats]) => {
        const orgId = key.slice(prefix.length)
        const meta = storageByOrg.get(orgId) || { member_count: 0, storage_used_gb: 0 }
        return {
          id: orgId,
          name: orgNameById.get(orgId) || orgId,
          member_count: meta.member_count,
          scan_count: stats.scans,
          storage_used_gb: meta.storage_used_gb,
          completion_rate: stats.scans > 0 ? stats.completed / stats.scans : 0,
        }
      })
      .sort((a, b) => b.scan_count - a.scan_count)
  }, [teamFilter, userOrgByTeam])

  const [orgSort, setOrgSort] = useState({ key: null, dir: 'asc' })

  const sortedTopOrgs = useMemo(() => {
    const source = teamScopedTopOrgs || topOrgs
    if (!orgSort.key) return source

    return [...source].sort((a, b) => {
      const aVal = a[orgSort.key]
      const bVal = b[orgSort.key]
      const comparison =
        typeof aVal === 'string' && typeof bVal === 'string'
          ? aVal.localeCompare(bVal)
          : (Number(aVal) || 0) - (Number(bVal) || 0)
      return orgSort.dir === 'asc' ? comparison : -comparison
    })
  }, [teamScopedTopOrgs, topOrgs, orgSort])

  const handleOrgSort = useCallback((key, dir) => {
    setOrgSort({ key, dir })
  }, [])

  const isEmpty =
    demoState === 'empty' ||
    (analytics &&
      !isLoading &&
      !hasError &&
      (analytics.scans_today || 0) === 0 &&
      trend.length === 0 &&
      topOrgs.length === 0)

  const lastTrendPoint = trend.length > 0 ? trend[trend.length - 1] : null
  const updatedLabel = lastTrendPoint
    ? formatShortDate(lastTrendPoint.date)
    : 'No activity yet'

  // ── Page-scoped commands (must precede conditional returns) ───────────────
  useRegisterCommands(
    [
      {
        id: 'admin.go-overview',
        group: 'Analytics',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['analytics', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
      {
        id: 'admin.go-users',
        group: 'Analytics',
        label: 'Open user administration',
        hint: 'Manage accounts and roles',
        keywords: ['analytics', 'admin', 'users'],
        onSelect: () => navigate('/app/admin/users'),
      },
      {
        id: 'admin.export-analytics',
        group: 'Analytics',
        label: 'Export analytics snapshot',
        hint: 'Generate a CSV of current metrics',
        keywords: ['analytics', 'export', 'csv', 'report'],
        onSelect: () =>
          toast('Analytics snapshot queued', {
            description: 'A CSV export will be emailed to your admin address.',
            type: 'success',
          }),
      },
    ],
    [navigate, toast],
  )

  // ── Loading (demo ?state=loading forces the skeleton even with data) ────────
  if (demoState === 'loading' || (isLoading && !analytics)) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse rounded-[1.75rem] border border-stone-light bg-white-warm p-6 sm:p-8">
          <div className="h-3 w-28 rounded bg-stone-light/60" />
          <div className="mt-3 h-8 w-72 max-w-full rounded bg-stone-light/50" />
          <div className="mt-3 h-3 w-96 max-w-full rounded bg-stone-light/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <div className="mb-5 h-3 w-28 rounded bg-stone-light/60" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-stone-light/30" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <AppStatePanel
        label="Error"
        title="Analytics could not be loaded"
        description={
          demoState === 'error'
            ? 'Demo state — forced error for review. This is not a real outage.'
            : error || 'The analytics feed is temporarily unavailable. Retry to pull the latest metrics.'
        }
        variant="error"
        action={<Button onClick={refetch}>Retry</Button>}
      />
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <AppStatePanel
        label="Ready"
        title="No analytics yet"
        description="Scan volume, completion rates, and adoption metrics will populate as verifications run through the platform. Upload a media file or invite an organization to generate the first data points."
        variant="empty"
      >
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button to="/app/uploads" variant="secondary">
            Run a verification
          </Button>
          <Button to="/app/admin/waitlist" variant="ghost">
            Review waitlist
          </Button>
        </div>
      </AppStatePanel>
    )
  }

  const kpiTrendToday = trendToday
  const kpiTrendWeek = trendWeek
  const kpiTrendCompletion = trendCompletion

  // ── Populated ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Volume and quality signals"
        description="Scan volume, verdict mix, queue throughput, and organization adoption across the platform."
        meta={[
          { label: `${analytics.scans_today.toLocaleString()} scans today` },
          { label: `${formatPct(analytics.completion_rate, 1)} completion` },
          { label: `Updated ${updatedLabel}` },
        ]}
      />

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          size="sm"
          tone="info"
          label="Scans Today"
          value={analytics.scans_today.toLocaleString()}
          detail="Submitted in the last 24h"
          trend={kpiTrendToday}
        />
        <StatCard
          size="sm"
          tone="info"
          label="Scans 7-Day"
          value={analytics.scans_7d.toLocaleString()}
          detail="Rolling weekly volume"
          trend={kpiTrendWeek}
        />
        <StatCard
          size="sm"
          tone="success"
          label="Completion Rate"
          value={formatPct(analytics.completion_rate, 1)}
          detail="Scans finished successfully"
          trend={kpiTrendCompletion}
        />
        <StatCard
          size="sm"
          tone="warning"
          label="Failure Rate"
          value={formatPct(analytics.failure_rate, 1)}
          detail="Scans that errored out"
        />
        <StatCard
          size="sm"
          tone="danger"
          label="Suspicious Rate"
          value={formatPct(analytics.suspicious_rate, 1)}
          detail="Flagged for manual review"
        />
      </div>

      {/* ── Trend + rates ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart
            data={trend}
            emptyTitle="No volume data in range"
            emptyDescription="Extend the range or wait for new scans to land."
          />
        </div>

        <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Outcome rates
          </p>
          <div className="space-y-6">
            <RateMeter
              label="Completion"
              value={analytics.completion_rate}
              tone="success"
              detail="Finished with a full evidence payload"
            />
            <RateMeter
              label="Failure"
              value={analytics.failure_rate}
              tone="danger"
              detail="Errored before a verdict was produced"
            />
            <RateMeter
              label="Suspicious"
              value={analytics.suspicious_rate}
              tone="warning"
              detail="Flagged for manual review"
            />
          </div>
        </div>
      </div>

      {/* ── Verdict mix + queue throughput ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {verdictTrend.length === 0 ? (
            <div className="rounded-3xl border border-stone-light bg-white-warm p-8 text-center shadow-sm">
              <p className="font-serif text-lg text-charcoal">No verdict data in range</p>
              <p className="mt-1 text-sm text-charcoal-mid">
                Completed scans will split by verdict here as they land.
              </p>
            </div>
          ) : (
            <VerdictVolumeChart trend={verdictTrend} />
          )}
        </div>
        <QueueThroughputPanel throughput={queueThroughput} />
      </div>

      {/* ── Media mix + top orgs ───────────────────────────────────────────── */}
      {/* min-w-0 lets the AdminTable scroll internally instead of stretching the grid track */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Media-type distribution
              </p>
              <p className="mt-1 text-sm text-charcoal-mid">
                {mediaTotal.toLocaleString()} total uploads in range
              </p>
            </div>
            <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
              {mediaEntries.length} types
            </span>
          </div>

          {mediaEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-charcoal-mid">No media types recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {mediaEntries.map((entry) => (
                <div
                  key={entry.mimeType}
                  className="flex items-center gap-3 text-charcoal"
                  style={{ color: MEDIA_COLORS[entry.mimeType] || '#1f2937' }}
                >
                  <MediaTypeBar
                    mimeType={entry.mimeType}
                    count={entry.count}
                    total={mediaTotal}
                    max={mediaMax}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Top organizations by usage
            </p>
            <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
              {teamFilter === 'all'
                ? `${topOrgs.length} of ${topOrgs.length} ranked`
                : `${getTeamMeta(teamFilter).short} scoped`}
            </span>
          </div>
          <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} label="Team" />
          {teamFilter !== 'all' && teamScopedTopOrgs.length === 0 && (
            <p className="mt-3 rounded-xl border border-stone-light bg-white-warm px-4 py-3 text-xs text-charcoal-mid">
              No organization usage recorded for the {getTeamMeta(teamFilter).name} team yet.
            </p>
          )}
          <div className="mt-3">
            <AdminTable
              columns={TOP_ORG_COLUMNS}
              data={sortedTopOrgs}
              loading={false}
              onSort={handleOrgSort}
              page={1}
              pageSize={sortedTopOrgs.length || 10}
              total={sortedTopOrgs.length}
              emptyMessage="No organization usage recorded yet."
              filteredEmptyMessage="No organizations match your search."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
