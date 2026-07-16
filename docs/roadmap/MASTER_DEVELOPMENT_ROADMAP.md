# Master Development Roadmap

Last updated: 2026-07-16

## Purpose

This is the primary long-term roadmap for taking Provance from the current shipped MVP foundation to a complete production SaaS platform.

All work is organized into phases.

Each phase includes:

- objective
- scope
- dependencies
- complexity estimate
- deliverables
- documentation updates
- testing requirements
- completion criteria
- suggested branch naming
- release milestone

## How To Use This Roadmap

- Treat this as the master reference.
- Update it when a phase is completed.
- Do not start a new phase until the previous phase has passed testing, documentation updates, and Founder review.

## Complexity Scale

- Low: contained changes, minimal cross-system impact
- Medium: multiple components, moderate risk, requires careful coordination
- High: cross-cutting changes with security, data, or reliability implications

## Phase 0. Documentation And Workflow Foundation

**Objective**

Ensure the repository is the single source of truth and the development lifecycle is standardized.

**Scope**

- living project-state documentation
- AI org documentation
- phase-based workflow and release process
- decision logging discipline

**Dependencies**

- none

**Complexity**

- Low

**Deliverables**

- `docs/project-state/*`
- `docs/ai-agents/*`
- workflow and release process doc

**Docs To Update**

- `docs/README.md`
- `docs/changelogs/CHANGELOG.md`

**Testing Requirements**

- none required beyond repo hygiene checks

**Completion Criteria**

- docs exist and are committed
- workflow rules are explicit
- stale or conflicting docs are marked and routed to canonical sources

**Branch Naming**

- `chore/docs-foundation-sync`

**Release Milestone**

- internal milestone

## Phase 1. Landing Page And Brand Experience Refinement

**Objective**

Improve first impression and conversion while preserving the existing layout and identity.

**Scope**

- typography and font upgrades
- design tokens, spacing, and hierarchy refinement
- messaging and copy flow improvements
- CTA clarity and trust signals
- responsiveness and polish

**Dependencies**

- none

**Complexity**

- Medium

**Deliverables**

- upgraded landing page UI and copy
- updated design tokens and typography system
- updated brand consistency across sections

**Docs To Update**

- `docs/project-state/development-priorities.md`
- `docs/project-state/product-roadmap.md`
- `docs/changelogs/CHANGELOG.md`
- design documentation if tokens and typography change materially

**Testing Requirements**

- responsive checks across breakpoints
- accessibility checks for headings, contrast, focus states
- basic performance sanity check

**Completion Criteria**

- premium polish achieved
- messaging and CTA path is clearer
- Founder approval

**Branch Naming**

- `phase/landing-premium-refinement`

**Release Milestone**

- external milestone: deploy to production frontend after approval

## Phase 2. App Visual Consistency And Premium UI Polish

**Objective**

Carry improved typography and visual system into the authenticated application.

**Scope**

- app-shell typography and spacing refinement
- component consistency across dashboard, uploads, reports, admin
- visual hierarchy improvements in report and dashboard pages

**Dependencies**

- Phase 1 tokens and typography decisions

**Complexity**

- Medium

**Deliverables**

- cohesive app UI aligned to improved brand system

**Docs To Update**

- `docs/project-state/current-feature-status.md`
- `docs/changelogs/CHANGELOG.md`

**Testing Requirements**

- regression checks on key flows: sign-in, upload, report, admin
- responsive checks

**Completion Criteria**

- app feels cohesive and premium
- Founder approval

**Branch Naming**

- `phase/app-premium-polish`

**Release Milestone**

- external milestone: deploy to production frontend after approval

## Phase 3. User Profiles And Account Persistence

**Objective**

Persist account preferences and basic profile data to the backend.

**Scope**

- profile table and RLS
- API endpoints for profile
- frontend integration for account page

**Dependencies**

- current auth flow stability

**Complexity**

- Medium

**Deliverables**

- persisted profiles
- migration files
- UI integration

**Docs To Update**

- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/project-state/current-feature-status.md`
- `docs/changelogs/CHANGELOG.md`

**Testing Requirements**

- backend tests for profile endpoints
- UI regression checks

**Completion Criteria**

- profile persists and loads reliably
- Founder approval

**Branch Naming**

- `phase/profiles-and-accounts`

**Release Milestone**

- external milestone

## Phase 4. Evidence And Report Depth Expansion

**Objective**

Improve report credibility, structure, and evidence richness while staying explainable and conservative.

**Scope**

- signal expansion where justified
- better evidence timeline structure
- improved report sections and clarity

**Dependencies**

- stable scan pipeline

**Complexity**

- High

**Deliverables**

- updated report payload schema versioning approach
- improved report UI and print view

**Docs To Update**

- `docs/project-state/technical-risks.md`
- report design specs
- changelog

**Testing Requirements**

- regression tests for report rendering
- validation of payload compatibility

**Completion Criteria**

- improved report clarity and trust
- Founder approval

**Branch Naming**

- `phase/report-depth-expansion`

**Release Milestone**

- partner milestone: validate with design partners before wider launch

## Phase 5. Billing And Payments

**Objective**

Introduce a paid plan structure aligned to pricing decisions.

**Scope**

- subscription model
- plan enforcement
- billing UI

**Dependencies**

- pricing and packaging approval
- legal and policy review

**Complexity**

- High

**Deliverables**

- billing integration
- account plan surfaces

**Docs To Update**

- pricing decision docs
- product roadmap
- security and launch checklist

**Testing Requirements**

- payment flow testing
- access control testing

**Completion Criteria**

- billing works end-to-end
- Founder approval

**Branch Naming**

- `phase/billing-and-payments`

**Release Milestone**

- external milestone

## Phase 6. Teams And Organizations

**Objective**

Introduce multi-user collaboration safely.

**Scope**

- organization model
- team roles and permissions
- shared report access

**Dependencies**

- profile and billing groundwork
- security and RLS readiness

**Complexity**

- High

**Deliverables**

- org and team flows
- expanded access control

**Docs To Update**

- architecture docs
- RLS docs
- current implementation status

**Testing Requirements**

- permission tests
- regression tests

**Completion Criteria**

- secure multi-user workflows
- Founder approval

**Branch Naming**

- `phase/teams-and-orgs`

**Release Milestone**

- partner milestone then external milestone

## Phase 7. Security Hardening

**Objective**

Bring auth, sessions, policies, and RLS to a more enterprise-ready baseline.

**Scope**

- cookie-based session transport
- CSRF strategy
- RLS expansion including waitlist and admin tables
- tighter admin controls
- security review updates

**Dependencies**

- stability of core product flows

**Complexity**

- High

**Deliverables**

- hardened auth transport
- RLS policies and validation

**Docs To Update**

- security checklist
- deployment and auth strategy
- risk docs

**Testing Requirements**

- auth regression tests
- security regression checks

**Completion Criteria**

- hardened session model working
- Founder approval

**Branch Naming**

- `phase/security-hardening`

**Release Milestone**

- external milestone with careful rollout

## Phase 8. Performance Optimization And Observability

**Objective**

Improve performance and operational visibility for reliability at scale.

**Scope**

- better logging and metrics
- worker throughput improvements
- frontend performance improvements

**Dependencies**

- stable security posture

**Complexity**

- Medium

**Deliverables**

- performance improvements
- monitoring and operational documentation

**Docs To Update**

- production readiness assessment
- deployment runbooks

**Testing Requirements**

- performance verification
- regression tests

**Completion Criteria**

- measurable improvements
- Founder approval

**Branch Naming**

- `phase/perf-and-observability`

**Release Milestone**

- external milestone

## Phase 9. Multi-Media Expansion

**Objective**

Extend beyond images to video and audio support.

**Scope**

- upload and processing for video
- previews and report support
- audio waveform or summary support

**Dependencies**

- stable worker and queue model
- storage and cost planning

**Complexity**

- High

**Deliverables**

- video and audio processing foundations
- report support for non-image media

**Docs To Update**

- architecture docs
- product roadmap
- risk docs

**Testing Requirements**

- end-to-end media pipeline tests

**Completion Criteria**

- media types supported with credible reporting
- Founder approval

**Branch Naming**

- `phase/multimedia-support`

**Release Milestone**

- partner milestone then external milestone

## Phase 10. Beta Readiness And Production Launch

**Objective**

Reach a stable beta and then production launch state.

**Scope**

- product stability
- support readiness
- compliance readiness
- incident response readiness
- launch messaging alignment

**Dependencies**

- completion of earlier phases as required by strategy

**Complexity**

- High

**Deliverables**

- beta readiness checklist completion
- launch plan and release notes

**Docs To Update**

- production readiness assessment
- security and launch checklist
- changelog

**Testing Requirements**

- full regression suite
- operational checks

**Completion Criteria**

- Founder approval for launch
- stable production deploy

**Branch Naming**

- `phase/beta-and-launch`

**Release Milestone**

- external milestone: production launch
