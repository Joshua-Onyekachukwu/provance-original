# Development Priorities

Last updated: 2026-08-05

## Purpose

This document records the active development priorities in execution order.

## Priority 1

Complete the working MVP application.

**Status (2026-08-05):** the frontend is 100% complete — the user workspace
(15/15 pages) and admin workspace (12/12 pages) are built and verified, with
loading/empty/error states, `?state=` demo forcing, and ⌘K commands on every
surface. No placeholders remain. The remaining work is approved MVP features
(PDF export, scan dedup) and backend integration:

- strengthen dashboard utility
- strengthen admin utility
- improve report workflow usability
- improve account and session experience
- remove weak or placeholder app states

## Priority 2

Improve system reliability for repeated internal and early-user testing.

This means:

- validate upload, queue, processing, and report flows end to end
- reduce infrastructure waste in the async pipeline
- improve failure handling and retry clarity
- expose enough diagnostics for rapid testing and debugging

## Priority 3

Prepare the MVP security and observability baseline without overbuilding.

Approved 2026-08-04 as part of the feature set:

- session hardening (httpOnly cookies, rotation) before broader beta
- Sentry (errors) + PostHog (product analytics) baseline before first real users
- review admin protections, rate limits, and file-validation posture

## Priority 4

Ship the remaining approved MVP features that complete core workflows.

Approved 2026-08-04:

- global error boundary + crash recovery
- report PDF export (client-side)
- scan deduplication (hash-based)
- admin analytics + monitoring pages (**shipped** — pages + real `GET /admin/analytics` endpoint)
- evidence appendix in reports (later release)
- webhooks UI (later release)
- usage/entitlement enforcement (later release)

## Priority 5

Keep the documentation set synchronized with the implementation and roadmap.

This means:

- update roadmap and checklist docs alongside each phase
- keep setup and environment guides current
- prevent drift between current-state docs and historical material

## Explicitly Deferred For Now

- OpenAI integration
- Anthropic integration
- billing and subscription work (UI shipped; enforcement deferred)
- video and audio verification

> Note: team and organization workflows are no longer deferred — the Organization Management page (member roster, roles, team access, invites) shipped as part of the Phase 3 workspace build-out.
