import { useCallback, useEffect, useMemo, useState } from 'react'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import StatCard from '../../components/admin/StatCard.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'
import AdminDrawer from '../../components/admin/AdminDrawer.jsx'
import AdminSearch from '../../components/admin/AdminSearch.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'
import {
  getAdminUsers,
  getUserProfile,
  updateUserRole,
  toggleTeamAccess,
} from '../../lib/api.js'
import { mockScans, mockAuditEvents, mockOrganizations, mockUsers } from '../../lib/mockData.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'Member',
}

const ROLE_BADGE_COLORS = {
  super_admin: 'bg-rose-50 text-rose-700 border-rose-200',
  admin: 'bg-amber-50 text-amber-700 border-amber-200',
  member: 'bg-sky-50 text-sky-700 border-sky-200',
}

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getOrgName(orgId, orgs) {
  const org = orgs.find((o) => o.id === orgId)
  return org ? org.name : 'Unknown'
}

function computeScanStats(userId) {
  const userScans = mockScans.filter((s) => s.user_id === userId)
  const total = userScans.length
  const completed = userScans.filter((s) => s.status === 'completed').length
  const failed = userScans.filter((s) => s.status === 'failed').length
  const suspicious = userScans.filter(
    (s) => s.status === 'completed' && s.verdict === 'suspicious',
  ).length
  return {
    total,
    completed,
    failed,
    suspicious,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    suspiciousRate: completed > 0 ? Math.round((suspicious / completed) * 100) : 0,
  }
}

function getUserAuditEvents(userId) {
  // Find audit events related to this user by email
  const user = mockUsers.find((u) => u.id === userId)
  if (!user) return []
  return mockAuditEvents
    .filter((e) => e.actor_email === user.email || e.resource_id === userId)
    .slice(0, 5)
}

// ---------------------------------------------------------------------------
// Columns definition
// ---------------------------------------------------------------------------

const USER_COLUMNS = [
  {
    key: 'displayName',
    label: 'Name',
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/8 text-xs font-medium text-charcoal-mid">
          {getInitials(row.displayName)}
        </div>
        <span className="font-medium text-charcoal">{row.displayName}</span>
      </div>
    ),
  },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'role',
    label: 'Role',
    sortable: true,
    render: (row) => {
      const colorClass = ROLE_BADGE_COLORS[row.role] || ROLE_BADGE_COLORS.member
      return (
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] ${colorClass}`}
        >
          {ROLE_LABELS[row.role] || row.role}
        </span>
      )
    },
  },
  {
    key: 'team_enabled',
    label: 'Team',
    sortable: true,
    render: (row) => (
      <span className="inline-flex items-center gap-1.5 text-sm text-charcoal">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            row.team_enabled ? 'bg-emerald-400' : 'bg-stone-300'
          }`}
        />
        {row.team_enabled ? 'Enabled' : 'Disabled'}
      </span>
    ),
  },
  {
    key: 'last_sign_in',
    label: 'Last Sign-in',
    sortable: true,
    render: (row) => formatDate(row.last_sign_in),
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (row) => formatDate(row.created_at),
  },
]

// ---------------------------------------------------------------------------
// UsersPage
// ---------------------------------------------------------------------------

