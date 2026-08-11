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
| 2026-08-11 | Auth cookie e2e slice | Extend the spec with a secure-deployment variant (AUTH_COOKIE_SECURE=true) asserting the `__Host-provance_refresh` cookie name + `Secure` flag, since only the plain local name is covered today | Open |
| 2026-08-11 | Auth cookie e2e slice | Add a guarded-surface leg: sign in, then GET /v1/auth/me with the access token (SupabaseAuthGuard overridden like the security spec) to prove the full session round-trip past the cookie boundary | Open |
| 2026-08-11 | Readiness surfaced live | The migrations gate runs 20 sequential REST probes so the first readiness call takes ~15s — either parallelize the probes or note the timeout in the runbook so a slow first call isn't mistaken for a hang | Open |
| 2026-08-11 | One-paste schema convergence | After pasting `combined-0005-0020.sql`, run every live walk in sequence (readiness → `validate:admin-jobs` → `validate:org-revoke` → `validate:scan-roundtrip`) to confirm each surface flips real, since the single paste unblocks all of them at once | Open |
| 2026-08-11 | One-paste schema convergence | Migrate the stale `.freebuff/probe_migrations.mjs` (0001–0010, soft "table present" fallback) onto the canonical `migration-health.service.ts` probe list or delete it, so scratch and canonical probes can't disagree (0009 already showed that false-positive) | Open |
| 2026-08-11 | Org session revocations audited | Add `session_revoked` mock parity to the self-service `mockRevokeSession` (Security page) — the real backend writes it to the feed but the mock still doesn't, so mock mode under-demos the account tab | Open |
| 2026-08-11 | Org session revocations audited | Render `details.revoked` (and member context) in the Admin Audit Logs event drawer so the persisted count is visible, not just stored | Open |
| 2026-08-11 | Org session revocations audited | Extend `validate-org-session-revoke.mjs` to assert the `member_sessions_revoked` row (with the exact count) appears in `GET /admin/audit-logs` once migrations 0005 + 0010 land | Open |
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
| 2026-08-10 | Backend /admin sweep | Audit done: `/admin/jobs`, `/admin/reports`, `/admin/settings` are built (derived from scans/profiles/flags/audit, matching mock shapes). **Remaining gap: `/admin/roles` has no controller route** — `getAdminRoles` → `GET /admin/roles` 404s in real mode; build the RolesController (list roles + scopes, PATCH scopes with Owner-guard, PATCH member role with audit) | In Progress |
| 2026-08-10 | Live e2e validation | Flip `USE_MOCK` off against a local Supabase + backend and walk the full user flow (sign in, upload, queue, report) to catch contract mismatches — **sign-in → reload → dashboard + httpOnly-cookie flow now verified live (commit `4a8de1c`); upload/queue/report legs still blocked on the pending migration set** | In Progress |
| 2026-08-10 | PostHog/Sentry approval | Set up Sentry (errors) + PostHog (product analytics) baseline ahead of beta — needs project credentials | Open |
| 2026-08-10 | Transactional email | Select a transactional email provider (invite/reset delivery) — decision deferred | Deferred |
| 2026-08-10 | Live scan-flow walk (migration probe) | Apply the pending migration set (0005, 0007, 0008, 0009, 0010–0016, 0018–0020 — confirmed missing by the new `MigrationHealthService` startup diff; 0001, 0002, 0003, 0004, 0006 are applied) via `DATABASE_URL` in `backend/.env.local` or dashboard SQL-editor pastes (paste block at `.freebuff/combined-0005-0009.sql`), then re-run the live scan round-trip; `POST /v1/scans` currently 503s and `invite-accept.e2e-spec.ts` fails on the missing org tables | Open |
| 2026-08-10 | MigrationHealthService (startup + readiness diff) | Restart part done — fresh builds have been booted repeatedly since (deploy check `4a8de1c`, live walks on :4100). **Remaining: the CI smoke step** that fails the build when `/v1/health/readiness` reports missing migrations | In Progress |
| 2026-08-10 | Auth controller cookie-flow coverage (`ec6d0ce`) | Live cookie-session walk against the real Supabase project — sign-in sets the HttpOnly cookie, the refresh token is stripped from the body, and a fresh page load restores the session via the silent cookie refresh with an empty localStorage — **done in the deploy check (commit `4a8de1c`)** | Done |
| 2026-08-10 | Refresh-token reuse detection (`adaae84`) | `session_revoked` audit recording is shipped (security.service.ts writes it on revocation; the security e2e asserts it). **Remaining: severity-map parity** — add `session_revoked: 'high'` to backend `audit-severity.ts` + frontend `AUDIT_SEVERITY_BY_ACTION` so the Admin Audit Logs page renders revocations with the right tone | In Progress |
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
| 2026-08-10 | scanPresentation import-parity guard | Extend the same import-parity pattern to the other shared modules (chartGeometry, mockData/mockApi surfaces, ui barrel exports) so every consolidation target has a drift guard | Open |
| 2026-08-10 | scanPresentation import-parity guard | Wire the parity scan into the CI workflow beside the gridClassGuard repo-wide scan so both run on every push/PR | Open |
| 2026-08-10 | Real scan upload + queue round-trip (verified complete) | Apply the scan-pipeline migrations (0009 + 0019) and run the live walk: initiate -> signed-URL upload -> submit -> worker complete, watching the dashboard 5s poll land queued/processing/complete against real rows (the existing deploy-check row tracks the same blocker) | Open |
| 2026-08-10 | Real scan upload + queue round-trip (verified complete) | Stand up the real worker against Upstash Redis (REDIS_URL + start:worker) and confirm a submitted scan processes through BullMQ jobs (worker log lines ready/completed) instead of the inline fallback | Open |
| 2026-08-10 | Security page two-step revoke | Add the same two-step confirm to the Organization page member-remove and API-key delete actions, so every destructive action in the app shares the armed-confirm pattern | Open |
| 2026-08-10 | Security page two-step revoke | Consider a click-away / Escape reset for the armed confirm state (currently only Cancel / revoke-start reset it) | Open |
| 2026-08-10 | Security e2e settings/password slice | Apply migration 0005 on the live project so the invite-accept live e2e suite passes again (its 2 failures are the standing live-DB blocker, not code) | Open |
| 2026-08-10 | Security e2e settings/password slice | Backfill the changePassword revoke-everything-else behavior into the mock (mockChangePassword) so the Security page demo matches the real contract end-to-end | Open |
| 2026-08-10 | Session-ledger round-trip e2e | Extend the same round-trip to the refresh path: POST /v1/auth/refresh should upsert (not duplicate) the ledger row for the same sid and keep isCurrent stable across rotation — worth an e2e assertion now that the sign-in leg is covered | Open |
| 2026-08-10 | Session-ledger round-trip e2e | The stateful mock upserts by user_id when the payload carries no id — a second sign-in with a different sid would replace the first row. Fix the mock to key upserts by the conflict columns (user_id, auth_session_id) for realism | Open |

