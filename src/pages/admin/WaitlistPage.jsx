import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'
import { Badge, Button, DataTable, Drawer, StatCard, useRegisterCommands } from '../../components/ui/index.js'
import {
  formatDate,
  formatDateTime,
} from '../../components/app/scanPresentation.js'
import {
  createAccessInvite,
  getAdminDashboard,
  reviewWaitlistApplication,
} from '../../lib/api.js'
import { buildCsv as sharedBuildCsv } from '../../lib/csv.js'
import { useDemoState } from '../../lib/useDemoState.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCsv(rows) {
  const headers = ['Full name', 'Email', 'Company', 'Role', 'Status', 'Created at']
  return sharedBuildCsv(
    headers,
    rows.map((row) => [
      row.full_name,
      row.email,
      row.company || '',
      row.role_title || '',
      row.status,
      row.created_at,
    ]),
  )
}

const STATUS_LABELS = {
  waitlist_submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  deferred: 'Deferred',
  rejected: 'Rejected',
}

const STATUS_TONES = {
  waitlist_submitted: 'neutral',
  under_review: 'info',
  approved: 'success',
  deferred: 'warning',
  rejected: 'danger',
}

// All-zero summary used as the fallback when data has not loaded and as the
// forced-empty payload under ?state=empty.
const EMPTY_SUMMARY = {
  totalRegistrations: 0,
  pendingReview: 0,
  approved: 0,
  rejected: 0,
  invitesPending: 0,
  invitesAccepted: 0,
}

function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONES[status] || 'neutral'} size="sm">
      {STATUS_LABELS[status] || status.replaceAll('_', ' ')}
    </Badge>
  )
}

