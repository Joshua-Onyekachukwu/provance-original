# Telemetry (Crash Reports) — API Contract

`POST /v1/telemetry/errors` — the client crash-report ingestion endpoint
(backing `src/lib/telemetry.js` `flushErrors()`, wired from the global
ErrorBoundary). Crash records are buffered in `localStorage` and shipped in
batches, so the endpoint is designed for **idempotent, fire-and-forget**
uploads.

## Endpoint

| | |
|---|---|
| **Route** | `POST /v1/telemetry/errors` |
| **Auth** | Public (no guard) — crashes must be reportable from unauthenticated pages too. The frontend attaches the bearer token when a session exists; the endpoint never requires one. |
| **Throttle** | 60 req/min per IP |
| **Status codes** | `202 Accepted` on success (accepted batch, nothing returned to render), `503` when Supabase is unavailable or the write fails, `400` on validation errors |
| **Body** | `{ errors: CrashReport[] }` — max 50 records per batch |

## Request shape

Each record mirrors the client's buffered `buildCrashRecord` shape
(`src/lib/telemetry.js`) **exactly** — the wire contract is the literal
buffered record:

```json
{
  "errors": [
    {
      "client_id": "cr-abc123",
      "type": "render_error",
      "message": "Cannot read properties of undefined",
      "stack": "TypeError: ...",
      "component_stack": "at AppDashboardPage ...",
      "route": "/app/dashboard",
      "user_agent": "Mozilla/5.0 ...",
      "user_id": "user_123",
      "email": "dev@provance.ai",
      "meta": { "session": "…" },
      "timestamp": "2026-08-08T21:00:00.000Z"
    }
  ]
}
```

| Field | Required | Max length | Notes |
|---|---|---|---|
| `client_id` | yes | 80 | Client-generated `cr-…` id; **primary key** — retried flushes upsert in place |
| `type` | no | 40 | `render_error` (boundary crashes, default) / `unhandled_error` (window `error` + `unhandledrejection` listeners) |
| `message` | no | 2000 | Error message text |
| `stack` | no | 6000 | Error stack trace |
| `component_stack` | no | 6000 | React component stack |
| `route` | no | 300 | Route where the crash occurred |
| `user_agent` | no | 500 | Browser UA |
| `user_id` | no | 80 | Auth user id if a session exists |
| `email` | no | 320 | Auth email if available |
| `meta` | no | — | Free-form JSON context |
| `timestamp` | no | — | ISO string (stored as `reported_at`) |

## Backend pipeline

`TelemetryController.recordErrors` → `TelemetryService.recordErrors`:

1. Upserts the batch into `crash_reports` with `onConflict: 'client_id'`
   (migration `0014_crash_reports.sql`) — idempotent by construction.
2. **Failure semantics:** any insert error (missing table included) throws
   `503` so the client **keeps its buffer and retries later** rather than
   silently dropping crash reports.
3. Empty batch short-circuits to `{ accepted: 0 }`.

Table name is configurable via `SUPABASE_CRASH_REPORTS_TABLE` (default
`crash_reports`), the same override pattern as the account/security slices.

## Frontend wiring

Two capture paths feed the same buffer:

- `src/components/ErrorBoundary.jsx` — `componentDidCatch` → `captureError`
  with `componentStack` (type `render_error`). Covers render/lifecycle crashes
  in the guarded subtree.
- `src/lib/telemetry.js` `initGlobalErrorListeners()` — called once from
  `src/main.jsx`; attaches window `error` + `unhandledrejection` listeners so
  non-React runtime errors are captured too (type `unhandled_error`):
  - uncaught exceptions carry `event.error` (stack preserved)
  - resource-load failures (img/script/link) have no error object — the record
    carries `meta.kind: 'resource'`, `resource_tag`, and `resource_url` from
    the failing element
  - cross-origin scripts arrive as `Script error.` with `meta.filename`/
    `line`/`column` when available — captured as-is rather than lost
  - unhandled rejections capture `event.reason` (Error, string, or fallback
    text), `meta.source: 'unhandledrejection'`
  - purely observational (never `preventDefault`), idempotent per window
    (WeakSet — StrictMode/HMR safe), never throws

- `src/lib/telemetry.js` — `flushErrors()` posts the buffered records to
  `submitCrashReports`; clears the buffer only on success (network failure or
  `503` keeps them for the next flush). Empty buffer skips the network call.
- `src/lib/api.js` — `submitCrashReports(records)` is USE_MOCK-gated:
  real path POSTs to `/v1/telemetry/errors`; mock path resolves immediately
  (the mock never rejects).

## Migration

`supabase/migrations/0014_crash_reports.sql` — `crash_reports` table
(`client_id` PK, `reported_at desc` index for a future admin crash surface).

## Test map

| Suite | Covers |
|---|---|
| `backend/src/telemetry/telemetry.service.spec.ts` | Upsert row mapping, empty-batch short-circuit, missing-client 503, insert-error 503, table-name override |
| `backend/src/telemetry/telemetry.controller.spec.ts` | Route wiring, `202` status, throttle annotation, DTO passthrough |
| `src/lib/telemetry.test.js` | flush success clears buffer, failure keeps buffer, empty buffer skips network, capture buffering + dedupe, global-listener capture (uncaught Error, resource failure, Script error., rejection with Error/string/missing reason), idempotent init, no-window safety |