| 2026-08-10 | Session lifecycle validation | The combined SQL paste block must include migration 0010 (user_sessions) — the live project genuinely lacks the table (PGRST205 confirmed directly, not a stale cache); re-run the two-device ledger walk once applied | Open |
| 2026-08-10 | Session lifecycle validation | Once 0010 lands, re-verify isCurrent live: the session_id claim fix means the ledger should now record + match real GoTrue sessions (decodeJwtPayloadSid reads session_id with sid fallback) | Open |
| 2026-08-10 | Session lifecycle validation | The backend revoke path (DELETE /auth/v1/admin/sessions/:id) 404s on GoTrue v2.195.0 and /admin/v1 403s — pick the GoTrue-version-appropriate admin session-delete (or document logout scope=local as the working revoke) and make revokeLedgerRow match | Open |
| 2026-08-10 | Session lifecycle validation | Access-token behavior confirmed empirically (revocation kills both refresh and access), but only via logout scope=local — once a working admin session-delete exists, repeat the walk with the real DELETE to confirm identical behavior | Open |

| 2026-08-10 | Scan round-trip validation script | Apply the combined migration block INCLUDING 0019 (idempotency_key column) to the live project, then run PORT=4100 node backend/scripts/validate-scan-roundtrip.mjs — initiate currently 503s with the exact missing-migration hint | Open |
| 2026-08-10 | Scan round-trip validation script | The readiness scansSchema probe reports 0009 columns but the first failing insert is idempotency_key (0019) — have the probe check the idempotency_key column too so the health signal matches the first failing query | Open |

| 2026-08-10 | Refresh-cookie validation | Apply migration 0008 (audit_logs) so the walk FINAL check (reuse rows with reuse_suspected) reads live instead of noting the missing table — replays already 401, the audit trail is the only unreadable leg | Open |
| 2026-08-10 | Refresh-cookie validation | GoTrue reuse grace interval measured ~20s on v2.195.0 (replays inside return 200) — consider surfacing the reuse-interval constant in the deploy contract doc so ops know a stolen-token replay window exists by design | Open |

