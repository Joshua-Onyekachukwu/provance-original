# API Design Standards — Provance Backend

**Status:** Ratified (baseline extracted from the live codebase, 2026-08-09)
**Applies to:** every new backend slice (controllers, services, DTOs, and the
frontend `api.js` / `mockApi.js` mirrors that consume them)

This document is the contract future slices build against. It is written from
the **actual conventions already in the codebase** — not aspirational rules —
so "match the mock shape" and "follow the standards" are the same instruction.

---

## 1. Route inventory

Global prefix: **`/v1`** (set in `backend/src/main.ts`). All controllers sit
behind `SupabaseAuthGuard` (or `SupabaseAuthGuard + AdminGuard` for admin),
the global `ValidationPipe` (`whitelist + forbidNonWhitelisted + implicit
conversion`), the `GlobalExceptionFilter`, and `Throttler`.

### Auth (`src/auth`, controller `auth`)
| Method | Route | Notes |
| --- | --- | --- |
| POST | `/v1/auth/sign-in` | email+password → `{ status, user, permissions, session }` |
| GET | `/v1/auth/me` | current viewer; 401 with no session |
| POST | `/v1/auth/refresh` | refresh-token rotation (httpOnly cookie flow) |
| POST | `/v1/auth/sign-out` | burns refresh token |
| POST | `/v1/auth/password-reset/request` | anti-enumeration (always 200-ish resolve) |
| POST | `/v1/auth/password-reset/confirm` | |
| POST | `/v1/auth/invites/accept` | org invite accept |

### Account (`account`)
| Method | Route |
| --- | --- |
| GET / PATCH | `/v1/account/profile` |
| GET | `/v1/account/activity` — paginated audit feed (`?category=&page=&pageSize=`) |

### Organization (`organization`)
| Method | Route |
| --- | --- |
| GET | `/v1/organization` |
| POST | `/v1/organization/invites` |
| PATCH | `/v1/organization/members/:memberId/role` / `team` |
| DELETE | `/v1/organization/members/:memberId` · `/v1/organization/invites/:inviteId` |

### Scans (`scans`)
| Method | Route |
| --- | --- |
| POST | `/v1/scans` (initiate; 503/402 guarded) · POST `/v1/scans/:scanId/submit` |
| GET | `/v1/scans` · `/v1/scans/queue-snapshot` · `/v1/scans/:scanId` |

### Reports (`reports`)
GET `/v1/reports` · GET `/v1/reports/:reportId` · GET `/v1/reports/:reportId/pdf`

### Security (`security`)
GET `/v1/security/settings` · GET `/v1/security/sessions` · DELETE
`/v1/security/sessions/:sessionId` · PATCH `/v1/security/settings` ·
PATCH `/v1/security/password`

### Notifications (`notifications`)
GET `/v1/notifications` · GET `/v1/notifications/unread-count` · PATCH
`/v1/notifications/read-all` · PATCH `/v1/notifications/:id/read`

### Billing (`billing`)
GET `/v1/billing` — profile + usage (plan, quota, metering) in one envelope; the `BillingController` currently has this single route.

### Admin (`admin` + `roles` at `admin/roles`)
GET `dashboard` · `users` · `organizations` · `analytics` · `monitoring` ·
`audit-logs` · `jobs` · `reports` · `settings` · `feature-flags` · `roles`
PATCH `feature-flags/:key` · `roles/:roleId/scopes` · `roles/members/:memberId`
POST `jobs/:id/retry` · `jobs/:id/fail` · `waitlist/:applicationId/invite`
PATCH `waitlist/:applicationId`

### Health / waitlist / telemetry
GET `/v1/health` · GET `/v1/health/readiness` · POST `/v1/waitlist/applications`
· POST `/v1/telemetry/errors`

### Exceptions and not-yet-served contracts
- **`/api/auth`** — Better Auth provider (parallel auth spike). **Not part of
  the `/v1` REST API** and never extended with app routes; it is a
  framework-owned surface (see §5).
