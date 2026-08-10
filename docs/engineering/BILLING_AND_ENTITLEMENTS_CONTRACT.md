# Billing & Entitlements — API Contract

Status: **Ratified baseline** (2026-08-10)

## Purpose

Define the billing + entitlement contract for Provance's MVP: the plan
catalog, the monthly cycle math, the scan-quota gate (`402` + `Retry-After`),
and the `GET /v1/billing` payload shape. This is the contract behind the
Billing page, the dashboard's scan-quota warning chip, and the
`initiateScan` entitlement gate.

Reference implementation:

- `backend/src/billing/billing.service.ts` (plan catalog, cycle math, quota gate, payload)
- `backend/src/billing/quota-exceeded.exception.ts` (402 exception)
- `backend/src/common/filters/global-exception.filter.ts` (Retry-After emission)
- `src/lib/mockApi.js` / `src/lib/mockData.js` (mock parity — `mockGetBilling`, `mockInitiateScan`, `mockBillingProfile`)

## 1. Plan catalog

Single source of truth in `backend/src/billing/billing.service.ts`. The
`organizations.plan` text column (migration 0005, default `'pro'`) selects the
row; unknown/missing plans fall back to `pro`.

| Plan | Price (USD/mo) | Seats | Monthly scan quota | Monthly API-call limit |
| --- | --- | --- | --- | --- |
| starter | 0 | 1 | 100 | 1,000 |
| pro | 49 | 3 | 500 | 10,000 |
| team | 199 | 10 | 2,500 | 50,000 |
| enterprise | 999 | 25 | 10,000 | 250,000 |

Constants: `PLAN_SCAN_QUOTAS`, `PLAN_API_CALL_QUOTAS`, `PLAN_DISPLAY`,
`DEFAULT_PLAN = 'pro'`. Helpers: `scanLimitForPlan(plan)`,
`apiCallLimitForPlan(plan)`, `planDisplay(plan)`.

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

The mock mirrors this as `usage.period: 'current-month'` with the same
`periodStart`/`periodEnd` values (mock dates are seeded `daysAgo` values, but
the shape is identical).

## 3. Scan-quota gate — 402 + Retry-After

`assertScanQuota(userId)` runs **before scan creation** on `POST /scans`
(`scans.service.ts` initiate path). When `scansUsed >= scansLimit` for the
current cycle it throws `QuotaExceededException`:

```
HTTP 402 Payment Required
Retry-After: <seconds until next cycle start>
{
  "statusCode": 402,
  "code": "QUOTA_EXCEEDED",
  "message": "Monthly scan quota reached (500/500 on the pro plan). New scans resume <periodEnd>.",
  "plan": "pro",
  "used": 500,
  "limit": 500,
  "periodEnd": "<ISO>",
  "path": "/v1/scans",
  "requestId": "...",
  "timestamp": "..."
}
```

- The `Retry-After` header (RFC 9110) is emitted by the global exception
  filter from `exception.retryAfterSeconds`.
- **Idempotency precedence** — a retried initiate with the same
  `Idempotency-Key` returns the original reservation **before** the quota gate
  runs, so a retry of an already-accepted scan never double-consumes the
  allowance (see `SCAN_UPLOAD_CONTRACT.md`).
- Mock parity: `mockInitiateScan` throws the same 402 shape with
  `retryAfterSeconds` once `mockBillingProfile.usage.scansUsed` reaches
  `scansLimit`; dev forcing via `?quota=exhausted`.

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
      "scansUsed": 312,
      "scansLimit": 500,
      "storageUsedGb": 18.4,
      "storageLimitGb": 50,
      "apiCallsUsed": 4120,
      "apiCallsLimit": 10000
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
| `usage.scansUsed` | `countCycleScans` — scans table rows for the user since `periodStart` | 0 |
| `usage.scansLimit` | `scanLimitForPlan(plan)` | `pro` quota |
| `usage.storageUsedGb` / `storageLimitGb` | active org's `organizations.storage_used_gb` / `storage_limit_gb` (migration 0005) via the membership join | `null` (frontend renders `—`) |
| `usage.apiCallsUsed` | `api_usage` row for `(user_id, period_month)` where `period_month = periodStart.slice(0, 7)` (migration **0020**) | `0` when the table/row is missing |
| `usage.apiCallsLimit` | `apiCallLimitForPlan(plan)` from the plan catalog (never the table) | plan's limit |
| `paymentMethods` / `invoices` | empty until a payment processor is wired | `[]` |

`periodStart`/`periodEnd` are resolved **once** per request and shared by
`plan.startedAt`/`renewsAt` and `usage.periodStart`/`periodEnd`, so a request
can never straddle a month boundary mid-payload.

**Consumers:**

- Billing page (`AppBillingPage`) — plan card, usage meters, invoices.
- Dashboard quota warning chip (`ScanQuotaWarningChip`) — reads
  `profile.usage.scansUsed/scansLimit`, warns at ≥85% (85–99% warning,
  100%+ danger), links to `/app/billing`. Pure math in `src/lib/scanQuota.js`
  (`scanQuotaPct`).
- `initiateScan` quota gate (`assertScanQuota`) — same `scansUsed/scansLimit`
  source, so the dashboard, meters, and enforcement can never disagree.

## 5. Mock parity rules

- `mockGetBilling` returns `{ profile: { ...mockBillingProfile }, invoices: mockInvoices }`;
  dev forcing `?quota=exhausted` (used = limit) and `?quota=high`
  (used = 90% of limit) drive the exhausted banner and dashboard warning
  respectively. Both are inert in production builds.
- `mockInitiateScan` enforces the same quota as the real gate (402 shape with
  `retryAfterSeconds`) using the same `mockBillingProfile.usage` values, so a
  demo never behaves differently from real mode.
- Any new field added to the real payload **must** be mirrored in
  `mockBillingProfile.usage` (and vice versa) — the billing spec locks the
  contract shape.

## 6. Known gaps / next steps

- **API-call counting is not wired yet** — `api_usage` is read-only today;
  no middleware increments `calls` on authenticated requests. Tracked in
  `docs/project-state/followup-recommendations.md`.
- Payment methods and invoices remain `[]` until Stripe (or equivalent) lands
  (deferred per `MASTER_DEVELOPMENT_ROADMAP.md`).
- The archival/enforcement job for storage is Phase 5 backlog (see
  `RETENTION_POLICY.md`).

## Related

- `docs/engineering/SCAN_UPLOAD_CONTRACT.md` — initiate/upload lifecycle + idempotency
- `docs/engineering/RETENTION_POLICY.md` — storage/audit retention windows
- `docs/engineering/API_DESIGN_STANDARDS.md` — error envelope + pagination conventions
- `supabase/migrations/0005_organization.sql`, `0020_api_usage.sql`