| 2026-08-10 | AccountController HTTP spec | Consider the same HTTP-layer treatment for the roles controller (list roles, PATCH scopes Owner-guard, PATCH member role) — it is the last admin surface without a controller-level spec | Open |
| 2026-08-10 | AccountController HTTP spec | The stringy-boolean coercion (emailNotifications: "yes" → true) is a real implicit-conversion contract worth a note in API_DESIGN_STANDARDS.md under DTO validation gotchas | Open |

| 2026-08-10 | ParseIntStrictPipe sweep | Verify the frontend never sends garbage page/pageSize params that would now 400 — grep the api.js real-path callers for templated query strings that could produce NaN | Done |
| 2026-08-10 | ParseIntStrictPipe sweep | Consider ParseFloatStrictPipe analog for any future decimal query params, and note the strict-int contract in API_DESIGN_STANDARDS.md (garbage page values are 400s, not defaults) | Open |

| 2026-08-10 | SecurityController HTTP spec | Decide whether PATCH /security/settings should reject unknown keys with 400 (currently a silent no-op — controls unchanged, still 200) so client typos surface instead of silently doing nothing | Open |
| 2026-08-10 | SecurityController HTTP spec | The stateful in-memory Supabase mock is now duplicated between backend/test/security.e2e-spec.ts and this controller spec — extract it into a shared test helper module so the two cannot drift | Open |

| 2026-08-10 | Dashboard notification feed click contract | Add a View all affordance to the dashboard feed body (it currently caps at unread.slice(0, 4) with no link to /app/notifications) | Open |
| 2026-08-10 | Dashboard notification feed click contract | The optimistic readIds set resets on remount and the bell keeps its own count (documented as per-instance state) — consider lifting unread state into a shared context so the badge and feed sync instantly without refetch | Open |

| 2026-08-10 | Migration apply prep | User pastes .freebuff/combined-0005-0020.sql in the dashboard SQL Editor, then re-run the one-shot REST probes + readiness check to confirm scansSchema/userSessions/migrations all flip ready (wait a few seconds for the PostgREST schema reload first) | Open |
| 2026-08-10 | Migration apply prep | Once the full set is applied, re-run PORT=4100 node backend/scripts/validate-scan-roundtrip.mjs and the invite-accept live e2e — the standing 503/PGRST205 blockers should clear | Open |

| 2026-08-10 | validate:migrations script | After the user applies the combined migration block, cd backend && npm run build && npm run validate:migrations should print ALL OK and exit 0 — the single re-check command (currently reports 14 missing, exit 1) | Open |
| 2026-08-10 | validate:migrations script | Add a --json flag to validate-migrations.mjs so CI can gate on the missing list without parsing the table output | Open |

| 2026-08-10 | Full live walk (queue live) | Queue side verified live: BullMQ worker ready on scan-processing (concurrency 4, Upstash REDIS_URL); backend :4200 + worker left running. The ONLY remaining gate is the schema: validate:migrations still reports 14 missing (0005, 0007-0016, 0018-0020). Paste .freebuff/combined-0005-0020.sql in the SQL Editor, then run PORT=4200 node backend/scripts/validate-scan-roundtrip.mjs | Open |


| 2026-08-10 | Worker retry hardening | Once migrations land and the queue is live, prove the retry/backoff in production: enqueue a scan whose asset download fails, watch BullMQ log attempt 1-3 with exponential backoff, and confirm the row lands failed with the reason after the final attempt (the e2e locks the semantics; this is the live confirmation) | Open |
| 2026-08-10 | Worker retry hardening | Write a scan_failed event to audit_logs from markScanFailed so worker-side terminal failures show up in the Admin Audit Logs page (currently only admin retry/fail actions are audited) | Open |
| 2026-08-10 | Worker retry hardening | Consider surfacing attemptsMade/failedReason from the BullMQ job in the admin Jobs page payload so operators can see how many retries a failing scan burned | Open |


