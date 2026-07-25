import { useCallback, useEffect, useMemo, useState } from 'react'
import { mockFeatureFlags } from '../../lib/mockData.js'
import { updateFeatureFlag } from '../../lib/api.js'
import StatCard from '../../components/admin/StatCard.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXPOSURE_BADGE_STYLES = {
  all_users: 'bg-rose-100 text-rose-800',
  org_admins: 'bg-amber-100 text-amber-800',
  team_admins: 'bg-amber-100 text-amber-800',
  internal: 'bg-emerald-100 text-emerald-800',
  super_admin: 'bg-emerald-100 text-emerald-800',
}

const EXPOSURE_LABELS = {
  all_users: 'High',
  org_admins: 'Medium',
  team_admins: 'Medium',
  internal: 'Low',
  super_admin: 'Low',
}

// ---------------------------------------------------------------------------
// Feature flag table columns
// ---------------------------------------------------------------------------

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

export default function FeatureFlagsPage() {
  // --------------------------------------------------
  // Data state
  // --------------------------------------------------
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters & sort
  const [filterText, setFilterText] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Toggle feedback & confirm
  const [toggleState, setToggleState] = useState({ key: null, status: 'idle', message: '' })
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    variant: 'default',
    onConfirm: () => {},
  })

  // --------------------------------------------------
  // Load data
  // --------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setKpisLoading(true)
      setTableLoading(true)
      setError('')

      await new Promise((r) => setTimeout(r, 300 + Math.random() * 300))

      if (Math.random() < 0.08) {
        throw new Error('Mock API: simulated transient error. Please try again.')
      }

      setFlags(mockFeatureFlags)
      setKpisLoading(false)
      setTimeout(() => setTableLoading(false), 200)
    } catch (err) {
      setError(err.message || 'Failed to load feature flags.')
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
    const total = flags.length
    const enabled = flags.filter((f) => f.enabled).length
    const disabled = flags.filter((f) => !f.enabled).length
    const highExposure = flags.filter((f) => f.exposure === 'all_users').length
    return { total, enabled, disabled, highExposure }
  }, [flags])

  // --------------------------------------------------
  // Columns (built inside component to access state)
  // --------------------------------------------------
  const columns = useMemo(() => [
    {
      key: 'key',
      label: 'Key',
      sortable: true,
      render: (row) => (
        <code className="rounded-md bg-stone-light/50 px-2 py-0.5 font-mono text-xs text-charcoal">
          {row.key}
        </code>
      ),
    },
    { key: 'label', label: 'Label', sortable: true },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (row) => (
        <span className="line-clamp-2 max-w-xs text-charcoal-mid">{row.description}</span>
      ),
    },
    {
      key: 'enabled',
      label: 'Enabled',
      sortable: true,
      render: (row) => {
        const isPending = toggleState.key === row.key && toggleState.status === 'submitting'
        return (
          <button
            type="button"
            role="switch"
            aria-checked={row.enabled}
            aria-label={`Toggle ${row.label}`}
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation()
              handleToggleClick(row)
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:ring-offset-2 ${
              row.enabled ? 'bg-emerald-500' : 'bg-stone-light'
            } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                row.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )
      },
    },
    {
      key: 'exposure',
      label: 'Exposure',
      sortable: true,
      render: (row) => {
        const badgeStyle = EXPOSURE_BADGE_STYLES[row.exposure] || 'bg-stone-light text-charcoal'
        const label = EXPOSURE_LABELS[row.exposure] || row.exposure
        return (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] ${badgeStyle}`}>
            {label}
          </span>
        )
      },
    },
    { key: 'owner', label: 'Owner', sortable: true },
  ], [toggleState])

  // --------------------------------------------------
  // Filtered + sorted + paginated
  // --------------------------------------------------
  const { paginatedFlags, totalFiltered } = useMemo(() => {
    const query = filterText.trim().toLowerCase()

    let filtered = flags.filter((flag) => {
      if (!query) return true
      return (
        flag.key.toLowerCase().includes(query) ||
        flag.label.toLowerCase().includes(query) ||
        flag.description.toLowerCase().includes(query) ||
        flag.owner.toLowerCase().includes(query)
      )
    })

    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = sortKey === 'enabled' ? (a[sortKey] ? 1 : 0) : a[sortKey]
        const bVal = sortKey === 'enabled' ? (b[sortKey] ? 1 : 0) : b[sortKey]

        let cmp = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          cmp = aVal.localeCompare(bVal)
        } else {
          cmp = (Number(aVal) || 0) - (Number(bVal) || 0)
        }

        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    return { paginatedFlags: filtered.slice(start, start + pageSize), totalFiltered: total }
  }, [flags, filterText, sortKey, sortDir, page, pageSize])

  // --------------------------------------------------
  // Sort handler
  // --------------------------------------------------
  const handleSort = useCallback((key, dir) => {
    setSortKey(key)
    setSortDir(dir)
    setPage(1)
  }, [])

  // --------------------------------------------------
  // Toggle confirmation
  // --------------------------------------------------
  function handleToggleClick(flag) {
    const newState = !flag.enabled
    const action = newState ? 'Enable' : 'Disable'

    // Build blast radius guidance
    const exposureText = flag.exposure === 'all_users'
      ? 'This flag affects all users across all organizations. Changes will take effect immediately for everyone.'
      : flag.exposure === 'org_admins'
        ? 'This flag affects organization admins across all organizations.'
        : flag.exposure === 'team_admins'
          ? 'This flag affects team admins only.'
          : 'This flag is scoped to internal use only.'

    setConfirmDialog({
      open: true,
      title: `${action}: ${flag.label}`,
      description: `You are about to ${action.toLowerCase()} the "${flag.label}" feature flag (key: ${flag.key}).\n\n${exposureText}\n\nAffected: ${flag.exposure === 'all_users' ? 'All users' : flag.exposure === 'org_admins' ? 'Organization admins' : flag.exposure === 'team_admins' ? 'Team admins' : 'Internal staff'}\nOwner: ${flag.owner}`,
      variant: newState ? 'default' : 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        await executeToggle(flag.key, newState, flag.label)
      },
    })
  }

  async function executeToggle(key, enabled, label) {
    setToggleState({ key, status: 'submitting', message: '' })

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled } : f))
    )

    try {
      await updateFeatureFlag(key, enabled)
      setToggleState({ key, status: 'success', message: `"${label}" ${enabled ? 'enabled' : 'disabled'} successfully.` })

      // Clear success after a few seconds
      setTimeout(() => setToggleState({ key: null, status: 'idle', message: '' }), 4000)
    } catch (err) {
      // Revert on error
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f))
      )
      setToggleState({
        key,
        status: 'error',
        message: `Failed to ${enabled ? 'enable' : 'disable'} "${label}": ${err.message || 'Unknown error'}. Reverted.`,
      })
    }
  }

  function closeConfirm() {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
  }

  // --------------------------------------------------
  // Error state (full-page)
  // --------------------------------------------------
  if (error && flags.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
            <svg className="h-7 w-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-serif text-2xl text-charcoal">Feature flags could not be loaded</p>
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
      {/* --- KPI Cards --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Flags" value={String(kpis.total)} detail="All feature toggles." tone="default" compact />
            <StatCard label="Enabled" value={String(kpis.enabled)} detail="Currently active." tone="success" compact />
            <StatCard label="Disabled" value={String(kpis.disabled)} detail="Currently off." tone="warning" compact />
            <StatCard label="High Exposure" value={String(kpis.highExposure)} detail="All-users scope." tone="danger" compact />
          </>
        )}
      </div>

      {/* --- Toggle feedback (aria-live) --- */}
      {toggleState.message && (
        <div
          aria-live="polite"
          className={`rounded-2xl px-4 py-3 text-sm ${
            toggleState.status === 'error'
              ? 'border border-rose-200 bg-rose-50 text-rose-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {toggleState.message}
        </div>
      )}

      {/* --- Table + Filters --- */}
      <div className="space-y-4">
        <AdminTable
          columns={columns}
          data={paginatedFlags}
          loading={tableLoading}
          filterValue={filterText}
          onFilterChange={(value) => {
            setFilterText(value)
            setPage(1)
          }}
          filterPlaceholder="Search by key, label, description, or owner"
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
          emptyMessage="No feature flags configured yet."
          filteredEmptyMessage="No feature flags match your search."
        />
      </div>

      {/* --- Confirm Dialog --- */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.variant === 'danger' ? 'Disable' : 'Enable'}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}
