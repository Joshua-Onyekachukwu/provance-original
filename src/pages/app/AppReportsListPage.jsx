import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import StatCard from '../../components/admin/StatCard.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getScanStatusMeta,
} from '../../components/app/scanPresentation.js'
import { listScans } from '../../lib/api.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

const VERDICT_OPTIONS = [
  { value: '', label: 'All verdicts' },
  { value: 'authentic', label: 'Authentic' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'inconclusive', label: 'Inconclusive' },
  { value: 'pending', label: 'Pending' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'filename_asc', label: 'Filename A–Z' },
  { value: 'filename_desc', label: 'Filename Z–A' },
  { value: 'confidence_high', label: 'Confidence: high to low' },
  { value: 'confidence_low', label: 'Confidence: low to high' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVerdictClass(scan) {
  if (scan.status !== 'completed' || !scan.result_payload?.verdict) return 'pending'
  const cls = scan.result_payload.verdict.class
  if (cls === 'likely_authentic') return 'authentic'
  return cls || 'pending'
}

function getConfidencePercent(scan) {
  const score = scan.result_payload?.verdict?.confidence_score
  return Number.isFinite(score) ? Math.round(score * 100) : null
}

function getReportId(scan) {
  return scan.result_payload?.report?.report_id || scan.result_payload?.report_id || 'Pending'
}

function getFileTypeIcon(mimeType) {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📑'
  return '📄'
}

// ── Verdict Badge ─────────────────────────────────────────────────────────────

const VERDICT_META = {
  authentic: { label: 'Authentic', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  suspicious: { label: 'Suspicious', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  inconclusive: { label: 'Inconclusive', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: 'Pending', badge: 'bg-stone-100 text-charcoal-light border-stone-light' },
}

function VerdictBadge({ verdict }) {
  const meta = VERDICT_META[verdict] || VERDICT_META.pending
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] ${meta.badge}`}>
      {meta.label}
    </span>
  )
}

// ── Confidence Bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ percent }) {
  if (percent === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-stone-light" />
        <span className="text-[11px] uppercase tracking-[0.16em] text-charcoal-light">Pending</span>
      </div>
    )
  }

  const fillColor =
    percent >= 75 ? 'bg-emerald-500' : percent >= 45 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-stone-light">
        <div
          className={`h-full rounded-full transition-all ${fillColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums text-charcoal">{percent}%</span>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function ReportCardSkeleton() {
  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-5 shadow-sm">
      <div className="mb-4 h-40 animate-pulse rounded-2xl bg-stone-light/50" />
      <div className="space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded-lg bg-stone-light/50" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-stone-light/50" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-stone-light/50" />
      </div>
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1.4fr)_120px_100px_100px] items-center gap-3 rounded-2xl border border-stone-light bg-white-warm px-4 py-4">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-stone-light/50" />
      <div className="space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-stone-light/50" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-stone-light/50" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-stone-light/50" />
      <div className="h-3 w-12 animate-pulse rounded bg-stone-light/50" />
      <div className="h-4 w-16 animate-pulse rounded bg-stone-light/50" />
    </div>
  )
}

// ── Report Card (Grid) ────────────────────────────────────────────────────────

function ReportCard({ scan }) {
  const verdict = getVerdictClass(scan)
  const confidence = getConfidencePercent(scan)
  const statusMeta = getScanStatusMeta(scan.status)
  const isCompleted = scan.status === 'completed'

  return (
    <Link
      to={`/app/reports/${scan.id}`}
      className="group flex flex-col rounded-3xl border border-stone-light bg-white-warm p-5 shadow-sm transition hover:border-charcoal/25 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-stone-light bg-parchment">
        {scan.asset_preview_url ? (
          <img
            src={scan.asset_preview_url}
            alt={scan.original_filename}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl opacity-40">{getFileTypeIcon(scan.mime_type)}</span>
        )}
      </div>

      {/* Filename */}
      <p className="truncate text-sm font-medium text-charcoal">{scan.original_filename}</p>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={verdict} />
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] ${statusMeta.badge}`}>
          {statusMeta.label}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mt-3">
        <ConfidenceBar percent={isCompleted ? confidence : null} />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-stone-light pt-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-charcoal-light">
          {formatScanTimestamp(scan.created_at)}
        </span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-charcoal-light">
          {formatFileSize(scan.file_size_bytes)}
        </span>
      </div>
    </Link>
  )
}

// ── Report Row (Table) ────────────────────────────────────────────────────────

function ReportRow({ scan }) {
  const verdict = getVerdictClass(scan)
  const confidence = getConfidencePercent(scan)
  const statusMeta = getScanStatusMeta(scan.status)

  return (
    <Link
      to={`/app/reports/${scan.id}`}
      className="grid grid-cols-[48px_minmax(0,1.4fr)_120px_100px_100px] items-center gap-3 rounded-2xl border border-stone-light bg-white-warm px-4 py-4 transition hover:border-charcoal/25 hover:shadow-sm"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-stone-light bg-parchment">
        {scan.asset_preview_url ? (
          <img
            src={scan.asset_preview_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-lg">{getFileTypeIcon(scan.mime_type)}</span>
        )}
      </div>

      {/* Filename + date */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{scan.original_filename}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-charcoal-light">
          {formatScanTimestamp(scan.created_at)} · {formatFileSize(scan.file_size_bytes)}
        </p>
      </div>

      {/* Verdict */}
      <VerdictBadge verdict={verdict} />

      {/* Confidence */}
      <ConfidenceBar percent={scan.status === 'completed' ? confidence : null} />

      {/* Status */}
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] ${statusMeta.badge}`}>
        {statusMeta.label}
      </span>
    </Link>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AppReportsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: 'loading', scans: [], error: '' })

  // View mode
  const [viewMode, setViewMode] = useState(() => {
    const stored = (typeof window !== 'undefined' && window.localStorage.getItem('provance.reports.view'))
    return stored === 'table' ? 'table' : 'grid'
  })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [verdictFilter, setVerdictFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Pagination
  const pageParam = Number(searchParams.get('page')) || 1
  const [currentPage, setCurrentPage] = useState(pageParam)

  // Sync URL param
  useEffect(() => {
    setCurrentPage(pageParam)
  }, [pageParam])

  // Persist view mode
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === 'grid' ? 'table' : 'grid'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('provance.reports.view', next)
      }
      return next
    })
  }, [])

  // Load scans
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await listScans()
        if (cancelled) return
        setState({ status: 'ready', scans: response.data || response.scans || [], error: '' })
      } catch (err) {
        if (cancelled) return
        setState({ status: 'error', scans: [], error: err.message || 'Failed to load reports.' })
      }
    }

    setState({ status: 'loading', scans: [], error: '' })
    void load()

    return () => { cancelled = true }
  }, [])

  // Filter + sort
  const filteredScans = useMemo(() => {
    let scans = [...state.scans]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      scans = scans.filter(
        (s) =>
          s.original_filename.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.result_payload?.report?.report_id || '').toLowerCase().includes(q)
      )
    }

    // Verdict filter
    if (verdictFilter) {
      scans = scans.filter((s) => getVerdictClass(s) === verdictFilter)
    }

    // Sort
    scans.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'filename_asc':
          return a.original_filename.localeCompare(b.original_filename)
        case 'filename_desc':
          return b.original_filename.localeCompare(a.original_filename)
        case 'confidence_high':
          return (getConfidencePercent(b) || 0) - (getConfidencePercent(a) || 0)
        case 'confidence_low':
          return (getConfidencePercent(a) || 0) - (getConfidencePercent(b) || 0)
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    return scans
  }, [state.scans, searchQuery, verdictFilter, sortBy])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredScans.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedScans = filteredScans.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const setPage = (page) => {
    setCurrentPage(page)
    setSearchParams(page > 1 ? { page: String(page) } : {}, { replace: true })
  }

  // KPIs
  const kpis = useMemo(() => {
    const scans = state.scans
    const total = scans.length
    const authentic = scans.filter((s) => getVerdictClass(s) === 'authentic').length
    const suspicious = scans.filter((s) => getVerdictClass(s) === 'suspicious').length
    const inconclusive = scans.filter((s) => getVerdictClass(s) === 'inconclusive').length
    return { total, authentic, suspicious, inconclusive }
  }, [state.scans])

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return (
      <div className="space-y-8">
        {/* KPI skeletons */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-5">
              <div className="mb-2 h-3 w-16 rounded bg-stone-light/50" />
              <div className="h-8 w-12 rounded bg-stone-light/50" />
            </div>
          ))}
        </div>
        {/* Grid skeletons */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (state.status === 'error') {
    return (
      <AppStatePanel
        label="Error"
        title="Reports could not be loaded"
        description={state.error || 'An unexpected error occurred while fetching reports.'}
        variant="error"
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
          >
            Retry
          </button>
        }
      />
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────────

  if (state.status === 'ready' && state.scans.length === 0) {
    return (
      <AppStatePanel
        label="Empty"
        title="No reports yet"
        description="Complete a verification first and the resulting report will appear here."
        variant="empty"
        action={
          <Link
            to="/app/uploads"
            className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
          >
            Start verification
          </Link>
        }
      />
    )
  }

  // ── Populated ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Reports"
          value={String(kpis.total)}
          tone="default"
        />
        <StatCard
          label="Authentic"
          value={String(kpis.authentic)}
          tone="success"
        />
        <StatCard
          label="Suspicious"
          value={String(kpis.suspicious)}
          tone="danger"
        />
        <StatCard
          label="Inconclusive"
          value={String(kpis.inconclusive)}
          tone="warning"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-stone-light bg-white-warm p-4 shadow-sm">
        {/* Search */}
        <div className="min-w-0 flex-1">
          <label htmlFor="report-search" className="sr-only">Search reports</label>
          <input
            id="report-search"
            type="text"
            placeholder="Search by filename or report ID…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-xl border border-stone-light bg-parchment px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal/35"
          />
        </div>

        {/* Verdict filter */}
        <select
          value={verdictFilter}
          onChange={(e) => {
            setVerdictFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-stone-light bg-parchment px-4 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal/35"
        >
          {VERDICT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-stone-light bg-parchment px-4 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal/35"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="inline-flex rounded-xl border border-stone-light bg-parchment p-1">
          <button
            type="button"
            onClick={() => viewMode !== 'grid' && toggleViewMode()}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'grid'
                ? 'bg-charcoal text-parchment'
                : 'text-charcoal-mid hover:text-charcoal'
            }`}
            aria-pressed={viewMode === 'grid'}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => viewMode !== 'table' && toggleViewMode()}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'table'
                ? 'bg-charcoal text-parchment'
                : 'text-charcoal-mid hover:text-charcoal'
            }`}
            aria-pressed={viewMode === 'table'}
          >
            Table
          </button>
        </div>
      </div>

      {/* Filtered empty state */}
      {filteredScans.length === 0 ? (
        <AppStatePanel
          label="No matches"
          title="No reports match your filters"
          description="Try adjusting your search query or verdict filter to see more results."
          variant="empty"
          action={
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setVerdictFilter('')
                setSortBy('newest')
                setPage(1)
              }}
              className="inline-flex rounded-xl border border-stone-light px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedScans.map((scan) => (
                <ReportCard key={scan.id} scan={scan} />
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="space-y-2">
              {/* Table header */}
              <div className="grid grid-cols-[48px_minmax(0,1.4fr)_120px_100px_100px] items-center gap-3 rounded-2xl px-4 py-2">
                <span />
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">File</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Verdict</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Confidence</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Status</p>
              </div>
              {paginatedScans.map((scan) => (
                <ReportRow key={scan.id} scan={scan} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-3xl border border-stone-light bg-white-warm px-6 py-4 shadow-sm">
              <p className="text-sm text-charcoal-mid">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredScans.length)} of{' '}
                {filteredScans.length} reports
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="rounded-xl border border-stone-light px-3 py-1.5 text-sm text-charcoal transition hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      p === safePage
                        ? 'bg-charcoal text-parchment'
                        : 'text-charcoal hover:bg-stone-light/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="rounded-xl border border-stone-light px-3 py-1.5 text-sm text-charcoal transition hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
