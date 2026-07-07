# Provance Credentials And Environment Variables

This document is the single source of truth for environment variable names, safe default values, deployment targets, and current platform status.

It intentionally does not include any secret values. Store real values only in platform secret managers and local `.env` files that are not committed.

## Current Live Endpoints

- Frontend (Vercel): <https://provanc3.vercel.app>
- API (Fly.io): <https://provance-api.fly.dev>
- API base (versioned): <https://provance-api.fly.dev/v1>
- Worker (Fly.io): `provance-worker`

## Status Legend

- Done: configured in the active deployment path
- Verify: should be present, but confirm in the platform dashboard when auditing environments
- Pending: required for a future phase or not yet wired into the current deployment

## Vercel (Frontend)

These belong in the Vercel project environment settings.

| Variable | Required | Purpose | Status |
| --- | ---: | --- | --- |
| `VITE_API_BASE_URL` | Yes | Points the frontend to the deployed API. | Verify |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used by the browser for Storage uploads. | Verify |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public Supabase key used by the browser for Storage uploads. | Verify |

Ready-to-paste template:

```bash
VITE_API_BASE_URL=https://provance-api.fly.dev/v1
VITE_SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<paste-supabase-anon-key>
```

## Fly.io API `provance-api`

These belong in the Fly secrets and app config for `provance-api`.

| Variable | Required | Purpose | Status |
| --- | ---: | --- | --- |
| `PORT` | Yes | Service port. Set by `fly.toml` to `8080`. | Done |
| `NODE_ENV` | Yes | Production mode. Set by `fly.toml`. | Done |
| `FRONTEND_ORIGIN` | Yes | CORS allowlist for frontend origins. | Done |
| `SUPABASE_URL` | Yes | Supabase URL for database, auth, and storage operations. | Done |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key used server-side for auth-related verification. | Done |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged Supabase key for writes and signed upload URLs. | Done |
| `SUPABASE_SCANS_TABLE` | Yes | Scans table name. | Done |
| `SUPABASE_UPLOADS_BUCKET` | Yes | Storage bucket for uploads. | Done |
| `REDIS_URL` | Yes | Queue connection string for scan job scheduling. | Done |
| `SCAN_PROCESSING_QUEUE_NAME` | No | Queue name for background scan jobs. | Done |
| `THROTTLE_TTL_MS` | No | Rate limiting window. | Done |
| `THROTTLE_LIMIT` | No | Rate limiting max requests per window. | Done |
| `HELMET_ENABLED` | No | Security headers toggle. | Done |
| `TRUST_PROXY` | No | Proxy-trust toggle for correct client IP handling. | Done |

Ready-to-paste template:

```bash
SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
SUPABASE_ANON_KEY=<paste-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-supabase-service-role-key>
FRONTEND_ORIGIN=https://provanc3.vercel.app
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
REDIS_URL=rediss://default:<paste-upstash-redis-password>@<your-upstash-host>:6379
SCAN_PROCESSING_QUEUE_NAME=scan-processing
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
HELMET_ENABLED=true
TRUST_PROXY=true
```

## Fly.io Worker `provance-worker`

These belong in the Fly secrets and app config for `provance-worker`.

| Variable | Required | Purpose | Status |
| --- | ---: | --- | --- |
| `SUPABASE_URL` | Yes | Supabase URL for reading and updating scan records. | Done |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key for auth-related helpers. | Done |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged Supabase key for processing updates. | Done |
| `SUPABASE_SCANS_TABLE` | Yes | Scans table name. | Done |
| `SUPABASE_UPLOADS_BUCKET` | Yes | Storage bucket for uploads. | Done |
| `REDIS_URL` | Yes | Queue connection string. Must be `redis://` or `rediss://`. | Done |
| `SCAN_PROCESSING_QUEUE_NAME` | No | Queue name for background scan jobs. | Done |
| `WORKER_CONCURRENCY` | No | Number of jobs processed in parallel. | Done |

Ready-to-paste template:

```bash
SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
SUPABASE_ANON_KEY=<paste-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-supabase-service-role-key>
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
REDIS_URL=rediss://default:<paste-upstash-redis-password>@<your-upstash-host>:6379
SCAN_PROCESSING_QUEUE_NAME=scan-processing
WORKER_CONCURRENCY=4
```

## Supabase

Supabase values are used in two places:

- server-side on Fly
- client-side in Vercel

| Variable | Required | Where used | Status |
| --- | ---: | --- | --- |
| `SUPABASE_URL` | Yes | Fly secrets, Vercel env vars | Done on Fly, Verify on Vercel |
| `SUPABASE_ANON_KEY` | Yes | Fly secrets, Vercel env vars | Done on Fly, Verify on Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) | Fly secrets only | Done |

Database and storage currently expected:

- `waitlist_applications`
- `access_invites`
- `auth_audit_events`
- `scans`
- private storage bucket `provance-uploads`

## Upstash Redis

Upstash provides the Redis queue backbone.

| Variable | Required | Purpose | Status |
| --- | ---: | --- | --- |
| `REDIS_URL` | Yes | Queue connection string for API scheduling and worker consumption. | Done |

Important note:

- `REDIS_URL` must use the Redis connection format, not the REST endpoint
- accepted format: `rediss://default:<password>@<host>:6379`
- do not use `https://...` for the worker or API queue connection

## Local Development

Frontend `.env`:

```bash
VITE_API_BASE_URL=http://localhost:4000/v1
VITE_SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<paste-supabase-anon-key>
```

Backend `backend/.env.local` or `backend/.env`:

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173,https://provanc3.vercel.app
TRUST_PROXY=true
HELMET_ENABLED=true
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
SUPABASE_ANON_KEY=<paste-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-supabase-service-role-key>
SUPABASE_WAITLIST_TABLE=waitlist_applications
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
MAX_UPLOAD_BYTES=52428800
ALLOWED_UPLOAD_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
REDIS_URL=rediss://default:<paste-upstash-redis-password>@<your-upstash-host>:6379
SCAN_PROCESSING_QUEUE_NAME=scan-processing
WORKER_CONCURRENCY=4
```

## Current Platform Snapshot

- Fly `provance-api`: deployed and healthy
- Fly `provance-worker`: deployed and started
- Vercel frontend: live
- Supabase: active for auth, storage, and scan persistence
- Upstash Redis: active for queue-backed processing
