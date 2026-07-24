# Pre-Development Setup Checklist

Last updated: 2026-07-23

## Purpose

This checklist defines exactly what must be configured before new MVP feature development resumes.

## Rule

Only include services required for the current MVP phase.

Deferred services should stay deferred unless they become blockers.

## 1. Accounts And Platforms

### Required Now

- [x] GitHub repository access
- [x] Vercel project access or deployment visibility
- [x] Supabase project access
- [x] Fly.io deployment path represented in repo config
- [ ] Cloudflare account and DNS strategy confirmation after domain purchase

### Required Soon, But Can Wait Until The Relevant Phase

- [ ] Resend account when automated transactional email becomes necessary
- [ ] Sentry account when observability work begins
- [ ] PostHog account when observability work begins

### Explicitly Not Required For The Current Phase

- [ ] Neon
- [ ] OpenAI
- [ ] Anthropic
- [ ] Stripe
- [ ] enterprise SSO providers

## 2. Local Environment

- [ ] frontend dependencies installed
- [ ] backend dependencies installed
- [ ] frontend `.env` populated
- [ ] backend `.env.local` populated
- [ ] local frontend starts successfully
- [ ] local backend starts successfully

## 3. Current MVP Service Decisions

- [ ] confirm Supabase remains the MVP auth, database, and storage platform
- [ ] confirm Fly.io remains the MVP API and worker host
- [ ] confirm Vercel remains the frontend host
- [x] confirm queue strategy for local and shared environments
- [ ] confirm Cloudflare is the planned DNS / edge / WAF layer

## 4. Queue Decision Checklist

Choose one of the following before relying on shared async testing:

- [x] local-only Redis / Valkey for development and no shared hosted queue yet
- [ ] Upstash Fixed for shared async validation
- [ ] self-hosted Redis / Valkey in a shared environment

Recommendation:

- use inline processing for day-to-day development
- use local Redis or local Valkey only when queue semantics must be tested
- adopt paid hosted queue infrastructure only when deployed async validation becomes necessary for real test users or shared end-to-end testing

## 5. Environment Variables Required Now

Frontend:

- [ ] `VITE_API_BASE_URL`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

Backend:

- [ ] `PORT`
- [ ] `FRONTEND_ORIGIN`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_WAITLIST_TABLE`
- [ ] `SUPABASE_SCANS_TABLE`
- [ ] `SUPABASE_UPLOADS_BUCKET`
- [ ] `MAX_UPLOAD_BYTES`
- [ ] `ALLOWED_UPLOAD_MIME_TYPES`
- [ ] `ADMIN_EMAILS`

Worker, only if queue-backed async processing is enabled:

- [ ] `REDIS_URL`
- [ ] `SCAN_PROCESSING_QUEUE_NAME`
- [ ] `WORKER_CONCURRENCY`

## 6. Integrations That Can Be Postponed

These should not block the next implementation phase:

- email delivery provider setup
- Sentry instrumentation
- PostHog instrumentation
- Cloudflare Turnstile
- Cloudflare Zero Trust
- OpenAI integration
- Anthropic integration
- Stripe setup

## 7. Validation Before Coding Resumes

- [x] roadmap approved
- [x] feature checklist approved
- [x] technology stack reference approved
- [x] architecture docs approved
- [x] setup and infrastructure guides approved
- [x] unresolved blockers reviewed

## 8. Outstanding Inputs From Founder

- [ ] confirm Cloudflare account and DNS path
- [x] confirm preferred queue approach for shared environments
- [x] confirm whether Resend should be set up before or after the next app phase
- [x] provide Trezo template files if a real file-level evaluation is desired
