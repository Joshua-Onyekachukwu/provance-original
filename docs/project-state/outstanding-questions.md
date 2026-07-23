# Outstanding Questions

Last updated: 2026-07-23

## Purpose

This document records the unresolved questions, blockers, and material risks that still need explicit resolution before or during the next implementation phases.

## Accounts And Access

### Cloudflare Setup

- Cloudflare is intentionally deferred until a domain is purchased.
- When the domain exists, configure DNS, WAF, Turnstile if needed, and later Zero Trust.

### Monitoring Accounts

- Sentry and PostHog are intentionally deferred until the observability phase begins.
- They are not current blockers, but must be created before broader beta testing.

### Email Provider

- Resend is intentionally deferred until transactional email delivery becomes implementation-critical.
- Manual invite delivery remains acceptable for the current MVP stage.

## Infrastructure Decisions

### Queue Strategy During MVP

- Current recommendation: keep day-to-day local development on inline processing by default.
- Use local Redis or local Valkey only when a task specifically needs queue behavior, retry behavior, or worker debugging.
- Shared hosted Redis is justified once deployed async validation is needed for real test users or repeated end-to-end testing outside a single developer machine.

### Remote Schema Reconciliation

- Status: resolved on 2026-07-23.
- The remote `profiles` table was missing, the local `0004_profiles.sql` migration was applied successfully, and the remote table now exists with RLS enabled.

## Product And UX

### Dashboard Scope

- The dashboard should evolve into an operational command surface with:
  - system summary metrics
  - queue and processing posture
  - recent verification activity
  - flagged or high-risk report surfacing
  - quick actions into uploads, reports, and admin
  - internal diagnostics summaries for Founder testing

### Admin Scope

- Confirmed MVP admin scope now includes:
  - registered users
  - verification requests
  - report inspection
  - job monitoring
  - diagnostics
  - feature flags
- The admin workspace should become the internal control center rather than staying a waitlist-only tool.

### Trezo Admin Template

- Status: the Trezo template is now present in `react-nextjs-tailwindcss`.
- The current evaluation direction is still the same:
  - do not adopt the full template wholesale
  - only extract ideas, patterns, or highly neutral building blocks that can be fully adapted to the Provance design system

## Security And Compliance

### Session Hardening Timing

- Direction confirmed: move session hardening forward as soon as possible in the next implementation sequence.

### Admin Protection

- Direction confirmed:
  - keep admin route-based inside the main MVP app during the current testing stage
  - move to Cloudflare Zero Trust later when domain and Cloudflare setup are available

### File Safety

- Direction confirmed: before beta, the upload safety baseline should include all of the following:
  - MIME and size validation
  - deeper file inspection
  - malware scanning

## Delivery Risks

### Documentation Drift

- Historical and future-state documents still exist throughout the repo.
- They must continue to be reconciled as phases progress so contributors are not misled.

### Queue Cost Risk

- Upstash Free is not suitable for the always-on worker pattern.
- Current viable paths:
  - inline processing for routine local development
  - local Redis or local Valkey when queue semantics must be tested
  - Upstash Fixed only when shared deployed async validation is needed
  - self-hosted Redis or Valkey in a shared environment if we want to avoid per-command hosted cost sensitivity

### Observability Gap

- Without Sentry, analytics, and queue monitoring, diagnosing beta issues will be slower than necessary.
