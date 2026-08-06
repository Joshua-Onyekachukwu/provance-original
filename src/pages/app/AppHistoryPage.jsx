import { useNavigate } from 'react-router-dom'
import { Badge, Card, DataTable, useRegisterCommands } from '../../components/ui'
import ScanStatusBadge from '../../components/app/ScanStatusBadge.jsx'
import {
  formatFileSize,
  formatScanTimestamp,
  getVerdictMeta,
} from '../../components/app/scanPresentation.js'
import { listScans } from '../../lib/api.js'
import { useResource } from '../../lib/useResource.js'

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
  const scans = useResource(() => listScans({ pageSize: 100 }).then((r) => r.data || []))

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
        description="Your newest uploads — filename, status, verdict, and report ID before opening the full report."
      >
        <DataTable
          columns={HISTORY_COLUMNS}
          rows={scans.data || []}
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
          emptyTitle="No verifications yet"
          emptyDescription="Upload a media file to start the verification pipeline — results will appear here."
        />
      </Card>
    </div>
  )
}
