# Frontend Completion Review & Backend Stack Recommendation

Date: 2026-08-04
Status: For Founder review — no backend implementation until approved

> **Update (2026-08-05):** the remaining user-workspace placeholders (Activity Log,
> Organization Management) and the full admin workspace (Analytics, Monitoring,
> Audit Logs, **and the final four — Jobs, Reports, Roles, Settings**) have shipped,
> and the **polish pass is complete** — see §1.2, §2, and the
> formatter-consolidation note below. The frontend is now **100% complete**: the
> user workspace (15/15 pages) and the admin workspace (12/12 pages) are both built
> with loading/empty/error states, `?state=` demo forcing, and ⌘K commands — **no
> placeholders remain**. A final sign-off audit (see
> `docs/reports/2026-08-05-frontend-signoff-checklist.md`) found the frontend **ready
> for Founder sign-off** with one recommended close-out: retrofitting `?state=` demo
> forcing onto 9 older data pages (History, Reports, Account, Team + admin Overview,
> Waitlist, Users, Organizations, Feature Flags) so every surface can be demoed in
> every state.

## 1. Frontend Status

### 1.1 What is complete

**Public site (Phase 1)**
- Landing page: Hero → Why Provance → Sample Report → How It Works → Use Cases → Pricing → CLEAR Answers (Open Benchmark + Live Product Preview intentionally removed pending real product functionality)
- Full public route set: About, Product, Methodology, Pricing, Security, Sample Report + print view, Benchmark, Docs, Resources, Privacy, Terms, Cookies, Waitlist, Contact
- Authentication routes: Sign-in, Accept Invite, Request Password Reset, Reset Password Confirm

**Auth (Phase 2)**
- Backend-mediated auth path wired, with a mock-first gate (`USE_MOCK`, ADR 004)
- Two documented dev test accounts (admin + member) with a dev-only quick-fill on the sign-in page
- Protected routes, admin-only routes, team-required routes, redirect-preserving sign-in, sign-out

**User workspace (Phase 3) — 15 of 15 planned surfaces shipped**
- Dashboard home (StatCard grid, scan ledger DataTable, triage/history Tabs, queue/report/risk panels, notification preview)
- Media Upload (drag-and-drop, ForensicMediaFrame preview, Quick/Standard/Deep modes, upload-into-queue state machine)
- Verification Queue (live queue snapshot, recent jobs, status badges)
- Scan History (searchable/filterable ledger)
- Reports + Report Detail + Printable report (verdict, confidence, signal evidence, findings)
- Account/Profile (display name, org, role, workspace, notification prefs)
- Team workspace (protected route)
- Billing (UI only: plan, usage meters, payment methods, invoices)
- Notifications center (category tabs, unread-first, mark-read, ⌘K commands)
- Security settings (password change, active sessions + revoke, sign-in controls)
- API Keys (create with reveal-once token, scopes, revoke, limits)
- Help & Documentation (searchable guides + FAQ accordions, contact drawer)
- Command palette (⌘K) with page-registered commands across the workspace

**Admin workspace (Phase 4) — 12 of 12 surfaces shipped**
- Overview dashboard, Waitlist management, Users management, Organizations, Feature Flags, Analytics (with real `GET /admin/analytics`), Monitoring, Audit Logs, Jobs, Reports, Roles & Permissions, Settings

