import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  useRegisterCommands,
  useToast,
} from '../../components/ui'
import { formatCount, formatDate, formatRelativeTime } from '../../components/app/scanPresentation.js'
import {
  createApiKey,
  getApiKeys,
  regenerateApiKey,
  revokeApiKey,
} from '../../lib/api.js'
import { copyText } from '../../lib/clipboard.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEY_STATUS_META = {
  active: { label: 'Active', tone: 'success' },
  expired: { label: 'Expired', tone: 'warning' },
  revoked: { label: 'Revoked', tone: 'neutral' },
}

function CopyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppApiKeysPage() {
  const toast = useToast()
  const demoState = useDemoState()

  const resource = useResource(() => getApiKeys().then((r) => r || {}))
  const api = withDemoOverride(resource, demoState, {
    emptyData: { keys: [], scopes: [], limits: null },
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createScopes, setCreateScopes] = useState(['scan:create'])
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [revealedToken, setRevealedToken] = useState(null)
  // Armed two-step confirm (same pattern as session revoke / member remove):
  // first click arms the row, second click executes; revokeBusyId tracks the
  // in-flight key so the row shows loading state and blocks double submits.
  const [confirmingRevokeId, setConfirmingRevokeId] = useState(null)
  const [revokeBusyId, setRevokeBusyId] = useState(null)
  const [localKeys, setLocalKeys] = useState(null)

  const status = api.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const scopes = useMemo(() => api.data?.scopes || [], [api.data])
  const limits = api.data?.limits || null
  const keys = useMemo(() => localKeys || api.data?.keys || [], [localKeys, api.data])

  const activeCount = useMemo(() => keys.filter((k) => k.status === 'active').length, [keys])
  const requestsTotal = useMemo(
    () => keys.reduce((sum, k) => sum + (k.requestsLast30d || 0), 0),
    [keys],
  )
  const scopeCount = useMemo(() => scopes.length, [scopes])

  // Click-away / Escape reset for the armed revoke confirm: a half-armed row
  // must not linger once attention moves elsewhere. Listeners exist only
  // while a row is armed — any pointer-down outside the armed row (or an
  // Escape keypress) disarms it. Clicks inside the row, including the
  // "Confirm revoke?" / Cancel buttons, resolve through their own handlers.
  // Same contract as the security page's session-revoke reset.
  useEffect(() => {
    if (!confirmingRevokeId) return undefined
    const handlePointerDown = (event) => {
      if (!event.target.closest?.('[data-armed-revoke-row]')) {
        setConfirmingRevokeId(null)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setConfirmingRevokeId(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmingRevokeId])

  function closeCreate() {
    setCreateOpen(false)
    setCreateName('')
    setCreateScopes(['scan:create'])
    setCreateError('')
  }

  async function handleCreate(event) {
    event.preventDefault()
    setCreateError('')
    if (!createName.trim()) {
      setCreateError('A key name is required.')
      return
    }
    if (createScopes.length === 0) {
      setCreateError('Select at least one scope.')
      return
    }
    setIsCreating(true)
    try {
      const result = await createApiKey({ name: createName, scopes: createScopes })
      setLocalKeys((current) => [result.key, ...(current || api.data?.keys || [])])
      setCreateOpen(false)
      setCreateName('')
      setCreateScopes(['scan:create'])
      setRevealedToken({ name: result.key.name, token: result.token })
      toast.success('API key created — copy it now, it is shown only once')
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Key could not be created.')
    } finally {
      setIsCreating(false)
    }
  }

  function handleRevokeClick(key) {
    if (confirmingRevokeId !== key.id) {
      setConfirmingRevokeId(key.id)
      return
    }
    setConfirmingRevokeId(null)
    void handleRevoke(key)
  }

  async function handleRevoke(key) {
    setRevokeBusyId(key.id)
    try {
      await revokeApiKey(key.id)
      setLocalKeys((current) =>
        (current || api.data?.keys || []).map((k) =>
          k.id === key.id ? { ...k, status: 'revoked' } : k,
        ),
      )
      toast.success(`${key.name} revoked`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Key could not be revoked.')
    } finally {
      setRevokeBusyId(null)
      setConfirmingRevokeId(null)
    }
  }

  async function handleRegenerate(key) {
    try {
      const result = await regenerateApiKey(key.id)
      setRevealedToken({ name: key.name, token: result.token })
      toast.success('New token generated — copy it now, it is shown only once')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Key could not be regenerated.')
    }
  }

  function toggleScope(value) {
    setCreateScopes((current) =>
      current.includes(value) ? current.filter((s) => s !== value) : [...current, value],
    )
  }

  const stats = useMemo(
    () => [
      { label: 'Active keys', value: String(activeCount) },
      { label: 'Requests (30d)', value: formatCount(requestsTotal) },
      { label: 'Available scopes', value: String(scopeCount) },
      { label: 'Key limit', value: limits ? `${activeCount}/${limits.keysPerWorkspace}` : '—' },
    ],
    [activeCount, requestsTotal, scopeCount, limits],
  )

  useRegisterCommands(
    [
      {
        id: 'api-keys.create',
        group: 'API Keys',
        label: 'Create an API key',
        hint: limits ? `${activeCount}/${limits.keysPerWorkspace} used` : 'New key',
        keywords: ['api', 'key', 'create', 'token'],
        onSelect: () => setCreateOpen(true),
      },
      {
        id: 'api-keys.regenerate',
        group: 'API Keys',
        label: 'Regenerate a key',
        hint: `${keys.length} key${keys.length === 1 ? '' : 's'} total`,
        keywords: ['api', 'key', 'regenerate', 'rotate'],
        onSelect: () => {
          const first = keys.find((k) => k.status === 'active')
          if (first) handleRegenerate(first)
          else toast.info('No active keys to regenerate')
        },
      },
    ],
    [activeCount, keys, limits, api.data],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          API Keys
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Programmatic access to Provance
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Create scoped tokens for submitting media and reading reports from your
          own systems. Keys are shown once at creation, so keep them secure.
        </p>
      </section>

      {/* ── 1. Summary stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-stone-light bg-white-warm p-5 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              {stat.label}
            </p>
            <p className="mt-2 font-serif text-3xl text-charcoal tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── 2. Reveal-once banner ────────────────────────────────────────── */}
      {revealedToken && (
        <Card
          eyebrow="Token created"
          title={`${revealedToken.name} — copy it now`}
          description="This token is shown once. Store it in your secrets manager before closing."
          actions={
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<CopyIcon />}
              onClick={async () => {
                if (!revealedToken.token) return
                // Shared clipboard helper: Clipboard API with a hidden-textarea
                // fallback for non-secure contexts (better than asking the user
                // to select the token manually).
                const ok = await copyText(revealedToken.token)
                if (ok) toast.success('Token copied to clipboard')
                else toast.error('Could not copy the token')
              }}
            >
              Copy
            </Button>
          }
        >
          <code
            data-token-code
            className="block overflow-x-auto rounded-2xl border border-stone-light bg-charcoal px-4 py-3 font-mono text-sm break-all text-emerald-300"
          >
            {revealedToken.token}
          </code>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRevealedToken(null)}>
              Done
            </Button>
          </div>
        </Card>
      )}

      {/* ── 3. Key list ──────────────────────────────────────────────────── */}
      <Card
        eyebrow="Workspace keys"
        title="API keys"
        description="Active keys count against the workspace limit. Revoking stops all requests instantly."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            Create key
          </Button>
        }
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={api.error}
        onRetry={api.reload}
        loadingRows={3}
      >
        {!loading && !failed && keys.length === 0 && (
          <EmptyState
            variant="empty"
            title="No API keys yet"
            description="Create your first key to start submitting media programmatically."
            action={
              <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
                Create your first key
              </Button>
            }
            compact
          />
        )}
        {!loading && !failed && keys.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-stone-light">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-light bg-parchment">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Key
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light sm:table-cell">
                    Scopes
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light md:table-cell">
                    Usage
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-light bg-white-warm">
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="transition-colors hover:bg-parchment/70"
                    data-armed-revoke-row={confirmingRevokeId === key.id ? 'true' : undefined}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-charcoal">{key.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-charcoal-light">
                        {key.prefix}••••••••••• · created {formatDate(key.createdAt, 'Never')}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} tone="info" size="sm">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <p className="text-xs tabular-nums text-charcoal-mid">
                        {formatCount(key.requestsLast30d)} req
                      </p>
                      <p className="mt-0.5 text-[11px] text-charcoal-light">
                        {key.lastUsedAt ? `used ${formatRelativeTime(key.lastUsedAt)}` : 'never used'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={KEY_STATUS_META[key.status]?.tone || 'neutral'} size="sm">
                        {KEY_STATUS_META[key.status]?.label || key.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {key.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRegenerate(key)}>
                            Regenerate
                          </Button>
                        )}
                        {(key.status === 'active' || key.status === 'expired') && (
                          <>
                            {confirmingRevokeId === key.id && revokeBusyId === null && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmingRevokeId(null)}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              variant={confirmingRevokeId === key.id ? 'danger' : 'ghost'}
                              size="sm"
                              loading={revokeBusyId === key.id}
                              disabled={revokeBusyId === key.id}
                              className={
                                confirmingRevokeId === key.id
                                  ? ''
                                  : 'text-rose-600 hover:bg-rose-50'
                              }
                              onClick={() => handleRevokeClick(key)}
                            >
                              {revokeBusyId === key.id
                                ? 'Revoking…'
                                : confirmingRevokeId === key.id
                                  ? 'Confirm revoke?'
                                  : 'Revoke'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 4. Limits & scopes reference ────────────────────────────────── */}
      <Card
        eyebrow="Limits"
        title="Key limits and scopes"
        description="Rate limits apply per key. Raise them on Enterprise plans."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={api.error}
        onRetry={api.reload}
        loadingRows={2}
      >
        {!loading && !failed && limits && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Keys per workspace
                </p>
                <p className="mt-2 font-serif text-2xl text-charcoal">{limits.keysPerWorkspace}</p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Default rate limit
                </p>
                <p className="mt-2 font-serif text-2xl text-charcoal">
                  {limits.defaultRateLimitRpm}
                  <span className="text-sm text-charcoal-mid"> req/min</span>
                </p>
                <p className="mt-2 text-xs text-charcoal-light">
                  Up to {limits.maxRateLimitRpm} req/min on request
                </p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Token lifetime
                </p>
                <p className="mt-2 font-serif text-2xl text-charcoal">{limits.tokenLifetimeDays} days</p>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Scopes</p>
              <div className="mt-3 space-y-3">
                {scopes.map((scope) => (
                  <div key={scope.value} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        <code className="rounded bg-stone-light/60 px-1.5 py-0.5 font-mono text-xs">{scope.value}</code>
                        {' '}{scope.label}
                      </p>
                      <p className="mt-1 text-xs text-charcoal-mid">{scope.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Create key drawer ────────────────────────────────────────────── */}
      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="Create an API key"
        description="Name the key and choose its scopes. The full token is shown once after creation."
      >
        <form onSubmit={handleCreate} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-charcoal">Key name</span>
            <input
              type="text"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="e.g. Production scanner"
              autoFocus
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-charcoal">Scopes</legend>
            <div className="mt-3 space-y-3">
              {scopes.map((scope) => {
                const checked = createScopes.includes(scope.value)
                return (
                  <label
                    key={scope.value}
                    className="flex items-start gap-3 rounded-2xl border border-stone-light bg-parchment px-4 py-3.5 transition hover:border-charcoal/30"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-1 h-4 w-4 rounded border-stone-light"
                    />
                    <span>
                      <span className="block text-sm font-medium text-charcoal">
                        <code className="mr-1.5 rounded bg-stone-light/60 px-1.5 py-0.5 font-mono text-xs">{scope.value}</code>
                        {scope.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-charcoal-mid">
                        {scope.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {createError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={closeCreate}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isCreating}>
              {isCreating ? 'Creating key...' : 'Create key'}
            </Button>
          </div>
        </form>
      </Drawer>


    </div>
  )
}
