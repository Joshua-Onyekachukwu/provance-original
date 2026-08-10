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
| 2026-08-10 | Live e2e validation | Flip `USE_MOCK` off against a local Supabase + backend and walk the full user flow (sign in, upload, queue, report) to catch contract mismatches — **sign-in → reload → dashboard + httpOnly-cookie flow now verified live (commit `4a8de1c`); upload/queue/report legs still blocked on the pending migration set** | In Progress |
| 2026-08-10 | PostHog/Sentry approval | Set up Sentry (errors) + PostHog (product analytics) baseline ahead of beta — needs project credentials | Open |
| 2026-08-10 | Transactional email | Select a transactional email provider (invite/reset delivery) — decision deferred | Deferred |
| 2026-08-10 | Live scan-flow walk (migration probe) | Apply the pending migration set (0005, 0007, 0008, 0009, 0010–0016, 0018–0020 — confirmed missing by the new `MigrationHealthService` startup diff; 0001, 0002, 0003, 0004, 0006 are applied) via `DATABASE_URL` in `backend/.env.local` or dashboard SQL-editor pastes (paste block at `.freebuff/combined-0005-0009.sql`), then re-run the live scan round-trip; `POST /v1/scans` currently 503s and `invite-accept.e2e-spec.ts` fails on the missing org tables | Open |
| 2026-08-10 | MigrationHealthService (startup + readiness diff) | Restart the running :4000 backend (currently a stale `dist` build) so it picks up the migration-diff check, and add a CI smoke step that fails the build if `/v1/health/readiness` reports missing migrations | Open |
| 2026-08-10 | Auth controller cookie-flow coverage (`ec6d0ce`) | Live cookie-session walk against the real Supabase project — sign-in sets the HttpOnly cookie, the refresh token is stripped from the body, and a fresh page load restores the session via the silent cookie refresh with an empty localStorage — **done in the deploy check (commit `4a8de1c`)** | Done |
| 2026-08-10 | Refresh-token reuse detection (`adaae84`) | Record a `session.revoked` high-severity audit event on session revocation so the admin audit log and the security page's session ledger reflect revocations, matching the `refresh_token_rejected` pattern | Open |
| 2026-08-10 | Refresh-token reuse detection (`adaae84`) | Throttle `POST /auth/refresh` so repeated rejected refresh tokens (replay attacks) trigger a short lockout + a high-severity audit event, protecting the new rejection trail from noise | Open |
| 2026-08-10 | Refresh-token reuse detection (`adaae84`) | Live walk of the replay path: sign in, refresh to rotate, replay the old token, and confirm the 401 plus the `refresh_token_rejected` row on `GET /admin/audit-logs` | Open |
| 2026-08-10 | Deploy check — httpOnly-cookie flow (`4a8de1c`) | Automate the cookie contract check as a CI gate: boot the real backend and assert the sign-in `Set-Cookie` carries `HttpOnly` + `SameSite` and the body omits `refreshToken`, so the migration can't silently regress on deploy | Open |
| 2026-08-10 | Deploy check — httpOnly-cookie flow (`4a8de1c`) | Flip the frontend to real mode by default (env-driven `USE_MOCK` with a dev fallback) so every future slice is validated against the live API, not the mocks | Open |
| 2026-08-10 | Deploy check — httpOnly-cookie flow (`4a8de1c`) | Apply the pending migrations (0009 + 0010/0011 at minimum) and re-run the live walk — scan upload round-trip, notifications, and admin analytics parity are still 503/404 in real mode | Open |
| 2026-08-10 | Responsive pass — tablet/desktop audit (`53d9a8e`) | Turn the responsive audit into a repeatable npm script (`audit:responsive`) that fails CI on any page-level overflow or clipped element at 768/1280, making the pass a permanent gate | Open |
| 2026-08-10 | Responsive pass — tablet/desktop audit (`53d9a8e`) | Extend the `overflow-hidden` → `overflow-x-auto` sweep to the public pages (Sample Report, ProductShowcase, landing sections) and the print views at tablet width | Open |
| 2026-08-10 | Responsive pass — tablet/desktop audit (`53d9a8e`) | Run the responsive audit at 640px (small phone) and 1024px (small laptop) too, fixing anything those widths surface beyond the 768/1280 pair | Open |
| 2026-08-10 | Landing mobile spot-check (no commit — all clean) | Decide ProductShowcase's fate like forensic/: wire it into the landing page (e.g. under the Hero or between Use Cases and Pricing) or archive it — it is currently unreferenced dead code | Open |
| 2026-08-10 | Landing mobile spot-check (no commit — all clean) | Run the same mobile overflow probes on the remaining public pages (docs, resources, benchmark, security, waitlist, sign-in, reset-password, accept-invite) at 375px | Open |
| 2026-08-10 | Landing mobile spot-check (no commit — all clean) | Mobile touch audit of the Hero: verify tap targets are ≥44px and there are no hover-only interactions at phone width | Open |
| 2026-08-10 | Mobile-first grid guard (`bcd8ca8`) | Extend `gridClassGuard` to enforce base `flex`/`block` equivalents for responsive display utilities (`lg:flex`, `md:grid`) so mobile-first intent is explicit everywhere, not just grids | Open |
| 2026-08-10 | Mobile-first grid guard (`bcd8ca8`) | Wire the `gridClassGuard` sweep into the CI workflow so the repo-wide scan runs on every push/PR alongside the vitest suite | Open |
| 2026-08-10 | Mobile-first grid guard (`bcd8ca8`) | Re-run the landing + workspace overflow probes with the new explicit `grid-cols-1` bases at 375/768/1280 to confirm the sweep is visually inert (zero layout change) | Open |
| 2026-08-10 | Dashboard live-refresh indicator | Extend the same live indicator to the Queue page and the report detail pane (which already poll a single scan via `scanNeedsPolling`), so every surface that tracks worker progress shows it | Open |
| 2026-08-10 | Dashboard live-refresh indicator | Add a manual "refresh now" affordance next to the indicator (a tap-to-refresh icon) so users can force a poll tick without waiting for the 5s cadence | Open |
| 2026-08-10 | Report detail live-completion | Add the same live indicator (pulsing dot + auto-refreshing) to the report detail pane while it polls a pending scan, so the pending → completed flip is visually announced there too | Open |
| 2026-08-10 | Report detail live-completion | Consider exposing the mock worker's step durations via a dev seam (?worker=fast|slow) so the pending → completed flip can be demoed at a controllable pace in screenshots | Open |
| 2026-08-10 | useResource tab-hidden pause (poll verification) | Extend the pause to the Page Lifecycle API: also gate on `pagehide`/`freeze` (Safari bfcache), so a backgrounded tab cannot fire one last poll after the document freezes | Open |
| 2026-08-10 | useResource tab-hidden pause (poll verification) | Once migrations 0009/0019 land, re-run the live walk and verify the visibility pause in a real browser tab switch (background the tab mid-upload, confirm zero network calls, resume on return) - the curl-level pause is proven, the browser-level leg is not | Open |
