import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, useRegisterCommands, useToast } from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import { getAdminRoles } from '../../lib/api.js'
import { useDemoState } from '../../lib/useDemoState.js'
import useMockData from '../../lib/useMockData.js'

// ---------------------------------------------------------------------------
// Role card
// ---------------------------------------------------------------------------

const ROLE_TONES = {
  role_owner: 'danger',
  role_admin: 'warning',
  role_analyst: 'success',
  role_viewer: 'neutral',
}

function RoleCard({ role, scopeMeta, onToggleScope, onToast }) {
  const allowedCount = scopeMeta.filter(({ key }) => role.scopes[key]).length

  return (
    <section className="rounded-[1.5rem] border border-stone-light bg-white-warm p-5 shadow-[0_16px_35px_rgba(26,26,26,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl text-charcoal">{role.name}</h3>
            <Badge tone={ROLE_TONES[role.id] || 'neutral'} size="sm">
              {role.member_count} member{role.member_count === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{role.description}</p>
        </div>
        {!role.editable && (
          <span className="rounded-full border border-stone-light bg-parchment px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
            Fixed
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
            Permissions · {allowedCount} of {scopeMeta.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!role.editable}
            onClick={() => {
              onToast('Role saved', {
                description: `${role.name} permissions updated.`,
                type: 'success',
              })
            }}
          >
            Save role
          </Button>
        </div>
        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {scopeMeta.map(({ key, label }) => (
            <label
              key={key}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                role.scopes[key]
                  ? 'border-charcoal/20 bg-charcoal/5'
                  : 'border-stone-light bg-parchment/60'
              } ${role.editable ? 'cursor-pointer hover:border-charcoal/30' : 'cursor-default'}`}
            >
              <span className="text-charcoal">{label}</span>
              {role.editable ? (
                <input
                  type="checkbox"
                  checked={Boolean(role.scopes[key])}
                  onChange={() => onToggleScope(role.id, key)}
                  aria-label={`${label} for ${role.name}`}
                  className="h-4 w-4 cursor-pointer rounded border-stone-light text-charcoal focus:ring-charcoal/20"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${role.scopes[key] ? 'bg-emerald-500' : 'bg-stone-light'}`}
                />
              )}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RolesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const demoState = useDemoState()

  const { data: rawData, loading, error, refetch } = useMockData(getAdminRoles)
  const EMPTY_ROLES = useMemo(() => ({ roles: [], scopes: [] }), [])
  const data = demoState === 'empty' ? EMPTY_ROLES : rawData

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'

  const roles = useMemo(() => data?.roles || [], [data])
  const scopeMeta = useMemo(() => data?.scopes || [], [data])
  const [localRoles, setLocalRoles] = useState(roles)

  // Keep the working copy in sync when real data lands (after loading).
  const prevRoles = useMemo(() => roles, [roles])
  const [synced, setSynced] = useState(false)
  if (!synced && roles.length > 0) {
    setLocalRoles(roles)
    setSynced(true)
  }
  void prevRoles

  const totalMembers = useMemo(
    () => localRoles.reduce((sum, role) => sum + (role.member_count || 0), 0),
    [localRoles],
  )

  function handleToggleScope(roleId, scopeKey) {
    setLocalRoles((current) =>
      current.map((role) =>
        role.id === roleId
          ? { ...role, scopes: { ...role.scopes, [scopeKey]: !role.scopes[scopeKey] } }
          : role,
      ),
    )
  }

  useRegisterCommands(
    [
      {
        id: 'admin.roles-reset',
        group: 'Roles',
        label: 'Discard role edits',
        keywords: ['roles', 'permissions', 'reset', 'rbac'],
        onSelect: () => {
          setLocalRoles(roles)
          toast('Edits discarded', { description: 'Roles reverted to the saved state.', type: 'info' })
        },
      },
      {
        id: 'admin.roles-go-overview',
        group: 'Roles',
        label: 'Open platform overview',
        hint: 'Queue, health, and attention surfaces',
        keywords: ['roles', 'admin', 'overview', 'dashboard'],
        onSelect: () => navigate('/app/admin'),
      },
    ],
    [roles, navigate, toast],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Roles & Permissions"
        title="Roles and capability matrix"
        description="Every role, its scope, and how many members hold it. Toggle permissions on editable roles and save — the Owner role is fixed by design."
        meta={[
          { label: `${localRoles.length} roles` },
          { label: `${totalMembers} members` },
        ]}
        primaryAction={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              toast('Role saved', { description: 'Permission changes applied.', type: 'success' })
            }}
          >
            Save all changes
          </Button>
        }
      />

      <Card
        eyebrow="RBAC matrix"
        title="Roles"
        description="Owner is fixed; Admin, Analyst, and Viewer are editable. Permission changes persist in mock mode for the session."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={4}
      >
        {!isLoading && !hasError && (
          <div className="grid gap-5 lg:grid-cols-2">
            {localRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                scopeMeta={scopeMeta}
                onToggleScope={handleToggleScope}
                onToast={toast}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Demo-state banner (dev-only) */}
      {demoState && (
        <div className="fixed bottom-4 right-4 z-[60] rounded-full border border-charcoal bg-charcoal px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-parchment shadow-lg">
          Demo state · {demoState}
        </div>
      )}
    </div>
  )
}
