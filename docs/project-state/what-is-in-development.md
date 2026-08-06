# What Is Currently In Development

Last updated: 2026-07-23

## Purpose

This document tracks the areas that are active, partial, or being prepared for near-term execution.

## Active Priority

The active implementation target after planning approval is the working MVP application surface.

**Status (2026-08-05):** the frontend is 100% complete — the user workspace
(15/15 pages) and admin workspace (12/12 pages) are both shipped and verified,
with loading/empty/error states, `?state=` demo forcing, and ⌘K commands on every
surface. No placeholders remain. The active work now is approved MVP features
(PDF export, scan dedup) and backend integration.

Originally this included:

- dashboard maturity
- admin workspace maturity
- report workflow utility
- upload and processing reliability
- account and session experience polish

## Partially Developed Product Areas

The following areas exist but are not yet mature:

- dashboard triage density and internal utility
- admin visibility into users, scans, reports, and jobs
- report evidence navigation and export depth
- upload recovery and failure messaging
- operational diagnostics for manual testing

## Prepared But Deferred Technical Areas

These are documented and intentionally deferred until the correct phase:

- cookie-based session transport (approved 2026-08-04 — session hardening)
- broader authorization and RLS hardening
- product analytics and fuller observability (approved 2026-08-04 — Sentry + PostHog)
- billing and subscription infrastructure (UI shipped; enforcement approved for later)
- video and audio processing
- the approved feature set: error boundary, report PDF export, scan deduplication (admin analytics + monitoring shipped), webhooks UI, evidence appendix
- OpenAI and Anthropic integrations

## Documentation Work In Progress

Ongoing documentation priorities include:

- keeping roadmap and checklist docs canonical
- keeping setup and environment guides accurate
- keeping architecture and stack references synchronized with real implementation
- recording unresolved risks before they become blockers
