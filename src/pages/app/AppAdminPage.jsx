import { useCallback, useEffect, useMemo, useState } from 'react'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import {
  createAccessInvite,
  getAdminDashboard,
  reviewWaitlistApplication,
} from '../../lib/api.js'

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">{label}</p>
      <p className="mt-3 font-serif text-3xl text-charcoal">{value}</p>
      <p className="mt-2 text-sm text-charcoal-mid">{detail}</p>
    </div>
  )
}

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

export default function AppAdminPage() {
  const [dashboardState, setDashboardState] = useState({
    status: 'loading',
    data: null,
    error: '',
  })
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })
  const [inviteState, setInviteState] = useState({ status: 'idle', url: '', message: '' })

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getAdminDashboard()
      setDashboardState({
        status: 'ready',
        data,
        error: '',
      })

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
    }
  }, [selectedApplicationId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const selectedApplication = useMemo(() => {
    return (
      dashboardState.data?.waitlist?.find((item) => item.id === selectedApplicationId) || null
    )
  }, [dashboardState.data, selectedApplicationId])

  useEffect(() => {
    if (selectedApplication) {
      setNotes(selectedApplication.notes || '')
    }
  }, [selectedApplication])

  const filteredApplications = useMemo(() => {
    const rows = dashboardState.data?.waitlist || []
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (filterStatus !== 'all' && row.status !== filterStatus) {
        return false
      }

      if (!query) {
        return true
      }

      return [row.full_name, row.email, row.company, row.role_title, row.use_case]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [dashboardState.data, filterStatus, search])

  const handleReview = async (status) => {
    if (!selectedApplication) return

    setActionState({ status: 'submitting', message: '' })

    try {
      await reviewWaitlistApplication(selectedApplication.id, {
        status,
        notes,
      })
      setActionState({
        status: 'success',
        message: `Application moved to ${status.replaceAll('_', ' ')}.`,
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

  const handleExportCsv = () => {
    const csv = buildCsv(filteredApplications)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'provance-waitlist.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (dashboardState.status === 'loading') {
    return (
      <AppStatePanel
        label="Loading"
        title="Loading administration workspace"
        description="Preparing waitlist operations, invite review, and admin activity."
        variant="loading"
      />
    )
  }

  if (dashboardState.status === 'error') {
    return (
      <AppStatePanel
        label="Error"
        title="Admin workspace could not be loaded"
        description={dashboardState.error}
        variant="error"
      />
    )
  }

  const summary = dashboardState.data.summary
  const recentAuditEvents = dashboardState.data.recentAuditEvents || []

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Administration
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Waitlist and access operations
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          The MVP admin layer gives operators a controlled way to review applicants,
          record notes, approve access, and generate secure invite links without going
          directly into the database.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Registrations" value={String(summary.totalRegistrations)} detail="All waitlist records captured so far." />
          <StatCard label="Pending" value={String(summary.pendingReview)} detail="Needs review or follow-up." />
          <StatCard label="Approved" value={String(summary.approved)} detail="Approved for access." />
          <StatCard label="Rejected" value={String(summary.rejected)} detail="Rejected or held out of cohort." />
          <StatCard label="Invites open" value={String(summary.invitesPending)} detail="Pending invite acceptance." />
          <StatCard label="Activated" value={String(summary.invitesAccepted)} detail="Accepted and activated invites." />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Review queue
              </p>
              <h3 className="mt-2 font-serif text-2xl text-charcoal">Applicant list</h3>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-xl border border-stone-light px-4 py-2 text-sm text-charcoal transition hover:border-charcoal"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, company, or use case"
              className="rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            >
              <option value="all">All statuses</option>
              <option value="waitlist_submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="deferred">Deferred</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="mt-6 space-y-3">
            {filteredApplications.map((application) => (
              <button
                key={application.id}
                type="button"
                onClick={() => setSelectedApplicationId(application.id)}
                className={`block w-full rounded-2xl border px-4 py-4 text-left transition ${
                  selectedApplicationId === application.id
                    ? 'border-charcoal bg-parchment'
                    : 'border-stone-light bg-parchment hover:border-charcoal/35'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{application.full_name}</p>
                    <p className="mt-1 text-xs text-charcoal-mid">{application.email}</p>
                  </div>
                  <span className="rounded-full bg-white-warm px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                    {application.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <p className="mt-3 text-sm text-charcoal-mid">
                  {application.company || 'Independent operator'}. {application.role_title || 'Role not provided'}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          {selectedApplication ? (
            <div className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                Applicant detail
              </p>
              <h3 className="mt-2 font-serif text-3xl text-charcoal">
                {selectedApplication.full_name}
              </h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <StatCard label="Email" value={selectedApplication.email} detail="Primary account email." />
                <StatCard label="Company" value={selectedApplication.company || 'Not provided'} detail="Organization or team context." />
                <StatCard label="Role" value={selectedApplication.role_title || 'Not provided'} detail="Declared operator role." />
                <StatCard label="Current status" value={selectedApplication.status.replaceAll('_', ' ')} detail="Latest review outcome." />
              </div>

              <div className="mt-6 rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Use case</p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                  {selectedApplication.use_case}
                </p>
              </div>

              <label className="mt-6 block">
                <span className="text-sm font-medium text-charcoal">Operator notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
                />
              </label>

              {actionState.message && (
                <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  actionState.status === 'error'
                    ? 'border border-rose-200 bg-rose-50 text-rose-700'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {actionState.message}
                </div>
              )}

              {inviteState.message && (
                <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  inviteState.status === 'error'
                    ? 'border border-rose-200 bg-rose-50 text-rose-700'
                    : 'border border-sky-200 bg-sky-50 text-sky-700'
                }`}>
                  <p>{inviteState.message}</p>
                  {inviteState.url && (
                    <div className="mt-3 rounded-xl border border-sky-100 bg-white-warm px-3 py-3 text-xs text-charcoal">
                      <p className="font-mono break-all">{inviteState.url}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleReview('under_review')}
                  className="rounded-xl border border-stone-light px-4 py-3 text-sm text-charcoal transition hover:border-charcoal"
                >
                  Mark under review
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('approved')}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('deferred')}
                  className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-charcoal transition hover:bg-amber-400"
                >
                  Defer
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('rejected')}
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
          ) : (
            <AppStatePanel
              label="Ready"
              title="Choose an applicant"
              description="Select a waitlist record to review notes, update status, and issue a secure invite."
            />
          )}

          <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Recent admin activity
            </p>
            <h3 className="mt-2 font-serif text-2xl text-charcoal">Audit trail</h3>
            <div className="mt-5 space-y-3">
              {recentAuditEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-stone-light bg-parchment px-4 py-4"
                >
                  <p className="text-sm font-medium text-charcoal">
                    {event.action.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-1 text-xs text-charcoal-mid">
                    {event.actor_email || 'system'} · {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  )
}
