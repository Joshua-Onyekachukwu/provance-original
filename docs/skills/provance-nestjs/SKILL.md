---
name: provance-nestjs
description: "Provance's NestJS backend conventions: module layout, controller/guard/throttle wiring, the GlobalExceptionFilter error envelope, pagination, camelCase validated DTOs with @ApiProperty, Supabase service-role data access, best-effort audit writes, and the unit/controller/e2e test patterns. Use when building or extending any backend slice in backend/src (auth, account, organization, scans, reports, security, notifications, billing, admin, roles, waitlist, telemetry, health, queue). Triggers: NestJS, module, controller, service, DTO, guard, throttle, GlobalExceptionFilter, error envelope, pagination, e2e, supertest, Swagger, @ApiProperty, SupabaseAuthGuard, AdminGuard."
---

# Provance NestJS Backend

The ratified contract is `docs/engineering/API_DESIGN_STANDARDS.md` — read it
alongside this skill when building a slice. This skill encodes the mechanical
conventions (wiring, shapes, tests) so new backend work matches the existing
modules without re-reading five controllers first.

## When to use

- Adding or extending any backend module/controller/service/DTO in
  `backend/src/`.
- Wiring guards, throttling, query pipes, error handling, or Swagger.
- Writing controller specs (HTTP layer), service specs, or `test/*.e2e-spec.ts`
  suites.
- Matching the frontend mock contract (`src/lib/api.js` + `mockApi.js`) — the
  mock shape is the acceptance test for every real endpoint.

## Global wiring (`backend/src/main.ts` + `app.module.ts`)

- **Prefix:** `app.setGlobalPrefix('v1')` — every route is `/v1/...`.
- **ValidationPipe (global):** `whitelist: true, transform: true,
  forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion:
  true }`. Unknown body fields are **rejected**, not ignored.
- **GlobalExceptionFilter** (see Error envelope below).
- **Throttler** is a **global `APP_GUARD`** (`ApiThrottlerGuard`, registered in
  `app.module.ts`); per-route `@Throttle` overrides it. Never hand-roll rate
  limits.
- **Security:** helmet (CORP off), CORS with a `FRONTEND_ORIGIN` allow-list +
  `credentials: true`, `trust proxy` when `TRUST_PROXY`, and an
  `x-request-id` middleware (minted per request, echoed in the response and
  the error envelope).
- **Swagger:** mounted at `/v1/docs` (UI) + `/v1/docs-json`, generated from
  route metadata + `@ApiProperty`-decorated DTOs; bearer auth preset. New
  endpoints land in the spec automatically — decorate every DTO field.
- **Env validation:** `backend/src/config/env.validation.ts` (`validateEnv`)
  requires `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
  together, etc. A new env var belongs in the validator, `.env.example`, and
  `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`.

## Module conventions

One folder per surface under `backend/src/`, registered in `app.module.ts`:

```
src/<surface>/
  <surface>.module.ts     # @Module({ controllers, providers, exports })
  <surface>.controller.ts # routes; guard + @Throttle at class level
  <surface>.service.ts    # business logic; Supabase via SupabaseService
  dto/                    # camelCase class-validator DTOs (@ApiProperty each field)
  *.spec.ts               # unit (service) + controller (HTTP) specs