| 2026-08-10 | Schema-state mismatch check | Live run confirms the diagnostic works — project banner names dmhrwdcuwtgscwlaagsa. Once the user pastes the combined block into THAT project, this same command is the re-check: expect all-OK + exit 0, and the mismatch hint disappears | Open |
| 2026-08-10 | Schema-state mismatch check | Consider adding a --ref-only flag (or a validate:project npm script) that prints just the probed ref + dashboard link for CI scripts that need the project identity without the full table | Open |
| 2026-08-11 | Admin Jobs deep links | Make ?page= URL-backed too (or solve the two-single-key atomic-update constraint) so a paginated filtered view like ?status=failed&page=2 is fully shareable, mirroring the ?team= + ?from=/?to= pattern | Open |
| 2026-08-11 | Admin Jobs deep links | Extend the server-side status/page forwarding treatment to the admin Users page (and confirm Audit Logs forwards status already) so role/status deep links resolve server-side like /app/admin/jobs | Open |
| 2026-08-11 | Admin Jobs deep links | The useQueryParam absent-key loop fix is DOM-tested; do a quick manual dev pass on /app/admin/jobs?status=failed (and a ?team= surface) to confirm the visual state and URL bar stay canonical in the browser | Open |
| 2026-08-11 | Admin jobs controller spec | Extend the same HTTP-layer spec treatment to the remaining paginated admin routes (users, audit-logs, reports, organizations) — they share the strict-pipe query pattern and the guard chain, but only jobs has route-level coverage today | Open |
| 2026-08-11 | Admin jobs controller spec | The listJobs envelope now matches (totalPages added to the mock) — confirm the e2e scans/admin specs assert totalPages too so the parity is locked on both sides of the test suite | Open |
| 2026-08-11 | Admin jobs live walk | BLOCKED on migrations 0008 + 0009 (audit_logs, scans.processing_mode) — paste .freebuff/combined-0005-0020.sql in the dashboard SQL editor of dmhrwdcuwtgscwlaagsa, then run cd backend && npm run validate:admin-jobs to execute the prepared walk (filter/paginate/retry/audit-row checks) | Open |
| 2026-08-11 | Walk script PORT hardening | The injected-PORT hazard is fixed for validate-scan-roundtrip / validate-refresh-cookie / validate-admin-jobs — the remaining script (validate-session-lifecycle.mjs) already resolves via .env.local only, but verify-bullmq.mjs and parity-monitoring.mjs read ports from env too; audit them for the same class of env-var ambiguity | Open |
| 2026-08-11 | Admin jobs live walk | Once the walk passes, extend it (or add a sibling script) to also verify the fail path: POST /admin/jobs/:id/fail writes scan.failed with severity + reason, and that a completed job rejects both retry and fail with 400 | Open |
| 2026-08-11 | Live e2e opt-in gate | Once migrations land, run the live suite to completion with PROVANCE_LIVE_E2E=1 npm run test:e2e — the invite-accept round trip + forged-token rejection close the last live-DB verification gap | Open |
| 2026-08-11 | Live e2e opt-in gate | Centralize the hermetical defense: add a jest-e2e setupFiles hook that blanks SUPABASE_URL/ANON/SERVICE_ROLE unless PROVANCE_LIVE_E2E=1, replacing the per-spec delete-key pattern in security/organization e2e specs | Open |
| 2026-08-11 | Live e2e opt-in gate | Document the PROVANCE_LIVE_E2E=1 trigger in docs/engineering (e2e run instructions) so the live-suite opt-in is discoverable for operators | Open |
| 2026-08-11 | New-device trust signal | Fingerprint consistency: the sign-in detection (isNewDeviceCombo) uses the (device, ip) combo while the per-session badge uses the device label only — decide whether they should share one fingerprint so the sign-in alert and the ledger badge always agree | Open |
| 2026-08-11 | New-device trust signal | Expose each device's firstSeenAt in SessionView so the badge tooltip can render "First seen Jul 17" instead of a static explanation, and the Security page could group sessions by device | Open |
| 2026-08-11 | New-device trust signal | A manual dev pass: load /app/account (Security tab) and the org member-sessions drawer to confirm the badge renders next to This device / team tags in both surfaces at desktop and mobile widths | Open |
| 2026-08-11 | Org-admin revoke walk | BLOCKED on migrations 0005 + 0010 — paste .freebuff/combined-0005-0010.sql in the SQL Editor of dmhrwdcuwtgscwlaagsa (or set DATABASE_URL in backend/.env.local and the pg client applies them), then run cd backend && npm run validate:org-revoke for the two-device walk | Open |
| 2026-08-11 | Org-admin revoke walk | If DATABASE_URL is pasted, add a tiny node scripts/apply-migrations.mjs (pg client, reads the migration dir in numeric order) so future migration applies are one command instead of dashboard pastes | Open |
