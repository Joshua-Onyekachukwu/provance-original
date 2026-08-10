import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTeamScoping } from '../../lib/useTeamScoping.js'
import { Badge, Card, DataTable, StatCard, useRegisterCommands } from '../../components/ui'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import {
  formatDurationMs,
  formatFileSize,
  formatScanTimestamp,
  getTeamMeta,
  getVerdictMeta,
  hasActiveScanWork,
  queueNeedsPolling,
} from '../../components/app/scanPresentation.js'
import { getQueueSnapshot, listScans } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'

function MiniStat({ label, value, tone = 'default' }) {
  const accent = {
    default: 'border-l-stone-light',
    info: 'border-l-sky-400',
    success: 'border-l-emerald-400',
    warning: 'border-l-amber-400',
    danger: 'border-l-rose-400',
  }
  return (
    <div className={`rounded-2xl border border-stone-light bg-parchment px-4 py-4 border-l-[3px] ${accent[tone]}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-1.5 font-serif text-3xl tabular-nums text-charcoal">{value}</p>
    </div>
  )
}

function VerdictBadge({ scan }) {
  const { label, tone } = getVerdictMeta(scan)
  return <Badge tone={tone}>{label}</Badge>
}

export default function AppQueuePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const demoState = useDemoState()

  // Live status polling: refresh every 5s while work is in flight (queued /
  // processing) so worker-driven transitions land here without a reload, and
  // idle once the queue drains (see hasActiveScanWork / queueNeedsPolling).
  const queue = useResource(
    () => getQueueSnapshot(),
    [],
    {
      pollMs: 5000,
      pollWhen: (state) => queueNeedsPolling(state.data),
    },
  )
  const scans = withDemoOverride(
    useResource(
      () => listScans({ pageSize: 100 }).then((r) => r.data || []),
      [],
      {
        pollMs: 5000,
        pollWhen: (state) => hasActiveScanWork(state.data),
      },
    ),
    demoState,
    { emptyData: [] },
  )

  const data = queue.data
  const newScanId = location.state?.newScanId || null
  const newScanVisible = scans.data?.some((scan) => scan.id === newScanId)

  const {
    teamFilter,
    setTeamFilter,
    teamCounts,
    filteredScans,
    isTeamScoped,
    teamName,
    teamKpis,
  } = useTeamScoping({ scans })
  const hasActiveFilter = isTeamScoped

  // When a team filter is active the queue posture is recomputed from the
  // team-scoped scan ledger (same as the dashboard's queue panel), so the
  // StatCards and MiniStats reflect only that team's work.
  const queueView = isTeamScoped && teamKpis
    ? { queued: teamKpis.queued, processing: teamKpis.processing, failed: teamKpis.failed }
    : data
  const avgDuration = queueView?.avg_processing_time_ms
    ? formatDurationMs(queueView.avg_processing_time_ms)
    : '—'
  const backlog = queueView ? queueView.queued > 5 : false

  useRegisterCommands(
    [
      {
        id: 'queue.upload-more',
        group: 'Queue',
        label: 'Upload another file',
        hint: 'Add media to the queue',
        keywords: ['queue', 'upload', 'verify', 'scan'],
        onSelect: () => navigate('/app/uploads'),
      },
      {
        id: 'queue.open-first-queued',
        group: 'Queue',
        label: 'Open the next queued scan',
        hint: backlog ? 'Backlog detected' : 'Queue moving normally',
        keywords: ['queue', 'queued', 'open', 'next'],
        onSelect: () => {
          const next = (scans.data || []).find((s) => ['queued', 'processing'].includes(s.status))
          if (next) navigate(`/app/reports/${next.id}`)
        },
      },
    ],
    [navigate, scans.data, backlog],
  )

  const dismissHighlight = () => {
    navigate(location.pathname, { replace: true })
  }

  const JOBS_COLUMNS = useMemo(() => [
    {
      key: 'original_filename',
      header: 'File',
      sortable: true,
      width: '38%',
      render: (scan) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span
              className={`truncate font-medium ${scan.id === newScanId ? 'text-amber' : 'text-charcoal'}`}
            >
              {scan.original_filename}
            </span>
            {scan.id === newScanId && (
              <Badge tone="warning" className="shrink-0">
                Just added
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-xs text-charcoal-light">
            {formatFileSize(scan.file_size_bytes)} · {scan.processing_mode}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (scan) => scan.status,
      render: (scan) => <ScanStatusBadge status={scan.status} />,
    },
    {
      key: 'verdict',
      header: 'Verdict',
      render: (scan) => <VerdictBadge scan={scan} />,
    },
    {
      key: 'team_id',
      header: 'Team',
      render: (scan) => <TeamBadge teamId={scan.team_id} />,
    },
    {
      key: 'created_at',
      header: 'Updated',
      align: 'right',
      sortable: true,
      sortValue: (scan) => new Date(scan.completed_at || scan.created_at).getTime(),
      render: (scan) => formatScanTimestamp(scan.completed_at || scan.created_at),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [newScanId])

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Verification queue
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">Live pipeline posture</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Files moving through the processing pipeline — queued, running, and failed jobs.
        </p>
      </section>

      {newScanVisible && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-5 py-4">
          <p className="text-sm text-charcoal">
            <span className="font-mono font-semibold text-amber">{newScanId}</span> just entered the
            queue and is waiting for a worker.
          </p>
          <button
            type="button"
            onClick={dismissHighlight}
            className="text-xs font-medium text-charcoal-mid underline-offset-2 transition hover:text-charcoal hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Queued"
          value={queueView ? String(queueView.queued ?? 0) : '—'}
          detail={isTeamScoped ? `Awaiting a worker · ${teamName}` : 'Awaiting a worker'}
          tone="info"
          loading={queue.status === 'loading'}
          error={queue.status === 'error'}
        />
        <StatCard
          label="Processing"
          value={queueView ? String(queueView.processing ?? 0) : '—'}
          detail={isTeamScoped ? `Running right now · ${teamName}` : 'Running right now'}
          tone="info"
          loading={queue.status === 'loading'}
          error={queue.status === 'error'}
        />
        <StatCard
          label="Failed"
          value={queueView ? String(queueView.failed ?? 0) : '—'}
          detail={queueView && queueView.failed > 0 ? 'Needs attention' : 'No failures'}
          tone={queueView && queueView.failed > 0 ? 'warning' : 'default'}
          loading={queue.status === 'loading'}
          error={queue.status === 'error'}
        />
      </section>

      <Card
        eyebrow="Queue posture"
        title={isTeamScoped ? `Live queue · ${getTeamMeta(teamFilter).short}` : 'Live queue'}
        description="Real-time snapshot of the processing pipeline, refreshed automatically while work is in flight."
        state={queue.status === 'loading' ? 'loading' : queue.status === 'error' ? 'error' : 'default'}
        loadingRows={3}
        errorDescription={queue.error}
        onRetry={queue.reload}
      >
        {queueView && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Queued" value={queueView.queued ?? 0} tone="info" />
              <MiniStat label="Processing" value={queueView.processing ?? 0} tone="info" />
              <MiniStat label="Failed" value={queueView.failed ?? 0} tone={queueView.failed > 0 ? 'danger' : 'default'} />
            </div>
            {isTeamScoped ? (
              <p className="mt-4 text-xs text-charcoal-light">
                Queue counts scoped to the {teamName} team from the scan ledger.
              </p>
            ) : backlog ? (
              <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-800">
                Backlog forming — {queueView.queued} items queued. Average processing time {avgDuration} per item.
              </p>
            ) : (
              <p className="mt-4 text-xs text-charcoal-light">
                Queue is healthy — average processing time {avgDuration} per item.
              </p>
            )}
          </>
        )}
      </Card>

      <Card
        eyebrow="Recent jobs"
        title="Latest submissions"
        description="Everything in the pipeline, newest first. New uploads appear here the moment they are queued."
      >
        <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} />
        <div className="mt-4">
          <DataTable
            columns={JOBS_COLUMNS}
            rows={filteredScans}
            keyField="id"
            loading={scans.status === 'loading'}
            error={scans.status === 'error' ? scans.error : null}
            onRetry={scans.reload}
            searchable
            searchPlaceholder="Search files…"
            searchKeys={['original_filename']}
            pagination
            pageSize={8}
            onRowClick={(scan) => navigate(`/app/reports/${scan.id}`)}
            emptyTitle={hasActiveFilter ? 'No scans in this team' : 'No submissions yet'}
            emptyDescription={
              hasActiveFilter
                ? 'Try a different team — or clear the filter to see everything.'
                : 'Upload a media file to send it into the verification pipeline.'
            }
          />
        </div>
      </Card>
    </div>
  )
}
