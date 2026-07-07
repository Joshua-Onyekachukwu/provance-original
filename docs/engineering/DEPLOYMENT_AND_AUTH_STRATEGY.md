# Deployment And Auth Strategy (Temporary Supabase, Long-Term API)

Last updated: 2026-07-07

## Goal

Ship a working live experience quickly using Supabase as the temporary auth and data backbone, while preparing a production-grade API deployment for the NestJS backend.

This document also explains the most common cause of the sign-in error:

`NetworkError when attempting to fetch resource.`

## Current Reality

Provance currently has:

- Frontend: React + Vite app deployed on Vercel.
- Data and auth platform: Supabase (Postgres + Auth).
- Backend API: NestJS service in `backend/` that runs locally on `http://localhost:4000/v1`.

Supabase does not automatically host or run the NestJS backend. If the Vercel frontend still points to `http://localhost:4000/v1` in production, the browser will fail to reach it and you will see a network error.

## Recommended Approach

### Track A. Temporary Supabase-First (Fastest To Stabilize)

Use Supabase directly for:

- Sign-in and sign-out
- Password reset
- Session restoration
- Waitlist insert and read paths (with correct Row Level Security policies)

This removes the need for a live API host immediately and eliminates cross-origin failures between Vercel and a separate API.

#### What to change in the frontend

- Use `@supabase/supabase-js` in the frontend.
- Add environment variables to Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Do not use the Supabase service role key in the frontend.

#### Waitlist notes

If the frontend writes directly to `waitlist_applications`, Supabase Row Level Security must allow inserts safely.

Typical pattern:

- RLS enabled.
- A policy that allows `INSERT` for anonymous users but only for the fields you accept, and ideally only through a constrained RPC or Edge Function.

If you prefer not to open direct anonymous inserts on a table, then route waitlist writes through:

- a Supabase Edge Function, or
- a small deployed API.

### Track B. Deploy The NestJS API (Long-Term Direction)

Deploy the NestJS backend as a separate service and keep Supabase as the managed data and auth provider behind it.

Recommended hosting options for NestJS:

- Railway (simple container and environment management)
- Render (simple web service, good for early-stage APIs)
- Fly.io (good control and scaling for APIs)

You then set the Vercel frontend environment variable:

- `VITE_API_BASE_URL=https://your-api-domain.com/v1`

And configure backend environment:

- `FRONTEND_ORIGIN=https://your-vercel-domain.com`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)

This is required before any live users can sign in through your NestJS endpoints.

## Fixing The Sign-In NetworkError

### 1. Determine where the error happens

There are two distinct cases:

- Local testing: frontend should call `http://localhost:4000/v1`.
- Live Vercel site: frontend must call a public API URL or Supabase directly.

### 2. The most common cause

The live site is still configured to call:

`http://localhost:4000/v1/auth/sign-in`

Browsers cannot reach your laptop from the Vercel domain, so the request fails and throws:

`NetworkError when attempting to fetch resource.`

### 3. Confirm what URL the browser is using

Open DevTools Network tab and inspect the failing request URL.

- If it is `http://localhost:4000/...`, the live site is missing a production API configuration.

### 4. Immediate remediation paths

Pick one:

1. Temporary Supabase-first (recommended for now)
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel.
   - Update the frontend sign-in logic to use Supabase directly.

2. Deploy the NestJS API now
   - Deploy `backend/` to a real host.
   - Set `VITE_API_BASE_URL` on Vercel to the deployed API.

### 5. CORS considerations (applies to deployed API)

If you deploy the NestJS API, your backend must allow the Vercel frontend origin, otherwise the browser will block it.

Backend configuration already supports an allow list via `FRONTEND_ORIGIN`.

## Deployment Checklist (When Deploying NestJS)

### Service settings

- Build: `npm run backend:build`
- Start: `npm run backend:start`
- Health check: `GET /v1/health`

### Required secrets

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `FRONTEND_ORIGIN` (the exact Vercel domain)

### Launch gate

Run before shipping:

1. `npm run build`
2. `npm run backend:build`
3. `npm run backend:test:e2e`
4. `npm run check:launch`

## Recommended Next Step

If the goal is to stabilize sign-in on the live Vercel site today without deploying the API host yet:

- Implement Supabase-direct sign-in in the frontend and set the Supabase env vars on Vercel.

If the goal is to keep the current frontend calling the NestJS endpoints:

- Deploy the NestJS backend online and set `VITE_API_BASE_URL` on Vercel.
