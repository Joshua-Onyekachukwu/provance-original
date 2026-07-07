# Provance Current Implementation Status

Last updated: 2026-07-07

## Purpose

This document tracks what Provance is building, what is already implemented in the repo, what remains in progress, and what engineers should update after each major phase.

Update this file after major engineering changes, especially when backend structure, auth flows, public-site messaging, data models, or deployment paths change.

Related direction documents:

- root overview: `README.md`
- phase map: `docs/engineering/PHASE_TASK_LIST.md`

## What We Are Building

Provance is a trust infrastructure platform for synthetic media verification.

The working product direction is:

- explainable image-first verification with a future path to video
- reviewable report workspace with future downloadable forensic report export
- waitlist-first onboarding and invite-based account access
- protected application workflows for uploads, analysis, case review, and account access
- future team collaboration, admin tooling, and API access
- future API access for programmatic verification and operational integration

## Current Architecture

### Frontend

- React + Vite marketing and public-product site
- Public routes for home, product, methodology, pricing, docs, sample report, security, contact, waitlist, and sign-in
- Tailwind-based styling with Framer Motion for section transitions and interactions

### Backend

- NestJS backend located in `backend/`
- Versioned API prefix at `/v1`
- Validation and CORS configured in the app bootstrap
- Waitlist-first auth and onboarding structure implemented
- Supabase-backed service layer for persistence, invite activation, auth wiring, and scan records

### Existing Legacy Backend

- A legacy `api/` folder still exists with ad hoc Hono-based code
- It is not the long-term backend direction
- New work should target `backend/` unless a deliberate migration plan says otherwise

## What Is Done

### Public Site

- Homepage sections have been revised through multiple content and visibility passes
- `How It Works` visibility bug has been fixed
- Public-page copy has been cleaned to remove staging-tone language across major pages
- Legal pages now contain fuller production-style Privacy, Terms, and Cookies content
- `Why Provance` now uses a four-card, two-by-two layout aligned more closely with the `Use Cases` visual system

### Waitlist And Sign-In Frontend

- `WaitlistPage.jsx` now submits to a real API shape through `src/lib/api.js`
- `SignInPage.jsx` now signs users in through the shared auth context and redirects into the authenticated workspace
- `AcceptInvitePage.jsx` now activates invited users through the backend
- Password reset request and confirmation pages are now implemented
- Both pages support loading, error, and success states

### Authenticated App Shell

- New signed-in route group under `/app/*`
- Protected route gate that redirects unauthenticated users back to sign-in with a return URL
- Dedicated authenticated layout with left-side navigation and top-level app structure
- Initial in-product pages for dashboard, uploads, reports, account settings, admin operations, and team workspace placeholders
- Account preference editing persists locally across refreshes
- Explicit team permission handling redirects unauthorized access to an access denied page
- Admin permission handling now exposes the admin workspace only for allowlisted emails

### Phase 5 Upload Workflow Foundation

- New upload flow scaffold in `/app/uploads` that creates a scan record, uploads directly to private storage, submits a job, and polls status
- New NestJS scan endpoints:
  - `POST /v1/scans` (initiate upload and return signed upload token)
  - `POST /v1/scans/:scanId/submit` (queue processing)
  - `GET /v1/scans` (list scans)
  - `GET /v1/scans/:scanId` (scan detail with result payload)
- Supabase JWT authentication guard added for scan endpoints
- Scan storage and data model migration added at `supabase/migrations/0002_scans.sql`
- Upstash-backed queue processing is now wired through the Fly worker deployment path
- Worker processing now writes a structured image-first evidence payload instead of a single placeholder signal

### Phase 6 Report And Case Review Foundation

- `/app/reports` now loads real scan history instead of a placeholder panel
- `/app/reports/:scanId` now renders report detail for a selected case
- `/app/reports/:scanId/print` now provides printable report output
- Dashboard cards and recent activity are now backed by live scan records
- Completed uploads now deep-link directly into the report workspace
- Report IDs and structured evidence sections are now attached to completed scans
- The authenticated dashboard and sidebar have been redesigned into a denser analyst workspace with a stronger operations layout

### Admin Operations

- `/app/admin` now provides an internal waitlist and access operations workspace
- Admin users can search and filter applications, record notes, update review status, export CSV data, and create secure invite links
- Backend admin endpoints now enforce signed-in admin access through the `ADMIN_EMAILS` allowlist
- Admin operations are tracked through the audit trail

### NestJS Backend Scaffold

