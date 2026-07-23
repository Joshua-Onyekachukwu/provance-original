# Master Development Roadmap

Last updated: 2026-07-24

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

In Progress

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

Not Started

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

- implement session hardening strategy at the right scope for MVP
- expand authorization and RLS where required
- add Sentry and product analytics instrumentation
- add structured operational monitoring for backend and worker flows
- finalize environment and service configuration guides
- review file validation, rate limiting, bot protection, and admin protections

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

- team and organization workflows
- billing and subscriptions
- external API product
- video and audio verification
- deeper enterprise controls
- multi-region and compliance-heavy infrastructure

## Immediate Active Phase

The current work remains in Phase 2.

Immediate focus:

- documentation preservation and GitHub handover
- verification of current implementation truth before any more UI work
- pause on dashboard and admin redesign work pending a new approved design direction

The next execution phase after approval is:

**Phase 3. Working MVP Product Completion**

The immediate implementation focus will be:

- dashboard depth
- admin interface maturity
- early session hardening
- report workflow utility
- account and operational polish
- system reliability required for internal and early-user testing
