# Provance Backend

NestJS backend scaffold for the Provance waitlist-first authentication flow.

## Current Scope

- Health endpoint for local verification
- Waitlist submission endpoint
- Auth endpoint structure for sign in, invite acceptance, and password reset
- Supabase-ready service layer for persistence and auth integration
- Validation, CORS, and API versioning setup

## Folder Shape

```text
src/
  auth/
  health/
  supabase/
  waitlist/
```

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in the values you want to use.

Required for persistence:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `PORT`
- `FRONTEND_ORIGIN`

## Install

```bash
npx pnpm@9 install
```

## Run

```bash
npm run start:dev
```

Backend runs on `http://localhost:4000` by default.

If `npm install` fails in your environment with an `Invalid Version` resolver error, use `pnpm` for dependency installation and continue using the normal npm scripts afterward.

## Current Endpoints

- `GET /v1/health`
- `POST /v1/waitlist/applications`
- `POST /v1/auth/sign-in`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/invites/accept`

## Expected Supabase Tables

Initial waitlist persistence expects:

- `waitlist_applications`

Starter schema lives at:

- `backend/supabase/migrations/0001_waitlist_auth.sql`

Suggested columns:

- `id`
- `email`
- `full_name`
- `company`
- `role_title`
- `use_case`
- `status`
- `created_at`

## Next Implementation Steps

- Create Supabase tables and row-level access rules
- Wire invite creation and acceptance to auth records
- Implement password reset mail delivery
- Add session storage and protected-route checks
- Add admin review endpoints for waitlist approval
