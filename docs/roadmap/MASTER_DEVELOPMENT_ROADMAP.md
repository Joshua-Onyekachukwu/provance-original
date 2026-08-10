# Master Development Roadmap

Last updated: 2026-08-07

## Purpose

This is the canonical execution roadmap for taking Provance from its current state to a production-ready MVP.

It governs:

- phase order
- phase scope
- delivery status
- dependencies
- acceptance criteria
- related documentation

If any summary document conflicts with this roadmap, this file wins.

## Status Legend

- Not Started
- In Progress
- In Review
- Completed
- Deferred

## Complexity Scale

- Low: limited surface area, low coordination cost
- Medium: multiple app or backend surfaces, moderate regression risk
- High: cross-cutting architecture, security, or infrastructure work

## MVP Delivery Principles

- landing page work is complete enough for the current phase
- the MVP must favor production-suitable services with strong free tiers or startup credits
- paid services should be delayed unless they unblock real product validation
- the immediate product goal is a working dashboard, admin workspace, reports workspace, account system, and reliable verification flow
- AI-provider expansion, billing, and non-essential integrations are deferred until the working MVP is stable

## Phase 0. Documentation And Execution Foundation

**Objective**

Align documentation, workflow, architecture, and standards so the repository becomes the single source of truth.

**Current Status**

Completed

**Priority**

P0

**Estimated Complexity**

Medium

**Deliverables**

- updated roadmap
- updated feature checklist
- updated architecture and stack docs
- updated setup and infrastructure guides
- updated workflow standards

**Tasks**

- audit all active planning and engineering docs
- resolve roadmap and priority drift
- define canonical document roles
- define phase-based workflow and review rules
- identify blockers and unresolved decisions before coding resumes

**Dependencies**

- none

**Acceptance Criteria**

- canonical docs are updated and internally consistent
- current priorities reflect dashboard, admin, reports, account, and system work
- pre-development setup requirements are explicit
- Founder review is complete

**Related Documentation**

- `README.md`
- `docs/README.md`
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`
- `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md`

## Phase 1. Public Experience And Conversion Layer

**Objective**

Complete the public site so early users can understand the product, trust the brand, and enter the onboarding funnel.

**Current Status**

Completed

**Priority**

P1

**Estimated Complexity**

Medium

**Deliverables**

- public marketing pages
- policy pages
- waitlist page
- sign-in entry point
- sample report marketing flow

**Tasks**

- finalize homepage, product, methodology, pricing, security, contact, resources, docs, and policy pages
- remove placeholder copy and align public messaging
- ensure waitlist and sample report flows support early conversion

**Dependencies**

- Phase 0 planning baseline

**Acceptance Criteria**

- public pages are production-presentable
- key CTA paths are coherent
- no major public-facing placeholder flows remain

**Related Documentation**

- `docs/project-state/current-feature-status.md`
- `docs/project-state/product-roadmap.md`
- `docs/changelogs/CHANGELOG.md`

## Phase 2. Core App Foundation And Experience Quality

**Objective**

Turn the authenticated workspace into a coherent, polished operating surface with stable auth, account, upload, report, and admin foundations.

**Current Status**

Completed

**Priority**

P0

**Estimated Complexity**

High

**Deliverables**

- cohesive app shell
- stable authenticated routing
- backend-backed account profile foundation
- reliable admin access flow
- improved app responsiveness and visual consistency

**Tasks**

- preserve and publish the current project knowledge base for handover continuity
- document the pause on dashboard and admin redesign work until a new design direction is approved
- finalize dashboard information hierarchy and route cohesion after design direction is reset
- finish uploads, reports, account, and admin UX consistency work once the replacement design direction is approved
- keep profile and current-session identity flows backend-backed
- tighten permission handling and error states
- remove outdated phase language and placeholder copy from the app

**Dependencies**

- Phase 1 complete
- stable backend auth and scan endpoints

**Acceptance Criteria**

- signed-in users can move through dashboard, uploads, reports, account, and admin without broken flows
- app UI feels consistent across desktop, tablet, and mobile
- current-session identity and profile data no longer rely on local-only state

**Related Documentation**

- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/project-state/overall-project-architecture.md`
- `docs/project-state/development-priorities.md`

