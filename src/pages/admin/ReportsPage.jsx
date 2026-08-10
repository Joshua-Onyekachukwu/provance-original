import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, useRegisterCommands } from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import { formatDateTime, getTeamMeta, getVerdictMeta } from '../../components/app/scanPresentation.js'
import { getAdminReports } from '../../lib/api.js'
import { mockOrganizations } from '../../lib/mockData.js'
import { useDemoState } from '../../lib/useDemoState.js'
import { useTeamFilterParam } from '../../lib/useTeamFilterParam.js'
import useMockData from '../../lib/useMockData.js'

// ---------------------------------------------------------------------------
// Presentation meta
// ---------------------------------------------------------------------------

const SIGNAL_TONES = {
  'Model signature detected': 'danger',
  'Anomalous spectral energy': 'danger',
  'Metadata chain incomplete': 'warning',
  'No trusted credential located': 'warning',
  'Continuity break detected': 'danger',
}

function signalTone(finding) {
  return SIGNAL_TONES[finding] || 'neutral'
}

// ---------------------------------------------------------------------------
// Report detail drawer content
// ---------------------------------------------------------------------------

function orgNameById(report) {
  // Real mode carries the resolved org name in the payload (org_name); mock
  // mode falls back to the org registry so both modes render honestly.
  if (report.org_name) return report.org_name
  const org = mockOrganizations.find((o) => o.id === report.org_id)
  return org ? org.name : 'Unknown'
}

