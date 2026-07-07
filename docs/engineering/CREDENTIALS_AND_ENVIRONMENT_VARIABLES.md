# Provance Credentials And Environment Variables

This document lists the environment variables and credentials required to run Provance across:

- Supabase (Auth, Postgres, Storage)
- Fly.io (NestJS API, later a worker)
- Upstash Redis (queue backbone)
- Vercel (frontend hosting)

This file intentionally does not include any secret values. Store secret values only in the relevant platform secret managers and local `.env` files that are not committed.

This is the single source of truth for environment variable names, safe defaults, deployment targets, and current status.

## Current Live Endpoints

- Frontend (Vercel): https://provanc3.vercel.app
- API (Fly.io): https://provance-api.fly.dev
- API base (versioned): https://provance-api.fly.dev/v1

## Status Legend

- Done: already configured in the target platform by the engineering workflow
- Pending: must be configured manually (usually in a dashboard) or requires a new service

## Vercel (Frontend)

These must be configured in the Vercel project environment variables.

| Variable | Required | Purpose | Status |
|---|---:|---|---|
| `VITE_API_BASE_URL` | Yes | Points the frontend to the deployed API. | Pending |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used by the browser for Storage uploads. | Pending |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public Supabase key used by the browser for Storage uploads. | Pending |

Recommended values:

- `VITE_API_BASE_URL=https://provance-api.fly.dev/v1`
- `VITE_SUPABASE_URL=https://dmhrwdcuwtgscwlaagsa.supabase.co`

Ready-to-paste Vercel values:

```bash
VITE_API_BASE_URL=https://provance-api.fly.dev/v1
VITE_SUPABASE_URL=https://dmhrwdcuwtgscwlaagsa.supabase.co
VITE_SUPABASE_ANON_KEY=<paste-supabase-anon-key>
```

## Fly.io (Backend API) `provance-api`

These are configured as Fly secrets for the `provance-api` app.

| Variable | Required | Purpose | Status |
|---|---:|---|---|
| `PORT` | Yes | Service port. Set by `fly.toml` to `8080`. | Done |
| `NODE_ENV` | Yes | Production mode. Set by `fly.toml`. | Done |
| `FRONTEND_ORIGIN` | Yes | CORS allowlist for frontend origins. | Done |
| `SUPABASE_URL` | Yes | Supabase URL for database/auth/storage operations. | Done |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key. Used server-side for JWT verification via Supabase auth. | Done |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role. Used server-side for privileged DB writes and signed upload URLs. | Done |
| `SUPABASE_SCANS_TABLE` | Yes | Scans table name (default `scans`). | Done |
| `SUPABASE_UPLOADS_BUCKET` | Yes | Storage bucket for uploads (default `provance-uploads`). | Done |
| `REDIS_URL` | No for current stub | Queue connection string for async job processing. | Done |
| `SCAN_PROCESSING_QUEUE_NAME` | No | Queue name for background scan jobs. | Pending |
| `WORKER_CONCURRENCY` | No | Worker concurrency for queue processing. | Pending |
| `THROTTLE_TTL_MS` | No | Rate limiting window. | Pending |
| `THROTTLE_LIMIT` | No | Rate limiting max requests per window. | Pending |
| `HELMET_ENABLED` | No | Security headers toggle. | Pending |
| `TRUST_PROXY` | No | Proxy-trust toggle for correct client IP handling. | Pending |

Effective configured CORS origin for production:

- `FRONTEND_ORIGIN=https://provanc3.vercel.app`

Ready-to-paste Fly secrets for `provance-api`:

```bash
SUPABASE_URL=https://dmhrwdcuwtgscwlaagsa.supabase.co
SUPABASE_ANON_KEY=<paste-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-supabase-service-role-key>
FRONTEND_ORIGIN=https://provanc3.vercel.app
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
REDIS_URL=<paste-upstash-rediss-url>
SCAN_PROCESSING_QUEUE_NAME=scan-processing
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
HELMET_ENABLED=true
TRUST_PROXY=true
```

