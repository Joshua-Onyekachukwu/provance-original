# Provance Current Implementation Status

Last updated: 2026-08-04

## Purpose

This document tracks what is already implemented, what is actively being finished, and what remains deferred.

Use this file as the current engineering truth for the codebase.

## What Provance Is Building

Provance is a trust infrastructure product for synthetic media verification.

The current MVP direction is:

- image-first verification
- report-first product experience
- waitlist-first onboarding
- invite-based access
- internal-admin-supported operations

## Current Phase

Phase 2 (dashboard maturity) is substantially complete. The approved UNIFIED design
direction was ratified (ADR 002) and the reusable primitive kit shipped, with the
user dashboard, app shell, and admin pages migrated onto it. The Media Upload page
and Verification Queue page were rebuilt on the primitives with a working
mock-first upload-to-queue flow (ADR 004).

The current immediate focus is:

- multi-agent operating model ratification (ADR 003) and its supporting docs
- continuing to retire legacy per-page components in favor of the ui kit
- Phase 3 planning: working MVP product completion, session hardening, deeper
  operational reliability, observability baseline

## Current Architecture

### Frontend

- React + Vite frontend
- public routes plus authenticated `/app/*` routes
- Tailwind CSS v4 styling
- Framer Motion used selectively
- reusable ui primitive kit in `src/components/ui/` (ADR 002: UNIFIED design system)
- mock-first data gate `USE_MOCK` in `src/lib/api.js` (ADR 004)

### Backend

- NestJS backend in `backend/`
- versioned API prefix at `/v1`
- validation, throttling, helmet, request IDs, and global exception filtering

### Data And Infrastructure

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Redis-compatible queue path for async processing
- Fly.io for API and worker hosting
- Vercel for frontend hosting

## What Is Implemented

### Public Site

- homepage and public product pages
- legal pages
- sample report pages
- contact, docs, and resources surfaces

### Authentication And Onboarding

- waitlist submission
- sign-in
- invite acceptance
- password reset request and confirmation
- protected route handling
- backend-mediated identity hydration through `GET /v1/auth/me`

### Authenticated Application

- authenticated app shell with grouped workspace, account, platform, and internal navigation
- dashboard route
- uploads route
- scan history route
- reports list and report detail route
- print-ready report route
- account route
- notifications route
- developer portal route
- billing route
- broader settings route
- admin route
- team workspace route
- access denied route

### Account And Identity

- backend-backed profile persistence
- current-session identity hydration
- admin permission shaping based on allowlisted emails
- profile-backed admin role fallback for internal testing and rollout continuity

### Upload And Scan Pipeline

- scan initiation endpoint
- signed upload flow
- direct browser upload to private storage
- scan submit endpoint
- queue-backed processing path with inline fallback
- scan list and scan detail endpoints

### Reports

- report history
- report detail rendering from real scan data
- print-ready report output
- signed media preview for image reports
- scan-history ledger with search, sorting, pagination, and bulk selection

### Phase 2 Design System And Workspace

- reusable ui primitives: Button (with router-link `to` prop), Badge, Card, StatCard,
  DataTable, Tabs, Drawer, Toast, EmptyState, Skeleton, Spinner, Popover (origin-aware,
  reduced-motion safe), CommandPalette
- command registry (`useRegisterCommands`) letting pages contribute page-scoped
  commands to the palette while mounted
- grouped app-shell information architecture (Overview / Workspace / Organization /
  Developer / Settings / Help) with notification bell + avatar menu on the shared
  Popover primitive
- shared loader hook `useResource` + dev-only `?state=` demo forcing
  (`useDemoState`) for reviewable loading/empty/error surfaces
- public Benchmark page (`/benchmark`) rendering the V0.1 report findings
- Media Upload page (`/app/uploads`): drag-and-drop zone with ForensicMediaFrame
  preview, processing-mode selection (quick/standard/deep), upload-into-queue state
  machine that auto-lands on the Verification Queue; dev-only `?demo=` affordance
- Verification Queue page (`/app/queue`): live pipeline stats + recent-jobs ledger
  with just-added highlight for new uploads
- mock scan lifecycle in `src/lib/mockApi.js`: in-memory scan store (localStorage
  persisted), `mockInitiateScan`/`mockSubmitScan`/`mockGetScan`, queue snapshot
  derived from the live store

### Admin Operations

- waitlist filtering
- review notes
- status updates
- invite generation
- CSV export
- audit trail writes
- registered user visibility
- verification request monitoring
- report inspection inside admin
- internal diagnostics and feature-state visibility
- persisted feature-flag controls inside admin
- organization readiness view
- analytics summary view
- audit-log workspace
- role and permission planning surface
- broader admin module navigation for jobs, reports, monitoring, flags, roles, and audit

## What Is Partial

- deeper upload safety beyond current front-end validation
- dashboard and admin redesign alignment with the final expected design quality
- queue reliability and cost posture
- session hardening
- richer operational observability
- broader cross-module admin search and filtering
- live notification delivery, billing operations, and API customer enablement

## What Is Deferred

- billing and subscriptions
- organization and team workflows
- API product
- video verification
- audio verification
- OpenAI integration
- Anthropic integration
- enterprise SSO

## Validation Snapshot

Recently confirmed against the current codebase and environment:

- frontend production build
- backend production build
- backend e2e health test
- GitHub remote read, clone, and fetch access
- Supabase project and table inspection access
- remote `profiles` migration applied successfully and verified
- remote `feature_flags` migration applied successfully and verified
- current frontend redesign changes compile successfully in production build

## Current Engineering Constraints

- the repository contains historical documents that must be kept clearly separated from current-state implementation docs
- Upstash Free is not suitable for always-on worker usage
- the multi-agent operating model (ADR 003) requires task packets, the review gate,
  and Founder approval before any commit
- `USE_MOCK` stays `true` through the MVP phase; it flips to `false` as part of
  Phase 3 backend integration
- the current documentation set is richer than its formatting consistency, so normalization remains an active documentation improvement area

## Important Files

### Frontend

- `src/App.jsx`
- `src/context/AuthContext.jsx`
- `src/lib/api.js` (USE_MOCK gate)
- `src/lib/mockApi.js` + `src/lib/mockData.js` (mock layer)
- `src/lib/supabase.js`
- `src/components/ui/*` (primitive kit)
- `src/components/app/AppShellLayout.jsx`
- `src/components/auth/ProtectedRoute.jsx`
- `src/pages/app/*`

### Backend

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/auth/*`
- `backend/src/account/*`
- `backend/src/admin/*`
- `backend/src/scans/*`
- `backend/src/queue/*`
- `backend/src/worker.ts`
- `backend/src/supabase/*`

### Data And Infra

- `supabase/migrations/0001_waitlist_auth.sql`
- `supabase/migrations/0002_scans.sql`
- `supabase/migrations/0003_admin_ops.sql`
- `supabase/migrations/0004_profiles.sql`
- `backend/fly.toml`
- `backend/fly.worker.toml`

## Collaboration Rules

- update this file after every major engineering phase
- update the roadmap and checklist when scope or sequence changes
- update setup and env docs when external services or variables change
- do not treat implementation as complete until docs and review are done
