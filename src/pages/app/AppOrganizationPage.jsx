import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  useRegisterCommands,
  useToast,
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatRelativeTime } from '../../components/app/scanPresentation.js'
import {
  cancelInvite,
  getOrganization,
  inviteMember,
  removeMember,
  updateMemberRole,
  updateMemberTeam,
} from '../../lib/api.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_META = {
  owner: { label: 'Owner', tone: 'success' },
  admin: { label: 'Admin', tone: 'info' },
  member: { label: 'Member', tone: 'neutral' },
  viewer: { label: 'Viewer', tone: 'neutral' },
}

const ROLE_OPTIONS = ['admin', 'member', 'viewer']

const TEAM_DOTS = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500']

function Avatar({ name, size = 'md' }) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-charcoal/10 font-serif text-charcoal ${
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
      }`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  )
}

function MemberRow({ member, teams, canManage, isCurrentUser, onRoleChange, onTeamChange, onRemove, busy }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-light bg-parchment px-4 py-4">
      <Avatar name={member.displayName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-charcoal">{member.displayName}</p>
          {isCurrentUser && <Badge tone="info" size="sm">You</Badge>}
          {member.status === 'invited' && <Badge tone="warning" size="sm">Invited</Badge>}
        </div>
        <p className="mt-0.5 truncate text-xs text-charcoal-mid">{member.email}</p>
        <p className="mt-0.5 text-[11px] text-charcoal-light">
          {member.last_active_at ? `Active ${formatRelativeTime(member.last_active_at)}` : 'Never active'}
        </p>
      </div>

      {canManage && member.role !== 'owner' && !isCurrentUser ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={member.team || ''}
            onChange={(event) => onTeamChange(member, event.target.value)}
            disabled={busy === member.id}
            aria-label={`Team access for ${member.displayName}`}
            className="rounded-xl border border-stone-light bg-white-warm px-3 py-2 text-xs font-medium text-charcoal disabled:opacity-50"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={member.role}
            onChange={(event) => onRoleChange(member, event.target.value)}
            disabled={busy === member.id}
            aria-label={`Role for ${member.displayName}`}
            className="rounded-xl border border-stone-light bg-white-warm px-3 py-2 text-xs font-medium text-charcoal disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_META[role].label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy === member.id}
            onClick={() => onRemove(member)}
            className="text-rose-600 hover:bg-rose-50"
          >
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ROLE_META[member.role]?.tone || 'neutral'} size="sm">
            {ROLE_META[member.role]?.label || member.role}
          </Badge>
          {member.team && (
            <Badge tone="neutral" size="sm">
              {teams.find((t) => t.id === member.team)?.name || member.team}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppOrganizationPage() {
  const toast = useToast()
  const { user } = useAuth()
  const demoState = useDemoState()

  const resource = useResource(() => getOrganization().then((r) => r || {}))
  const org = withDemoOverride(resource, demoState, {
    emptyData: { profile: null, members: [], pendingInvites: [], teams: [] },
  })

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteTeam, setInviteTeam] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [localMembers, setLocalMembers] = useState(null)
  const [localInvites, setLocalInvites] = useState(null)

  const status = org.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const profile = org.data?.profile || null
  const members = useMemo(() => localMembers || org.data?.members || [], [localMembers, org.data])
  const pendingInvites = useMemo(
    () => localInvites || org.data?.pendingInvites || [],
    [localInvites, org.data],
  )
  const teams = useMemo(() => org.data?.teams || [], [org.data])

  // Derive identity from the signed-in session (user.id), not a hardcoded
  // roster id — with the member test account this correctly marks Ngozi as
  // "You" and hides owner-only controls.
  const currentMember = members.find((m) => m.id === user?.id)
  const isOwner = currentMember?.role === 'owner'
  // Owners and admins manage the roster (matching the invite-drawer copy
  // "Admin: Manage members and settings"). Members/viewers only see badges.
  const canManage = isOwner || currentMember?.role === 'admin'
  const seatsUsed = members.length
  const seatsTotal = profile?.seats || seatsUsed
  const seatsFull = seatsUsed >= seatsTotal

  function openInvite() {
    if (!inviteTeam && teams.length > 0) setInviteTeam(teams[0].id)
    setInviteOpen(true)
  }

  function closeInvite() {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteRole('member')
    setInviteTeam('')
    setInviteError('')
  }

  async function handleInvite(event) {
    event.preventDefault()
    setInviteError('')
    setIsInviting(true)
    try {
      const result = await inviteMember({
        email: inviteEmail,
        role: inviteRole,
        team: inviteTeam || undefined,
      })
      setLocalInvites((current) => [result.invite, ...(current || org.data?.pendingInvites || [])])
      toast.success(`Invite sent to ${result.invite.email}`)
      closeInvite()
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Invite could not be sent.')
    } finally {
      setIsInviting(false)
    }
  }

  async function handleTeamChange(member, teamId) {
    setBusyId(member.id)
    try {
      await updateMemberTeam(member.id, teamId)
      setLocalMembers((current) =>
        (current || org.data?.members || []).map((m) => (m.id === member.id ? { ...m, team: teamId } : m)),
      )
      const teamName = teams.find((t) => t.id === teamId)?.name || 'the new team'
      toast.success(`${member.displayName} moved to ${teamName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Team could not be updated.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRoleChange(member, role) {
    setBusyId(member.id)
    try {
      await updateMemberRole(member.id, role)
      setLocalMembers((current) =>
        (current || org.data?.members || []).map((m) => (m.id === member.id ? { ...m, role } : m)),
      )
      toast.success(`${member.displayName} is now ${ROLE_META[role]?.label.toLowerCase()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Role could not be updated.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(member) {
    setBusyId(member.id)
    try {
      await removeMember(member.id)
      setLocalMembers((current) =>
        (current || org.data?.members || []).filter((m) => m.id !== member.id),
      )
      toast.success(`${member.displayName} removed from the workspace`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Member could not be removed.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancelInvite(invite) {
    try {
      await cancelInvite(invite.id)
      setLocalInvites((current) =>
        (current || org.data?.pendingInvites || []).filter((i) => i.id !== invite.id),
      )
      toast.success(`Invite to ${invite.email} cancelled`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invite could not be cancelled.')
    }
  }

  useRegisterCommands(
    [
      {
        id: 'org.invite-member',
        group: 'Organization',
        label: 'Invite a team member',
        hint: seatsUsed >= seatsTotal ? 'All seats are in use' : `${seatsTotal - seatsUsed} seat${seatsTotal - seatsUsed === 1 ? '' : 's'} left`,
        keywords: ['organization', 'invite', 'member', 'team'],
        onSelect: openInvite,
      },
      {
        id: 'org.view-members',
        group: 'Organization',
        label: 'View member roster',
        hint: `${members.length} member${members.length === 1 ? '' : 's'}`,
        keywords: ['organization', 'members', 'roster'],
        onSelect: () => {
          document.getElementById('org-members')?.scrollIntoView({ behavior: 'smooth' })
        },
      },
      {
        id: 'org.view-teams',
        group: 'Organization',
        label: 'View teams & access',
        hint: `${teams.length} team${teams.length === 1 ? '' : 's'}`,
        keywords: ['organization', 'teams', 'access', 'scoping'],
        onSelect: () => {
          document.getElementById('org-teams')?.scrollIntoView({ behavior: 'smooth' })
        },
      },
    ],
    [members.length, seatsUsed, seatsTotal, teams.length],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Organization
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Workspace team and access
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Manage who can use this workspace, what roles they hold, and who has been
          invited but has not joined yet.
        </p>
      </section>

      {/* ── 1. Workspace profile ────────────────────────────────────────── */}
      <Card
        eyebrow="Workspace"
        title={profile?.name || 'Workspace'}
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={org.error}
        onRetry={org.reload}
        loadingRows={2}
      >
        {!loading && !failed && profile && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Plan</p>
              <p className="mt-2 font-serif text-2xl text-charcoal">{profile.plan}</p>
            </div>
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Seats</p>
              <p className="mt-2 font-serif text-2xl text-charcoal">
                {seatsUsed}
                <span className="text-sm text-charcoal-mid">/{seatsTotal}</span>
              </p>
              <p className="mt-1 text-xs text-charcoal-light">
                {seatsUsed >= seatsTotal ? 'All seats in use' : `${seatsTotal - seatsUsed} available`}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Scans</p>
              <p className="mt-2 font-serif text-2xl text-charcoal">{profile.scanCount}</p>
            </div>
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Storage</p>
              <p className="mt-2 font-serif text-2xl text-charcoal">{profile.storageUsedGb} GB</p>
              <p className="mt-1 text-xs text-charcoal-light">of {profile.storageLimitGb} GB</p>
            </div>
          </div>
        )}
      </Card>

      {/* ── 2. Member roster ────────────────────────────────────────────── */}
      <Card
        id="org-members"
        eyebrow="Members"
        title="Roster"
        description="Roles control what each person can see and do. Owners manage the workspace."
        actions={
          canManage ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={seatsFull}
              onClick={openInvite}
            >
              {seatsFull ? 'All seats in use' : 'Invite member'}
            </Button>
          ) : null
        }
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={org.error}
        onRetry={org.reload}
        loadingRows={3}
      >
        {!loading && !failed && members.length === 0 && (
          <EmptyState
            variant="empty"
            title="No members yet"
            description="Invite your first teammate to start collaborating."
            compact
          />
        )}
        {!loading && !failed && members.length > 0 && (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                teams={teams}
                canManage={canManage}
                isCurrentUser={member.id === user?.id}
                busy={busyId === member.id}
                onRoleChange={handleRoleChange}
                onTeamChange={handleTeamChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ── 3. Teams & access ───────────────────────────────────────────── */}
      <Card
        id="org-teams"
        eyebrow="Teams & access"
        title="Workspace teams"
        description="Every member is assigned to one team, scoping which scans, reports, and settings they can reach."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={org.error}
        onRetry={org.reload}
        loadingRows={2}
      >
        {!loading && !failed && teams.length === 0 && (
          <EmptyState
            variant="empty"
            title="No teams yet"
            description="Teams help scope access across the workspace."
            compact
          />
        )}
        {!loading && !failed && teams.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, index) => {
              const teamMembers = members.filter((m) => m.team === team.id)
              return (
                <div
                  key={team.id}
                  className="rounded-2xl border border-stone-light bg-parchment p-5 transition hover:border-charcoal/25"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${TEAM_DOTS[index % TEAM_DOTS.length]}`}
                      aria-hidden="true"
                    />
                    <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-charcoal">
                      {team.name}
                    </h4>
                    <Badge tone="neutral" size="sm">
                      {teamMembers.length}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-charcoal-mid">{team.description}</p>
                  <div className="mt-4 flex items-center">
                    <div className="flex -space-x-2">
                      {teamMembers.slice(0, 4).map((member) => (
                        <Avatar key={member.id} name={member.displayName} size="sm" />
                      ))}
                    </div>
                    {teamMembers.length > 4 && (
                      <span className="ml-2 text-[11px] text-charcoal-light">
                        +{teamMembers.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── 4. Pending invites ──────────────────────────────────────────── */}
      <Card
        eyebrow="Pending invites"
        title="Awaiting acceptance"
        description="Invites expire after 7 days. You can cancel an invite before the recipient joins."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={org.error}
        onRetry={org.reload}
        loadingRows={2}
      >
        {!loading && !failed && pendingInvites.length === 0 && (
          <EmptyState
            variant="empty"
            title="No pending invites"
            description="Invitations you send will appear here until they are accepted."
            compact
          />
        )}
        {!loading && !failed && pendingInvites.length > 0 && (
          <div className="divide-y divide-stone-light rounded-2xl border border-stone-light">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center gap-4 bg-white-warm px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-charcoal-mid">
                    {ROLE_META[invite.role]?.label || invite.role} · invited {formatRelativeTime(invite.invitedAt)}
                  </p>
                  {invite.team && (
                    <p className="mt-0.5 text-[11px] text-charcoal-light">
                      {teams.find((t) => t.id === invite.team)?.name || invite.team}
                    </p>
                  )}
                </div>
                <Badge tone="warning" size="sm">Pending</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite)}>
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Invite drawer ───────────────────────────────────────────────── */}
      <Drawer
        open={inviteOpen}
        onClose={closeInvite}
        title="Invite a team member"
        description="They will receive an email with a link to join this workspace."
      >
        <form onSubmit={handleInvite} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-charcoal">Email address</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value)
                setInviteError('')
              }}
              placeholder="teammate@company.com"
              autoFocus
              required
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-charcoal">Team</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {teams.map((team) => {
                const selected = inviteTeam === team.id
                return (
                  <label
                    key={team.id}
                    className={`cursor-pointer rounded-2xl border px-4 py-3.5 transition ${
                      selected ? 'border-charcoal bg-parchment' : 'border-stone-light bg-parchment hover:border-charcoal/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="invite-team"
                      value={team.id}
                      checked={selected}
                      onChange={() => setInviteTeam(team.id)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-medium text-charcoal">{team.name}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-charcoal-mid">{team.description}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-charcoal">Role</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {ROLE_OPTIONS.map((role) => {
                const selected = inviteRole === role
                return (
                  <label
                    key={role}
                    className={`cursor-pointer rounded-2xl border px-4 py-3.5 transition ${
                      selected ? 'border-charcoal bg-parchment' : 'border-stone-light bg-parchment hover:border-charcoal/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="invite-role"
                      value={role}
                      checked={selected}
                      onChange={() => setInviteRole(role)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-medium text-charcoal">{ROLE_META[role].label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-charcoal-mid">
                      {role === 'admin' && 'Manage members and settings.'}
                      {role === 'member' && 'Submit scans and view reports.'}
                      {role === 'viewer' && 'View reports only.'}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {inviteError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {inviteError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={closeInvite}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isInviting}>
              {isInviting ? 'Sending invite...' : 'Send invite'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
