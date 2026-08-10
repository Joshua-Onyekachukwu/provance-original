# Provance Feature And Phase Checklist

Last updated: 2026-08-07

## Purpose

This is the definitive engineering checklist for the MVP.

It complements `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` by turning roadmap phases into actionable feature-level tasks.

Status tags:

- Complete
- In Progress
- Not Started
- Deferred

## Phase Alignment

- Phase 1: public experience and conversion layer
- Phase 2: core app foundation and experience quality
- Phase 3: working MVP product completion
- Phase 4: verification pipeline reliability and report depth
- Phase 5: MVP security, observability, and release readiness
- Phase 6: production-ready MVP launch

## 1. Landing Website

### Global Public Experience

- [x] Complete: global navigation
- [x] Complete: footer
- [x] Complete: privacy page
- [x] Complete: terms page
- [x] Complete: cookies page
- [x] Complete: 404 page
- [x] Complete: responsive public layout baseline
- [ ] In Progress: keep docs and messaging synchronized with current product scope

### Homepage

- [x] Complete: hero
- [x] Complete: why Provance section
- [x] Complete: how it works section
- [x] Complete: use cases section
- [x] Complete: product showcase section
- [x] Complete: sample report teaser
- [x] Complete: pricing preview
- [x] Complete: FAQ / clarity section
- [x] Complete: conversion CTA flow

### Public Product Pages

- [x] Complete: about page
- [x] Complete: product page
- [x] Complete: methodology page
- [x] Complete: pricing page
- [x] Complete: security page
- [x] Complete: resources page
- [x] Complete: docs landing page
- [x] Complete: contact page
- [x] Complete: sample report page
- [x] Complete: sample report print page

### Marketing And Content Surfaces

- [x] Complete: waitlist page
- [ ] Deferred: blog
- [ ] Deferred: case studies
- [ ] Deferred: benchmark summaries
- [ ] Deferred: customer proof assets

### Authentication Entry Pages

- [x] Complete: sign-in page
- [x] Complete: accept invite page
- [x] Complete: password reset request page
- [x] Complete: password reset confirmation page
- [ ] Deferred: dedicated self-serve sign-up page

## 2. Application

### Shared Foundation And Polish

