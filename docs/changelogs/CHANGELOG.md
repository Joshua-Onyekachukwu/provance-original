# Provance — Changelog

## [2026-07-23] - Planning, Roadmap, Architecture, And Setup Documentation Sync

### Added
- `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md` - Official stack reference for the MVP and early growth architecture
- `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md` - Pre-coding setup and approval checklist
- `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md` - Current MVP service and infrastructure configuration guide
- `docs/engineering/TREZO_TEMPLATE_EVALUATION.md` - Audit of the Trezo template and recommendations for Provance dashboard and admin work

### Updated
- `README.md` - Replaced outdated workflow and priority notes with the current MVP focus and source-of-truth doc set
- `docs/README.md` - Reorganized the canonical documentation order and roles
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Rebuilt the roadmap around the current MVP sequence and approval gate
- `docs/engineering/PHASE_TASK_LIST.md` - Replaced the old phase summary with a definitive feature and phase checklist
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` - Formalized the standing workflow, review, and merge rules
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Synced implementation truth to the current product and planning state
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md` - Split environment needs into required-now and required-later groups
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md` - Documented the current queue cost guidance and deployment rules
- `docs/architecture/system-design-document.md` - Updated the system design to match the real MVP stack and target direction
- `docs/project-state/README.md` - Updated the living-state documentation priorities
- `docs/project-state/current-feature-status.md` - Synced feature statuses to the current MVP focus
- `docs/project-state/development-priorities.md` - Moved active priority from landing-page work to app and system work
- `docs/project-state/what-is-in-development.md` - Synced active work to dashboard, admin, reports, and reliability
- `docs/project-state/overall-project-architecture.md` - Synced the current architecture and preserved the replaceable system boundaries
- `docs/project-state/outstanding-questions.md` - Recorded current blockers, risks, and unresolved setup items
- `docs/project-state/engineering-roadmap.md` - Synced the quick-reference roadmap to the canonical roadmap
- `docs/project-state/product-roadmap.md` - Synced the product summary roadmap to the current execution focus
- `docs/project-state/technical-risks.md` - Updated the current delivery and infrastructure risks
- `docs/project-state/recommended-improvements.md` - Updated the current improvement recommendations
- `docs/project-state/decision-log.md` - Recorded current planning, infrastructure, and template-adoption decisions

### Notes
- no production feature code was added in this update
- this change set exists to align the repository before the next implementation phase begins
- the remote Supabase `profiles` migration was also applied and verified
- the planning package was approved and Phase 0 was closed in the roadmap

## 2026-07-23 - Dashboard and admin Phase 2 closeout pass

### Updated
- `src/pages/app/AppDashboardPage.jsx` - Upgraded the dashboard into a stronger command surface with queue posture, triage panels, quick actions, and faster drill-in paths
- `src/pages/app/AppAdminPage.jsx` - Expanded admin into a broader control room with users, verification requests, request diagnostics, and feature-state visibility
- `src/components/app/AppShellLayout.jsx` - Updated admin navigation and page framing to match the broader control-room role
- `backend/src/admin/admin.service.ts` - Expanded admin dashboard payload with users, scans, diagnostics, and feature-state data
- `docs/engineering/PHASE_TASK_LIST.md` - Synced dashboard and admin completion progress
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Synced current implementation scope after the dashboard and admin pass
- `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md` - Documented the current admin surface in more detail

### Validation
- frontend production build passed
- backend production build passed
- backend e2e health test passed

## 2026-07-24 - Phase 2 closeout completion pass

### Updated
- `src/pages/app/AppReportsPage.jsx` - Expanded reports into a denser triage and evidence-review workspace with filters, findings, and recommendations
- `src/pages/app/AppUploadsPage.jsx` - Improved upload workflow clarity, stage visibility, failure recovery, and next-step actions
- `src/pages/app/AppAccountPage.jsx` - Improved account posture, profile clarity, and settings polish
- `backend/src/common/guards/admin.guard.ts` - Added profile-backed admin role fallback to support safer internal testing
- `backend/src/admin/admin.controller.ts` - Added admin feature-flag update endpoint
- `backend/src/admin/admin.service.ts` - Added persisted feature-flag loading and update support
- `backend/src/admin/dto/update-feature-flag.dto.ts` - Added validation for admin feature-flag updates
- `src/lib/api.js` - Added frontend helper for admin feature-flag updates
- `supabase/migrations/0005_feature_flags.sql` - Added persisted feature-flag table and default rollout flags
- `docs/engineering/PHASE_TASK_LIST.md` - Marked the remaining Phase 2 closeout work complete
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Moved Phase 2 to review-ready status
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Marked Phase 2 as in review

### Validation
- frontend production build passed
- backend production build passed
- backend e2e health test passed
- remote Supabase feature flag migration applied successfully

## 2026-07-24 - Trezo audit direction reset and verified hero fix

### Updated
- `src/components/Hero.jsx` - Replaced the hero supporting copy and removed the `Image-first early access` attribute from the live hero component
- `docs/engineering/TREZO_TEMPLATE_EVALUATION.md` - Expanded the Trezo review into a detailed dashboard and admin implementation plan mapped to Provance pages
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Reflected that Phase 2 remains in progress pending the Trezo-guided dashboard/admin direction
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Moved Phase 2 back to in-progress status after the UI direction reset

### Validation
- verified the live hero route uses `src/components/Hero.jsx`
- verified the removed hero attribute string no longer exists in `src/`

## 2026-07-24 - Dashboard and admin platform redesign expansion

### Added
- `src/components/app/AppWorkspacePrimitives.jsx` - Shared section, metric, card, and pill primitives for the broader Trezo-guided app redesign

### Updated
- `src/components/app/AppShellLayout.jsx` - Refined route framing and page metadata so the expanded platform surfaces read as a coherent enterprise workspace
- `src/pages/app/AppAdminPage.jsx` - Expanded the internal control room into broader modules for organizations, jobs, reports, analytics, monitoring, flags, roles, and audit
- `src/pages/app/AppBillingPage.jsx` - Rebuilt billing from a placeholder into a structured commercial readiness surface with plan, invoice, and payment posture sections
- `src/pages/app/AppDeveloperPage.jsx` - Rebuilt the developer route into a structured API portal surface with key, webhook, SDK, and documentation patterns
- `src/pages/app/AppHistoryPage.jsx` - Added sorting, pagination, and bulk-selection behavior to the scan ledger
- `src/pages/app/AppNotificationsPage.jsx` - Rebuilt notifications into a real in-app event center fed by recent verification activity and system notices
- `src/pages/app/AppSettingsPage.jsx` - Rebuilt settings into a broader account, security, session, and preference surface
- `src/pages/app/AppTeamPage.jsx` - Rebuilt the team route into a collaboration architecture surface instead of a simple access placeholder
- `src/pages/app/AppUploadsPage.jsx` - Added drag-and-drop intake framing and stronger queue, ETA, and validation posture panels
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Synced the current-state documentation with the expanded platform redesign scope

### Validation
- frontend production build passed

## 2026-07-24 - Documentation preservation and temporary handover update

### Added
- `docs/engineering/DOCUMENTATION_STATUS_AND_HANDOVER_2026-07-24.md` - Final documentation status report and temporary handover package for continuation from another environment

### Updated
- `README.md` - Preserved as the top-level project entry point for the documentation-first handover
- `docs/README.md` - Added the handover report to the canonical reading order and updated the active focus
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Recorded the documentation-preservation focus and the pause on further dashboard and admin redesign work pending a new approved direction
- `docs/engineering/PHASE_TASK_LIST.md` - Reflected the dashboard and admin redesign pause and clarified the next execution queue
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the handover focus, paused UI direction, and remaining documentation-normalization constraint

### Notes
- this update is documentation-only
- the Trezo reference template and third-party template code remain excluded from the documentation handover branch

## [2026-07-16] - Phase 2 Expansion: Auth, Account Foundation, And Responsive App Polish

### Added
- `backend/src/account/account.module.ts` - New account module for authenticated profile management
- `backend/src/account/account.controller.ts` - Authenticated account profile read and update endpoints
- `backend/src/account/account.service.ts` - Server-backed profile initialization, profile updates, and permission shaping
- `backend/src/account/dto/update-profile.dto.ts` - Validated account profile update DTO
- `supabase/migrations/0004_profiles.sql` - Profiles table, RLS policies, and update timestamp trigger

### Updated
- `backend/src/auth/auth.controller.ts` - Added `GET /v1/auth/me` for current signed-in identity hydration
- `backend/src/auth/auth.service.ts` - Auth responses now include backend-hydrated profile and permission state
- `backend/src/auth/auth.module.ts` - Wired auth into the new account module
- `backend/src/app.module.ts` - Registered the account module
- `backend/src/auth/auth.service.spec.ts` - Updated auth service coverage for the new account-aware flow
- `src/lib/api.js` - Added account profile and current-viewer API helpers
- `src/context/AuthContext.jsx` - Replaced local-only profile persistence with backend-backed profile hydration and save flow
- `src/components/app/AppShellLayout.jsx` - Added stronger mobile and tablet navigation behavior in the authenticated shell
- `src/pages/app/AppAccountPage.jsx` - Connected account settings to real backend persistence and improved save-state handling
- `src/pages/app/AppUploadsPage.jsx` - Refined spacing and typography for better smaller-screen readability
- `src/pages/app/AppReportsPage.jsx` - Refined spacing and typography for better smaller-screen readability
- `src/pages/app/AppAdminPage.jsx` - Refined spacing and typography for better smaller-screen readability
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Expanded Phase 2 to include auth and backend foundation work
- `docs/project-state/engineering-roadmap.md` - Synced the summary roadmap to the updated Phase 2 scope
- `docs/project-state/decision-log.md` - Recorded the roadmap-canonical rule and the expanded Phase 2 decision
- `docs/project-state/current-feature-status.md` - Updated profile persistence and authenticated app status
- `docs/project-state/overall-project-architecture.md` - Reflected backend-hydrated identity and the new account module
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Updated implementation notes for account/profile foundation
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` - Documented the current auth and account endpoint surface

