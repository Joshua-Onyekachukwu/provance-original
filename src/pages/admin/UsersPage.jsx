import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateTime, getTeamMeta } from '../../components/app/scanPresentation.js'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import { Badge, Button, DataTable, Drawer, EmptyState, Spinner, StatCard, useRegisterCommands } from '../../components/ui/index.js'
import {
  getAdminUsers,
  getUserProfile,
  updateUserRole,
  toggleTeamAccess,
} from '../../lib/api.js'
import { mockScans, mockAuditEvents, mockOrganizations, mockUsers } from '../../lib/mockData.js'
import { useTeamFilterParam } from '../../lib/useTeamFilterParam.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'Member',
}

const ROLE_TONES = {
  super_admin: 'danger',
  admin: 'warning',
  member: 'info',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
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
    header: 'Name',
    sortable: true,
    sortValue: (row) => row.displayName,
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/8 text-xs font-medium text-charcoal-mid">
          {getInitials(row.displayName)}
        </div>
        <span className="font-medium text-charcoal">{row.displayName}</span>
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    sortValue: (row) => row.email,
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    sortValue: (row) => ROLE_LABELS[row.role] || row.role,
    render: (row) => (
      <Badge tone={ROLE_TONES[row.role] || 'neutral'} size="sm">
        {ROLE_LABELS[row.role] || row.role}
      </Badge>
    ),
  },
  {
    key: 'team_id',
    header: 'Team',
    sortable: true,
    sortValue: (row) => getTeamMeta(row.team_id).name,
    render: (row) => <TeamBadge teamId={row.team_id} />,
  },
  {
    key: 'team_enabled',
    header: 'Team Access',
    sortable: true,
    sortValue: (row) => (row.team_enabled ? 'Enabled' : 'Disabled'),
    render: (row) => (
      <Badge tone={row.team_enabled ? 'success' : 'neutral'} dot size="sm">
        {row.team_enabled ? 'Enabled' : 'Disabled'}
      </Badge>
    ),
  },
  {
    key: 'last_sign_in',
    header: 'Last Sign-in',
    sortable: true,
    sortValue: (row) => new Date(row.last_sign_in || 0).getTime(),
    render: (row) => formatDate(row.last_sign_in),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    sortValue: (row) => new Date(row.created_at || 0).getTime(),
    render: (row) => formatDate(row.created_at),
  },
]

