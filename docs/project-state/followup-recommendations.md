# Follow-Up Task Log

Last updated: 2026-08-10

## Purpose

This is the **running log of next-step recommendations** made at the end of
each completed task. It exists so nothing we suggest gets lost: when the
current task load is done, the Founder points back at this file and we
continue working from it.

Rules of use:

- After every task, append the recommendations we make (the "what's next"
  suggestions) as new rows here.
- Update the status of a row when it is picked up, done, or explicitly
  declined/deferred.
- This file complements `PHASE_TASK_LIST.md` (phase checklist) — it captures
  *emergent* follow-ups, not the phase backlog.

Status values: `Open` · `In Progress` · `Done` · `Deferred` · `Declined`

## Log

| Date | Source task | Recommendation | Status |
| --- | --- | --- | --- |
| 2026-08-10 | Push milestone to `dev/backend-integration-milestone` | Merge the branch into main (builds green, 330 backend / 449 frontend) so Vercel picks up the latest for live testing — Founder decision, test first | Open |
| 2026-08-10 | New-device sign-in detection | Wire the `[mock-email]` new-device alert to a real transactional-email provider once one is selected, so the security alert actually reaches the user out-of-band | Open |
| 2026-08-10 | Billing meters real data | Apply migration `0020_api_usage.sql` in the Supabase dashboard and seed a couple of `api_usage` rows, then verify GET /v1/billing renders real storage + API meters end-to-end | Open |
| 2026-08-10 | Dashboard quota warning chip | Add a matching quota warning to the Uploads page (the surface where the user will actually hit the limit), reusing `scanQuotaPct` so both surfaces agree | Open |
| 2026-08-10 | Projected usage + overage estimate | Wire the overage estimate into a real payment processor when Stripe lands, so `overageCostUsd` becomes a charge rather than an estimate | Open |
| 2026-08-10 | Billing meters real data | Wire API-call counting into the backend (increment `api_usage.calls` on authenticated API requests) so the meter moves with real traffic, not just seeded rows | Open |
| 2026-08-10 | New-device sign-in detection | Add a live two-device validation: sign in from two IPs/devices against a real Supabase project and confirm the audit event + notification land and refresh does not re-trigger | Open |
| 2026-08-10 | Push milestone | Next implementable backlog slice: fuller authorization model beyond allowlists and route guards (scopes enforcement across the API) | Open |
| 2026-08-10 | Push milestone | Build the admin search and filter model across waitlist, users, scans, and reports so admin views share one filterable table pattern | Open |
| 2026-08-10 | Push milestone | Build report share links (mock-backed) with an expiry surface, replacing the null `share_url` in the report payload | Open |
| 2026-08-10 | Better Auth Option A (USE_BETTER_AUTH mount) | Wire the org/api-key client surfaces (`organizationClient` / api-key client) or the twoFactor enrollment UI the security page's 2FA toggle needs | Open |
| 2026-08-10 | Better Auth Option A | Apply migration `0018_better_auth.sql` in the Supabase dashboard and set `USE_BETTER_AUTH=true` + `DATABASE_URL` in `backend/.env.local` to light up the enabled path, then walk sign-up/sign-in live | Open |
| 2026-08-10 | Scan idempotency (0019) | Apply `0019_scan_idempotency.sql` in the Supabase dashboard SQL editor (alongside pending migrations) to activate the dedupe round-trip | Open |
| 2026-08-10 | Scan upload + queue round-trip | Provision an Upstash Redis instance, wire `REDIS_URL` into `backend/.env.local`, run `start:worker`, and verify jobs process through BullMQ instead of inline fallback | Open |
| 2026-08-10 | Live two-device session walk | After migration 0010 lands: sign in twice as the dev test account, list both sessions, revoke one via the API, and confirm the revoked token stops working | Open |
| 2026-08-10 | Frontend gates | Enable GitHub Actions on the repo (if disabled, exact Settings steps) so the CI gate runs on pushes; confirm it passes on the branch | Open |
| 2026-08-10 | Auth provider decision brief | Founder sign-off gate: pick GoTrue (stay) vs Better Auth (migrate now, recommended) vs hybrid, with a re-evaluation date — see `AUTH_PROVIDER_DECISION.md` | Open |
| 2026-08-10 | Retention policy baseline | Archival enforcement job (Phase 5 backlog): move aged `result_payload`/media to cold storage and prune audit/crash tables per `RETENTION_POLICY.md` | Open |
| 2026-08-10 | Pre-processing content gate | Malware scanning before beta (vendor decision) and worker error alerting (alerting channel decision) — explicitly deferred in `PHASE_TASK_LIST.md` | Deferred |
| 2026-08-10 | Backend /admin sweep | Audit which of `/admin/jobs`, `/admin/reports`, `/admin/roles`, `/admin/settings` are still missing and build them to match mock response shapes | Open |
| 2026-08-10 | Live e2e validation | Flip `USE_MOCK` off against a local Supabase + backend and walk the full user flow (sign in, upload, queue, report) to catch contract mismatches | Open |
| 2026-08-10 | PostHog/Sentry approval | Set up Sentry (errors) + PostHog (product analytics) baseline ahead of beta — needs project credentials | Open |
| 2026-08-10 | Transactional email | Select a transactional email provider (invite/reset delivery) — decision deferred | Deferred |
