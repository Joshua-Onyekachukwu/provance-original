import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterCommands, Badge, DataTable, StatCard, useToast } from '../../components/ui/index.js'
import { getFeatureFlags, updateFeatureFlag } from '../../lib/api.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'
import { applyToggle, countFlagKpis } from '../../lib/flagToggle.js'

// ---------------------------------------------------------------------------
// Presentation meta
// ---------------------------------------------------------------------------

const EXPOSURE_META = {
  all_users: { label: 'High', tone: 'danger' },
  org_admins: { label: 'Medium', tone: 'warning' },
  team_admins: { label: 'Medium', tone: 'warning' },
  internal: { label: 'Low', tone: 'success' },
  super_admin: { label: 'Low', tone: 'success' },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeatureFlagsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  const resource = useResource(() => getFeatureFlags().then((rows) => rows || []))
  const flags = withDemoOverride(resource, demoState, { emptyData: [] })

  const status = flags.status
  const loading = status === 'loading'
  const failed = status === 'error'

  // Toggle feedback & confirm
  const [toggleState, setToggleState] = useState({ key: null, status: 'idle' })
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    variant: 'default',
    onConfirm: () => {},
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const rows = useMemo(() => flags.data || [], [flags.data])

  // Latest-data ref: the columns memo captures handlers (and their closures)
  // once per toggleState change, so handlers must read rows through a ref to
  // avoid acting on the stale array from an earlier render.
  const rowsRef = useRef(rows)
  rowsRef.current = rows



  // ── Toggle confirmation ───────────────────────────────────────────────────
  function handleToggleClick(flag) {
    const newState = !flag.enabled
    const action = newState ? 'Enable' : 'Disable'

    const exposureText =
      flag.exposure === 'all_users'
        ? 'This flag affects all users across all organizations. Changes will take effect immediately for everyone.'
        : flag.exposure === 'org_admins'
          ? 'This flag affects organization admins across all organizations.'
          : flag.exposure === 'team_admins'
            ? 'This flag affects team admins only.'
            : 'This flag is scoped to internal use only.'

    setConfirmDialog({
      open: true,
      title: `${action}: ${flag.label}`,
      description: `You are about to ${action.toLowerCase()} the "${flag.label}" feature flag (key: ${flag.key}).\n\n${exposureText}\n\nAffected: ${
        flag.exposure === 'all_users'
          ? 'All users'
          : flag.exposure === 'org_admins'
            ? 'Organization admins'
            : flag.exposure === 'team_admins'
              ? 'Team admins'
              : 'Internal staff'
      }\nOwner: ${flag.owner}`,
      variant: newState ? 'default' : 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        await executeToggle(flag.key, newState, flag.label)
      },
    })
  }

  async function executeToggle(key, enabled, label) {
    setToggleState({ key, status: 'submitting' })

    // Optimistic update
    setFlagsData((prev) => applyToggle(prev, key, enabled))

    try {
      await updateFeatureFlag(key, enabled)
      setToggleState({ key: null, status: 'idle' })
      toast(`"${label}" ${enabled ? 'enabled' : 'disabled'}`, {
        description: `The ${key} feature flag is now ${enabled ? 'on' : 'off'} for its exposure group.`,
        type: 'success',
      })
    } catch (err) {
      // Revert on error
      setFlagsData((prev) => applyToggle(prev, key, !enabled))
      setToggleState({ key: null, status: 'idle' })
      toast(`Could not ${enabled ? 'enable' : 'disable'} "${label}"`, {
        description: err.message || 'Unknown error — the toggle was reverted.',
        type: 'error',
      })
    }
  }

  // ── Local working copy for optimistic toggles ────────────────────────────
  // Seeded once per fetched rows identity; a fresh fetch (reload / retry)
  // resets it so reloads never show stale toggle state.
  const [workingRows, setWorkingRows] = useState(null)
  useEffect(() => {
    setWorkingRows(null)
  }, [rows])

  const displayRows = workingRows || rows

  function setFlagsData(updater) {
    setWorkingRows((current) => updater(current || rowsRef.current))
  }

  function closeConfirm() {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
  }

  // KPIs read the working copy (not the source rows) so the Enabled/Disabled
  // counts stay in lockstep with the optimistic table after a toggle.
  const kpis = useMemo(() => countFlagKpis(displayRows), [displayRows])

  // ── Columns (built in-component to reach toggle state) ────────────────────
  const columns = useMemo(
    () => [
      {
        key: 'key',
        header: 'Key',
        sortable: true,
        render: (row) => (
          <code className="rounded-md bg-stone-light/50 px-2 py-0.5 font-mono text-xs text-charcoal">
            {row.key}
          </code>
        ),
      },
      { key: 'label', header: 'Label', sortable: true },
      {
        key: 'description',
        header: 'Description',
        sortable: false,
        render: (row) => <span className="line-clamp-2 max-w-xs text-charcoal-mid">{row.description}</span>,
      },
      {
        key: 'enabled',
        header: 'Enabled',
        sortable: true,
        sortValue: (row) => (row.enabled ? 1 : 0),
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
              } ${isPending ? 'cursor-wait opacity-50' : ''}`}
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
        header: 'Exposure',
        sortable: true,
        sortValue: (row) => EXPOSURE_META[row.exposure]?.label || row.exposure,
        render: (row) => {
          const meta = EXPOSURE_META[row.exposure] || { label: row.exposure, tone: 'neutral' }
          return (
            <Badge tone={meta.tone} size="sm">
              {meta.label}
            </Badge>
          )
        },
      },
      { key: 'owner', header: 'Owner', sortable: true },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggleState],
  )

  useRegisterCommands(
    [
      {
        id: 'flags.go-monitoring',
        group: 'Feature Flags',
        label: 'Open monitoring',
        hint: 'System health and uptime',
        keywords: ['feature flags', 'monitoring', 'admin'],
        onSelect: () => navigate('/app/admin/monitoring'),
      },
      {
        id: 'flags.go-organizations',
        group: 'Feature Flags',
        label: 'Open organizations',
        hint: 'Workspace profiles',
        keywords: ['feature flags', 'organizations', 'admin'],
        onSelect: () => navigate('/app/admin/organizations'),
      },
    ],
    [navigate],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Feature Flags"
        title="Control platform capabilities"
        description="Toggle product capabilities with blast-radius guidance. High-exposure flags affect all users and are gated behind confirmation."
        meta={[
          { label: `${kpis.total} flags` },
          { label: `${kpis.enabled} enabled` },
          { label: `${kpis.highExposure} high exposure` },
        ]}
      />

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Flags" value={String(kpis.total)} detail="All feature toggles." tone="default" size="sm" loading={loading} error={failed} />
        <StatCard label="Enabled" value={String(kpis.enabled)} detail="Currently active." tone="success" size="sm" loading={loading} error={failed} />
        <StatCard label="Disabled" value={String(kpis.disabled)} detail="Currently off." tone="warning" size="sm" loading={loading} error={failed} />
        <StatCard label="High Exposure" value={String(kpis.highExposure)} detail="All-users scope." tone="danger" size="sm" loading={loading} error={failed} />
      </div>

      {/* --- Table --- */}
      <DataTable
        columns={columns}
        rows={displayRows}
        keyField="key"
        loading={loading}
        error={failed ? flags.error : null}
        onRetry={flags.reload}
        searchable
        searchPlaceholder="Search by key, label, description, or owner"
        searchKeys={['key', 'label', 'description', 'owner']}
        pagination
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        emptyTitle="No feature flags configured yet"
        emptyDescription="Feature flags will appear here as capabilities are introduced."
      />

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
