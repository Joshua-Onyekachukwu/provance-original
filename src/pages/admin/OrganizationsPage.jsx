import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterCommands } from '../../components/ui/index.js'
import { mockOrganizations, mockUsers, mockAuditEvents } from '../../lib/mockData.js'
import {
  formatDate,
  formatDateLong,
  formatStorageGb,
} from '../../components/app/scanPresentation.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import StatCard from '../../components/admin/StatCard.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'
import AdminDrawer from '../../components/admin/AdminDrawer.jsx'
import ActivityRow from '../../components/admin/ActivityRow.jsx'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_BADGE_STYLES = {
  super_admin: 'bg-charcoal text-parchment',
  admin: 'bg-charcoal/80 text-parchment',
  member: 'bg-stone-light text-charcoal',
  owner: 'bg-amber-100 text-amber-800',
}

const STATUS_DOT_STYLES = {
  online: 'bg-emerald-500',
  offline: 'bg-stone-300',
  recent: 'bg-amber-400',
}

function getStatusDot(lastSignIn) {
  if (!lastSignIn) return 'offline'
  const hoursAgo = (Date.now() - new Date(lastSignIn).getTime()) / 3600000
  if (hoursAgo < 1) return 'online'
  if (hoursAgo < 24) return 'recent'
  return 'offline'
}

// ---------------------------------------------------------------------------
// Org table columns
// ---------------------------------------------------------------------------

const ORG_COLUMNS = [
  { key: 'name', label: 'Org Name', sortable: true },
  { key: 'member_count', label: 'Members', sortable: true },
  { key: 'admin_count', label: 'Admins', sortable: true },
  {
    key: 'storage_used_gb',
    label: 'Storage',
    sortable: true,
    render: (row) => formatStorageGb(row.storage_used_gb),
  },
  {
    key: 'scan_count',
    label: 'Scans',
    sortable: true,
    render: (row) => row.scan_count.toLocaleString(),
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: true,
    render: (row) => formatDate(row.created_at),
  },
]

// ---------------------------------------------------------------------------
// Member table columns (in drawer)
// ---------------------------------------------------------------------------

