import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Skeleton, StatCard, useRegisterCommands, useToast } from '../../components/ui'
import {
  formatCount,
  formatCurrency,
  formatDate,
  formatPct,
  formatStorageGb,
  formatScanTimestamp,
  percentOf,
} from '../../components/app/scanPresentation.js'
import { getBilling, listScans } from '../../lib/api.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_STATUS_META = {
  active: { label: 'Active', tone: 'success' },
  trialing: { label: 'Trial', tone: 'info' },
  past_due: { label: 'Past due', tone: 'warning' },
  canceled: { label: 'Canceled', tone: 'neutral' },
}

const INVOICE_STATUS_META = {
  paid: { label: 'Paid', tone: 'success' },
  open: { label: 'Open', tone: 'warning' },
  void: { label: 'Void', tone: 'neutral' },
}

function usageTone(pct) {
  if (pct >= 90) return 'bg-rose-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-sky-500'
}

function UsageMeter({ label, used, limit, format = formatCurrency, extra }) {
  const pct = percentOf(used, limit)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-charcoal">{label}</p>
        <p className="text-xs tabular-nums text-charcoal-mid">
          <span className="font-semibold text-charcoal">{format(used)}</span> of {format(limit)}
        </p>
      </div>
      {extra && (
        <p className="mt-1 text-[11px] text-charcoal-light">{extra}</p>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`${label} usage`}
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-stone-light"
      >
        <div
          className={`h-full rounded-full ${usageTone(pct)} transition-[width] duration-500`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-charcoal-light">
        {pct >= 90 ? 'Near the limit — overage applies beyond this.' : `${pct}% used this cycle`}
      </p>
    </div>
  )
}

function CardBrand({ brand }) {
  return (
    <svg
      className="h-8 w-12 rounded-md border border-stone-light bg-parchment"
      viewBox="0 0 48 32"
      aria-hidden="true"
    >
      <rect width="48" height="32" rx="4" fill="currentColor" className="text-charcoal/90" />
      {brand === 'visa' ? (
        <text x="24" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="monospace">
          VISA
        </text>
      ) : (
        <text x="24" y="21" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="monospace">
          MC
        </text>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppBillingPage() {
  const toast = useToast()
  const demoState = useDemoState()

  const resource = useResource(() => getBilling().then((r) => r || {}))
  const billing = withDemoOverride(resource, demoState, {
    emptyData: { profile: null, invoices: [] },
  })

  const { profile, invoices } = billing.data || {}
  const plan = profile?.plan || null
  const usage = profile?.usage || null
  const paymentMethods = profile?.paymentMethods || []
  const invoiceList = useMemo(() => invoices || [], [invoices])

  const status = billing.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const usageStats = useMemo(() => {
    if (!usage) return null
    return [
      {
        label: 'Verification units used',
        value: formatCount(usage.unitsUsed),
        detail: `${formatPct(usage.unitsUsed / usage.unitsLimit, 0)} of ${formatCount(usage.unitsLimit)} monthly VUs`,
        tone: percentOf(usage.unitsUsed, usage.unitsLimit) >= 90 ? 'warning' : 'default',
      },
      {
        label: 'Storage',
        value: formatStorageGb(usage.storageUsedGb),
        detail: `of ${formatStorageGb(usage.storageLimitGb)} included`,
        tone: percentOf(usage.storageUsedGb, usage.storageLimitGb) >= 90 ? 'warning' : 'default',
      },
      {
        label: 'API calls',
        value: formatCount(usage.apiCallsUsed),
        detail: `${formatPct(usage.apiCallsUsed / usage.apiCallsLimit, 0)} of ${formatCount(usage.apiCallsLimit)} monthly`,
        tone: percentOf(usage.apiCallsUsed, usage.apiCallsLimit) >= 90 ? 'warning' : 'default',
      },
      // End-of-cycle VU projection at the current pace — the new StatCard this
      // slice adds. Overage is only surfaced when the pace actually exceeds
      // the plan's allowance; otherwise the card reports the projected total.
      {
        label: 'Projected end of cycle',
        value: usage.projection
          ? formatCount(usage.projection.projectedUnits)
          : '—',
        detail: usage.projection
          ? usage.projection.overageUnits > 0
            ? `${formatCount(usage.projection.overageUnits)} VUs over · ${formatCurrency(usage.projection.overageCostUsd)} est. overage`
            : `${formatCount(usage.projection.pacePerDay)} VUs/day at current pace`
          : 'Usage projection unavailable',
        tone: usage.projection && usage.projection.overageUnits > 0 ? 'warning' : 'default',
      },
    ]
  }, [usage])

  function changePlan() {
    toast.info('Plan changes are coming soon', {
      description: 'This is a UI preview — billing is not wired to payments yet.',
    })
  }

  function addPaymentMethod() {
    toast.info('Payment methods are coming soon', {
      description: 'This is a UI preview — card management is not wired to a processor yet.',
    })
  }

  function downloadInvoice(invoice) {
    toast.success(`Invoice ${invoice.number} downloaded`, {
      description: `${formatCurrency(invoice.amountUsd)} — this is a preview action.`,
    })
  }

  useRegisterCommands(
    [
      {
        id: 'billing.change-plan',
        group: 'Billing',
        label: 'Change billing plan',
        hint: plan ? `Current: ${plan.name} ${formatCurrency(plan.priceUsd)}/mo` : 'No plan yet',
        keywords: ['billing', 'plan', 'upgrade', 'downgrade'],
        onSelect: changePlan,
      },
      {
        id: 'billing.download-latest-invoice',
        group: 'Billing',
        label: 'Download latest invoice',
        hint: invoiceList[0] ? invoiceList[0].number : 'No invoices yet',
        keywords: ['billing', 'invoice', 'download', 'receipt'],
        onSelect: () => {
          if (invoiceList[0]) downloadInvoice(invoiceList[0])
          else toast.info('No invoices to download yet')
        },
      },
      {
        id: 'billing.add-payment-method',
        group: 'Billing',
        label: 'Add a payment method',
        hint: `${paymentMethods.length} card${paymentMethods.length === 1 ? '' : 's'} on file`,
        keywords: ['billing', 'payment', 'card', 'method'],
        onSelect: addPaymentMethod,
      },
    ],
    [plan, invoiceList, paymentMethods.length],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Billing
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Plan, usage, and invoices
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Your current plan, metered usage for this cycle, payment methods, and a
          record of invoices. Billing is a UI preview — nothing is charged yet.
        </p>
      </section>

      {/* ── 1. Plan overview ─────────────────────────────────────────────── */}
      <Card
        eyebrow="Current plan"
        title={plan ? `${plan.name} plan` : 'No active plan'}
        description={
          plan
            ? `Billed ${plan.billingCycle === 'annual' ? 'yearly' : 'monthly'} at ${formatCurrency(plan.priceUsd)} — renews ${formatDate(plan.renewsAt)}.`
            : 'Choose a plan to begin scanning at scale.'
        }
        actions={
          plan ? (
            <Button variant="secondary" size="sm" onClick={changePlan}>
              Change plan
            </Button>
          ) : null
        }
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={billing.error}
        onRetry={billing.reload}
        loadingRows={2}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Plan</p>
            <p className="mt-2 font-serif text-2xl text-charcoal">{plan?.name || '—'}</p>
            <div className="mt-2">
              <Badge tone={PLAN_STATUS_META[plan?.status]?.tone || 'neutral'} size="sm">
                {PLAN_STATUS_META[plan?.status]?.label || 'Unknown'}
              </Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Price</p>
            <p className="mt-2 font-serif text-2xl text-charcoal">
              {formatCurrency(plan?.priceUsd)}
              {plan?.billingCycle ? <span className="text-sm text-charcoal-mid">/mo</span> : null}
            </p>
            <p className="mt-2 text-xs text-charcoal-light">Renews {formatDate(plan?.renewsAt)}</p>
          </div>
          <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">Seats</p>
            <p className="mt-2 font-serif text-2xl text-charcoal">{plan?.seats ?? '—'}</p>
            <p className="mt-2 text-xs text-charcoal-light">Member {plan?.seats === 1 ? 'seat' : 'seats'} included</p>
          </div>
        </div>
      </Card>

      {/* ── 2. Usage metering ────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Usage this cycle
            </p>
            <h3 className="mt-1.5 font-serif text-2xl text-charcoal">Metered limits</h3>
          </div>
          {usage && (
            <p className="text-xs text-charcoal-light">
              Cycle resets {formatDate(usage.periodEnd)}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" role="status" aria-label="Loading usage">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-9 w-28" />
                <Skeleton className="mt-4 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        )}

        {failed && (
          <Card state="error" errorDescription={billing.error} onRetry={billing.reload} />
        )}

        {!loading && !failed && usageStats && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {usageStats.map((stat) => (
              <StatCard key={stat.label} {...stat} loading={loading} error={failed} />
            ))}
          </div>
        )}

        {/* Quota exhausted — surfaced from the same entitlement the upload gate enforces. */}
        {!loading && !failed && usage && usage.unitsUsed >= usage.unitsLimit && (
          <div
            role="alert"
            className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Verification-unit allowance reached for this cycle
              </p>
              <p className="mt-1 text-sm text-amber-800">
                All {formatCount(usage.unitsLimit)} monthly verification units are used. New
                uploads are paused until the cycle resets {formatDate(usage.periodEnd)} —
                upgrade your plan to raise the allowance immediately.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={changePlan}>
              Upgrade plan
            </Button>
          </div>
        )}

        {!loading && !failed && usage && (
          <Card className="mt-6" padding="lg">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <UsageMeter
                label="Verification units"
                used={usage.unitsUsed}
                limit={usage.unitsLimit}
                format={formatCount}
                extra={
                  usage.carriedOver > 0
                    ? `${formatCount(usage.allowance)} allowance + ${formatCount(usage.carriedOver)} carried over`
                    : undefined
                }
              />
              <UsageMeter
                label="Storage"
                used={usage.storageUsedGb}
                limit={usage.storageLimitGb}
                format={formatStorageGb}
              />
              <UsageMeter label="API calls" used={usage.apiCallsUsed} limit={usage.apiCallsLimit} format={formatCount} />
            </div>
          </Card>
        )}
      </div>

      {/* ── 2.5. Per-scan VU spend breakdown ─────────────────────────────── */}
      {!loading && !failed && usage?.scanCosts && usage.scanCosts.length > 0 && (
        <Card
          eyebrow="VU spend breakdown"
          title="Recent scan costs"
          description="How each verification in this cycle consumed verification units — depth base × size-tier multiplier."
        >
          <div className="overflow-x-auto rounded-2xl border border-stone-light">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-light bg-parchment">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">File</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">Depth</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">Size tier</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">VU cost</th>
                  <th className="hidden px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-light bg-white-warm">
                {usage.scanCosts.map((scan) => (
                  <tr key={scan.scanId} className="transition-colors hover:bg-parchment/70">
                    <td className="px-4 py-3.5">
                      <Link to={`/app/reports/${scan.scanId}`} className="font-medium text-charcoal hover:text-charcoal-soft">
                        {scan.filename}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={scan.depth === 'deep' ? 'warning' : scan.depth === 'quick' ? 'info' : 'neutral'} size="sm">
                        {scan.depth}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-charcoal-mid">{scan.sizeTier}</td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-charcoal">{scan.vuCost}</td>
                    <td className="hidden px-4 py-3.5 text-right text-xs text-charcoal-mid sm:table-cell">{formatScanTimestamp(scan.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── 2.6. Rollover history ───────────────────────────────────────── */}
      {!loading && !failed && usage?.rolloverHistory && usage.rolloverHistory.length > 0 && (
        <Card
          eyebrow="Rollover history"
          title="Carried-over verification units"
          description="Unused VUs from prior cycles folded into this cycle's allowance (≤1× monthly cap)."
        >
          <div className="overflow-x-auto rounded-2xl border border-stone-light">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-light bg-parchment">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">Cycle</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">Allowance</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">Used</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">Carried</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-light bg-white-warm">
                {usage.rolloverHistory.map((row) => (
                  <tr key={row.cycleMonth} className="transition-colors hover:bg-parchment/70">
                    <td className="px-4 py-3.5 font-medium text-charcoal">{row.cycleMonth}</td>
                    <td className="px-4 py-3.5 tabular-nums text-charcoal-mid">{formatCount(row.allowance)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-charcoal-mid">{formatCount(row.priorUsed)}</td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-emerald-600">+{formatCount(row.carried)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── 3. Payment methods ───────────────────────────────────────────── */}
      <Card
        eyebrow="Payment methods"
        title="Cards on file"
        description="Default card is charged on each renewal. Adding and removing cards is a preview action."
        actions={
          <Button variant="secondary" size="sm" onClick={addPaymentMethod}>
            Add card
          </Button>
        }
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={billing.error}
        onRetry={billing.reload}
        loadingRows={2}
      >
        {!loading && !failed && paymentMethods.length === 0 && (
          <EmptyState
            variant="empty"
            title="No payment methods yet"
            description="Add a card to enable automatic renewals when billing goes live."
            compact
          />
        )}
        {!loading && !failed && paymentMethods.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center gap-4 rounded-2xl border border-stone-light bg-parchment px-4 py-4"
              >
                <CardBrand brand={method.brand} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {method.brand === 'visa' ? 'Visa' : 'Mastercard'} ending {method.last4}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-mid">
                    Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                  </p>
                </div>
                {method.isDefault && <Badge tone="info" size="sm">Default</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 4. Invoice history ───────────────────────────────────────────── */}
      <Card
        eyebrow="Invoice history"
        title="Recent invoices"
        description="Charges against the current plan. Download is a preview action."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={billing.error}
        onRetry={billing.reload}
        loadingRows={4}
      >
        {!loading && !failed && invoiceList.length === 0 && (
          <EmptyState
            variant="empty"
            title="No invoices yet"
            description="Invoices will appear here once billing goes live."
            compact
          />
        )}
        {!loading && !failed && invoiceList.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-stone-light">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-light bg-parchment">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Invoice
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light sm:table-cell">
                    Period
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-light bg-white-warm">
                {invoiceList.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-parchment/70">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-charcoal">{invoice.number}</p>
                      <p className="mt-0.5 text-xs text-charcoal-light">
                        Issued {formatDate(invoice.issuedAt)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs text-charcoal-mid sm:table-cell">
                      {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={INVOICE_STATUS_META[invoice.status]?.tone || 'neutral'} size="sm">
                        {INVOICE_STATUS_META[invoice.status]?.label || invoice.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-charcoal">
                      {formatCurrency(invoice.amountUsd)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadInvoice(invoice)}
                        aria-label={`Download invoice ${invoice.number}`}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