### Validated
- `npm run build`
- `npm run lint`
- `npm run backend:build`
- `npm --prefix backend run test -- --runInBand`
- `npm run backend:test:e2e`
- `GET http://localhost:3000/app/account`
- `GET http://localhost:4000/v1/health`

### Notes
- frontend lint still shows only the same pre-existing warnings in `src/context/AuthContext.jsx` and `src/pages/app/AppReportPrintPage.jsx`
- current auth transport is still token-based in the browser; hardened cookie transport remains a later security-hardening phase

## [2026-07-07] - Report Refinement, Broader Dashboard Copy, And Local Admin Test Pattern

### Updated
- `backend/src/scans/scans.service.ts` - Added signed asset preview URLs to scan detail responses and included result payloads in scan listings for richer report surfaces
- `backend/.env.example` - Added `founder.admin@provance.local` as the documented local admin example inside `ADMIN_EMAILS`
- `src/pages/app/AppReportPrintPage.jsx` - Rebuilt the printable report into a more professional report document with analyzed media preview, executive summary, scorecards, metadata, findings, timeline, recommendations, and supporting evidence
- `src/pages/app/AppReportsPage.jsx` - Added inline media preview support on report detail and rewrote report language toward broader verification use cases
- `src/pages/app/AppDashboardPage.jsx` - Repositioned dashboard language away from narrow legal-only phrasing toward broader verification workflows
- `src/components/app/AppShellLayout.jsx` - Renamed and refined shell copy to present the app as a verification workspace rather than an analyst console
- `src/pages/app/AppUploadsPage.jsx` - Rewrote upload states and helper text to match the updated brand positioning
- `src/pages/app/AppAdminPage.jsx` - Refined internal admin copy and helper text
- `src/pages/app/AppAccountPage.jsx` - Refined account and notification copy
- `src/pages/app/AppTeamPage.jsx` - Refined team placeholder language
- `src/pages/app/AppAccessDeniedPage.jsx` - Refined restricted-access copy
- `src/pages/SignInPage.jsx` - Refined access messaging and onboarding language
- `src/pages/AcceptInvitePage.jsx` - Refined activation copy
- `src/pages/RequestPasswordResetPage.jsx` - Refined reset-request copy
- `src/pages/ResetPasswordConfirmPage.jsx` - Refined recovery confirmation copy
- `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md` - Documented the local admin test-account pattern and local-only usage guidance
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the report refinement and copy-positioning pass
- `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md` - Added the latest refinement-pass handoff notes and resume point
- `README.md` - Updated the current MVP scope and immediate priorities to reflect the refined report and paused-next-step posture

### Validated
- `npm run build`
- `npm run backend:build`
- diagnostics on the edited frontend and backend files

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
