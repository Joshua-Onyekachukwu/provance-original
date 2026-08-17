import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterCommands, Badge, DataTable, Drawer, EmptyState, StatCard, Tabs } from '../../components/ui/index.js'
import { mockUsers, mockAuditEvents } from '../../lib/mockData.js'
import {
  formatDate,
  formatDateLong,
  formatStorageGb,
  getTeamMeta,
} from '../../components/app/scanPresentation.js'
import { getOrganizations } from '../../lib/api.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import ActivityRow from '../../components/admin/ActivityRow.jsx'
import TeamBadge from '../../components/app/TeamBadge.jsx'
import TeamFilter from '../../components/app/TeamFilter.jsx'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'
import { useTeamFilterParam } from '../../lib/useTeamFilterParam.js'

// ---------------------------------------------------------------------------
// Presentation meta
// ---------------------------------------------------------------------------

const ROLE_TONES = {
  super_admin: 'danger',
  admin: 'warning',
  member: 'info',
  owner: 'neutral',
}

function roleLabel(role) {
  return (role || 'member').replaceAll('_', ' ')
}

function getStatusDot(lastSignIn) {
  if (!lastSignIn) return 'offline'
  const hoursAgo = (Date.now() - new Date(lastSignIn).getTime()) / 3600000
  if (hoursAgo < 1) return 'online'
  if (hoursAgo < 24) return 'recent'
  return 'offline'
}

const STATUS_DOT_STYLES = {
  online: 'bg-emerald-500',
  offline: 'bg-stone-300',
  recent: 'bg-amber-400',
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const ORG_COLUMNS = [
  { key: 'name', header: 'Org Name', sortable: true },
  { key: 'member_count', header: 'Members', sortable: true },
  { key: 'admin_count', header: 'Admins', sortable: true },
  {
    key: 'teams',
    header: 'Teams',
    // Derived onto each row ({ teams: [teamId, ...] }) from member users.
    render: (row) =>
      row.teams && row.teams.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {row.teams.map((teamId) => (
            <TeamBadge key={teamId} teamId={teamId} />
          ))}
        </span>
      ) : (
        '—'
      ),
  },
  {
    key: 'storage_used_gb',
    header: 'Storage',
    sortable: true,
    sortValue: (row) => row.storage_used_gb,
    render: (row) => formatStorageGb(row.storage_used_gb),
  },
  {
    key: 'scan_count',
    header: 'Scans',
    sortable: true,
    sortValue: (row) => row.scan_count,
    render: (row) => row.scan_count.toLocaleString(),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    sortValue: (row) => new Date(row.created_at || 0).getTime(),
    render: (row) => formatDate(row.created_at),
  },
]

