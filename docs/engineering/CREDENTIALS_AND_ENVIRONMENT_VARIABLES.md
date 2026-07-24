# Provance Credentials And Environment Variables

Last updated: 2026-07-23

## Purpose

This document is the environment-variable source of truth for the current MVP.

It intentionally does not include secret values.

## Current Live Endpoints

- Frontend: <https://provanc3.vercel.app>
- API: <https://provance-api.fly.dev>
- API base: <https://provance-api.fly.dev/v1>
- Worker: `provance-worker`

## Environment Variable Groups

## Required Now: Frontend

These are required to run the current MVP frontend.

| Variable | Required | Purpose |
| --- | ---: | --- |
| `VITE_API_BASE_URL` | Yes | Frontend API base URL. |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used for signed uploads. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser-safe Supabase key used for uploads. |

Example:

```bash
VITE_API_BASE_URL=http://localhost:4000/v1
VITE_SUPABASE_URL=https://<supabase-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Required Now: Backend API

These are required for the current NestJS API.

| Variable | Required | Purpose |
| --- | ---: | --- |
| `PORT` | Yes | API port. |
| `FRONTEND_ORIGIN` | Yes | CORS allowlist. |
| `SUPABASE_URL` | Yes | Supabase URL. |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key for auth-related operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged server key. |
| `SUPABASE_WAITLIST_TABLE` | Yes | Waitlist table name. |
| `SUPABASE_SCANS_TABLE` | Yes | Scans table name. |
| `SUPABASE_UPLOADS_BUCKET` | Yes | Private uploads bucket name. |
| `MAX_UPLOAD_BYTES` | Yes | Upload size limit. |
| `ALLOWED_UPLOAD_MIME_TYPES` | Yes | Allowed upload MIME list. |
| `ADMIN_EMAILS` | Yes for admin access | Internal admin allowlist. |
| `THROTTLE_TTL_MS` | No | Rate-limit window. |
| `THROTTLE_LIMIT` | No | Rate-limit cap. |
| `HELMET_ENABLED` | No | Security-header toggle. |
| `TRUST_PROXY` | No | Proxy-awareness toggle. |

Example:

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173,https://provanc3.vercel.app
SUPABASE_URL=https://<supabase-project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SUPABASE_WAITLIST_TABLE=waitlist_applications
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
MAX_UPLOAD_BYTES=52428800
ALLOWED_UPLOAD_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
ADMIN_EMAILS=founder@example.com
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
HELMET_ENABLED=true
TRUST_PROXY=true
```

## Required Now: Worker

These are required only when the worker-backed async path is enabled.

| Variable | Required | Purpose |
| --- | ---: | --- |
| `SUPABASE_URL` | Yes | Supabase URL. |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged server key. |
| `SUPABASE_SCANS_TABLE` | Yes | Scans table name. |
| `SUPABASE_UPLOADS_BUCKET` | Yes | Upload bucket name. |
| `REDIS_URL` | Yes when queue enabled | Redis-compatible connection string. |
| `SCAN_PROCESSING_QUEUE_NAME` | No | Queue name. |
| `WORKER_CONCURRENCY` | No | Parallel job count. |

Example:

```bash
SUPABASE_URL=https://<supabase-project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SUPABASE_SCANS_TABLE=scans
SUPABASE_UPLOADS_BUCKET=provance-uploads
REDIS_URL=rediss://default:<password>@<host>:6379
SCAN_PROCESSING_QUEUE_NAME=scan-processing
WORKER_CONCURRENCY=4
```

## Required Later

These are not required to continue the current MVP application work.

### Cloudflare

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`

### Email

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Monitoring And Analytics

- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `POSTHOG_KEY`
- `POSTHOG_HOST`

### Future AI Providers

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### Future Billing

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Current Queue Guidance

- `REDIS_URL` is only required when the queue-backed worker path is enabled
- local development should prefer inline processing or local Redis / Valkey unless shared async validation is needed
- do not point every development workflow at a paid hosted Redis instance by default

## Service Notes

### Supabase

Current expected database and storage objects:

- `waitlist_applications`
- `access_invites`
- `auth_audit_events`
- `profiles`
- `scans`
- private uploads bucket `provance-uploads`

### Redis-Compatible Queue

- accepted connection format: `redis://...` or `rediss://...`
- do not use the Upstash REST URL as `REDIS_URL`

## Local Development Files

- frontend: `.env`
- backend: `backend/.env.local` or `backend/.env`

Never commit real secrets.
