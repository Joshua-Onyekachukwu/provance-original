# Provance Backend

NestJS backend and worker runtime for the Provance MVP.

## Current Scope

The backend currently covers:

- health endpoint for service verification
- waitlist submission
- sign-in, invite acceptance, and password reset endpoints
- Supabase-backed auth and persistence wiring
- scan initiation, signed upload preparation, scan submission, scan listing, and scan detail retrieval
- queue-backed scan processing through the worker runtime
- validation, CORS, API versioning, throttling, and exception handling

## Folder Shape

```text
src/
  auth/
  common/
  config/
  health/
  queue/
  scans/
  supabase/
  waitlist/
  main.ts
  worker.ts
```

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in the values for your environment.

Core variables:

- `PORT`
- `FRONTEND_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_WAITLIST_TABLE`
- `SUPABASE_SCANS_TABLE`
- `SUPABASE_UPLOADS_BUCKET`
- `MAX_UPLOAD_BYTES`
- `ALLOWED_UPLOAD_MIME_TYPES`
- `REDIS_URL`
- `SCAN_PROCESSING_QUEUE_NAME`
- `WORKER_CONCURRENCY`

Reference:

- `../docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`

## Install

```bash
npx pnpm@9 install
```

If `npm install` fails with an `Invalid Version` resolver issue, continue using `pnpm` for dependency installation and the normal npm scripts afterward.

## Run

API in development:

```bash
npm run start:dev
```

Worker locally after build:

```bash
npm run build
npm run start:worker
```

Backend runs on `http://localhost:4000` by default.

Recommended local origins:

```env
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

## Security Baseline

Current protections include:

- strict DTO validation and field whitelisting
- request throttling with proxy-aware client tracking
- explicit CORS allow-listing
- `helmet` security headers
- sanitized exception responses
- request IDs for tracing
- startup validation for key environment variables
- protected scan endpoints through Supabase JWT enforcement

## Current Endpoints

- `GET /v1/health`
- `POST /v1/waitlist/applications`
- `POST /v1/auth/sign-in`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/invites/accept`
- `POST /v1/scans`
- `POST /v1/scans/:scanId/submit`
- `GET /v1/scans`
- `GET /v1/scans/:scanId`

## Data Requirements

Migrations currently expected:

- `supabase/migrations/0001_waitlist_auth.sql`
- `supabase/migrations/0002_scans.sql`

Active tables and storage:

- `waitlist_applications`
- `access_invites`
- `auth_audit_events`
- `scans`
- private storage bucket `provance-uploads`

## Deployment

Primary deployment path:

- API: `fly.toml`
- Worker: `fly.worker.toml`

Reference docs:

- `../docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`
- `../docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`

## Next Backend Work

- validate the full live queue path through the deployed frontend
- deepen the placeholder verdict into richer signals and evidence
- add internal waitlist review and invite issuance tooling
- move local-only profile state toward a persisted account model