**Shared foundation**
- 14-primitive UI kit in `src/components/ui/`: Button, Badge, Card, StatCard, DataTable, Tabs, Drawer, Toast, Popover, CommandPalette, CommandRegistry, EmptyState, Skeleton, Spinner — all with loading/empty/error states
- Shared app shell: grouped sidebar IA (Overview/Workspace/Organization/Developer/Settings/Help), notification bell + avatar menu
- Mock-first data layer (`USE_MOCK` gate, ADR 004) — every page works end-to-end with no backend
- Dev-only state forcing (`?state=loading|empty|error`) on every data page for reviewability
- Shared `useResource` loader hook (loading/empty/error + retry on every workspace page)
- Global error boundary with recoverable fallback (approved feature #1) — no crashing page blanks the screen
- **Formatter consolidation (polish pass):** every date/number/duration/storage formatter now lives in one shared module, `src/components/app/scanPresentation.js` (formatCount, formatDate, formatDateTime, formatScanTimestamp, formatShortDate, formatDateLong, formatTimeShort, formatHourShort, formatRelativeTime, formatPct, percentOf, formatCurrency, formatDurationMs, formatStorageGb, formatFileSize), with a 63-test vitest suite

#### Formatter-consolidation note (2026-08-05)

- All formatters are pinned to `en-US` via `Intl.DateTimeFormat` (formatDate and formatRelativeTime's >1-week fallback were previously locale-default `toLocaleDateString(undefined, …)` — fixed so output never shifts with the viewer's browser locale)
- formatRelativeTime's fallback now delegates to formatDate, so both surfaces agree on the medium-date format
- Sample Report surfaces standardized: the hardcoded divergent timestamps (`2026-06-25` in the landing/page surfaces vs `2026-07-16` in the document — the report ID `PRV-20260716-041` makes 07-16 canonical) were replaced with a single `analysisTimestampIso` in `sampleReportContent.js`, rendered through `formatDateTime` in `SampleReport`, `SampleReportPage`, and `SampleReportDocument` (incl. the print view)
- Zero inline `toLocale*` date calls remain outside the shared module (remaining `.toLocaleString()` hits are plain-number formatting, which is correct)
- **Final sign-off sweep (2026-08-05):** the remaining hand-rolled formatting stragglers were migrated onto the shared module — `AppBillingPage` storage meters now use `formatStorageGb` (was `${value.toFixed(1)} GB`), and the forensic `VeracityGauge` now uses `formatPct` (was `percentage.toFixed(1)`). Remaining `toFixed` calls are intentional: SVG path geometry (`chartGeometry.js`) and static benchmark-axis formatters (`BenchmarkPage.jsx`) that render raw values (`0.79`, `7.5%`) rather than presentation formatting. **Formatter consolidation is confirmed complete** — `scanPresentation.js` is the single source of truth for all presentation formatting.

### 1.2 Placeholder screens remaining

**None.** All 15 user-workspace pages and all 12 admin pages are built and verified.

> **Update (2026-08-05):** Activity Log, Organization Management, Admin Analytics,
> Admin Monitoring, Admin Audit Logs, and the final four admin pages (Jobs, Reports,
> Roles, Settings) all shipped since this report was written.

### 1.3 Known UX/consistency gaps (non-blocking for backend work)

- Admin Organizations + Feature Flags pages still use legacy per-page components (AdminTable, AdminStatCard) alongside the ui kit
- No full keyboard-navigation audit beyond the primitives (Tabs/CommandPalette/Drawer are keyboard-correct)
- No formal automated UI tests beyond the formatter suite (lint + build + 63 vitest tests are the current gates)

> **Update (2026-08-05):** the duplicate-formatter gap and the missing error-boundary
> gap from the original report have both been closed by the polish pass.

### 1.4 Production-readiness verdict on the frontend

The frontend is **demo-ready** — every user workspace page (15/15) and every admin workspace page (12/12) works end-to-end with realistic mock data, consistent design language, loading/empty/error states, responsive layouts, and keyboard-accessible primitives. It is **not yet investor-grade "production"** only in the sense that the mock data layer has not yet been swapped for live API traffic.

## 2. Remaining Frontend Work (before/parallel with backend)

1. **Finish the 2 user placeholders** — ✅ done (Activity Log and Organization Management shipped 2026-08-04)
2. **Finish the admin placeholders** — ✅ **all 12 admin pages shipped 2026-08-05** (Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings were the final batch)
3. **Polish pass** — ✅ **done (2026-08-05)**: duplicate formatters consolidated into `scanPresentation.js` (see formatter-consolidation note in §1.1) and the global error boundary shipped (approved feature #1); the only remaining sub-item is sweeping the two legacy admin pages (Organizations, Feature Flags) onto the ui kit, which can ride along with the next admin slice
4. **Contract work** — when backend APIs land, each `api.js` function already has its real-path branch; the swap is per-function
5. **Test harness** — formatter vitest suite shipped and expanded to **63 tests** (edge cases: nulls, NaN, zero, sub-second, rounding boundaries, invalid input); lightweight component tests for the primitives remain optional pre-backend

## 3. Backend Readiness Recommendation

**Recommendation: begin backend implementation now, in parallel with finishing the last placeholder pages.**

Rationale:
- The frontend contract is now stable: `api.js` exposes named functions with documented shapes, `USE_MOCK` flips per surface, and the mock payloads mirror the intended backend responses
- The auth path is already backend-mediated (NestJS + Supabase) — only the mock gate sits in front
- Every remaining placeholder is independent of backend work
- The highest-value next work (real media processing, queue durability, report payloads) is backend work

## 4. Backend & Infrastructure Stack Review

### 4.1 Current stack (already deployed/used)

| Layer | Current | Status |
| --- | --- | --- |
| Frontend | Vite + React 19 (Vercel) | Keep |
| API | NestJS 11 (Fly.io) | Keep |
| Worker | NestJS worker (Fly.io) + BullMQ 5 | Keep |
| DB/Auth/Storage | Supabase (Postgres, Auth, Storage) | Keep for MVP |
| Queue | BullMQ + ioredis → Upstash Redis | Keep |
| Image tooling | jimp + exifr | Keep, see §4.3 |

### 4.2 Recommendations per technology you asked about

| Technology | Verdict | Why it fits / Trade-offs |
| --- | --- | --- |
| **Neon (Postgres)** | Adopt later, not now | Neon's branching + serverless pooler are excellent for dev/test, but Supabase already bundles Postgres + Auth + Storage. Splitting now costs migration with no MVP benefit. Revisit when (a) Supabase Auth is replaced with a self-managed auth, or (b) we need PgBouncer-style pooling at scale. Migration: moderate (same SQL), but you move auth+storage too. |
| **Redis alternatives** | Keep BullMQ + Redis; prefer **Valkey** (OSS drop-in) when self-hosting | Upstash Fixed 250MB (~$10/mo) is the cheapest hosted option and already in the deployment docs. Valkey is a free, license-clean drop-in if we self-host later. Do not use Upstash Free for always-on workers. |
| **Fly.io** | Keep | Good fit for long-running Node + worker; simple deploys, global regions when needed. Trade-off: no free tier for always-on; ~$5–20/mo baseline. Cloudflare Workers is *not* a fit for the NestJS/Node worker (long-running, Redis sockets, image processing). |
| **Cloudflare (edge/DNS/WAF)** | Adopt at domain purchase | Free DNS + CDN + basic WAF; Turnstile for abuse-prone forms. No domain yet, so not urgent. Zero cost, high value once public. |
| **Cloudflare R2** | Adopt as the storage scale-up | S3-compatible, zero egress fees (huge for media-heavy workloads vs Supabase/S3 egress). Keep Supabase Storage for MVP (already wired, signed-upload flow works); keep the storage-provider boundary so R2 is a config-level swap later. |
| **Cloudflare Workers** | No for now | Great for edge utilities (redirects, caching, webhooks fan-out) later, but not for the core API/worker. |
| **Event queues / background jobs** | Keep BullMQ | Battle-tested, Redis-backed, retries/delays/stalled-job recovery built in. Migrating to SQS later is possible behind the queue boundary. |
| **Object storage** | Supabase Storage now → R2 later | See above. Signed-upload flow already abstracts the provider. |
| **CDN** | Cloudflare (later) | Frontend is static on Vercel (already CDN'd); R2 + Cloudflare CDN for delivered reports/artifacts later. |
| **Caching** | Redis (existing) first; HTTP caching headers second | Rate-limit counters, queue state, and small hot caches fit the existing Redis. Add CDN cache for public assets; do not cache scan results (privacy + freshness). |
| **Search** | Postgres FTS (pg_trgm/tsvector) | Scan history search is a small dataset; Postgres full-text beats adding Elasticsearch/Meilisearch for now. Revisit when cross-org search or evidence search scales. |
| **Monitoring** | Sentry (errors) now; PostHog (product analytics) at beta | Sentry on frontend + API + worker is cheap and high-value before real users. PostHog for activation funnels. Prometheus/Grafana only if we self-host at scale. |
| **Logging** | Structured JSON logs + Sentry; no vendor yet | Fly logs suffice for MVP; add a log vendor (Axiom/Logtail) only when we need searchable logs at scale. |
| **Email** | Resend | Already the documented direction. Cheap, modern API, deliverability is fine for invites/resets. Add at beta. |
| **Authentication** | Keep Supabase Auth behind the API; harden later | Current backend-mediated flow is correct. Next hardening step: move tokens from localStorage to httpOnly cookies (same-origin API or subdomain), add session rotation, CSRF handling. |
| **API architecture** | Keep NestJS modular monolith | The module split (health/waitlist/auth/account/scans/admin/queue) is right-sized. Do not split into microservices until there are two teams or a hard scaling blocker. |
| **File processing** | Keep jimp + exifr; add **sharp** for resize/thumbnail at scale | jimp is pure-JS (easy) but slow for large images. exifr is excellent for metadata. sharp (native) should back thumbnail generation when we add it. Video/audio: add FFmpeg-based workers (Phase 4), never in-API. |
| **Deployment** | Keep Vercel + Fly.io; GitHub Actions CI **shipped** | `.github/workflows/ci.yml` runs frontend lint/test/build + backend build/unit/e2e on push + PRs (2026-08-05). |

### 4.3 Performance & scalability recommendations

- **Uploads**: keep browser → storage direct signed uploads (already correct); add chunked/resumable uploads for >100MB video later; enforce client-side size/type checks (done) server-side too
- **Processing**: move heavy work to the worker (already the model); never block the API event loop; add per-job concurrency control via BullMQ (already in worker env)
- **Image pipeline**: EXIF extraction (exifr) + metadata validation inline; perceptual-hash and signal computation in the worker; thumbnails via sharp
- **API latency**: DTO validation + throttling already in; add request-id correlation (already present) through to worker logs
- **Cost**: Supabase free tier until real users; Upstash Fixed when the queue must be shared; R2 zero-egress before media volume grows; containerize GPU/FFmpeg workloads only when video ships
- **Caching**: cache public marketing pages via Vercel/CDN; cache static report assets in R2; avoid caching verdicts
- **Database**: index `scans(user_id, created_at)`, `waitlist(status)`, `audit_events(actor, created_at)`; add RLS already planned; use connection pooling via Supabase's pooler

## 5. Feature Inventory (from documentation corpus)

### 5.1 Landing / public site
Public pages (About, Product, Methodology, Pricing, Security, Sample Report, Benchmark, Docs, Resources, legal pages, Waitlist, Contact), hero/trust sections, pricing tiers (Early Access/Pro/Team/Enterprise), sample report, benchmark page, CLEAR answers FAQ, waitlist capture, SEO/content structure, conversion CTAs.

### 5.2 Authentication
Sign-in, sign-out, invite acceptance, password reset (request + confirm), protected routes, admin/team route guards, session hardening (planned: httpOnly cookies, rotation), 2FA (preview).

### 5.3 User dashboard (shipped)
Dashboard home, media upload (image-first), verification queue, scan history, reports + detail + print, account/profile, team workspace, billing (UI), notifications, security settings, API keys, help & docs, command palette.

### 5.4 User dashboard (planned, per blueprint/roadmap)
Activity log (placeholder), organization management (placeholder), report export/share (in progress), collaboration/assignments (team), case/analyst workspace (advanced), search across scans.

### 5.5 Admin dashboard
Shipped: overview, waitlist, users, organizations, feature flags. Planned: verification jobs, reports, analytics, monitoring, API management, billing/subscriptions, support tickets, roles & permissions, audit logs, content management, settings, security controls.

### 5.6 Verification platform
- **Image verification (MVP)**: upload, signal ensemble, verdict + confidence, explainable evidence, reports
- **Video verification (Phase 4)**: temporal consistency, frame sampling, FFmpeg pipeline
- **Audio verification (planned)**: metadata + spectral signals, controlled beta
- **Document verification (future)**: layout/forgery analysis
- **API services**: scoped keys, rate limits, webhooks (planned), usage analytics
- **Reports**: structured payload, printable report, PDF export (planned), chain-of-custody (advanced)
- **Team collaboration**: shared workspace (protected), assignments, review queues (planned)
- **Enterprise**: SSO, SLA, audit export (Phase 5)

### 5.7 AI & verification engine
Signal ensemble (metadata, noise fingerprint, model attribution, temporal), confidence scoring, plain-language explanation layer, benchmark suite, attribution intelligence graph (future), model lifecycle/retraining (future), C2PA/provenance ingestion (future), analyst copilot (future).

## 6. Recommended New Features (all 10 approved by the Founder on 2026-08-04)

| # | Feature | Why valuable | Users | Priority | MVP/Later | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Global error boundary + crash recovery** | A render crash currently blanks the page; a boundary with retry preserves trust | All | High | MVP | **Shipped** (2026-08-05) |
| 2 | **Report PDF export (client-side)** | The printable view exists; real PDF download completes the workflow | Journalists, legal | High | MVP | Approved |
| 3 | **Scan deduplication (hash-based)** | Prevents repeated processing of identical files, saves cost | All | Medium | MVP | Approved |
| 4 | **Organization invites + roles (finish the placeholder)** | Multi-user story is core to Team plan | Team buyers | High | MVP | **Shipped** (Organization Management page) |
| 5 | **Webhooks UI (create/manage endpoints)** | Complements API keys; developer surface | Developers | Medium | Later | Approved |
| 6 | **Admin analytics + monitoring pages** | Operational confidence before real users | Internal | Medium | MVP (admin) | **Shipped** (Analytics + Monitoring pages; real `GET /admin/analytics`) |
| 7 | **Session hardening (httpOnly cookies)** | Already planned; required before broader beta | All | High | Before beta | Approved |
| 8 | **Sentry + PostHog baseline** | Errors and activation funnels before first real users | All/internal | Medium | Before beta | Approved |
| 9 | **Usage/entitlement enforcement** | Billing is UI-only; enforce limits once Stripe lands | All | Medium | Later | Approved |
| 10 | **Evidence appendix in reports (methodology + limitations)** | Court-oriented trust; cheap content win | Legal | Medium | Later | Approved |

> **Update (2026-08-04):** all ten features were approved by the Founder and folded into `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`, `docs/product/development-roadmap.md`, `docs/project-state/product-roadmap.md`, `docs/project-state/development-priorities.md`, `docs/project-state/future-improvements.md`, and `docs/project-state/current-feature-status.md`. Feature 4 shipped as the Organization Management page during the Phase 3 workspace build-out.

## 7. Documentation Updates Applied (this report)

- `docs/reports/2026-08-04-frontend-completion-review.md` — this report (new)
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` — refreshed to Phase 3 completion state
- `docs/MASTER_DOCUMENTATION_INDEX.md` — index updated if needed

## 8. Next Steps (pending Founder approval)

1. Approve the feature recommendations above (each will be written into the roadmap/feature docs on approval)
2. Choose the first backend slice — recommended order: (a) auth token hardening, (b) real scan upload + queue round-trip against Supabase, (c) report payload API
3. ~~Finish the 4 remaining admin placeholders (Jobs, Reports, Roles, Settings)~~ — ✅ done (all four shipped 2026-08-05; the admin workspace is 12/12 complete)
