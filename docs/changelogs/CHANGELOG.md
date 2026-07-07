# Provance — Changelog

## [2026-07-07] - Dashboard And Sidebar Redesign

### Updated
- `src/components/app/AppShellLayout.jsx` - Reworked the authenticated shell into a darker analyst control rail with clearer route context, denser identity state, and stronger navigation hierarchy
- `src/pages/app/AppDashboardPage.jsx` - Redesigned the dashboard into an analyst-facing operations surface with a verification ledger, system posture panel, denser status metrics, and live signal readouts
- `README.md` - Updated the MVP scope and immediate priorities to reflect the redesigned analyst workspace
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the dashboard and sidebar redesign in the current-state tracker
- `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md` - Added the redesigned analyst workspace to the handoff summary

### Validated
- `npm run build`
- browser review of the updated dashboard and sidebar through the local preview

## [2026-07-07] - MVP Auth Recovery, Admin Operations, And Structured Report Output

### Added
- `backend/src/admin/*` - Admin module, controller, DTOs, and service for waitlist review and invite issuance
- `backend/src/common/guards/admin.guard.ts` - Admin allowlist enforcement based on `ADMIN_EMAILS`
- `backend/src/auth/dto/refresh-session.dto.ts` - Session refresh input DTO
- `supabase/migrations/0003_admin_ops.sql` - Admin-ops schema additions for notes and invite metadata
- `src/pages/AcceptInvitePage.jsx` - Invite activation page
- `src/pages/RequestPasswordResetPage.jsx` - Password reset request page
- `src/pages/ResetPasswordConfirmPage.jsx` - Password reset confirmation page
- `src/pages/app/AppAdminPage.jsx` - Internal admin workspace
- `src/pages/app/AppReportPrintPage.jsx` - Printable report page
- `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md` - Admin setup and usage guide
- `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md` - Detailed engineer handoff
- `docs/checkpoints/*` - Phase, admin, verification pipeline, and report checkpoint documents