const MEMBER_COLUMNS = [
  { key: 'displayName', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    sortValue: (row) => roleLabel(row.role),
    render: (row) => (
      <Badge tone={ROLE_TONES[row.role] || 'neutral'} size="sm">
        {roleLabel(row.role)}
      </Badge>
    ),
  },
  {
    key: 'team_id',
    header: 'Team',
    render: (row) => <TeamBadge teamId={row.team_id} />,
  },
  {
    key: 'last_sign_in',
    header: 'Status',
    sortable: true,
    sortValue: (row) => new Date(row.last_sign_in || 0).getTime(),
    render: (row) => {
      const status = getStatusDot(row.last_sign_in)
      return (
        <span className="inline-flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_STYLES[status]}`} />
          <span className="text-sm text-charcoal-mid capitalize">{status}</span>
        </span>
      )
    },
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const demoState = useDemoState()

  const resource = useResource(() => getOrganizations().then((rows) => rows || []))
  const orgs = withDemoOverride(resource, demoState, { emptyData: [] })

  const status = orgs.status
  const loading = status === 'loading'
  const failed = status === 'error'

  // Selection & drawer
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('members')

  // ── Team scoping (URL-backed ?team=, same pattern as UsersPage) ──────────
  // Orgs have no team_id — their members (mockUsers) do. A team column and
  // filter are derived from member team assignments, so admin views are
  // linkable the same way the workspace is (/app/admin/organizations?team=).
  const [teamFilter, setTeamFilter] = useTeamFilterParam()
  const isTeamScoped = teamFilter !== 'all'

  const membersByOrg = useMemo(() => {
    const map = {}
    for (const user of mockUsers) {
      if (!user.org_id) continue
      if (!map[user.org_id]) map[user.org_id] = []
      map[user.org_id].push(user)
    }
    return map
  }, [])

  const orgTeams = useMemo(() => {
    const result = {}
    for (const [orgId, members] of Object.entries(membersByOrg)) {
      result[orgId] = [...new Set(members.map((m) => m.team_id).filter(Boolean))]
    }
    return result
  }, [membersByOrg])

  // TeamFilter counts: number of organizations that have ≥1 member in each team.
  const teamCounts = useMemo(() => {
    const counts = {}
    for (const teams of Object.values(orgTeams)) {
      for (const team of teams) counts[team] = (counts[team] || 0) + 1
    }
    return counts
  }, [orgTeams])

  // ── Derived ───────────────────────────────────────────────────────────────
  const rows = useMemo(
    () => (orgs.data || []).map((org) => ({ ...org, teams: orgTeams[org.id] || [] })),
    [orgs.data, orgTeams],
  )

  const filteredRows = useMemo(
    () =>
      isTeamScoped ? rows.filter((org) => org.teams.includes(teamFilter)) : rows,
    [rows, teamFilter, isTeamScoped],
  )

  const kpis = useMemo(() => {
    const totalOrgs = rows.length
    const totalMembers = rows.reduce((sum, o) => sum + (o.member_count || 0), 0)
    const totalAdmins = rows.reduce((sum, o) => sum + (o.admin_count || 0), 0)
    const totalStorage = rows.reduce((sum, o) => sum + (o.storage_used_gb || 0), 0)
    const totalScans = rows.reduce((sum, o) => sum + (o.scan_count || 0), 0)
    return { totalOrgs, totalMembers, totalAdmins, totalStorage, totalScans }
  }, [rows])

  // ── Org detail (mock-backed, same pattern as UsersPage drawer) ───────────
  const orgMembers = useMemo(() => {
    if (!selectedOrg) return []
    const members = mockUsers.filter((u) => u.org_id === selectedOrg.id)
    // Respect the active team filter so the drawer stays coherent with the
    // scoped table (members carry the team assignment via mockUsers).
    return isTeamScoped ? members.filter((m) => m.team_id === teamFilter) : members
  }, [selectedOrg, teamFilter, isTeamScoped])

  const orgActivity = useMemo(() => {
    if (!selectedOrg) return []
    return mockAuditEvents
      .filter(
        (e) => e.resource_type === 'organization' || e.action?.includes('org') || e.action?.includes('team'),
      )
      .slice(0, 15)
  }, [selectedOrg])

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleRowClick(row) {
    setSelectedOrg(row)
    setDrawerTab('members')
    setDrawerOpen(true)
  }

  useRegisterCommands(
    [
      {
        id: 'orgs.go-users',
        group: 'Organizations',
        label: 'Open user administration',
        hint: 'Manage accounts and roles',
        keywords: ['organizations', 'users', 'admin'],
        onSelect: () => navigate('/app/admin/users'),
      },
      {
        id: 'orgs.go-feature-flags',
        group: 'Organizations',
        label: 'Open feature flags',
        hint: 'Toggle platform capabilities',
        keywords: ['organizations', 'feature flags', 'admin'],
        onSelect: () => navigate('/app/admin/feature-flags'),
      },
    ],
    [navigate],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Organization Management"
        title="Inspect workspace structure and posture"
        description="Review organization membership, storage usage, and team activity from one operational surface."
        meta={[
          { label: `${kpis.totalOrgs} organizations` },
          { label: `${kpis.totalMembers} members` },
          { label: `${formatStorageGb(kpis.totalStorage)} stored` },
        ]}
      />

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Orgs" value={String(kpis.totalOrgs)} detail="Active organizations." tone="default" size="sm" loading={loading} error={failed} />
        <StatCard label="Total Members" value={String(kpis.totalMembers)} detail="Across all orgs." tone="info" size="sm" loading={loading} error={failed} />
        <StatCard label="Total Admins" value={String(kpis.totalAdmins)} detail="Org-level admins." tone="info" size="sm" loading={loading} error={failed} />
        <StatCard label="Storage Used" value={formatStorageGb(kpis.totalStorage)} detail="Cumulative storage." tone="warning" size="sm" loading={loading} error={failed} />
        <StatCard label="Scan Volume" value={kpis.totalScans.toLocaleString()} detail="Total scans run." tone="success" size="sm" loading={loading} error={failed} />
      </div>

      {/* --- Table --- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TeamFilter counts={teamCounts} value={teamFilter} onChange={setTeamFilter} label="Team" />
        {isTeamScoped && <Badge tone="info">Showing orgs with {getTeamMeta(teamFilter).name} members</Badge>}
      </div>
      <div className="mt-4">
        <DataTable
          columns={ORG_COLUMNS}
          rows={filteredRows}
          keyField="id"
          loading={loading}
          error={failed ? orgs.error : null}
          onRetry={orgs.reload}
          searchable
          searchPlaceholder="Search by organization name"
          searchKeys={['name']}
          onRowClick={handleRowClick}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
          emptyTitle={isTeamScoped ? 'No organizations in this team' : 'No organizations found'}
          emptyDescription={
            isTeamScoped
              ? 'Try a different team — or clear the filter to see every organization.'
              : 'Organizations will appear here as teams onboard.'
          }
        />
      </div>

      {/* --- Detail Drawer --- */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedOrg?.name || 'Organization detail'}
        description="Membership, storage posture, and recent organization-level activity."
        size="xl"
      >
        {selectedOrg && (
          <div className="space-y-6">
            <Tabs
              ariaLabel="Organization detail"
              variant="pill"
              items={[
                { value: 'members', label: 'Members', badge: String(orgMembers.length) },
                { value: 'settings', label: 'Settings' },
                { value: 'activity', label: 'Activity', badge: String(orgActivity.length) },
              ]}
              value={drawerTab}
              onChange={setDrawerTab}
            />

            {/* --- Members tab --- */}
            {drawerTab === 'members' && (
              <>
                {isTeamScoped && (
                  <p className="text-xs text-charcoal-mid">
                    Showing {getTeamMeta(teamFilter).name} members — the active team filter applies
                    to this organization's roster.
                  </p>
                )}
                <div className="mt-4">
                  <DataTable
                    columns={MEMBER_COLUMNS}
                    rows={orgMembers}
                    keyField="id"
                    searchable
                    searchPlaceholder="Search members"
                    searchKeys={['displayName', 'email']}
                    emptyTitle={
                      isTeamScoped ? 'No members in this team' : 'No members in this organization'
                    }
                    emptyDescription={
                      isTeamScoped
                        ? 'This organization has no members in the selected team.'
                        : 'Members appear here once they join the workspace.'
                    }
                  />
                </div>
              </>
            )}

            {/* --- Settings tab --- */}
            {drawerTab === 'settings' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Organization ID</p>
                    <p className="mt-2 font-mono text-sm text-charcoal">{selectedOrg.id}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Created</p>
                    <p className="mt-2 text-sm text-charcoal">{formatDateLong(selectedOrg.created_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Members</p>
                    <p className="mt-2 text-sm text-charcoal">{selectedOrg.member_count}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Admins</p>
                    <p className="mt-2 text-sm text-charcoal">{selectedOrg.admin_count}</p>
                  </div>
                </div>

                {/* Storage progress bar */}
                <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Storage usage</p>
                    <p className="text-sm font-medium text-charcoal">{formatStorageGb(selectedOrg.storage_used_gb)}</p>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-stone-light">
                    <div
                      className="h-2 rounded-full bg-charcoal transition-all"
                      style={{ width: `${Math.min((selectedOrg.storage_used_gb / 500) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-charcoal-light">
                    <span>0 GB</span>
                    <span>500 GB limit</span>
                  </div>
                </div>

                {/* Scan stats */}
                <div className="rounded-2xl border border-stone-light bg-parchment p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Scan statistics</p>
                  <p className="mt-2 text-2xl font-serif text-charcoal">{selectedOrg.scan_count.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-charcoal-mid">Total scans across all members</p>
                </div>
              </div>
            )}

            {/* --- Activity Log tab --- */}
            {drawerTab === 'activity' && (
              <div className="space-y-0 divide-y divide-stone-light/60">
                {orgActivity.length === 0 ? (
                  <EmptyState
                    variant="empty"
                    title="No recent activity"
                    description="Organization-level events will appear here as they happen."
                    compact
                  />
                ) : (
                  orgActivity.map((event) => <ActivityRow key={event.id} event={event} />)
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
