import { useCallback, useEffect, useMemo, useState } from 'react'
import StatCard from '../../components/admin/StatCard.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'
import AdminDrawer from '../../components/admin/AdminDrawer.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'
import {
  createAccessInvite,
  getAdminDashboard,
  reviewWaitlistApplication,
} from '../../lib/api.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCsv(rows) {
  const headers = ['Full name', 'Email', 'Company', 'Role', 'Status', 'Created at']
  const lines = rows.map((row) =>
    [
      row.full_name,
      row.email,
      row.company || '',
      row.role_title || '',
      row.status,
      row.created_at,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  )

  return [headers.join(','), ...lines].join('\n')
}

const WAITLIST_COLUMNS = [
  { key: 'full_name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'role_title', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', sortable: true,
    render: (row) => (
      <span className="inline-flex rounded-full bg-white-warm px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-charcoal-mid">
        {row.status.replaceAll('_', ' ')}
      </span>
    ),
  },
  { key: 'created_at', label: 'Submitted', sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
]

const STATUS_LABELS = {
  waitlist_submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  deferred: 'Deferred',
  rejected: 'Rejected',
}

// ---------------------------------------------------------------------------
// Skeleton components for section-level loading
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WaitlistPage() {
  // Data loading
  const [dashboardState, setDashboardState] = useState({
    status: 'loading',
    data: null,
    error: '',
  })
  const [kpisLoading, setKpisLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)

  // Selection & drawer
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  // Filters
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Sort
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Notes (separate from selectedApplication.notes for "Save notes" pattern)
  const [notes, setNotes] = useState('')

  // Action feedback
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })
  const [inviteState, setInviteState] = useState({ status: 'idle', url: '', message: '' })
  const [notesSaveState, setNotesSaveState] = useState({ status: 'idle', message: '' })

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    variant: 'default',
    onConfirm: () => {},
  })

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadDashboard = useCallback(async () => {
    try {
      setKpisLoading(true)
      setTableLoading(true)
      const data = await getAdminDashboard()

      // Simulate KPIs arriving first
      setDashboardState({ status: 'ready', data, error: '' })
      setKpisLoading(false)

      // Simulate slight delay for table
      setTimeout(() => setTableLoading(false), 300)

      if (!selectedApplicationId && data.waitlist?.length) {
        setSelectedApplicationId(data.waitlist[0].id)
        setNotes(data.waitlist[0].notes || '')
      }
    } catch (error) {
      setDashboardState({
        status: 'error',
        data: null,
        error: error.message || 'Failed to load admin dashboard.',
      })
      setKpisLoading(false)
      setTableLoading(false)
    }
  }, [selectedApplicationId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------

  const selectedApplication = useMemo(() => {
    return (
      dashboardState.data?.waitlist?.find((item) => item.id === selectedApplicationId) || null
    )
  }, [dashboardState.data, selectedApplicationId])

  // Sync notes when selectedApplication changes
  useEffect(() => {
    if (selectedApplication) {
      setNotes(selectedApplication.notes || '')
      setNotesSaveState({ status: 'idle', message: '' })
    }
  }, [selectedApplication])

  // Filter → Sort → Paginate
  const { paginatedApplications, totalFiltered } = useMemo(() => {
    const rows = dashboardState.data?.waitlist || []
    const query = filterText.trim().toLowerCase()

    // 1. Filter
    let filtered = rows.filter((row) => {
      if (filterStatus !== 'all' && row.status !== filterStatus) {
        return false
      }

      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (new Date(row.created_at) < fromDate) return false
      }

      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (new Date(row.created_at) > toDate) return false
      }

      if (!query) return true

      return [row.full_name, row.email, row.company, row.role_title, row.use_case]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })

    // 2. Sort
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]

        let cmp = 0
        if (sortKey === 'created_at') {
          cmp = new Date(aVal).getTime() - new Date(bVal).getTime()
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          cmp = aVal.localeCompare(bVal)
        } else {
          cmp = 0
        }

        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    const totalFiltered = filtered.length

    // 3. Paginate
    const start = (page - 1) * pageSize
    const paginated = filtered.slice(start, start + pageSize)

    return { paginatedApplications: paginated, totalFiltered }
  }, [dashboardState.data, filterStatus, filterText, dateFrom, dateTo, sortKey, sortDir, page, pageSize])

  // ------------------------------------------------------------------
  // Sort handler
  // ------------------------------------------------------------------

  const handleSort = useCallback((key, dir) => {
    setSortKey(key)
    setSortDir(dir)
    setPage(1)
  }, [])

  // ------------------------------------------------------------------
  // Selection / bulk handlers
  // ------------------------------------------------------------------

  const handleSelectionChange = useCallback((ids) => {
    setSelectedIds(ids)
  }, [])

  // ------------------------------------------------------------------
  // Confirmation dialog helpers
  // ------------------------------------------------------------------

  function openConfirm({ title, description, variant, onConfirm }) {
    setConfirmDialog({ open: true, title, description, variant, onConfirm })
  }

  function closeConfirm() {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
  }

  // ------------------------------------------------------------------
  // Individual review action (with confirm)
  // ------------------------------------------------------------------

  async function executeReview(applicationId, status, notesValue, applicantName) {
    setActionState({ status: 'submitting', message: '' })

    try {
      await reviewWaitlistApplication(applicationId, { status, notes: notesValue })
      setActionState({
        status: 'success',
        message: `${applicantName} moved to ${STATUS_LABELS[status] || status.replaceAll('_', ' ')}.`,
      })
      setInviteState({ status: 'idle', url: '', message: '' })
      await loadDashboard()
    } catch (error) {
      setActionState({
        status: 'error',
        message: error.message || 'Waitlist review action failed.',
      })
    }
  }

  function handleReviewClick(status) {
    if (!selectedApplication) return

    const label = STATUS_LABELS[status] || status.replaceAll('_', ' ')
    const variant = status === 'approved' ? 'default' : status === 'deferred' ? 'warning' : 'danger'

    openConfirm({
      title: `${label} application`,
      description: `Are you sure you want to ${label.toLowerCase()} the application from ${selectedApplication.full_name} (${selectedApplication.email})?`,
      variant,
      onConfirm: () => {
        closeConfirm()
        executeReview(selectedApplication.id, status, notes, selectedApplication.full_name)
      },
    })
  }

  // ------------------------------------------------------------------
  // Bulk review actions
  // ------------------------------------------------------------------

  async function executeBulkReview(status) {
    const label = STATUS_LABELS[status] || status.replaceAll('_', ' ')
    setActionState({ status: 'submitting', message: `Bulk ${label.toLowerCase()} in progress…` })

    try {
      // Process sequentially for mock
      for (const id of selectedIds) {
        await reviewWaitlistApplication(id, { status, notes: '' })
      }
      setActionState({
        status: 'success',
        message: `${selectedIds.length} application(s) moved to ${label}.`,
      })
      setSelectedIds([])
      await loadDashboard()
    } catch (error) {
      setActionState({
        status: 'error',
        message: error.message || 'Bulk action failed.',
      })
    }
  }

  function handleBulkActionClick(status) {
    const label = STATUS_LABELS[status] || status.replaceAll('_', ' ')
    const variant = status === 'approved' ? 'default' : status === 'deferred' ? 'warning' : 'danger'

    openConfirm({
      title: `Bulk ${label.toLowerCase()}`,
      description: `Are you sure you want to ${label.toLowerCase()} ${selectedIds.length} application(s)? This action cannot be undone.`,
      variant,
      onConfirm: () => {
        closeConfirm()
        executeBulkReview(status)
      },
    })
  }

  // ------------------------------------------------------------------
  // Bulk actions JSX
  // ------------------------------------------------------------------

  const bulkActions = selectedIds.length > 0 ? (
    <>
      <button
        type="button"
        onClick={() => handleBulkActionClick('approved')}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
      >
        Approve {selectedIds.length}
      </button>
      <button
        type="button"
        onClick={() => handleBulkActionClick('deferred')}
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-charcoal transition hover:bg-amber-400"
      >
        Defer {selectedIds.length}
      </button>
      <button
        type="button"
        onClick={() => handleBulkActionClick('rejected')}
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
      >
        Reject {selectedIds.length}
      </button>
    </>
  ) : null

  // ------------------------------------------------------------------
  // Invite creation
  // ------------------------------------------------------------------

  const handleCreateInvite = async () => {
    if (!selectedApplication) return

    setInviteState({ status: 'submitting', url: '', message: '' })

    try {
      const response = await createAccessInvite(selectedApplication.id, {
        expiresInDays: 7,
      })
      const baseUrl = window.location.origin
      const inviteUrl = `${baseUrl}/accept-invite?token=${response.invite.inviteToken}`
      setInviteState({
        status: 'success',
        url: inviteUrl,
        message: 'Access invite created. Copy the secure link below and deliver it to the approved user.',
      })
      await loadDashboard()
    } catch (error) {
      setInviteState({
        status: 'error',
        url: '',
        message: error.message || 'Invite creation failed.',
      })
    }
  }

  // ------------------------------------------------------------------
  // Save notes
  // ------------------------------------------------------------------

  const handleSaveNotes = async () => {
    if (!selectedApplication) return

    setNotesSaveState({ status: 'submitting', message: '' })

    try {
      await reviewWaitlistApplication(selectedApplication.id, {
        status: selectedApplication.status,
        notes,
      })
      setNotesSaveState({ status: 'success', message: 'Notes saved.' })
      // Refresh data so the notes field matches
      await loadDashboard()
    } catch (error) {
      setNotesSaveState({
        status: 'error',
        message: error.message || 'Failed to save notes.',
      })
    }
  }

  // ------------------------------------------------------------------
  // CSV export
  // ------------------------------------------------------------------

  const handleExportCsv = () => {
    const allFiltered = (() => {
      const rows = dashboardState.data?.waitlist || []
      const query = filterText.trim().toLowerCase()

      return rows.filter((row) => {
        if (filterStatus !== 'all' && row.status !== filterStatus) return false
        if (dateFrom) {
          const fromDate = new Date(dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (new Date(row.created_at) < fromDate) return false
        }
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59, 999)
          if (new Date(row.created_at) > toDate) return false
        }
        if (!query) return true
        return [row.full_name, row.email, row.company, row.role_title, row.use_case]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
    })()

    const csv = buildCsv(allFiltered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'provance-waitlist.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // ------------------------------------------------------------------
  // Row click → open drawer
  // ------------------------------------------------------------------

  function handleRowClick(row) {
    setSelectedApplicationId(row.id)
    setDrawerOpen(true)
  }

  // Page change resets selection
  function handlePageChange(newPage, newPageSize) {
    setPage(newPage)
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setPage(1)
    }
    setSelectedIds([])
  }

  // ------------------------------------------------------------------
  // Error state (full-page)
  // ------------------------------------------------------------------

  if (dashboardState.status === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
            <svg className="h-7 w-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-serif text-2xl text-charcoal">Waitlist workspace could not be loaded</p>
          <p className="mt-2 text-sm text-charcoal-mid">{dashboardState.error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-4 rounded-xl border border-stone-light px-4 py-2.5 text-sm text-charcoal transition hover:border-charcoal"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // KPIs from data (or empty fallback)
  // ------------------------------------------------------------------

  const summary = dashboardState.data?.summary || {
    totalRegistrations: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    invitesPending: 0,
    invitesAccepted: 0,
  }
  const recentAuditEvents = dashboardState.data?.recentAuditEvents || []

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* --- KPI Cards (section-level loading) --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpisLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Registrations" value={String(summary.totalRegistrations)} detail="All waitlist records." tone="default" compact />
            <StatCard label="Pending" value={String(summary.pendingReview)} detail="Needs review." tone="warning" compact />
            <StatCard label="Approved" value={String(summary.approved)} detail="Approved for access." tone="success" compact />
            <StatCard label="Rejected" value={String(summary.rejected)} detail="Rejected." tone="danger" compact />
            <StatCard label="Invites open" value={String(summary.invitesPending)} detail="Pending acceptance." tone="info" compact />
            <StatCard label="Activated" value={String(summary.invitesAccepted)} detail="Accepted invites." tone="success" compact />
          </>
        )}
      </div>

      {/* --- Action feedback (aria-live) --- */}
      {actionState.message && (
        <div
          aria-live="polite"
          className={`rounded-2xl px-4 py-3 text-sm ${
            actionState.status === 'error'
              ? 'border border-rose-200 bg-rose-50 text-rose-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {actionState.message}
        </div>
      )}

      {/* --- Table + Filters --- */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value)
                setPage(1)
                setSelectedIds([])
              }}
              className="rounded-xl border border-stone-light bg-parchment px-4 py-2.5 text-sm text-charcoal"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="waitlist_submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="deferred">Deferred</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Date range: From */}
            <div className="flex items-center gap-2">
              <label htmlFor="waitlist-date-from" className="text-xs text-charcoal-light">
                From
              </label>
              <input
                id="waitlist-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setPage(1)
                  setSelectedIds([])
                }}
                className="rounded-xl border border-stone-light bg-parchment px-3 py-2.5 text-sm text-charcoal"
                aria-label="Filter from date"
              />
            </div>

            {/* Date range: To */}
            <div className="flex items-center gap-2">
              <label htmlFor="waitlist-date-to" className="text-xs text-charcoal-light">
                To
              </label>
              <input
                id="waitlist-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setPage(1)
                  setSelectedIds([])
                }}
                className="rounded-xl border border-stone-light bg-parchment px-3 py-2.5 text-sm text-charcoal"
                aria-label="Filter to date"
              />
            </div>

            {/* Clear date filters */}
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                  setPage(1)
                }}
                className="rounded-xl border border-stone-light px-3 py-2.5 text-xs text-charcoal-mid transition hover:border-charcoal"
              >
                Clear dates
              </button>
            )}
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-xl border border-stone-light px-4 py-2.5 text-sm text-charcoal transition hover:border-charcoal"
          >
            Export CSV
          </button>
        </div>

        {/* Table */}
        <AdminTable
          columns={WAITLIST_COLUMNS}
          data={paginatedApplications}
          loading={tableLoading}
          filterValue={filterText}
          onFilterChange={(value) => {
            setFilterText(value)
            setPage(1)
            setSelectedIds([])
          }}
          filterPlaceholder="Search by name, email, company, or use case"
          onRowClick={handleRowClick}
          onSort={handleSort}
          onSelectionChange={handleSelectionChange}
          onPageChange={handlePageChange}
          page={page}
          pageSize={pageSize}
          total={totalFiltered}
          selectedIds={selectedIds}
          bulkActions={bulkActions}
          emptyMessage="No waitlist applications yet."
          filteredEmptyMessage="No applications match your current search or status filter."
        />
      </div>

      {/* --- Detail Drawer --- */}
      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedApplication?.full_name || 'Applicant detail'}
      >
        {selectedApplication && (
          <div className="space-y-6">
            {/* Applicant details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Email" value={selectedApplication.email} detail="Primary account email." compact />
              <StatCard label="Company" value={selectedApplication.company || 'Not provided'} detail="Organization context." compact />
              <StatCard label="Role" value={selectedApplication.role_title || 'Not provided'} detail="Declared role." compact />
              <StatCard label="Status" value={selectedApplication.status.replaceAll('_', ' ')} detail="Latest review outcome." compact />
            </div>

            {/* Use case */}
            <div className="rounded-2xl border border-stone-light bg-parchment p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Use case</p>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                {selectedApplication.use_case}
              </p>
            </div>

            {/* Status history timeline */}
            {selectedApplication.status_history && selectedApplication.status_history.length > 0 && (
              <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                  Status history
                </p>
                <div className="mt-4 space-y-0">
                  {selectedApplication.status_history.map((entry, index) => {
                    const isLast = index === selectedApplication.status_history.length - 1
                    return (
                      <div key={index} className="flex gap-3">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                          <div className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 ${
                            isLast ? 'border-charcoal bg-charcoal' : 'border-stone-light bg-parchment'
                          }`} />
                          {!isLast && <div className="w-px flex-1 bg-stone-light" />}
                        </div>

                        {/* Content */}
                        <div className={`pb-4 ${isLast ? '' : ''}`}>
                          <p className="text-sm font-medium text-charcoal">
                            {STATUS_LABELS[entry.status] || entry.status.replaceAll('_', ' ')}
                          </p>
                          <p className="mt-0.5 text-xs text-charcoal-mid">
                            by {entry.changed_by === 'system' ? 'System (auto)' : entry.changed_by}
                            {' · '}
                            {new Date(entry.changed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notes with explicit Save button */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Operator notes</span>
                <span className="mt-1 block text-sm text-charcoal-mid">
                  Capture internal context, onboarding notes, or follow-up decisions.
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={notesSaveState.status === 'submitting'}
                  className="rounded-xl bg-charcoal px-4 py-2.5 text-sm font-medium text-parchment transition hover:bg-charcoal-soft disabled:opacity-50"
                >
                  {notesSaveState.status === 'submitting' ? 'Saving…' : 'Save notes'}
                </button>

                {notesSaveState.message && (
                  <span
                    aria-live="polite"
                    className={`text-sm ${
                      notesSaveState.status === 'error'
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {notesSaveState.message}
                  </span>
                )}
              </div>
            </div>

            {/* Action feedback in drawer */}
            {actionState.message && (
              <div
                aria-live="polite"
                className={`rounded-2xl px-4 py-3 text-sm ${
                  actionState.status === 'error'
                    ? 'border border-rose-200 bg-rose-50 text-rose-700'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {actionState.message}
              </div>
            )}

            {/* Invite feedback */}
            {inviteState.message && (
              <div
                aria-live="polite"
                className={`rounded-2xl px-4 py-3 text-sm ${
                  inviteState.status === 'error'
                    ? 'border border-rose-200 bg-rose-50 text-rose-700'
                    : 'border border-sky-200 bg-sky-50 text-sky-700'
                }`}
              >
                <p>{inviteState.message}</p>
                {inviteState.url && (
                  <div className="mt-3 rounded-xl border border-sky-100 bg-white-warm px-3 py-3 text-xs text-charcoal">
                    <p className="font-mono break-all">{inviteState.url}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleReviewClick('under_review')}
                className="rounded-xl border border-stone-light px-4 py-3 text-sm text-charcoal transition hover:border-charcoal"
              >
                Mark under review
              </button>
              <button
                type="button"
                onClick={() => handleReviewClick('approved')}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReviewClick('deferred')}
                className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-charcoal transition hover:bg-amber-400"
              >
                Defer
              </button>
              <button
                type="button"
                onClick={() => handleReviewClick('rejected')}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={handleCreateInvite}
                className="rounded-xl bg-charcoal px-4 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
              >
                Create access invite
              </button>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* --- Confirm Dialog --- */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel="Confirm"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />

      {/* --- Recent Audit Trail --- */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Recent admin activity
        </p>
        <h3 className="mt-2 font-serif text-2xl text-charcoal">Audit trail</h3>
        <div className="mt-5 space-y-3">
          {recentAuditEvents.length === 0 ? (
            <p className="text-sm text-charcoal-mid">No recent admin activity recorded.</p>
          ) : (
            recentAuditEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-stone-light bg-parchment px-4 py-4"
              >
                <p className="text-sm font-medium text-charcoal">
                  {event.action.replaceAll('_', ' ')}
                </p>
                <p className="mt-1 text-xs text-charcoal-mid">
                  {event.actor_email || 'system'} | {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