## Phase 3. Working MVP Product Completion

**Objective**

Finish the remaining MVP-critical product capabilities needed for a usable internal and early-user verification workflow.

**Current Status**

In Progress (frontend **100% complete**: user workspace 16/16 + admin workspace 12/12 pages shipped and verified — all 12 admin pages closed out incl. Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings; only backend slices and the approved feature set remain)

**Priority**

P0

**Estimated Complexity**

High

**Deliverables**

- production-usable dashboard
- production-usable admin workspace
- solid report review workflow
- improved system status and operational visibility for manual testing

**Tasks**

- upgrade the dashboard from a foundation surface into a real operating workspace
- expand report triage and scan-history utility
- strengthen admin workspace coverage for users, scans, reports, and jobs
- move session hardening into active implementation instead of leaving it as a distant follow-up
- add missing empty, loading, and failure states across app-critical flows
- document and expose internal diagnostics needed for Founder testing
- evaluate whether any existing template assets are worth selective reuse without adopting a full template system
- add the approved global error boundary + crash recovery
- add the approved report PDF export (client-side) — **shipped 2026-08-07**: printable view + print stylesheet + Export PDF buttons (detail, print page, ⌘K) with pre/post export toasts
- add the approved admin analytics + monitoring pages (shipped: Analytics + Monitoring pages + real `GET /admin/analytics` endpoint)
- add the approved scan deduplication (hash-based) — **shipped 2026-08-08**: worker-side SHA-256 lookup against prior completed scans (migration 0013), reused payload with `deduplicated_from` marker, mock `?dedup=1` demo seam, uploads-page reused-report CTA + report-detail badge

**Dependencies**

- Phase 2 stable

**Acceptance Criteria**

- the dashboard supports real daily use for MVP testing
- the admin workspace materially improves manual QA and internal operations
- the app surface supports repeated end-to-end product testing without relying on ad hoc scripts or database inspection

**Related Documentation**

- `docs/engineering/PHASE_TASK_LIST.md`
- `docs/project-state/what-is-in-development.md`
- `docs/project-state/outstanding-questions.md`

## Phase 4. Verification Pipeline Reliability And Report Depth

**Objective**

Strengthen the evidence pipeline so the MVP produces reliable, explainable, and testable verification reports.

**Current Status**

Not Started

**Priority**

P0

**Estimated Complexity**

High

**Deliverables**

- more reliable queue-backed processing
- improved result payload structure
- stronger report sections and evidence presentation
- benchmark and instrumentation foundations

**Tasks**

- complete live end-to-end validation of upload, queue, processing, and report flows
- reduce queue infrastructure waste and document the Redis strategy
- improve failure handling, retries, and status tracking
- version result payload structure where needed
- improve report usefulness without overstating confidence
- establish benchmark methodology for speed, accuracy, and pipeline validation
- add the approved evidence appendix (methodology + limitations) to reports — **shipped 2026-08-08**: honest methodology + limitations appendix on the report document model, server PDF, printable report, and sample report demo (approved MVP feature, all approved MVP features now shipped)

**Dependencies**

- Phase 3 complete enough for consistent internal use

**Acceptance Criteria**

- scan lifecycle is reliable enough for repeated internal and design-partner testing
- reports are usable, understandable, and operationally credible
- queue and worker behavior are measurable and cost-aware

**Related Documentation**

