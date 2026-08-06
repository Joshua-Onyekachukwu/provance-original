# Provance — Changelog

## [2026-08-06] - Org Invite Acceptance Joins The Roster

### Changed
- `backend/src/auth/auth.service.ts` - `acceptInvite` now resolves **organization invites first** by raw `token` on `organization_invites` (the token `POST /organization/invites` issues), falling back to the existing waitlist `access_invites` hashed-token flow; new `acceptOrganizationInvite` creates the auth user, enforces the seat limit (mirroring the organization service's plan check), inserts the `organization_members` row with the invited role/team, marks the invite accepted, and rolls back (user deletion + invite restore) on any failure; org table names are config-backed via `SUPABASE_ORGANIZATIONS_TABLE` / `SUPABASE_ORGANIZATION_MEMBERS_TABLE` / `SUPABASE_ORGANIZATION_INVITES_TABLE`
- `backend/src/config/env.validation.ts` + `backend/.env.example` - the three organization table keys (plus `SUPABASE_TEAMS_TABLE`) are now registered with schema-matching defaults

### Notes
- `organization_invites.token` is stored plaintext (schema default) and matched verbatim — distinct from `access_invites.token_hash`; the two flows now share one `POST /auth/invites/accept` endpoint

## [2026-08-06] - Workspace Activity CSV Export

### Changed
- `src/pages/app/AppActivityPage.jsx` - the workspace Activity Log page now exports its filtered event view to CSV using the same shared helpers (`buildCsv`/`downloadCsv` from `src/lib/csv.js`) and the identical 6-column contract as the admin Audit Logs page (`Timestamp, Actor, Action, Severity, Resource type, Resource id`), so both surfaces export identically; new header **Export CSV** button (disabled when the view is empty) with download icon, success toast (`Activity log exported — N events in the CSV.`), and a matching `activity.export-csv` ⌘K command

## [2026-08-06] - Real /admin/audit-logs Backend Slice

### Added
- `supabase/migrations/0008_audit_logs.sql` - `public.audit_logs` table (id, actor_email, action, severity with check constraint, entity_type/entity_id, details jsonb, created_at) with RLS enabled (service-role only), indexes on created_at desc / action / severity, and 15 seeded rows mirroring the frontend `mockAuditEvents` contract so the real path renders data on day one

### Changed
- `backend/src/admin/admin.service.ts` - `listAuditLogs` now reads from the `audit_logs` table (configurable via `SUPABASE_AUDIT_LOGS_TABLE`, default `audit_logs`) instead of the phantom `auth_audit_events`; severity is read from the stored row with the shared `auditSeverity(action)` map as fallback for legacy rows; `getDashboard` recent-audit read and `insertAdminAuditEvent` write moved onto the same table (admin actions now appear in the audit log they're viewing); monitoring `db_performance.tables` label corrected to `audit_logs`
- `backend/src/config/env.validation.ts` + `backend/.env.example` - `SUPABASE_AUDIT_LOGS_TABLE` registered (default `audit_logs`)

### Notes
- The account Activity feed (`/v1/account/activity`) and auth sign-in/out writes still target `auth_audit_events`; unifying the whole trail onto `audit_logs` is the natural follow-up slice

## [2026-08-05] - Pre-Sentry Crash Telemetry Stub

### Added
- `src/lib/telemetry.js` (new) — `captureError()` persists every crash as a structured record: dev console output plus a capped localStorage buffer (`provance.crashReports.v1`, newest 25, oldest dropped) so reports survive before Sentry lands. Attaches user_id/email from the persisted auth session, route, user agent, truncated stack, and component stack; never throws on quota/unavailable storage. `getBufferedErrors()` / `clearBufferedErrors()` / `flushErrors()` (backend-flush seam)
- `src/components/app/ErrorBoundary.jsx` — `componentDidCatch` now forwards every caught crash to `captureError`; the `onError` prop remains the swap-in point for Sentry
- `src/context/AuthContext.jsx` — `AUTH_STORAGE_KEY` exported for reuse
- `src/lib/telemetry.test.js` (new, 13 tests) — record shape, non-Error thrown values, stack truncation, identity attach from a fake session, malformed-session tolerance, 25-record cap with oldest-dropped, quota/storage-failure tolerance, corrupt-buffer recovery, clear + flush

## [2026-08-05] - PDF Report Export (Print-to-PDF Flow)

### Added
- `src/pages/app/AppReportsPage.jsx` — detail header now has an **Export PDF** primary button (react-router `Link` via the Button `to` prop, so it keeps real href/middle-click semantics) that navigates to the print page and fires a toast guiding the user to choose "Save as PDF"
- `src/pages/app/AppReportsPage.jsx` — new ⌘K command **"Export current report as PDF"** on the report detail page
- `src/pages/app/AppReportPrintPage.jsx` — the toolbar's action is now **Export PDF** with a download icon; clicking fires a toast and `window.print()`. `document.title` is set to `Provance report {report_id|scanId}` so the browser suggests a sensible PDF filename (restored on unmount); the toolbar hides in print output via `print:hidden`
- `src/index.css` — the `@media print` block now hides the app/admin shell chrome (sidebar + header) and resets shell main padding so only page content prints, plus `break-inside: avoid` for `.print-sheet` panels so report cards don't split across pages

### Notes
- mock-backed end-to-end: the printable report loads via `getReport` behind `USE_MOCK`, and the export is a pure client-side print-to-PDF flow (no new API surface)

## [2026-08-05] - Resolved Incidents Surface in the Activity Log

### Added
- `src/lib/mockData.js` — `buildIncidentActivityEvents()` maps resolved `mockMonitoring.incidents` to `incident.resolved` system events carrying the verbatim post-mortem summary, severity, and resolution timestamp (open incidents stay on Monitoring only)
- `src/lib/activityCategories.js` — `incident.resolved` added to the `system` tab predicate
- `src/lib/mockApi.js` — `mockGetActivityLogs` merges incident events into the feed, sorted newest-first by timestamp so incidents interleave correctly with the audit trail
- `src/pages/app/AppActivityPage.jsx` — severity-aware row tones (critical=rose, major=amber, minor=sky — same as the Monitoring accordion) via `SEVERITY_TONE`, plus a post-mortem summary block in the expanded row detail
- `src/lib/incidentActivityEvents.test.js` — 6 tests: resolved-only mapping, open-incident exclusion, verbatim summary parity, severity/timestamp stamping, unique ids, and merged-feed system-tab disjointness

### Notes
- Incidents are mock-mode-only for now: the real `/v1/account/activity` reads `auth_audit_events` and does not emit incident rows yet

## [2026-08-05] - Real /admin/monitoring Backend Slice

### Added
- `supabase/migrations/0007_incidents.sql` — `admin_incidents` table (severity/status check constraints, services text[], status index) seeded with 5 incidents mirroring the frontend mock
- `backend/src/admin/admin.service.ts` — `getMonitoring()` with real timed probes (database head-count, storage bucket list), derived queue health (12h hourly series, 24h/1h throughput, failure rates, avg processing time), storage utilization from scan byte totals, measured p50/p95 query latency + real table row counts, worker status that treats an idle no-backlog worker as operational, and incidents from the table; shape parity with `mockMonitoring` (overall/services/queue_health/storage_utilization/db_performance/incidents)
- `backend/src/admin/admin.controller.ts` — `GET /admin/monitoring` behind Supabase + Admin guards
- `backend/src/config/env.validation.ts` + `.env.example` — `SUPABASE_INCIDENTS_TABLE`, `STORAGE_CAPACITY_GB`, `DB_MAX_CONNECTIONS`

### Notes
- `cache_hit_rate` and `dead_tuples_pct` are intentionally null (no honest Supabase source); the Monitoring page renders '—' via `formatPct` and hides the gauges
- `checks_24h` mixes 24h scan completions/failures with whole-table backlog head counts (documented proxy)

## [2026-08-05] - TrendChart Hover Hit-Area Fix + Geometry Tests

### Changed
- `src/components/ui/chartGeometry.js` — new pure export `buildHitAreaCells(points)` that tiles full-cell hover rects edge-to-edge across the plot (first cell starts at `PAD.left`, last cell clamps to the plot's right edge, interior cells centered on each point); fixes the dead zone where the first data point (at `x = PAD.left`) fell between the old half-width edge rects
- `src/components/ui/TrendChart.jsx` — hover hit-areas now render from `buildHitAreaCells` instead of the hand-rolled half-width edge rects

### Added
- `src/components/ui/chartGeometry.test.js` — 8 geometry tests locking in edge-to-edge contiguity, per-point containment (including first/last), 1/2/7/14/30-point series, y-value independence, and positive in-bounds widths

## [2026-08-05] - Admin Team Scoping: Users Team Column + Analytics Top-Orgs

### Changed
- `src/lib/mockData.js` — `mockUserTeamById` moved above `mockUsers` (was a TDZ ReferenceError once users referenced it) and every `mockUsers` record now carries `team_id`, so the admin feed exposes each user's team assignment
- `src/pages/admin/UsersPage.jsx` — new **Team** column (TeamBadge, `getTeamMeta` sort) between Role and Team Access; URL-backed `TeamFilter` chips (`?team=` via `useTeamFilterParam`) with counts from the live admin feed; the boolean team-access select renamed `filterTeamAccess` to disambiguate from team assignment
- `src/pages/admin/AnalyticsPage.jsx` — `TeamFilter` chips above the top-orgs table (counts from `mockScans`); selecting a team recomputes the top-orgs rows from the scan ledger (scan `team_id` + user→org join), with a `{Team} scoped` chip and an empty note when the team has no org usage

### Notes
- Verified live: `/app/admin/users?team=team_legal` filters the roster to the 2 Legal users; `/app/admin/analytics?team=team_legal` swaps the top-orgs table to the team's usage split (e.g. Provance Internal with the team's scan counts)
- Review confirmed no leftover `filterTeam` refs, correct null-fallback in `sortedTopOrgs`, and hooks top-level; added the user-detail drawer TeamBadge per review suggestion

## [2026-08-05] - URL-Backed Team Filter (?team=) Across Workspace Surfaces

### Added
- `src/lib/useTeamFilterParam.js` — shared hook that persists the workspace team filter in the query string (`?team=team_legal`), following the existing `?state=` demo-param pattern. Reads `?team=` on mount (invalid/unknown values fall back to `all`), syncs changes to the URL via `replace` while preserving other params, and re-derives on back/forward or manual URL edits. Exports `TEAM_FILTER_VALUES`, `isValidTeamFilter`, `readFromSearch`
- `src/lib/useTeamFilterParam.test.js` — 5 vitest tests covering value validation against `TEAM_IDS`, unknown/empty/null fallbacks, search-string extraction, and coexistence with `?state=`

### Changed
- `AppDashboardPage.jsx` (KPI row + queue posture + ledger), `AppQueuePage.jsx`, and `AppReportsPage.jsx` — team filter migrated from local `useState('all')` to the shared `useTeamFilterParam` hook, so the selection survives navigation and produces shareable links

### Notes
- Verified live: `?team=team_legal` scopes the dashboard KPIs + queue, the queue ledger, and the reports list; clicking a chip rewrites the URL; `?team=team_growth&state=empty` keeps both params
- Review confirmed the two-effect design is loop-safe (React identical-state bail-out) and imports were properly pruned (lint at baseline, 82/82 tests, build passes)

## [2026-08-05] - Activity Category Filter: Extracted + Unit-Tested

### Added
- `src/lib/activityCategories.js` — pure module extracting the Activity page's `CATEGORIES` matching (the inline const in `AppActivityPage.jsx`): `ACTIVITY_CATEGORIES` with per-tab match predicates (all/scans/exports/account/team/system) plus `getActivityCategory()` fallback. Single source of truth on the frontend, mirroring `GET /v1/account/activity`'s server-side semantics; includes both dotted (mock) and underscore (real service) action forms
- `src/lib/activityCategories.test.js` — 14 vitest tests: every category's predicate asserted against the real `mockAuditEvents` (30 events, 20 actions), partition coverage + disjointness (classified actions == total, per-category sum == all count), real-backend underscore parity (`invite_created`→account, `waitlist_reviewed`→system, no bleed), unknown-action fall-through, and `getActivityCategory` fallback

### Changed
- `src/pages/app/AppActivityPage.jsx` — imports the module; removed the inline `CATEGORIES` const (three usage sites migrated: filtered memo, tab items, ⌘K hint)

### Verified
- Live tab counts (Scans·5 / Exports·4 / Account·8 / Team·4 / System·9 = 30) match the module partition exactly; 77/77 tests, lint at baseline, build passes

## [2026-08-05] - Launch Checklist Records Vitest Gate

### Documentation
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` — Deployment Checklist rewritten: names the vitest suite as step 1 (63 tests) and clarifies that `check:launch` runs `npm test` **first**, then frontend build → backend build → backend e2e, with the CI workflow noted as enforcing the same gate on push/PR
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` — baseline release gates now list the vitest suite explicitly and describe `check:launch`'s ordering

## [2026-08-05] - CI Gate: GitHub Actions (Frontend + Backend)

### Added
- `.github/workflows/ci.yml` — CI gate on push to `main` + all PRs, with two jobs:
  - **frontend** — `npm ci`, `npm run lint`, `npm test` (vitest, 63 tests), `npm run build` on Node 22 with npm cache
  - **backend** — `npx pnpm@9 install --frozen-lockfile` (matching `backend:install`), `npm run backend:build`, backend jest unit tests, and the in-memory Nest e2e health spec (no server/env required)
  - `concurrency` group cancels superseded runs; 15-min timeouts per job
- Closes the completion-review §4.2 Deployment row ("add GitHub Actions CI" → shipped)

### Verified
- All five gates pass locally before shipping: frontend lint (14 warnings, 0 errors), 63/63 vitest tests, frontend build, backend build, 20/20 backend unit tests, 1/1 e2e health test

## [2026-08-05] - Final Frontend Sign-Off Checklist (v2, Post-Admin-Completion)

### Documentation
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` revised to **v2**: re-audited the full surface after the admin workspace completion (12/12 pages)
  - **`?state=` forcing — 17 of 24 data pages** (was 13 of 22; the four new admin pages shipped with forcing built in); **9 pages still missing** (History, Reports, Account, Team + admin Overview, Waitlist, Users, Organizations, Feature Flags) — the one recommended close-out
  - **⌘K — 24 of 24 data pages pass** (print view exempt)
  - **Empty states — 24 of 24 pass**
- Live-verified this pass: `/app?state=empty` (forced empty), `/app/admin/jobs?state=error` (banner + retry), `/app/history` (25-row ledger, no banner — gap confirmed)

## [2026-08-05] - Phase 3 Records Formatter Consolidation As Complete

### Documentation
- `docs/reports/2026-08-04-frontend-completion-review.md` — formatter-consolidation note updated to record the consolidation as **confirmed complete before backend work**: test-suite count refreshed 30 → 63 (null/NaN/zero/sub-second/invalid-input edge cases), and the final sign-off sweep added (Billing storage meters → `formatStorageGb`, forensic `VeracityGauge` → `formatPct`; remaining `toFixed` calls confirmed intentional — SVG path geometry + static benchmark axis formatters)
- `docs/engineering/PHASE_TASK_LIST.md` — Shared Foundation And Polish section: test-suite row updated to 63 tests and a new `[x] Complete` row records the formatter sign-off sweep
- Historical CHANGELOG validation notes that reference 30 tests are left as-of-date records (the suite genuinely was 30 tests on those days)

## [2026-08-05] - Formatter Sign-Off Sweep (Forensic + Sample Report Surfaces)

### Changed
- Final hand-rolled-formatting sweep across the forensic components and Sample Report surfaces — migrated the last stragglers onto the shared `scanPresentation.js` module:
  - **Billing storage meters** — `AppBillingPage` was hand-rolling `${value.toFixed(1)} GB` for the storage StatCard and UsageMeter; both now use `formatStorageGb` (with TB escalation + fallback guards for free)
  - **Forensic VeracityGauge** — `ForensicReportPreview`'s `percentage.toFixed(1)` now renders through `formatPct`
- Verified the Sample Report surfaces (landing/page/document/print) were already fully migrated to `formatDateTime(sampleReportMeta.analysisTimestampIso)` and `ForensicMediaFrame` was clean
- Remaining `toFixed` calls are intentional: SVG path geometry (`chartGeometry.js`) and static benchmark-axis formatters (`BenchmarkPage.jsx`) that render raw values (`0.79`, `7.5%`) — not presentation formatting

### Notes
- The `src/components/forensic/` directory (ForensicReportPreview + 6 companions) is currently **unreferenced** — built as a static illustrative preview and not yet wired into any route; migrated anyway for consistency
- Gates: 63/63 tests, lint at baseline (14 warnings, 0 errors), production build passes

## [2026-08-05] - Frontend 100% Complete (User + Admin Workspaces Shipped)

### Status
- The full user workspace (15/15 pages) and admin workspace (12/12 pages) are both built and verified — **no frontend placeholders remain** (previously tracked as "6 admin placeholders")
- Completion-review report, engineering-roadmap, recommended-improvements, and CURRENT_IMPLEMENTATION_STATUS docs refreshed to reflect the shipped state; only approved MVP features (PDF export, scan dedup) and backend integration remain before launch

## [2026-08-05] - Admin Workspace 100% Complete (Last Four Placeholders)

### Added
- **Admin Jobs page** (`/app/admin/jobs`) — global verification job ledger with status filter tabs, queue/worker posture stats, drawer detail with file/timing info, and a retry action
- **Admin Reports page** (`/app/admin/reports`) — full report ledger with verdict badges, confidence bars, owning-team badges, search + verdict filters, pagination, and a signal-breakdown drawer; "Open" navigates to the workspace report view
- **Admin Roles page** (`/app/admin/roles`) — RBAC matrix with role cards, permission-scope grids, and member assignment counts
- **Admin Settings page** (`/app/admin/settings`) — environment readout, operational toggles, and platform-config surface
- All four are mock-backed with loading/empty/error states and `?state=` demo forcing; data layer: `mockAdminJobs`/`mockAdminRoles`/`mockAdminSettings` + `mockGetAdminJobs/Reports/Roles/Settings` + `USE_MOCK`-gated real paths in `api.js`; routes wired in `App.jsx`; dead `PlaceholderPage` deleted — the admin workspace is now **12/12 pages built**

### Fixed
- `mockReports` entries now carry `status: 'completed'` so verdict badges resolve instead of showing "Pending"
- `useMockData` hardened to pass `params ?? {}` to loaders — prevents destructure crashes for param-taking mocks called without args
- `getAdminReports` real path now serializes query params (matches `getActivityLogs` convention)

## [2026-08-05] - Frontend Sign-Off Checklist (Final Completion Review)

### Added
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` — final audit of every built page (public, user workspace, admin workspace) against three sign-off criteria:
  - **`?state=loading|empty|error` demo forcing** — 13 of 22 data pages ✅; **9 data pages missing** (History, Reports, Account, Team + admin Overview, Waitlist, Users, Organizations, Feature Flags) — flagged as the one recommended close-out (~1 slice, same `useDemoState`/`withDemoOverride` pattern as the dashboard)
  - **⌘K command coverage** — 21 of 22 workspace pages ✅ (print view exempt as a non-command surface)
  - **Empty-state coverage** — all 22 data pages ✅ (loading/error/empty verified)
- Includes the full per-page matrix (route, forcing, commands, empty state), a public-page note (criteria N/A for static pages), and the carried legacy-admin-component note (Organizations + Feature Flags)

### Notes
- verified live: `/app?state=empty` renders the forced empty surface + demo banner; `/app/history` and `/app/admin` render real states with no demo banner (gaps confirmed, not assumed)
- overall verdict: **ready for Founder sign-off** with the demo-forcing retrofit recommended before investor/partner demos
- quality gates at review time: lint at baseline (14 warnings, 0 errors), 63/63 formatter tests, build passes

## [2026-08-05] - Formatter Test Suite Extended To Full Edge-Case Coverage

### Added
- `src/components/app/scanPresentation.test.js` expanded from 30 → **63 tests**, closing the coverage gap on the newer consolidated formatters so the shared module is regression-proof:
  - **formatPct** — zero/tiny ratios (`0.0009, 2` → `0.09%`), rounding boundaries (`1/3` → `33%`, `2/3` → `67%`, `0.996` → `100%`), `Infinity`/`-Infinity` fallback, `-0` → `0%`
  - **formatDateTime** — null/empty/invalid → fallback, custom fallback, TZ-deterministic local-constructor assertions (`Jul 24, 2026, 3:45 PM`), ISO-string parity via the en-US Intl contract, non-string/non-Date rejection
  - **formatScanTimestamp** — `Not available` fallback + delegation parity with formatDateTime
  - **formatDateLong** (`July 24, 2026`), **formatTimeShort** (`3:45 PM`, `12:05 AM`), **formatShortDate** (`Jul 24`, `Dec 1`) — fallbacks + en-US rendering
  - **formatCurrency** — null/NaN/Infinity fallback, whole-dollar grouping (`$1,234`), rounding (`1234.6` → `$1,235`), negative amounts (`-$1,234`)
  - **formatDurationMs** — null/NaN/Infinity/non-numeric fallback, sub-second ms (`850ms`), the 1s boundary (`1000` → `1.0s`), fractional rounding (`999.6` → `1000ms`)
  - **formatStorageGb** — fallbacks, GB with one decimal, the 1000 GB → TB boundary (`1.2 TB`)
  - **formatFileSize** — `Unknown size` for null/NaN/zero/negative, B without decimal, 1024-boundary stepping (KB/MB/GB), fractional rounding, GB-cap behavior pinned (`2048.0 GB`)

### Notes
- all datetime assertions use local-time constructors (the suite's established TZ-deterministic pattern, mirroring the formatHourShort tests) or en-US Intl parity checks — no locale/timezone drift in CI
- review notes: the `formatDurationMs(999.6) → "1000ms"` case is a deliberate behavior pin (the `<1000` branch runs before `Math.round`) with an inline comment so it is not "fixed"; the negative-currency and GB-cap boundaries were added per review
- validated: 63/63 tests pass, lint at baseline (14 warnings, 0 errors), build passes

## [2026-08-05] - Date-Format Sweep: Locale Pinning And Sample-Report Timestamp Standardization

### Changed
- **`formatDate` locale pinned to `en-US`** (`src/components/app/scanPresentation.js`) — was `toLocaleDateString(undefined, …)` (browser-locale-dependent) while every sibling formatter already pinned `en-US`; now `Intl.DateTimeFormat('en-US', …)` so output never shifts with the viewer's locale
- **`formatRelativeTime` >1-week fallback delegates to `formatDate`** — was `new Date(x).toLocaleDateString()` (locale-default AND a different format than `formatDate`); now both surfaces agree on the shared medium-date format
- **Sample Report timestamp standardized to a single canonical source** — the surfaces showed divergent hardcoded dates (`2026-06-25` in `SampleReport.jsx` + `SampleReportPage.jsx` vs `2026-07-16` in the document, which matches the report ID `PRV-20260716-041`):
  - `sampleReportContent.js`: `analysisTimestamp: '2026-07-16 14:32 UTC'` → canonical `analysisTimestampIso: '2026-07-16T14:32:00Z'`
  - `SampleReportDocument.jsx` (Generated + footer Timestamp), `SampleReport.jsx` (header), and `SampleReportPage.jsx` (header + Metadata Summary) now render `formatDateTime(sampleReportMeta.analysisTimestampIso)` instead of hardcoded strings

### Tests
- `scanPresentation.test.js` updated to the pinned contract: the `formatDate` options-contract test now spies on `Intl.DateTimeFormat` with `'en-US'` + the medium-date options, and the relative-time fallback test asserts parity with `formatDate`

### Notes
- audit confirmed `AppReportPrintPage` and all admin drawers (Users/Waitlist/Organizations) were already on the shared formatters; the remaining `.toLocaleString()` hits across src are plain-number formatting (correct)
- the `TIMESTAMP: 2026-06-25T14:32:01Z` lines in `ForensicReportPreview` and `SecurityPage` are intentional illustrative audit-log text in mono code blocks, not date rendering — left as-is
- validated: lint at baseline (14 warnings, 0 errors), 30/30 tests pass, build passes; live DOM checks confirmed the formatted timestamps render on the homepage section, `/sample-report`, and `/sample-report/print`

## [2026-08-05] - Account Activity API: Real GET /v1/account/activity

### Added
- `AccountService.getActivity()` — the user's workspace activity feed backed by the real `auth_audit_events` table:
  - **Scoped by actor email** (the table has no `user_id` column — events are matched on `actor_email = user.email`, trimmed + lowercased; a JWT without an email gets `400`)
  - **Category filters** mirroring the Activity page tabs (`all` / `scans` → `LIKE 'scan.%'` / `exports` → `LIKE 'report.%'` / `account` / `team` / `system` via explicit action lists, shared via `ACTIVITY_CATEGORY_ACTIONS`)
  - **Pagination envelope** matching `mockGetActivityLogs` exactly — `{ data, page, pageSize, total, totalPages }` (pageSize clamped 1–200, filter applied to both the data query and the exact-count query so `total` reconciles)
  - Rows mapped to the mock event shape: `severity` via the shared `auditSeverity` map, `resource_type`/`resource_id` from `entity_type`/`entity_id`, `actor_email` defaulting to `system`
- `GET /v1/account/activity` on `AccountController` (behind `SupabaseAuthGuard`, 30 req/min) accepting `category` / `page` / `pageSize` query params
- `backend/src/common/audit-severity.ts` — shared `auditSeverity` map extracted from the admin service (previously local) so the Account Activity and Admin Audit Logs surfaces badge events identically
- Frontend `getActivityLogs` now serializes `category`/`page`/`pageSize` into the query string on the real path (mock path unchanged)
- `docs/engineering/ACCOUNT_ACTIVITY_CONTRACT.md` — endpoint table, category semantics, response shape, scoping rationale, frontend callers

### Notes
- the Activity page fetches `{ pageSize: 100 }` and filters client-side, so real mode behaves identically to mock today; server-side `category` filtering is ready for future use
- reviewed + hardened: the generic category-filter helper was replaced with the codebase's conditional-builder pattern (see `countMembers`) to fix two typecheck errors (`TS7053` map indexing + `TS2589` excessively-deep instantiation)
- validated: backend `tsc --noEmit` clean, `nest build` passes, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - TrendChart Primitive Extracted And Reused

### Added
- **`src/components/ui/TrendChart.jsx`** — new ui primitive extracted from the admin AnalyticsPage `VolumeTrendChart`: self-hosted SVG line/area chart with range toggle (7d/14d), hover readout + guide line, crisp HTML axis labels, legend with range totals, and a built-in empty-data fallback (`emptyTitle`/`emptyDescription` props)
- **`src/components/ui/chartGeometry.js`** — shared chart geometry (`CHART_W/H`, `PAD`, `buildChartGeometry`, `pctOfViewBoxY/X`) split into a fast-refresh-safe module (mirrors the `popoverOrigin.js` pattern); exported from the ui barrel
- **Reused in three surfaces**: admin AnalyticsPage (replaces the local `VolumeTrendChart`), admin OverviewPage (new Scan Volume Trend section fed from `mockAnalytics.volume_trend`, with an Open-analytics link), and the user Dashboard (new Verification Volume section fed from the `analytics` resource with loading skeleton / retryable error / empty fallback)

### Notes
- AnalyticsPage now imports `CHART_W/H`/`PAD`/`pctOfViewBoxY/X` from the barrel for its VerdictVolumeChart + QueueThroughputPanel — no geometry duplication remains
- legend changed from last-point to range totals (with a "Last day" chip) — a deliberate improvement the range toggle now reflects
- review hardening: null-safe geometry (`p.scans || 0`), `defaultRange` validated against `ranges`, `useId`-scoped SVG gradient, `aria-pressed` on the range toggle, Last-day chip no longer hides on zero-scan days
- validated: frontend lint at baseline (14 warnings, 0 errors), 30/30 tests pass, build passes; live DOM checks on all three surfaces incl. the range toggle (14d 738 → 7d 477) and the dashboard `?state=empty` fallback

## [2026-08-05] - Admin Analytics API: Real GET /admin/analytics

### Added
- `AdminService.getAnalytics()` — aggregates the real `scans` table (30-day fetch, service-role client) into the exact `mockAnalytics` shape the Analytics page consumes:
  - 14-day `volume_trend` + `verdict_trend` daily buckets (verdict read from `result_payload.verdict.class`: `likely_authentic`/`suspicious`/`inconclusive`)
  - `scans_today`/`scans_7d`, `completion_rate`/`failure_rate`/`suspicious_rate` over the trend window
  - 7-day `media_type_distribution` keyed by `mime_type` (mock parity: media totals == `scans_7d`)
  - `queue_throughput` — whole-table exact head counts for `queue_depth`/`in_flight`, 12h `hourly_series`, `avg_processing_time_ms` proxied from `updated_at − created_at`
  - `top_organizations` (≤6) — real member counts, real per-org scan counts via first-membership mapping over the same 14-day window as the trends (so the page's numbers reconcile), storage from `organizations.storage_used_gb`, per-org completion
- `GET /admin/analytics` on `AdminController` behind the existing `SupabaseAuthGuard + AdminGuard` pair (30 req/min)
- `docs/engineering/ADMIN_ANALYTICS_CONTRACT.md` — response shape, per-field derivation table, verdict mapping, mock→real parity notes, error semantics

### Notes
- scans table has no dedicated processing-time column, so avg processing time is the completed-scan `updated_at − created_at` proxy (documented); `null` when no samples
- verdict lives in `result_payload.verdict.class` (written by `ScansService.buildVerdict`), not a scans column — malformed payloads count toward volume/completion but never a verdict bucket
- review hardening: top-org scan counts aligned to the 14-day trend window, `created_at` null-guarded, scalability path (Postgres-side aggregate) documented in the contract
- validated: backend `tsc --noEmit` clean, `nest build` passes, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - Admin Monitoring: Queue Health, Storage, DB Performance, External Services

### Added
- **`mockMonitoring` extended** (`src/lib/mockData.js`) with three new deterministic sections kept consistent with the existing `mockQueueSnapshot`/`mockAnalytics` values: `queue_health` (queued/in-flight/throughput/failure + 12-hour hourly series), `storage_utilization` (287.1 GB of 500 GB across media/reports/evidence/backups buckets with 30-day growth), and `db_performance` (avg/p95 query latency, connection pool 42/100, cache hit 98.2%, per-table row/size/dead-tuple stats)
- **`MonitoringPage` deepened** (`src/pages/admin/MonitoringPage.jsx`) — the four requested surfaces, all self-hosted SVG/CSS on the same mock-backed state pattern as Analytics (`useMockData` + `?state=loading|empty|error` forcing):
  - **Queue health** panel — queued/in-flight/throughput/avg-time stat cells, 12-hour hourly bar chart, failure-rate footer
  - **Storage utilization** panel — overall capacity meter with tone chips (57% used), per-bucket usage bars with share-of-total + 30-day growth deltas
  - **Database performance** panel — latency, connection-pool, and cache-hit stat cells plus a table-stats ledger with dead-tuple bars
  - **External service status** — the existing service list retitled and clarified against the other surfaces
- Loading skeleton extended for the new panels; empty/error states (incl. forced demo states) verified live

### Notes
- header copy updated to describe the full surface; all KPI/panel values trace to the same mock sources so monitoring and analytics never contradict
- validated: frontend lint at baseline (14 warnings, 0 errors), 30/30 tests pass, build passes, live DOM checks on populated/empty/error states

## [2026-08-05] - Admin API: Real Users / Organizations / Feature Flags / Audit Logs

### Added
- Five real admin routes on `AdminController` (all behind the existing `SupabaseAuthGuard + AdminGuard` pair, 30 req/min):
  - `GET /admin/users` — profiles mapped to the mock user shape (`{ id, email, displayName, role, team_enabled, created_at, last_sign_in, avatar_url, org_id }`; `last_sign_in` proxies `profiles.updated_at`, `org_id` resolved from `organization_members`, paginated `{ data, page, pageSize, total, totalPages }`)
  - `GET /admin/organizations` — organizations + live member/admin counts (admin = owner + admin) matching the mock array shape
  - `GET /admin/feature-flags` + `PATCH /admin/feature-flags/:key` (`UpdateFeatureFlagDto { enabled }`, 404 on unknown key, echoes `{ key, enabled, updated_at }`)
  - `GET /admin/audit-logs` — `auth_audit_events` mapped to the mock event shape with `severity` derived from the action (mirror of the mock's `AUDIT_SEVERITY_BY_ACTION`), `resource_type`/`resource_id` from `entity_type`/`entity_id`, returning `{ data, total }`
- `supabase/migrations/0006_feature_flags.sql` — `feature_flags` table (key PK, label, description, enabled, exposure with check constraint, owner) seeded with the 10 reference flags mirroring `mockFeatureFlags` (`on conflict (key) do nothing`)

### Notes
- review hardening: the backend severity map now covers the two real actions the admin service writes (`waitlist_reviewed`, `invite_created` → medium) instead of falling through to generic low; the Audit Logs page tone map was keyed in the spaced form `shortAction()` actually emits, which fixes the pre-existing dead keys for `team.member_added`/`member_removed` (rendered neutral before) and tones the real backend actions correctly
- validated: backend `tsc --noEmit` clean, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

### Notes
- dashboard + waitlist review/invite were already real and Supabase-backed; this slice closed the remaining admin surfaces the pages consume
- severity derivation keeps the Audit Logs page's severity chips/filters working identically in real mode
- validated: backend `tsc --noEmit` clean, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - Organization API: Real Routes, Schema, And Contract

### Added
- `supabase/migrations/0005_organization.sql` — new append-only migration defining `organizations` (plan/seats/storage/counters), `teams`, `organization_members` (join table, `owner/admin/member`, team_id set null on delete), and `organization_invites` (token, status, +7d expiry); RLS enabled with member-scoped read policies (writes are backend-only), `set_updated_at` triggers
- `backend/src/organization/` — new NestJS module implementing the six routes the frontend already targets: `GET /organization`, `POST /organization/invites`, `PATCH /organization/members/:id/role`, `PATCH /organization/members/:id/team`, `DELETE /organization/members/:id`, `DELETE /organization/invites/:id` (SupabaseAuthGuard + 30 req/min throttle, registered in `app.module.ts`)
- Three strict DTOs matching the frontend payloads exactly (`forbidNonWhitelisted`): invite `{ email, role, team }`, role `{ role }`, team `{ teamId }`
- `docs/engineering/ORGANIZATION_API_CONTRACT.md` — endpoint table, request/response shapes, business rules (owner guard, duplicate checks, seat capacity), schema summary, mock-to-real mapping, and deployment notes

### Notes
- **frontend required zero changes** — `api.js` already pointed all six functions at these routes behind `USE_MOCK` (verified path-for-path); flipping `USE_MOCK` activates the real flow
- review fixes: **all five mutations are now owner/admin-only server-side** (`403` via `assertCanManage`, enforcing the UI's `canManage` gating so a plain member cannot escalate or manage via direct API calls); the team-reassignment path uses a strict team lookup (`400` on unknown, mirroring the mock's rejection — the first-team fallback is invites-only); `cancelInvite` 404s on an unknown invite; `teams(organization_id)` + `organization_invites(organization_id, status)` indexes added; single-org-per-user and seeded-owner assumptions documented
- the org tables live in migration **0005, not 0002** — `0002_scans.sql` is scans-only and already applied to the remote Supabase project, so editing it would create migration drift (documented in the contract doc)
- service maps DB rows to the exact `mockGetOrganization` shape (`{ profile, teams, members, pendingInvites }`) with mock-parity rules (owner cannot be modified, invite fallback-to-first-team, seats enforced)
- validated: backend `tsc --noEmit` clean, `nest build` passes, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - Admin Audit Logs Page (replaces /app/admin/audit-logs placeholder)

### Added
- New `src/pages/admin/AuditLogsPage.jsx` — the full admin event trail (30 mock audit events) with: **severity filter chips** (All/Critical/High/Medium/Low with live counts), **actor / action / resource** selects, and a search box; severity + action badges per row (ui Badge palette); resource target chips; expandable rows with absolute timestamps; pagination (8/page); and **CSV export that mirrors the filtered view** (toast with the exported count)
- Deterministic `severity` on `mockAuditEvents` (`AUDIT_SEVERITY_BY_ACTION` — destructive/security actions are high, reads are low)
- `getAdminAuditLogs` in `api.js` gated behind `USE_MOCK` (real path `/admin/audit-logs`) + `mockGetAdminAuditLogs`
- `src/lib/csv.js` — shared `buildCsv` (quoted + escaped cells) and `downloadCsv` helpers extracted from WaitlistPage; **WaitlistPage migrated** onto the shared helper
- Page-scoped ⌘K commands: export CSV, filter to high severity, clear filters, go to overview; full loading/error/empty states with `?state=` demo forcing

### Changed
- `src/App.jsx`: `/app/admin/audit-logs` now routes to `AdminAuditLogsPage` instead of the placeholder

### Notes
- verified live: header meta (30 events / in view / high severity), severity chips with counts, High filter → 7 events all HIGH, Export CSV → toast "7 events in the CSV" (filtered view), 8 rows/page; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Global Error Boundary (approved feature #1)

### Added
- New `src/components/app/ErrorBoundary.jsx` — class boundary with a recoverable fallback: designed card (error glyph, "Something went wrong" serif heading, recovery copy), the error message in a mono detail block, **Reload page** (window.location.reload) + **Try again** (state reset that re-mounts the subtree) actions, and a **dev-only stack trace** (`import.meta.env.DEV` gated `<details>` showing `error.stack` + `componentStack`)
- The fallback is deliberately raw token-styled markup (no ui primitives) so it can never re-crash from the very failure it is presenting; `role="alert"` for screen readers; optional `onError` callback hook for the future Sentry integration

### Changed
- **Three wiring levels** so no crashing page blanks the screen: (1) a top-level boundary around `<Routes>` as the last-resort full-screen fallback; (2) `PublicLayout` wraps its `<Outlet />`; (3) both `AppShellLayout` and `AdminShell` wrap their `<Outlet />` with a **location-keyed** boundary (`key={location.pathname}`) so a page crash shows the fallback inside the intact shell and navigating to another route resets the boundary

### Fixed
- dev stack trace never rendered on first pass — `getDerivedStateFromError` only stored `error`, so `componentStack` was never saved; `componentDidCatch` now stores `errorInfo` in state

### Notes
- live-verified end to end with a temporary injected render crash on the admin monitoring page: fallback card rendered inside the intact admin shell (CONTROL ROOM chrome + breadcrumb persisted), the injected message displayed in the detail box, dev stack trace expanded with real frames, and navigating to `/app/admin` recovered the shell to a fully-rendered overview; injection fully reverted; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Admin Monitoring Page (replaces /app/admin/monitoring placeholder)

### Added
- New `src/pages/admin/MonitoringPage.jsx` — status banner + header meta pills (overall status, 30d uptime, open incidents), KPI StatCard row (uptime, avg response, open incidents, checks 24h), the shared `SystemHealthPanel` with refresh, a richer `ServiceStatusList`, and an expandable incident history with severity dots / status chips / duration / date range / post-mortem summary
- `mockMonitoring` in `mockData.js` (overall status, 6 services with latency/region/uptime/last-check, 5 incidents across severities incl. one open) + `mockGetMonitoring` in `mockApi.js` + `getMonitoring` in `api.js` gated behind `USE_MOCK` (real path `/admin/monitoring`)
- `src/components/admin/ServiceStatusList.jsx` — detailed per-service rows (status dot, region, latency via `formatDurationMs`, 30d uptime via `formatPct`, last check via `formatTimeShort`), responsive grid with mobile sub-labels
- `src/components/admin/healthStatus.js` — shared `STATUS_CONFIG` moved out of `HealthCheckRow` (fast-refresh-safe module, mirrors the popoverOrigin pattern) so the panel and the service list share one status vocabulary
- Incident history includes an **Open only** filter chip (1 open incident), expandable rows, and page-scoped ⌘K commands (refresh checks, toggle open-only, go to overview); full loading/error/empty surfaces with `?state=` demo forcing

### Changed
- `src/App.jsx`: `/app/admin/monitoring` now routes to `AdminMonitoringPage` instead of the placeholder

### Notes
- verified live: header pills (PARTIAL DEGRADATION / 99.98% UPTIME / 1 OPEN INCIDENT), KPI cards (214ms avg), SystemHealthPanel with Refresh checks, service list reading "4 of 6 services operational" (worker degraded + email not configured), and all 5 incidents incl. the ongoing worker-memory-pressure one; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Admin Analytics: Verdict Mix And Queue Throughput

### Added
- **Scan volume by verdict** (`VerdictVolumeChart` on AnalyticsPage): self-hosted SVG stacked-bar chart of the same 14-day window, split into Authentic (emerald) / Suspicious (amber) / Inconclusive (sky) segments that always sum to each day's scan total; hover guide with day-level split readout, HTML axis labels, and a legend with totals + shares
- **Queue throughput** (`QueueThroughputPanel`): headline stat blocks (scans last hour, avg processing time via `formatDurationMs`, queue depth + in-flight) plus a self-hosted SVG 12-hour processed-per-hour bar chart with hour axis labels, a 24h processed note, and the failure rate
- `verdict_trend` + `queue_throughput` on `mockAnalytics` (deterministic; throughput mirrors `mockQueueSnapshot`); both added to `EMPTY_ANALYTICS` so the `?state=empty` surface stays safe
- `formatHourShort` ("9 AM") in `scanPresentation.js` + test coverage — keeps the zero-inline-date-time-formatting standard (hour labels previously would have been a page-local Intl call)

### Notes
- the page already covered KPI trend charts + top organizations from the earlier slice; this pass completed the spec's two missing surfaces (header copy updated to match)
- verified live: all three chart SVGs render (trend, verdict stack, hourly bars), queue stat blocks + legend + 24h/failure readouts present; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Team Scoping In The Workspace

### Added
- `mockUserTeamById` in `src/lib/mockData.js` — single source of truth mapping every seed user to a workspace team (org_001 members resolve to their roster team, consistent with `mockOrgWorkspace.members`; other-org seed users are distributed deterministically so every scan carries a team)
- `team_id` on `mockScans` and `mockReports`; `mockInitiateScan` now stamps new uploads with the creator's team so the upload → queue loop stays team-scoped
- `TEAM_META` / `TEAM_IDS` / `getTeamMeta` in `scanPresentation.js` (team registry mirroring `mockOrgTeams`, mapped onto the ui Badge palette)
- `src/components/app/TeamBadge.jsx` — owning-team chip (short name in a tone-coded ui Badge, full name as tooltip)
- `src/components/app/TeamFilter.jsx` — pill-chip team scoping with live counts ("All teams" + one chip per team)

### Changed
- **Dashboard ledger** (History tab): new Team column with badges, plus a TeamFilter above the DataTable (counts derived from the full scan list, contextual empty state when a filter yields nothing); the Recent-reports feed cards now show the owning-team badge
- **Queue page**: Team column + TeamFilter on the Recent Jobs table (filter combines with search/pagination)
- **Reports page**: TeamFilter above the verification list and a team badge on every row; a filtered-empty state appears when a team has no scans

### Notes
- verified live: ledger shows "All teams 25 / Legal 5 / Product 10 / Growth 10" chips, Legal filter → 5 rows all Legal, queue Growth filter → 8 Growth rows, reports Product filter → 10 Product rows, feed card badges render; lint at baseline (14 warnings, 0 errors), 28 tests pass, build passes

## [2026-08-04] - Frontend Unit Tests: scanPresentation Formatter Suite

### Added
- `vitest` devDependency + `vitest.config.js` scoped to `src/**/*.test.{js,jsx}` (the backend jest suite is untouched)
- `npm test` / `npm run test:watch` scripts; `check:launch` now runs frontend tests first
- `src/components/app/scanPresentation.test.js` — 26 tests covering `formatCount`, `formatDate`, `formatPct`, `percentOf`, and `formatRelativeTime` edge cases (null/undefined/NaN, zero limits, rounding boundaries, exact unit boundaries via fake timers)

### Fixed
- `formatDate` crashed (`RangeError: Invalid time value`) on invalid date strings — it now shares the `parseTimestamp` guard used by the other date formatters and returns the fallback instead (parity preserved for valid inputs; verified live)

## [2026-08-04] - Activity Log: Actor/Action/Target Chip Presentation

### Changed
- `AppActivityPage` row metadata now renders the full **actor / action / target chip triad**: actor avatar + name, the tone-coded action badge, and a new bordered **target chip** (resource type + resource id in a mono pill) replacing the previously bare resource-id text
- Card description updated to reflect the chip presentation

### Notes
- The page was already complete from the prior slice (category tabs with live counts, searchable ledger, detail expansion, pagination, `?state=` loading/empty/error forcing, and ⌘K commands) — this pass finished the chip treatment per the approved spec; verified live (8 target chips on page 1, e.g. `user · user_0001`), lint at baseline, build passes

## [2026-08-04] - Formatter Consolidation (date-family completion)

### Added
- `formatShortDate` ("Jul 22") — consolidates the analytics chart's 3 inline month/day labels
- `formatDateLong` ("July 31, 2026") — consolidates the org-drawer long-date
- `formatTimeShort` ("3:45 PM") — consolidates the last-updated/last-checked time-only labels (admin overview + system health panel)
- Shared internal `parseTimestamp` validation used by all date formatters

### Changed
- `formatScanTimestamp` now delegates to `formatDateTime(value, 'Not available')` — one canonical medium-date/short-time implementation instead of two overlapping ones (the prior sentinel coupling is gone)
- AnalyticsPage (3 chart-label sites), OrganizationsPage (long date), OverviewPage (last-updated time), SystemHealthPanel (last-checked time) all migrated to the shared helpers

### Notes
- Sweep confirms **zero** inline `toLocaleDateString`/`toLocaleTimeString`/`dateStyle`/`timeStyle` usages remain outside `scanPresentation.js` — every date/time string in the app now flows through the shared module
- Minor cosmetic unification: time-only labels use the app-wide short-time style (1-digit hour, e.g. "9:00 AM" instead of "09:00 AM")

## [2026-08-04] - Formatter Consolidation (final pass into scanPresentation.js)

### Added
- `formatCurrency` (USD, integer dollars, em-dash fallback) — moved from Billing into the shared module
- `formatDurationMs` ("850ms" / "2.5s") — consolidates the ms→s formatting that existed in three queue surfaces
- `formatStorageGb` ("18.4 GB" / "1.2 TB") — consolidates the org-storage formatting shared by the admin orgs + analytics pages

### Changed
- Billing: local `formatCurrency` removed; two inline percent details now use `formatPct` (NaN-safe)
- Reports confidence + EvidenceAppendix confidence now render through shared `formatPct` (with the 'Pending' fallback preserved)
- Queue snapshot panel, Queue page, and Dashboard queue posture all use `formatDurationMs` (no more local `formatMs`/inline `(ms/1000).toFixed(1)`)
- Activity page inline `dateStyle/timeStyle` datetime → shared `formatDateTime`
- Waitlist page: 4 raw `toLocaleDateString`/`toLocaleString` call sites → shared `formatDate`/`formatDateTime` (dates now use the standard medium format)
- Organizations page: local `formatStorage` removed; created-date column → shared `formatDate`
- Analytics top-orgs table storage column → shared `formatStorageGb`

### Notes
- Zero local formatter definitions remain outside `scanPresentation.js`; the remaining raw `.toLocaleString()` calls are plain-number formatting and the chart's page-specific short-date axis labels

## [2026-08-04] - Admin Analytics Page (replaces /app/admin/analytics placeholder)

### Added
- New `src/pages/admin/AnalyticsPage.jsx` — KPI StatCard row (scans today/7d, completion, failure, suspicious), self-hosted SVG scan-volume trend chart (7d/14d range toggle, hover day-level readout, area + completed + failure layers), outcome-rate meters, media-type distribution bars, and a sortable top-organizations AdminTable
- `mockAnalytics` extended with a deterministic 14-day `volume_trend` and `top_organizations` (derived from the org registry)
- Full loading/empty/error surfaces with `?state=loading|empty|error` demo forcing, page-scoped ⌘K commands (incl. an analytics-export toast action), and responsive behavior (min-w-0 grid children so the AdminTable scrolls internally instead of stretching the layout at mobile)

### Changed
- `src/App.jsx`: `/app/admin/analytics` now routes to `AdminAnalyticsPage` instead of the analytics placeholder

## [2026-08-04] - Backend Kickoff: Cookie-Based Auth Hardening, Scan Round-Trip Fixes, Report Payload API

### Added
- **Auth hardening**: refresh tokens now travel in an httpOnly cookie (`provance_refresh`) set by `POST /v1/auth/sign-in` and rotated on every `POST /v1/auth/refresh`; new `POST /v1/auth/sign-out` burns the refresh token server-side (rotation consumes it) before clearing the cookie
- `AUTH_COOKIE_ENABLED` / `AUTH_COOKIE_SAME_SITE` / `AUTH_COOKIE_SECURE` / `AUTH_COOKIE_MAX_AGE_DAYS` env config (validated in `env.validation.ts`, documented in `backend/.env.example`)
- **Reports API**: new `ReportsModule` with `GET /v1/reports` (paginated completed scans, `{ data, total, page, pageSize }`) and `GET /v1/reports/:id` (full `result_payload` + signed asset preview URL)
- Backend tests: `cookie-session.util.spec.ts` + `auth.controller.spec.ts` (cookie set/rotate/clear, body stripping, body fallback) — 20 tests total pass

### Fixed
- Real upload round-trip blocked by `InitiateScanDto` rejecting the frontend's `processingMode` under `forbidNonWhitelisted` → DTO now accepts `quick|standard|deep`
- `submitScan` now verifies the file actually exists in Supabase Storage before queueing (missing upload → 400 instead of a queued job that fails in the worker)

### Changed
- `listScans` returns the frontend `data` contract (with a `scans` alias for older consumers)
- Frontend: `credentials: 'include'` on all API calls; cookie-aware refresh (refreshes even when the body refresh token is absent); `signOut()` API call wired into `AuthContext`; `getReport()` added and the printable report page migrated to it (tolerant of `{ report }` / `{ scan }` / bare shapes)
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` refreshed (cookie flow, reports endpoints, next-strategy work)

## [2026-08-04] - Approved Feature Set Folded Into Roadmap Docs

### Added
- Founder approved all 10 recommended features from `docs/reports/2026-08-04-frontend-completion-review.md` (error boundary, report PDF export, scan dedup, org invites, admin analytics/monitoring, session hardening, Sentry + PostHog, webhooks UI, usage enforcement, evidence appendix)
- New **Approved Feature Set** tables/sections in `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` and `docs/product/development-roadmap.md`
- Approved features tracked in `docs/project-state/current-feature-status.md` (10 new rows), `product-roadmap.md`, `development-priorities.md` (priorities renumbered), and `future-improvements.md`

### Changed
- Organization Management (member roster, roles, team access, invites) marked **shipped** in all docs — it was built during the Phase 3 workspace build-out and was approved feature #4
- `MASTER_DEVELOPMENT_ROADMAP.md`: Phase 3/4/5 tasks extended with the approved features; "Post-MVP Expansion Themes" and "Immediate Active Phase" refreshed (Phase 3 in progress; team/org workflows removed from deferred)
- `engineering-roadmap.md`: Phase 2 marked Completed, Phase 3 In Progress
- Review report recommendation table now shows Approval status with a cross-doc note

## [2026-08-04] - Phase 3 Polish Pass (Eyebrows, ⌘K Parity, Responsive)

### Changed
- **Unified page headers**: `AppReportsPage`, `AppAccountPage`, `AppTeamPage`, `AppAccessDeniedPage` moved from `text-xs tracking-[0.18em]` to the standard `font-mono text-[11px] tracking-[0.22em]` eyebrow — all 14 user-workspace pages now match
- **⌘K command parity**: added page-scoped commands to the 6 previously-bare workspace pages (Uploads: browse/mode/start; Queue: upload-more/open-next; History: start-verification/open-latest; Reports: upload-new/open-latest; Account: security/notifications; Team: organization/account)
- **Admin shell ⌘K**: `AdminShell` now wraps in `CommandRegistryProvider` and renders a `CommandPalette` (all admin routes + a proper `Actions` group with back-to-workspace / sign-out), with a mobile search trigger; page-scoped commands added to all 5 admin pages (Overview, Waitlist, Users, Organizations, Feature Flags)

### Fixed
- **Responsive overflow**: the `Tabs` primitive now `flex flex-wrap` — the workspace dashboard's activity tab strip overflowed horizontally at mobile widths (411px > 340px); verified clean across workspace + admin pages at 340px
- **rules-of-hooks**: `OverviewPage`'s `useRegisterCommands` was initially placed after conditional loading/error/empty returns — moved above all returns (caught by lint)

## [2026-08-04] - Shared Formatter Consolidation (formatDateTime + formatPct fallback)

### Added
- `formatDateTime(value, fallback = '—')` in `src/components/app/scanPresentation.js` — canonical medium-date/short-time formatter, replacing the duplicated local versions in admin `UsersPage` (5-field `toLocaleString`) and `AppReportPrintPage` (wrapper over `formatScanTimestamp`)
- `formatPct` gained a third `fallback` parameter and now guards `!Number.isFinite` in addition to `== null`

### Changed
- `UsersPage` imports the shared `formatDateTime` (hour style unified to the app-wide short-time format)
- `AppReportPrintPage` imports `formatDateTime` + `formatPct`; 6 `formatPercent` call sites now `formatPct(value, 0, 'Pending')` and 4 timestamp call sites pass `'Not available'` — output identical to the removed locals
- No local `formatDateTime`/`formatPercent` copies remain in `src`

### Fixed
- **Pre-existing print-page crash** (found while verifying): `mockGetScan` returns the bare scan while `AppReportPrintPage` read `response.scan` strictly, so a loaded page hit `state.scan.id` on `undefined`. Now `response?.scan || response` — the same tolerant pattern `AppReportsPage` already uses

## [2026-08-04] - Activity Log Page (User Workspace Complete)

### Added
- `src/pages/app/AppActivityPage.jsx` replacing the `/app/activity` placeholder — the **last user-workspace placeholder**; all 15 user pages are now built
- Category tabs (All / Scans / Exports / Account / Team / System) with live event counts, driven by a single `CATEGORIES` action→category map
- Live search across actor, action, resource type, and resource id, combined with the active category
- Paginated ledger (8/page) of expandable rows: controlled `aria-expanded` toggles reveal an event detail panel (event id, actor, resource, absolute timestamp)
- Two page-scoped ⌘K commands: **Expand all activity rows** (toggle inversion over the visible page) and **Filter to scan events**
- Loading / empty / error states via `?state=` demo forcing; `ACTION_META` presentation map with tone-coded dots and badges

### Changed
- `src/App.jsx` route swapped and `src/pages/app/AppPlaceholderPage.jsx` **deleted** (no remaining references — queue/history/profile/activity all have real pages)

### Fixed
- `useRegisterCommands` deps: `visible` is now memoized and the expand-all `onSelect` reads `expanded` via the functional `setExpanded` update — removing a latent stale-closure bug where expand-all would toggle from an outdated snapshot

## [2026-08-04] - Organization Management: Team Access

### Added
- **Teams & access card** on the Organization page (`/app/organization`): workspace teams with live member counts derived from the roster, descriptions, and avatar stacks
- **Per-member team select** in the member roster — owners and admins can reassign any non-owner member to a team (mock-backed `updateMemberTeam`, owner-guarded)
- **Team capture in the invite flow** — the invite Drawer now includes a team radio-card selector (preselected to the first team); pending invites display their target team
- Team chips on non-editable roster rows (owner/self/read-only views) so membership stays visible
- `Card` primitive now forwards an `id` prop (scroll targets/anchors) — fixes the latent dead `#org-members` ⌘K scroll target

### Fixed
- **Permission gating (review HIGH)**: the per-row role/team/Remove controls were gated only by the *target's* role, so a Member sign-in could re-scope other members. All member-management controls (and the Invite button) are now gated on `canManage` (owner or admin) — verified live across both test accounts
- **Mock owner guard**: `mockUpdateMemberTeam` now rejects owner reassignment (defense-in-depth, consistent with `mockUpdateMemberRole`)
- **Missing import**: `mockUpdateMemberTeam` was called in `api.js` but not imported — the handler threw `mockUpdateMemberTeam is not defined` on every team change

## [2026-08-04] - Shared Formatter Extraction

### Changed
- Extracted `formatCount`, `formatDate`, `formatPct`, and `percentOf` into `src/components/app/scanPresentation.js`, alongside the existing `formatRelativeTime`
- Migrated callers to the shared utils: `AppBillingPage` (formatCount/formatDate + used/limit meters now via `percentOf`), `AppApiKeysPage` (formatCount/formatDate, keeping the `'Never'` fallback), `AppDashboardPage` (formatPct), admin `OverviewPage` (formatPct with `digits=1` to preserve the old `toFixed(1)` output), and admin `UsersPage` (formatDate)
- Verified zero local copies remain and outputs are byte-identical to the removed helpers (e.g. `0.94 → "94%"`, meter clamping, em-dash fallbacks)

## [2026-08-04] - Phase 2: Minimal Supabase-Ready Auth (Mock-First Test Accounts)

### Added
- Mock auth layer in `src/lib/mockApi.js`: `mockSignInWithPassword`, `mockRequestPasswordReset`, `mockConfirmPasswordReset`, `mockAcceptInvite`, and a rewritten `mockGetCurrentViewer`
- Two documented test accounts (see `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md`): `founder.admin@provance.local` (admin: dashboard + admin panel) and `founder.test@provance.local` (member: dashboard only, admin routes blocked); any 8+ char password is accepted for a known account
- `src/lib/api.js` now gates `signInWithPassword` / `requestPasswordReset` / `confirmPasswordReset` / `acceptInvite` behind `USE_MOCK` (ADR 004 compliance — auth was the last un-gated surface)

### Fixed
- **Identity elevation bug**: `mockGetCurrentViewer` always returned the admin account, so AuthContext session hydration on any full page load overwrote a signed-in member session with an admin one (requireAdmin never blocked). It now returns the account actually signed in (read from the persisted session), re-deriving permissions from the account by email so tampered sessions cannot elevate

### Notes
- verified live: admin sign-in → dashboard + admin panel; member sign-in → dashboard; member reload on `/app/admin` → `/app/access-denied`; sign-out clears the session and redirects; logged-out visits to protected routes redirect to `/signin?redirect=...`
- legacy sessions seeded with the old mock viewer email (`joshua.onyekachukwu@provance.io`) are no longer recognized on reload and will be cleared — use the two documented test accounts
- the real Supabase path (backend `/auth/sign-in` + `ADMIN_EMAILS` allowlist) is untouched and activates when `USE_MOCK` flips to `false`

## [2026-08-04] - Development Reset: Phase 1 Landing Page Cleanup

### Removed
- `src/pages/HomePage.jsx` — removed the **Open Benchmark** (TrustBar) and **Live Product Preview** (ProductShowcase) sections from the landing page per the Founder reset directive. The component files are preserved in the repo for reintroduction when real product functionality exists to showcase

### Restored
- `src/components/SampleReport.jsx`, `src/components/SampleReportDocument.jsx`, `src/lib/sampleReportContent.js` — reverted to the pre-redesign version (HEAD): the sample report now uses the remote broadcast-frame image instead of the self-hosted ForensicMediaFrame visual

### Notes
- the restored remote image (trae.ai text-to-image host) does not resolve in the preview environment (naturalWidth 0, no network response). Decision pending with the Founder: keep the literal remote image as restored, or render the self-hosted ForensicMediaFrame inside the restored layout (recommended for reliability)

## [2026-08-04] - Multi-Agent Development Operating Model

### Added
- `docs/ai-agents/RUNTIME_MAPPING.md` — operationalizes the documented agent org: every organizational role mapped to the runtime agent types this environment actually exposes (orchestrator, file-picker, code-searcher, basher, researcher-web/docs, code-reviewer-deepseek-flash, preview tools), plus the routing and review workflow
- `docs/engineering/ENGINEERING_STANDARDS.md` — standing code conventions grounded in the codebase: ui primitive kit rules (barrel exports, fast-refresh split, Button `to` prop), Kowalski motion treatment, data layer (USE_MOCK gate, useResource, useDemoState), design tokens, copy rules (no em dashes), quality gates, docs-sync rules
- `docs/engineering/PR_REVIEW_GUIDELINES.md` — reviewer checklist (correctness, consistency, security, scope, docs, validation), severity levels, verdicts, review output format, review-driven fix loop
- `docs/decisions/002-design-system-ratification.md` — UNIFIED design system + ui primitive kit ratified
- `docs/decisions/003-multi-agent-operating-model.md` — multi-agent development operating model ratified (Founder directive)
- `docs/decisions/004-mock-first-frontend-development.md` — single USE_MOCK gate ratified for the MVP phase

### Updated
- `docs/ai-agents/agent-registry.json` — `runtime_mapping` fields updated to the real runtime agent types (was platform names / null)
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` — Phase 2 completion recorded (ui kit, app shell, dashboard, uploads, queue, command registry, Popover, Benchmark page, mock scan lifecycle)
- `docs/MASTER_DOCUMENTATION_INDEX.md` — dead links fixed (WORKFLOW.md, DESIGN_DIRECTION.md, design-audit.md), Phase 2 ui kit table added, user dashboard build status corrected

### Notes
- ratified by the Founder on 2026-08-04 (ADR 003); committed on chore/docs-multi-agent-operating-model

## [2026-08-04] - Media Upload Page (Drag-and-Drop Into The Queue)

### Added
- `src/pages/app/AppUploadsPage.jsx` — full rebuild of the Media Upload page: drag-and-drop zone (click-to-browse via a label-wrapped sr-only input, drag-over highlight, `relatedTarget`-guarded dragleave), **ForensicMediaFrame** preview with a phase-driven badge, and a **processing-mode selector** (Quick / Standard / Deep) with per-mode ETA, description, and coverage list
- Upload-into-queue state machine: `starting → uploading (simulated progress bar in mock mode) → submitting → queued`, with a 4-step tracker, verification ID readout, error state with retry, and a dev-only `?demo=file|start` affordance (inert in production, module-guarded against StrictMode/HMR double-runs)
- Auto-lands on the **Verification Queue** (`/app/queue`) two seconds after the scan is queued (skippable), passing the new scan id via navigation state
- `src/pages/app/AppQueuePage.jsx` — new **Recent Jobs** section: DataTable of all scans with a dismissible "just entered the queue" banner and a "Just added" badge on the newly uploaded scan; demo-state support via `useDemoState`
- Mock scan lifecycle in `src/lib/mockApi.js` — in-memory scan store (localStorage-persisted, capped at 50) plus `mockInitiateScan` / `mockSubmitScan` / `mockGetScan`, with `mockGetQueueSnapshot` now derived from the live store; `initiateScan` / `submitScan` gated behind `USE_MOCK` in `src/lib/api.js` so the upload → queue loop runs end-to-end without a backend

### Notes
- review fixes: `acceptFile` is a no-op while an upload is in flight (no mid-flight file swap desync), validation errors render once (amber block only), dead `inputRef` removed, manual "View verification queue" button forwards the scan id state, `JOBS_COLUMNS` memoized, `aria-live` on the status card
- verified live: file → preview → mode → start → queued → auto-land on the queue with highlight; scan persists across reloads

## [2026-08-03] - Shared Popover Primitive (Origin-Aware Kowalski Treatment)

### Added
- `src/components/ui/Popover.jsx` — new reusable primitive encapsulating the origin-aware popover treatment previously hand-rolled in the shell and CommandPalette: trigger render-prop (`open`/`close`/`toggle`/`isOpen`/`triggerRef`), children render-prop (`{ close }`), transform-origin computed from the trigger element's screen position (clamped to safe %), sub-300ms opacity/scale/y entrance (160ms, `[0.22, 1, 0.36, 1]`), dismissal on outside pointer-down and Escape, and focus moved into the panel on open / restored to the trigger on close
- Reduced-motion path renders the panel as a **plain element** (no framer-motion / `AnimatePresence`) so open/close is instant and never depends on `requestAnimationFrame` — fixes stalled exits when rAF is throttled (verified in the preview, which runs with `prefers-reduced-motion: reduce`)
- `src/components/ui/popoverOrigin.js` — shared `computeTransformOrigin(rect)` helper used by both Popover and CommandPalette so the origin math can't drift; exported from the ui barrel
- UI-kit demo section on `/ui-kit` with a left-anchored popover (open / close-and-count / Escape)

### Migrated
- `src/components/app/AppShellLayout.jsx` — notification bell (`role="dialog"`) and avatar menu (`role="menu"`) rebuilt on the Popover primitive; the local `useDismiss`, `usePopoverFocus`, and `POPOVER_MOTION` helpers plus the now-unused `useRef` and framer-motion imports were deleted (net ~120 lines removed)

### Notes
- review fixes: `desktopClassName` on the migrated components trimmed to just the width (the primitive's default already anchors under the trigger); close() snapshots whether focus was in the panel so focus restore works even when the reduced-motion branch unmounts synchronously
- verified live: bell + avatar menu open with origin-aware transforms, dismiss on outside pointer / Escape, focus returns to the trigger, and the CommandPalette still opens with the shared-helper origin

## [2026-08-03] - CommandPalette Command Registry

### Added
- `CommandRegistryProvider` + `useRegisterCommands` / `useCommandRegistry` (fast-refresh-safe split: component in `commandRegistry.jsx`, hooks/context in `commandRegistryContext.js`)
- any page can contribute ⌘K commands while mounted — auto-register on mount, unregister on unmount, re-register on deps change; page commands override same-id base palette items
- `CommandPalette` merges registry commands into its item list (registry wins by id; no provider = unchanged behavior)
- dashboard registers two page commands: **Export report PDF** (jumps to the latest completed report's print page) and a **workspace toggle** that overrides the shell's same-id action

### Notes
- verified live: commands appear on the dashboard, disappear on other pages, re-appear on return; override collapses duplicate workspace toggle to one entry

## [2026-08-03] - Button-as-Link Primitive (to prop)

### Added
- `Button` now accepts a `to` prop: when set, it renders a react-router `<Link>` with real `href` / middle-click / cmd-click semantics while keeping the exact same visual class string
- disabled + loading handled for the link form via `aria-disabled` + `preventDefault`, with caller `onClick` still forwarded

### Migrated
- placeholder "Back to dashboard", dashboard hero actions (Start verification / View reports / Scan history), and the ui-kit header back link now use `to` instead of hand-rolled Link class strings or navigate-on-click
- `UiKitPage` gained an "As link (to)" demo row

### Notes
- verified live: all migrated actions render as real `<a href=...>` anchors carrying the Button class string

## [2026-08-03] - Dashboard Overview: Triage vs History Workspace Tabs

### Added
- `WorkspaceTabs` — primary workspace surface rebuilt around the Phase 2 primitives: a Tabs (pill) switch between **Triage** (Risk Watch, Queue Posture, System Status Card panels) and **History** (full scan ledger DataTable)
- `LedgerPanel` gains a `pageSize` prop (default 5; History tab uses 8)

### Notes
- keeps the existing mock-backed data flow, hero, analytics KPI StatCard grid, and Activity tabs untouched
- verified live: tab switching (triage panels ↔ history table with 8 rows), demo-state forcing still works across the new structure, and Live restore

## [2026-08-03] - Shared useResource Hook + Real Queue / History / Reports Pages

### Added
- `src/lib/useResource.js` — shared per-slice loader hook extracted from the dashboard, with docs and an optional `deps` param for parameterized loaders (e.g. `[scanId]`); every future workspace page gets loading / empty / error + retry for free
- Real `AppQueuePage` (queue snapshot StatCards + posture card) and `AppHistoryPage` (scans ledger DataTable) replacing their placeholder routes
- `AppReportsPage` rewritten on the hook with retry everywhere; fixed two latent mock-shape bugs (read `response.scans`/`response.scan` which the mock never returns → list and detail now resolve correctly)

### Notes
- dashboard imports the shared hook; local definition and unused react imports pruned
- verified live: dashboard regression clean, queue/history/reports list + scanId-keyed detail render with all state surfaces

## [2026-08-03] - Dashboard Demo-State Controls (dev-only)

### Added
- `src/lib/useDemoState.js` — dev-only utility forcing dashboard section states for review and screenshots
- URL param `?state=loading|empty|error` on `/app` renders every section in that state, gated by `import.meta.env.DEV` so it is inert in production builds
- Floating demo-state banner (Live / Loading / Empty / Error) that switches states without editing the URL
- All seven dashboard resources (scans, reports, notifications, queue, health, analytics, activity) wrapped with `withDemoOverride`; zeroed empty-data fixtures for object-shaped slices

### Notes
- eliminates reliance on the mock's random error injection for demonstrating loading/empty/error surfaces
- verified live: empty (ledger/risk/activity empties + zeroed KPIs), error (every section + retry), loading (all skeletons), and Live restore

## [2026-08-03] - Dashboard Phase 2: Analytics KPI Row, Activity Feed, And Tabs

### Changed
- `src/pages/app/AppDashboardPage.jsx` — the KPI row is now driven directly by `mockAnalytics` instead of scan-derived counts: **Scans Today** (47) and **7-Day Volume** (312) as raw counts, **Completion Rate** (94%) and **Suspicious Rate** (22%) as formatted percents, each StatCard with its own loading / error state from the analytics `useResource` slice (the old Workspace/Queue/Completed/Flagged cards and the now-unused `completionRate` memo were removed)
- Added a **workspace activity feed**: a new `getActivityLogs({ pageSize: 50 })` slice feeds `ActivityFeedRow` items (action prettified via `formatAction`, resource-type colored dots, relative timestamps)
- The bottom Reports + Notifications grid is now an **`ActivityTabsPanel`** using the `Tabs` primitive (pill variant, controlled value) to switch between **Activity / Recent reports / Notifications** — each tab body manages its own loading (skeleton rows), error (retryable EmptyState), and empty states via a shared `FeedState` component; the Notifications tab shows an unread-count badge
- `src/components/ui/Tabs.jsx` — added an optional stable `id` prop so parent panels can complete the `aria-controls` → `role="tabpanel"`/`aria-labelledby` wiring (previously `aria-controls` pointed at non-existent ids)

### Notes
- Live-verified at `/app`: 47 / 312 / 94% / 22% KPI cards, ledger + queue posture panels intact, tab switching renders each feed (report IDs on Recent reports, alert titles on Notifications), activity feed shows formatted events with actor emails, and all 3 tabpanels are aria-linked
- Lint: 14 warnings, 0 errors (below the pre-existing baseline of 15). Build passes.

## [2026-08-03] - Admin Pages Migrated Onto The UI Primitives

### Changed
- `src/pages/admin/OverviewPage.jsx` — admin `StatCard` swapped for the unified `ui/StatCard` (identical props, `size="sm"`) and all raw buttons (retry, show-more) swapped for `ui/Button`; section structure, AttentionCard, QueueSnapshotPanel, SystemHealthPanel, and the audit feed retained
- `src/pages/admin/WaitlistPage.jsx` — rebuilt on the primitives: `DataTable` now owns search/sort/pagination (controlled search so CSV export matches the filtered view), row selection with a bulk-action bar (Approve/Defer/Reject via `Button` success/warning/danger variants), `ui/Drawer` with the decision controls in the sticky footer, `ui/StatCard` with `loading` states (bespoke skeleton deleted), and `Badge` status tones; `ConfirmDialog` retained
- `src/pages/admin/UsersPage.jsx` — rebuilt on the primitives: loads all users once (`pageSize: 200`) so `DataTable` owns search/sort/pagination, role/team pre-filters kept as selects, `AdminSearch` deleted, `ui/Drawer` with inline loading (Spinner) / error (EmptyState + retry) states, role/team `Badge`s, all buttons swapped for `ui/Button`; `ConfirmDialog` retained
- `src/components/ui/DataTable.jsx` — extended with `selectable` rows (checkbox column, select-all with indeterminate, bulk-action bar), controlled search (`searchValue`/`onSearchChange`), and a page-size selector; search input + selection bar now persist across loading/error/empty states so filters can always be cleared
- `src/components/ui/Button.jsx` — added `success` and `warning` variants (emerald / amber) for approve/defer semantics

### Fixed
- WaitlistPage `loadDashboard` no longer depends on `selectedApplicationId` — clicking a row previously re-created the loader, re-ran the mount effect, and reloaded the dashboard mid-drawer (which could wipe the page on the mock's transient error injection); replaced with a `useRef` guard for the one-time auto-select

### Notes
- OrganizationsPage and FeatureFlagsPage still use the legacy admin components (intentionally not in scope; nothing broken — old `admin/StatCard`, `AdminTable`, `AdminDrawer` remain for them)
- Live-verified at `/app/admin`, `/app/admin/waitlist`, `/app/admin/users`: KPI StatCards populated, selectable DataTable with bulk actions, drawer content + decision footers, role/team badges, search persisting in empty state
- Lint: 14 warnings, 0 errors (below the pre-existing baseline of 15). Build passes.

## [2026-08-03] - App Shell: Bell + Avatar Menu Wired To The Toast System

### Changed
- `src/components/app/AppShellLayout.jsx` — the notification bell and avatar menu (plus workspace and sign-out actions) now give real-time feedback through the global `ToastProvider`:
  - **Bell** — "Mark all read" fires a success toast with the pre-cleared unread count (e.g. "All caught up — Marked 13 notifications as read.")
  - **Avatar menu** — Sign out closes the menu and fires an info toast ("Signed out — Your session has ended.")
  - **Sidebar footer** — the sign-out button fires the same info toast
  - **Workspace toggle** — switching Individual/Team fires an info toast describing the new context
  - **Command palette actions** — the workspace-switch and sign-out actions fire the same toasts as their header/sidebar counterparts
- Added shared `signOutWithToast(signOut, toast)` helper so the sign-out toast copy/behavior stays consistent across the three call sites

### Notes
- Toasts survive the sign-out redirect because `ToastProvider` wraps the entire router (including `/signin`) in `App.jsx`
- Review fixes: workspace toggle no longer toasts when the already-active context is clicked (same-context guard), and the triplicated sign-out toast was deduped into one helper
- The grouped sidebar IA, header without debug Route/Access stats, and the bell/avatar-menu popovers themselves were already in place from the earlier shell pass — this change wires them to the toast system
- Live-verified: mark-all-read toast (13 count + badge cleared), workspace-switch toast (badge updated), sign-out toast surviving navigation to `/signin` with session cleared, and no-op toggle producing no toast
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes.

## [2026-08-03] - CommandPalette Primitive (⌘K) + Shell Wiring

### Added
- `src/components/ui/CommandPalette.jsx` — new reusable primitive: dependency-free fuzzy launcher for routes and actions
  - Fuzzy scoring (prefix > word-boundary > contiguous > subsequence) across label, group, and keywords
  - Self-contained global **⌘K / Ctrl+K** shortcut (stale-closure-safe via refs + stable setters)
  - Render-prop trigger (`trigger={({ open, triggerRef }) => …}`) so the launch control is rendered by the palette itself — enabling origin-aware Kowalski popover: the panel scales from the trigger element's screen position via `transformOrigin`, sub-300ms transform/opacity only, honors `prefers-reduced-motion` via the global `MotionConfig`
  - Full keyboard support: ArrowUp/Down (wrapped), Home/End, Enter, Esc, Tab focus trap (options are `tabIndex={-1}` per the `aria-activedescendant` pattern)
  - Accessible combobox: `role=combobox` + `aria-controls` + `aria-activedescendant`, `role=listbox`/`option` with `aria-selected`, `role=dialog` + `aria-modal`, body scroll lock, focus restore to trigger on close, portal + AnimatePresence, grouped results, empty state, footer kbd hints
- Barrel export in `src/components/ui/index.js`; live demo section on `/ui-kit` with navigation items + toast action items

### Changed
- `src/components/app/AppShellLayout.jsx` — palette wired into the app shell: items built from `NAV_SECTIONS` (permission-filtered, locked team routes excluded) plus workspace actions (Start a verification, Browse reports, Switch workspace, Sign out); header search trigger button (icon-only on mobile, label + ⌘K hint on larger screens) opens the palette

### Notes
- Review found + fixed: missing modal focus trap (Tab now stays in the input), and the palette being unreachable on touch devices (trigger was `hidden md:flex` — now always visible as an icon button, ⌘K hint revealed at `sm:`)
- Live-verified: ⌘K opens 20 items with input auto-focused, "reports"/"upload" fuzzy filters correctly, ArrowDown syncs `aria-activedescendant`, Enter navigates (e.g. → /app/uploads), Tab trapped in input
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes.

## [2026-08-03] - Dashboard Overview Rebuilt On Phase 2 Primitives

### Changed
- `src/pages/app/AppDashboardPage.jsx` — full rebuild from first principles on the ui primitive library:
  - **Greeting header** (`DashboardHero`) — signature dark surface with time-of-day greeting, workspace-context `Badge` (team/individual with dot), three quick-action `Button`s (Start verification / View reports / Scan history), last-activity line, and a system-reading panel with loading/error/ready states and live API/Queue health dots
  - **KPI StatCards** — Workspace / Queue / Completed / Flagged via the unified `StatCard` with loading + error states and an analytics-backed completion-rate trend
  - **Verification ledger** — `Card` + `DataTable` (searchable, sortable, paginated, row-click → `/app/reports/:id`, verdict `Badge`s, status `ScanStatusBadge`)
  - **Queue / Risk / System panels** — `Card`-based Queue Posture (MiniStats + backlog warning), Risk Watch (flagged uploads), and Infrastructure status, each with loading/empty/error states
  - **Reports + Notifications** — `Card`-based panels with all four states, verdict badges + confidence bars on reports, category dots on notifications
- Added a `useResource` per-slice loader hook so every section loads independently and can show its own loading/error/retry state without blanking the whole page

### Fixed
- Latent bug: `listScans()` returns `{ data: [...] }` (paginated), but the old dashboard read `response.scans` — the ledger and KPIs could never populate; now reads `r.data`
- Latent bug: the old status filter used `'complete'` while mock data uses `'completed'` — completed counts always read 0
- Unread notification badge now shows the true count (13) instead of the sliced preview count (4)

### Notes
- `AppStatePanel` no longer used on the dashboard (still shared by other app surfaces)
- Live-verified at `/app`: populated ledger, KPIs, queue/risk/infra panels, reports, notifications; the mock's random error injection exercised the error + retry paths end-to-end
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes.

## [2026-08-03] - App Shell Wired Onto Phase 2 Primitives

### Changed
- `src/pages/app/AppPlaceholderPage.jsx` — rebuilt from the bespoke `AppStatePanel` onto the ui primitives: `Card` with `state="empty"` (eyebrow "Coming soon" + `EmptyState` content) and a secondary-sm `Button` with back-arrow icon that navigates to the dashboard via `useNavigate`
- `src/components/app/AppShellLayout.jsx` — the shell now consumes the Phase 2 primitive library: the notification panel's "Mark all read" uses `Button` (ghost/sm), the team-gated nav "Locked" chip uses `Badge` (warning/sm), and the header workspace-context pill uses `Badge` with a status dot (success/info), wrapped in a `hidden xl:block` div to avoid Tailwind display-class merging
- `AppStatePanel` remains untouched — it is shared by 15+ other surfaces (dashboard, reports, uploads, admin, etc.)

### Notes
- Back-navigation uses `Button` + `useNavigate` per the primitive-first directive; a `Link`-styled variant remains an option if link semantics are preferred
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes. Live-verified: placeholder empty-state + back button, ghost mark-all-read, and the Locked `Badge` (confirmed by temporarily seeding team access off, then reverted byte-identical)

## [2026-08-03] - Public Benchmark Page (/benchmark)

### Added
- New public `/benchmark` page rendering the shipped benchmark assets as a designed experience instead of raw file links: executive summary, self-hosted CSS comparison chart (Standard vs. Provance V0.1), error analysis, catalog breakdown, V0.2 expansion panel, and raw-data access strip
- All numbers sourced from `public/benchmark/gold/` — V0.1 report metrics (TWA 1.00 vs 0.79, FPR 0.0% vs 7.5%, 0 vs 4 confident-wrong, ES 1.0 vs 0.0) and the on-disk catalog distribution (100 assets: authentic 40 / synthetic 40 / manipulated 20, tiers 1:64 / 2:16 / 3:20, 8 sources, JPEG 60 / PNG 40)

### Changed
- TrustBar CTAs now point at `/benchmark` (designed page) and `/benchmark#catalog` instead of the raw `.md`/`.json` files
- `ScrollToTop` is now hash-aware so `#catalog` anchors scroll into view after client-side navigation
- Added Benchmark to the footer Resources links

### Notes
- The V0.2 expansion is presented honestly as documented (README_V0.2), not claimed as shipped — the catalog on disk holds the 100-asset gold subset


## [2026-08-03] - App Shell Redesign: Grouped IA, Notification Bell, Avatar Menu

### Added
- Rewrote `AppShellLayout` with a grouped sidebar information architecture: **Overview / Workspace / Organization / Developer / Settings / Help**, each with inline SVG icons and a locked state for team-gated routes
- Notification bell in the header with unread badge (13 from `mockNotifications`), dropdown dialog with mark-as-read + mark-all-read, and a view-all link to `/app/notifications`
- Avatar menu with profile header, quick links (Profile / Security / Notifications / Billing / Help & Support), and sign out; proper `role="menu"/"menuitem"` semantics
- 10 new placeholder routes (`/app/activity`, `/app/queue`, `/app/history`, `/app/organization`, `/app/billing`, `/app/api-keys`, `/app/docs`, `/app/security`, `/app/notifications`, `/app/help`) wired through `AppPlaceholderPage`
- `useDismiss` (outside-click + Escape) and `usePopoverFocus` (focus-in-on-open, focus-restore-on-close) popover primitives

### Changed
- Removed the debug Route / Access stat cards from the header; replaced the stat grid with a workspace-context pill, notification bell, and avatar menu
- Page metadata (eyebrow/title/detail) is now derived from the single `NAV_SECTIONS` source of truth

### Notes
- `mockNotifications[].link` is intentionally not navigated yet (report routes not wired to the bell); documented in code


## [2026-08-03] - Phase 2 Foundation: UI Tokens And Component Primitives

### Added
- Extended app UI tokens and base utilities in `src/index.css` (`.ui-eyebrow`, `.ui-card`, `.ui-input`, `.ui-focus-ring`) per the UNIFIED design system.
- New primitive library `src/components/ui/` (with barrel export): `Button` (4 variants × 3 sizes, loading/disabled, icons, `aria-busy`), `Badge` (5 tones, dots, sizes), `Card` (default/loading/empty/error states), `StatCard` (tones, trend chips, loading/error — API-compatible with the admin StatCard), `DataTable` (sort with `aria-sort`, search, pagination, row click, full states), `Tabs` (roving tabindex, arrow keys, animated indicator), `Drawer` (portal, focus trap, Esc, scroll lock), `Toast` + `ToastProvider`/`useToast` (global notifications, `aria-live`, auto-dismiss), `EmptyState`, `Skeleton`, `Spinner`.
- `src/pages/UiKitPage.jsx` — live gallery at `/ui-kit` demonstrating every primitive in every state, driven by real `mockData.js`.
- App wiring in `src/App.jsx`: `ToastProvider` wraps the router, `MotionConfig reducedMotion="user"` makes all framer-motion animations respect `prefers-reduced-motion`, `/ui-kit` route added.

### Notes
- `useToast` lives in `src/components/ui/useToast.js` to satisfy react-refresh/only-export-components.
- Kowalski-informed behavior: sub-300ms transform/opacity animations, `active:scale(0.97)` press feedback, explicit focus-visible rings, `print:hidden` on the toast viewport.
- Lint: 0 new warnings (baseline 15 pre-existing, untouched). Build passes. Live preview verified at `http://localhost:3000/ui-kit`.

## [2026-08-03] - Landing Page P0: Product Proof And Trust Signals

### Added
- `src/components/ForensicMediaFrame.jsx` — self-hosted SVG/CSS "media under verification" visual (broadcast scene, forensic grid, animated scan band, corner brackets, annotation chips, metadata readouts). Replaces all remote AI-generated image dependencies; respects `prefers-reduced-motion` and uses namespaced gradient IDs.
- `src/components/TrustBar.jsx` — homepage benchmark/trust strip surfacing real figures from `public/benchmark/` (TWA 1.00 vs 0.79, 0.0% FPR vs 7.5%, 0 confident-wrong results, 500-asset adversarial gold catalog) with links to the published report and catalog.

### Changed
- `src/pages/HomePage.jsx` — homepage now includes TrustBar and the recovered Product Showcase section directly after the Hero.
- `src/components/ProductShowcase.jsx` — recovered from dead code, remote image replaced with ForensicMediaFrame, hedged "coming-soon" copy made present-tense.
- `src/components/SampleReport.jsx`, `src/pages/SampleReportPage.jsx`, `src/components/SampleReportDocument.jsx` — remote trae.ai images replaced with ForensicMediaFrame.
- `src/lib/sampleReportContent.js` — removed the now-unused remote `sampleReportPreviewImage` export.
- `src/components/Pricing.jsx` — homepage pricing expanded from 3 to 4 tiers (Early Access / Pro / Team / Enterprise), aligned with `/pricing`, with indicative prices (Pro from $49/mo, Team from $249/mo), a founding-rate note, and a link to the full pricing model.
- `src/index.css` — added the forensic scan-band keyframe animation (transform-only, gated by `prefers-reduced-motion`).

### Notes
- All benchmark figures are taken directly from `public/benchmark/gold/BENCHMARK_REPORT_V0.1.md` and `README_V0.2.md`; no invented numbers.
- Benchmark links use native anchors (not router `Link`) so the static files load directly instead of hitting the SPA 404 route.
- `npm run lint` and `npm run build` pass; live preview verified at `http://localhost:3000`.

## [2026-08-04] - Phase 3 Slice 6: Organization Management

### Added
- `src/pages/app/AppOrganizationPage.jsx` - full Organization Management page replacing the placeholder: workspace profile stat grid (plan/seats/scans/storage), member roster with avatar initials + role badges, per-member role select + Remove (owner + current user protected), pending-invites list with Cancel, invite Drawer (email + role radio cards with validation), all with loading/empty/error via `?state=` demo forcing and page-scoped ⌘K commands
- `src/lib/mockData.js` - `mockOrgWorkspace` (profile, 4 members, 2 pending invites)
- `src/lib/mockApi.js` - `mockGetOrganization` / `mockInviteMember` / `mockUpdateMemberRole` / `mockRemoveMember` / `mockCancelInvite`; `src/lib/api.js` - five functions gated behind `USE_MOCK`
- `/app/organization` route now renders the real page

### Fixed
- HIGH: current-user identity was hardcoded to `usr_001` — a member sign-in would still see owner controls. Now derived from `useAuth().user?.id`, so the member account correctly shows zero Remove/role/invite controls and the "You" badge tracks the real session
- invite-id generation is max-numeric + 1 (no collisions after cancels)
- seat capacity is now enforced: invite button disabled at 4/4 and the mock rejects invites past the seat limit

### Notes
- page-scoped ⌘K commands: invite a team member, view member roster
- dead `organization` entry removed from `AppPlaceholderPage`; unused `ORG_ROLE_META` export removed

## [2026-08-04] - Frontend Completion Review + Backend Stack Recommendation

### Added
- `docs/reports/2026-08-04-frontend-completion-review.md` - full frontend completion report, remaining-work list, backend readiness verdict, technology-by-technology stack review (Neon, Redis/Valkey, Fly.io, Cloudflare, R2, Workers, queues, storage, CDN, caching, search, monitoring, logging, email, auth, API architecture, file processing, deployment), performance/scalability recommendations, complete feature inventory from the docs corpus, and 10 recommended new features pending Founder approval

### Updated
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - refreshed to Phase 3 completion state
- `docs/project-state/current-feature-status.md` - status table refreshed (Phase 3 slices marked Complete, remaining placeholders listed)
- `docs/MASTER_DOCUMENTATION_INDEX.md` - user dashboard table expanded to 14 rows with real build status; report linked

### Notes
- no new features added automatically; recommendations await Founder review (per workflow)

## [2026-08-04] - Phase 3 Slice 5: Help & Documentation

### Added
- `src/pages/app/AppHelpDocsPage.jsx` - one component serving both `/app/docs` (searchable guide cards with category badges / read minutes / numbered steps, category Tabs) and `/app/help` (FAQ accordions with aria-expanded/aria-controls wiring, category Tabs), plus a shared contact-channels card and a contact Drawer (form → simulated send → success state) with page-scoped ⌘K commands per module
- `src/lib/mockData.js` - `mockDocsContent` (7 guides across 4 categories + channels) and `mockHelpContent` (8 FAQs across 4 categories + channels)
- `src/lib/mockApi.js` - `mockGetHelpContent({ module })`; `src/lib/api.js` - `getHelpContent` gated behind `USE_MOCK`
- both routes render the real page; loading/empty/error states wired to `?state=` demo forcing

### Fixed
- HIGH: both routes render the same component, so React Router updates `module` without remounting — `module` is now a `useResource` dep so content refetches when switching docs ↔ help
- send-simulation timer is cleared on drawer close/unmount (no stale success state or orphaned toast)
- search/category/FAQ state resets when switching modules
- contact channel links now navigate (`/app` hrefs) instead of being dead

### Notes
- dead `docs` and `help` entries removed from `AppPlaceholderPage`

## [2026-08-04] - Phase 3 Slice 4: API Keys

### Added
- `src/pages/app/AppApiKeysPage.jsx` - full API Keys page replacing the placeholder: 4 summary stats (active keys, 30d requests, scopes, limit), key table with prefix masking / scope badges / usage + last-use / status badges and Regenerate + Revoke actions, reveal-once token banner with Copy (clipboard with selection fallback), limits & scopes reference card, create-key Drawer (name + scope checkboxes with validation), revoke-confirmation Drawer
- `src/lib/mockData.js` - `mockApiKeys` (4 keys across active/expired/revoked), `API_KEY_SCOPES`, `mockApiKeyLimits`
- `src/lib/mockApi.js` - `mockGetApiKeys` / `mockCreateApiKey` (full token returned exactly once, store keeps only the prefix) / `mockRevokeApiKey` / `mockRegenerateApiKey`; `src/lib/api.js` - four functions gated behind `USE_MOCK`
- `/app/api-keys` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Fixed
- clipboard copy now awaits + catches, falling back to selecting the token text (no more false success toast)
- removed the dead "Hide token" dead-end state (Done closes the banner; token is unrecoverable after)
- `makeKeyId` derives max numeric id + 1 instead of length-based (future removal-path safe)

### Notes
- page-scoped ⌘K commands: create a key, regenerate a key
- dead `api-keys` entry removed from `AppPlaceholderPage`

## [2026-08-04] - Shared formatRelativeTime Util

### Refactored
- Extracted the duplicated `formatRelativeTime` helper into a single shared export in `src/components/app/scanPresentation.js` (null guard, just now / m / h / d ago branches, 7-day threshold, locale-date fallback)
- Migrated all five callers off their local copies: `AppShellLayout`, `AppDashboardPage`, `AppNotificationsPage`, `AppSecurityPage`, and admin `ActivityRow` — local declarations removed, imports wired at the correct relative depth per file

### Notes
- the shell's old compact style ("now"/"3m", 30-day threshold) is unified to the app-wide "just now"/"3m ago", 7-day threshold — a deliberate consistency normalization

## [2026-08-04] - Phase 3 Slice 3: Security Settings

### Added
- `src/pages/app/AppSecurityPage.jsx` - full Security Settings page replacing the placeholder: password change form with live requirement checks (min length / uppercase / number / symbol), active sessions list with per-session Revoke (current-device badge, current session protected), and sign-in controls (2FA toggle, new-device alerts, password-change alerts, auto sign-out timeout select)
- `src/lib/mockData.js` - `mockSecuritySettings` (password policy, 4 active sessions, sign-in controls)
- `src/lib/mockApi.js` - `mockGetSecuritySettings` / `mockChangePassword` / `mockRevokeSession` / `mockUpdateSecuritySetting`; `src/lib/api.js` - four functions gated behind `USE_MOCK`
- `/app/security` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Fixed
- shape-aware toggle so boolean notify flags (vs the `{enabled}` 2FA object) toggle correctly
- mock revoke now persists at the module level, matching 2FA persistence semantics

### Notes
- 2FA toggle is an explicit preview action (not wired to a real provider)
- page-scoped ⌘K commands: change password (focuses the form), revoke all other sessions, toggle 2FA
- dead `security` entry removed from `AppPlaceholderPage`

## [2026-08-04] - Phase 3 Slice 2: Billing (UI only)

### Added
- `src/pages/app/AppBillingPage.jsx` - full Billing page replacing the placeholder: plan overview card (Pro / $49 / renews date / Active badge), usage metering (StatCard row + progress meters with 70/90% tone thresholds), payment-method cards (Visa/MC brand marks, Default badge), and invoice history table (PV-26-xxxx numbers, paid/open badges, download toast)
- `src/lib/mockData.js` - `mockBillingProfile` (plan, usage limits, payment methods) + `mockInvoices` (8 records)
- `src/lib/mockApi.js` - `mockGetBilling` (bundled profile + invoices) + `mockGetInvoices` (paginated); `src/lib/api.js` - `getBilling` / `getInvoices` gated behind `USE_MOCK`
- `/app/billing` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Notes
- billing is explicitly a UI preview: plan change, add card, and invoice download are toast-backed preview actions
- page-scoped ⌘K commands: change plan, download latest invoice, add payment method
- dead `billing` entry removed from `AppPlaceholderPage`

## [2026-08-04] - Phase 3 Slice 1: Notifications Center

### Added
- `src/pages/app/AppNotificationsPage.jsx` - full Notifications Center replacing the placeholder: category tabs with live counts, unread-first sorting, per-item mark-read with toast, linked notifications navigate to report routes, mark-all-read, expandable detail for unlinked items, and page-scoped ⌘K commands (mark all read, show unread, open first unread)
- `/app/notifications` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Notes
- page commands follow the palette's `label`/`group`/`hint`/`keywords`/`onSelect` registry contract
- dead `notifications` entry removed from `AppPlaceholderPage` module map

## [2026-08-04] - Dev Test-Account Quick-Fill + Phase 3 Kickoff

### Added
- Dev-only test-account quick-fill on the sign-in page (`src/pages/SignInPage.jsx`): one click fills either documented account, inert in production builds via `import.meta.env.DEV` (matches the `?state=` / `?demo=` dev affordance pattern)

### Notes
- quick-fill buttons: Admin account (`founder.admin@provance.local`) and Member account (`founder.test@provance.local`), both with the standard 8+ char mock password
- Phase 3 (user dashboard polish) begins after Phase 1 + 2 approvals

## [2026-07-29] - Scorecard Improvement And Multimodal MVP Strategy

### Added
- `docs/startup-scorecard-improvement-plan.md` - Follow-up strategy report showing how to improve the startup scorecard, reduce risk, and expand the MVP from image-first into controlled audio and video verification

### Notes
- this document builds on the existing investor-facing diligence package
- the recommended multimodal path keeps image as the strongest wedge while treating audio and video as controlled beta expansions

## [2026-07-29] - Startup Assessment And Investor Documentation Package

### Added
- `docs/startup-assessment-report.md` - Institutional-style startup assessment and due diligence report covering market, product, technology, valuation, risks, competitive landscape, and recommendations
- `docs/investor-memo.md` - Investment-committee style memo for investors, advisors, accelerators, and strategic partners
- `docs/executive-summary.md` - One-page investor overview summarizing the company, opportunity, readiness, valuation posture, and recommendation

### Notes
- these documents are based primarily on the repository documentation corpus under `docs/`
- current-state implementation and roadmap documents were treated as the primary source of truth where older materials were more aspirational

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
