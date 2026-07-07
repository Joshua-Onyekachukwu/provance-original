# Provance Backend

NestJS backend scaffold for the Provance waitlist-first authentication flow.

## Current Scope

- Health endpoint for local verification
- Waitlist submission endpoint
- Auth endpoint structure for sign in, invite acceptance, and password reset
- Supabase-ready service layer for persistence and auth integration
- Validation, CORS, and API versioning setup
- Security headers, request throttling, and startup environment validation
- Sanitized exception handling and request ID tracing

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
- `TRUST_PROXY`
- `HELMET_ENABLED`
- `THROTTLE_TTL_MS`
- `THROTTLE_LIMIT`

## Install

```bash
npx pnpm@9 install
```

## Run

```bash
npm run start:dev
```

Backend runs on `http://localhost:4000` by default.

For local development, allow both Vite ports unless you have a stricter reason not to:

```env
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173
```

If `npm install` fails in your environment with an `Invalid Version` resolver error, use `pnpm` for dependency installation and continue using the normal npm scripts afterward.

## Security Baseline

Current backend protections include:

- strict DTO validation and field whitelisting
- request throttling with proxy-aware client tracking
- explicit CORS allow-listing
- `helmet` security headers
- sanitized exception responses
- request IDs for tracing
- startup validation for key environment variables

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

- `supabase/migrations/0001_waitlist_auth.sql`

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
