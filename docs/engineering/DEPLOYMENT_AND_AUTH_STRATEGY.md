# Deployment And Auth Strategy

Last updated: 2026-08-06

## Status Note

This document has been updated from a planning note into a current-state reference.

Provance no longer relies on a temporary frontend-direct auth path. The active deployment model is:

- Vercel for the frontend
- Fly.io for the NestJS API
- Fly.io for the worker
- Supabase for auth, database, and storage
- Upstash Redis for queue-backed processing

## Goal

Describe the currently deployed auth and backend strategy, and document the decisions new engineers should follow.

## Current Deployment Model

Frontend:

- Vercel serves the public site and authenticated React application
- browser env points to the deployed API and Supabase browser client values

Backend:

- NestJS API is deployed on Fly and exposed at `https://provance-api.fly.dev/v1`
- authenticated frontend actions call the API, not a local development URL

Worker:

- background scan processing runs through the separate Fly worker app `provance-worker`
- jobs are queued through Redis and consumed asynchronously

Infrastructure:

- Supabase handles Postgres, Auth, and Storage
- Upstash Redis handles the queue connection for the API and worker

## Active Auth Strategy

Provance uses a backend-mediated auth path:

- frontend submits sign-in to the NestJS API
- NestJS signs in against Supabase Auth
- the **access token** is returned in the response body and kept in **JS memory only** — the migrated frontend never persists it to localStorage (mock mode is the one dev-only exception: `USE_MOCK` is env-driven via `VITE_USE_MOCK` in `src/lib/api.js`, defaulting to mock in dev and real in production builds)
- the **refresh token** is transported exclusively in an httpOnly cookie (`provance_refresh`, or `__Host-provance_refresh` when `AUTH_COOKIE_SECURE=true`)
- every refresh rotates the cookie value (Supabase refresh tokens are single-use), and sign-out burns the token server-side before clearing the cookie
- on cold boot the frontend performs a silent cookie refresh (`ensureSession`), then hydrates identity, permissions, and profile through `GET /auth/me`
- protected routes use the in-memory access token to authorize API calls

The full migration path (current → target state, deploy order, env matrix, rollback, security
posture) is documented in `docs/engineering/AUTH_HARDENING_MIGRATION.md`.

Cookie behavior is configurable:

- `AUTH_COOKIE_ENABLED` (default `true`) — set `false` to restore body-based refresh tokens for legacy/non-browser clients
- `AUTH_COOKIE_SAME_SITE` (`lax` | `strict` | `none`) — use `none` for the cross-site Vercel → Fly deployment; `none` forces `Secure`
- `AUTH_COOKIE_SECURE` — must be `true` in production
- `AUTH_COOKIE_MAX_AGE_DAYS` (default 30)

This means the frontend should not be switched back to a Supabase-direct auth flow unless that decision is intentionally revisited.

## Current Auth And Account Endpoints

The active auth and account surface now includes:

- `POST /v1/auth/sign-in` (sets the httpOnly refresh cookie)
- `POST /v1/auth/refresh` (rotates the refresh cookie)
- `POST /v1/auth/sign-out` (burns the refresh token and clears the cookie)
- `GET /v1/auth/me`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/invites/accept`
- `GET /v1/account/profile`
- `PATCH /v1/account/profile`

The report surface is served from completed scans:

- `GET /v1/reports` — paginated list of completed scans (`{ data, total, page, pageSize }`)
- `GET /v1/reports/:id` — full report payload (`{ report: { ..., result_payload, asset_preview_url } }`)

This allows the frontend to keep the session token flow it already uses while moving profile and permission state onto the backend.

## Active Upload And Scan Strategy

The current scan workflow is:

1. authenticated user creates a scan through the API
2. API returns signed upload information
3. frontend uploads the file to the private Supabase storage bucket
4. frontend submits the scan for processing
5. API enqueues the job through Redis
6. worker processes the queued job and updates the scan record
7. frontend polls for status and renders the report workspace

## Common Production Failure Cases

### Frontend points to localhost

If the live frontend is still calling `http://localhost:4000/v1`, browser requests will fail immediately.

Correct production value:

```text
VITE_API_BASE_URL=https://provance-api.fly.dev/v1
```

### Missing CORS origin

If `FRONTEND_ORIGIN` does not include the deployed frontend domain, the browser will block API calls even when the API is healthy.

Current production origin:

```text
https://provanc3.vercel.app
```

### Invalid Redis connection string

The worker and API queue path require a real Redis connection string, not the Upstash REST endpoint.

Accepted format:

```text
rediss://default:<password>@<host>:6379
```

## Required Platform Variables

Vercel:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Fly API:

- `FRONTEND_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCANS_TABLE`
- `SUPABASE_UPLOADS_BUCKET`
- `REDIS_URL`
- `SCAN_PROCESSING_QUEUE_NAME`

Fly worker:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCANS_TABLE`
- `SUPABASE_UPLOADS_BUCKET`
- `REDIS_URL`
- `SCAN_PROCESSING_QUEUE_NAME`
- `WORKER_CONCURRENCY`

Reference:

- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`

## Deployment Checklist

Run before shipping backend changes. `npm run check:launch` is the single
pre-ship gate: it runs **`npm run check:test` first** (lint + the full frontend
vitest suite — 166 tests, formatters included), then the frontend build,
backend build, and backend e2e health check — so a lint violation or formatter
regression fails fast before any deploy.

1. `npm run check:test` — `npm run lint` + `npm test` (166 vitest tests: formatters + edge cases)
2. `npm run build` — frontend production build
3. `npm run backend:build` — backend production build
4. `npm run backend:test:e2e` — backend in-memory e2e health check
5. `npm run check:launch` — runs steps 1–4 in sequence (canonical gate)

CI (`.github/workflows/ci.yml`) enforces the same gate on every push/PR:
frontend lint + test + build, and backend build + unit + e2e.

Then deploy:

1. Fly API from `backend/fly.toml`
2. Fly worker from `backend/fly.worker.toml`
3. confirm `GET /v1/health`
4. confirm worker starts cleanly

## Next Strategy Work

- validate the live end-to-end upload and queue flow through the deployed frontend
- enforce usage/entitlement limits on the scan endpoints once metering is in place
- introduce internal admin tooling for waitlist approval and invite issuance
- wire error monitoring (Sentry) and product analytics (PostHog) as approved in the Phase 3 feature set