const MEMBER_COLUMNS = [
  { key: 'displayName', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'role',
    label: 'Role',
    sortable: true,
    render: (row) => {
      const style = ROLE_BADGE_STYLES[row.role] || ROLE_BADGE_STYLES.member
      const label = (row.role || 'member').replaceAll('_', ' ')
      return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] ${style}`}>
          {label}
        </span>
      )
    },
  },
  {
    key: 'last_sign_in',
    label: 'Status',
    sortable: true,
    render: (row) => {
      const status = getStatusDot(row.last_sign_in)
      const dotColor = STATUS_DOT_STYLES[status]
      return (
        <span className="inline-flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          <span className="text-sm text-charcoal-mid capitalize">{status}</span>
        </span>
      )
    },
  },
]

// ---------------------------------------------------------------------------
// Skeleton components
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

export default function OrganizationsPage() {
  const navigate = useNavigate()

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

  // --------------------------------------------------
  // Data state
  // --------------------------------------------------
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [error, setError] = useState('')

  // Selection & drawer
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('members')

  // Filters & sort
  const [filterText, setFilterText] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // --------------------------------------------------
  // Load data
  // --------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setKpisLoading(true)
      setTableLoading(true)
      setError('')

      // Simulate async loading with mock data
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 300))

      // 5-10% error injection
      if (Math.random() < 0.08) {
        throw new Error('Mock API: simulated transient error. Please try again.')
      }

      setOrgs(mockOrganizations)
      setKpisLoading(false)

      // Slight delay for table
      setTimeout(() => setTableLoading(false), 200)
    } catch (err) {
      setError(err.message || 'Failed to load organizations.')
      setKpisLoading(false)
      setTableLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // --------------------------------------------------
  // KPIs
  // --------------------------------------------------
  const kpis = useMemo(() => {
    const totalOrgs = orgs.length
    const totalMembers = orgs.reduce((sum, o) => sum + (o.member_count || 0), 0)
    const totalAdmins = orgs.reduce((sum, o) => sum + (o.admin_count || 0), 0)
    const totalStorage = orgs.reduce((sum, o) => sum + (o.storage_used_gb || 0), 0)
    const totalScans = orgs.reduce((sum, o) => sum + (o.scan_count || 0), 0)
    return { totalOrgs, totalMembers, totalAdmins, totalStorage, totalScans }
  }, [orgs])

  // --------------------------------------------------
  // Filtered + sorted + paginated
  // --------------------------------------------------
  const { paginatedOrgs, totalFiltered } = useMemo(() => {
    const query = filterText.trim().toLowerCase()

    let filtered = orgs.filter((org) => {
      if (!query) return true
      return org.name.toLowerCase().includes(query)
    })

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
          cmp = (Number(aVal) || 0) - (Number(bVal) || 0)
        }

        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    return { paginatedOrgs: filtered.slice(start, start + pageSize), totalFiltered: total }
  }, [orgs, filterText, sortKey, sortDir, page, pageSize])

  // --------------------------------------------------
  // Sort handler
  // --------------------------------------------------
  const handleSort = useCallback((key, dir) => {
    setSortKey(key)
    setSortDir(dir)
    setPage(1)
  }, [])

  // --------------------------------------------------
  // Row click → open drawer
  // --------------------------------------------------
  function handleRowClick(row) {
    setSelectedOrg(row)
    setDrawerTab('members')
    setDrawerOpen(true)
  }

  // --------------------------------------------------
  // Org members (filtered by org_id)
  // --------------------------------------------------
  const orgMembers = useMemo(() => {
    if (!selectedOrg) return []
    return mockUsers.filter((u) => u.org_id === selectedOrg.id)
  }, [selectedOrg])

  // --------------------------------------------------
  // Org activity (scoped audit events)
  // --------------------------------------------------
  const orgActivity = useMemo(() => {
    if (!selectedOrg) return []
    return mockAuditEvents
      .filter((e) => e.resource_type === 'organization' || e.action?.includes('org') || e.action?.includes('team'))
      .slice(0, 15)
  }, [selectedOrg])

  // --------------------------------------------------
  // Error state (full-page)
  // --------------------------------------------------
  if (error && orgs.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
            <svg className="h-7 w-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-serif text-2xl text-charcoal">Organization workspace could not be loaded</p>
          <p className="mt-2 text-sm text-charcoal-mid">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 rounded-xl border border-stone-light px-4 py-2.5 text-sm text-charcoal transition hover:border-charcoal"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpisLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Orgs" value={String(kpis.totalOrgs)} detail="Active organizations." tone="default" compact />
            <StatCard label="Total Members" value={String(kpis.totalMembers)} detail="Across all orgs." tone="info" compact />
            <StatCard label="Total Admins" value={String(kpis.totalAdmins)} detail="Org-level admins." tone="info" compact />
            <StatCard label="Storage Used" value={formatStorageGb(kpis.totalStorage)} detail="Cumulative storage." tone="warning" compact />
            <StatCard label="Scan Volume" value={kpis.totalScans.toLocaleString()} detail="Total scans run." tone="success" compact />
          </>
        )}
      </div>

      {/* --- Table + Filters --- */}
      <div className="space-y-4">
        <AdminTable
          columns={ORG_COLUMNS}
          data={paginatedOrgs}
          loading={tableLoading}
          filterValue={filterText}
          onFilterChange={(value) => {
            setFilterText(value)
            setPage(1)
          }}
          filterPlaceholder="Search by organization name"
          onRowClick={handleRowClick}
          onSort={handleSort}
          onPageChange={(newPage, newPageSize) => {
            setPage(newPage)
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize)
              setPage(1)
            }
          }}
          page={page}
          pageSize={pageSize}
          total={totalFiltered}
          emptyMessage="No organizations found."
          filteredEmptyMessage="No organizations match your search."
        />
      </div>

      {/* --- Detail Drawer --- */}
      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedOrg?.name || 'Organization detail'}
      >
        {selectedOrg && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-stone-light bg-parchment p-1">
              {['members', 'settings', 'activity'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDrawerTab(tab)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    drawerTab === tab
                      ? 'bg-white-warm text-charcoal shadow-sm'
                      : 'text-charcoal-mid hover:text-charcoal'
                  }`}
                >
                  {tab === 'members' ? 'Members' : tab === 'settings' ? 'Settings' : 'Activity Log'}
                </button>
              ))}
            </div>

            {/* --- Members tab --- */}
            {drawerTab === 'members' && (
              <div className="space-y-4">
                {orgMembers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-charcoal-mid">No members in this organization.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-stone-light">
                    <table className="w-full text-left" role="table">
                      <thead>
                        <tr className="border-b border-stone-light bg-parchment">
                          {MEMBER_COLUMNS.map((col) => (
                            <th
                              key={col.key}
                              className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orgMembers.map((member) => (
                          <tr key={member.id} className="border-b border-stone-light/60">
                            {MEMBER_COLUMNS.map((col) => (
                              <td key={col.key} className="px-4 py-3 text-sm text-charcoal">
                                {col.render ? col.render(member) : member[col.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* --- Settings tab --- */}
            {drawerTab === 'settings' && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <p className="py-8 text-center text-sm text-charcoal-mid">No recent activity for this organization.</p>
                ) : (
                  orgActivity.map((event) => (
                    <ActivityRow key={event.id} event={event} />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}
