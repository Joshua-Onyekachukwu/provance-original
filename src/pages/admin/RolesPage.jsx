import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, useRegisterCommands, useToast } from '../../components/ui/index.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx'
import ActivityRow from '../../components/admin/ActivityRow.jsx'
import { formatRelativeTime } from '../../components/app/scanPresentation.js'
import { getAdminRoles, reassignMemberRole, updateRoleScopes } from '../../lib/api.js'
import { useDemoState } from '../../lib/useDemoState.js'
import useMockData from '../../lib/useMockData.js'
import { useAuth } from '../../context/AuthContext.jsx'

// ---------------------------------------------------------------------------
// Role card
// ---------------------------------------------------------------------------

const ROLE_TONES = {
  role_owner: 'danger',
  role_admin: 'warning',
  role_analyst: 'success',
  role_viewer: 'neutral',
}

const ROLE_ORDER = ['role_owner', 'role_admin', 'role_analyst', 'role_viewer']

function RoleCard({ role, scopeMeta, onToggleScope, onSaveRole, saving }) {
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
            loading={saving}
            onClick={() => onSaveRole(role)}
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
// Member assignment
// ---------------------------------------------------------------------------

function MemberRow({ member, roles, onReassign, busy }) {
  // The Owner seat is fixed by design: the owner's selector is locked and the
  // Owner option is never offered to anyone else, so the fixed role can't be
  // reassigned through the roster.
  const isOwnerSeat = member.role_id === 'role_owner'
  const assignableRoles = isOwnerSeat
    ? roles
    : roles.filter((role) => role.id !== 'role_owner')

  return (
    <div className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-stone-light bg-parchment font-mono text-[11px] font-medium text-charcoal">
        {member.avatar}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{member.name}</p>
        <p className="truncate text-xs text-charcoal-mid">{member.email}</p>
      </div>
      {isOwnerSeat ? (
        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-stone-light bg-parchment px-3 py-2 font-mono text-[11px] text-charcoal-light">
          Owner
          <span className="rounded-full border border-stone-light bg-white-warm px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
            Fixed
          </span>
        </span>
      ) : (
        <label className="flex shrink-0 items-center gap-2">
          <span className="sr-only">Role for {member.name}</span>
          <select
            value={member.role_id}
            onChange={(event) => onReassign(member, event.target.value)}
            disabled={busy}
            className="rounded-xl border border-stone-light bg-parchment px-3 py-2 text-xs font-medium text-charcoal transition hover:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/20"
          >
            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RolesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const demoState = useDemoState()

  const { data: rawData, loading, error, refetch } = useMockData(getAdminRoles)
  const EMPTY_ROLES = useMemo(
    () => ({ roles: [], scopes: [], members: [], auditEvents: [] }),
    [],
  )
  const data = demoState === 'empty' ? EMPTY_ROLES : rawData

  const isLoading = loading || demoState === 'loading'
  const hasError = Boolean(error) || demoState === 'error'

  const roles = useMemo(() => data?.roles || [], [data])
  const scopeMeta = useMemo(() => data?.scopes || [], [data])
  const members = useMemo(() => data?.members || [], [data])
  const auditEvents = useMemo(() => data?.auditEvents || [], [data])

  // In-session audit events — scope toggles and member reassignments prepend a
  // live entry here (actor = the signed-in admin) so the change trail is
  // demonstrably reactive, not just the static mock rows.
  const [liveEvents, setLiveEvents] = useState([])
  const liveIdRef = useRef(0)

  const allAuditEvents = useMemo(
    () => [...liveEvents, ...auditEvents],
    [liveEvents, auditEvents],
  )

  const [localRoles, setLocalRoles] = useState(roles)
  const [localMembers, setLocalMembers] = useState(members)

  // Keep the working copies in sync when real data lands (after loading).
  // Both arrays must be present before copying so a backend that resolves the
  // roster a render after the roles can't leave localMembers permanently empty.
  const [synced, setSynced] = useState(false)
  if (!synced && roles.length > 0 && members.length > 0) {
    setLocalRoles(roles)
    setLocalMembers(members)
    setSynced(true)
  }

  const totalMembers = useMemo(
    () => localRoles.reduce((sum, role) => sum + (role.member_count || 0), 0),
    [localRoles],
  )

  const orderedRoles = useMemo(
    () =>
      [...localRoles].sort(
        (left, right) =>
          ROLE_ORDER.indexOf(left.id) - ROLE_ORDER.indexOf(right.id),
      ),
    [localRoles],
  )

  const [memberFilter, setMemberFilter] = useState('all')

  // In-flight save/reassign state — disables the controls so a double-click
  // can't fire the same mutation twice.
  const [savingRoleId, setSavingRoleId] = useState(null)
  const [savingAll, setSavingAll] = useState(false)
  const [savingMemberId, setSavingMemberId] = useState(null)

  const filteredMembers = useMemo(() => {
    if (memberFilter === 'all') return localMembers
    return localMembers.filter((member) => member.role_id === memberFilter)
  }, [localMembers, memberFilter])

  function handleToggleScope(roleId, scopeKey) {
    const role = localRoles.find((r) => r.id === roleId)
    if (!role || !role.editable) return
    const enabled = !role.scopes[scopeKey]

    setLocalRoles((current) =>
      current.map((r) =>
        r.id === roleId
          ? { ...r, scopes: { ...r.scopes, [scopeKey]: enabled } }
          : r,
      ),
    )
    prependLiveEvent({
      action: 'role.scope_updated',
      description: `${role.name} role — ${enabled ? 'enabled' : 'disabled'} ${scopeKey} for the whole role.`,
    })
  }

  async function handleReassign(member, nextRoleId) {
    if (member.role_id === nextRoleId) return
    const prevRoleId = member.role_id

    // Optimistic: move the member between roles and reconcile counts.
    setLocalMembers((current) =>
      current.map((m) => (m.id === member.id ? { ...m, role_id: nextRoleId } : m)),
    )
    setLocalRoles((current) =>
      current.map((role) => {
        let count = role.member_count || 0
        if (role.id === prevRoleId) count = Math.max(0, count - 1)
        if (role.id === nextRoleId) count += 1
        return role.member_count === count ? role : { ...role, member_count: count }
      }),
    )
    setSavingMemberId(member.id)

    try {
      await reassignMemberRole(member.id, nextRoleId)
      const prevRole = localRoles.find((r) => r.id === prevRoleId)
      const nextRole = localRoles.find((r) => r.id === nextRoleId)
      prependLiveEvent({
        action: 'role.member_assigned',
        description: `${member.name} moved from ${prevRole?.name || prevRoleId} to ${nextRole?.name || nextRoleId}.`,
      })
      toast('Member reassigned', {
        description: `${member.name} moved to the ${nextRoleId.replace('role_', '')} role.`,
        type: 'success',
      })
    } catch (error) {
      // Revert the optimistic move (member + both role counts).
      setLocalMembers((current) =>
        current.map((m) =>
          m.id === member.id ? { ...m, role_id: prevRoleId } : m,
        ),
      )
      setLocalRoles((current) =>
        current.map((role) => {
          let count = role.member_count || 0
          if (role.id === prevRoleId) count += 1
          if (role.id === nextRoleId) count = Math.max(0, count - 1)
          return role.member_count === count ? role : { ...role, member_count: count }
        }),
      )
      toast('Reassignment failed', {
        description: error instanceof Error ? error.message : 'The member could not be reassigned.',
        type: 'error',
      })
    } finally {
      setSavingMemberId(null)
    }
  }

  async function handleSaveRole(role) {
    if (savingRoleId) return
    setSavingRoleId(role.id)
    try {
      await updateRoleScopes(role.id, role.scopes)
      const enabledCount = Object.values(role.scopes).filter(Boolean).length
      prependLiveEvent({
        action: 'role.scope_updated',
        description: `${role.name} role — permission changes saved (${enabledCount} of ${scopeMeta.length} scopes enabled).`,
      })
      toast('Role saved', {
        description: `${role.name} permissions updated.`,
        type: 'success',
      })
    } catch (error) {
      toast('Role not saved', {
        description: error instanceof Error ? error.message : 'The role could not be saved.',
        type: 'error',
      })
    } finally {
      setSavingRoleId(null)
    }
  }

  async function handleSaveAll() {
    if (savingAll) return
    const editableRoles = localRoles.filter((role) => role.editable)
    setSavingAll(true)
    try {
      for (const role of editableRoles) {
        await updateRoleScopes(role.id, role.scopes)
      }
      prependLiveEvent({
        action: 'role.scope_updated',
        description: `Saved permission changes for ${editableRoles.length} editable roles.`,
      })
      toast('Roles saved', {
        description: `${editableRoles.length} roles updated.`,
        type: 'success',
      })
    } catch (error) {
      toast('Roles not saved', {
        description: error instanceof Error ? error.message : 'The roles could not be saved.',
        type: 'error',
      })
    } finally {
      setSavingAll(false)
    }
  }

  // Prepend a live audit event (newest first) with the signed-in admin as the
  // actor. Held in component state only — the mock trail doesn't persist
  // session events, matching the backend's once-issued token/event semantics.
  function prependLiveEvent({ action, description }) {
    liveIdRef.current += 1
    const event = {
      id: `role_audit_live_${liveIdRef.current}`,
      action,
      actor_email: user?.email || 'system',
      description,
      created_at: new Date().toISOString(),
    }
    setLiveEvents((current) => [event, ...current])
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
          setLocalMembers(members)
          toast('Edits discarded', { description: 'Roles reverted to the saved state.', type: 'info' })
        },
      },
      {
        id: 'admin.roles-assign-viewer',
        group: 'Roles',
        label: 'Filter members to Viewers',
        hint: 'Show the read-only cohort',
        keywords: ['roles', 'members', 'viewer', 'filter'],
        onSelect: () => setMemberFilter('role_viewer'),
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
    [roles, members, navigate, toast],
  )

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin Roles & Permissions"
        title="Roles and capability matrix"
        description="Every role, its scope, and how many members hold it. Toggle permissions on editable roles, reassign members, and review the change trail — the Owner role is fixed by design."
        meta={[
          { label: `${localRoles.length} roles` },
          { label: `${totalMembers} members` },
          { label: `${allAuditEvents.length} events` },
        ]}
        primaryAction={
          <Button
            variant="secondary"
            size="sm"
            loading={savingAll}
            disabled={savingAll}
            onClick={handleSaveAll}
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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {orderedRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                scopeMeta={scopeMeta}
                onToggleScope={handleToggleScope}
                onSaveRole={handleSaveRole}
                saving={savingRoleId === role.id}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        eyebrow="Member assignment"
        title="Who holds which role"
        description="Assign members to roles. Reassignments update the member list and the role counts immediately."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={5}
      >
        {!isLoading && !hasError && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {['all', ...ROLE_ORDER].map((value) => {
                const role = localRoles.find((r) => r.id === value)
                const count =
                  value === 'all'
                    ? localMembers.length
                    : localMembers.filter((m) => m.role_id === value).length
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={memberFilter === value}
                    onClick={() => setMemberFilter(value)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
                      memberFilter === value
                        ? 'border-charcoal bg-charcoal text-white-warm'
                        : 'border-stone-light bg-parchment text-charcoal-mid hover:text-charcoal'
                    }`}
                  >
                    {value === 'all' ? 'All members' : role?.name || value.replace('role_', '')}
                    <span className="ml-1.5 opacity-70">{count}</span>
                  </button>
                )
              })}
            </div>

            {filteredMembers.length === 0 ? (
              <EmptyState
                variant="empty"
                title="No members in this role"
                description="Assign a member to this role using its selector, or pick another filter."
                compact
              />
            ) : (
              <div className="divide-y divide-stone-light/70">
                {filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    roles={orderedRoles}
                    onReassign={handleReassign}
                    busy={savingMemberId === member.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Card
        eyebrow="Audit trail"
        title="Role change history"
        description="Permission edits and membership moves, newest first — scope toggles and reassignments made in this session appear here instantly, with the same role.changed severity contract the audit log uses."
        state={hasError ? 'error' : isLoading ? 'loading' : 'default'}
        errorDescription={hasError ? (demoState === 'error' ? 'Demo state — forced error for review. This is not a real outage.' : error) : ''}
        onRetry={refetch}
        loadingRows={4}
      >
        {!isLoading && !hasError && (
          <>
            {allAuditEvents.length === 0 ? (
              <EmptyState
                variant="empty"
                title="No role changes yet"
                description="Permission edits and member assignments will appear here."
                compact
              />
            ) : (
              <div className="divide-y divide-stone-light/70">
                {allAuditEvents.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </div>
            )}
            {allAuditEvents.length > 0 && (
              <p className="mt-4 border-t border-stone-light pt-3 text-[11px] uppercase tracking-[0.16em] text-charcoal-light">
                Latest: {formatRelativeTime(allAuditEvents[0].created_at)}
              </p>
            )}
          </>
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