```

- Modules are lazy-registered; `@Global()` is reserved for cross-cutting
  providers (see `QueueModule`) — a surface module is **not** global by
  default.
- Data access goes through `SupabaseService` (`getAdminClient()` for the
  service-role client that bypasses RLS; `createPublicClient(token)` for
  per-request user-scoped work). Do not construct supabase-js clients ad hoc.
- The queue is reached via `QueueService.isConfigured()` / `enqueueScanProcessing`
  — see the `provance-bullmq-redis-queue` skill.

## Controller conventions

```ts
@Controller('notifications')            // plural resource under /v1
@UseGuards(SupabaseAuthGuard)           // every surface route; + AdminGuard for admin
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page', new ParseIntStrictPipe(), new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new ParseIntStrictPipe(), new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) { return this.notificationsService.list(user, { page, pageSize }); }
}
```

Rules:

- **Actor identity comes from `@CurrentUser()` only** — never from
  client-supplied ids/emails in the body. `SupabaseAuthGuard` decodes the
  bearer token and sets `request.user = { id, email, sid }` (`sid` from the
  JWT payload for session-scoped work).
- **`SupabaseAuthGuard + AdminGuard`** for `/admin/*` — `AdminGuard` checks the
  caller's email against `ADMIN_EMAILS` (comma list) and throws 403. Never
  re-derive admin status in a handler.
- **Query params:** `@Query('x', new ParseIntStrictPipe(), new DefaultValuePipe(n), ParseIntPipe)`.
  `ParseIntStrictPipe` runs **first** so `?page=abc` → 400 instead of being
  silently swallowed by `DefaultValuePipe` (the global pipe's implicit
  conversion turns garbage into NaN before the default can replace it).
- **Action endpoints** (`submit`, `retry`, `fail`, `accept`, `read-all`) are
  `POST`/`PATCH` only, never `GET`, and are transition-guarded in the service
  (invalid states → 4xx, no side effects).
- Return the service's promise directly; let the global filter shape errors.

## Error envelope (`GlobalExceptionFilter`)

Every error response is exactly one JSON object:

```json
{ "statusCode": 400, "message": "...", "details": ["..."], "path": "/v1/...", "requestId": "...", "timestamp": "2026-08-09T..." }
```

- **`message` is ALWAYS a string** — class-validator arrays are flattened to
  a joined string, with the original items in the separate `details` array.
  Never return a bare array/object as the message.
- Throw Nest built-ins (`HttpException`, `UnauthorizedException`,
  `ServiceUnavailableException`, …). **Never invent a new envelope.**
- **5xx are generic** ("Internal server error.") — detail goes to logs.
- **402 quota responses** set the `Retry-After` header (RFC 9110) via a
  `retryAfterSeconds` property on the exception (see the scans entitlement
  pattern).
- 404 vs 403 vs 401: missing resource → 404; authed-but-unauthorized → 403;
  unauthenticated → 401. No leaky messages.

## Pagination envelope

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 213 }
```

- `page` is 1-based; both params clamped (e.g. 1–500) — see
  `AdminService.listJobs`, `ReportsService.listReports`, `ScansService.listScans`.
- `total` reflects the **filtered** set (`count: 'exact'`); `totalPages`
  (`Math.max(1, Math.ceil(total / pageSize))`) is computed server-side and
  included.
- Unknown enum values for `status`/`category` → **400**, never silently ignored.
- Map the display dialect to DB values **at the service boundary** (e.g.
  `completed` → `complete`, `queued` → `awaiting_upload` + `queued`).

## DTO conventions

- camelCase `class-validator` DTOs with `class-transformer` `@Transform` for
  normalization (trim, lowercase email) — see `src/auth/dto/sign-in.dto.ts`.
- **Every field decorated with `@ApiProperty`** (description, example, enum
  where applicable, `required: false` for optionals) so Swagger stays live.
- `@IsIn([...])` for enums, `@IsOptional()` for optional fields, `@Min(1)`
  etc. for bounds.
- The global pipe's `whitelist + forbidNonWhitelisted` rejects unknown fields —
  a DTO change that breaks the frontend fails loudly, not silently.

## Service conventions

- **Best-effort secondary writes never block the primary action.** Audit-trail
  inserts log a warning and proceed when `audit_logs` is absent
  (`insertAdminAuditEvent`) — same rule for telemetry.
- **State transitions are guarded + effectively idempotent.** Retry only from
  `failed`, fail only from non-terminal; invalid transitions → 4xx with no
  side effects. Create endpoints accept an `Idempotency-Key` header or
  document a natural key (org invite / waitlist dedupe on email; `POST
  /scans` implements the header end-to-end, migration `0019`).
- **Nulls are honest** (`avg_processing_time_ms: null` when no data) — never
  fake zeroes; the frontend renders `null` as `—`.

## Test conventions

Three layers, all jest (`backend/package.json`, ts-jest):

1. **Service spec** (`<surface>.service.spec.ts`) — plan-based mocks of the
   Supabase admin client (stateful in-memory rows where sequencing matters);
   assert business rules (email scoping, category filters, pagination
   clamping, owner protection, idempotency). See `notifications.service.spec.ts`,
   `organization.service.spec.ts`, `auth.service.spec.ts`.
2. **Controller spec** (`<surface>.controller.spec.ts`) — the HTTP layer with
   the **real guards**: `TestingModule` with the real `SupabaseAuthGuard` and a
   mocked `SupabaseService` (any non-empty bearer token passes except a
   sentinel that 401s), supertest, plus route-metadata assertions
   (`METHOD_METADATA` / `PATH_METADATA` / `ROUTE_ARGS_METADATA`,
   `APP_GUARD` presence) that lock guard + throttle + query parsing. See
   `notifications.controller.spec.ts` — it is the reference pattern.
3. **e2e** (`backend/test/*.e2e-spec.ts`, run via `npm run test:e2e` /
   `jest --config ./test/jest-e2e.json`) — boots the real `AppModule`, mocks
   `SupabaseService` + `QueueService`/Redis where the module needs them, and
   walks full flows with supertest (`scans-flow.e2e-spec.ts` is the queue
   reference; `organization.e2e-spec.ts`, `security.e2e-spec.ts`,
   `auth.e2e-spec.ts` cover their surfaces). The stateful in-memory Supabase
   mock pattern is shared across specs — reuse it instead of hand-rolling a
   new one.

Run: `cd backend && npm run test` (unit+controller), `npm run test:e2e`
(suites), `npm run build` before any live walk.

## Hard rules

1. **Never skip the guards** — `SupabaseAuthGuard` on every surface,
   `+ AdminGuard` on admin. No handler re-derives authz.
2. **Never invent an error envelope or return a non-string `message`.**
3. **Never trust a client-supplied id/email for identity** — use
   `@CurrentUser()`.
4. **Never hand-roll rate limiting** — use `@Throttle` / the global guard.
5. **Never ship a real endpoint without its mock twin** (`api.js` +
   `mockApi.js` with identical shapes) and loading/empty/error states.
6. **Never block the primary action on a secondary write** (audit/telemetry).
7. **A new DTO field without `@ApiProperty` breaks the Swagger contract** —
   decorate everything.
8. **Update the contract doc + CHANGELOG in the same slice** as the route
   (see `API_DESIGN_STANDARDS.md` §6 one-minute checklist).