const WAITLIST_COLUMNS = [
  {
    key: 'full_name',
    header: 'Name',
    sortable: true,
    sortValue: (row) => row.full_name,
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    sortValue: (row) => row.email,
  },
  {
    key: 'company',
    header: 'Company',
    sortable: true,
    sortValue: (row) => row.company || '',
  },
  {
    key: 'role_title',
    header: 'Role',
    sortable: true,
    sortValue: (row) => row.role_title || '',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (row) => STATUS_LABELS[row.status] || row.status,
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'created_at',
    header: 'Submitted',
    sortable: true,
    sortValue: (row) => new Date(row.created_at).getTime(),
    render: (row) => formatDate(row.created_at),
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WaitlistPage() {
  const navigate = useNavigate()

  // Dev-only ?state= forcing — drives the page's hand-rolled state machine
  // (dashboardState + kpisLoading/tableLoading) into its loading / empty /
  // error branches for review.
  const demoState = useDemoState()
  const forceLoading = demoState === 'loading'
  const forceError = demoState === 'error'
  const forceEmpty = demoState === 'empty'

  useRegisterCommands(
    [
      {
        id: 'waitlist.go-users',
        group: 'Waitlist',
        label: 'Open user administration',
        hint: 'Manage activated accounts',
        keywords: ['waitlist', 'users', 'admin'],
        onSelect: () => navigate('/app/admin/users'),
      },
      {
        id: 'waitlist.go-overview',
        group: 'Waitlist',
        label: 'Back to admin overview',
        hint: 'Platform command surface',
        keywords: ['waitlist', 'overview', 'admin'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [navigate],
  )

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

  const initialSelectionRef = useRef(false)

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

      // Auto-select the first application once; guard with a ref so selecting
      // rows later does not re-trigger this loader (which would reload the
      // dashboard mid-drawer and risk wiping the page on a transient error).
      if (!initialSelectionRef.current && data.waitlist?.length) {
        initialSelectionRef.current = true
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
  }, [])

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

  // Filter by status + date range (search + sort + pagination handled by DataTable)
  const filteredRows = useMemo(() => {
    const rows = dashboardState.data?.waitlist || []
    return rows.filter((row) => {
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

      return true
    })
  }, [dashboardState.data, filterStatus, dateFrom, dateTo])

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
      <Button
        variant="success"
        size="sm"
        onClick={() => handleBulkActionClick('approved')}
      >
        Approve {selectedIds.length}
      </Button>
      <Button
        variant="warning"
        size="sm"
        onClick={() => handleBulkActionClick('deferred')}
      >
        Defer {selectedIds.length}
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => handleBulkActionClick('rejected')}
      >
        Reject {selectedIds.length}
      </Button>
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
  // CSV export (respects status + date filters + search text)
  // ------------------------------------------------------------------

  const handleExportCsv = () => {
    const query = filterText.trim().toLowerCase()
    const allFiltered = filteredRows.filter((row) => {
      if (!query) return true
      return [row.full_name, row.email, row.company, row.role_title, row.use_case]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })

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

  // ------------------------------------------------------------------
  // Error state (full-page)
  // ------------------------------------------------------------------

  if (dashboardState.status === 'error' || forceError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
            <svg className="h-7 w-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-serif text-2xl text-charcoal">Waitlist workspace could not be loaded</p>
          <p className="mt-2 text-sm text-charcoal-mid">
            {forceError
              ? 'Demo state — forced error for review. This is not a real outage.'
              : dashboardState.error}
          </p>
          <Button
            variant="secondary"
            onClick={loadDashboard}
            className="mt-4"
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // KPIs from data (or empty fallback)
  // ------------------------------------------------------------------

  const summary = forceEmpty ? EMPTY_SUMMARY : dashboardState.data?.summary || EMPTY_SUMMARY
  const recentAuditEvents = dashboardState.data?.recentAuditEvents || []

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Waitlist Operations"
        title="Review inbound access applications"
        description="Triage new applicants from the landing page, capture operator notes, and issue controlled invites only when the workspace is ready."
        primaryAction={
          <Button onClick={handleExportCsv}>
            Export waitlist CSV
          </Button>
        }
        meta={[
          { label: `${summary.pendingReview} pending review` },
          { label: `${summary.approved} approved` },
          { label: 'Access review queue' },
        ]}
      />

      {/* --- KPI Cards (section-level loading via StatCard loading) --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Registrations', value: String(summary.totalRegistrations), detail: 'All waitlist records.', tone: 'default' },
          { label: 'Pending', value: String(summary.pendingReview), detail: 'Needs review.', tone: 'warning' },
          { label: 'Approved', value: String(summary.approved), detail: 'Approved for access.', tone: 'success' },
          { label: 'Rejected', value: String(summary.rejected), detail: 'Rejected.', tone: 'danger' },
          { label: 'Invites open', value: String(summary.invitesPending), detail: 'Pending acceptance.', tone: 'info' },
          { label: 'Activated', value: String(summary.invitesAccepted), detail: 'Accepted invites.', tone: 'success' },
        ].map((card) => (
          <StatCard
            key={card.label}
            size="sm"
            tone={card.tone}
            label={card.label}
            value={card.value}
            detail={card.detail}
            loading={kpisLoading || forceLoading}
          />
        ))}
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
                  setSelectedIds([])
                }}
                className="rounded-xl border border-stone-light bg-parchment px-3 py-2.5 text-sm text-charcoal"
                aria-label="Filter to date"
              />
            </div>

            {/* Clear date filters */}
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Clear dates
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-stone-light bg-white px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-charcoal-mid">
            Live intake queue
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={WAITLIST_COLUMNS}
          rows={forceEmpty ? [] : filteredRows}
          keyField="id"
          loading={tableLoading || forceLoading}
          searchable
          searchValue={filterText}
          onSearchChange={(value) => {
            setFilterText(value)
            setSelectedIds([])
          }}
          searchPlaceholder="Search by name, email, company, or use case"
          searchKeys={['full_name', 'email', 'company', 'role_title', 'use_case']}
          onRowClick={handleRowClick}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={bulkActions}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyTitle="No waitlist applications yet"
          emptyDescription="Applications from the landing page will appear here as they arrive."
        />
      </div>

      {/* --- Detail Drawer --- */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedApplication?.full_name || 'Applicant detail'}
        description="Review applicant context, capture internal notes, and take a clear decision."
        size="xl"
        footer={
          selectedApplication ? (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => handleReviewClick('under_review')}
              >
                Mark under review
              </Button>
              <Button
                variant="success"
                onClick={() => handleReviewClick('approved')}
              >
                Approve
              </Button>
              <Button
                variant="warning"
                onClick={() => handleReviewClick('deferred')}
              >
                Defer
              </Button>
              <Button
                variant="danger"
                onClick={() => handleReviewClick('rejected')}
              >
                Reject
              </Button>
              <Button onClick={handleCreateInvite}>
                Create access invite
              </Button>
            </div>
          ) : null
        }
      >
        {selectedApplication && (
          <div className="space-y-6">
            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedApplication.status} />
              <Badge tone="neutral" size="sm">
                Submitted {formatDate(selectedApplication.created_at)}
              </Badge>
              {selectedApplication.company && (
                <Badge tone="neutral" size="sm">
                  {selectedApplication.company}
                </Badge>
              )}
            </div>

            <div className="rounded-[1.6rem] border border-stone-light bg-[linear-gradient(135deg,rgba(243,246,255,0.9),rgba(255,253,249,1))] p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                    Applicant profile
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-charcoal">
                    {selectedApplication.full_name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-mid">
                    {selectedApplication.use_case}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[22rem]">
                  <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Email</p>
                    <p className="mt-1 text-sm text-charcoal">{selectedApplication.email}</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Declared role</p>
                    <p className="mt-1 text-sm text-charcoal">{selectedApplication.role_title || 'Not provided'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Company</p>
                    <p className="mt-1 text-sm text-charcoal">{selectedApplication.company || 'Independent applicant'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Current status</p>
                    <p className="mt-1 text-sm text-charcoal">
                      {STATUS_LABELS[selectedApplication.status] || selectedApplication.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Operational fit</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-stone-light bg-white-warm p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Use case summary</p>
                    <p className="mt-2 text-sm leading-6 text-charcoal-mid">{selectedApplication.use_case}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-light bg-white-warm p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Decision posture</p>
                      <p className="mt-2 text-sm text-charcoal">
                        {selectedApplication.status === 'approved'
                          ? 'Ready for controlled access.'
                          : selectedApplication.status === 'rejected'
                            ? 'Not suitable for current rollout.'
                            : 'Needs operator review before invite.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-stone-light bg-white-warm p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-charcoal-light">Onboarding signal</p>
                      <p className="mt-2 text-sm text-charcoal">
                        {selectedApplication.company
                          ? 'Organization-backed account with clearer team potential.'
                          : 'Individual account, validate expected usage before issuing access.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">Operator notes</p>
                <p className="mt-2 text-sm text-charcoal-mid">
                  Capture internal context, onboarding notes, or follow-up decisions.
                </p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={9}
                  className="mt-4 w-full rounded-2xl border border-stone-light bg-white-warm px-4 py-3 text-sm text-charcoal"
                />

                <div className="mt-4 flex items-center gap-3">
                  <Button
                    onClick={handleSaveNotes}
                    loading={notesSaveState.status === 'submitting'}
                    disabled={notesSaveState.status === 'submitting'}
                  >
                    {notesSaveState.status === 'submitting' ? 'Saving…' : 'Save notes'}
                  </Button>

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
            </div>

            {/* Status history timeline */}
            {selectedApplication.status_history && selectedApplication.status_history.length > 0 && (
              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
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
                            {formatDateTime(entry.changed_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
          </div>
        )}
      </Drawer>

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
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-charcoal">Audit trail</h3>
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
                  {event.actor_email || 'system'} | {formatDateTime(event.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
