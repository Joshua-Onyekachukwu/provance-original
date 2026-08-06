# Recommended Improvements

Last updated: 2026-08-05

## Purpose

This document lists the major current recommendations for the working MVP.

## Immediate Improvements

- strengthen the dashboard as a real operating surface
- strengthen the admin interface as a real internal testing tool
- improve report review utility and evidence navigation
- improve upload and processing failure handling
- keep the documentation set tightly synchronized with implementation

## Approved Improvements (2026-08-04)

The full ten-feature set recommended in `docs/reports/2026-08-04-frontend-completion-review.md` was approved by the Founder and folded into the roadmap docs. Highlights:

- global error boundary + crash recovery (MVP)
- report PDF export (MVP)
- scan deduplication (MVP)
- organization invites + roles (**shipped** as the Organization Management page)
- admin analytics + monitoring pages (MVP admin, **shipped** — pages + real `GET /admin/analytics` endpoint)
- session hardening (before beta)
- Sentry + PostHog baseline (before beta)
- webhooks UI, usage/entitlement enforcement, evidence appendix (later release)

## Near-Term Improvements

- implement the approved MVP feature set (error boundary + admin analytics/monitoring done; PDF export + dedup next)
- admin workspace is fully built (12/12 pages, shipped 2026-08-05) — no admin placeholders remain
- backend integration: auth token hardening, real `/admin/analytics` endpoint (done) → scan upload + queue round-trip, report payload API
- refine queue strategy to avoid unnecessary hosted Redis cost during MVP
- add internal diagnostics that reduce reliance on raw infrastructure dashboards

## Deferred Improvements

- billing and subscription enforcement (UI shipped; enforcement deferred until Stripe)
- webhooks UI, usage enforcement, evidence appendix (approved, later release)
- video and audio verification
- external API product
- enterprise SSO and advanced compliance controls

## Design And UX Recommendation

Do not adopt a full third-party admin template unless it clearly reduces delivery time without damaging consistency.

Current provisional recommendation:

- build the admin experience in-house
- only consider selective reuse of neutral layout primitives if the actual template files are later provided and pass review
