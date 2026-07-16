# Engineering Roadmap

Last updated: 2026-07-16

## Purpose

This document summarizes the current engineering sequence for quick reference.

The canonical phase order and phase definitions live in:

- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`

If this document and the master roadmap ever differ, the master roadmap is the source of truth.

## Current Status

- Phase 0. Documentation And Workflow Foundation: complete
- Phase 1. Landing Page And Brand Experience Refinement: complete
- Next active phase: Phase 2. App Visual Consistency And Premium UI Polish

## Phase Sequence Summary

### Phase 2. App Visual Consistency And Premium UI Polish

Focus:

- align authenticated app visual language with premium public experience
- improve design consistency across app pages
- tighten report and dashboard presentation
- strengthen mobile and tablet responsiveness across authenticated surfaces
- move account profile state off local-only browser storage
- expand auth and account backend primitives needed for future SaaS growth
- define what proof assets should eventually connect public marketing and in-app trust surfaces

### Phase 3. User Profiles And Account Persistence

Focus:

- persist account preferences and basic profile data
- add profile storage and integration
- connect account UI to backend persistence

### Phase 4. Evidence And Report Depth Expansion

Focus:

- improve evidence richness and report structure
- increase trust and clarity in report outputs
- keep report evolution explainable and conservative

### Phase 5. Billing And Payments

Focus:

- introduce subscriptions and plan enforcement
- add billing surfaces and account plan handling

### Phase 6. Teams And Organizations

Focus:

- add multi-user collaboration
- expand roles, permissions, and shared report access

### Phase 7. Security Hardening

Focus:

- cookie-based session transport
- auth hardening
- RLS expansion for waitlist and admin tables
- security documentation updates

### Phase 8. Performance Optimization And Observability

Focus:

- better logging and metrics
- performance improvements across frontend and workers
- stronger operational visibility

### Phase 9. Multi-Media Expansion

Focus:

- real video support
- real audio support
- preview and report support for non-image media

### Phase 10. Beta Readiness And Production Launch

Focus:

- product stability
- support and compliance readiness
- launch planning and release readiness

## Cross-Phase Technical Vision Rule

All future engineering phases should be reviewed against:

- speed
- accuracy
- scalability
- explainability
- trust
- moat formation

Reference:

- `docs/architecture/competitive-advantage-and-technical-vision.md`
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`

## Current Note

Do not let later backend or security phases override the approved roadmap sequence unless a blocking issue forces reprioritization and that reprioritization is documented explicitly.
