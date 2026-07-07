# Provance Deployment Playbook (Fly.io + Upstash Redis)

This document describes the recommended deployment approach for Provance when running:

- Frontend on Vercel (already connected to GitHub)
- API on Fly.io (NestJS in `backend/`)
- Processing workers on Fly.io (separate service)
- Queue on Upstash Redis
- Data and storage on Supabase (Postgres, Auth, Storage)

## Why This Setup

- Vercel excels at static and edge-friendly frontend delivery.
- Fly.io is a better fit for long-running API processes and worker processes.
- Upstash Redis provides a low-ops queue backbone that works well with Fly.io and Vercel.
- Supabase remains the source of truth for authentication, persistence, and media storage.

## Prerequisites

- Fly.io account created
- Upstash Redis account created
- Supabase project configured
- GitHub repo access is working

## Fly.io Setup (Local Machine)

### 1) Install flyctl

Run the Fly.io PowerShell install script:

```powershell
powershell -Command "iwr `https://fly.io/install.ps1` -useb | iex"
```

Verify:

```powershell
fly version
```

### 2) Authenticate

```powershell
fly auth login
```

### 3) Deploy the API (NestJS)

Run these commands from the repo root, but set the working directory to `backend/` before launching.

```powershell
cd backend
fly launch
```

Recommended launch answers:

- App name: `provance-api` (or `provance-api-prod`)
- Region: pick the closest region to your primary users and to your Upstash Redis region
- Deploy now: Yes (after fly launch finishes generating config)

If Fly asks for a builder choice, choose the Dockerfile-based option if available. If it only offers buildpacks, accept for the first deploy. We can harden this to a deterministic Docker build immediately after.

### 4) Set production environment variables for the API

Set these in Fly.io for the `provance-api` app:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN` (your Vercel domains)
- `SUPABASE_UPLOADS_BUCKET=provance-uploads`
- `SUPABASE_SCANS_TABLE=scans`

Optional but recommended:

- `THROTTLE_TTL_MS=60000`
- `THROTTLE_LIMIT=60`
- `HELMET_ENABLED=true`
- `TRUST_PROXY=true`

### 5) Point Vercel frontend to the Fly API

Set these in Vercel project environment variables:

- `VITE_API_BASE_URL=https://<your-fly-api-domain>/v1`
- `VITE_SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<supabase anon key>`

## Upstash Redis Setup (Queue Backbone)

### 1) Create a Redis database

In Upstash:

- Create a Redis database (TLS enabled by default)
- Choose a region close to your Fly.io region for low latency
- Copy the Redis connection string

For a queue worker (BullMQ style), you want the Redis protocol URL, typically:

- `rediss://default:<password>@<host>:<port>`

### 2) Store queue config as environment variables

We will standardize on:

- `REDIS_URL` for both API and worker

Set `REDIS_URL` in:

- Fly.io `provance-api`
- Fly.io `provance-worker`

## Supabase Notes

- The `public.scans` table and the `provance-uploads` bucket are created by `supabase/migrations/0002_scans.sql`.
- The API uses the service-role key to create scan records and signed upload URLs.
- The browser uploads directly to Supabase Storage using the signed upload token. This avoids routing large files through the API.

## Collaboration Rules

- Never store secrets in git. Only store templates in `.env.example`.
- Use `main` as the production branch. Merge only after `npm run check:launch` passes.
- For each deploy-related change, update this file and the changelog.

