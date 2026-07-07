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

- explainable image and video verification
- downloadable and reviewable forensic reports
- waitlist-first onboarding and invite-based account access
- future protected application workflows for uploads, analysis, review, reporting, and team collaboration
- future API access for programmatic verification and operational integration

## Current Architecture

### Frontend

- React + Vite marketing and public-product site
- Public routes for home, product, methodology, pricing, docs, sample report, security, contact, waitlist, and sign-in
- Tailwind-based styling with Framer Motion for section transitions and interactions

### Backend

- New NestJS backend scaffold located in `backend/`
- Versioned API prefix at `/v1`
- Validation and CORS configured in the app bootstrap
- Waitlist-first auth and onboarding structure prepared
- Supabase-backed service layer added for persistence, invite activation, and auth wiring

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
- `SignInPage.jsx` now submits to a real API shape through `src/lib/api.js`
- Both pages support loading, error, and success states

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
- public Supabase auth clients are now created per request to avoid cross-request session leakage
- security and launch checklist added at `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md`

### Supabase Preparation

- Supabase project is connected for local backend validation
- Backend environment template added
- Starter SQL migration added at `backend/supabase/migrations/0001_waitlist_auth.sql`
- Remote tables exist for `waitlist_applications`, `access_invites`, and `auth_audit_events`
- Waitlist submissions persist into the live `waitlist_applications` table
- Invite acceptance creates a real Supabase user and updates waitlist and invite state
- Sign-in is wired to real Supabase Auth credentials

## What Is Not Done Yet

### Auth

- Password reset email delivery and recovery callback UX
- Session persistence and refresh-token handling
- Protected frontend routes and authenticated app shell
- Invite token issuance tooling for admin and review workflows

### Waitlist Operations

- Admin review flow
- Approval and rejection workflow
- Waitlist status dashboard
- Notification and email automation

### Product Application

- Authenticated dashboard
- Upload and analysis workflow
- Report management
- Organization and team access controls
- Audit review tools

## Validation Status

Validated in this phase:

- frontend diagnostics on edited files
- frontend production build
- backend unit tests for auth service failure handling and audit logging
- backend NestJS build
- backend e2e test for health endpoint
- combined release check through `npm run check:launch`
- live waitlist submission verified against the connected Supabase project
- live invite acceptance and sign-in verified against the connected Supabase project
- live audit event writes verified in `auth_audit_events`

Environment note:

- `npm install` for the backend hit an npm resolver bug in this environment
- backend validation succeeded using `pnpm` install, followed by `npm run build` and `npm run test:e2e`
- until that resolver issue is addressed, engineers should install backend dependencies with `npx pnpm@9 install`

## Important Files

### Frontend

- `src/lib/api.js`
- `src/pages/WaitlistPage.jsx`
- `src/pages/SignInPage.jsx`
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
- `backend/supabase/migrations/0001_waitlist_auth.sql`

## Next Recommended Steps

1. Connect real Supabase environment values in `backend/.env`
2. Add invite issuance and waitlist review tooling for internal operators
3. Build secure frontend session handling, protected routes, and account recovery pages
4. Add authenticated app-shell navigation and first signed-in dashboard state
5. Extend auth audit coverage into admin review and invite issuance flows
6. Start building the first authenticated product area

## Collaboration Notes

- Update this file after every major engineering phase
- Update `README.md` when the repo architecture, setup flow, or project direction changes materially
- Update `docs/engineering/PHASE_TASK_LIST.md` when the working build sequence changes
- Update `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` when release gates or security baselines change
- Update `docs/changelogs/CHANGELOG.md` with each significant repo change
- Push tested, reviewable work to `main` after each major phase so collaborators can pull the latest stable state
