# Provance Security And Launch Checklist

Last updated: 2026-07-06

## Purpose

This document defines the minimum checks Provance should complete before shipping a major backend or auth-related phase. It focuses on preventing common hacks, reducing avoidable errors, and creating a repeatable launch gate.

## Security Baseline

These protections should exist for every backend phase:

- strict DTO validation with whitelisting and non-whitelisted field rejection
- request throttling on public auth and waitlist endpoints
- explicit CORS allow-listing
- security headers through `helmet`
- safe error handling that does not leak internal stack traces or infrastructure details
- environment validation at startup
- request tracing through request IDs
- trusted proxy handling for deployed environments

## Auth And Access Checks

Before enabling real auth flows:

- sign-in responses should not leak whether an account exists unless the product intentionally requires that behavior
- password reset requests should use account-enumeration-safe responses
- invite tokens must be high-entropy, single-use, and expiration-bound
- password rules must enforce minimum and maximum safe length
- session cookies or tokens must be configured for secure transport and correct expiry
- protected routes must be enforced both on the backend and in frontend navigation

## Waitlist And Public Form Checks

Before broader traffic:

- form payloads must be validated and normalized
- public write endpoints must be rate-limited
- service failure responses must stay generic
- waitlist storage must handle duplicate email scenarios intentionally
- operational alerts should exist for repeated failures or abuse spikes

## Data And Storage Checks

- Supabase service-role usage must stay server-side only
- uploaded media and reports must use controlled storage paths and access rules
- database access policies must be reviewed before enabling user-generated data flows
- retention and deletion behavior must be defined for uploads, reports, and auth records
- audit-relevant records should include timestamps and ownership context

## Deployment And Infrastructure Checks

- production environment variables must be present and validated
- secrets must never be committed to the repo
- deployment origin allow-lists must be configured correctly
- monitoring and logs must exist for auth failures and service errors
- health endpoint should expose only minimal public-safe status data
- rollback path should be understood before deployment

## Launch Gate

Run these checks before merging a major backend phase:

1. `npm run build`
2. `npm run backend:build`
3. `npm run backend:test:e2e`
4. `npm run check:launch`
5. manual review of changed auth, waitlist, and env handling files
6. verify changelog and implementation docs are updated

## Current Security Work Added

This repo currently includes:

- backend security headers with `helmet`
- global throttling guard using client-aware IP tracking
- tighter throttling on auth and waitlist controllers
- startup environment validation for key backend settings
- request ID propagation for debugging and tracing
- sanitized global exception responses
- reduced health endpoint exposure

## Next Security Work

High-priority follow-up work:

- real Supabase Auth wiring with secure session handling
- CSRF and cookie strategy for browser-authenticated flows where applicable
- duplicate waitlist protection and abuse handling
- audit logging for auth and admin review actions
- role-based access controls for internal and team workflows
- monitoring and alerting for suspicious auth behavior
