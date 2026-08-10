import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  ChartHoverReadout,
  CHART_H,
  CHART_W,
  EmptyState,
  PAD,
  pctOfViewBoxX,
  useRegisterCommands,
  useToast,
} from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import {
  formatDateTime,
  formatDurationMs,
  formatFileSize,
  getScanStatusMeta,
} from '../../components/app/scanPresentation.js'
import { failJob, getAdminJobs, retryJob } from '../../lib/api.js'
import { useDemoState } from '../../lib/useDemoState.js'
import useMockData from '../../lib/useMockData.js'

// ---------------------------------------------------------------------------
// Presentation meta
// ---------------------------------------------------------------------------

const PRIORITY_META = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'neutral' },
}

const MEDIA_SHORT = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'video/mp4': 'MP4',
  'audio/wav': 'WAV',
  'audio/ogg': 'OGG',
  'audio/mpeg': 'MP3',
  'application/pdf': 'PDF',
}

function mediaLabel(mimeType) {
  return MEDIA_SHORT[mimeType] || (mimeType || 'file').split('/').pop().toUpperCase()
}

function jobDuration(job) {
  if (!job.started_at || !job.completed_at) return '—'
  const ms = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
  return Number.isFinite(ms) ? formatDurationMs(ms) : '—'
}

// ---------------------------------------------------------------------------
// Job detail drawer content
// ---------------------------------------------------------------------------

// ── Result payload inspector (completed jobs) ───────────────────────────────

function PayloadInspector({ payload }) {
  const [open, setOpen] = useState(false)

  if (!payload) return null

  const signalCount = Array.isArray(payload.signals) ? payload.signals.length : 0
  const json = JSON.stringify(payload, null, 2)

  return (
    <div className="rounded-2xl border border-stone-light bg-parchment/70 p-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
            Result payload
          </p>
          <p className="mt-1 text-sm text-charcoal">
            {signalCount} signal{signalCount === 1 ? '' : 's'}
            {payload.report_id ? ` · ${payload.report_id}` : ''}
          </p>
        </div>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-charcoal-mid transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-charcoal p-4 font-mono text-[11px] leading-relaxed text-parchment/90">
          {json}
        </pre>
      )}
    </div>
  )
}

