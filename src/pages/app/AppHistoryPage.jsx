import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Card,
  DataTable,
  LivePollIndicator,
  useRegisterCommands,
} from '../../components/ui'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getVerdictMeta,
  hasActiveScanWork,
} from '../../components/app/scanPresentation.js'
import { listScans } from '../../lib/api.js'
import { useDateRangeParam, inDateRange } from '../../lib/useDateRangeParam.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'
import { useTeamScoping } from '../../lib/useTeamScoping.js'

function VerdictBadge({ scan }) {
  const { label, tone } = getVerdictMeta(scan)
  return <Badge tone={tone}>{label}</Badge>
}

const HISTORY_COLUMNS = [
  {
    key: 'original_filename',
    header: 'File',
    sortable: true,
    width: '34%',
    render: (scan) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-charcoal">{scan.original_filename}</p>
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
    key: 'report_id',
    header: 'Report',
    render: (scan) => scan.result_payload?.report_id || '—',
  },
  {
    key: 'created_at',
    header: 'Updated',
    align: 'right',
    sortable: true,
    sortValue: (scan) => new Date(scan.completed_at || scan.created_at).getTime(),
    render: (scan) => formatScanTimestamp(scan.completed_at || scan.created_at),
  },
]

export default function AppHistoryPage() {
  const navigate = useNavigate()
  const demoState = useDemoState()
  // Live status polling: the ledger refreshes every 5s while work is in
  // flight (queued / processing), so worker-driven queued → processing →
  // complete transitions land without a reload — same pattern as the
  // dashboard. Polling idles once the queue drains.
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
  // The ledger's 5s poll runs only while queued/processing scans exist — the
  // indicator mirrors exactly that, so the surface signals when it is
  // tracking worker progress (same pattern as the dashboard/queue/reports).
  const live = hasActiveScanWork(scans.data)

  // Team scoping — shared with the dashboard/reports/queue via ?team=.
  const { teamFilter, setTeamFilter, teamCounts, filteredScans, isTeamScoped } = useTeamScoping({
    scans,
  })

  // Date range — URL-backed ?from= / ?to= (YYYY-MM-DD), so a fully scoped
  // ledger view (team + range) is shareable as one link.
  const [dateRange, setDateRange] = useDateRangeParam()
  const hasDateRange = Boolean(dateRange.from || dateRange.to)
  const rangedScans = useMemo(
    () =>
      filteredScans.filter((scan) =>
        inDateRange(scan.created_at, dateRange.from, dateRange.to),
      ),
    [filteredScans, dateRange.from, dateRange.to],
  )
  const hasAnyFilter = isTeamScoped || hasDateRange

  useRegisterCommands(
    [
      {
        id: 'history.start-verification',
        group: 'History',
        label: 'Start a verification',
        hint: 'Upload media for scanning',
        keywords: ['history', 'upload', 'verify', 'scan'],
        onSelect: () => navigate('/app/uploads'),
      },
      {
        id: 'history.open-latest-report',
        group: 'History',
        label: 'Open the latest report',
        hint: `${(scans.data || []).length} scans in history`,
        keywords: ['history', 'report', 'latest'],
        onSelect: () => {
          const latest = (scans.data || []).find((s) => s.status === 'completed')
          if (latest) navigate(`/app/reports/${latest.id}`)
        },
      },
    ],
    [navigate, scans.data],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Scan history
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">Every verification run</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Every verification you have run, searchable by filename and filterable by status and verdict.
        </p>
      </section>

      <Card
        eyebrow="Verification ledger"
        title="Latest verification activity"
        description="Your newest uploads — filename, status, verdict, team, and report ID before opening the full report."
        actions={live ? <LivePollIndicator /> : null}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-charcoal-mid">
              From
              <input
                type="date"
                value={dateRange.from || ''}
                onChange={(event) =>
                  setDateRange({ ...dateRange, from: event.target.value || null })
                }
                className="ui-focus-ring rounded-xl border border-stone-light bg-parchment px-3 py-1.5 text-sm text-charcoal"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-charcoal-mid">
              To
              <input
                type="date"
                value={dateRange.to || ''}
                onChange={(event) =>
                  setDateRange({ ...dateRange, to: event.target.value || null })
                }
                className="ui-focus-ring rounded-xl border border-stone-light bg-parchment px-3 py-1.5 text-sm text-charcoal"
              />
            </label>
            {hasDateRange && (
              <button
                type="button"
                onClick={() => setDateRange({ from: null, to: null })}
                className="ui-focus-ring rounded-xl px-3 py-1.5 text-xs font-medium text-charcoal-mid transition hover:bg-parchment hover:text-charcoal"
              >
                Clear range
              </button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            columns={HISTORY_COLUMNS}
            rows={rangedScans}
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
            emptyTitle={
              isTeamScoped && hasDateRange
                ? 'No scans in this team and range'
                : isTeamScoped
                  ? 'No scans in this team'
                  : hasDateRange
                    ? 'No scans in this date range'
                    : 'No verifications yet'
            }
            emptyDescription={
              hasAnyFilter
                ? 'Try widening the date range — or clear the filters to see everything.'
                : 'Upload a media file to start the verification pipeline — results will appear here.'
            }
          />
        </div>
      </Card>
    </div>
  )
}
