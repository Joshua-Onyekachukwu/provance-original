# Billing & Entitlements — API Contract

Status: **Ratified baseline (2026-08-10) · Revised 2026-08-18 — VU units**

## Purpose

Define the billing + entitlement contract for Provance's MVP: the plan
catalog, the monthly cycle math, the **VU (Verification Unit) quota gate**
(`402` + `Retry-After`), and the `GET /v1/billing` payload shape. This is
the contract behind the Billing page, the dashboard's VU-usage warning
chip, and the `initiateScan` entitlement gate.

**Units, not counts.** A package no longer buys a flat monthly *scan count*;
it buys a monthly allowance of **VUs — Verification Units**. Each scan
*consumes* VUs at the depth it ran (Quick 1 · Standard 10 · Deep 100), so
depth, API usage, and future top-ups all speak the same meter. The unit
model is ratified in `USAGE_CREDITS_PROPOSAL.md` (recommended defaults:
100,000 VUs at Pro, hard-stop overage, ≤1× rollover, free failed scans).

> **Transition (status):** rollout step 1 (ledger + metering) shipped
> (2026-08-18) and the frontend VU switch landed the same day — the service
> emits the **VU ledger field names** (`unitsUsed` / `unitsLimit`) as the
> only meter, the **legacy `scansUsed` / `scansLimit` fields are dropped**,
> and the warning chip + Billing meters + projection StatCard all read VUs.
> Field mapping below — everything else in the contract (cycle math, 402
> envelope, warning thresholds) is unchanged in behavior, only
> re-denominated.

Reference implementation:

- `backend/src/billing/billing.service.ts` (plan catalog, cycle math, quota gate, payload)
- `backend/src/billing/quota-exceeded.exception.ts` (402 exception)
- `backend/src/common/filters/global-exception.filter.ts` (Retry-After emission)
- `src/lib/mockApi.js` / `src/lib/mockData.js` (mock parity — `mockGetBilling`, `mockInitiateScan`, `mockBillingProfile`)
- `docs/engineering/USAGE_CREDITS_PROPOSAL.md` (unit model, depth costs, rollover, top-ups)

## 1. Plan catalog

Single source of truth in `backend/src/billing/billing.service.ts`. The
`organizations.plan` text column (migration 0005, default `'pro'`) selects the
row; unknown/missing plans fall back to `pro`.

| Plan | Price (USD/mo) | Seats | Monthly VU allowance | ≈ Quick scans | ≈ Standard scans | ≈ Deep scans |
| --- | --- | --- | --- | --- | --- | --- |
| starter | 0 | 1 | 10,000 | 10,000 | 1,000 | 100 |
| pro | 49 | 3 | **100,000** | 100,000 | 10,000 | 1,000 |
| team | 199 | 10 | 300,000 | 300,000 | 30,000 | 3,000 |
| enterprise | 999 | 25 | committed block | — | — | — |

**Depth → VU cost base** (the dial that converts scans into units; applied at
scan completion — failed scans consume 0):

| Depth | Processing mode (API) | VU cost base |
| --- | --- | --- |
| Quick | `quick` | 1 |
| Standard | `standard` | 10 |
| Deep | `deep` | 100 |

**Size → VU multiplier** (the founder rule: a 50 MB scan must NOT cost the
same as a 200 KB scan). The effective per-scan rate is
`ceil(depth base × size-tier multiplier)`, so heavier files (more pixels,
more metadata, more decode work) pay for the extra processing:

| Tier | File size | Multiplier | Standard example |
| --- | --- | --- | --- |
| micro | < 1 MiB | 1.0× | 10 VU |
| small | 1–5 MiB | 1.5× | 15 VU |
| medium | 5–20 MiB | 2.5× | 25 VU |
| large | 20–100 MiB | 4.0× | 40 VU |
| xlarge | ≥ 100 MiB | 6.0× | 60 VU |

Examples: a 200 KB standard scan costs **10 VU**; a 50 MiB standard scan
costs **40 VU** (×4); a 50 MiB deep scan costs **400 VU** (100 × 4). The
size-aware rate is what the ledger `units`/`applied_rate` and the scan row's
`vu_units`/`vu_applied_rate` record, so history stays auditable when either
the depth dial or the size table changes. Missing/zero sizes (tests, legacy
rows) fall back to the 1.0× tier.

Constants: `PLAN_VU_ALLOWANCES` (replaces `PLAN_SCAN_QUOTAS`),
`VU_COST_BY_DEPTH`, `VU_SIZE_MULTIPLIERS`, `PLAN_API_CALL_QUOTAS`,
`PLAN_DISPLAY`, `DEFAULT_PLAN = 'pro'`. Helpers:
`vuAllowanceForPlan(plan)`, `vuCostForDepth(mode, sizeBytes?)`,
`vuSizeMultiplier(sizeBytes)`, `apiCallLimitForPlan(plan)`,
`planDisplay(plan)`.