- `docs/engineering/BENCHMARK_METHODOLOGY.md`
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`
- `docs/project-state/technical-risks.md`

## Phase 5. MVP Security, Observability, And Release Readiness

**Objective**

Harden the working MVP enough for broader beta usage without prematurely overbuilding enterprise infrastructure.

**Current Status**

Not Started

**Priority**

P0

**Estimated Complexity**

High

**Deliverables**

- security baseline improvements
- monitoring and analytics baseline
- deployment and release readiness checklist
- documented operational playbooks

**Tasks**

- implement session hardening strategy at the right scope for MVP (approved: httpOnly cookies, rotation)
- expand authorization and RLS where required
- add Sentry + PostHog baseline instrumentation (approved)
- add structured operational monitoring for backend and worker flows
- finalize environment and service configuration guides
- review file validation, rate limiting, bot protection, and admin protections
- add the approved usage/entitlement enforcement hooks once billing lands

**Dependencies**

- Phase 4 stable

**Acceptance Criteria**

- the MVP has an explicit security and observability baseline
- critical app flows are monitored and diagnosable
- deployment, rollback, and environment requirements are documented

**Related Documentation**

- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md`
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
- `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md`

## Phase 6. Production-Ready MVP Launch

**Objective**

Ship a production-ready MVP that can onboard early users, support internal operations, and validate the verification workflow in the real world.

**Current Status**

Not Started

**Priority**

P0

**Estimated Complexity**

High

**Deliverables**

- stable release candidate
- validated end-to-end onboarding and verification flow
- launch-ready docs and support guidance
- approved merge and deployment plan

**Tasks**

- run a full product readiness review from waitlist to report completion
- close remaining P0 and P1 bugs
- validate build, test, and deployment gates
- confirm the documentation set matches the shipped behavior
- prepare Founder review package for MVP release

**Dependencies**

- Phase 5 complete

**Acceptance Criteria**

- release gates pass
- documentation reflects reality
- Founder approval is granted
- MVP can be operated without hidden setup knowledge

**Related Documentation**

- `docs/project-state/production-readiness-assessment.md`
- `docs/changelogs/CHANGELOG.md`
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`

## Post-MVP Expansion Themes

These are intentionally deferred until the production-ready MVP is stable:

- billing and subscriptions (UI shipped; enforcement deferred)
- external API product
- webhooks UI (approved 2026-08-04 for later release)
- video and audio verification
- deeper enterprise controls
- multi-region and compliance-heavy infrastructure

## Approved Feature Set

Features recommended in the frontend completion review (`docs/reports/2026-08-04-frontend-completion-review.md`) and approved by the Founder on 2026-08-04:

| Feature | Priority | Target | Status |
| --- | --- | --- | --- |
| Global error boundary + crash recovery | High | MVP | Approved |
| Report PDF export (client-side) | High | MVP | **Shipped** (printable view + export flow, 2026-08-07) |
| Scan deduplication (hash-based) | Medium | MVP | **Shipped** (worker-side hash lookup + reused payload, 2026-08-08) |
| Organization invites + roles | High | MVP | **Shipped** (Organization Management page) |
| Admin analytics + monitoring pages | Medium | MVP (admin) | **Shipped** (Analytics + Monitoring pages; real `GET /admin/analytics` backend endpoint) |
| Session hardening (httpOnly cookies) | High | Before beta | Approved |
| Sentry + PostHog baseline | Medium | Before beta | Approved |
| Webhooks UI | Medium | Later | **Shipped** (/app/webhooks — endpoints, signing secrets, delivery log, test ping, 2026-08-08) |
| Evidence appendix in reports | Medium | Later | **Shipped** (methodology + limitations appendix on print/PDF/sample surfaces, 2026-08-08) |
| Usage/entitlement enforcement | Medium | Later | Approved |

## Immediate Active Phase

The current work is in Phase 3 (Working MVP Product Completion).

The frontend is **100% complete** — the user workspace (16/16 pages) and the
admin workspace (12/12 pages) are both built and verified; no placeholders remain.
The admin close-out (all 12 pages: Overview, Waitlist, Users, Organizations,
Feature Flags, Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings)
was confirmed 2026-08-07 and re-verified by the final sign-off audit on
2026-08-08 — no frontend slices remain. The active focus is now:

- implementing the approved MVP feature set (error boundary, **PDF export**, **scan dedup**, **webhooks UI**, **evidence appendix**, admin analytics/monitoring all shipped)
- backend integration: auth token hardening, **real `/admin/analytics` endpoint (done)** → scan upload + queue round-trip against Supabase → report payload API
- session hardening and the Sentry + PostHog baseline ahead of beta
