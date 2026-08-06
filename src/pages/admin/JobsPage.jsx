import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, useRegisterCommands, useToast } from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import {
  formatDateTime,
  formatDurationMs,
  formatFileSize,
  getScanStatusMeta,
} from '../../components/app/scanPresentation.js'
import { getAdminJobs } from '../../lib/api.js'
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

      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
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
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedJob, setSelectedJob] = useState(null)

  const statusCounts = useMemo(() => {
    const counts = { queued: 0, processing: 0, completed: 0, failed: 0 }
    jobs.forEach((job) => {
      counts[job.status] = (counts[job.status] || 0) + 1
    })
    return counts
  }, [jobs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((job) => {
      if (status !== 'all' && job.status !== status) return false
      if (!q) return true
      return (
        (job.original_filename || '').toLowerCase().includes(q) ||
        (job.id || '').toLowerCase().includes(q) ||
        (job.scan_id || '').toLowerCase().includes(q) ||
        (job.worker || '').toLowerCase().includes(q)
      )
    })
  }, [jobs, status, query])

  const hasActiveFilters = status !== 'all' || query.trim() !== ''
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
    setQuery('')
    resetPage()
  }

  const handleRetry = useCallback((job) => {
    toast('Job re-queued', {
      description: `${job.id} moved back to the queue for another attempt.`,
      type: 'success',
    })
  }, [toast])

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
    [statusCounts, hasActiveFilters, navigate, toast],
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
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedJob(row) }}>
              Inspect
            </Button>
            {row.status === 'failed' && (
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleRetry(row) }}>
                Retry
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleRetry],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Verification Jobs"
        title="The global job ledger"
        description="Every verification job across the platform — status, priority, worker, and progress. Inspect any job for its timeline and failure details, or re-queue failed work."
        meta={[
          { label: `${jobs.length} jobs` },
          { label: `${statusCounts.queued || 0} queued` },
          { label: `${statusCounts.processing || 0} processing` },
          { label: `${statusCounts.failed || 0} failed` },
        ]}
      />

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
              <div className="mt-4 overflow-hidden rounded-2xl border border-stone-light bg-white-warm">
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
            {selectedJob.status === 'failed' && (
              <div className="mt-5">
                <Button variant="secondary" size="sm" onClick={() => handleRetry(selectedJob)}>
                  Re-queue job
                </Button>
              </div>
            )}
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