**Plan resolution** (`resolveUserPlan`) — the user's effective plan comes from
their active org membership (`organization_members` status `'active'` →
`organizations.plan`). Best-effort: missing org tables (fresh DB with only
0002 applied) or no membership → `DEFAULT_PLAN`. Never throws — entitlement
defaults must not block scanning.

## 2. Cycle math

`currentBillingCycle(now = new Date())` — the cycle is the **calendar month in
UTC**:

- `periodStart` — first instant of the month (`YYYY-MM-01T00:00:00.000Z`)
- `periodEnd` — first instant of the next month (exclusive boundary)
- `retryAfterSeconds` — `max(60, ceil((periodEnd - now) / 1000))`, so the
  Retry-After hint never reports less than 60 s

**Rollover (ratified):** unused VUs roll over **up to 1× the monthly
allowance** (bounded — can't accumulate forever). Rollover credits are
consumed *before* the new month's allowance; the ledger records the source
per deduction so the meter stays auditable.

The mock mirrors this as `usage.period: 'current-month'` with the same
`periodStart`/`periodEnd` values (mock dates are seeded `daysAgo` values, but
the shape is identical).

## 3. VU quota gate — 402 + Retry-After

`assertScanQuota(userId)` runs **before scan creation** on `POST /scans`
(`scans.service.ts` initiate path). When the cycle's ledger shows
`unitsUsed >= unitsLimit` (0 VUs remaining, i.e. `unitsLimit − unitsUsed` would
not cover the requested depth's cost) it throws `QuotaExceededException`:

```
HTTP 402 Payment Required
Retry-After: <seconds until next cycle start>
{
  "statusCode": 402,
  "code": "QUOTA_EXCEEDED",
  "message": "Monthly verification-unit allowance reached (100,000/100,000 on the pro plan). New scans resume <periodEnd>.",
  "plan": "pro",
  "unitsUsed": 100000,
  "unitsLimit": 100000,
  "periodEnd": "<ISO>",
  "path": "/v1/scans",
  "requestId": "...",
  "timestamp": "..."
}
```

- The `Retry-After` header (RFC 9110) is emitted by the global exception
  filter from `exception.retryAfterSeconds`.
- **Deduct-on-complete:** VUs are charged when a scan *completes*, at the
  size-aware depth cost (`vuCostForDepth(mode, sizeBytes)`). Failed scans
  consume **0 VUs** — the unit is only charged for a usable result (fair,
  and it removes any incentive to spam broken uploads). The gate **reserves
  against the projected cost** of the incoming file — `assertScanQuota(userId,
  vuCostForDepth(dto.processingMode, dto.fileSizeBytes))` rejects with 402
  when the remaining allowance can't cover that exact file, so a heavy scan
  is refused before any record is created. The worker writes the ledger row
  at completion (`(scan_id, depth, units, cycle, user, source)`).
- **Idempotency precedence** — a retried initiate with the same
  `Idempotency-Key` returns the original reservation **before** the quota gate
  runs, so a retry of an already-accepted scan never double-consumes the
  allowance (see `SCAN_UPLOAD_CONTRACT.md`).
- Mock parity: `mockInitiateScan` throws the same 402 shape with
  `retryAfterSeconds` when the remaining allowance can't cover the incoming
  file's size-aware cost (`MOCK_VU_SIZE_MULTIPLIERS` mirrors the real tier
  table); dev forcing via `?quota=exhausted`.

## 4. GET /v1/billing payload

`GET /billing` (behind `SupabaseAuthGuard`, throttled 30/min) returns the
shape the Billing page renders — `profile` (plan + usage + payment methods) and
`invoices`:

```json
{
  "profile": {
    "plan": {
      "id": "pro_monthly",
      "name": "Pro",
      "billingCycle": "monthly",
      "priceUsd": 49,
      "status": "active",
      "seats": 3,
      "startedAt": "<periodStart ISO>",
      "renewsAt": "<periodEnd ISO>",
      "canChangePlan": true
    },
    "usage": {
      "period": "current-month",
      "periodStart": "<ISO>",
      "periodEnd": "<ISO>",
      "unitsUsed": 89400,
      "unitsLimit": 100000,
      "storageUsedGb": 18.4,
      "storageLimitGb": 50,
      "apiCallsUsed": 4120,
      "apiCallsLimit": 10000,
      "projection": {
        "daysElapsed": 11,
        "daysInCycle": 31,
        "pacePerDay": 8127.27,
        "projectedUnits": 251945,
        "overageUnits": 151945,
        "overageCostUsd": 91.17
      }
    },
    "paymentMethods": []
  },
  "invoices": []
}
```

Field-by-field source of truth:

| Field | Source | Degradation |
| --- | --- | --- |
| `plan.*` | `resolveUserPlan` → `PLAN_DISPLAY`; `startedAt`/`renewsAt` reuse the resolved cycle so plan and usage never straddle a month boundary | plan falls back to `pro` |
| `usage.unitsUsed` | the VU ledger — `SUM(units)` for the user's cycle rows (`scan_depth_ledger`), including rollover credits consumed and top-up packs added (source: `package\|topup\|api`) | 0 |
| `usage.unitsLimit` | `vuAllowanceForPlan(plan)` + carried-over rollover (≤1× monthly) | `pro` allowance |
| `usage.storageUsedGb` / `storageLimitGb` | active org's `organizations.storage_used_gb` / `storage_limit_gb` (migration 0005) via the membership join | `null` (frontend renders `—`) |
| `usage.apiCallsUsed` | `api_usage` row for `(user_id, period_month)` where `period_month = periodStart.slice(0, 7)` (migration **0020**) | `0` when the table/row is missing |
| `usage.apiCallsLimit` | `apiCallLimitForPlan(plan)` from the plan catalog (never the table) | plan's limit |
| `usage.projection` | `projectScanUsage` — `pace = unitsUsed / max(1, daysElapsed)`, `projectedUnits = round(pace × daysInCycle)`, `overageUnits = max(0, projected − limit)`, `overageCostUsd = overage × VU_OVERAGE_PRICE_USD` (default `0.0006`, aligned with the volume-priced VU bands in the proposal) | computed from the same ledger/cycle fields; days-elapsed clamps to 1 |
| `paymentMethods` / `invoices` | empty until a payment processor is wired | `[]` |

`periodStart`/`periodEnd` are resolved **once** per request and shared by
`plan.startedAt`/`renewsAt` and `usage.periodStart`/`periodEnd`, so a request
can never straddle a month boundary mid-payload.

**Consumers:**

- Billing page (`AppBillingPage`) — plan card, VU usage meter, the projected
  end-of-cycle StatCard (in VUs), invoices.
- Dashboard VU warning chip (`ScanQuotaWarningChip`) — reads
  `profile.usage.unitsUsed/unitsLimit`, warns at ≥85% (85–99% warning,
  100%+ danger), links to `/app/billing`. **Behavior unchanged** from the
  scan-count chip — only the unit it counts changed. Pure math in
  `src/lib/scanQuota.js` (`scanQuotaPct`).
- `initiateScan` quota gate (`assertScanQuota`) — same `unitsUsed/unitsLimit`
  source, so the dashboard, meters, and enforcement can never disagree.

The projection math is mirrored in `src/lib/scanQuota.js`
(`projectScanUsage`) so the mock payload and the Billing StatCard use the
same math as the real endpoint; the billing spec locks parity.

## 5. Mock parity rules

- `mockGetBilling` returns `{ profile: { ...mockBillingProfile }, invoices: mockInvoices }`;
  dev forcing `?quota=exhausted` (unitsUsed = unitsLimit) and `?quota=high`
  (unitsUsed = 90% of limit) drive the exhausted banner and dashboard warning
  respectively. Both are inert in production builds.
- `mockInitiateScan` enforces the same quota as the real gate (402 shape with
  `retryAfterSeconds`) using the same `mockBillingProfile.usage` values, and
  the mock worker deducts the size-aware VU cost on completion
  (`MOCK_VU_COST_BY_DEPTH` × `MOCK_VU_SIZE_MULTIPLIERS`) —
  a demo never behaves differently from real mode.
- Any new field added to the real payload **must** be mirrored in
  `mockBillingProfile.usage` (and vice versa) — the billing spec locks the
  contract shape.

## 6. Known gaps / next steps

- **Rollout step 1 shipped** — the VU ledger + deduct-on-complete worker
  (`0022_vu_ledger.sql` + `0023_scan_vu_meter.sql`), `unitsUsed/unitsLimit`
  on `GET /v1/billing` (legacy `scansUsed/scansLimit` dropped), and the
  chip/projection switch to VUs all landed 2026-08-18. Remaining rollout
  steps: rollover ≤1× (step 4) and top-up packs — no payment code needed.
- **API-call counting is not wired yet** — `api_usage` is read-only today;
  no middleware increments `calls` on authenticated requests, and keyed API
  calls will fold into VU metering (replacing `PLAN_API_CALL_QUOTAS` as the
  API meter) once the ledger lands.
- **The overage estimate is informational** — `overageCostUsd` is a pace-based
  projection, not a charge; it becomes billable only once a payment processor
  lands (deferred).
- **Top-ups / rollover enforcement** — top-up packs need Stripe (deferred);
  until then the 402 gate + "Add VUs (coming soon)" CTA. Rollover credits are
  part of the ledger slice but their billing-engine accounting lands with the
  payment work.
- Payment methods and invoices remain `[]` until Stripe (or equivalent) lands
  (deferred per `MASTER_DEVELOPMENT_ROADMAP.md`).
- The archival/enforcement job for storage is Phase 5 backlog (see
  `RETENTION_POLICY.md`).

## Related

- `docs/engineering/USAGE_CREDITS_PROPOSAL.md` — the VU unit model this contract ratifies
- `docs/engineering/SCAN_UPLOAD_CONTRACT.md` — initiate/upload lifecycle + idempotency
- `docs/engineering/RETENTION_POLICY.md` — storage/audit retention windows
- `docs/engineering/API_DESIGN_STANDARDS.md` — error envelope + pagination conventions
- `supabase/migrations/0005_organization.sql`, `0020_api_usage.sql`