- [x] Complete: global error boundary with recoverable fallback (approved feature #1, shipped 2026-08-05)
- [x] Complete: formatter consolidation — all date/number/duration/storage formatters unified into `src/components/app/scanPresentation.js` (formatCount, formatDate, formatDateTime, formatScanTimestamp, formatShortDate, formatDateLong, formatTimeShort, formatHourShort, formatRelativeTime, formatPct, percentOf, formatCurrency, formatDurationMs, formatStorageGb, formatFileSize)
- [x] Complete: formatter locale pinned to en-US (formatDate + formatRelativeTime fallback were locale-default `toLocaleDateString(undefined, …)`; now `Intl.DateTimeFormat('en-US', …)` so output never shifts with the browser locale)
- [x] Complete: sample-report timestamp standardization — single canonical `analysisTimestampIso` in `sampleReportContent.js` rendered via `formatDateTime` on the landing, page, document, and print surfaces (was hardcoded and divergent: `2026-06-25` vs `2026-07-16`)
- [x] Complete: formatter test suite — **113-test suite** covering edge cases (nulls, NaN, zero, sub-second, invalid input, rounding and unit boundaries); full vitest suite **295/295** (2026-08-07)
- [x] Complete: formatter sign-off sweep — final grep for hand-rolled formatting (numbers/percents/dates) across forensic components and Sample Report surfaces; stragglers migrated (`AppBillingPage` → `formatStorageGb`, forensic `VeracityGauge` → `formatPct`); `scanPresentation.js` confirmed as the single source of truth for presentation formatting (2026-08-05)
- [x] Complete: sweep the legacy admin pages onto the ui kit primitives — Organizations + Feature Flags migrated in the prior pass; final sweep (2026-08-07) found and migrated the last `AdminTable` consumer (AnalyticsPage top-orgs table → `DataTable`), leaving **zero** legacy `AdminTable`/`AdminStatCard`/`AdminDrawer` imports anywhere in `src/pages/`

### App Shell And Navigation

- [x] Complete: protected `/app/*` route group
- [x] Complete: authenticated shell layout
- [x] Complete: sidebar navigation
- [x] Complete: redirect-preserving auth gate
- [x] Complete: access denied route
- [ ] In Progress: tighten information hierarchy across the whole app once the next approved dashboard and admin direction is documented
- [ ] In Progress: remove remaining placeholder and future-phase language across app surfaces that are still intentionally staged

### Dashboard

- [x] Complete: dashboard route and base layout
- [x] Complete: live scan-backed summary cards
- [x] Complete: recent activity / case linkage
- [x] Complete: stronger case triage density
- [x] Complete: explicit processing queue health surface
- [x] Complete: flagged report and failure triage panel
- [x] Complete: internal diagnostics panel for Founder testing
- [x] Complete: richer operational quick actions
- [x] Complete: fast drill-in panels linking dashboard summary to uploads, reports, and admin actions
- [ ] In Progress: pause further redesign until a new approved dashboard structure and UX direction are documented

### Upload Workflow

- [x] Complete: authenticated upload page
- [x] Complete: image file validation
- [x] Complete: signed upload initiation
- [x] Complete: direct browser upload to private storage
- [x] Complete: submit scan action
- [x] Complete: status polling
- [x] Complete: better failure recovery messaging
- [ ] Not Started: resumable or chunked uploads for large assets
- [ ] Deferred: video upload flow
- [ ] Deferred: audio upload flow

### Reports Workspace

- [x] Complete: reports list
- [x] Complete: report detail route
- [x] Complete: print-ready report route
- [x] Complete: signed media preview for image reports
- [x] Complete: denser triage UX for repeated review
- [x] Complete: better evidence navigation and section scanning
- [ ] Not Started: share links
- [ ] Approved 2026-08-04: dedicated PDF export pipeline (client-side)
- [ ] Deferred: video and audio report support

### Account Workspace

- [x] Complete: account route
- [x] Complete: backend-backed profile persistence
- [x] Complete: current-session identity hydration
- [x] Complete: broader account preferences and validation polish
- [ ] Deferred: billing and plan management
- [ ] Deferred: API key management

### Team Workspace

- [x] Complete: guarded placeholder route
- [ ] In Progress: collaboration architecture is framed, but real shared-workflow implementation remains deferred
- [ ] Deferred: actual team workflows
- [ ] Deferred: organization membership model
- [ ] Deferred: shared case ownership and collaboration

### Admin Workspace

- [x] Complete: all 12 admin pages shipped and verified — Overview, Waitlist, Users, Organizations, Feature Flags, Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings — mock-backed with loading/empty/error states and `?state=` demo forcing (2026-08-07); no admin placeholders remain
- [x] Complete: admin-gated route
- [x] Complete: waitlist search and filtering
- [x] Complete: notes and status review
- [x] Complete: invite creation
- [x] Complete: CSV export
- [x] Complete: better visibility into registered users
- [x] Complete: better visibility into verification requests
- [x] Complete: report inspection controls inside admin
- [x] Complete: job monitoring view
- [x] Complete: internal logs and diagnostics view
- [x] Complete: feature-state visibility inside admin
- [x] Complete: admin actions for invite lifecycle and user lookup
- [ ] In Progress: pause further redesign until the next approved admin workflow and design direction are documented
- [ ] Not Started: admin search and filter model across waitlist, users, scans, and reports

## 3. Backend And System

### Auth And Identity

- [x] Complete: sign-in endpoint
- [x] Complete: invite acceptance endpoint
- [x] Complete: password reset request endpoint
- [x] Complete: password reset confirm endpoint
- [x] Complete: refresh endpoint
- [x] Complete: current-session identity endpoint
- [x] Complete: backend-backed profile endpoints
- [ ] Not Started: cookie-based session transport
- [ ] Not Started: fuller authorization model beyond allowlists and route guards

### Verification Pipeline

- [x] Complete: scan record creation
- [x] Complete: image-first processing path
- [x] Complete: queue-backed processing option
- [x] Complete: inline processing fallback
- [x] Complete: structured `result_payload`
- [ ] In Progress: end-to-end reliability validation in deployed environments
- [ ] In Progress: better retry and failure classification
- [ ] Not Started: payload schema versioning strategy
- [ ] Deferred: multi-media orchestration

### Storage And Data

- [x] Complete: Supabase scans table
- [x] Complete: waitlist, invite, and auth audit tables
- [x] Complete: profiles table migration in repo
- [x] Complete: private uploads bucket expectation
- [x] Complete: reconcile remote schema state with local migration truth
- [ ] Not Started: retention policy documentation for uploaded artifacts

### Security

- [x] Complete: request validation
- [x] Complete: throttling baseline
- [x] Complete: helmet baseline
- [x] Complete: request IDs
- [x] Complete: global exception filtering
- [x] Complete: admin allowlist gating
- [ ] In Progress: auth transport hardening
- [ ] Not Started: expanded RLS review
- [ ] Not Started: bot protection
- [ ] Not Started: deeper file inspection before processing
- [ ] Not Started: malware scanning before beta

### Observability And Operations

- [x] Complete: health endpoint
- [ ] Approved 2026-08-04: Sentry integration (errors)
- [ ] Approved 2026-08-04: product analytics integration (PostHog)
- [ ] Not Started: queue metrics and backlog monitoring
- [ ] Not Started: worker error alerting
- [ ] Not Started: founder-friendly operational diagnostics surface
- [x] Complete: admin analytics + monitoring pages (Analytics + Monitoring pages, real `GET /admin/analytics` endpoint)
- [ ] Approved 2026-08-04: global error boundary + crash recovery
- [x] Complete: scan deduplication (hash-based) — worker-side SHA-256 lookup + reused payload (migration 0013, shipped 2026-08-08)
- [ ] Approved 2026-08-04: webhooks UI (later release)
- [ ] Approved 2026-08-04: usage/entitlement enforcement (later release)
- [ ] Approved 2026-08-04: evidence appendix in reports (later release)

## 4. Infrastructure And Setup

### Required For Current MVP Work

- [x] Complete: GitHub repository access verified
- [x] Complete: Supabase project access verified
- [x] Complete: Fly deployment files present
- [x] Complete: Vercel deployment path present
- [ ] In Progress: decide queue strategy for dev and shared environments
- [ ] Not Started: Cloudflare account and domain strategy confirmation
- [ ] Approved 2026-08-04: Sentry setup
- [ ] Approved 2026-08-04: PostHog setup
- [ ] Not Started: transactional email provider selection

### Explicitly Deferred

- [ ] Deferred: OpenAI integration
- [ ] Deferred: Anthropic integration
- [ ] Deferred: Stripe and billing setup
- [ ] Deferred: Neon migration
- [ ] Deferred: enterprise SSO

## 5. Release Gates

These are required before a phase can move to review:

- [ ] Build passes
- [ ] Backend build passes
- [ ] Relevant tests pass
- [ ] Regressions checked in the affected flows
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Branch pushed
- [ ] Pull request opened
- [ ] Founder review requested

## Immediate Execution Queue

After documentation handover and the next approved dashboard and admin specification, the next implementation sequence is:

1. dashboard maturity against the approved design direction
2. admin workspace maturity against the approved workflow and visual direction
3. session-hardening entry work
4. report workflow utility
5. upload and processing reliability
6. observability baseline