- **Frontend contracts with no backend route yet** (mock-backed only, add the
  route when the slice lands): `/api-keys` (list/create/revoke/regenerate),
  `/webhooks*` (CRUD + deliveries), `/billing/invoices` and
  `/billing/payment-methods` (separate list surfaces; the billing envelope
  carries only profile + usage), and the `/help` / `/docs` content lookups.

---

## 2. REST principles Provance follows

1. **Resource nouns, plural collections.** `GET /v1/organization`, `POST
   /v1/scans`, `GET /v1/notifications/:id`. No `createX`/`getXById` verbs in
   paths.
2. **Verbs only as action suffixes for state transitions.** `POST
   /v1/scans/:scanId/submit`, `POST /v1/admin/jobs/:id/retry` / `/fail`, `PATCH
   /v1/notifications/read-all`, `POST /v1/auth/invites/accept`. Action
   endpoints are always POST (or PATCH for bulk-state), never GET.
3. **HTTP method semantics.** GET is safe/idempotent; POST creates or triggers;
   PATCH is a partial update; DELETE removes. No method overloading.
4. **Versioning via URL prefix.** `/v1` today; a breaking change bumps to
   `/v2` (never mutates `/v1` semantics mid-flight). Better Auth's own
   basePath (`/api/auth`) is exempt.
5. **Stateless requests, guard-authenticated.** Every request carries its own
   auth (bearer/refresh via httpOnly cookie); no server session affinity.
   Authorization is `SupabaseAuthGuard` + `AdminGuard` at the controller —
   never re-derived ad hoc in handlers.
6. **Nested resources for ownership.** `/admin/jobs/:id/retry`,
   `/organization/members/:memberId/role`, `/scans/:scanId/submit` — the
   parent-scoped path is the ownership statement.
7. **The mock is the contract mirror.** Every `api.js` real branch has a
   `mockApi.js` counterpart returning the identical shape; a new slice ships
   mock + real together behind `USE_MOCK` / `USE_BETTER_AUTH`.

---

## 3. P0 checklist — required for every new slice

### 3.1 Error format (GlobalExceptionFilter)
Every error response is one JSON object:
```json
{ "statusCode": 400, "message": "...", "path": "/v1/...", "requestId": "...", "timestamp": "2026-08-09T..." }
```
- Never invent a new error envelope. Throw `HttpException`/Nest built-ins (or
  `ServiceUnavailableException` etc.); the filter shapes the rest.
- **402 quota responses** set the `Retry-After` header (RFC 9110) and carry a
  human `message` — see the scans entitlement pattern.
- 4xx messages are actionable; 5xx are generic ("Internal server error.") —
  detail goes to logs, not the client.
- `requestId` is minted in `main.ts` and echoed in `x-request-id`; include it
  in bug reports.

### 3.2 Pagination envelope
Canonical envelope (mock `paginate()` mirrors the backend exactly):
```json
{ "data": [], "page": 1, "pageSize": 20, "total": 213 }
```
- Params: `page` (1-based) and `pageSize`, both clamped (e.g. 1–500);
  unknown `status`/`category` enum values → **400**, never silently ignored.
- Server returns `count: 'exact'` totals that reflect the **filtered** set,
  and `.range()` slices. `totalPages` is computed server-side
  (`Math.max(1, Math.ceil(total / pageSize))`) and included in every list
  envelope — see `AdminService.listJobs`, `ReportsService.listReports`, and
  `ScansService.listScans`.
- Prefer the page's display dialect mapped to DB values at the service
  boundary (e.g. `completed` → `complete`, `queued` → `awaiting_upload` +
  `queued`) — see `AdminService.listJobs`.

### 3.3 camelCase DTOs
- Request bodies are **camelCase** `class-validator` DTOs with
  `class-transformer` `@Transform` for normalization (trim, lowercase email)
  — see `src/auth/dto/sign-in.dto.ts`.
- The global pipe enforces `whitelist: true` + `forbidNonWhitelisted: true`:
  unknown fields are rejected, not ignored.
- Query params use `DefaultValuePipe` / `ParseIntPipe` in the controller
  signature, validated the same way.

### 3.4 Guards, throttle, best-effort writes
- Controller: `@UseGuards(SupabaseAuthGuard)` (+ `AdminGuard` for admin);
  actor identity comes from `@CurrentUser`, never from client-supplied ids.