// ---------------------------------------------------------------------------
// UsersPage
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const navigate = useNavigate()

  useRegisterCommands(
    [
      {
        id: 'users.go-waitlist',
        group: 'Users',
        label: 'Open waitlist management',
        hint: 'Review pending applications',
        keywords: ['users', 'waitlist', 'admin'],
        onSelect: () => navigate('/app/admin/waitlist'),
      },
      {
        id: 'users.go-organizations',
        group: 'Users',
        label: 'Open organizations',
        hint: 'Workspace profiles and storage',
        keywords: ['users', 'organizations', 'admin'],
        onSelect: () => navigate('/app/admin/organizations'),
      },
    ],
    [navigate],
  )

  // Data state
  const [usersState, setUsersState] = useState({
    status: 'loading',
    data: null, // { data, page, pageSize, total, totalPages }
    error: '',
  })

  // Filter state (role / team-access pre-filter rows; text search handled by
  // DataTable). The team-assignment filter is URL-backed (?team=) like the
  // workspace surfaces.
  const [filterRole, setFilterRole] = useState('all')
  const [filterTeamAccess, setFilterTeamAccess] = useState('all')
  const [teamFilter, setTeamFilter] = useTeamFilterParam()

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

  // Load all users once; DataTable handles search / sort / pagination client-side
  const loadUsers = useCallback(async () => {
    try {
      const result = await getAdminUsers({ page: 1, pageSize: 200 })
      setUsersState({ status: 'ready', data: result, error: '' })
    } catch (err) {
      setUsersState({
        status: 'error',
        data: null,
        error: err.message || 'Failed to load users.',
      })
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

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

  // Team-assignment counts for the filter chips (driven by the live admin feed)
  const teamCounts = useMemo(() => {
    const counts = {}
    for (const row of usersState.data?.data || []) {
      if (row.team_id) counts[row.team_id] = (counts[row.team_id] || 0) + 1
    }
    return counts
  }, [usersState.data])

  // Client-side role / team pre-filter (search + sort + pagination live in DataTable)
  const filteredUsers = useMemo(() => {
    const rows = usersState.data?.data || []
    return rows.filter((row) => {
      if (filterRole !== 'all' && row.role !== filterRole) return false
      if (filterTeamAccess === 'enabled' && !row.team_enabled) return false
      if (filterTeamAccess === 'disabled' && row.team_enabled) return false
      if (teamFilter !== 'all' && row.team_id !== teamFilter) return false
      return true
    })
  }, [usersState.data, filterRole, filterTeamAccess, teamFilter])

  // Row click → open drawer
  async function handleRowClick(row) {
    setSelectedUserId(row.id)
    setDrawerOpen(true)
    setProfileState({ status: 'loading', data: null, error: '' })
    setActionMessage(null)
    void fetchProfile(row.id)
  }

  async function fetchProfile(userId) {
    try {
      const profile = await getUserProfile(userId)
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
      await loadUsers()
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
      await loadUsers()
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
          <Button
            variant="secondary"
            onClick={() => {
              setUsersState({ status: 'loading', data: null, error: '' })
              void loadUsers()
            }}
          >
            Retry
          </Button>
        }
      />
    )
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  const isFiltered = Boolean(
    filterRole !== 'all' || filterTeamAccess !== 'all' || teamFilter !== 'all',
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="User Administration"
        title="Manage account access and roles"
        description="Review account posture, role assignments, team access, and user-level activity without leaving the control room."
        meta={[
          { label: `${kpis.total} total users` },
          { label: `${kpis.admins} admins` },
          { label: `${kpis.teamEnabled} team-enabled accounts` },
        ]}
      />

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
        {/* Filter toolbar (role / team only — text search is DataTable's own) */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
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
            value={filterTeamAccess}
            onChange={(e) => {
              setFilterTeamAccess(e.target.value)
            }}
            className="rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            aria-label="Filter by team access"
          >
            <option value="all">All Teams</option>
            <option value="enabled">Team Enabled</option>
            <option value="disabled">Team Disabled</option>
          </select>

          <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} label="Team" />
        </div>

        {/* Table */}
        <DataTable
          columns={USER_COLUMNS}
          rows={filteredUsers}
          keyField="id"
          loading={usersState.status === 'loading'}
          searchable
          searchPlaceholder="Search by name, email, or role"
          searchKeys={['displayName', 'email', 'role']}
          onRowClick={handleRowClick}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyTitle={isFiltered ? 'No users match your filters' : 'No user accounts found'}
          emptyDescription={
            isFiltered
              ? 'Try adjusting your search or filter criteria.'
              : 'User accounts will appear here as they register.'
          }
        />
      </div>

      {/* User Detail Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={profileState.data?.displayName || 'User detail'}
        description="Account posture, role, team access, and recent activity."
        size="xl"
      >
        {profileState.status === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {profileState.status === 'error' && (
          <EmptyState
            variant="error"
            title="Could not load user profile"
            description={profileState.error}
            action={
              <Button variant="secondary" size="sm" onClick={() => selectedUserId && fetchProfile(selectedUserId)}>
                Retry
              </Button>
            }
          />
        )}

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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={ROLE_TONES[user.role] || 'neutral'} size="sm">
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                    <Badge tone="neutral" size="sm">
                      {orgName}
                    </Badge>
                    <TeamBadge teamId={user.team_id} />
                    <Badge tone="neutral" size="sm">
                      Member since {formatDate(user.created_at)}
                    </Badge>
                  </div>
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
                  <Button
                    variant="secondary"
                    onClick={openRoleChangeDialog}
                    disabled={!pendingRole || pendingRole === user.role}
                  >
                    Change role
                  </Button>
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
                        <Badge tone="neutral" size="sm">
                          {event.action.replaceAll('.', ' ').replaceAll('_', ' ')}
                        </Badge>
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
      </Drawer>

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