export default function UsersPage() {
  // Data state
  const [usersState, setUsersState] = useState({
    status: 'loading',
    data: null, // { data, page, pageSize, total, totalPages }
    error: '',
  })

  // Filter state
  const [searchText, setSearchText] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')

  // Pagination
  const [page, setPage] = useState(1)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [profileState, setProfileState] = useState({
    status: 'idle',
    data: null,
    error: '',
  })

  // Role change state
  const [roleChangeDialog, setRoleChangeDialog] = useState({ open: false, newRole: '' })
  const [roleSubmitting, setRoleSubmitting] = useState(false)

  // Team toggle state
  const [teamToggling, setTeamToggling] = useState(false)

  // Action feedback
  const [actionMessage, setActionMessage] = useState(null)

  // Load all users (for KPI computation) + paginated page
  const loadUsers = useCallback(async (currentPage = page) => {
    try {
      const result = await getAdminUsers({ page: currentPage, pageSize: PAGE_SIZE })
      setUsersState({ status: 'ready', data: result, error: '' })
    } catch (err) {
      setUsersState({
        status: 'error',
        data: null,
        error: err.message || 'Failed to load users.',
      })
    }
  }, [page])

  useEffect(() => {
    void loadUsers(page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute KPIs from all mock users
  const kpis = useMemo(() => {
    const allUsers = mockUsers
    const now = new Date('2026-07-24T12:00:00Z')
    const activeToday = allUsers.filter((u) => {
      if (!u.last_sign_in) return false
      const diffMs = now.getTime() - new Date(u.last_sign_in).getTime()
      return diffMs < 24 * 60 * 60 * 1000
    }).length
    const admins = allUsers.filter((u) => u.role === 'super_admin' || u.role === 'admin').length
    const members = allUsers.filter((u) => u.role === 'member').length
    const teamEnabled = allUsers.filter((u) => u.team_enabled).length
    return {
      total: allUsers.length,
      activeToday,
      admins,
      members,
      teamEnabled,
    }
  }, [])

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    const rows = usersState.data?.data || []
    const query = searchText.trim().toLowerCase()

    return rows.filter((row) => {
      // Role filter
      if (filterRole !== 'all' && row.role !== filterRole) return false

      // Team filter
      if (filterTeam === 'enabled' && !row.team_enabled) return false
      if (filterTeam === 'disabled' && row.team_enabled) return false

      // Text search
      if (!query) return true
      return [row.displayName, row.email, row.role]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    })
  }, [usersState.data, filterRole, filterTeam, searchText])

  // Row click → open drawer
  async function handleRowClick(row) {
    setSelectedUserId(row.id)
    setDrawerOpen(true)
    setProfileState({ status: 'loading', data: null, error: '' })
    setActionMessage(null)

    try {
      const profile = await getUserProfile(row.id)
      setProfileState({ status: 'ready', data: profile, error: '' })
    } catch (err) {
      setProfileState({
        status: 'error',
        data: null,
        error: err.message || 'Failed to load user profile.',
      })
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    setSelectedUserId(null)
    setProfileState({ status: 'idle', data: null, error: '' })
    setRoleChangeDialog({ open: false, newRole: '' })
    setPendingRole('')
    setActionMessage(null)
  }

  // Role change
  const [pendingRole, setPendingRole] = useState('')

  function openRoleChangeDialog() {
    if (!profileState.data || !pendingRole) return
    setRoleChangeDialog({ open: true, newRole: pendingRole })
  }

  async function handleRoleChangeConfirm() {
    if (!profileState.data || !roleChangeDialog.newRole) return

    setRoleSubmitting(true)
    setActionMessage(null)

    try {
      const updated = await updateUserRole(profileState.data.id, roleChangeDialog.newRole)
      setProfileState({ status: 'ready', data: updated, error: '' })
      setRoleChangeDialog({ open: false, newRole: '' })
      setPendingRole('')
      setActionMessage({
        type: 'success',
        text: `Role changed to ${ROLE_LABELS[updated.role] || updated.role}.`,
      })
      // Reload users list to reflect changes
      await loadUsers(page)
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Role change failed.' })
      setRoleChangeDialog({ open: false, newRole: '' })
    } finally {
      setRoleSubmitting(false)
    }
  }

  // Team toggle
  async function handleTeamToggle() {
    if (!profileState.data) return

    setTeamToggling(true)
    const newValue = !profileState.data.team_enabled

    // Optimistic update
    setProfileState((prev) => ({
      ...prev,
      data: prev.data ? { ...prev.data, team_enabled: newValue } : null,
    }))

    try {
      const updated = await toggleTeamAccess(profileState.data.id, newValue)
      setProfileState({ status: 'ready', data: updated, error: '' })
      await loadUsers(page)
    } catch (err) {
      // Revert on failure
      setProfileState((prev) => ({
        ...prev,
        data: prev.data ? { ...prev.data, team_enabled: !newValue } : null,
      }))
      setActionMessage({ type: 'error', text: err.message || 'Team access toggle failed.' })
    } finally {
      setTeamToggling(false)
    }
  }

  // Scan stats for selected user
  const scanStats = useMemo(() => {
    if (!selectedUserId) return null
    return computeScanStats(selectedUserId)
  }, [selectedUserId])

  // Audit events for selected user
  const auditEvents = useMemo(() => {
    if (!selectedUserId) return []
    return getUserAuditEvents(selectedUserId)
  }, [selectedUserId])

  // -------------------------------------------------------------------
  // Render: Loading
  // -------------------------------------------------------------------
  if (usersState.status === 'loading') {
    return (
      <div className="space-y-8">
        {/* Skeleton KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-stone-light bg-white-warm p-5 shadow-sm">
              <div className="mb-2 h-3 w-20 rounded bg-stone-light/60" />
              <div className="mb-2 h-8 w-16 rounded bg-stone-light/40" />
              <div className="h-3 w-28 rounded bg-stone-light/60" />
            </div>
          ))}
        </div>

        {/* Skeleton table */}
        <div className="rounded-2xl border border-stone-light bg-white-warm">
          <div className="border-b border-stone-light px-4 py-3">
            <div className="h-9 w-64 animate-pulse rounded-xl bg-stone-light/60" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-light">
                  {USER_COLUMNS.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-stone-light">
                    {USER_COLUMNS.map((col, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-stone-light/60" style={{ width: j === 0 ? '60%' : '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Render: Error
  // -------------------------------------------------------------------
  if (usersState.status === 'error') {
    return (
      <AppStatePanel
        label="Error"
        title="User management could not be loaded"
        description={usersState.error}
        variant="error"
        action={
          <button
            type="button"
            onClick={() => {
              setUsersState({ status: 'loading', data: null, error: '' })
              void loadUsers(page)
            }}
            className="rounded-xl border border-rose-200 bg-white-warm px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            Retry
          </button>
        }
      />
    )
  }

  // -------------------------------------------------------------------
  // Render: Populated
  // -------------------------------------------------------------------
  const totalPages = usersState.data?.totalPages || 1
  const total = usersState.data?.total || 0

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Users"
          value={String(kpis.total)}
          detail="All registered accounts."
          tone="default"
          size="sm"
        />
        <StatCard
          label="Active Today"
          value={String(kpis.activeToday)}
          detail="Signed in within 24 hours."
          tone="success"
          size="sm"
        />
        <StatCard
          label="Admins"
          value={String(kpis.admins)}
          detail="Super admin + admin roles."
          tone="info"
          size="sm"
        />
        <StatCard
          label="Members"
          value={String(kpis.members)}
          detail="Standard member accounts."
          tone="default"
          size="sm"
        />
        <StatCard
          label="Team-Enabled"
          value={String(kpis.teamEnabled)}
          detail="Accounts with team access."
          tone="success"
          size="sm"
        />
      </div>

      {/* Filter toolbar + Table */}
      <div className="space-y-4">
        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearch
            placeholder="Search by name, email, or role"
            onSearch={setSearchText}
            className="w-full max-w-sm"
          />

          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>

          <select
            value={filterTeam}
            onChange={(e) => {
              setFilterTeam(e.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            aria-label="Filter by team access"
          >
            <option value="all">All Teams</option>
            <option value="enabled">Team Enabled</option>
            <option value="disabled">Team Disabled</option>
          </select>
        </div>

        {/* Table */}
        {filteredUsers.length === 0 && usersState.status === 'ready' ? (
          <div className="rounded-2xl border border-stone-light bg-white-warm">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-light bg-parchment">
                <svg className="h-7 w-7 text-charcoal-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="font-serif text-lg text-charcoal">
                {searchText || filterRole !== 'all' || filterTeam !== 'all'
                  ? 'No users match your filters'
                  : 'No user accounts found'}
              </p>
              <p className="mt-1 text-sm text-charcoal-mid">
                {searchText || filterRole !== 'all' || filterTeam !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'User accounts will appear here as they register.'}
              </p>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={USER_COLUMNS}
            data={filteredUsers}
            loading={false}
            onRowClick={handleRowClick}
            emptyMessage="No user accounts found."
            filteredEmptyMessage="No users match your current search or filters."
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(newPage) => setPage(newPage)}
          />
        )}
      </div>

      {/* User Detail Drawer */}
      <AdminDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={profileState.data?.displayName || 'User detail'}
        loading={profileState.status === 'loading'}
        error={profileState.status === 'error' ? profileState.error : ''}
      >
        {profileState.status === 'ready' && profileState.data && (() => {
          const user = profileState.data
          const orgName = getOrgName(user.org_id, mockOrganizations)

          return (
            <div className="space-y-8">
              {/* Profile section */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-charcoal/10 text-xl font-medium text-charcoal-mid">
                  {getInitials(user.displayName)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-xl text-charcoal">{user.displayName}</h3>
                  <p className="mt-1 text-sm text-charcoal-mid">{user.email}</p>
                  <p className="mt-1 text-xs text-charcoal-light">
                    {orgName} · Member since {formatDate(user.created_at)}
                  </p>
                </div>
              </div>

              {/* Action feedback */}
              {actionMessage && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    actionMessage.type === 'error'
                      ? 'border border-rose-200 bg-rose-50 text-rose-700'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}

              {/* Role changer */}
              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                  Account Role
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <select
                    value={pendingRole || user.role}
                    onChange={(e) => setPendingRole(e.target.value)}
                    className="rounded-xl border border-stone-light bg-white-warm px-4 py-2.5 text-sm text-charcoal"
                    aria-label="Select new role"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <button
                    type="button"
                    onClick={openRoleChangeDialog}
                    disabled={!pendingRole || pendingRole === user.role}
                    className="rounded-xl border border-stone-light bg-white-warm px-4 py-2.5 text-sm text-charcoal transition hover:border-charcoal disabled:opacity-50"
                  >
                    Change role
                  </button>
                </div>
                <p className="mt-2 text-xs text-charcoal-mid">
                  Current: {ROLE_LABELS[user.role] || user.role}. Select a new role and confirm to change.
                </p>
              </div>

              {/* Team access toggle */}
              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                      Team Access
                    </p>
                    <p className="mt-1 text-sm text-charcoal-mid">
                      {user.team_enabled
                        ? 'Can access team workspaces.'
                        : 'Team access is disabled.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={user.team_enabled}
                    onClick={handleTeamToggle}
                    disabled={teamToggling}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      teamToggling ? 'opacity-60' : ''
                    } ${
                      user.team_enabled ? 'bg-emerald-500' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        user.team_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Scan stats */}
              {scanStats && (
                <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                    Scan Statistics
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-stone-light bg-white-warm p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-light">Total</p>
                      <p className="mt-1 font-serif text-lg text-charcoal">{scanStats.total}</p>
                    </div>
                    <div className="rounded-xl border border-stone-light bg-white-warm p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-light">Completed</p>
                      <p className="mt-1 font-serif text-lg text-charcoal">
                        {scanStats.completed}
                        <span className="ml-1 text-xs text-charcoal-mid">
                          ({scanStats.completionRate}%)
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-stone-light bg-white-warm p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-light">Failed</p>
                      <p className="mt-1 font-serif text-lg text-charcoal">{scanStats.failed}</p>
                    </div>
                    <div className="rounded-xl border border-stone-light bg-white-warm p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-charcoal-light">Suspicious</p>
                      <p className="mt-1 font-serif text-lg text-charcoal">
                        {scanStats.suspicious}
                        <span className="ml-1 text-xs text-charcoal-mid">
                          ({scanStats.suspiciousRate}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status history */}
              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                  Recent Activity
                </p>
                <div className="mt-3 space-y-2">
                  {auditEvents.length === 0 ? (
                    <p className="text-sm text-charcoal-mid">No recent activity for this user.</p>
                  ) : (
                    auditEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 rounded-xl border border-stone-light bg-white-warm px-3 py-2.5"
                      >
                        <span className="inline-flex shrink-0 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-charcoal-mid">
                          {event.action.replaceAll('.', ' ').replaceAll('_', ' ')}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-charcoal-mid">
                          {event.actor_email}
                        </span>
                        <span className="shrink-0 text-[10px] text-charcoal-light">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Account info footer */}
              <div className="rounded-2xl border border-stone-light bg-parchment p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                  Account Information
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal-mid">Last sign-in</span>
                    <span className="text-charcoal">{formatDateTime(user.last_sign_in)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal-mid">Created</span>
                    <span className="text-charcoal">{formatDateTime(user.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal-mid">User ID</span>
                    <span className="font-mono text-xs text-charcoal">{user.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </AdminDrawer>

      {/* Role Change Confirmation Dialog */}
      <ConfirmDialog
        open={roleChangeDialog.open}
        onConfirm={handleRoleChangeConfirm}
        onCancel={() => { setRoleChangeDialog({ open: false, newRole: '' }); setPendingRole('') }}
        title="Change user role"
        description={`Are you sure you want to change this user's role to "${ROLE_LABELS[roleChangeDialog.newRole] || 'Unknown'}"? This may affect their permissions and access.`}
        confirmLabel="Change role"
        cancelLabel="Cancel"
        variant="warning"
        loading={roleSubmitting}
      />
    </div>
  )
}
