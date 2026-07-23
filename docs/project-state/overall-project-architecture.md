# Overall Project Architecture

Last updated: 2026-07-23

## Purpose

This document describes the current working architecture of Provance and the near-term architecture we are actively building toward for the MVP.

## Current Working Architecture

Provance currently operates as a web application with:

- a React and Vite frontend
- a NestJS backend in `backend/`
- Supabase for auth, Postgres, and storage
- a Redis-compatible queue path for async processing
- a dedicated worker process for scan execution
- Vercel for frontend delivery
- Fly.io for API and worker hosting

## Product Shape

The current MVP is:

- image-first
- report-first
- waitlist-first
- invite-based
- admin-assisted

It is not yet:

- multi-tenant
- billing-enabled
- API-product complete
- video- or audio-ready

## Frontend Architecture

The frontend lives in `src/`.

It contains:

- public marketing routes
- auth and onboarding routes
- authenticated application routes under `/app/*`
- reusable public and report presentation components
- auth context and API client helpers

Current frontend characteristics:

- client-side routing with React Router
- app-shell model for authenticated routes
- backend-hydrated identity and profile state
- direct browser upload to private storage using signed upload URLs

## Backend Architecture

The active backend lives in `backend/`.

It is a modular monolith with focused modules for:

- health
- waitlist
- auth
- account
- scans
- admin
- queue
- Supabase integration

Current backend characteristics:

- versioned `/v1` API prefix
- DTO validation and throttling
- global exception filtering
- environment validation at startup
- signed upload orchestration
- queue-backed or inline scan processing

## Data Architecture

Supabase currently provides:

- Auth for user identity
- Postgres for waitlist, invite, audit, profile, and scan metadata
- private object storage for uploaded artifacts

Current primary data entities:

- `waitlist_applications`
- `access_invites`
- `auth_audit_events`
- `profiles`
- `scans`

## Upload And Processing Architecture

Current image-first flow:

1. the frontend requests scan initiation from the backend
2. the backend creates a scan record and returns signed upload information
3. the browser uploads directly to private storage
4. the frontend submits the scan for processing
5. the backend enqueues work or falls back to inline processing
6. the worker processes the scan and writes the result payload
7. the frontend polls the scan record and renders the report

## Report Architecture

The current report model is built around the structured `result_payload` attached to the scan record.

The current report surface includes:

- verdict
- confidence and authenticity scores
- metadata summary
- findings
- timeline
- recommendations
- evidence sections
- image preview in print-ready reports

## Admin Architecture

The current internal admin model is intentionally lightweight.

It currently supports:

- waitlist review
- notes
- status updates
- invite generation
- CSV export
- admin audit trail writes

The next step is to make the admin workspace a stronger internal operations surface for testing and manual validation.

## Legacy Architecture Note

The repository still contains a legacy `api/` folder.

Current rule:

- do not build new functionality there
- do not remove it casually
- document cleanup decisions before touching it

## Near-Term MVP Architecture Direction

The next approved implementation target is:

- stronger dashboard utility
- stronger admin utility
- stronger report workflow utility
- better failure handling and operational visibility
- measured infrastructure setup using low-cost or free-tier-friendly services first

## Architectural Boundaries To Preserve

To avoid forced rewrites later, keep these boundaries explicit:

- auth provider boundary
- queue provider boundary
- storage provider boundary
- AI provider boundary
- email provider boundary
- analytics and error-monitoring boundary

## Near-Term Infrastructure Direction

Recommended near-term architecture:

- keep Supabase as the MVP database, auth, and initial storage platform
- keep Fly.io for API and worker hosting
- keep Vercel for frontend hosting
- add Cloudflare as the edge, DNS, and security layer
- add Sentry and PostHog once Phase 5 begins
- avoid expensive service adoption until it unblocks real product validation