- `GET /v1/health`
- `POST /v1/waitlist/applications`
- `POST /v1/auth/sign-in`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/invites/accept`

### Security Foundation

- `helmet` headers enabled in the backend bootstrap
- global request throttling enabled with tighter limits on auth and waitlist endpoints
- startup environment validation added for critical backend settings
- request ID tracing added for API debugging
- global exception filter added to avoid leaking internal errors
- public health endpoint reduced to minimal safe status output
- auth audit events added for sign-in success, sign-in failure, password reset requests, and invite acceptance
- admin audit events are now written for waitlist review and invite creation operations
- public Supabase auth clients are now created per request to avoid cross-request session leakage
- security and launch checklist added at `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md`
- frontend session refresh is now handled through the authenticated client and `POST /v1/auth/refresh`

### Supabase Preparation

- Supabase project is connected for local backend validation
- Backend environment template added
- Starter SQL migration added at `supabase/migrations/0001_waitlist_auth.sql`
- Remote tables exist for `waitlist_applications`, `access_invites`, and `auth_audit_events`
- Waitlist submissions persist into the live `waitlist_applications` table
- Invite acceptance creates a real Supabase user and updates waitlist and invite state
- Sign-in is wired to real Supabase Auth credentials

## What Is Not Done Yet

### Auth

- Password reset request and confirmation UI are now implemented
- Invite acceptance UI is now implemented
- Refresh-token handling is now implemented for the authenticated client
- Hardened cookie-based session transport remains a possible future hardening step, not an MVP blocker

### Waitlist Operations

- Admin review flow is now implemented inside `/app/admin`
- Approval, rejection, defer, notes, invite creation, filtering, and CSV export are now implemented
- Manual transactional email delivery remains the current MVP operational model

### Product Application

- Richer evidence models, share links, and PDF rendering can still be expanded
- Evidence timeline and reference handling
- Organization and team access controls
- Audit review tools
- Higher-density multi-user case triage beyond the current analyst dashboard redesign

## Validation Status

Validated in this phase:

- frontend diagnostics on edited files
- frontend production build
- authenticated routing verified in browser (sign-in redirect, protected routes, account persistence, team denial)
- backend unit tests for auth service failure handling and audit logging
- backend NestJS build
- backend e2e test for health endpoint
- combined release check through `npm run check:launch`
- live waitlist submission verified against the connected Supabase project
- live invite acceptance and sign-in verified against the connected Supabase project
- live audit event writes verified in `auth_audit_events`
- Phase 5 upload scaffold verified through build and test gates, but requires:
  - applying `0002_scans.sql` in Supabase
  - creating a private Storage bucket named `provance-uploads`
  - setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend environment
  - setting `SUPABASE_UPLOADS_BUCKET` and related settings in the backend environment

## Important Files

### Frontend

- `src/lib/api.js`
- `src/pages/WaitlistPage.jsx`
- `src/pages/SignInPage.jsx`
- `src/context/AuthContext.jsx`
- `src/components/auth/ProtectedRoute.jsx`
- `src/components/app/AppShellLayout.jsx`
- `src/pages/app/*`
- `src/pages/PrivacyPage.jsx`
- `src/pages/TermsPage.jsx`
- `src/pages/CookiesPage.jsx`

### Backend

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/common/filters/global-exception.filter.ts`
- `backend/src/common/guards/api-throttler.guard.ts`
- `backend/src/config/env.validation.ts`
- `backend/src/health/health.controller.ts`
- `backend/src/waitlist/waitlist.controller.ts`
- `backend/src/waitlist/waitlist.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/supabase/supabase.service.ts`
- `supabase/migrations/0001_waitlist_auth.sql`
- `supabase/migrations/0002_scans.sql`

## Next Recommended Steps

1. Apply the latest Supabase migrations in the connected project
2. Validate the live worker-backed queue flow end to end through the deployed frontend
3. Move account preference storage from local-only to a Supabase-backed profile model
4. Expand printable reports into full PDF export when needed
5. Start Phase 7 team and organization workflows

## Collaboration Notes

- Update this file after every major engineering phase
- Update `README.md` when the repo architecture, setup flow, or project direction changes materially
- Update `docs/engineering/PHASE_TASK_LIST.md` when the working build sequence changes
- Update `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` when release gates or security baselines change
- Update `docs/changelogs/CHANGELOG.md` with each significant repo change
- Push tested, reviewable work to `main` after each major phase so collaborators can pull the latest stable state