## Fly.io (Worker) `provance-worker`

The worker processes scan jobs from Upstash Redis. It is deployed separately from the API.

| Variable | Required | Purpose | Status |
|---|---:|---|---|
| `SUPABASE_URL` | Yes | Supabase URL for reading and updating scan records. | Pending |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key for auth-related helpers. | Pending |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged Supabase key for processing updates. | Pending |
| `SUPABASE_SCANS_TABLE` | Yes | Scans table name (default `scans`). | Pending |
| `SUPABASE_UPLOADS_BUCKET` | Yes | Storage bucket for uploads (default `provance-uploads`). | Pending |
| `REDIS_URL` | Yes | Queue connection string. | Pending |
| `SCAN_PROCESSING_QUEUE_NAME` | No | Queue name for background scan jobs. | Pending |
| `WORKER_CONCURRENCY` | No | Number of jobs processed in parallel. | Pending |

Ready-to-paste Fly secrets for `provance-worker`:

```bash
SUPABASE_URL=https://dmhrwdcuwtgscwlaagsa.supabase.co
SUPABASE_ANON_KEY=<paste-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-supabase-service-role-key>
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
REDIS_URL=<paste-upstash-rediss-url>
SCAN_PROCESSING_QUEUE_NAME=scan-processing
WORKER_CONCURRENCY=4
```

## Supabase

Supabase values are used in two places:

- Server-side (Fly): full Supabase URL + anon + service role
- Client-side (Vercel): Supabase URL + anon key only

| Variable | Required | Where used | Status |
|---|---:|---|---|
| `SUPABASE_URL` | Yes | Fly backend secrets, Vercel env vars | Done on Fly. Pending on Vercel |
| `SUPABASE_ANON_KEY` | Yes | Fly backend secrets, Vercel env vars | Done on Fly. Pending on Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) | Fly backend secrets only | Done |

Database and Storage requirements:

- Tables required: `waitlist_applications`, `access_invites`, `auth_audit_events`, `scans`
- Storage bucket required: `provance-uploads` (private)

## Upstash Redis

Upstash provides Redis for queue-backed processing.

| Variable | Required | Purpose | Status |
|---|---:|---|---|
| `REDIS_URL` | Recommended | Queue connection string for workers and API scheduling. | Done on Fly |

Notes:

- Upstash region is Germany and Fly region is Amsterdam. This is an acceptable latency match for the first iteration.

## Local Development

Frontend `.env` (not committed):

```bash
VITE_API_BASE_URL=http://localhost:4000/v1
VITE_SUPABASE_URL=https://dmhrwdcuwtgscwlaagsa.supabase.co
VITE_SUPABASE_ANON_KEY=<paste-supabase-anon-key>
```

Backend `backend/.env.local` or `backend/.env` (not committed):

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173,https://provanc3.vercel.app
TRUST_PROXY=true
HELMET_ENABLED=true
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
SUPABASE_URL=https://dmhrwdcuwtgscwlaagsa.supabase.co
SUPABASE_ANON_KEY=<paste-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-supabase-service-role-key>
SUPABASE_WAITLIST_TABLE=waitlist_applications
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
MAX_UPLOAD_BYTES=52428800
ALLOWED_UPLOAD_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
REDIS_URL=<paste-upstash-rediss-url>
SCAN_PROCESSING_QUEUE_NAME=scan-processing
WORKER_CONCURRENCY=4
```

## Current Platform Status Snapshot

- Fly `provance-api`: deployed and configured with Supabase keys, Redis, and live frontend origin
- Fly `provance-worker`: code and deployment config added to repo, still needs first deploy
- Vercel: still needs `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`
- Supabase: connected and used by both frontend and backend
- Upstash Redis: connected at the API level, worker deployment pending