- `Throttler` stays on; don't hand-roll rate limits.
- **Best-effort secondary writes never block the primary action** — e.g.
  audit-trail inserts log a warning and proceed when the `audit_logs` table is
  absent (`insertAdminAuditEvent`). Same rule for telemetry.

### 3.5 Frontend parity
- `api.js` real branch + `mockApi.js` mock + the page's
  loading/empty/error states ship in the same slice. The mock shape is the
  acceptance test for the real endpoint (parity walks exist for monitoring).

---

## 4. P1 checklist — required before the surface ships to users

- **Idempotency.** State-transition endpoints are guarded to be
  *effectively* idempotent (retry only from `failed`, fail only from
  non-terminal — invalid transitions → 4xx, no side effects). Create
  endpoints accept an `Idempotency-Key` header or document a natural key
  (org invite dedupes on email; waitlist dedupes on email). ✅ **POST
  /scans** implements the header end-to-end (migration `0019`): the key is
  stored per user under a partial unique index scoped to `awaiting_upload`,
  a retried initiate returns the original reservation (fresh signed URL,
  quota not double-charged), a concurrent duplicate insert falls back to the
  winner's row (23505), and the window closes once the scan is submitted.
- **OpenAPI contract.** ✅ Live — the NestJS Swagger module generates the
  spec from route metadata + `@ApiProperty`-decorated DTOs and serves it at
  `/v1/docs` (UI) and `/v1/docs-json` (raw OpenAPI 3.0), so the mock/real
  parity is machine-checkable. New DTOs must carry `@ApiProperty` and new
  endpoints land in the spec automatically.
- **Consistent 404 vs 403.** Missing resource → 404; authenticated but
  unauthorized → 403; unauthenticated → 401. No leaks via differing messages.
- **Nullability.** Nulls are honest (`avg_processing_time_ms: null` when no
  data) and the frontend renders them as `—`; never fake zeroes.
- **Sessions/security hygiene.** Session rows carry ip/user-agent; revoke
  endpoints delete server-side; password changes revoke other sessions.

---

## 5. GraphQL / RPC decisions (and why)

1. **No GraphQL.** Provance has a single first-party client (the React app),
   one backend service-role owner of reads, and no third-party data graph.
   GraphQL's over-fetching/under-fetching and schema-maintenance costs buy
   nothing here. If a public developer API materializes, it should be a
   dedicated REST surface with OpenAPI — not a GraphQL endpoint grafted onto
   `/v1`.
2. **REST with action-suffix RPC for state transitions.** The inventory's
   `submit` / `retry` / `fail` / `accept` / `read-all` endpoints are the
   accepted RPC escape hatch: only for **non-CRUD state transitions**, always
   `POST`/`PATCH`, and always transition-guarded (invalid states → 4xx, no
   side effects). A new action endpoint must justify itself against a plain
   `PATCH` on a status field in review.
3. **PostgREST/RLS is not the API.** The frontend never talks to PostgREST;
   the NestJS service role owns all reads, and RLS (`auth.uid()` policies) is
   defense-in-depth only. Slices do not add client-facing PostgREST routes.
4. **`/api/auth` (Better Auth) is a framework exception.** It is owned by the
   better-auth library at its fixed basePath, outside `/v1`, with its own
   error/cookie semantics. App routes never hang off it; if a slice needs
   auth data, it reads through `/v1` like everything else.

---

## 6. Before you build a slice — one-minute checklist

1. Route named as a plural resource (or a justified action suffix)? Versioned `/v1`?
2. Controller guarded (`SupabaseAuthGuard` + `AdminGuard` where relevant)?
3. DTO camelCase + validated; query params clamped; unknown enums → 400?
4. Errors go through the global filter; 402s set `Retry-After`?
5. Paginated lists use the `{ data, page, pageSize, total }` envelope?
6. Mock (`mockApi.js`) + real (`api.js`) shipped together with identical shapes?
7. State transitions guarded + idempotent; audit writes best-effort?
8. CHANGELOG entry referencing the slice and its contract doc?