function ReportDetail({ report }) {
  const verdict = getVerdictMeta(report)
  const team = getTeamMeta(report.team_id)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-light bg-parchment/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs text-charcoal">{report.report_id}</span>
          <Badge tone={verdict.tone} size="sm">
            {verdict.label}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-charcoal-mid">
          Scan <span className="font-mono text-charcoal">{report.scan_id}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={team.tone} size="sm">
            {team.short}
          </Badge>
          <span className="rounded-md border border-stone-light bg-white-warm px-2 py-0.5 font-mono text-[11px] text-charcoal-mid">
            {report.confidence_score ?? '—'}% confidence
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Report</dt>
          <dd className="mt-1 font-mono text-xs text-charcoal">{report.report_id}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Verdict</dt>
          <dd className="mt-1 text-charcoal">{verdict.label}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Team</dt>
          <dd className="mt-1 text-charcoal">{team.name}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Organization</dt>
          <dd className="mt-1 text-charcoal">{orgNameById(report)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Generated</dt>
          <dd className="mt-1 text-charcoal">{formatDateTime(report.created_at)}</dd>
        </div>
      </dl>

      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
          Signal breakdown
        </div>
        <div className="mt-3 space-y-2">
          {(report.signals || []).map((signal) => (
            <div
              key={signal.model}
              className="rounded-2xl border border-stone-light bg-parchment/60 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-charcoal">{signal.label}</span>
                <span className="font-mono text-xs text-charcoal-mid tabular-nums">
                  {signal.confidence}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-light">
                  <span
                    className="block h-full rounded-full bg-charcoal"
                    style={{ width: `${Math.min(100, Math.max(0, signal.confidence || 0))}%` }}
                  />
                </span>
                <Badge tone={signalTone(signal.finding)} size="sm">
                  {signal.finding}
                </Badge>
              </div>
            </div>
          ))}
          {!report.signals?.length && (
            <p className="text-sm text-charcoal-light">No signal data attached to this report.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 8

export default function ReportsPage() {
  const navigate = useNavigate()
  const demoState = useDemoState()

  // Fetch the full ledger once (pageSize 200, matching UsersPage) so the
  // client-side team/verdict filters + pagination see every report, not just
  // the first API page.
  const { data: rawData, loading, error, refetch } = useMockData(getAdminReports, {
    page: 1,
    pageSize: 200,
  })
  const EMPTY_REPORTS = useMemo(() => ({ data: [], total: 0 }), [])
  const data = demoState === 'empty' ? EMPTY_REPORTS : rawData

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'
  const reports = useMemo(() => data?.data || [], [data])

  const [verdict, setVerdict] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedReport, setSelectedReport] = useState(null)

  // URL-backed (?team=) team scoping, same pattern as the workspace surfaces
  // and the admin Users/Organizations/Analytics views.
  const [teamFilter, setTeamFilter] = useTeamFilterParam()

  const verdictCounts = useMemo(() => {
    const counts = { authentic: 0, suspicious: 0, inconclusive: 0 }
    reports.forEach((report) => {
      counts[report.verdict] = (counts[report.verdict] || 0) + 1
    })
    return counts
  }, [reports])

  // Per-team report counts for the TeamFilter chips (full feed, not scoped).
  const teamCounts = useMemo(() => {
    const counts = {}
    for (const report of reports) {
      if (report.team_id) counts[report.team_id] = (counts[report.team_id] || 0) + 1
    }
    return counts
  }, [reports])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reports.filter((report) => {
      if (teamFilter !== 'all' && report.team_id !== teamFilter) return false
      if (verdict !== 'all' && report.verdict !== verdict) return false
      if (!q) return true
      return (
        (report.report_id || '').toLowerCase().includes(q) ||
        (report.scan_id || '').toLowerCase().includes(q)
      )
    })
  }, [reports, verdict, query, teamFilter])

  const hasActiveFilters = verdict !== 'all' || query.trim() !== '' || teamFilter !== 'all'
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
    setVerdict('all')
    setQuery('')
    setTeamFilter('all')
    resetPage()
  }

  function handleOpen(report) {
    navigate(`/app/reports/${report.scan_id}`)
  }

  useRegisterCommands(
    [
      {
        id: 'admin.reports-suspicious',
        group: 'Reports',
        label: 'Filter to suspicious reports',
        hint: `${verdictCounts.suspicious || 0} reports`,
        keywords: ['reports', 'suspicious', 'filter'],
        onSelect: () => {
          setVerdict('suspicious')
          resetPage()
        },
      },
      {
        id: 'admin.reports-clear',
        group: 'Reports',
        label: 'Clear report filters',
        hint: hasActiveFilters ? 'Reset the current view' : 'No filters active',
        keywords: ['reports', 'clear', 'reset', 'filters'],
        onSelect: clearFilters,
      },
      {
        id: 'admin.reports-go-overview',
        group: 'Reports',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['reports', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [verdictCounts, hasActiveFilters, navigate],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Reports"
        title="Every verification report"
        description="Browse all generated reports with verdicts, confidence, and signal breakdowns. Open any report in the workspace view or inspect its signals here."
        meta={[
          { label: `${reports.length} reports` },
          { label: `${verdictCounts.authentic || 0} authentic` },
          { label: `${verdictCounts.suspicious || 0} suspicious` },
          { label: `${verdictCounts.inconclusive || 0} inconclusive` },
          ...(teamFilter !== 'all'
            ? [{ label: `${getTeamMeta(teamFilter).name} scoped` }]
            : []),
        ]}
      />

      <Card
        eyebrow="Report ledger"
        title="Verification reports"
        description="Newest first — verdict badges and owning team per report. Click Inspect for the signal breakdown."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={6}
      >
        {!isLoading && !hasError && (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} label="Team" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-light">
                  Verdict
                </span>
                {['all', 'authentic', 'suspicious', 'inconclusive'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={verdict === value}
                    onClick={() => {
                      setVerdict(value)
                      resetPage()
                    }}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
                      verdict === value
                        ? 'border-charcoal bg-charcoal text-white-warm'
                        : 'border-stone-light bg-parchment text-charcoal-mid hover:text-charcoal'
                    }`}
                  >
                    {value === 'all' ? 'All' : getVerdictMeta({ status: 'completed', verdict: value }).label}
                    <span className="ml-1.5 opacity-70">
                      {value === 'all' ? reports.length : verdictCounts[value] || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="relative block w-full sm:w-64">
                  <span className="sr-only">Search reports</span>
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
                    placeholder="Search report or scan…"
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
                  title={hasActiveFilters ? 'No matching reports' : 'No reports generated yet'}
                  description={
                    hasActiveFilters
                      ? 'Try different filters or clear them to see the full ledger.'
                      : 'Completed verifications with report payloads will appear here.'
                  }
                  compact
                />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-light bg-white-warm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-stone-light bg-parchment/60">
                      <th className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Report
                      </th>
                      <th className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Verdict
                      </th>
                      <th className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Confidence
                      </th>
                      <th className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Generated
                      </th>
                      <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-charcoal-light">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-light/70">
                    {visible.map((report) => {
                      const verdictMeta = getVerdictMeta(report)
                      return (
                        <tr
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          className="cursor-pointer transition-colors hover:bg-parchment/50"
                        >
                          <td className="px-4 py-3.5 align-middle">
                            <span className="block max-w-[14rem] truncate font-mono text-xs text-charcoal" title={report.report_id}>
                              {report.report_id}
                            </span>
                            <span className="mt-0.5 block font-mono text-[11px] text-charcoal-light">
                              {report.scan_id}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <Badge tone={verdictMeta.tone} size="sm">
                              {verdictMeta.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-light">
                                <span
                                  className="block h-full rounded-full bg-charcoal"
                                  style={{ width: `${Math.min(100, Math.max(0, report.confidence_score || 0))}%` }}
                                />
                              </span>
                              <span className="text-xs tabular-nums text-charcoal-mid">
                                {report.confidence_score ?? '—'}%
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <TeamBadge teamId={report.team_id} />
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <span className="text-xs text-charcoal-mid">
                              {orgNameById(report)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <time dateTime={report.created_at} className="text-xs text-charcoal-light tabular-nums">
                              {formatDateTime(report.created_at)}
                            </time>
                          </td>
                          <td className="px-4 py-3.5 text-right align-middle">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedReport(report)
                                }}
                              >
                                Inspect
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpen(report)
                                }}
                              >
                                Open
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-between border-t border-stone-light pt-4">
                <p className="text-xs text-charcoal-light">
                  Showing {Math.min(filtered.length, (safePage - 1) * PAGE_SIZE + PAGE_SIZE)} of{' '}
                  {filtered.length} reports
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

      {/* ── Report detail drawer ──────────────────────────────────────────── */}
      {selectedReport && (
        <div className="fixed inset-0 z-40 bg-charcoal/30 backdrop-blur-sm" onClick={() => setSelectedReport(null)} aria-hidden="true" />
      )}
      {selectedReport && (
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`Report ${selectedReport.report_id} detail`}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-stone-light bg-white-warm shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-light bg-parchment/60 px-6 py-5">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                Verification report
              </p>
              <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.05em] text-charcoal">
                {selectedReport.report_id}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="rounded-xl border border-stone-light bg-white p-2 text-charcoal-mid transition hover:border-charcoal hover:text-charcoal"
              aria-label="Close report detail"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <ReportDetail report={selectedReport} />
            <div className="mt-5">
              <Button variant="secondary" size="sm" onClick={() => handleOpen(selectedReport)}>
                Open in workspace view
              </Button>
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