### Updated
- `backend/src/auth/auth.controller.ts` - Added session refresh endpoint
- `backend/src/auth/auth.service.ts` - Added permission payloads and session refresh handling
- `backend/src/config/env.validation.ts` - Added `ADMIN_EMAILS` validation
- `backend/src/scans/scans.service.ts` - Replaced the single placeholder signal with image-first evidence extraction, fingerprints, metadata parsing, and structured report output
- `backend/.env.example` - Added `ADMIN_EMAILS`
- `src/lib/api.js` - Added automatic token refresh, admin API helpers, and auth recovery helpers
- `src/context/AuthContext.jsx` - Added admin permission handling
- `src/App.jsx` - Added auth-recovery, admin, and printable report routes
- `src/components/app/AppShellLayout.jsx` - Added admin navigation support
- `src/components/auth/ProtectedRoute.jsx` - Added admin-gated route support
- `src/pages/SignInPage.jsx` - Added recovery and invite entry links
- `src/pages/app/AppReportsPage.jsx` - Added report ID display and printable report access
- `src/pages/app/AppUploadsPage.jsx` - Updated workflow copy to reflect the new MVP evidence payload
- `README.md` - Updated current MVP scope and route inventory
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded auth recovery, admin ops, and report/output progress
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md` - Added admin environment configuration

### Validated
- `npm run build`
- `npm run backend:build`
- `npm --prefix backend test -- --runInBand`
- `npm run backend:test:e2e`
- `npm run lint`
- `npm run check:launch`
- remote Supabase migration apply for `0003_admin_ops.sql`

## [2026-07-07] - Queue Worker And Report Workspace

### Added
- `backend/src/queue/*` - Queue module, Redis connection parsing, and job enqueue service for worker-backed scan processing
- `backend/src/worker.ts` - Dedicated worker runtime for background scan processing
- `backend/Dockerfile.worker` - Separate worker image for Fly deployment
- `backend/fly.worker.toml` - Fly configuration for the worker service
- `src/components/app/ScanStatusBadge.jsx` - Shared scan-status badge for dashboard and reports surfaces
- `src/components/app/scanPresentation.js` - Shared scan formatting and verdict presentation helpers

### Updated
- `backend/src/scans/scans.service.ts` - Enqueues scans into Redis when configured and processes them through the worker path
- `backend/src/main.ts` - Explicitly binds the backend service to `0.0.0.0` for Fly machine networking
- `backend/src/config/env.validation.ts` - Added Redis URL, queue name, and worker concurrency validation
- `backend/package.json` - Added the worker start script and queue dependencies
- `src/pages/app/AppDashboardPage.jsx` - Replaced placeholder dashboard stats with live scan-backed metrics and recent case links
- `src/pages/app/AppReportsPage.jsx` - Replaced the placeholder reports state with real case listing and report detail rendering
- `src/pages/app/AppUploadsPage.jsx` - Added direct navigation into report review after a scan completes
- `src/components/app/AppShellLayout.jsx` - Updated shell messaging to reflect the live MVP workspace instead of the old Phase 4 label
- `src/App.jsx` - Added `/app/reports/:scanId` report-detail routing
- `.env.example` - Expanded the frontend template as a clearer single source of truth
- `backend/.env.example` - Added queue and worker environment template values
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md` - Added ready-to-paste platform values and current configuration status
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md` - Documented worker deployment and queue environment setup
- `docs/engineering/PHASE_TASK_LIST.md` - Updated the phase map to reflect queue-backed processing, report surfaces, and the future dashboard redesign
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the report workspace and worker-backed scan processing status

### Validated
- `npm run check:launch`
- Fly deployment of `provance-api`
- Fly deployment of `provance-worker`
- live `GET https://provance-api.fly.dev/v1/health`

## [2026-07-07] - Phase 5 Upload Workflow Foundation

### Added
- `backend/src/scans/*` - Scan module with signed-upload initiation, submit endpoint, scan listing, and scan detail payloads
- `backend/src/common/guards/supabase-auth.guard.ts` - Supabase JWT enforcement for authenticated endpoints
- `backend/src/common/decorators/current-user.decorator.ts` - Request user decorator for authenticated controllers
- `supabase/migrations/0002_scans.sql` - Scan table, RLS policies for owner access, and the private uploads bucket definition
- `src/lib/supabase.js` - Supabase client for signed Storage uploads (no persisted browser session)

### Updated
- `src/pages/app/AppUploadsPage.jsx` - Replaced the placeholder with a real scan-initiate, upload, submit, and status polling workflow
- `src/lib/api.js` - Added automatic Authorization bearer header support and scan API helpers
- `backend/src/supabase/supabase.service.ts` - Added per-request public client creation with bearer-token header support
- `backend/src/app.module.ts` - Registered the scan module
- `backend/src/config/env.validation.ts` - Added upload-related environment validation defaults
- `.env.example` - Added Supabase frontend environment keys for Storage uploads
- `backend/.env.example` - Added scan table and upload bucket environment settings
- `package.json` - Added frontend dependency on `@supabase/supabase-js` for Storage uploads
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded Phase 5 upload foundation status and validation requirements

### Validated
- `npm run build`
- `npm run check:launch`

## [2026-07-07] - Authenticated App Shell

### Added
- `src/context/AuthContext.jsx` - Frontend auth state with session restore, sign-in, sign-out, workspace context, and profile preferences
- `src/components/auth/ProtectedRoute.jsx` - Protected-route gate with redirect preservation and team-permission enforcement
- `src/components/app/AppShellLayout.jsx` - Authenticated layout shell and navigation for signed-in users
- `src/components/app/AppStatePanel.jsx` - Shared empty, loading, success, and error presentation surface for app pages
- `src/pages/app/*` - Initial dashboard, uploads, reports, account, team, and access denied pages

### Updated
- `src/App.jsx` - Split public and authenticated layouts and introduced `/app/*` routing
- `src/pages/SignInPage.jsx` - Signed-in redirect handling and auth-context integration
- `src/components/Navbar.jsx` - Session-aware navigation that surfaces Dashboard and Sign Out when authenticated
- `backend/src/main.ts` - Default CORS allow-list now includes `http://localhost:3000` and `http://localhost:5173`
- `backend/src/config/env.validation.ts` - Default frontend origins now include both Vite ports for local development
- `backend/.env.example` - Updated default `FRONTEND_ORIGIN` list for local development
- `backend/README.md` - Documented the recommended local CORS origin list
- `docs/engineering/PHASE_TASK_LIST.md` - Updated immediate priorities after the app shell work
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the Phase 4 app shell status and validation notes
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` - Added frontend protected routing coverage and clarified production session strategy still required

### Validated
- `npm run build`
- `npm run check:launch`
- browser validation of sign-in redirect, `/app` protected routes, account preference persistence, and team denial state

## [2026-07-07] - Live Supabase Auth And Waitlist Foundation

### Added
- `backend/src/auth/auth.service.spec.ts` - Targeted unit coverage for fresh auth-client usage, sign-in failure auditing, and invite rollback handling

### Updated
- `backend/src/auth/auth.service.ts` - Replaced scaffold auth behavior with live Supabase-backed sign-in, invite activation hardening, rollback safeguards, and audit-event writes
- `backend/src/supabase/supabase.service.ts` - Switched public auth access to per-request Supabase client creation to prevent shared in-memory session state across requests
- `backend/src/waitlist/waitlist.service.ts` - Verified live persistence behavior against the connected Supabase waitlist table
- `backend/src/config/env.validation.ts` - Continued validation support for the live Supabase environment configuration
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Updated the repo status to reflect live waitlist, invite, sign-in, and audit verification
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` - Expanded the active security baseline with per-request auth isolation and live auth validation coverage

### Validated
- `npm --prefix backend run test -- --runInBand`
- `npm run backend:build`
- `npm run backend:test:e2e`
- `npm run check:launch`
- live `POST /v1/waitlist/applications` submission verified against remote Supabase
- live `POST /v1/auth/invites/accept` and `POST /v1/auth/sign-in` verified against remote Supabase
- live `auth_audit_events` writes verified for invite acceptance and sign-in

### Notes
- remote Supabase tables are now active for `waitlist_applications`, `access_invites`, and `auth_audit_events`
- the next auth phase should focus on secure frontend session handling, recovery UX, invite issuance tooling, and protected routes

## [2026-07-06] - Backend Security Foundation And Launch Checks

### Added
- `backend/src/common/filters/global-exception.filter.ts` - Sanitized API error responses with request IDs and timestamps
- `backend/src/common/guards/api-throttler.guard.ts` - Proxy-aware throttling tracker for backend request limits
- `backend/src/config/env.validation.ts` - Startup validation and normalization for critical backend environment settings
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` - Repeatable security and launch gate for backend and auth phases

### Updated
- `backend/src/main.ts` - Added request ID tracing, `helmet`, stricter CORS handling, global exception filtering, and safer startup configuration
- `backend/src/app.module.ts` - Added validated config bootstrapping and global throttling
- `backend/src/auth/auth.controller.ts` - Added tighter rate limiting for auth routes
- `backend/src/waitlist/waitlist.controller.ts` - Added tighter rate limiting for waitlist routes
- `backend/src/health/health.controller.ts` - Reduced health response exposure and skipped throttling for health checks
- `backend/src/auth/auth.service.ts` - Adjusted scaffold responses to reduce configuration leakage
- `backend/src/waitlist/waitlist.service.ts` - Reduced internal detail exposure in public write responses
- auth and waitlist DTO files - Added normalization, trimming, and stricter token and password constraints
- `backend/.env.example` - Added security-related backend environment settings
- `backend/README.md` - Documented the backend security baseline
- `README.md` - Added launch-check commands and linked the security checklist
- `package.json` - Added `backend:test:e2e` and `check:launch` scripts
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Updated current-state tracking for the new security baseline

### Validated
- `npm run backend:build`
- `npm run backend:test:e2e`
- `npm run check:launch`

## [2026-07-06] - Root Readme And Phase Task Planning Update

### Added
- `docs/engineering/PHASE_TASK_LIST.md` - Phase-by-phase execution list covering public site work, auth, backend, app shell, workflows, reporting, team features, security, API foundations, and MVP launch readiness

### Updated
- `README.md` - Replaced the default Vite template with a real project overview, architecture summary, setup instructions, workflow rules, and current priorities
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Linked the new root overview and phase task list into the current implementation status flow

### Notes
- This update establishes the repo-level direction documents that should be maintained after every major engineering phase

## [2026-07-06] - Waitlist Auth Backend Scaffold And Legal Page Expansion

### Added
- `backend/` - New NestJS backend scaffold for the long-term Provance API
- `backend/src/health/*` - Health module and endpoint
- `backend/src/waitlist/*` - Waitlist module, DTO, controller, and service
- `backend/src/auth/*` - Auth module, DTOs, controller, and service scaffold
- `backend/src/supabase/*` - Supabase-ready service layer
- `supabase/migrations/0001_waitlist_auth.sql` - Starter waitlist and auth-adjacent schema
- `backend/.env.example` - Backend environment template
- `.env.example` - Frontend API base URL template
- `src/lib/api.js` - Shared frontend API helper for waitlist and sign-in calls
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Current system status, completed work, and handoff notes

### Updated
- `src/pages/WaitlistPage.jsx` - Waitlist form now targets the new API shape and supports loading, success, and error states
- `src/pages/SignInPage.jsx` - Sign-in form now targets the new API shape and supports loading, success, and error states
- `src/pages/PrivacyPage.jsx` - Expanded into fuller privacy-policy style content
- `src/pages/TermsPage.jsx` - Expanded into fuller terms-of-service style content
- `src/pages/CookiesPage.jsx` - Expanded into fuller cookies-policy style content
- `src/pages/ContactPage.jsx` - Support and pilot copy refined for production tone
- `src/pages/SecurityPage.jsx` - Security copy refined to remove roadmap phrasing
- `src/components/WhyProvance.jsx` - Redesigned to use a four-card two-by-two layout aligned with the Use Cases section
- `package.json` - Added root scripts for backend dev, build, and start

### Validated
- Frontend production build completed successfully
- Backend NestJS build completed successfully
- Backend e2e health test passed

### Notes
- Backend dependency installation hit an npm resolver issue in this environment
- Validation completed successfully using `pnpm` installation followed by backend build and e2e checks

## [2026-06-26] — Investor Data Room & Seed Round Outreach Strategy

### Added
- `docs/fundraising/data-room/DATA_ROOM_INDEX.md` — Master data room index linking to 30+ documents across all categories with quick-reference metrics table.

- `docs/fundraising/seed-round-outreach-strategy.md` — Comprehensive outreach strategy including:
  - 15 targeted VC firms across 3 tiers (Costanoa, Bessemer, Felicis, a16z, Lightspeed, Accel, Sequoia, GV, Greylock, Madrona, Harpoon, Decibel, Susa, AI Fund, SignalFire)
  - 4 target angel investors (Elad Gil, Nat Friedman, Lachy Groom, Sarah Guo)
  - 3-phase outreach sequence (prep → first wave → diligence & close)
  - Meeting agenda structures and data room sharing protocol

- `docs/fundraising/investor-update-template.md` — Structured investor update template with metrics table, highlights, challenges, asks, forward look, and cadence guidelines

### Updated
- Changelog updated to reflect all recent additions

## [2026-06-25] — Business Strategy & Investor Readiness

### Added
- `docs/finance/BUSINESS_STRATEGY.md` — Comprehensive strategy document
- `docs/finance/3-year-financial-model.md` — Detailed financial projections
- `docs/fundraising/investor-pitch-deck.md` — 16-slide investor deck
- `docs/decisions/001-revenue-model-ratification.md` — Decision record
- `docs/sales/sales-enablement-courtroom-test.md` — Sales enablement

### Updated
- `docs/business/investor-pitch-deck-outline.md` — Refined for $2M-$5M seed round
