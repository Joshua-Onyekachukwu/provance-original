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
import { formatCount, formatDate, formatRelativeTime } from '../../components/app/scanPresentation.js'
import {
  createWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  getWebhooks,
  rotateWebhookSecret,
  testWebhook,
  updateWebhookStatus,
} from '../../lib/api.js'
import { copyText } from '../../lib/clipboard.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'
import {
  failureRate,
  getDeliveryStatusMeta,
  getWebhookEventMeta,
  getWebhookStatusMeta,
} from '../../lib/webhookPresentation.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CopyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppWebhooksPage() {
  const toast = useToast()
  const demoState = useDemoState()

  const resource = useResource(() => getWebhooks().then((r) => r || {}))
  const api = withDemoOverride(resource, demoState, {
    emptyData: { endpoints: [], events: [], limits: null },
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createUrl, setCreateUrl] = useState('')
  const [createEvents, setCreateEvents] = useState(['scan.completed'])
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [revealedSecret, setRevealedSecret] = useState(null)
  const [rotatingId, setRotatingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [busyStatusId, setBusyStatusId] = useState(null)
  const [busyTestId, setBusyTestId] = useState(null)
  const [localEndpoints, setLocalEndpoints] = useState(null)
  const [deliveriesTarget, setDeliveriesTarget] = useState(null)
  const [deliveriesState, setDeliveriesState] = useState({ status: 'idle', data: [], error: '' })

  const status = api.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const events = useMemo(() => api.data?.events || [], [api.data])
  const limits = api.data?.limits || null
  const endpoints = useMemo(() => localEndpoints || api.data?.endpoints || [], [localEndpoints, api.data])

  const activeCount = useMemo(() => endpoints.filter((e) => e.status === 'active').length, [endpoints])
  const deliveriesTotal = useMemo(
    () => endpoints.reduce((sum, e) => sum + (e.deliveryCount || 0), 0),
    [endpoints],
  )
  const overallFailureRate = useMemo(() => {
    const failed = endpoints.reduce((sum, e) => sum + (e.failureCount || 0), 0)
    return failureRate(deliveriesTotal, failed)
  }, [endpoints, deliveriesTotal])

  const stats = useMemo(
    () => [
      { label: 'Endpoints', value: String(endpoints.length) },
      { label: 'Deliveries (30d)', value: formatCount(deliveriesTotal) },
      { label: 'Failure rate', value: overallFailureRate === null ? '—' : `${overallFailureRate}%` },
      { label: 'Active', value: String(activeCount) },
    ],
    [endpoints.length, deliveriesTotal, overallFailureRate, activeCount],
  )

  function closeCreate() {
    setCreateOpen(false)
    setCreateName('')
    setCreateUrl('')
    setCreateEvents(['scan.completed'])
    setCreateError('')
  }

  function toggleEvent(value) {
    setCreateEvents((current) =>
      current.includes(value) ? current.filter((e) => e !== value) : [...current, value],
    )
  }

  async function handleCreate(event) {
    event.preventDefault()
    setCreateError('')
    if (!createName.trim()) {
      setCreateError('An endpoint name is required.')
      return
    }
    if (!createUrl.trim()) {
      setCreateError('A destination URL is required.')
      return
    }
    if (!/^https?:\/\//.test(createUrl.trim())) {
      setCreateError('The destination URL must start with http:// or https://.')
      return
    }
    if (createEvents.length === 0) {
      setCreateError('Select at least one event.')
      return
    }
    setIsCreating(true)
    try {
      const result = await createWebhook({ name: createName, url: createUrl, events: createEvents })
      setLocalEndpoints((current) => [result.endpoint, ...(current || api.data?.endpoints || [])])
      setCreateOpen(false)
      setCreateName('')
      setCreateUrl('')
      setCreateEvents(['scan.completed'])
      setRevealedSecret({ name: result.endpoint.name, secret: result.secret, source: 'created' })
      toast.success('Webhook endpoint created — copy the signing secret now, it is shown only once')
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Endpoint could not be created.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleToggleStatus(endpoint) {
    const next = endpoint.status === 'active' ? 'paused' : 'active'
    setBusyStatusId(endpoint.id)
    try {
      await updateWebhookStatus(endpoint.id, next)
      setLocalEndpoints((current) =>
        (current || api.data?.endpoints || []).map((e) =>
          e.id === endpoint.id ? { ...e, status: next } : e,
        ),
      )
      toast.success(next === 'active' ? `${endpoint.name} resumed` : `${endpoint.name} paused`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status could not be updated.')
    } finally {
      setBusyStatusId(null)
    }
  }

  async function handleRotateSecret(endpoint) {
    setRotatingId(endpoint.id)
    try {
      const result = await rotateWebhookSecret(endpoint.id)
      setRevealedSecret({ name: endpoint.name, secret: result.secret, source: 'rotated' })
      toast.success('Signing secret rotated — copy it now, the old one stops working')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Secret could not be rotated.')
    } finally {
      setRotatingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteWebhook(deleteTarget.id)
      setLocalEndpoints((current) =>
        (current || api.data?.endpoints || []).filter((e) => e.id !== deleteTarget.id),
      )
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Endpoint could not be deleted.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleTestPing(endpoint) {
    setBusyTestId(endpoint.id)
    try {
      const result = await testWebhook(endpoint.id)
      const delivery = result.delivery
      setLocalEndpoints((current) =>
        (current || api.data?.endpoints || []).map((e) =>
          e.id === endpoint.id
            ? { ...e, lastDeliveryAt: delivery.attemptedAt, deliveryCount: (e.deliveryCount || 0) + 1 }
            : e,
        ),
      )
      toast.success(`Test ping delivered — ${delivery.status} in ${delivery.latencyMs} ms`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test ping failed.')
    } finally {
      setBusyTestId(null)
    }
  }

  async function openDeliveries(endpoint) {
    setDeliveriesTarget(endpoint)
    setDeliveriesState({ status: 'loading', data: [], error: '' })
    try {
      const result = await getWebhookDeliveries(endpoint.id)
      setDeliveriesState({ status: 'ready', data: result.deliveries || [], error: '' })
    } catch (error) {
      setDeliveriesState({
        status: 'error',
        data: [],
        error: error instanceof Error ? error.message : 'Deliveries could not be loaded.',
      })
    }
  }

  useRegisterCommands(
    [
      {
        id: 'webhooks.create',
        group: 'Webhooks',
        label: 'Create a webhook endpoint',
        hint: limits ? `${endpoints.length}/${limits.endpointsPerWorkspace} used` : 'New endpoint',
        keywords: ['webhook', 'create', 'endpoint', 'hook'],
        onSelect: () => setCreateOpen(true),
      },
      {
        id: 'webhooks.test-first',
        group: 'Webhooks',
        label: 'Test the first active endpoint',
        hint: `${activeCount} active endpoint${activeCount === 1 ? '' : 's'}`,
        keywords: ['webhook', 'test', 'ping', 'delivery'],
        onSelect: () => {
          const first = endpoints.find((e) => e.status === 'active')
          if (first) handleTestPing(first)
          else toast.info('No active endpoints to ping')
        },
      },
      {
        id: 'webhooks.toggle-first',
        group: 'Webhooks',
        label: 'Pause or resume an endpoint',
        hint: `${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'} total`,
        keywords: ['webhook', 'pause', 'resume', 'toggle'],
        onSelect: () => {
          const first = endpoints[0]
          if (first) handleToggleStatus(first)
          else toast.info('No endpoints to toggle')
        },
      },
    ],
    [endpoints, activeCount, limits, api.data],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Webhooks
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Realtime event delivery
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Push verification events to your own systems as they happen. Each
          endpoint gets a signing secret so you can verify payloads came from
          Provance.
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

      {/* ── 2. Reveal-once secret banner ─────────────────────────────────── */}
      {revealedSecret && (
        <Card
          eyebrow={revealedSecret.source === 'rotated' ? 'Secret rotated' : 'Endpoint created'}
          title={`${revealedSecret.name} — copy the signing secret now`}
          description={
            revealedSecret.source === 'rotated'
              ? 'The previous secret stops accepting requests immediately. Store this one in your secrets manager before closing.'
              : 'This secret is shown once. Provance signs every payload with it — store it in your secrets manager before closing.'
          }
          actions={
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<CopyIcon />}
              onClick={async () => {
                const ok = await copyText(revealedSecret.secret)
                if (ok) toast.success('Signing secret copied to clipboard')
                else toast.error('Could not copy the secret')
              }}
            >
              Copy
            </Button>
          }
        >
          <code
            data-secret-code
            className="block overflow-x-auto rounded-2xl border border-stone-light bg-charcoal px-4 py-3 font-mono text-sm break-all text-emerald-300"
          >
            {revealedSecret.secret}
          </code>
          <p className="mt-3 text-xs text-charcoal-mid">
            Sent as the <code className="rounded bg-stone-light/60 px-1.5 py-0.5 font-mono">X-Provance-Signature</code>{' '}
            header — an {limits?.signingAlgo || 'HMAC-SHA256'} digest of the raw body.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRevealedSecret(null)}>
              Done
            </Button>
          </div>
        </Card>
      )}

      {/* ── 3. Endpoint list ────────────────────────────────────────────── */}
      <Card
        eyebrow="Endpoints"
        title="Webhook endpoints"
        description="Paused endpoints stop receiving deliveries but keep their configuration."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            Create endpoint
          </Button>
        }
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={api.error}
        onRetry={api.reload}
        loadingRows={3}
      >
        {!loading && !failed && endpoints.length === 0 && (
          <EmptyState
            variant="empty"
            title="No webhook endpoints yet"
            description="Create your first endpoint to start receiving verification events."
            action={
              <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
                Create your first endpoint
              </Button>
            }
            compact
          />
        )}
        {!loading && !failed && endpoints.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-stone-light">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-light bg-parchment">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Endpoint
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light lg:table-cell">
                    Events
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light md:table-cell">
                    Deliveries
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
                {endpoints.map((endpoint) => {
                  const statusMeta = getWebhookStatusMeta(endpoint.status)
                  const rate = failureRate(endpoint.deliveryCount, endpoint.failureCount)
                  return (
                    <tr key={endpoint.id} className="transition-colors hover:bg-parchment/70">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-charcoal">{endpoint.name}</p>
                        <p className="mt-0.5 max-w-[280px] truncate font-mono text-xs text-charcoal-light">
                          {endpoint.url}
                        </p>
                        <p className="mt-1 text-[11px] text-charcoal-light">
                          {endpoint.lastDeliveryAt
                            ? `last delivery ${formatRelativeTime(endpoint.lastDeliveryAt)}`
                            : 'no deliveries yet'}
                          {' · created '}
                          {formatDate(endpoint.createdAt, 'Never')}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {endpoint.events.map((event) => (
                            <Badge key={event} tone="info" size="sm">
                              {getWebhookEventMeta(event).label}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 md:table-cell">
                        <p className="text-xs tabular-nums text-charcoal-mid">
                          {formatCount(endpoint.deliveryCount)} delivered
                        </p>
                        <p className={`mt-0.5 text-[11px] ${rate !== null && rate > 0 ? 'text-rose-600' : 'text-charcoal-light'}`}>
                          {rate === null ? 'no volume yet' : `${rate}% failed`}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={statusMeta.tone} size="sm">
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" onClick={() => openDeliveries(endpoint)}>
                            Deliveries
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconLeft={<ZapIcon />}
                            disabled={busyTestId === endpoint.id || endpoint.status === 'paused'}
                            onClick={() => handleTestPing(endpoint)}
                          >
                            {busyTestId === endpoint.id ? 'Pinging...' : 'Test'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyStatusId === endpoint.id}
                            onClick={() => handleToggleStatus(endpoint)}
                          >
                            {busyStatusId === endpoint.id
                              ? 'Updating...'
                              : endpoint.status === 'active'
                                ? 'Pause'
                                : 'Resume'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={rotatingId === endpoint.id}
                            onClick={() => handleRotateSecret(endpoint)}
                          >
                            {rotatingId === endpoint.id ? 'Rotating...' : 'Rotate secret'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeleteTarget(endpoint)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 4. Events & limits reference ────────────────────────────────── */}
      <Card
        eyebrow="Reference"
        title="Events and limits"
        description="Subscribe to the events that matter for your workflow."
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
                  Endpoints per workspace
                </p>
                <p className="mt-2 font-serif text-2xl text-charcoal">{limits.endpointsPerWorkspace}</p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Delivery retention
                </p>
                <p className="mt-2 font-serif text-2xl text-charcoal">{limits.deliveryRetentionDays} days</p>
              </div>
              <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Signature algorithm
                </p>
                <p className="mt-2 font-serif text-2xl text-charcoal">{limits.signingAlgo}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Events</p>
              <div className="mt-3 space-y-3">
                {events.map((event) => (
                  <div key={event.value} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        <code className="rounded bg-stone-light/60 px-1.5 py-0.5 font-mono text-xs">{event.value}</code>
                        {' '}{event.label}
                      </p>
                      <p className="mt-1 text-xs text-charcoal-mid">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Create endpoint drawer ──────────────────────────────────────── */}
      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="Create a webhook endpoint"
        description="Name the endpoint, set the destination URL, and choose which events to deliver. The signing secret is shown once after creation."
      >
        <form onSubmit={handleCreate} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-charcoal">Endpoint name</span>
            <input
              type="text"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="e.g. Verification completion notifier"
              autoFocus
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-charcoal">Destination URL</span>
            <input
              type="url"
              value={createUrl}
              onChange={(event) => setCreateUrl(event.target.value)}
              placeholder="https://hooks.example.com/provance"
              className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 font-mono text-sm text-charcoal"
            />
            <span className="mt-1.5 block text-xs text-charcoal-light">
              We POST a JSON payload with an X-Provance-Signature header.
            </span>
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-charcoal">Events</legend>
            <div className="mt-3 space-y-3">
              {events.map((event) => {
                const checked = createEvents.includes(event.value)
                return (
                  <label
                    key={event.value}
                    className="flex items-start gap-3 rounded-2xl border border-stone-light bg-parchment px-4 py-3.5 transition hover:border-charcoal/30"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEvent(event.value)}
                      className="mt-1 h-4 w-4 rounded border-stone-light"
                    />
                    <span>
                      <span className="block text-sm font-medium text-charcoal">
                        <code className="mr-1.5 rounded bg-stone-light/60 px-1.5 py-0.5 font-mono text-xs">{event.value}</code>
                        {event.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-charcoal-mid">
                        {event.description}
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
              {isCreating ? 'Creating endpoint...' : 'Create endpoint'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* ── Deliveries drawer ───────────────────────────────────────────── */}
      <Drawer
        open={Boolean(deliveriesTarget)}
        onClose={() => setDeliveriesTarget(null)}
        title={`Delivery log — ${deliveriesTarget?.name || ''}`}
        description="Recent delivery attempts for this endpoint, newest first. Failures are retried with backoff."
        size="lg"
      >
        <div className="mt-6">
          {deliveriesState.status === 'loading' && (
            <p className="py-8 text-center text-sm text-charcoal-mid">Loading deliveries…</p>
          )}
          {deliveriesState.status === 'error' && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {deliveriesState.error}
            </div>
          )}
          {deliveriesState.status === 'ready' && deliveriesState.data.length === 0 && (
            <EmptyState
              variant="empty"
              title="No deliveries yet"
              description="This endpoint has not received any deliveries. Use Test to fire a ping."
              compact
            />
          )}
          {deliveriesState.status === 'ready' && deliveriesState.data.length > 0 && (
            <div className="space-y-3">
              {deliveriesState.data.map((delivery) => {
                const statusMeta = getDeliveryStatusMeta(delivery.status)
                return (
                  <div key={delivery.id} className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="info" size="sm">
                          {getWebhookEventMeta(delivery.event).label}
                        </Badge>
                        <Badge tone={statusMeta.tone} size="sm">
                          HTTP {statusMeta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-charcoal-light">
                        {formatRelativeTime(delivery.attemptedAt)} · {delivery.latencyMs} ms
                      </p>
                    </div>
                    <p className="mt-2 text-[11px] text-charcoal-light">
                      Attempted {formatDate(delivery.attemptedAt, 'Never')}
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-xl bg-charcoal px-4 py-3 font-mono text-xs text-emerald-300">
                      {delivery.response || '(no response body)'}
                    </pre>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Drawer>

      {/* ── Delete confirmation drawer ──────────────────────────────────── */}
      <Drawer
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this webhook endpoint?"
        description="It will stop receiving deliveries immediately and its delivery log will be removed. You cannot undo this."
      >
        {deleteTarget && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
              <p className="text-sm font-medium text-charcoal">{deleteTarget.name}</p>
              <p className="mt-1 max-w-full truncate font-mono text-xs text-charcoal-light">
                {deleteTarget.url}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Keep endpoint
              </Button>
              <Button variant="danger" size="sm" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? 'Deleting...' : 'Delete endpoint'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