function JobDetail({ job }) {
  const status = getScanStatusMeta(job.status)
  const priority = PRIORITY_META[job.priority] || PRIORITY_META.low

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-light bg-parchment/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-charcoal">{job.id}</span>
          <Badge tone={status.tone} size="sm">
            {status.label}
          </Badge>
        </div>
        <p className="mt-2 break-all text-sm text-charcoal">{job.original_filename}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={priority.tone} size="sm">
            {priority.label} priority
          </Badge>
          <span className="rounded-md border border-stone-light bg-white-warm px-2 py-0.5 font-mono text-[11px] text-charcoal-mid">
            {mediaLabel(job.mime_type)}
          </span>
          <span className="rounded-md border border-stone-light bg-white-warm px-2 py-0.5 font-mono text-[11px] text-charcoal-mid">
            {formatFileSize(job.file_size_bytes ?? 0) === 'Unknown size' ? '—' : formatFileSize(job.file_size_bytes ?? 0)}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Status</dt>
          <dd className="mt-1 text-charcoal">{status.label}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Progress</dt>
          <dd className="mt-1 text-charcoal">{job.progress ?? 0}%</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Attempts</dt>
          <dd className="mt-1 font-mono text-xs text-charcoal">{job.attempts ?? 1}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Worker</dt>
          <dd className="mt-1 font-mono text-xs text-charcoal">{job.worker || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Mode</dt>
          <dd className="mt-1 capitalize text-charcoal">{job.processing_mode || 'standard'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Duration</dt>
          <dd className="mt-1 text-charcoal">{jobDuration(job)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Created</dt>
          <dd className="mt-1 text-charcoal">{formatDateTime(job.created_at)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Completed</dt>
          <dd className="mt-1 text-charcoal">{formatDateTime(job.completed_at, '—')}</dd>
        </div>
      </dl>

      {job.error && (
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-rose-700">Failure reason</div>
          <p className="mt-2 text-sm leading-relaxed text-rose-900">{job.error}</p>
        </div>
      )}

      {job.result_payload && <PayloadInspector payload={job.result_payload} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Worker utilization panel
// ---------------------------------------------------------------------------

// Stack order for the per-worker bar (bottom-up) — failed sits on top so red
// reads as the headline risk. Colors mirror the scan-status badge tones
// (sky/emerald/rose) with queued on the neutral stone and in-flight on the
// brand trust blue.
const WORKER_SEGMENTS = [
  { key: 'queued', label: 'Queued', color: '#bec5d0', readoutClass: 'text-charcoal-mid' },
  { key: 'processing', label: 'In-flight', color: '#2f5bea', readoutClass: 'text-sky-700' },
  { key: 'completed', label: 'Completed', color: '#10b981', readoutClass: 'text-emerald-700' },
  { key: 'failed', label: 'Failed', color: '#fb7185', readoutClass: 'text-rose-700' },
]

function workerLabel(worker) {
  if (!worker) return 'Unassigned'
  return worker.replace(/^worker-/, '').toUpperCase()
}

function WorkerUtilizationPanel({ stats, total }) {
  const [hoverIdx, setHoverIdx] = useState(null)

  if (total === 0 || stats.length === 0) {
    return (
      <div className="rounded-3xl border border-stone-light bg-white-warm p-8 text-center shadow-sm">
        <p className="font-serif text-lg text-charcoal">No worker activity yet</p>
        <p className="mt-1 text-sm text-charcoal-mid">Jobs will be attributed to workers as the queue processes them.</p>
      </div>
    )
  }

  const n = stats.length
  const slotW = (CHART_W - PAD.left - PAD.right) / n
  const barW = slotW * 0.56
  const plotH = CHART_H - PAD.top - PAD.bottom
  const max = Math.max(1, ...stats.map((s) => s.total))
  const hovered = hoverIdx != null ? stats[hoverIdx] : null

  return (
    <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Worker utilization
          </p>
          <p className="mt-1 text-sm text-charcoal-mid">
            Jobs per worker, split by pipeline state — where the pool is busy and where failures concentrate.
          </p>
        </div>
        <span className="rounded-full bg-stone-light/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
          {stats.length} worker{stats.length === 1 ? '' : 's'} · {total} jobs
        </span>
      </div>

      {/* Per-worker counts: in-flight / completed / failed */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((workerStat) => (
          <div key={workerStat.worker || 'unassigned'} className="rounded-2xl border border-stone-light bg-parchment/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-charcoal">{workerLabel(workerStat.worker)}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal-light">
                {workerStat.total} job{workerStat.total === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-charcoal-mid">
              {WORKER_SEGMENTS.filter((seg) => seg.key !== 'queued').map((seg) => (
                <span key={seg.key} className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seg.color }} aria-hidden="true" />
                  {seg.label} {workerStat[seg.key] ?? 0}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Self-hosted SVG bars — jobs per worker stacked by state */}
      <div className="mt-6">
        <ChartHoverReadout
          size="compact"
          label={hovered ? workerLabel(hovered.worker) : null}
          hint="Hover a bar for the per-worker breakdown"
          items={
            hovered
              ? WORKER_SEGMENTS.filter((seg) => (hovered[seg.key] ?? 0) > 0).map((seg) => ({
                  key: seg.key,
                  text: `${hovered[seg.key]} ${seg.label.toLowerCase()}`,
                  className: seg.readoutClass,
                }))
              : []
          }
        />
        <div className="relative">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="h-48 w-full"
            role="img"
            aria-label="Jobs per worker stacked by queued, in-flight, completed, and failed"
          >
            {stats.map((workerStat, i) => {
              const slotX = PAD.left + slotW * i
              const centerX = slotX + slotW / 2
              const barX = centerX - barW / 2
              const isHovered = hoverIdx === i
              let yCursor = PAD.top + plotH
              const segs = WORKER_SEGMENTS.filter((seg) => (workerStat[seg.key] ?? 0) > 0).map((seg) => {
                const height = ((workerStat[seg.key] ?? 0) / max) * plotH
                const rect = { ...seg, x: barX, y: yCursor - height, height }
                yCursor -= height
                return rect
              })
              return (
                <g key={workerStat.worker || 'unassigned'}>
                  {segs.map((seg) => (
                    <rect
                      key={seg.key}
                      x={seg.x}
                      y={seg.y}
                      width={barW}
                      height={Math.max(seg.height, 0.5)}
                      fill={seg.color}
                      rx={3}
                    />
                  ))}
                  {isHovered && (
                    <rect
                      x={barX - 2.5}
                      y={PAD.top}
                      width={barW + 5}
                      height={plotH}
                      fill="none"
                      stroke="#13161d"
                      strokeWidth={1.5}
                      rx={5}
                    />
                  )}
                  <rect
                    x={slotX}
                    y={PAD.top}
                    width={slotW}
                    height={plotH}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                  >
                    <title>{`${workerLabel(workerStat.worker)} · ${workerStat.total} jobs`}</title>
                  </rect>
                </g>
              )
            })}
          </svg>

          {/* Worker axis labels — crisp HTML overlay, same treatment as the chart kit */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {stats.map((workerStat, i) => {
              const centerX = PAD.left + slotW * i + slotW / 2
              return (
                <span
                  key={workerStat.worker || 'unassigned'}
                  className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-charcoal-light/80"
                  style={{ left: pctOfViewBoxX(centerX), bottom: 0 }}
                >
                  {workerLabel(workerStat.worker)}
                </span>
              )
            })}
          </div>
        </div>

        {/* Legend — stack order bottom-up */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {WORKER_SEGMENTS.map((seg) => (
            <span key={seg.key} className="inline-flex items-center gap-1.5 text-xs text-charcoal-mid">
              <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: seg.color }} aria-hidden="true" />
              {seg.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 8

export default function JobsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  const { data: rawData, loading, error, refetch } = useMockData(getAdminJobs)

  const EMPTY_JOBS = useMemo(() => ({ data: [], total: 0 }), [])
  const data = demoState === 'empty' ? EMPTY_JOBS : rawData

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'
  const jobs = useMemo(() => data?.data || [], [data])

  const [status, setStatus] = useState('all')
  const [worker, setWorker] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedJob, setSelectedJob] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const statusCounts = useMemo(() => {
    const counts = { queued: 0, processing: 0, completed: 0, failed: 0 }
    jobs.forEach((job) => {
      counts[job.status] = (counts[job.status] || 0) + 1
    })
    return counts
  }, [jobs])

  // Per-worker pipeline counts for the utilization panel + the worker filter.
  // Derived from the ledger so mock and real modes stay in sync with whatever
  // worker attribution the API returns (null worker → 'Unassigned').
  const workerStats = useMemo(() => {
    const map = new Map()
    for (const job of jobs) {
      const key = job.worker || 'unassigned'
      if (!map.has(key)) {
        map.set(key, { worker: job.worker || null, queued: 0, processing: 0, completed: 0, failed: 0, total: 0 })
      }
      const stat = map.get(key)
      if (job.status in stat) {
        stat[job.status] += 1
      }
      stat.total += 1
    }
    return [...map.values()].sort(
      (a, b) => b.total - a.total || String(a.worker || '').localeCompare(String(b.worker || '')),
    )
  }, [jobs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((job) => {
      if (status !== 'all' && job.status !== status) return false
      if (worker !== 'all') {
        if (worker === 'unassigned') {
          if (job.worker) return false
        } else if (job.worker !== worker) {
          return false
        }
      }
      if (!q) return true
      return (
        (job.original_filename || '').toLowerCase().includes(q) ||
        (job.id || '').toLowerCase().includes(q) ||
        (job.scan_id || '').toLowerCase().includes(q) ||
        (job.worker || '').toLowerCase().includes(q)
      )
    })
  }, [jobs, status, worker, query])

  const hasActiveFilters = status !== 'all' || worker !== 'all' || query.trim() !== ''
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  function resetPage() {
    setPage(1)
  }

  function clearFilters() {
    setStatus('all')
    setWorker('all')
    setQuery('')
    resetPage()
  }

  const handleRetry = useCallback(
    async (job) => {
      setBusyId(job.id)
      try {
        await retryJob(job.id)
        toast('Job re-queued', {
          description: `${job.id} moved back to the queue for another attempt.`,
          type: 'success',
        })
        refetch()
      } catch (error) {
        toast('Job could not be re-queued', {
          description: error instanceof Error ? error.message : 'The retry did not complete.',
          type: 'error',
        })
      } finally {
        setBusyId(null)
      }
    },
    [toast, refetch],
  )

  const handleFail = useCallback(
    async (job) => {
      setBusyId(job.id)
      try {
        await failJob(job.id)
        toast('Job marked failed', {
          description: `${job.id} stopped and recorded as failed.`,
          type: 'success',
        })
        refetch()
      } catch (error) {
        toast('Job could not be failed', {
          description: error instanceof Error ? error.message : 'The fail action did not complete.',
          type: 'error',
        })
      } finally {
        setBusyId(null)
      }
    },
    [toast, refetch],
  )

  useRegisterCommands(
    [
      {
        id: 'admin.jobs-failed',
        group: 'Verification Jobs',
        label: 'Filter to failed jobs',
        hint: `${statusCounts.failed || 0} jobs`,
        keywords: ['jobs', 'failed', 'filter', 'queue'],
        onSelect: () => {
          setStatus('failed')
          resetPage()
        },
      },
      {
        id: 'admin.jobs-retry-failed',
        group: 'Verification Jobs',
        label: 'Retry all failed jobs',
        hint: `${statusCounts.failed || 0} job${statusCounts.failed === 1 ? '' : 's'}`,
        keywords: ['jobs', 'retry', 'failed', 'requeue'],
        onSelect: async () => {
          const failedJobs = jobs.filter((j) => j.status === 'failed')
          for (const job of failedJobs) {
            await handleRetry(job)
          }
        },
      },
      {
        id: 'admin.jobs-clear',
        group: 'Verification Jobs',
        label: 'Clear job filters',
        hint: hasActiveFilters ? 'Reset the current view' : 'No filters active',
        keywords: ['jobs', 'clear', 'reset', 'filters'],
        onSelect: clearFilters,
      },
      {
        id: 'admin.jobs-go-overview',
        group: 'Verification Jobs',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['jobs', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [statusCounts, hasActiveFilters, jobs, handleRetry, navigate, toast],
  )

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: 'Job',
        sortable: true,
        sortValue: (row) => Number(row.id.replace(/\D/g, '')),
        render: (row) => (
          <span className="font-mono text-xs text-charcoal">{row.id}</span>
        ),
      },
      {
        key: 'original_filename',
        header: 'File',
        render: (row) => (
          <span className="block max-w-[16rem] truncate text-charcoal" title={row.original_filename}>
            {row.original_filename}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (row) => {
          const meta = getScanStatusMeta(row.status)
          return <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
        },
      },
      {
        key: 'priority',
        header: 'Priority',
        sortable: true,
        render: (row) => {
          const meta = PRIORITY_META[row.priority] || PRIORITY_META.low
          return <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
        },
      },
      {
        key: 'progress',
        header: 'Progress',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-light">
              <span
                className="block h-full rounded-full bg-charcoal"
                style={{ width: `${Math.min(100, Math.max(0, row.progress || 0))}%` }}
              />
            </span>
            <span className="text-xs tabular-nums text-charcoal-mid">{row.progress ?? 0}%</span>
          </span>
        ),
      },
      {
        key: 'worker',
        header: 'Worker',
        render: (row) => <span className="font-mono text-xs text-charcoal-mid">{row.worker || '—'}</span>,
      },
      {
        key: 'created_at',
        header: 'Queued',
        sortable: true,
        sortValue: (row) => new Date(row.created_at).getTime(),
        render: (row) => (
          <time dateTime={row.created_at} className="text-xs text-charcoal-light tabular-nums">
            {formatDateTime(row.created_at)}
          </time>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={busyId === row.id} onClick={(e) => { e.stopPropagation(); setSelectedJob(row) }}>
              Inspect
            </Button>
            {row.status === 'failed' && (
              <Button variant="secondary" size="sm" disabled={busyId === row.id} onClick={(e) => { e.stopPropagation(); handleRetry(row) }}>
                Retry
              </Button>
            )}
            {(row.status === 'queued' || row.status === 'processing') && (
              <Button variant="ghost" size="sm" disabled={busyId === row.id} onClick={(e) => { e.stopPropagation(); handleFail(row) }}>
                Fail
              </Button>
            )}
          </div>
        ),
      },
    ],
    [busyId, handleRetry, handleFail],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Verification Jobs"
        title="The global job ledger"
        description="Every verification job across the platform — status, priority, worker, and progress. Inspect any job for its timeline and failure details, or re-queue failed work."
        meta={[
          { label: `${jobs.length} jobs` },
          { label: `${workerStats.length} worker${workerStats.length === 1 ? '' : 's'}` },
          { label: `${statusCounts.queued || 0} queued` },
          { label: `${statusCounts.processing || 0} processing` },
          { label: `${statusCounts.failed || 0} failed` },
        ]}
      />

      {!isLoading && !hasError && <WorkerUtilizationPanel stats={workerStats} total={jobs.length} />}

      <Card
        eyebrow="Job ledger"
        title="Verification jobs"
        description="Newest first — status and priority badges per job. Click Inspect for the full detail."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={6}
      >
        {!isLoading && !hasError && (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-light">
                  Status
                </span>
                {['all', 'queued', 'processing', 'completed', 'failed'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={status === value}
                    onClick={() => {
                      setStatus(value)
                      resetPage()
                    }}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
                      status === value
                        ? 'border-charcoal bg-charcoal text-white-warm'
                        : 'border-stone-light bg-parchment text-charcoal-mid hover:text-charcoal'
                    }`}
                  >
                    {value === 'all' ? 'All' : getScanStatusMeta(value).label}
                    <span className="ml-1.5 opacity-70">
                      {value === 'all' ? jobs.length : statusCounts[value] || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-light">
                  Worker
                </span>
                {[
                  { value: 'all', label: 'All workers', count: jobs.length },
                  ...workerStats.map((s) => ({
                    value: s.worker || 'unassigned',
                    label: workerLabel(s.worker),
                    count: s.total,
                  })),
                ].map(({ value, label, count }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={worker === value}
                    onClick={() => {
                      setWorker(value)
                      resetPage()
                    }}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
                      worker === value
                        ? 'border-charcoal bg-charcoal text-white-warm'
                        : 'border-stone-light bg-parchment text-charcoal-mid hover:text-charcoal'
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 opacity-70">{count}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="relative block w-full sm:w-64">
                  <span className="sr-only">Search jobs</span>
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      resetPage()
                    }}
                    placeholder="Search file, job, worker…"
                    className="w-full rounded-xl border border-stone-light bg-parchment py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal-light"
                  />
                </label>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  variant="empty"
                  title={hasActiveFilters ? 'No matching jobs' : 'No verification jobs yet'}
                  description={
                    hasActiveFilters
                      ? 'Try different filters or clear them to see the full ledger.'
                      : 'Uploads routed through the verification pipeline will appear here.'
                  }
                  compact
                />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-light bg-white-warm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-light bg-parchment/60">
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className={`px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-light/70">
                    {visible.map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="cursor-pointer transition-colors hover:bg-parchment/50"
                      >
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={`px-4 py-3.5 align-middle ${column.align === 'right' ? 'text-right tabular-nums' : 'text-left'} text-charcoal-mid`}
                          >
                            {column.render(job)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-between border-t border-stone-light pt-4">
                <p className="text-xs text-charcoal-light">
                  Showing {Math.min(filtered.length, (safePage - 1) * PAGE_SIZE + PAGE_SIZE)} of{' '}
                  {filtered.length} jobs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-white-warm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs text-charcoal-mid tabular-nums">
                    {safePage} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-white-warm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Job detail drawer ─────────────────────────────────────────────── */}
      {selectedJob && (
        <div className="fixed inset-0 z-40 bg-charcoal/30 backdrop-blur-sm" onClick={() => setSelectedJob(null)} aria-hidden="true" />
      )}
      {selectedJob && (
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`Job ${selectedJob.id} detail`}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-stone-light bg-white-warm shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-light bg-parchment/60 px-6 py-5">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Verification job
              </p>
              <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.05em] text-charcoal">
                {selectedJob.id}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedJob(null)}
              className="rounded-xl border border-stone-light bg-white p-2 text-charcoal-mid transition hover:border-charcoal hover:text-charcoal"
              aria-label="Close job detail"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <JobDetail job={selectedJob} />
            <div className="mt-5 flex items-center gap-3">
              {selectedJob.status === 'failed' && (
                <Button variant="secondary" size="sm" disabled={busyId === selectedJob.id} onClick={() => handleRetry(selectedJob)}>
                  Re-queue job
                </Button>
              )}
              {(selectedJob.status === 'queued' || selectedJob.status === 'processing') && (
                <Button variant="ghost" size="sm" disabled={busyId === selectedJob.id} onClick={() => handleFail(selectedJob)}>
                  Fail job
                </Button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Demo-state banner (dev-only) */}
      {demoState && (
        <div className="fixed bottom-4 right-4 z-[60] rounded-full border border-charcoal bg-charcoal px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-parchment shadow-lg">
          Demo state · {demoState}
        </div>
      )}
    </div>
  )
}
