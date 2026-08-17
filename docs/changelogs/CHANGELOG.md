# Provance — Changelog

## [2026-08-17] - RolesController HTTP-layer supertest spec (list / scopes Owner-guard / member reassign)

### Added
- `backend/src/roles/roles.controller.spec.ts` — 16-test HTTP-layer suite booting the real `RolesController` with the REAL `SupabaseAuthGuard` + `AdminGuard` (mocked SupabaseService with invalid/non-admin token sentinels, `ADMIN_EMAILS` config mock), mirroring the admin-controller spec convention. Covers: route metadata (paths/verbs/`@HttpCode`), guard pair, RBAC matrix list pass-through, `PATCH :roleId/scopes` forwarding + actor wiring, Owner-role 403 at the HTTP layer (service ForbiddenException → 403 via GlobalExceptionFilter), DTO 400s (non-object scopes, missing props, forbidNonWhitelisted), `PATCH members/:memberId` routing (not shadowed by `:roleId/scopes`), Owner-assignment 403, missing-roleId 400, guard 401/403 paths, and the 30/60s controller throttle (429 at request 31).

### Verified
- New spec: **16/16**. Backend jest **470/470** (+16), e2e suite untouched, `npm run build` clean.

## [2026-08-17] - Migration-convergence CI gate: migration dir must match the runbook manifest

### Added
- `backend/scripts/check-migration-convergence.mjs` — CI gate that runs the **real applier in dry-run mode** (`apply-migrations.mjs --dry-run`, which lists every `supabase/migrations/*.sql` in dependency order without connecting or needing env) and compares the file set + order against the canonical **Migration Manifest** embedded in `docs/engineering/MIGRATION_RUNBOOK.md`. Fails (exit 1) on: files on disk not in the runbook, files in the runbook not on disk, or same-set reordering. `--fix` regenerates the manifest block in place from the current migration dir; `--runbook <path>` overrides the doc (tests).
- `npm run check:migrations` script + **CI step** in the backend job (`.github/workflows/ci.yml`), running after build and before jest — a new migration without a runbook regen, or a rename/reorder, now fails CI.
- `validate-migrations.mjs --runbook` now emits the canonical manifest section (marker-delimited, all 21 files in order) alongside the founder checklist.

### Changed
- `apply-migrations.mjs` `loadEnv` tolerates a missing `backend/.env.local` so `--dry-run` (and thus the CI gate) works with no env file present.
- `MIGRATION_RUNBOOK.md` gained the `<!-- BEGIN/END MIGRATION MANIFEST -->` section (CRLF, placed after the intro, before the founder checklist).

### Verified
- Clean run: `CONVERGED — file set + order match the runbook manifest` (exit 0).
- Drift paths: missing-file and reorder fixtures both exit 1 with the exact diff + one-command fix.
- `--fix` re-embeds with the doc's CRLF convention (no mixed EOLs); manifest parity between `--runbook` regen and the embedded block is byte-identical (modulo CRLF).
- Applier dry-run and the gate both pass with `backend/.env.local` moved aside (CI simulation): 21 files listed, exit 0.
- Backend gates: jest **454/454**, e2e **76 pass / 2 skip** (live invite spec opt-in), `npm run build` clean.

## [2026-08-17] - Live scan walk re-check: migrations still not on the probed project

Re-probed before the walk (user reported migrations applied): direct REST probes + the running :4000 backend's readiness both confirm `dmhrwdcuwtgscwlaagsa` is still **5/20** — `organizations` 404 PGRST205 (0005), `user_sessions` 404 (0010), `audit_logs` 404 (0008), `scans.processing_mode` 400 42703 (0009). Readiness stays `degraded` with 15 missing. The block did not land on this project; the full round-trip cannot run until it does. No code changes.

## [2026-08-17] - validate:bullmq now exercises and asserts the BullMQ retry path live

### Added
- `verify-bullmq.mjs` rewritten from a happy-path watcher into a **retry-path verification** (the happy path belongs to validate:scan-roundtrip). It inserts a real `queued` scan row, uploads a real 1×1 PNG to its storage path via the storage API, **deletes the object before enqueueing** (so the worker's download is guaranteed to fail on every attempt), enqueues `process-scan` with the service's exact options, then polls the job + row at 1s and asserts the full terminal contract.
- **Observed live (2026-08-17, real Upstash Redis + running worker):** `job=active → delayed → active → delayed → active → failed` with `attemptsMade` 1 → 2 → 3 (backoff gaps 3.7s/5.5s incl. poll latency), the row landing `failed` with `Failed to download the uploaded asset.` — **8/10 checks PASS**, proving the `attempts: 3` + exponential backoff config and the final-attempt-only failed gate in practice.
- The 2 remaining checks are **migration-gated**, with pre-flight probes naming the exact fix: `attempts_made`/`max_attempts` on the row (migration 0021, unapplied) and the `scan.failed` audit row in `audit_logs` (migration 0008, unapplied).
- **Finding:** at least one running worker process is **stale** — its log line `marked failed after retries` exists nowhere in current src/dist (the current code logs `marked failed after X of Y attempts`), so a pre-0021 worker wrote the terminal failure without attempts telemetry. All worker processes must be restarted from the current build once 0021/0008 land.

## [2026-08-17] - SCAN_UPLOAD_CONTRACT.md gains the verified live BullMQ evidence

### Added
- New "Verified BullMQ evidence (live, 2026-08-17)" section in `docs/engineering/SCAN_UPLOAD_CONTRACT.md`, sourced from the real worker log (`.freebuff/bullmq-worker.log`) rather than code alone:
  - **Worker concurrency observed:** the boot line `Worker is ready for queue "scan-processing" with concurrency 4` appeared 183 times across restarts; `WORKER_CONCURRENCY` default 4 confirmed; worker refuses to boot without `REDIS_URL` (exit 1).
  - **Retry behavior observed:** a real job failed at **attempt 2 of 3** (`Failed to download the uploaded asset`) — BullMQ re-queued with exponential backoff per `attempts: 3` / 1s-base config, the scan row stayed `processing` (`will retry`), proving the final-attempt-only `failed` gate and idempotent re-entry.
  - **Exact validator commands:** `npm run validate:bullmq` (queue path in isolation — inserts a real row, enqueues with the service's exact options, polls job state + row status, prints job counts, deletes the row) and `npm run validate:scan-roundtrip` (full chain incl. report payload + PDF with the parallel 1s BullMQ job watcher asserting job-state ⟺ row-state).
- Honest scope note: no `Completed scan job` line or `complete` row transition observed live yet — the happy path remains gated on 0009/0019/0021 landing on the probed project; the retry machinery is the proven part.

## [2026-08-17] - Live scan round-trip walk: verified blocked (schema not on the probed project)

### Attempted / blocked
- Founder reports "migrations are applied"; the full live walk (validate:scan-roundtrip → BullMQ worker → queued → processing → complete → report payload → PDF) was attempted but is **blocked at step 0**: live direct REST probes on `dmhrwdcuwtgscwlaagsa` (the only Supabase project both `backend/.env.local` and `.env.local` point at) still return `organizations.id → 404 PGRST205`, `scans.processing_mode → 400 42703`, `user_sessions.id → 404 PGRST205`; readiness confirms `degraded` with 15 missing migrations (0009/0010 hard gates). The applied-set fingerprint is unchanged (0001–0004, 0006), so no new paste has landed on this project.
- `DATABASE_URL` still empty in `backend/.env.local`; `REDIS_URL` set (queue.ready: true on the running :4000 backend).

### Unblock (either)
1. Re-paste the combined block (`.freebuff/combined-missing.sql`, or regenerate via `npm run validate:migrations -- --paste-file`) into the SQL Editor of **project/dmhrwdcuwtgscwlaagsa** specifically — check the browser URL bar; or
2. Set `DATABASE_URL` and run `npm run apply:migrations -- --verify` (one command, no dashboard).

Then: `npm run validate:migrations` → `npm run start:worker` → `npm run validate:scan-roundtrip` (walks initiate → signed upload → submit → queued → processing → complete → `GET /v1/reports/:id` payload → `GET /v1/reports/:id/pdf` artifact, with the BullMQ job watcher).

## [2026-08-17] - changePassword e2e locks "exactly one ledger row" at the HTTP layer

### Added
- `security.e2e-spec.ts` changePassword happy-path now asserts the revoke step leaves **exactly one** session ledger row — the current one — locked at both layers: the in-memory store's row count (`passwordApp.sessions.size === 1`) and an HTTP readback (`GET /v1/security/sessions` returns a single `isCurrent: true` row for `s-current`), the exact contract the Security page renders after its `settings.reload()`.

### Verified
- Backend gates green: jest **454/454**, full e2e **76 pass / 2 skip** (invite-accept live spec is opt-in), `npm run build` clean. Security e2e suite 17/17 including the extended flow.

## [2026-08-17] - better-auth changePassword revoke-everything-else parity pinned

### Added
- `betterChangePassword` now documents the three-backend change-password parity contract (mock = GoTrue = better-auth): format-validate before touching the backend (identical messages), revoke EVERY OTHER session while the current device stays signed in, resolve `{ ok: true }`. The revoke-everything-else is better-auth's native `revokeOtherSessions: true` (verified in better-auth 1.6.26's `update-user` route: deletes all sessions, mints a fresh session for the current device) — the same net state as the mock's activeSessions filter and the GoTrue path's per-session admin revoke.
- `betterChangePasswordContract.test.js` — 4 tests pinning the better-auth leg with a stubbed `createAuthClient` (vi.hoisted mock): `revokeOtherSessions: true` is passed with the payload and resolves `{ ok: true }`; short/identical passwords reject with the exact mock messages BEFORE the client is touched; client errors propagate as thrown Errors (the api.js contract the Security page reads).

### Verified
- Full frontend gates green: vitest **592/592** (67 files, +4), `npm run lint` 0 errors, `npm run build` clean. (One env-slow flake observed on the first full run — a timing-sensitive suite crossing its window on the slow environment — passed cleanly on two consecutive re-runs; unrelated to this change.)

## [2026-08-17] - Mock security mutations persist across reloads

### Added
- `mockApi.js` now persists the mock security mutations (revoked sessions, password-change audit rows) to `localStorage['provance.mock.securityMutations.v1']` as a **delta** — the revoked session ids plus the live audit rows the mutations created — and replays it at module init over the freshly-seeded (time-relative) mock, the same survival guarantee the auth session and scan store get.
- Wired into all four mutation paths: `mockRevokeSession` (single revoke), `mockChangePassword` (revoke-everything-else: every other session revoked + per-device `session.revoked` + `password_changed` rows), `mockRevokeMemberSession` and `mockRevokeMemberSessions` (org drawer). On reload the Security page, the Activity feed/admin trail, and the org session drawer all restore the revoked set; audit rows re-appear newest-first, deduped by id. Sign-in control toggles (2FA etc.) are intentionally not persisted — the demo contract is revoke-everything-else continuity.
- `securityMutationsPersistence.test.js` — 5 tests locking the persistence contract with a `vi.resetModules()` reload simulation: revoke → localStorage record, fresh-load restore (incl. the owner org-drawer ledger), revoke-everything-else across reload, member-session replay, and corrupt-storage fallback to the pristine seed.

### Verified
- Full frontend gates green: vitest **588/588** (66 files, +5 new), `npm run lint` 0 errors, `npm run build` clean. Existing mock-behavior suites unaffected (changePasswordContract, memberSessions, mockApiParity, newDeviceSignin, mockNoise — 28/28 targeted).

## [2026-08-17] - Founder migration checklist wired into MIGRATION_RUNBOOK.md

### Added
- `validate:migrations --runbook` — new mode that emits a **founder-facing checklist**: one click-to-open SQL Editor link per pending migration (pre-filled via the `?query=` param, degraded safely to the right project's blank editor if the dashboard ignores it) plus the full combined paste block (all pending migrations, dependency order, `-- MIGRATION nnnn · file` banners). Output is wrapped in BEGIN/END markers so a regenerate is a clean replace.
- `MIGRATION_RUNBOOK.md` now carries that checklist at the top (generated, not hand-maintained), covering the live state: project **dmhrwdcuwtgscwlaagsa**, 5 applied / 16 pending (0005, 0007–0021 incl. the seed-only 0017). Title, applied-state line, and expected counts updated to 0003–0021 (`applied: 20 · missing: 0 · skipped: 1` after convergence); the one-shot object check extended with the 0021 attempts columns.

### Verified
- Regeneration parity: the embedded section is byte-identical to a fresh `--runbook` output (965 lines, modulo CRLF); 16 links, 16 banners, `<details>` pair balanced, `$$` dollar-quoting intact (the embed used a function replacement so SQL `$` sequences can't be mangled).
- `--no-emit` gate unchanged (exit 1 on the live 15-missing state); live probe still shows 5/20 applied — the walk remains blocked until the block lands on `dmhrwdcuwtgscwlaagsa` specifically (or `DATABASE_URL` is set).

## [2026-08-17] - Live e2e re-run: invite-accept still blocked (paste not on this project)

### Verified
- Founder reports pasting the 0005+0015 block; `validate:migrations` + direct REST probes on project **dmhrwdcuwtgscwlaagsa** still show 15 missing (organizations.id → PGRST205, organization_invites.token_hash → PGRST205, scans.processing_mode → 42703) and `DATABASE_URL` remains empty in `backend/.env.local`.
- `PROVANCE_LIVE_E2E=1 npm run test:e2e` → **76 pass / 2 failed**: both failures are the invite-accept live suite's seed (`seed org failed: Could not find the table 'public.organizations' — apply 0005_organization.sql`), confirming the blocker is the schema on this project, not the code.
- Action: re-check the SQL Editor browser URL bar reads `project/dmhrwdcuwtgscwlaagsa` (the paste likely landed on a different project), then re-paste; DATABASE_URL is still the empty-line alternative.

## [2026-08-17] - validate-scan-roundtrip proves the worker path via BullMQ job states

### Added
- The round-trip walk now polls the BullMQ job in parallel with the row: job state every 1s (finer than the row's 5s frontend cadence so a fast worker can't hide `active`), row every 5th tick. New checks assert the job is observed via the queue API (`jobId = scanId`), the chain includes `active` (claimed by the worker, NOT inline), and the job's terminal state (`completed`/`failed`) matches the row outcome; a final read captures the terminal job state since the row updates before the BullMQ `completed` event fires.
- Job-level leg is skipped with a note when `REDIS_URL` is unset (inline fallback has no queue to watch) and fails loudly if the queue client can't build; `SCAN_PROCESSING_QUEUE_NAME` respected. Requires the backend's `dist/queue/queue.connection.js` (built via `npm run build`).

### Verified
- Syntax valid; no-backend path still fails fast against the live backend (503 with the 0019 hint — migrations still pending); Queue + createRedisConnection resolve from the script's `../dist` path.

## [2026-08-17] - apply:migrations gains --verify; DATABASE_URL still the one missing input

### Changed
- `backend/scripts/apply-migrations.mjs` (wired as `npm run apply:migrations`) gains a `--verify` flag: after applying, it auto-runs `validate:migrations --no-emit` and fails loudly if the live probe reports anything still missing — one command applies AND confirms convergence, no dashboard round-trip.
- Confirmed the script already applies `supabase/migrations/` in numeric order via pg (`--dry-run` lists all 21 files; `--from=<n>` scopes). The ONLY missing input is the actual `DATABASE_URL` value — the line exists but is empty in `backend/.env.local`, and no connection string exists anywhere in the repo (the `.freebuff/desktop-v2.db` match is the desktop app's SQLite store, not a usable URL).

## [2026-08-17] - Skills audit close-out: follow-up rows flipped + README skill inventory

### Changed
- Follow-up log close-out: marked the supabase/agent-skills collection install, the provance-bullmq-redis-queue skill draft+install, and the supabase-skill RLS/Storage audit as Done (the queue-audit D1/D3/D4 rows stay Open — they are the flagged fixes still to ship).
- README gains a **Skills** section (TOC entry + docs-index row): the two Provance skills (`provance-nestjs`, `provance-bullmq-redis-queue`) sourced from `docs/skills/` and installed to `~/.agents/skills/`, the official `supabase/agent-skills` collection, and the one-command install/refresh snippet.

## [2026-08-17] - Admin controller spec extended to the remaining paginated routes

### Added
- New `AdminController paginated admin routes (HTTP layer)` describe block in `admin.controller.spec.ts` (12 tests), following the notifications controller-spec reference pattern the provance-nestjs skill encodes.
- Locks route paths/verbs for `GET /admin/reports`, `/admin/users`, `/admin/audit-logs`, `/admin/organizations`; the strict→DefaultValuePipe→ParseIntPipe query wiring (reports/users 1|20, audit-logs 1|100) with `team`/filter params left as raw string passthroughs; envelope pass-through; malformed-number 400s that never reach the service; and class-level guard coverage (401 no-header, 403 non-admin) on the new routes.

### Verified
- backend jest **454/454** (28 admin controller tests), e2e **76 pass / 2 skip**, `npm run build` clean.

## [2026-08-17] - Provance skills installed globally + registered with the skills CLI

### Added
- Installed `provance-nestjs` into `~/.agents/skills/` (byte-identical to `docs/skills/provance-nestjs/SKILL.md`); `provance-bullmq-redis-queue` confirmed already installed and byte-identical.
- Verified both register with `skills list -g` (skills CLI v1.5.22, Source: local, both listed with valid frontmatter name/description).

## [2026-08-17] - Supabase skill activation: RLS/Storage guidance added to the scans contract

### Changed
- Activated the installed `supabase` agent-skill (v0.1.2) on the scans upload contract and patched `docs/engineering/SCAN_UPLOAD_CONTRACT.md` with a new **RLS, Data API exposure, and key posture** section:
  - Clarified the app never depends on table RLS — every scan read/write goes through the service-role admin client; the frontend's only direct Supabase surface is the signed-URL storage upload (anon key, `VITE_SUPABASE_ANON_KEY` only; the service key lives only in `backend/.env.local`).
  - Flagged the Apr-2026 Data API auto-exposure breaking change (enforced on all projects 2026-10-30): `scans` has owner-scoped RLS policies but **no GRANTs** — intentional today, but any future client-side reads need table exposure + `GRANT` to `authenticated` first.
  - Pinned the policy shape (0002_scans.sql) as the recommended pattern (`TO authenticated`, UPDATE with both `USING` and `WITH CHECK`), and documented that `provance-uploads` intentionally has **no `storage.objects` RLS policies** (signed-token access only) plus the upsert-needs-INSERT+SELECT+UPDATE trap for future direct reads.
- Also closed the queue-audit **D2** drift while in the doc: the schema table now lists `file_hash_sha256` (0013), `idempotency_key` (0019), and `attempts_made`/`max_attempts` (0021), and the required-migrations note names 0013/0019/0021 alongside 0002/0009.

## [2026-08-17] - Queue skill audit: retry/backoff config cross-checked (flag-only)

### Audit (no code changed)
- Cross-checked the retry/backoff contract across four sources: `queue.service.ts` (enqueue options), `SCAN_UPLOAD_CONTRACT.md`, the drafted `provance-bullmq-redis-queue` skill, and the e2e assertions (`scans-api` + `scans-flow`).
- **Consistent:** `jobId: scanId`, `attempts: 3`, exponential backoff 1s, `removeOnComplete/removeOnFail: 100`, job `process-scan` on queue `scan-processing`, worker final-attempt gate `attemptsMade >= attempts`, the "row stays processing between retries" invariant, and `markScanFailed` idempotency — identical in code, contract doc, skill, and `verify-bullmq.mjs`.
- **Drift flagged (logged as follow-up rows):** (D1) skill snippets stale vs the new `{ attemptsMade, maxAttempts }` third arg; (D2) contract doc schema/migration note omits 0021 even though the failure path now writes it; (D3) the retry shape is asserted nowhere automated — both e2e specs mock `enqueueScanProcessing` and never assert the options object; (D4) the unit spec passes `undefined` for QueueService with no submitScan test, contradicting the skill's "consistent queue mocking" convention.

## [2026-08-17] - Scan retry telemetry surfaces in the admin Jobs payload

### Added
- New migration `0021_scan_attempts.sql` — `scans.attempts_made` (default 1) and `scans.max_attempts` (default 3), with a probe in `MIGRATION_PROBES` so readiness/`validate:migrations` catch a missing 0021 (probe count now 21).
- The BullMQ worker's final-attempt `failed` handler now passes `job.attemptsMade` / `job.opts.attempts` into `markScanFailed`, which persists both columns on the failed row and includes them in the `scan.failed` audit details (inline path records 1/1; absent telemetry falls back to stored/neutral defaults).
- `AdminService` `toJobView` now surfaces the real `attempts` (display floor of 1 keeps the mock dialect for rows without telemetry) plus `max_attempts`, and `retryJob` resets `attempts_made` to 0 so a manual retry starts a fresh run; `mockAdminJobs` gains `max_attempts` for shape parity.

### Verified
- backend jest **442/442** (new tests: attempts persistence + audit details in `scans.service.spec`, real-attempts assertions in `admin.service.spec`, 21-probe count in `migration-health.service.spec`), e2e **76 pass / 2 skip**, `npm run build` clean, migration validator picks up 0021 from dist.

## [2026-08-17] - validate:migrations auto-emits the missing-migration paste block

### Added
- `validate-migrations.mjs` now joins the missing migrations' source files (from `supabase/migrations`, in dependency order — the same order the applier uses) into ONE ready-to-paste SQL block and emits it, so a single command both checks the live schema AND produces the exact fix.
- Three modes: default prints the block to stdout after the missing list (with the dashboard link + `npm run apply:migrations` hint); `--paste-file=<path>` writes it to a file and prints the real path; `--no-emit` suppresses it for quiet CI. Exit code 1 (missing) is preserved in every mode.
- Block format mirrors the proven `.freebuff/combined-0005-0020.sql` (per-migration `-- MIGRATION <num> · <file>` banner, CRLF→LF + trailing-whitespace normalization) — verified byte-parity against all 14 currently-missing sources (0005, 0007–0016, 0018–0020), 14 sections.

## [2026-08-17] - Import-parity guards for api.js, mockApi.js, mockData.js

### Added
- Three new parity guards on the generic `createImportParityGuard` core, mirroring the ui-barrel/chartGeometry guards: `apiParity.test.js` (79-export surface), `mockApiParity.test.js` (69), `mockDataParity.test.js` (40). Each pins the module's runtime export surface in declaration order and walks every importer in `src/` asserting the names it imports still exist — so a rename/removal that misses an importer fails the unit suite immediately (mock/real drift can't be silent anymore).
- Verified repo-wide: zero namespace/default imports of any of the three modules (the unsupported-shape check is green), and every importer (41 api.js consumers incl. api.js→mockApi and mockApi→mockData chains) imports only names that exist.
- Note: these run under the vitest suite, so they're already part of the CI frontend job alongside the existing parity guards.

## [2026-08-17] - LivePollIndicator refresh-now affordance on every live surface

### Added
- `LivePollIndicator` gained an optional `onRefresh` prop: a small tap-to-refresh icon button beside the dot (outside the `role="status"` live region, so it stays a normal interactive control). Without `onRefresh` the component remains the pure status atom.
- `useResource` and `useMockData` both expose a new `refresh()` — the manual twin of a poll tick: silent in-place swap, no loading flash, keeps last-known-good on failure, bypasses the `pollWhen` gate (explicit user action). Documented as the ONLY correct wiring for the affordance (`reload`/`refetch` would blank the panel).
- Wired on all six live surfaces: dashboard ledger + queue-posture panels, Queue page, History ledger, report detail pane, Uploads status card, and admin Monitoring queue-health panel.

### Verified
- 8 new tests (useResource refresh ×3, useMockData refresh ×2, LivePollIndicator component ×3); vitest **574/574**, lint 0 errors, build clean.
- Headless probe: the uploads `?demo=start` flow shows the Refresh now button, a click re-fetches silently with the status panel intact, and the dashboard queue-posture card shows it once a queued scan exists. Responsive audit subset on all changed surfaces **40/40** clean at 375–1280. (The full 260-check walk hit the documented headless-Chromium page-crash at laptop-1024 on this dev box — environment, not layout.)

## [2026-08-17] - LivePollIndicator documented as a first-class ui primitive

### Docs
- `LivePollIndicator` (already extracted into the ui kit + barrel-exported) now carries the full documented-primitive header matching TrendChart/StackedBarChart: purpose, the zero-props presentational contract, the Card `actions`-slot usage example, the gating rule (show exactly while the poll runs — same predicate the 5s loop uses, e.g. `hasActiveScanWork` / `queueNeedsPolling` / `scanNeedsPolling`), the `role="status"` a11y contract, and three hard rules for future live surfaces (import from the barrel, gate on the poll predicate, keep the "auto-refreshing" copy). All 6 consuming surfaces verified to import from the barrel — no hand-rolled dots anywhere.

## [2026-08-17] - Follow-up log triage + closed gap batch (armed resets, quota chip, sign-in lockout)

### Triage
- Audited the full `followup-recommendations.md` log against the code and flipped 9 verified-stale rows to `Done` (roles controller gap, `session_revoked` severity parity, `mockRevokeSession` audit parity, cookie CI gate, idempotency-key probe, LivePollIndicator sweep + queue/report-detail rows, org/API-key armed confirms, `validate:scan-roundtrip` wiring). Kept the founder-blocked rows (migration paste, `DATABASE_URL`, Upstash expiry, GH secrets) Open with current notes.

### Added
- `src/components/ScanQuotaWarningChip.jsx` — shared ≥85% quota chip extracted from the dashboard (was inline in `AppDashboardPage`); now rendered by the **Uploads page** too (new `getBilling` resource), so the surface where the user hits the limit shows the same warning that agrees with the `initiateScan` 402 gate.
- Dashboard notifications feed: "View all N unread notifications" link to `/app/notifications` under the `unread.slice(0, 4)` preview.
- Armed-confirm click-away/Escape reset on the **Organization page** (member remove, `data-armed-member-row`) and **API Keys page** (key revoke, `data-armed-revoke-row` on the table row) — the same `pointerdown`/`Escape` document-listener disarm the security page ships, so no half-armed destructive confirm lingers.
- Admin Audit Logs: the event drawer now renders structured `details` (revoked counts, session ids, lockout ip/failures, reasons) with `break-words` hardening; `lockout` and `session revoked` short-action tones added to the badge map.
- **`SignInLockoutInterceptor`** — failure-keyed lockout for `POST /auth/sign-in` (credential-stuffing protection), reusing the shared `RefreshLockoutTracker`: 5 consecutive 401s within a window trip a 429 + one high-severity `signin_lockout` audit row per episode; successful sign-in clears the key; `SIGNIN_LOCKOUT_ENABLED=false` escape hatch for hermetic e2e (pinned in `auth.e2e-spec.ts`). Env keys documented in the follow-up log (`.env.example` is tool-blocked); 8 new unit tests.
- `prefers-reduced-motion` gating: the Hero's infinite pulse blob renders as a static glow, and the ProductShowcase demo no longer auto-plays (manual Run demo / Replay still works) — closing the last a11y follow-ups from the touch audit.
- `validate:refresh-cookie` npm script wired (script existed but was only runnable via `node scripts/…`).
- `src/lib/pollParity.test.jsx` — 3 tests asserting `useResource` and `useMockData` share identical `pollMs`/`pollWhen` silent-poll semantics.

### Verified
- Backend: build OK, jest **441/441**, e2e **76 pass / 2 skip** (with the shell's stray `PORT=0` unset — see follow-up row on pinning PORT in the e2e setup).
- Frontend: vitest **566/566**, lint 0 errors, build clean, `audit:responsive` **155/155**.

## [2026-08-17] - Dashboard/admin/report review — roadmap drafted (no code changed)

### Planning
- Full review of the dashboard, all 12 admin pages, the report/PDF pipeline, and the API surface. Findings: dashboard + admin are feature-complete with backend parity and mock fallbacks; the report gap is confirmed (mock/dev mode exports via browser print dialog — the branded server PDF exists only in real mode); the pipeline is image-only; public API is roadmap-only.
- New doc `docs/engineering/DASHBOARD_ADMIN_REPORT_ROADMAP.md` with a 5-phase founder-review plan: (1) single-path branded PDF export, (2) video+audio verification, (3) public verification API, (4) dashboard value features, (5) admin depth. **Awaiting founder approval — no code shipped this turn.**

## [2026-08-17] - LivePollIndicator on every remaining polling surface

### Added
- `AppHistoryPage` — the ledger's existing 5s poll now shows the indicator: `actions={live ? <LivePollIndicator /> : null}` on the Card, gated by the same `hasActiveScanWork` predicate the poll runs under (hidden when the queue drains).
- `AppUploadsPage` — the status panel now live-tracks the submitted scan: a `useResource` on `getScan(activeScanId)` polls every 5s while the scan is queued/processing (same `scanNeedsPolling` gate as the report detail pane), with the indicator in the Upload status card.
- `MonitoringPage` — the feed now polls silently every 5s (`useMockData(..., { pollMs: 5000 })`), with the indicator beside the queue-health panel's Job queue chip.
- `src/lib/useMockData.js` — new optional third `options` argument: `pollMs` runs a silent background poll (no loading flash, keeps last-known-good on a failed poll — same contract as `useResource`), plus an optional `pollWhen` gate.

### Tests
- `useMockData.test.jsx` — 3 tests locking the poll contract: silent in-place swap without a loading flash, last-known-good on a failed poll, and no polling when `pollMs` is omitted (backwards compatible).

### Verified
- Headless probe at 1280px: indicator renders on `/app/uploads` during the `?demo=start` flow, on `/app/history` once a queued scan exists (matches the dashboard's data-gated behavior), and on `/app/admin/monitoring`. Responsive audit subset **15/15** clean at 375–1280; vitest **563/563**; lint 0 errors; build clean.

## [2026-08-17] - Merged dev into main — milestone live on Vercel

### Shipped to main (founder-approved)
- `dev/backend-integration-milestone` merged into `main` as `885e971` (97 commits): real scan upload → queue round-trip, admin backend slice, org module + invite token hashing, security sessions + cookie flow, notifications, billing, 404 fix, Vercel Web Analytics, armed confirms, CI gates. `main` auto-deploys to Vercel.

### Gate-caught fixes during the merge
- **Flaky armed-confirm test** (fixed in `ac764df`, pre-merge): `fireEvent.click` raced React's commit under load — clicks sometimes never armed (~1-in-5 runs). Rewrote with `userEvent` + deterministic waits; 12/12 green.
- **CRLF shebang broke the transform** — with Windows `core.autocrlf=true`, `scripts/trello.mjs` checked out as `#!/usr/bin/env node\r\n`; vite 8/rolldown's shebang stripping left a stray `\r` → "Invalid or unexpected token" and **22 trello tests silently vanished**. Added `.gitattributes` (`scripts/*.mjs text eol=lf`) so shebang'd scripts stay LF everywhere; suite back to 560/560.

### Merge resolution
- `package.json`: kept dev's `@vercel/analytics ^2.0.1` (supersedes main's `^1.4.1`) + `better-auth`; `package-lock.json` taken from dev.
- Local `main` had 2 unpushed duplicate commits (admin milestone + org tests — already in dev); reset to `origin/main` before merging.

## [2026-08-17] - Fix flaky armed-confirm test (fireEvent → userEvent)

### Fixed
- `src/pages/app/appSecurityArmedReset.test.jsx` — the armed-revoke suite flaked ~1-in-5 runs (armRow's click sometimes never armed, failing tests 1/2/4 at random under load). `fireEvent.click` was racing React's commit in jsdom; switched every click to `userEvent.click` (full pointer sequence + act flushing) and added a deterministic wait for the post-disarm re-render before clicking the other row. Stress-tested: 12/12 consecutive runs green, full suite 560/560, lint + build clean.

## [2026-08-17] - Mobile touch audit: 44px tap targets on the landing nav

### Fixed
- `src/components/Navbar.jsx` — the mobile menu links (nav items, Dashboard, Sign In) were bare `text-base` links (~24px tall, below the 44px touch-target minimum). Added `inline-flex min-h-11 items-center` so every row is exactly 44px, matching the footer's existing pattern. CTA buttons were already ≥44px.

### Audit summary (Hero + landing framer-motion, mobile width)
- Hero CTAs (`btn-primary`/`btn-secondary`): 55px ✓ · Hero "See why teams choose Provance" anchor: `min-h-11` ✓ · Navbar hamburger: 44×44 with aria-label/expanded/controls ✓ · CLEARAnswers accordion summaries: ~68px ✓ · SampleReport `<details>` summaries: `min-h-11` ✓ · ProductShowcase signal-row buttons: ~56px, Replay button: `min-h-11` ✓
- `InteractivePanel` 3D tilt is touch-safe by design — enabled only on `(hover: hover) and (pointer: fine)` devices and disabled under `prefers-reduced-motion`, so touch taps can't leave the panel stuck tilted.
- **No hover-only interactions anywhere** on the landing: grep for `group-hover`/`peer-hover`/`hover:block`/`hover:visible` content gating returns zero matches; all `whileHover` usages are decorative lift/translate on non-interactive cards (harmless on touch).

### Verified
- Headless measurement at 375×720: hamburger 44×44, all 8 mobile menu rows 44px (55px for the CTA), hero CTAs 55px.
- Responsive audit subset 15/15 clean (sample-report + benchmark at 375/640/768/1024/1280 — these render the shared Navbar); lint 0 errors, build clean.

## [2026-08-17] - break-words/min-w-0 hardening on report surfaces

### Fixed
- `src/pages/app/AppReportsPage.jsx` — extended the long-string hardening beyond the detail header to every other backend-string surface: `ReportMetaItem` values (scan/report UUIDs), the list-row filename, the verdict `display_label` heading, the dedup banner's mono scan/report ids, and signal/finding text (display name, methodology version, status reason, finding label/description) now carry `min-w-0`/`break-words` so real unbroken strings can't blow cards wider than the viewport.
- `src/pages/admin/ReportsPage.jsx` — hardened the report detail drawer the same way: drawer summary card report_id + scan_id, the dl rows (report/verdict/team/organization), and signal rows (label + finding Badge) all got `min-w-0`/`break-words`; confidence spans are `shrink-0` and the bar+badge row wraps.

### Verified
- Full vitest **560/560**, lint 0 errors, build clean.
- Responsive audit subset green: **20/20** page audits clean for `/app/reports` (+ dynamic scan routes) and `/app/admin/reports` at 375/640/768/1024/1280.

## [2026-08-17] - ProductShowcase signal-tone fix (found during live walk)

### Fixed
- `src/components/ProductShowcase.jsx` — `signalTone` matched the ok-regex before the warn-regex, so `complete` matched inside **"incomplete"**: "Metadata chain incomplete" rendered green (should be amber), the metadata bar was green, SIGNAL AGREEMENT inflated to 75% (should be 50%), and the flagged count read 1 instead of 2.
- Extracted the matcher into `src/lib/showcaseTone.js` (fixed: `incomplete` → warn checked first; `no X` ok-rule narrowed to anomaly-type phrases so "No trusted credential located" stays warn) with `showcaseTone.test.js`.

### Verified
- 11 new tests; full vitest **560/560**, lint 0 errors.
- Live walk in the preview: full cycle queued → signals resolve → report-ready → verdict chip + per-signal findings render end to end; after fix, SIGNAL AGREEMENT reads 50%, flagged count reads 2, "Metadata chain incomplete" renders amber.

## [2026-08-17] - Component-reachability guard (no more silent dead code)

### Added
- `src/lib/componentReferences.js` + `src/lib/componentReferences.test.js` — a repo-wide vitest guard that every component under `src/components/` (except `ui/`, governed by its own barrel-parity contract) is **transitively reachable** from a file outside the components dir. Roots are src files outside `src/components/`; the BFS propagates through live components, so a component imported only by another dead component is still surfaced (no false "1 importer" confidence). Matching covers path imports (`from './X.jsx'`) and identifier/barrel imports (`import { X } from './index.js'`), with comment stripping so a leftover `// import X from …` hint can never count as a reference. `REFERENCE_EXCEPTIONS` allowlist + a stale-entry check keep intentional exceptions honest.

### Verified
- **Green baseline**: all 36 non-ui components are reachable today (TrustBar would have been caught before it was wired). Mutation-tested: a temporary orphaned component was flagged (`components/OrphanProbe.jsx`). 7 new tests (matchers, comment stripping incl. `https://` survival, repo-wide scan, stale exceptions). Full vitest **556/556**, lint 0 errors.

## [2026-08-17] - TrustBar wired into the landing under the Hero

### Changed
- `TrustBar` (previously unreferenced dead code) is now rendered on the landing page directly under the Hero — it is a finished benchmark-claims panel (trust-weighted accuracy 1.00, 0.0% FPR, gold-catalog count) with CTAs to the live `/benchmark` and `/benchmark#catalog` routes, so it serves as the landing's measurable social proof instead of being archived. Decision mirrors ProductShowcase (reuse, not archive) and closes the last dead-code follow-up row.

### Verified
- Renders correctly at phone (stats stack, CTAs stack) and tablet widths in the live preview; lint 0 errors; grid guard + ui barrel parity 23/23; responsive audit: `/` PASS at phone-375 and tablet-768 (the remaining audit FAILs are headless-Chromium page crashes hitting public routes too — environmental, not from this change).

## [2026-08-17] - E2E suite re-verified; invite-accept block prepared (founder gate)

### Verified
- Full e2e suite (hermetic, live suite opt-in): **76 passed, 2 skipped** (78 total — the 2 skipped are the live invite-accept suite, gated behind `PROVANCE_LIVE_E2E=1`). All 6 hermetic suites green; the suite has grown past the earlier 67-test figure.

### Blocked on founder action
- The invite-accept live suite cannot pass yet: migration **0005** (`organizations`/`organization_invites`) is still missing on `dmhrwdcuwtgscwlaagsa` (14 migrations missing per `validate:migrations`), and its seed also inserts `token_hash` (migration **0015**). No PG connection string exists in the repo (`DATABASE_URL=` is empty), so application requires the founder: paste `.freebuff/combined-0005-0015.sql` (198 lines, byte-verified verbatim against both sources) in the SQL Editor for the project, or paste the Session-pooler connection string into `backend/.env.local` so `npm run apply:migrations -- --from=0005` works.

## [2026-08-17] - mockChangePassword revoke-everything-else backfill

### Changed
- `mockChangePassword` (Security page, mock mode) now mirrors `SecurityService.changePassword` end-to-end instead of only validating: after validation it **revokes every OTHER tracked session** (persists the filter on the module store like single revokes, current session stays signed in), writes one `session.revoked` admin-trail row per revoked device (`details.session_id` + `reason: 'password_change'`), and writes a `password_changed` feed event last so it lands newest-first on top — matching the real write order.
- `AppSecurityPage.handlePasswordSubmit` now calls `settings.reload()` after a successful change so the ledger visibly drops to the current device in both mock and real mode (the status effect clears the local copy).
- `password_changed` added to the severity maps (`mockData.js` + `backend/src/common/audit-severity.ts`, both `'low'` — the backend previously fell back to low implicitly) and to the Activity page's `ACTION_META` (label "Password changed" / verb "changed their password" / warning tone).
- Current-password verification remains format-level in the mock (any 8+ char password is valid for a known account — no stored secret exists to verify against); documented in a comment.

### Tests
- New `src/lib/changePasswordContract.test.js` (4 tests): revokes every non-current session and keeps only the current one (persisted across calls), writes `session.revoked` per revoked + `password_changed` on top with the right severity/actor, single-session no-op, and validation-before-mutation. Frontend vitest **549/549**, lint 0 errors; backend jest **433/433**, `nest build` clean.

### Verified (live preview)
- Security page: password change → success message + toast, ledger drops **4 → 1** devices; Activity feed (SPA nav) shows `password_changed` + three `session.revoked` rows on top attributed to the actor. (Mock module state is per page-load by design — mutations persist across SPA navigation, reset on reload like all mock mutations.)

## [2026-08-17] - Live BullMQ round-trip verified against Upstash Redis

### Verified
- Provisioned Upstash Redis instance (`adapted-shrew-121173.upstash.io`, expires 2026-08-19) wired into `backend/.env.local` `REDIS_URL`; PING → PONG confirmed.
- Booted backend :4000 + worker (`start:worker`): `Worker is ready for queue "scan-processing" with concurrency 4`.
- `npm run validate:bullmq` proved the **real BullMQ path**, not the inline fallback: inserted a `queued` scan row, enqueued via the real Queue with the service's exact options (jobId=scanId, attempts 3, exponential backoff), and watched the worker claim it — queue states `delayed → active → failed`, row `queued → processing → failed`. Worker log shows the retry machinery live (`failed (attempt 2 of 3)`); the failure reason (`Failed to download the uploaded asset`) is expected since the throwaway verification row has no real file in storage. Throwaway row cleaned up.
- The full app-path round-trip remains blocked only on the schema: migrations 0009/0013/0019 still not applied (see the applier + paste-block follow-ups).

### Notes
- Redis + backend + worker are running as background processes for the live walk.

## [2026-08-17] - One-command migration applier (`apply:migrations`)

### Added
- `backend/scripts/apply-migrations.mjs` — reads `supabase/migrations/*.sql` in numeric order and executes each file as a single multi-statement query via `pg` (simple-query mode, so `DO` blocks run verbatim), replacing the dashboard SQL-Editor paste loop. Flags: `--dry-run` (preview without a DB), `--from=<NNNN>` (apply only a suffix). Stops at the first failure so dependency order holds; prints the project ref from `SUPABASE_URL` as a wrong-project guard. Idempotent guards in the migrations make the whole set safe to re-run.
- `npm run apply:migrations` in `backend/package.json`; runbook section added to `docs/engineering/MIGRATION_RUNBOOK.md`.

### Notes
- Dry-run verified (20 migrations listed in order; `--from=0019` filter correct). **`DATABASE_URL` is still unset in `backend/.env.local`**, so the live apply is blocked until the founder pastes the Supabase connection string — the SQL-Editor paste loop (or `.freebuff/combined-0005-0020.sql`) remains the only path until then.

### Tests
- `npm run apply:migrations -- --dry-run` exercises file discovery, ordering, and arg parsing; the real apply path is pending `DATABASE_URL`.

## [2026-08-17] - Worker terminal failures now surface in the admin audit trail

### Changed
- `ScansService.markScanFailed` (the terminal-failure writer used by the worker's `failed` event and the inline fallback) now emits a **best-effort `scan.failed` audit row** into `audit_logs` — worker-side failures that previously vanished now appear in the Admin Audit Logs page with the existing `high` severity tone (no frontend change needed: the mock, severity map, and page filter already handle `scan.failed`).
- Attribution: worker/inline failures have no request actor, so the **scan owner's email** is resolved via `profiles` when available, else the established `'system'` actor convention (same marker the account feed uses). Entity `scan` / `scanId`, details `{ failure_reason }`.
- Fully best-effort: a missing `audit_logs` table (0008 not applied) or unresolved owner never breaks the terminal failed write — mirrors the `insertAdminAuditEvent` rule.

### Tests
- 4 new unit tests in `scans.service.spec.ts`: owner-attributed audit row, `system` fallback, audit-insert failure never breaks the failed write, and no audit on the no-downgrade path. Backend jest **433/433**, e2e **76 pass** (scans-flow stateful mock handles the new queries), `nest build` clean. Backend :4000 + worker restarted on the new dist.

## [2026-08-17] - Live scan walk staging: Redis re-provisioned, worker ready (ops)

### Changed
- Diagnosed the **expired Upstash Redis** (`ENOTFOUND enjoyed-panda-183888.upstash.io` — the throwaway instance's 3-day window lapsed) and **provisioned a fresh one** via the contract's no-signup endpoint (idempotency-key re-fetch, `adapted-shrew-121173.upstash.io`, expires 2026-08-19). `REDIS_URL` in `backend/.env.local` (gitignored) patched; verified `PONG`.
- Booted the backend (:4000, health 200) and the **BullMQ worker** (`Worker is ready for queue "scan-processing" with concurrency 4`).
- Re-probed migrations: **still 14 missing** (0005, 0007–0016, 0018–0020) — `DATABASE_URL` unset, so the SQL Editor is the only application path. The walk attempt blocks exactly as designed: `POST /v1/scans` → 503 naming migration 0019 (`scans.idempotency_key`); throwaway user cleaned up.

### Pending
- Paste `.freebuff/combined-0005-0020.sql` in the SQL Editor (project `dmhrwdcuwtgscwlaagsa`), then rerun `validate-migrations` + `validate-scan-roundtrip` + readiness — infra is fully staged and waiting.

## [2026-08-17] - Drafted the Provance-specific NestJS skill (docs)

### Changed
- New **`docs/skills/provance-nestjs/SKILL.md`** (204 lines) — the last gap from the skills audit. Encodes the repo's actual backend conventions (verified against `main.ts`, `app.module.ts`, the `common/` guards/filter/pipes, `notifications.controller.ts`, DTOs, and the spec/e2e suites):
  - global wiring (`/v1` prefix, ValidationPipe whitelist+forbidNonWhitelisted, Throttler as global `APP_GUARD`, helmet/CORS/x-request-id, Swagger at `/v1/docs`),
  - module layout + `SupabaseService` admin-client data access, controller conventions (`SupabaseAuthGuard`+`AdminGuard`, `@CurrentUser`, `ParseIntStrictPipe` ordering),
  - the `GlobalExceptionFilter` error envelope (string `message` + `details`, 402 `Retry-After`), the `{ data, page, pageSize, total }` pagination envelope,
  - camelCase `@ApiProperty`-decorated DTO conventions, service rules (best-effort secondary writes, guarded+idempotent transitions, honest nulls),
  - the three-layer test pattern (service spec, controller spec with real guards via supertest, `test/*.e2e-spec.ts`) and 8 hard rules.
- No runtime code changed; draft for founder review before it moves to `~/.agents/skills/`.

## [2026-08-17] - Drafted the Provance-specific BullMQ/Redis queue skill (docs)

### Changed
- New **`docs/skills/provance-bullmq-redis-queue/SKILL.md`** (205 lines) — a repo-specific Agent Skill encoding the scan queue conventions, built from `SCAN_UPLOAD_CONTRACT.md` + the actual `queue/` module, `worker.ts`, and `scans.service.ts`:
  - architecture map (file → responsibility), the enqueue job contract (`jobId: scanId`, `attempts: 3`, exponential backoff 1s, `removeOn*: 100`),
  - the **retry invariant**: `runScanProcessing` rethrows and leaves the row `processing` between attempts; terminal `failed` only via `markScanFailed` (worker `failed` event on final attempt, or the inline error handler),
  - the inline no-Redis fallback branch, `createRedisConnection` gotchas (`maxRetriesPerRequest: null` required, Upstash `rediss://` TLS), worker shutdown/observability,
  - verification paths (`validate:bullmq`, scans-flow e2e, unit spec) and 6 hard rules.
- No runtime code changed; the skill is a draft for founder review before it moves to `~/.agents/skills/`.

## [2026-08-17] - Installed the official supabase/agent-skills collection (ops)

### Changed
- Installed the official [supabase/agent-skills](https://github.com/supabase/agent-skills) collection globally into `~/.agents/skills/` via the skills CLI (`add supabase/agent-skills -g -y --copy -s '*' -a antigravity,codex,gemini-cli,kimi-code-cli`):
  - **`supabase`** (v0.1.2) — the comprehensive skill covering Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues, supabase-js/SSR, CLI/MCP, schema + migrations, RLS + security audits, and troubleshooting/logs.
  - **`supabase-postgres-best-practices`** — the official Supabase-maintained Postgres skill, upgrading the previously-installed copy to the tracked version.
- No repo code changed; both skills are live in `~/.agents/skills/` and picked up by the runtime (verified via `skills list -g` + folder/SKILL.md inspection).

## [2026-08-17] - Armed-revoke click-away + Escape reset (security page)

### Changed
- `src/pages/app/AppSecurityPage.jsx` — a half-armed revoke can no longer linger when attention moves elsewhere. While a session row is armed (`confirmingRevokeId` set), two document-level listeners are active: any `pointerdown` outside the armed row, or an `Escape` keypress, disarms it. The armed row carries `data-armed-revoke-row` so clicks *inside* it (the Confirm/Cancel buttons) resolve through their own handlers untouched.
- New `src/pages/app/appSecurityArmedReset.test.jsx` (5 tests): Escape disarms, pointer-down outside disarms, pointer-down inside keeps it armed, pointer-down on another row's Revoke disarms then re-arms that row, and the armed Confirm click still revokes (no regression).

### Tests
- vitest **545/545** (5 new), lint 0 errors, build clean; live headless walk **6/6 PASS** (arm → Escape → disarm, arm → click-away → disarm, confirm revoke still removes the row 4→3).

## [2026-08-17] - Live migration check + verified 0005–0020 paste block (ops)

### Changed
- Re-probed the live Supabase project (`dmhrwdcuwtgscwlaagsa`) via `backend/scripts/validate-migrations.mjs` (same probe list as readiness `checks.migrations`): **5/20 applied; 0005, 0007–0016, 0018–0020 still missing** — including the hard scan gates `0009` (`scans.processing_mode`) and `0019` (`scans.idempotency_key`).
- Regenerated **`.freebuff/combined-0005-0020.sql`** (906 lines) as the exact ordered paste block — the 15 missing migrations concatenated in dependency order, **byte-verified (normalized) against the source files** in `supabase/migrations/` (injected banners are comment-only).
- Baselined the pre-migration state: `GET /v1/health/readiness` → `degraded` (migrations/scansSchema/userSessions checks fail with the missing list); `validate-scan-roundtrip.mjs` blocked at `POST /v1/scans` with a 503 naming migration 0019 (throwaway user cleaned up).

### Pending
- Live scan walk (upload → queue → report) + readiness `ready` — blocked on the user pasting the block in the SQL Editor; rerun both validators once applied.

## [2026-08-17] - Import-parity guard extended to chartGeometry.js + the ui barrel

### Changed
- **Extracted the import-parity guard into a shared core** (`src/lib/importParity.js`): `parseImportMembers` + `createImportParityGuard({ moduleFile, specifierRe, skipPrefixes })` now power the walk/parse machinery once, and `src/lib/scanPresentationParity.js` was rewritten as a thin configuration over it — export surface unchanged, so the existing scanPresentation suite (11 tests) stays green as a behavior-preserving refactor.
- **`chartGeometryParity.test.js`** — pins the chart geometry module's 13-export public signature (declaration order) and walks every importer in `src/`, asserting each imported name still exists and no namespace/default import shape slipped in.
- **`uiBarrelParity.test.js`** — pins the ui-primitives barrel's 39-export public signature (`src/components/ui/index.js`) and asserts every importer (30+ workspace/admin pages, incl. `…/ui/index.js` specifier variants) resolves against the barrel surface.
- **`importParity.test.js`** — unit coverage for the shared core: member parsing (aliases/comments), single-/multi-line extraction, other-module ignores, unsupported-shape flags, and regex statelessness across repeated calls.

### Tests
- vitest **540/540** (15 new: 9 core + 3 chartGeometry parity + 3 barrel parity), lint 0 errors, `npm run build` clean.

## [2026-08-14] - LivePollIndicator shared across every worker-tracking surface

### Changed
- **`LivePollIndicator` extracted from the dashboard into the ui kit** (`src/components/ui/LivePollIndicator.jsx`, barrel-exported) and extended to the two remaining polling surfaces so every page tracking worker progress shows the same pulsing emerald "auto-refreshing" chip:
  - **Queue page** — the Queue posture card's `actions` now render it while either poll is active (`live = queueNeedsPolling(queue.data) || hasActiveScanWork(scans.data)`).
  - **Report detail pane** (`/app/reports/:scanId`) — the header now shows it while the detail poll is live (`detailLive = scanNeedsPolling(selectedScan)`), i.e. exactly while the pane is auto-refreshing to swap in the report on completion.
  - Dashboard (ledger + queue-posture cards) now imports the shared component — identical markup, no duplication.

### Verified
- Live browser walk (mock mode): **4/4 PASS** — Queue page shows the indicator (1), queued-scan detail shows it (1), completed-scan detail hides it (0), dashboard still shows both (2) after the extraction.
- vitest **525/525**, lint 0 errors, build clean; `audit:responsive` **155/155** across all workspace + admin routes at 375/640/768/1024/1280.

## [2026-08-14] - gridClassGuard extended: base display tokens for responsive display utilities

### Changed
- **`gridClassGuard` now enforces mobile-first intent for display utilities, not just grids.** New `findBaseDisplayViolation` rule: any responsive display-ON utility (`lg:flex`, `md:grid`, `xl:block`, `sm:inline-flex`, …) must be paired with an explicit base display token (`flex`, `block`, `grid`, `inline-flex`, `inline-block`, `hidden`, `contents`) in the same className — so `hidden lg:flex` (canonical nav), `block md:grid`, `flex xl:flex` pass, while a bare `lg:flex` or `md:grid` fails with the literal and file:line. Wired into `scanGridBaseViolations` (and therefore the vitest repo-wide test + the `npm run guard:grid` CI step).
- **Exactly two repo-wide violations existed** — the app shell (`AppShellLayout`) and admin shell (`AdminShell`) breakpoint-gated layouts, now `min-h-screen block lg:grid lg:grid-cols-[…]`: the explicit `block` states the mobile rendering (a div defaults to block, so zero visual change) and composes with the existing gated-grid exception.

### Verified
- Guard clean repo-wide; unit tests **20/20** (7 new for the base-display rule); full vitest **525/525**; lint 0 errors; build clean; `audit:responsive` **155/155** across all workspace + admin routes at 375/640/768/1024/1280 (one isolated `/app/admin/waitlist` skeleton mid-load flake on the first long walk — not reproducible, unrelated to the change).

## [2026-08-14] - Proved the grid-cols-1 sweep is visually inert (pixel-diff verification)

### Verified
- **Overflow probe on the current tree** (which carries the explicit `grid-cols-1` bases): landing + workspace (+ admin) inventory — **215/215 PASS** at 375/768/1280 (and 640/1024), zero overflow/clipped elements.
- **Pixel-diff of the sweep itself**: built the pre-sweep commit (53d9a8e) and post-sweep commit (bcd8ca8) in git worktrees, captured full-page screenshots of the 9 public pages the sweep touched (plus controls) and 8 workspace pages at 375/768/1280 (51 shots per commit), and pixel-matched every pair:
  - **Landing: byte-identical — 0.000% diff on all 27 public shots.** The explicit `grid-cols-1` bases changed nothing.
  - Workspace: only the data-driven pages (`/app/reports`, `/app/reports/:id`, `/sample-report`) showed 0.06–0.9% diffs, and a **same-code double-capture** (same server, same commit, two runs) reproduced the identical magnitude — proving those are mock relative-time/animation timing noise, not the sweep. Remaining sub-0.01% diffs (43–83 px on `/app`, uploads, organization, security, admin) are animation-frame variance.
- Screenshots + diff overlays saved in `.freebuff/sweep-diff/{pre,post,diff}/` for review (gitignored).

## [2026-08-14] - gridClassGuard sweep as an explicit CI step

### Changed
- **The mobile-first grid sweep is now a first-class CI gate.** New `scripts/grid-guard.mjs` (registered as `npm run guard:grid`) runs the repo-wide `scanGridBaseViolations` over `src/` as a standalone fail-closed command — every responsive `grid-cols-*` must declare a base `grid-cols-1` (or be a breakpoint-gated grid / reviewed allowlist entry), plus the stale-allowlist check (allowlisted literals must still exist in the tree). Previously this only ran implicitly inside the vitest suite; the CI frontend job now runs `npm run guard:grid` as its own step on every push/PR alongside lint, vitest, and build.

### Verified
- `npm run guard:grid` on the repo: clean (exit 0). Fail path proven: a fixture `grid gap-4 md:grid-cols-3` is flagged with file:line + literal, exit 1. Vitest guard tests 13/13, lint 0 errors, build clean.

## [2026-08-14] - 375px public-page probe re-run (verification only, no code change)

### Verified
- Re-ran the mobile overflow probes on the remaining public pages at 375px against the current branch: `/docs`, `/resources`, `/benchmark`, `/security`, `/waitlist`, `/signin`, `/reset-password`, `/reset-password/confirm`, `/accept-invite` (plus needle-matched `/app/docs`, `/app/security`, `/app/admin/waitlist`) — **60/60 PASS** at 375/640/768/1024/1280, zero overflow or clipped in-flow elements. The earlier `f8f944c` fixes (DocsPage long-URL headers, etc.) hold, and the new routes since then (404 page) introduced no regressions.

## [2026-08-14] - Armed two-step confirm on Organization member-remove + API Keys revoke

### Changed
- **Every destructive action now shares the two-step armed confirm with in-flight state** (the same pattern as Security session revoke):
  - **Organization page member-remove** — the row's Remove button was a single-click delete with no confirmation. It's now armed: first click turns it into a danger "Confirm remove?" with a Cancel button; second click executes; while `removeMember` is pending the button shows `loading` + "Removing…" and the row's controls disable.
  - **API Keys page revoke** — replaced the modal Drawer confirm with the same inline armed pattern ("Confirm revoke?" + Cancel, then "Revoking…" with loading). Per-key `revokeBusyId` replaces the single boolean, so only the in-flight row shows loading and double-submits are blocked.
- **Fixed a latent busy-state bug in `MemberRow`**: its `disabled={busy === member.id}` compared a boolean against an id (always false), so the team/role selects, Sessions button, and Remove button never actually disabled during an in-flight request. They now disable on `busy` (the boolean prop), matching the Security pattern. Role/team changes also clear any armed remove state.

### Verified
- Live browser walk (mock mode, dev server): org first click arms → Cancel reverts → second click removes with toast; API Keys identical for revoke — **6/6 PASS**.
- vitest **518/518**, lint 0 errors (34 baseline warnings), `vite build` clean.

## [2026-08-14] - Fix live-site 404s (SPA fallback), Vercel Analytics, custom 404 page, README overhaul

### Fixed
- **Deep-link / refresh 404s on the Vercel site — root cause fixed.** The SPA had no server-side fallback: Vercel served a platform 404 for any path other than `/` (opening a tab directly, or refreshing an in-app page). Added `vercel.json` with the canonical SPA rewrite (`/(.*) → /index.html`), so every unmatched path mounts the app and the router renders the page (or the custom 404). Verified locally: build → `vite preview` → `/app/activity`, `/nonexistent-route`, and `/` all return 200 `text/html` with the app shell.

### Added
- **Vercel Web Analytics** — installed `@vercel/analytics` and rendered `<Analytics />` in the app entry (no-op in dev, auto-injects in production builds).
- **Custom 404 page** (`src/pages/NotFoundPage.jsx`, routed at `*`) — a full landing-quality page in the Hero's visual language: parchment + forensic-grid backdrop with blurred orbs, a giant serif 404 with an italic trust-accented zero and an animated scanning line (auto-disabled by the global `reducedMotion="user"` config), a "Verdict · Not found" badge, the "This signal couldn't be resolved." headline, and 44px-tap-target CTAs (Back to home, View a sample report, Sign in, Docs, Security). Sets `document.title`. Replaces the previous basic placeholder.

### Changed
- **`README.md` rewritten** to reflect the current product: the 12-page admin console, workspace feature set, NestJS + Supabase + BullMQ stack, the `USE_MOCK` env-driven gate, quality gates (518 vitest, backend jest/e2e, `audit:responsive`), deployment notes (Vercel SPA fallback, Fly backend/worker, Supabase migrations), route inventory, env var pointers, and the docs index.

### Verified
- vitest **518/518**, lint 0 errors (34 baseline warnings), `vite build` clean.
- Browser-verified the 404 page at 375px and 1280px: correct title (`Page not found · Provance`), headline, verdict chip, all CTAs, **0px overflow**.

## [2026-08-14] - Landing touch/pointer audit: 44px tap targets + touch-safe tilt panel

### Changed
- **Tap targets brought to ≥44×44px on the landing** (measured at 375px against WCAG 2.5.5):
  - Navbar mobile hamburger `36×33 → 44×44` (`h-11 w-11` — the most important target on the page) and the logo link gained vertical padding (`36 → 44px` tall).
  - Hero's "See why teams choose Provance" anchor `20 → 44px` tall (`min-h-11 px-2`).
  - ProductShowcase "Run demo / Replay" button `32 → 44px` (`min-h-11`).
  - SampleReport `<summary>` accordion rows `28 → 44px` (`min-h-11`).
  - Footer nav + legal links `16–19px → 44px` tall (`inline-flex min-h-11 items-center px-2`) — short words like "Docs" also get `px-2` so the full target is 44×44.
- The one remaining sub-44 target is "See the full pricing model" — an inline link inside a sentence, explicitly exempt from target-size requirements (WCAG 2.5.8 inline exception).
- **`InteractivePanel` tilt is now touch-safe.** Previously `onMouseMove`/`onMouseLeave` tilt could fire a synthesized mouse-move on tap and never receive the matching mouse-leave, leaving the panel stuck tilted on phones. The tilt is now gated to `(hover: hover) and (pointer: fine)` at mount (no handlers attached on coarse pointers — panel renders flat), on top of the existing `prefers-reduced-motion: reduce` guard.

### Verified
- Tap-target probe at 375px: every interactive control ≥44×44; **0 hover-only interactions** on the landing (no `onMouseEnter` without `onClick`, no `group-hover` content reveals). `MotionConfig reducedMotion="user"` was already global in `App.jsx`.
- `audit:responsive` clean across the landing/shell routes at 375/640/768/1024/1280; vitest **518/518**, lint 0 errors (34 baseline warnings), `vite build` clean.

## [2026-08-14] - Responsive audit extended to 375px (small phone) — five surfaces hardened

### Changed
- **`audit:responsive` now walks five viewports** — `phone-375` (375×812) joins 640/768/1024/1280, so the permanent CI gate covers small phones, not just the phone/tablet/laptop/desktop pair. The walk is now 52 routes × 5 viewports = 260 audits.

### Fixed (the 375px run surfaced five real clip bugs — same bug class as the long-string sweep)
- **`/docs` API-example headers** — non-wrapping flex rows (traffic dots + method badge + long URL text) couldn't shrink at 375; the URL text got `break-words`.
- **Admin activity feeds (overview + roles + audit-logs via `ActivityRow`)** — the actor email rendered in a bare span (`kwame.boateng@independent-research.africa` ≈ 210px of unbroken text) blew the row past the viewport in narrow columns; now `break-words`.
- **Resource target chips (Activity page + audit-logs feed)** — `inline-flex` chips sized to their unbroken `resource_id` (`waitlist_application_0007` made a chip 256px wide) couldn't shrink; now `min-w-0 max-w-full` with the id `truncate`d (full id in the `title` tooltip).
- **Audit-logs filter selects** — native selects size to their longest option, so `flex-wrap` alone couldn't save the row; `max-w-full` caps them at the container on mobile (desktop layout unchanged).
- **Report detail header (`/app/reports/:id`)** — the `text-3xl` serif filename (`IMG_20260715_143022.jpg`) overflowed +52px; the header row now has `min-w-0` and the filename `break-words`.

### Verified
- Subset walk over every previously-failing route (docs, activity, all admin pages, report detail + print): **90/90 clean** at 375/640/768/1024/1280; vitest **518/518**, lint 0 errors (34 baseline warnings), `vite build` clean.

## [2026-08-11] - ProductShowcase wired into the landing (dead code decision: reuse, not archive)

### Changed
- **`HomePage` now renders `<ProductShowcase />` between Use Cases and Pricing** — the 767-line interactive evidence-workflow demo was unreferenced dead code; instead of archiving it (the forensic/ precedent), it's wired in because it's a finished, self-contained, mock-data-driven demo (real `mockReports` payloads, auto-playing scan cycle, per-signal evidence accordions) that fills the landing's "watch it work" gap before the pricing ask. The landing order is now Hero → WhyProvance → SampleReport → HowItWorks → UseCases → **ProductShowcase** → Pricing → CLEARAnswers.

### Verified
- The section renders on `/` (h2 "Watch a scan move from queue to report." present between Use Cases and Pricing) and the auto-play cycle is live — scrolling it into view advanced Queued → Analyzing with signal chips rendering (it was previously never browser-tested).
- `audit:responsive` **208/208 clean** at 640/768/1024/1280 with the new section in the page; vitest **518/518**, lint 0 errors, build clean.

## [2026-08-11] - Responsive audit extended to 640px + 1024px (208 audits) — one fix surfaced

### Changed
- **`audit:responsive` now walks four viewports** — 640×1136 (small phone), 768×1024 (tablet), 1024×768 (small laptop), 1280×800 (desktop) — so the permanent CI gate covers the whole responsive range, not just the 768/1280 pair. CI job renamed to `Responsive audit (640-1280 overflow gate)`, timeout bumped to 30 min for the doubled workload, and the script/CI messaging updated.

### Fixed
- **Admin Monitoring — Table stats card clipped at 1024px (the only failure across all 208 audits).** The card's 4-column header (`1fr_auto_auto_auto` with fixed `w-16`/`w-28` columns ≈ 278px) sits in a `lg:grid-cols-3` section, so at 1024px the card is only ~268px wide and the `Dead tuples` header overflowed its `overflow-hidden` wrapper — the exact table-clip pattern from the original `53d9a8e` sweep. Converted the wrapper to `overflow-x-auto`; the table stats now scroll inside the card at any width.

### Verified
- Full audit: **208/208 page audits clean** (52 routes × 4 viewports). The 640px phone width surfaced nothing — the mobile shell/menu/grids hold up.
- vitest **518/518**, lint 0 errors (34 baseline warnings), `vite build` clean.

## [2026-08-11] - Overflow-hidden sweep on public pages + print views: long-string wrap hardening

### Changed
- **Public report surfaces + print views hardened against the same clip bug class the table sweep fixed.** Unlike the workspace ledgers, these surfaces have no hand-rolled table wrappers — all `overflow-hidden` instances are legitimate (media frames with rounded corners, the ProductShowcase accordion height animation, decorative section clipping, progress-bar tracks), so no `overflow-hidden → overflow-x-auto` conversion applies. The genuine residual risk is **long unbroken strings** (real backend URLs/hashes/filenames/verification IDs) inside the `overflow-hidden` paper frames: a value cell that can't wrap blows the frame wider and gets silently clipped with no scroll.
- **Proven before fixing** (injected a realistic 160-char CDN URL into a report value cell at 768px): the `.report-paper` scrollWidth ballooned **718px → 1475px** inside its `overflow-hidden` frame — content clipped, no scroll, no wrap.
- **`break-words` added to every dynamic value cell** — `KeyValueGrid` values, `SignalCard` details, report-identity values (Report ID / Verification ID / Methodology), `MetricCard`-adjacent info cards, `ReportDataCard` values, signal `status_reason` rows (AI + manipulation + signal-by-signal), and key-findings descriptions.
- **`min-w-0 break-words` added to the timeline `1fr` grid children** (`grid-cols-[52px_1fr]` / `[58px_1fr]`) so long step text can't blow the `1fr` track either.
- Files: `SampleReportDocument.jsx`, `SampleReport.jsx` (public), `AppReportPrintPage.jsx` (workspace print — the real backend `result_payload` surface, highest risk).

### Verified
- Same long-string injection re-run: **`paperScroll` stays at 718px** — the value now wraps (cell grew to 136px) instead of clipping.
- `audit:responsive` **104/104 clean** at 768/1280; vitest **518/518**, lint 0 errors, build clean.

## [2026-08-11] - Responsive audit gate: audit:responsive + CI job (Playwright, 768/1280)

### Added
- **`scripts/audit-responsive.mjs`** (registered as `audit:responsive`) — the tablet/desktop pass is now a repeatable, CI-runnable gate. It boots `vite` in forced mock mode (`VITE_USE_MOCK=true`, noise injection disabled via `provance.mock.noisy.v1`), signs in as the seeded mock admin, and walks **52 routes × 2 viewports** (768×1024, 1280×800) in headless Chromium (Playwright). The in-page probe fails on **page-level horizontal overflow** (`scrollWidth > clientWidth`) and **clipped in-flow elements** whose right edge (or width) exceeds the viewport — fixed/absolute elements and elements inside horizontal-scroll containers are exempt, but `overflow:hidden` containers are *not* (that is the clipping bug class). Exits non-zero on any issue; `AUDIT_ROUTES=uploads,analytics` runs a quick subset, `AUDIT_PORT` overrides the port.
- **Playwright devDependency** — the project's first browser-automation dep (jsdom cannot do layout); CI installs the browser with `npx playwright install --with-deps chromium`.
- **CI job** — new `responsive` job in `ci.yml` (install → playwright chromium → `npm run audit:responsive`), parallel to frontend/backend.

### Fixed
- **Public Navbar 768px overflow (caught by the new gate on its first full run)** — the desktop nav (`hidden md:flex`) switched on at 768px but its six links + CTA need ~716px on top of the logo, overflowing to 882px. Moved the desktop nav to `lg:` and the mobile toggle/menu to `lg:hidden` (standard Tailwind breakpoint convention); the nav now shows from 1024px where it fits.

### Verified
- Full audit: **104/104 page audits clean** at 768/1280 (public + all 19 `/app/*` + 12 `/app/admin/*` routes).
- vitest **518/518**, lint 0 errors (34 baseline warnings), `vite build` clean.

## [2026-08-11] - Live walk tooling for the post-paste verification (migrations still pending)

### Added
- **`backend/scripts/validate-live-surfaces.mjs`** (registered as `validate:live-surfaces`) — walks the two surfaces that were 503/404 in real mode while migrations were pending: `GET /v1/notifications` (pagination envelope + `unread-count` badge + mock-parity row fields) and `GET /v1/admin/analytics` (field-by-field shape parity against `mockAnalytics`, hard/soft classification like `parity-monitoring.mjs`). Includes a migration pre-flight (non-head REST probes for `notifications`/`scans.processing_mode`) that exits with the actionable paste hint when 0011/0009 are absent, and the seed-admin sign-in pattern.
- **`.freebuff/apply-migrations.mjs`** (gitignored scratch tooling, with the byte-verified `combined-0005-0020.sql`) — applies the whole missing set directly over Postgres via `pg` when `DATABASE_URL` is filled into `backend/.env.local`, statement-by-statement with per-statement failure reporting, `--yes` guard, and a `splitStatements` parser verified against the block (dollar-quoted `do $$` body survives as one statement; 88 statements, no merge bugs).

### Verified (pre-paste baseline)
- `validate-scan-roundtrip.mjs` — fails at initiate with the **actionable 503** ("scans table is missing the idempotency_key column — migration 0019_scan_idempotency.sql not applied"); throwaway user cleaned up.
- `validate-live-surfaces.mjs` — `PASS backend reachable`, then BLOCKED on `0011 + 0009` with the paste hint (ground truth: 5 applied · 14 missing, unchanged).
- Lint back to the 34-warning baseline (0 errors); no new warnings from the walk script.

### Note
- **Migrations cannot be applied from the repo**: `DATABASE_URL` in `backend/.env.local` is empty and there is no Supabase CLI/Management token — the dashboard SQL Editor paste (`.freebuff/combined-0005-0020.sql`) remains the apply channel, or the founder can paste the Supabase connection string into `DATABASE_URL` and the new apply script runs the same block in one command.

## [2026-08-11] - USE_MOCK env flip: frontend real-mode by default

### Changed
- **`src/lib/api.js` — `USE_MOCK` is now env-driven instead of a hardcoded `true`.** The gate reads `VITE_USE_MOCK`: `true` → always mock (explicit opt-in; local demos or a demo deployment before the backend schema lands), `false` → always real (explicit opt-in), unset → mock in dev (`npm run dev`, vitest — local development works without the backend) and **real in production builds** (`npm run build` → Vercel), so every deploy validates against the live API, not the mocks.
- **`.env.example`** — documents the new `VITE_USE_MOCK` flag with all three semantics.
- **Docs updated to the new mechanism** — ADR 004 (decision + consequences now describe the env gate with real-by-default in prod), `CURRENT_IMPLEMENTATION_STATUS.md` (constraint line), `DEPLOYMENT_AND_AUTH_STRATEGY.md` (mock-mode localStorage exception note), `SCAN_UPLOAD_CONTRACT.md` (step 4 flip instruction + mock-to-real mapping row).

### Verified
- Vitest **518/518** (mock default preserved — vitest runs in dev mode), lint 0 errors, `vite build` clean.
- Production bundle inspection: `USE_MOCK` constant folded to `false` (`var q=!1` beside the baked `API_BASE_URL`), confirming the deployed build is real-mode by default while the dev/tooling flows stay mock.

## [2026-08-11] - Live cookie-contract CI gate (boots the real backend against real Supabase)

### Added
- **`.github/workflows/cookie-live.yml`** — a deploy regression gate for the httpOnly cookie migration, distinct from the in-memory e2e: it builds the backend, **boots the real `dist/main.js`** against the real Supabase project, waits for `/v1/health`, runs `validate-refresh-cookie.mjs`, and tears the backend down. The walk asserts the exact wire contract: sign-in `Set-Cookie` carries `HttpOnly` + `SameSite` + `Path=/` + `Max-Age`, the body **omits `refreshToken`**, cookie-only refresh rotates the token, and replays of rotated-out cookies 401. Runs on **push to main** (the auto-deploy branch) + `workflow_dispatch`.
- **Fail-closed secret handling** — if `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` aren't configured as GitHub secrets, the job fails with the exact Settings steps instead of skipping silently, so the gate can never go unarmed quietly.
- **`validate-refresh-cookie.mjs` now accepts job env** — the walk previously read credentials only from `backend/.env.local` (which doesn't exist on a runner); process env now wins for `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, with `.env.local` still filling in locally.

### Verified
- Walk re-run live after the env-merge change: still **17/17 PASS** (syntax check clean). Workflow YAML structure checked against `ci.yml`.

## [2026-08-11] - Live replay detection: 401 leg verified; row read still gated on 0008

### Verified
- Re-ran `validate-refresh-cookie.mjs` live (throwaway user, deleted): **17/17 PASS** — sign-in sets the httpOnly cookie, two cookie-only refreshes rotate the token, and replays of **both** rotated-out cookies return **401** after GoTrue's reuse-grace interval.
- Probed the admin surface as the allowlisted seed account: admin sign-in works (access token issued, body refreshToken stripped), but `GET /v1/admin/audit-logs` returns **503 "Failed to fetch audit logs."** — `audit_logs` (migration 0008) is still not applied to `dmhrwdcuwtgscwlaagsa` (5 applied · 14 missing, unchanged). `recordRejectedRefresh`'s write is best-effort and skipped against the missing table.
- The `refresh_token_rejected` row contract (severity `high`, `reuse_suspected: true`, `token_source: 'cookie'`) remains asserted in the mocked `auth.e2e-spec.ts` replay test; the live read needs the 0008 paste.

## [2026-08-11] - Refresh-replay lockout: repeated rejected refresh tokens 429 + one high-severity lockout row

### Added
- **Failure-triggered lockout on `POST /auth/refresh`** — new `RefreshLockoutInterceptor` (wired onto the refresh route) complements the controller's count-based `@Throttle` (raw volume) with a rejection-keyed defense: N consecutive 401s from one IP within a window trip a short lockout during which refresh is refused with **429 before the handler runs**. Configurable via `REFRESH_LOCKOUT_THRESHOLD` (default 3) / `REFRESH_LOCKOUT_WINDOW_MS` (30s) / `REFRESH_LOCKOUT_DURATION_MS` (60s); a successful refresh clears the key.
- **One high-severity `refresh_lockout` audit row per episode** — written to `audit_logs` (best-effort, `severity: high`, entity `auth_session`, details carry ip/threshold/failures/lockout window) exactly on the trip, never re-written while locked out, so the episode is marked without adding noise. Because blocked requests never reach the handler, `refresh_token_rejected` rows are capped at the threshold — the flood can't spam the rejection trail.
- **Pure `RefreshLockoutTracker`** (`refresh-lockout.ts`) — clock-injectable window/threshold/lockout semantics + a tracker-key helper mirroring `ApiThrottlerGuard` (x-forwarded-for → req.ip → socket), unit-tested independently.
- **Severity map parity** — `refresh_lockout: 'high'` added to the backend `audit-severity.ts` and the mock's `AUDIT_SEVERITY_BY_ACTION`.

### Tests (+10)
- `refresh-lockout.spec.ts` — 9 tracker tests: threshold trip, lockout duration + self-heal, no re-trip while locked out, window rollover reset, success clears, per-key independence, key resolution.
- `auth.e2e-spec.ts` — new HTTP-layer leg (threshold pinned to 2 for the suite): sign-in → refresh → two replays of the rotated-out cookie (401 ×2, second trips) → next replay **429** with the lockout message, the handler never called for the blocked request (`refreshSession` ×3), exactly two `refresh_token_rejected` rows and **one** `refresh_lockout` row.

### Verified
- Backend jest **429/429** (28 suites), `nest build` clean, e2e **76 passed / 2 opt-in skipped / 0 failures**, frontend vitest **518/518**, lint 0 errors (same pre-existing warnings).

## [2026-08-11] - Session revocations now land in the admin audit trail (session.revoked, high)

### Added
- **Self-service session revocations are now in the admin audit log** — `SecurityService.revokeLedgerRow` writes a **`session.revoked`** row (dotted form, `severity: high`, entity `auth_session`) to `audit_logs` whenever a user revokes their own device from the Security page, matching the `refresh_token_rejected` admin-trail pattern (best-effort — a missing `audit_logs` table must never fail the revocation). Org-admin revocations were already recorded (`member_session_revoked` / `member_sessions_revoked`), so the self-service write is gated on `row.user_id === actor.id` to avoid double-recording the same revocation. The Activity-feed events (`session_revoked` medium / `member_session_revoked` high) are unchanged — the security page's session ledger and Activity Log keep their existing visibility.
- **Severity map + mock parity** — `session.revoked: 'high'` added to both the backend `audit-severity.ts` and the mock's `AUDIT_SEVERITY_BY_ACTION`; `mockRevokeSession` (self-service, previously silent) now unshifts the `session.revoked` event into `mockAuditEvents` (which feeds both the Activity Log and the admin Audit Logs trail in mock mode), actor attributed.

### Tests (+2)
- `security.service.spec.ts` — the self-service revoke test asserts the `audit_logs` insert (`session.revoked`, `high`, `auth_session`, entity id); the changePassword flow's mock gained the extra `from` entry its revoke leg now consumes.
- `security.e2e-spec.ts` — the stateful client gained an `audit_logs` store, and the revoke test asserts the `session.revoked` admin-trail row end to end.
- `memberSessions.test.js` — new self-service revoke test (ledger row removed + `session.revoked` event prepended); the store snapshot now restores `mockSecuritySettings.activeSessions`.

### Verified
- Backend jest **420/420**, `nest build` clean, e2e **75 passed / 2 opt-in skipped / 0 failures**, frontend vitest **518/518**, lint 0 errors (same two pre-existing unused-import warnings).

## [2026-08-11] - Cookie flow verified live against the real backend (17/17 checks)

### Verified
- Ran `validate-refresh-cookie.mjs` twice against the live :4000 backend + real Supabase project (throwaway GoTrue user, deleted after). **17/17 checks passed** on the wire:
  - **Sign-in** → HTTP 200, refresh token travels via `Set-Cookie: provance_refresh=…; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax` (no `Secure` over http — correct for `AUTH_COOKIE_SECURE=false` local), body `refreshToken` **stripped**, access token in the body.
  - **Refresh with only the cookie** → HTTP 200 with a fresh access token each time and the cookie **rotated** (`…aaz…` → `…qwm…` → `…wb…`); each fresh access token validated through the guarded `GET /v1/security/sessions` route (guard passed — the handler 503s only because `user_sessions` is still missing).
  - **Rotation invalidation** → after GoTrue's ~20s reuse-grace interval, replaying the original sign-in cookie AND the first-rotation cookie both return **401** — the old credentials are dead on the server.
- Full report captured at `.freebuff/cookie-walk.json`.

### Notes
- The walk's reuse-detection audit read was skipped: `audit_logs` (migration 0008) is still not applied to the live project, so `refresh_token_rejected` rows can't be read live yet — the behavior itself is e2e-asserted in `auth.e2e-spec.ts`.

## [2026-08-11] - Cookie-migration coverage documented in AUTH_HARDENING_MIGRATION.md; controller spec marked as the gate

### What changed
- `AUTH_HARDENING_MIGRATION.md` now documents the full three-layer regression coverage for the httpOnly cookie migration and marks `auth.controller.spec.ts` as **the gate**:
  - **Controller layer (gate)** — the 11-test `auth.controller.spec.ts` locks the cookie contract in isolation (set/strip/rotate/clear, `'cookie'` vs `'body'` token-source forwarding, no cookie on failed auth) and is the fast net every `auth.controller.ts` / `cookie-session.util.ts` change must keep green.
  - **HTTP layer** — `auth.e2e-spec.ts` (7 tests) walks sign-in → Set-Cookie → refresh rotation → rotated-token replay 401 + theft audit → body promotion → sign-out through the real module graph.
  - **Util layer** — `cookie-session.util.spec.ts` (serialization/read/clear incl. `__Host-` selection).
- The doc's open-item **refresh-token reuse detection** is marked **shipped** (the `refresh_token_rejected` audit with `reuse_suspected` is asserted by the e2e); the remaining nicety is a transactional alert when `reuse_suspected` is true. Status line updated; related-files list updated.

## [2026-08-11] - Auth cookie lifecycle locked at the HTTP layer (auth.e2e-spec.ts, +7)

### Added
- **`backend/test/auth.e2e-spec.ts`** — the httpOnly refresh-cookie session lifecycle through the **real module graph** (real AuthService, real guards, real ValidationPipe + GlobalExceptionFilter) with a mocked Supabase service, following the security.e2e-spec.ts convention:
  - **sign-in** → 200 with `Set-Cookie: provance_refresh=…; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax` (no `Secure` locally), the body refresh token **stripped**, and a `sign_in_succeeded` audit row attributed to the actor; invalid creds → 401 with `sign_in_failed` + `reason: invalid_credentials`.
  - **refresh with the cookie** → 200, new access token, body still stripped, and the cookie **rotated** to the fresh refresh token.
  - **replay of the rotated-out cookie** → 401 with `refresh_token_rejected` in the admin trail (`severity: high`, `reuse_suspected: true`, `token_source: 'cookie'`) — the theft signature.
  - **body-token fallback** → refreshing with a body token when no cookie is present works and **promotes** it to the cookie; no credential at all → 401 "No session credential was provided."
  - **sign-out** → clears both cookie names (plain + `__Host-`, `Max-Age=0`) and burns the presented token (a subsequent refresh 401s).
- The mock Supabase service pairs a **rotation-aware public client** (each refresh consumes the presented token and issues the next; replaying a consumed token returns GoTrue's "Already Used" error) with the stateful admin client (profiles / user_sessions / auth_audit_events / audit_logs). Env is pinned before the AppModule import (SUPABASE trio + `AUTH_COOKIE_*`) so the suite is hermetic against `backend/.env.local`.

### Verified
- e2e **75 passed / 2 opt-in skipped / 0 failures** (+7), unit jest **420/420**, `nest build` clean.

## [2026-08-11] - :4000 backend restarted from a fresh build; readiness surfaces checks.migrations live

### What changed
- Killed the stale :4000 process (PID 9364 — its readiness endpoint returned empty, i.e. it predated the MigrationHealthService wiring), rebuilt, and relaunched from `dist/` with an explicit `PORT=4000` (PID 11580, log at `.freebuff/backend-4000.log`).
- `GET /v1/health/readiness` now surfaces `checks.migrations` live on startup: `status: degraded` with `migrations.ready: false` and the exact 14-migration missing list (0005, 0007–0009, 0010–0016, 0018–0020) plus the actionable `apply supabase/migrations/...` hint — identical to the `validate:migrations` canonical probe. The other gates read as expected: `supabase` ready, `scansSchema` false (0009), `userSessions` false (0010), `queue` true (REDIS_URL set → BullMQ).

### Verified
- Fresh build clean; readiness payload field-checked live on :4000.
- Note: the first readiness call takes ~15s — the migrations gate runs 20 sequential REST probes before responding.

## [2026-08-11] - One-paste schema convergence verified; runbook verification extended to 0020

### What changed
- **The single paste block is confirmed to converge the whole schema.** The canonical `validate:migrations` probe (all 20 migrations) shows the live project (`dmhrwdcuwtgscwlaagsa`) has **0001–0004 + 0006 applied** and **0005, 0007–0009, 0010–0020 missing** (0017 is a seed-only skip). The existing `.freebuff/combined-0005-0020.sql` (959 lines) contains **all 16 source files byte-identical** (CRLF-normalized, in numeric/dependency order, all idempotent) — one dashboard paste of it covers the full missing set, including 0009 (whose `scans.processing_mode` probe still 42703 — the earlier `.freebuff/probe_migrations.mjs` "table present" reading was a soft false-positive) and the seed 0017. Header annotated with the verified convergence claim.
- **Runbook one-shot verification extended 0010 → 0020.** `MIGRATION_RUNBOOK.md` §1 now checks every migration's objects (notifications, `profiles.team_id`, `scans.file_hash_sha256`, crash_reports, `organization_invites.token_hash`, role_scopes, the conditional 0017 seed rows, the twelve Better Auth tables, `scans.idempotency_key`, api_usage) with documented expected counts, so one paste → one verification query confirms full convergence before `npm run validate:migrations` / readiness.

### Verified
- Byte-parity of `combined-0005-0020.sql` vs all 16 sources re-confirmed after the header edit.
- Applied-set fingerprint in the runbook §3 (0001–0004, 0006) matches the live canonical probe exactly.

## [2026-08-11] - Org session revocations now persist in the audit trail and surface in the Activity Log

### Added
- **Org session revocation is now fully audited** — the org module's first audit writes, mirroring how job retry/fail persists to the admin trail:
  - `DELETE /v1/organization/members/:memberId/sessions/:sessionId` writes a **`member_session_revoked`** row to `audit_logs` (severity `high`, entity `auth_session`, details carry `member_id` + `session_id`).
  - `DELETE /v1/organization/members/:memberId/sessions` writes one **`member_sessions_revoked`** summary row per batch carrying the **revoked-session count** in `details.revoked` (entity `member`) — exactly the count that actually succeeded. Writes are best-effort (a missing `audit_logs` table must never fail the revocation) and severity derives from the shared `auditSeverity` map, same as `scan.retried`/`scan.failed`.
- **`member_session_revoked` events surface in the Activity Log** — `SecurityService.revokeLedgerRow` now takes an action parameter: the org-admin path (`revokeSessionForUser`) writes `member_session_revoked` to `auth_audit_events` while the self-service Security-page path keeps `session_revoked`, so the workspace Activity feed can tell the two apart.
- **Severity + category parity (mock ↔ real)** — `member_session_revoked`/`member_sessions_revoked` (`high`) and `session_revoked` (`medium`) added to both the backend `audit-severity.ts` map and the mock's `AUDIT_SEVERITY_BY_ACTION`; the two session actions added to the **account** tab action lists in `activity-categories.ts` and `activityCategories.js` (the parity test locks them together).
- **Mock parity** — `mockRevokeMemberSession`/`mockRevokeMemberSessions` now unshift `member_session_revoked`/`member_sessions_revoked` events (actor attributed via `currentMockActorEmail`, count in `details.revoked`) into `mockAuditEvents`, which feeds both the Activity Log and the admin Audit Logs trail in mock mode.
- **`SHORT_ACTION_TONES`** — `member session revoked` / `member sessions revoked` badge `danger` on the admin Audit Logs page (was falling through to `neutral`).

### Tests (+8)
- `organization.service.spec.ts` — both revoke tests now assert the exact `audit_logs` insert (`member_session_revoked` with entity `auth_session`, `member_sessions_revoked` with `details.revoked: 2`, severity `high`, actor attributed).
- `security.service.spec.ts` — the org-admin revocation assertion updated to `member_session_revoked` (self-service keeps `session_revoked`).
- `memberSessions.test.js` — both revoke tests assert the prepended audit event (action, severity, resource, `details` count); the store snapshot now restores `mockAuditEvents`.

### Verified
- Backend jest **420/420** (27 suites), `nest build` clean, e2e **68 passed / 2 opt-in skipped / 0 failures**, frontend vitest **517/517** (52 files), lint 0 errors (only the two pre-existing unused-import warnings).

## [2026-08-11] - Live org-admin two-device revoke walk prepared; apply of 0005 + 0010 remains the user's step

### Added
- **`backend/scripts/validate-org-session-revoke.mjs` + `npm run validate:org-revoke`** — the one-command live walk of the org member-sessions surface once migrations 0005 (organizations) + 0010 (user_sessions) land: pre-flight probes exactly those two gates, admin sign-in (allowlisted seed account), a throwaway member signed in twice with different User-Agents (two real devices → two ledger rows + tokens), a seeded org (admin = owner, member = member), then `GET /v1/organization/members/:id/sessions` (both rows, team + `isNewDevice`), `DELETE /v1/organization/members/:id/sessions/:sid` (ledger drops to one), and the two-device proof — the revoked token 401s on `/auth/me` while the survivor 200s. Cleanup deletes the member + seeded org (the admin's single membership is enforced — stale walk orgs and leftover member users are purged first so re-runs stay safe).
- **`MIGRATION_RUNBOOK.md` §5** — documents the org-revoke walk as the post-apply verification for 0005 + 0010.

### Blocked (operator action)
- Migrations 0005 + 0010 are still **not applied** to `dmhrwdcuwtgscwlaagsa` (5 applied · 14 missing — unchanged). Re-verified this turn: no supabase CLI/link, `DATABASE_URL` still empty in `backend/.env.local`, no access token — the SQL Editor remains the only apply path, or the connection string can be pasted into `DATABASE_URL` and the `pg` client applies them directly. The `.freebuff/combined-0005-0010.sql` block (420 lines, exactly 0005–0010, idempotent) is ready for either path; the walk then runs with `npm run validate:org-revoke`.

### Verified
- Walk pre-flight live: backend resolved at :4000, exits 2 with the exact missing list (0005 + 0010). Backend build clean.

### Added
- **`isNewDevice` on every session view** — a trust signal computed once in `SecurityService.listSessions` (so it flows to `GET /security/settings`, `GET /security/sessions`, and the org `GET /organization/members/:memberId/sessions` drawer alike): a session is badged when its device's FIRST appearance in the user's ledger is within the last 7 days (`NEW_DEVICE_WINDOW_DAYS`). Devices without a meaningful label (empty / the DB `'Unknown device'` default) never badge, and a device used for weeks then revisited stays known.
- **Frontend badge** — `New device` (warning tone, with a tooltip explaining the signal) next to the device name on `AppSecurityPage` and in the org member-sessions drawer (`AppOrganizationPage`), so workspace admins see the same trust context as the account owner.
- **Mock parity** — new pure helper `src/lib/sessionTrust.js` (`computeNewDeviceFlags` / `isMeaningfulDevice`, mirroring the backend logic) drives both `mockGetSecuritySettings` and `mockGetMemberSessions`. The mock computes against the fixture clock (`NOW_TS`, exported from mockData) rather than the wall clock, so the demo is deterministic: usr_001 shows both states on the Security page (Edge on Windows, first seen 9d ago → known; the other three → new).

### Tests (+9)
- `sessionTrust.test.js` (8): meaningful-device filtering, window boundary, repeated-device-first-appearance governance, createdAt/created_at parity, unparseable timestamps, non-array tolerance.
- `memberSessions.test.js` (+1): trust flags on the mock member-sessions surface + the Security page ledger (sess_004 known, sess_001 new).
- `security.service.spec.ts` (+1): backend window logic (2d → new, 40d → known, 'Unknown device' → never).

### Verified
- Backend jest **420/420**, `nest build` clean; frontend vitest **517/517** (52 files); lint 0 errors.

### Fixed
- **The live invite-accept spec no longer runs by accident.** The spec's old "skip when credentials absent" gate was dead in practice: `AppModule`'s `ConfigModule.forRoot({ envFilePath: ['.env.local', ...] })` loads this checkout's real project credentials into `process.env` the moment the spec imports `AppModule`, so the presence check always passed and the suite wrote org/invite/user rows to the real Supabase project on every local `npm run test:e2e` (its 2 failures were the missing-0005 seed error). The suite is now **opt-in via `PROVANCE_LIVE_E2E=1`** and always skipped otherwise — even when real credentials are in the process env. With the flag set but credentials absent, the spec fails loudly at load time instead of silently skipping. The misleading `import 'dotenv/config'` (which loaded nothing — there is no `backend/.env`) is removed and the gate's contract is documented in the spec header.
- **Live hooks get a real timeout.** The opt-in `beforeAll`/`afterAll` (live app boot + seed) now run with a 60s hook timeout instead of jest's 5s default, so the live path reports the actual blocker (e.g. `apply supabase/migrations/0005_organization.sql to this project`) rather than timing out mid-boot.

### Verified
- `npm run test:e2e` (no flag): **68 passed, 2 skipped, 0 failures** — full suite green locally. With `PROVANCE_LIVE_E2E=1`: the suite runs live, boots the app, and fails with the actionable migration-0005 hint (expected until the migrations land). Backend jest **419/419**, `nest build` clean.

### Added
- **`backend/scripts/validate-admin-jobs.mjs` + `npm run validate:admin-jobs`** — the one-command live walk of the real `/admin/jobs` surface once migrations 0008 (audit_logs) + 0009 (scans processing columns) land: pre-flight probes for exactly those two gates (same non-head REST pattern as `validate:migrations`), sign-in as the `ADMIN_EMAILS`-allowlisted seed account (`founder.admin@provance.local`, created via the GoTrue admin API when missing; overridable via `ADMIN_WALK_EMAIL`/`ADMIN_WALK_PASSWORD`), seeds one synthetic `failed` scan, then verifies the `GET /admin/jobs` envelope, `?status=failed` server-side filter, pagination (disjoint pages, exact total), `POST /admin/jobs/:id/retry` (row → `queued`, no BullMQ enqueue), and `GET /admin/audit-logs?actor=…&action=scan.retried` → the audit row with the admin actor + `severity: medium` (+ the `?search=<scanId>` path). The synthetic scan is deleted on cleanup; audit rows are intentionally left.
- **`MIGRATION_RUNBOOK.md` §4** — documents the admin-surface walk as the post-apply verification step.

### Fixed
- **Walk scripts silently hit the wrong server.** The dev shell injects a foreign `PORT` env var (this harness's own server on an ephemeral port), so `process.env.PORT || ENV.PORT || 4000` pointed the round-trip / refresh-cookie walks at a server that answered 200 but isn't Provance. `validate-scan-roundtrip.mjs`, `validate-refresh-cookie.mjs`, and the new `validate-admin-jobs.mjs` now resolve the base by probing candidates (shell override → `.env.local` → 4000) and accepting only `/v1/health` with `service=provance-backend`. Verified live: the walk now targets `:4000` and reports the exact migration blocker (`0008 + 0009 not applied`) instead of a phantom pass.

### Verified
- Live run: backend reachable at :4000, migration pre-flight blocks with the actionable missing list (exit 2). Backend jest **419/419**, `nest build` clean. The full walk legs are contract-verified against the service code (`retryJob` flips status + writes `scan.retried`/medium; `listAuditLogs` filters by `actor`/`action`) and await migrations 0008 + 0009 in the dashboard.

### Added
- **`backend/src/admin/admin.controller.spec.ts` (+16)** — the jobs routes (`GET /admin/jobs`, `POST /admin/jobs/:id/retry`, `POST /admin/jobs/:id/fail`) now have route-level coverage following the notifications-controller convention: a minimal app wired exactly like `main.ts` (v1 prefix, ValidationPipe, GlobalExceptionFilter, ThrottlerModule + ApiThrottlerGuard) with the **real `SupabaseAuthGuard` + real `AdminGuard`** (ConfigService mocked with the `ADMIN_EMAILS` allowlist) over a token-driven Supabase mock. Covers: route metadata (paths/verbs/`@HttpCode(OK)` on retry/fail, `GUARDS_METADATA` order), query parsing — `status` passthrough with no pipes, `page`/`pageSize` as strict → `DefaultValuePipe(1|500)` → `ParseIntPipe` (metadata + HTTP), `page=abc`/`page=2.5` → 400 without a service call — **`CurrentUser` → actor wiring** on retry (`(id, { id, email })`) and fail (`(id, reason, { id, email })`, empty body → `undefined` reason, unknown body property → 400 via `forbidNonWhitelisted`), guard behavior at the HTTP layer (401 no header / invalid token, **403 non-admin allowlist** on both GET and POST), and the 30/60s throttle (31st request 429s, service called exactly 30 times).
- **Jobs envelope parity:** `mockGetAdminJobs` now returns `totalPages` (derived from the exact post-filter total) matching the real backend's `listJobs` envelope; the mock params test locks it.

### Verified
- Backend jest **419/419** (27 suites, +16), `nest build` clean, e2e **68/70** (only the two pre-existing live-DB invite-accept failures), frontend mock suite 6/6.

### Added
- **`getAdminJobs(params)` now forwards `status`/`page`/`pageSize`** (api.js real path + `mockGetAdminJobs` mock path, mirroring `getAdminReports`), so `/app/admin/jobs?status=failed` filters and paginates on the backend — not just client-side. The mock matches the backend envelope exactly: `{ data, total, page, pageSize }` with the exact total after the status filter (display dialect: `failed`, not DB `fail`), page clamped to ≥ 1, pageSize clamped to ≤ 500, and a no-params fetch still returning the full set (pageSize 500) so downstream full-set derivation keeps working.
- **JobsPage server-driven table.** `?status=` is URL-backed via `useQueryParam` (validated against the tab dialect), the table refetches through `useResource([status, page])` on filter/page change, and pagination (pageCount, `Showing X of Y`) now derives from the API's exact filtered total. The worker-utilization panel, status counts, and header meta still derive from a separate full-set fetch — a `?status=failed` deep link can't shrink the panel to the failed subset. Tab clicks reset to page 1.
- **Tests (+13):** `mockAdminJobsParams.test.js` (6 — envelope, status filter + exact total, `all` ≡ absent, pagination disjointness, clamping, empty deep page), `jobsPageDeepLink.test.jsx` (2 — deep link resolves server-side with the Failed tab pressed + every row failed + panel still full-set; absent param falls back to the full ledger), `useQueryParam.test.js` (5 — absent-key contract).

### Fixed
- **Infinite navigation loop in `useQueryParam` (new hook, discovered by the new render test).** A validator that accepts `null` (as the first version of the Jobs status validator did) made an absent `?status=` read as raw `null`; the writer serialized it to `'status=null'`; the re-derive rejected `'null'`, adopted the default, deleted the key, and the absent key read `null` again — a never-ending ping-pong that pegged a CPU core and hung any page using it. Fixed twice: JobsPage's validator now rejects `null` (TeamFilter contract), and `readQueryParam` now returns `defaultValue` for an absent key unconditionally, with the writer treating `null`/`undefined` as delete — so the loop class can't recur for any caller. All existing `useQueryParam` consumers (team filter, date range) verified unaffected.

### Verified
- Frontend vitest **508/508** (51 files, +13), `npm run build` clean, oxlint 0 errors.

### Added
- **`backend/scripts/validate-migrations.mjs` — project banner + mismatch check.** The one-command gate now prints the Supabase project ref this env probes plus a direct SQL-editor link (`https://supabase.com/dashboard/project/<ref>/sql/new`), and on failure appends a `PROJECT/ENV MISMATCH CHECK` that tells the operator to compare the printed ref with the project id in the SQL Editor's URL bar — closing the gap where migrations pasted into the dashboard "didn't take" because they went to a different project than `backend/.env.local` points at. The applied set doubles as the fingerprint (this project: 0001–0004, 0006).
- **`docs/engineering/MIGRATION_RUNBOOK.md`** — §3 documents the mismatch-diagnosis flow (banner ref vs URL-bar ref; dashboard link opens exactly the probed project's editor), and Troubleshooting gains a row for "applied in dashboard but still missing" → project/env mismatch → compare refs / re-paste into the ref the command names.

### Verified
- Live run against the current project: banner prints `dmhrwdcuwtgscwlaagsa` + dashboard link, 5 applied · 14 missing · 1 skipped, mismatch check rendered. No behavior change to the probe list or exit codes.

## [2026-08-10] - Production worker hardening: BullMQ retries actually retry

### Fixed
- **`backend/src/scans/scans.service.ts` — the retry config was dead.** `runScanProcessing`'s catch swallowed every error and marked the row `failed` on the first failure, so BullMQ's `attempts: 3` + exponential backoff never fired (the job "completed" on attempt 1, and a retried attempt would have been skipped by the status guard anyway). The catch now logs and **rethrows** — the row stays in `processing` so a retry passes the guard — and the terminal `failed` state is written only when retries are exhausted.

### Added
- **`ScansService.markScanFailed(scanId, reason)`** — the terminal-state writer, invoked by the worker's `failed` event on the final attempt and by the inline path's error handler. Idempotent and race-safe: a scan already `complete` (e.g. a concurrent dedup hit) is never downgraded to `failed`.
- **`backend/src/worker.ts`** — the `failed` event now distinguishes retryable failures from the final one (`job.attemptsMade >= job.opts.attempts`): intermediate attempts log `attempt N of 3`, only the last lands `markScanFailed` (best-effort).
- **`backend/test/scans-flow.e2e-spec.ts` (+2, BullMQ block)** — first-failure rejects so BullMQ can retry (row stays `processing`, no reason/payload), a retried attempt with storage back up completes, then `markScanFailed` lands the terminal state; and a `markScanFailed` no-op guard test proving a late failure notification never downgrades a completed scan. The pre-existing inline-failure test now exercises the new `.catch` → `markScanFailed` path and still passes.

### Verified
- Backend jest **403/403** (26 suites), `nest build` clean, e2e **68/70** — the only 2 failures remain the pre-existing live-DB invite-accept pair (migration 0005 not applied), no regressions.

## [2026-08-10] - One-command migration verification: validate:migrations

### Added
- **`backend/scripts/validate-migrations.mjs`** (+ npm script `validate:migrations`) — the runbook's one-shot verification as a single command. Probes the live project against the **same `MIGRATION_PROBES` list the readiness `checks.migrations` gate uses** (now exported from `src/health/migration-health.service.ts` and imported via dist — one source of truth, no drift between the script and the health endpoint). Non-head REST selects with the service role key (respecting the runbook's `head:true`-masks-PGRST205 caveat).
- Prints every migration's status (`OK`/`MISSING`/`SKIP`), an applied/missing/errored/skipped summary, and on failure the exact `MISSING MIGRATIONS: 0005 (0005_organization.sql), …` list in the readiness-detail format, exiting 1. Verified live: reports **5 applied · 14 missing · 0 errored · 1 skipped** (0017 seed-only) with the full missing set, exit 1.

### Changed
- `backend/src/health/migration-health.service.ts` — `MIGRATION_PROBES` exported (behavior unchanged; backend jest still 403/403).
- `docs/engineering/MIGRATION_RUNBOOK.md` — §3 now leads with `npm run build && npm run validate:migrations` as the canonical pre-walk gate.

## [2026-08-10] - Migration apply prep: live verification + combined paste blocks

### Live verification (service-role REST probes, runbook §3)
- Confirmed the live project still has **0005, 0007, 0008, 0009, 0010 all unapplied**: all four org tables + `admin_incidents` + `audit_logs` + both session tables return `PGRST205`; `scans.processing_mode` returns `42703` (0009's exact column gap). `GET /v1/health/readiness` (backend :4100) reports `degraded` with `scansSchema.ready=false` and `userSessions.ready=false`.
- **Applying migrations cannot be done from this workspace**: no supabase CLI, no project link, no `SUPABASE_ACCESS_TOKEN`, and `DATABASE_URL` is empty — the dashboard SQL Editor is the only path (as the runbook documents).

### Deliverables
- **`.freebuff/combined-0005-0010.sql`** (420 lines) — the exact ask, one paste.
- **`.freebuff/combined-0005-0020.sql`** (959 lines, 16 migrations) — the full missing set. **Required for `status: ready`**: the `MigrationHealthService` `checks.migrations` gate lists 0011–0020 as missing too, so 0005–0010 alone still leaves readiness `degraded`.
- **`docs/engineering/MIGRATION_RUNBOOK.md`** — acceptance criteria updated: `ready` now requires `scansSchema` + `userSessions` AND the `checks.migrations` diff gate (full 0005–0020 set), with the combined-block pointer.

## [2026-08-10] - Dashboard notification feed gets the shared click contract

### Changed
- `src/pages/app/AppDashboardPage.jsx` — the separately-mounted notification feed (Workspace activity → Notifications tab) now uses the exact bell/Notifications-page click contract: clicking a row marks it read and navigates to the linked report route when the notification carries a `link` (mockNotifications deep-link to `/app/reports/:scanId`); link-less rows mark read and stay put. `NotificationPreviewRow` is now a focusable button; the feed keeps an optimistic in-session `readIds` set so the clicked row leaves the unread preview immediately (persistence fire-and-forget via `markNotificationRead`, same as the bell).

### Added
- **`src/pages/app/appDashboardNotifications.test.jsx`** (+2, jsdom): deterministic api mock (completed-only scans so polling idles, first 8 seed notifications, zeroed counters) in the nested-route harness (`/app` + `/app/reports/:scanId` marker). Test 1: clicking "Scan completed successfully" navigates to `REPORT_MARKER:scan_007` and calls `markNotificationRead('notif_001')`. Test 2: clicking the link-less "Verification report ready" stays on the dashboard, marks `notif_002` read, and the row drops out of the preview.

### Gates
- Frontend vitest **495/495** (+2), `npm run build` clean, oxlint 0 errors.

## [2026-08-10] - SecurityController HTTP-layer spec (real service + stateful Supabase mock)

### Tests
- **`backend/src/security/security.controller.spec.ts`** (+14, supertest): real `SecurityController` + real `SecurityService` over the stateful in-memory Supabase mock (per-chain query state — the `Promise.all`-safe convention from the e2e suite), real `SupabaseAuthGuard` (sid decoded from a well-formed fake bearer JWT, so `isCurrent` is driven by the token) + `ApiThrottlerGuard`.
- Covers: route order/metadata (settings GET → sessions GET → sessions/:id DELETE → settings PATCH → password PATCH); sessions list newest-first with `isCurrent` from the sid + empty-ledger; revoke happy path (GoTrue admin DELETE URL asserted, ledger row dropped, `session_revoked` audit); 400 current-session, 404 unknown id, 503 on GoTrue network failure; settings get with persisted controls + defaults fallback; settings patch persist + audit; guard 401s (no header, invalid token); 30/60s throttle with exactly 30 real-service calls.
- **Contract fact locked**: an unknown settings key is a silent no-op (value validation only — controls unchanged, still 200). Flagged as a follow-up decision.

### Gates
- Backend jest **403/403** (26 suites, +14), `nest build` clean.

## [2026-08-10] - Kill the page=abc silent-default quirk: ParseIntStrictPipe across the API

### Fix
- **New `ParseIntStrictPipe`** (`common/pipes/`) — rejects NaN/non-integer query values with 400 BEFORE `DefaultValuePipe` can swallow them, while passing `undefined`/`null` through so omitted params still get their default. Root cause of the quirk: the global ValidationPipe's `enableImplicitConversion` turns `?page=abc` into `NaN`, and `DefaultValuePipe` replaces NaN with the default before `ParseIntPipe` ever sees it.
- **Applied to all six controllers** using the `DefaultValuePipe + ParseIntPipe` pattern: account (activity), notifications (list), scans (list), reports (list), admin (jobs/reports/users/audit-logs) — every paginated surface now 400s on garbage instead of silently serving page=1.

### Tests
- **`parse-int-strict.pipe.spec.ts`** (+10): undefined/null pass-through, NaN rejects, non-numeric strings reject, 2.5 rejects (number + string), valid/negative/zero integers pass, param name in the message.
- **Notifications + account controller specs**: the `page=abc` tests flipped from "silently defaults to 1" to **400 + service never called**, and the pipe-metadata assertions now expect the strict pipe → DefaultValuePipe → ParseIntPipe ordering.
- `page=` (empty string) deliberately unchanged: `Number('')` → 0, which is an integer — the same 0 → service-clamped contract as before.

### Gates
- Backend jest **389/389** (25 suites, +11), `nest build` clean; e2e 66/68 (the same two pre-existing live-DB invite-accept failures).

## [2026-08-10] - AccountController HTTP-layer spec (mirrors notifications controller spec)

### Tests
- **`backend/src/account/account.controller.spec.ts`** (+17, supertest + real SupabaseAuthGuard + ApiThrottlerGuard): route order/metadata (profile GET → profile PATCH → activity, no shadowing); profile get/patch forwarding with the CurrentUser payload; DTO validation (invalid `defaultWorkspace` 400, MaxLength 120 400, forbidNonWhitelisted 400, non-coercible `emailNotifications` array 400); activity query parsing (DefaultValuePipe + ParseIntPipe metadata, category/page/pageSize forwarding, defaults, `page=2.5` → 400, `page=abc` → NaN→default 1 — the implicit-conversion contract); guard 401s (no header, invalid token); throttle 429 past 30/60s with exactly 30 service calls.
- Two contract facts the tests lock explicitly: `emailNotifications: 'yes'` coerces to `true` under `enableImplicitConversion` (stringy booleans pass — @IsBoolean only rejects non-coercible values like arrays), and unknown `category` values pass through raw for the service to normalize to 'all' (controller doesn't validate categories).

### Gates
- Backend jest **378/378** (24 suites, +17), `nest build` clean.

## [2026-08-10] - httpOnly refresh-cookie verification: rotation confirmed + GoTrue v2.195.0 replay-signature fix

### Live verification (backend :4200 fresh build, real Supabase)
- **New script `backend/scripts/validate-refresh-cookie.mjs`** (mirrors the session-lifecycle walk): throwaway user → sign-in → Set-Cookie attribute assertions (HttpOnly / SameSite=Lax / Path=/ / Max-Age=30d / body refreshToken stripped) → two refresh rotations (each cookie value changes, each new access token validates on a guarded route) → replays of the rotated cookies → 401. **17/17 checks pass.**
- **GoTrue reuse grace interval, probed live**: a replayed rotated token returns 200 within the grace window (GoTrue re-rotates — race tolerance), then 400 `refresh_token_already_used` / "Invalid Refresh Token: Already Used" past it (~20s observed on v2.195.0). The walk sleeps 25s before replaying so the replays land in the rejection window.
- **Theft response observed**: the flagged replay past the interval kills the WHOLE session — the never-replayed latest token stops refreshing afterwards.

### Code fix (drift the live walk exposed)
- `recordRejectedRefresh` only flagged `reuse_suspected` on the legacy GoTrue message "Refresh Token Not Found"; v2.195.0 emits "Invalid Refresh Token: Already Used" (error_code `refresh_token_already_used`), so real theft replays were never flagged. Now matches both signatures (`/already used/i` added); new `auth.service.spec.ts` case locks it (6 tests green).
- Walk's audit read initially targeted `auth_audit_events`; `recordRejectedRefresh` writes `audit_logs` — corrected, with resilient fallbacks (severity column / missing table notes).

### Gates
- Backend jest **361/361** (23 suites, +1), `nest build` clean.

## [2026-08-10] - Scan round-trip live validation script (validate-scan-roundtrip.mjs)

### New script
- **`backend/scripts/validate-scan-roundtrip.mjs`** — live e2e walk mirroring `validate-session-lifecycle.mjs`: throwaway GoTrue user → sign-in → `POST /v1/scans` (signed-upload contract) → idempotency-key replay check → signed-URL upload via the same `supabase.storage.uploadToSignedUrl` call AppUploadsPage makes → submit (202, queued) → poll `GET /v1/scans/:id` on the frontend's 5s cadence until `completed`/`failed` (observed transition chain recorded) → `GET /v1/reports/:id` signal payload → `GET /v1/reports/:id/pdf` artifact → queue-snapshot counters. Always cleans up the throwaway user + uploaded storage object.

### Live run against the real project (backend :4100)
- Script verified working: user create / sign-in / token / cleanup legs **PASS**; initiate correctly fails with an actionable 503 — the live scans table is missing the `idempotency_key` column (**migration 0019_scan_idempotency.sql not applied**). The exact blocker surfaced, same pattern as the session walk.

### Notes
- `PORT` now honors the shell override (`process.env.PORT`) before the env file, matching how the backend is booted (the reference session script reads the env file only).

## [2026-08-10] - Session lifecycle validation: access-token kill confirmed + `session_id` claim bug fix

### Live validation (backend :4100, real Supabase)
- **Direct Supabase REST probe proved migration 0010 is NOT applied** — `GET /rest/v1/user_sessions?limit=1` returns `PGRST205` (relation does not exist) while the `profiles` probe works, ruling out a stale PostgREST cache. The app-level ledger surface (`GET /v1/security/sessions`) cannot run live yet.
- **Empirical answer: revoking a session kills the access token.** Since admin session deletion is unavailable on this project (see below), revoked a real session via GoTrue `logout?scope=local` (server-side session delete — same lifecycle the admin revoke drives): after revocation the session's refresh token returns `400 refresh_token_not_found` **and** its still-unexpired access token is rejected with `401` on a guarded backend route. Control session B unaffected (refresh 200, access 200).
- **GoTrue admin session-deletion gap**: the backend's `revokeAuthSession` URL (`DELETE /auth/v1/admin/sessions/{id}`) 404s on this project's GoTrue (v2.195.0), and `/admin/v1/sessions` 403s with the service key — the DELETE leg of the ledger needs a GoTrue-version-aware endpoint.

### Bug fix
- **`decodeJwtPayloadSid` read `payload.sid`, but real GoTrue access tokens carry `session_id`** — the ledger would never record a session and `isCurrent` would never match, so the whole session surface was dead even after 0010 lands. Fixed to read `session_id` first with `sid` fallback (keeps the e2e fakes green); new `jwt-sid.util.spec.ts` (6 tests) locks the claim parsing.

### Gates
- Backend jest **360/360** (23 suites, +6), `nest build` clean.

## [2026-08-10] - Follow-up log audit: statuses reconciled against git history

### Docs (project state)
- **Audit of `followup-recommendations.md`** — every row cross-checked against the last 10+ tasks' git history. Three rows were complete-but-unmarked or imprecise; all moved `Open → In Progress` with precise remaining-gap text:
  - **Backend /admin sweep** — jobs/reports/settings are built; the real gap is `/admin/roles` (no controller route; `getAdminRoles` → `/admin/roles` 404s in real mode).
  - **Refresh-token reuse detection** — the `session_revoked` audit recording shipped (security.service.ts + e2e assertion); the missing half is severity-map parity (`session_revoked: 'high'` in backend `audit-severity.ts` + frontend `AUDIT_SEVERITY_BY_ACTION`).
  - **MigrationHealthService** — the stale-`:4000` restart part is done (deploy check `4a8de1c` + live walks); only the CI readiness smoke step remains.
- Verified genuinely-open rows stayed Open (Uploads quota chip, ProductShowcase fate, live-indicator extension, API-call counting, CI gates, migration applies, decision gates). Final tally: **50 Open · 4 In Progress · 1 Done · 2 Deferred**.

## [2026-08-10] - Session-ledger round-trip e2e (sign in → list → revoke)

### Backend (tests)
- **`security.e2e-spec.ts` +1 test (17 total)** — a full session-ledger round-trip at the HTTP layer: `POST /v1/auth/sign-in` records a `user_sessions` row (auth session id from the decoded JWT `sid` claim, SHA-256 `refresh_token_hash`, device derived from the User-Agent), `GET /v1/security/sessions` lists it as **isCurrent** alongside a seeded old session, and `DELETE /v1/security/sessions/s-old` revokes only the old one — the fresh session stays signed in and current. Also asserts the cookie-mode contract (body has no `refreshToken`).
- **Mock additions to the stateful Supabase client**: `profiles` table (the sign-in path runs `ensureProfile` → insert + `.select().single()`), `.limit()` no-op, and `.single()` terminal (materializes pending ops via a shared `runQuery` used by both the thenable and `single`). New `makeAccessToken(sid)` helper builds a fake JWT whose base64url payload carries the `sid` claim `decodeJwtPayloadSid` reads (no signature verification in the util).

### Verified
- Security e2e **17/17**; backend unit **354/354**; full e2e **66/68** (the 2 failures are the standing live-DB `invite-accept` suite — live project missing migration 0005, unrelated); `nest build` clean.

## [2026-08-10] - Security e2e: settings + password change-password flow at the HTTP layer

### Backend (tests)
- **`security.e2e-spec.ts` extended (+8 tests → 16 total)** — the suite now covers the settings + password surface at the HTTP layer:
  - `GET /v1/security/settings` — password policy + session ledger + persisted controls shape, and the defaults fallback when no `user_security_settings` row exists.
  - `PATCH /v1/security/settings` — flag toggle persistence with `security_setting_updated` audit and GET readback; the `twoFactorAuth` `{ enabled }` object shape mapping back to `enabled + method: 'app'`; 400 on a non-positive `sessionTimeoutMinutes`.
  - `PATCH /v1/security/password` — the full **revoke-everything-else** flow: current-password verification via the public client, verification-session burn (`admin.auth.admin.signOut`), `admin.updateUserById` password update, GoTrue admin DELETE revocations of **every other** session (current untouched), ledger cleanup, and `password_changed` audit. Plus the wrong-password 400 (revokes nothing, no audit) and the DTO `MinLength(8)` 400.
- **Mock hardening**: the stateful Supabase client now gives each top-level `.from()` a **fresh chain with its own state** (real supabase-js semantics) — `getSettings` runs `listSessions` + `loadSecurityControls` under `Promise.all`, and a single shared state object let the second query clobber the first (the settings row leaking into the sessions list). Also added `upsert` (updateSetting), the `user_security_settings` table map, `auth.admin.signOut`/`updateUserById` mocks, and a configurable `createPublicClient` for the password flow.

### Verified
- Security e2e **16/16**; backend unit **354/354**; `nest build` clean. Full e2e: 65/67 — the 2 failures are the pre-existing live-DB `invite-accept` suite (live Supabase project missing migration 0005), unrelated to this change.

## [2026-08-10] - Security page: two-step session revoke + in-flight state

### Frontend (AppSecurityPage)
- **Two-step confirm**: clicking Revoke now arms an inline confirm — the row's button switches to a danger **"Confirm revoke?"** with a **Cancel** affordance; only the second click calls the API. The bulk "Revoke all other sessions" ⌘K command keeps its one-shot behavior (skips the per-row confirm).
- **Per-session in-flight state**: while the DELETE is in flight, the revoking session's button shows a spinner + **"Revoking…"** (`aria-busy`, disabled via the ui Button `loading` prop) — other rows stay interactive for parallel revokes.
- **DELETE contract parity (400-on-current-session)**: the current session's button stays disabled, and `handleRevokeClick` guards defensively — a stale `isCurrent` flag surfaces the exact contract message ("You cannot revoke the current session.") instead of a generic error. Backend/mock 400 messages already flow through verbatim on the error path.
- Confirm state resets on cancel, on revoke start, and on settings refetch.

### Verified
- Live in the preview (mock mode): armed confirm renders Cancel + danger button; confirmed revoke removed the row with a success toast; the in-flight state was captured deterministically (`Revoking…`, `aria-busy="true"`, spinner) via a microtask-flush read inside the 200–600ms mock delay window. Current-session row renders disabled.
- Frontend vitest **493/493**, `npm run build` clean, oxlint 0 errors.

## [2026-08-10] - Real scan upload + queue round-trip: verified complete

### Backend (audit result)
- The full real-mode slice is **implemented and green** — verified across the existing modules rather than re-implemented: `POST /scans` creates the scans row (idempotency-key dedupe, per-plan quota gate, team resolution, signed-upload URL contract `{scanId,status,bucket,path,token,signedUrl}`), `POST /scans/:scanId/submit` transitions to `queued` after an upload-exists pre-flight check, and the worker drives `queued → processing → complete|failed` (inline fallback when `REDIS_URL` is absent; BullMQ `process-scan` jobs via `QueueService.enqueueScanProcessing` consumed by `backend/src/worker.ts` standalone process). `GET /scans`, `GET /scans/:scanId`, and `GET /scans/queue-snapshot` serve the frontend dialect (`complete` → `completed`, verdict classes → display values).
- **Reports leg**: `GET /reports/:id` returns the signal-by-signal payload and `GET /reports/:id/pdf` serves a server-generated PDF artifact.
- **Frontend real branches** (all `USE_MOCK`-gated): `initiateScan`/`submitScan`/`listScans`/`getScan`/`getQueueSnapshot` hit the backend; `AppUploadsPage` performs the signed-URL upload via the anon `supabase` client (`uploadToSignedUrl`). Dashboard/report polling lands real statuses via the existing 5s `useResource` loop; polling predicates (`hasActiveScanWork`/`scanNeedsPolling`/`queueNeedsPolling`) are consistent with the emitted display dialect.

### Verified
- Backend jest **354/354** (22 suites) incl. `scans-flow.e2e-spec.ts` (full initiate → signed URL → submit → inline processing → report payload; download-failure → `failed` + `failure_reason`; BullMQ enqueue variant; worker entry point) and `scans-api.e2e-spec.ts` (DTO validation, signed-contract shape, submit pre-flight, enqueue-vs-inline). `nest build` clean. Frontend vitest **493/493**, build clean.
- **Live blocker (unchanged)**: the live Supabase project is still missing the scan-pipeline migrations (0009 columns + 0019 idempotency_key) — `POST /scans` returns 503 with an actionable hint. Applying `.freebuff/combined-0005-0009.sql` (+0010/0011) in the SQL Editor unlocks the live walk.

## [2026-08-10] - scanPresentation import-parity guard

### Tests (regression protection)
- **`scanPresentationParity.js` + test** (new) — a static import-parity guard mirroring the `gridClassGuard` pattern. Walks every file in `src/` that imports from `scanPresentation.js` (50+ importers incl. test files), parses the imported names (single-line, multi-line, aliased, multiple statements), and asserts every name still exists in the module's **runtime export surface** — so a formatter consolidation that renames/removes an export but misses an importer fails the unit suite the moment it lands instead of drifting silently.
- The module's public signature is pinned as a 30-name snapshot (`SURFACE`), so adding/removing/renaming an export is a deliberate, documented API change (the test error tells you to extend the snapshot). Namespace (`import * as`) and default imports are flagged as unsupported shapes. Verified non-vacuous: a scratch importer referencing a bogus `noSuchFormatter` is flagged by the scan.
- Frontend vitest **493/493** (+11), `npm run build` clean, oxlint 0 errors.

## [2026-08-10] - useResource polling: explicit tab-hidden pause contract

### Frontend (poll hardening)
- **`useResource` visibility gate** (`useResource.js`) — the polling loop now enforces its documented "pauses while the tab is hidden" contract explicitly: `tick` bails when `document.visibilityState === 'hidden'`, and a `visibilitychange` listener fires an immediate catch-up tick on return. Previously the pause relied on browser timer throttling, which is not guaranteed in every environment (backgrounded iframes, headless, non-throttled contexts). The gate is checked per tick; the catch-up respects `pollWhen`, so a hidden tab can't waste background requests and surfaces resume tracking the moment it's visible again.
- Live walk re-attempt: POST /scans is still **503** against the live project — the scan-pipeline migrations (0009 columns + 0019 idempotency_key) are not applied, so the real upload → dashboard poll walk remains blocked on the same pending migration set (see the deploy-check follow-up row).

### Tests
- `useResource.test.jsx` (new, 4 tests, jsdom + fake timers) — interval cadence with silent in-place swaps, the hidden-tab pause (zero requests across 5 interval windows), the `visibilitychange` catch-up + resumed cadence, last-known-good survival on a rejected poll, and the `pollWhen` gate idling. Uses deterministic `act` flushes instead of RTL `waitFor` (which can't see vitest fake timers). Frontend vitest **482/482** (+4), `npm run build` clean, oxlint 0 errors.

## [2026-08-10] - Report detail live-completion via mock worker lifecycle

### Frontend (mock parity)
- **`mockSubmitScan` simulated worker** (`mockApi.js`) — a submitted scan now advances `queued → processing → completed` over ~4s via module-level timers (mirroring the real BullMQ worker), instead of sitting in a static queued state forever. The record is mutated in place, so every surface reading the store (report detail, queue, dashboard, ledger) sees the same transitions through its existing 5s `useResource` polling.
- **`buildMockCompletedScanPayload`** (new) — produces the report-payload contract the detail pane consumes: verdict object (`class`/`display_label`/`confidence_score`/`confidence_level`/signal counts/`plain_language_summary`), `report.report_id`, and 4 signal entries (`signal_id`/`signal_display_name`/`signal_category`/`methodology_version`/`status`/`status_reason`) — matching the backend `buildAnalysisResultPayload` shape. The dedup path still completes instantly and is untouched.
- Result: the report detail page (which already polled `GET /scans/:id` via `useResource` with `scanNeedsPolling`) now visibly flips from its pending state to the completed report the moment the simulated worker finishes — verified live: upload → queue shows `JUST ADDED → COMPLETE` with a verdict, and the detail pane renders the full payload (report id, verdict, signals, confidence, no `Pending`).

### Tests
- `mockScanLifecycle.test.js` (new, 2 tests, fake timers) — full queued → processing → completed transition with payload contract assertions (verdict class parity, 4 signals, `PRV-` report id, `payload_version`), the still-pending gate before the worker steps elapse, and `mockGetScan` reflecting the mutation. Frontend vitest **478/478**, `npm run build` clean.

## [2026-08-10] - Dashboard live-refresh indicator

### Frontend
- **`LivePollIndicator`** (`AppDashboardPage.jsx`) — pulsing emerald dot (Tailwind `animate-ping`) + mono `auto-refreshing` label rendered in the Card header `actions` slot of both the **Queue posture** card and the **Verification ledger** card. Shown only while the 5s poll loop is actually active — gated on `hasActiveScanWork(scans.data)` (any scan queued or processing), the exact predicate the scans/queue resources poll on, so the indicator tracks worker progress truthfully and vanishes the moment the queue drains. `role="status"` with an `aria-label` for screen readers; verified live: visible with 5 queued + 5 processing, absent under `?state=empty`.

### Tests
- Frontend vitest **476/476**, `npm run build` clean.

## [2026-08-10] - Mobile-first grid guard: every responsive grid needs a base grid-cols-1

### Guard
- **`src/lib/gridClassGuard.js`** (new) — static scanner that walks `src/` for `className` literals (static strings + non-interpolated JSX template literals) and enforces the mobile-first convention: any className with a breakpoint grid-cols token (`sm:`/`md:`/`lg:`/`xl:`/`2xl:grid-cols-*`) must also declare a base `grid-cols-1`. Exceptions are explicit and reviewed: breakpoint-gated grids (`lg:grid lg:grid-cols-[…]`, the shells — not a grid on mobile) and an `INTENTIONAL_MOBILE_GRIDS` allowlist (deliberate 2-up mobile chips/metric tiles, archived forensic media audit).
- **`src/lib/gridClassGuard.test.js`** (new, 13 tests) — parser unit tests (static vs template vs interpolated literals), rule tests (compliant bases, gated grids, allowlist, and the three violation shapes), the **repo-wide guard** (zero violations in src), and an allowlist-staleness check so a removed allowlisted literal fails loudly instead of rotting.

### Fixed (36 violations, all the implicit-base regression class)
- Inserted the explicit `grid-cols-1` base into every responsive grid that relied on the implicit single-column default — zero visual change (identical rendering), but the convention is now explicit and enforced: PageHero, SampleReport, SampleReportDocument, ProductShowcase, AboutPage, ContactPage, ResourcesPage, WaitlistPage, BenchmarkPage, SampleReportPage, admin Overview/Roles, app Organization/ReportPrint/Reports/Security/Uploads, and the archived forensic PDFReportMediaAudit.

### Tests
- Frontend vitest **476/476** (+13), `npm run build` clean, eslint clean on the new files.

## [2026-08-10] - Responsive pass: tablet (768px) + desktop (1280px) audit

### Verified
- Headless real-viewport audit (playwright-core + Edge) walked all 16 workspace routes + 13 admin routes at **768px** and **1280px**, measuring page overflow, elements wider than the viewport, sidebar behavior, and chart grid stacking. Screenshots captured to `.freebuff/shots/<width>/` (gitignored).
- **Sidebar:** correct at both widths — stacked top-nav with hamburger toggle below `lg` (768: aside full-width, grid `block`), 300px (workspace) / 280px (admin) fixed column at 1280 with `main` at ~980–1000px.
- **Charts:** no overflow anywhere; panels stack to single column at 768 and expand to 2/3/5 columns at 1280, SVGs scaling via viewBox inside their cards (dashboard trend + verdict mix, admin analytics KPI/verdict/queue/media, monitoring hourly/storage, overview volume).

### Fixed
- Hand-rolled tables wrapped in `overflow-hidden` clipped their content with no way to scroll at narrow widths. Converted the five table wrappers to `overflow-x-auto` (the DataTable pattern) so wide tables scroll inside their cards instead of clipping:
  - `admin/JobsPage.jsx` — 8-col ledger (~1018px wide) was clipped at **768 and 1280**; now scrolls (366px / 150px of scrollable width)
  - `admin/ReportsPage.jsx` — 7-col ledger (907px) clipped at 768; now scrolls (255px)
  - `app/AppApiKeysPage.jsx`, `app/AppBillingPage.jsx`, `app/AppWebhooksPage.jsx` — same latent pattern hardened (api-keys was 27px over at 768)
- Re-audit after the fix: **zero flags at both widths**.

### Tests
- Frontend vitest **463/463**, `npm run build` clean, eslint clean on the changed files.

## [2026-08-10] - Deploy check: httpOnly-cookie session flow verified end-to-end

### Verified live (fresh backend build on :4100 + real Supabase project, seed account `founder.admin@provance.local`)
- **Wire level (curl + cookie jar):** `POST /v1/auth/sign-in` → `Set-Cookie: provance_refresh=…; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`, and the response body carries **no refresh token** (session keys: `accessToken, expiresAt, tokenType` only). `POST /v1/auth/refresh` with **only the cookie** (empty body) returns `authenticated` with a fresh access token and **rotates** the cookie on the wire (`wl4vg4cyvklf` → `kcz2mth6ifwt`). Guarded `GET /v1/account/profile` with the bearer → 200 (`Founder Admin`); with **only the cookie** → 401 (the cookie is the refresh credential, never an access token).
- **Browser level (USE_MOCK=false, vite on :5173 against the real :4000 backend):** fresh sign-in with real credentials → dashboard; `localStorage` **completely empty** (`provance.auth.session.v1` never written — access token lives in module memory only); `document.cookie` empty (httpOnly invisible to JS). Signed out → sign-in page + cookie cleared. Reload-equivalent (fresh page load with the cookie persisted in the browser store) → still signed in as Founder Admin via the silent cookie refresh; authenticated data calls (`/reports`, `/account/activity`, `/billing`, `/scans/queue-snapshot`, `/notifications/unread-count`) all 200.
- **Known non-auth gaps observed in real mode (unchanged blockers):** `/v1/scans` and `/v1/admin/analytics` 503 (migration 0009 not applied), `/v1/notifications` 503 (0011), `/v1/admin/system-health` 404 (route is `/v1/admin/monitoring`). The dashboard degrades gracefully into per-panel error states with Retry — no blank page, no crash.
- The temporary `USE_MOCK=false` flip was reverted; working tree clean; only the user's :4000 server left running (temp :4100 + vite instances killed).

## [2026-08-10] - Refresh-token reuse detection in the audit trail

### Backend
- **`recordRejectedRefresh`** (`auth.service.ts`) — when Supabase rejects a presented refresh token (the exact signature of a replayed rotated token / token theft), the service now writes a **high-severity** `refresh_token_rejected` event to `audit_logs` before throwing `401` — surfacing theft attempts on the Admin Audit Logs page. Only the **SHA-256 hash** of the presented token is stored (never the raw value); `reuse_suspected` is set when the GoTrue `Refresh Token Not Found` replay signature is present; `token_source` (`cookie` | `body`), device/IP/location meta, and the truncated error + status are recorded. The write is **best-effort** — a missing `audit_logs` table (migration 0008 not applied) can never block the rejection.
- `auth.controller.ts` — passes the credential source (`cookie` when the cookie token won, else `body`) through to the service so replays are attributable.
- `audit-severity.ts` — `refresh_token_rejected` mapped to `high`.

### Frontend
- `mockData.js` — `AUDIT_SEVERITY_BY_ACTION` gains the matching `refresh_token_rejected: 'high'` entry so mock and real modes badge the event identically.

### Tests
- `auth.service.spec.ts` +2 — replay signature recorded (action, `high` severity, hash-only token, `reuse_suspected: true`, `token_source: 'cookie'`, meta passthrough, rejection still thrown) and best-effort audit-failure path (rejection surfaces even when the audit insert errors).
- `auth.controller.spec.ts` — refresh assertions updated for the third `tokenSource` argument. Backend jest **354/354**, `nest build` clean, frontend vitest **463/463**.

## [2026-08-10] - Auth controller cookie-flow coverage

### Tests
- `auth.controller.spec.ts` +6 (now 11) — locks the httpOnly-cookie migration in at the controller layer, not just the cookie-session util: no Set-Cookie on failed sign-in or failed refresh; the refresh cookie wins over a body token when both are present; a body-token refresh still rotates into a cookie with the rotated token stripped from the response body; `__Host-` cookie name + `Secure` on a secure deployment; cookies-disabled refresh keeps the body token and sets no cookie. Backend jest **352/352**, `nest build` clean.

## [2026-08-10] - MigrationHealthService: startup diff + readiness gate

### Backend
- **`MigrationHealthService`** (new, `backend/src/health/migration-health.service.ts`) — diffs `supabase/migrations/` against the live Supabase schema with one non-head probe per migration (`MIGRATION_PROBES` manifest: 19 probeable + 0017 seed-only). Non-head selects so PostgREST error bodies parse (`PGRST205`/`42703`) — the probe caveat that earlier masked the 0005+ gap. Probes run in parallel; `MIGRATIONS_DIR` env override with a repo-relative default.
- **Startup warning** — `onModuleInit` logs one warning per missing migration with the exact file to apply (e.g. `Migration 0005 NOT applied (0005_organization.sql) — probe: PGRST205: …`), a warning for unprobeable/unknown files (self-enforcing manifest), and a clean `Schema check: all N migrations applied` when healthy. Never throws.
- **Readiness gate** — `GET /v1/health/readiness` gains `checks.migrations` (`ready` + detail listing missing migrations and files to apply) and `ready` now requires it, so a half-migrated deployment is surfaced with one request instead of a later confusing 503.
- `MIGRATIONS_DIR` added to `env.validation.ts` + `.env.example`.

### Tests
- `migration-health.service.spec.ts` (new, 8 tests) — applied/missing/skipped classification from a fixture dir + table-aware admin mock, unavailable paths (missing dir / missing admin client), non-schema probe errors → `errored`, and startup-log behavior (warn per missing, clean bill, never throws).
- `health.controller.spec.ts` +3 — readiness renders `checks.migrations` ready/degraded/unavailable with the exact files.
- `app.e2e-spec.ts` overrides `MigrationHealthService` to keep the health e2e hermetic. Backend jest **346/346**, `nest build` clean, e2e 57/59 (2 pre-existing live-DB failures).

### Verified live
- Booted the fresh build on :4100 against the real project: startup log lists all 14 missing migrations; `checks.migrations` reports `missing migrations: 0005 (…), 0007 (…), …` and status `degraded`. The check also corrected the applied-set record: **0001, 0002, 0003, 0004, 0006 applied; 0005, 0007, 0008, 0009, 0010–0016, 0018–0020 missing**.

## [2026-08-10] - BullMQ e2e variant + live migration-state correction

### Tests
- **`scans-flow.e2e-spec.ts` gains a second variant** — `Scan flow with BullMQ enqueue (e2e)`: `createTestApp(queueConfigured)` now parameterizes the `QueueService` override, and the new describe block boots with `isConfigured() === true` to cover the Redis/enqueue path instead of inline processing. Two new tests: (1) submit enqueues the BullMQ job with the scan id and the row **stays queued with no payload** (no inline fallback); (2) simulating the worker via `ScansService.processQueuedScan(scanId)` — the exact entry point `backend/src/worker.ts` invokes — drives queued → processing → completed with the full payload (verdict, 4 signals, `PRV-` report id, sha256). scans-flow suite now **9/9**.
- **Scan-failure branch** — new inline-path test makes `storage.download` fail (`{ data: null, error }`), then asserts the scan lands in **`failed`** on `GET /v1/scans/:id` with `failure_reason` containing `Failed to download the uploaded asset.` and no `result_payload`. scans-flow suite now **10/10**.

### Docs
- **`MIGRATION_RUNBOOK.md`** — corrected live-project state after non-head service-role probes: only **0001, 0002, 0004** are applied; the whole **0005+ set (0005, 0007, 0008, 0009, 0010, 0011, 0014, 0016, 0020) is missing** (`PGRST205`/`42703`). Added a probe caveat: `head: true`/HEAD requests mask PostgREST error bodies (and a v1-style client can falsely report tables as present) — always verify with non-head selects. This explains the pre-existing `invite-accept.e2e-spec.ts` failure (live seed hits missing org tables), which reproduces standalone and is unrelated to this change.

## [2026-08-10] - Projected end-of-cycle usage + overage estimate

### Backend
- **`projectScanUsage`** — new pure helper in `billing.service.ts` projecting end-of-cycle usage from the current pace: `pace = used / max(1, days elapsed)`, `projected = round(pace × days in cycle)`, `overage = max(0, projected − limit)`, `overageCostUsd = overage × price` (2dp). Days-elapsed clamps to 1 so a first-day burst never divides by zero; zero usage projects to zero.
- **`SCAN_OVERAGE_PRICE_USD`** env (default `0.05`, validated non-negative in `env.validation.ts`, documented in `.env.example`) feeds the estimate.
- **`GET /billing` usage gains `projection`** — `{ daysElapsed, daysInCycle, pacePerDay, projectedScans, overageScans, overageCostUsd }` computed from the same `scansUsed/scansLimit/periodStart/periodEnd` the meters render, so the projection card can never disagree with the meters.

### Frontend
- **Billing page new StatCard** — "Projected end of cycle" shows the projected scan total; when the pace exceeds the limit it escalates to a warning tone with `${n} over · ${cost} est. overage` (e.g. `17 over · $1 est. overage`), otherwise `X scans/day at current pace`. Grid widened to 4 columns (`md:grid-cols-2 lg:grid-cols-4`).
- **Shared `projectScanUsage`** in `src/lib/scanQuota.js` — frontend mirror of the backend helper; `mockGetBilling` recomputes the projection from the effective usage (so `?quota=high`/`?quota=exhausted` stay consistent with the forced meters) instead of serving a static seed.

### Tests
- `billing.service.spec.ts` +5 (projection math: pace projection, under-limit zero overage, first-day clamp, zero usage, custom price) — 337 backend total.
- New `src/lib/scanQuota.test.js` (7 tests) locking frontend/backend projection parity — 463 frontend total.

### Verified
- Backend jest **337/337**, `nest build` clean; frontend vitest **463/463**, build passes, lint 13 baseline warnings. Live-verified: default state shows `358 · 11.6 scans/day`, `?quota=high` shows `17 over · $1 est. overage` with the warning tone.

## [2026-08-10] - Billing & entitlements contract doc

### Docs
- **`docs/engineering/BILLING_AND_ENTITLEMENTS_CONTRACT.md`** (new, ratified) — captures the full billing contract: the plan catalog (`PLAN_SCAN_QUOTAS`/`PLAN_API_CALL_QUOTAS`/`PLAN_DISPLAY` with plan resolution via org membership), the calendar-month UTC cycle math, the `402 QUOTA_EXCEEDED` + `Retry-After` gate contract (with idempotency precedence), the complete `GET /v1/billing` payload with a field-by-field source-of-truth table (including storage/API meters and their degradation), mock parity rules, and known gaps (API-call counting not yet wired, payment processor deferred). Wired into the master documentation index.

## [2026-08-10] - Dashboard scan-quota warning chip

### Frontend
- **Dashboard-level quota warning** — when the workspace is at ≥85% of its monthly scan quota, a chip renders between the hero and the KPI row linking to `/app/billing`. Tones escalate: 85–99% warning (`90% of monthly scan quota used`), 100%+ danger (`Monthly scan quota exhausted`). Below 85% or without a usable limit it renders nothing.
- **Same source of truth** — the chip consumes `getBilling()` → `profile.usage.scansUsed/scansLimit`, the exact `resolveUsage` payload the Billing page and the `initiateScan` quota gate share, so the dashboard, meters, and enforcement can never disagree.
- New pure util `src/lib/scanQuota.js` (`scanQuotaPct` — null for missing/non-positive limits, clamped 0..100) kept out of the component file so fast-refresh stays intact.
- **Dev demo seam** — `?quota=high` forces `scansUsed` to 90% of the plan limit in `mockGetBilling` (alongside the existing `?quota=exhausted`), so the warning state renders for review. Inert in production builds.

### Tests
- New `scanQuotaWarning.test.jsx` (7 tests): pure pct math (ratio, clamp, null cases) + chip rendering (warning link → `/app/billing`, danger at 100%, nothing below 85% / no limit) — 456 frontend total.

### Verified
- Frontend vitest **456/456**, lint 0 errors (13 baseline warnings), build passes. Live-verified in the preview: chip renders with `?quota=high` (90%, links to `/app/billing`) and is absent at the default 62% usage. No console errors.

## [2026-08-10] - Real storage + API-call meters on GET /billing

### Backend
- **`getBilling` now resolves the storage and API-call meters from real data** instead of returning `null` (the `—` the Billing page renders):
  - `storageUsedGb`/`storageLimitGb` — read from the user's active org (`organizations.storage_used_gb` / `storage_limit_gb`, migration 0005), resolved via the membership join. Best-effort: no membership/org tables → `null` so a fresh DB never breaks the payload.
  - `apiCallsUsed`/`apiCallsLimit` — `apiCallsUsed` from the new `api_usage` table row for the current month (`user_id`, `period_month` unique — migration **0020**); `apiCallsLimit` from the new `PLAN_API_CALL_QUOTAS` plan catalog (starter 1k / pro 10k / team 50k / enterprise 250k). Missing table/row degrades to used 0 with the plan limit intact.
- `SUPABASE_API_USAGE_TABLE` env override added to `env.validation.ts` (default `api_usage`), matching the other table configs.
- The `Promise.all` storage/api resolution reuses the already-resolved plan (no redundant plan lookup).

### Tests
- `billing.service.spec.ts` +2 (storage + api-call meters resolved from org/api_usage rows; degradation paths) — 332 backend total.

### Verified
- Backend jest **332/332**, `nest build` clean. Frontend formatters already degrade null meters to `—` (verified `formatStorageGb`/`formatPct`/`percentOf` null handling) — no frontend change needed.

## [2026-08-10] - New-device sign-in detection layer

### Backend
- **`SecurityService.recordSession` now detects first-time (user, device, IP) combos** — before the ledger upsert, `isNewDeviceCombo` checks whether any existing row matches the combo; a miss means a first-time sign-in from that surface. Refresh keeps the same `auth_session_id` and its existing row, so it never re-triggers.
- **Unconditional high-severity audit event** — every new device writes `new_device_signin` to `auth_audit_events` (details: device/IP/location), added to `AUDIT_SEVERITY_BY_ACTION` as `high` so the Admin Audit Logs and account Activity pages badge it correctly.
- **`notifyOnNewDevice` honored** — when the control is on, `handleNewDeviceSignIn` creates an in-app security notification (bell + notification center, links to `/app/security`) and logs a `[mock-email]` line (the contract the future transactional-email service implements). All writes are best-effort — detection can never break sign-in.
- `NotificationsService.create` — new best-effort insert used by the security module; `SecurityModule` now imports `NotificationsModule`.

### Frontend mock parity
- `mockSignInWithPassword` + `mockRecordNewDeviceSignIn` mirror the backend exactly: first-time combo → `new_device_signin` audit event (high), security notification + `[mock-email]` console line when `notifyOnNewDevice` is on, no re-trigger for a known combo. `AUDIT_SEVERITY_BY_ACTION` gains `new_device_signin: 'high'`.

### Tests
- `security.service.spec.ts` +4 (first-time combo → audit write; notification created only when the control is on; skipped when off; refresh never re-triggers) — 330 backend total.
- New `src/lib/newDeviceSignin.test.js` (5 tests) locking mock parity — 449 frontend total.

### Verified
- Backend jest **330/330**, `nest build` clean; frontend vitest **449/449**, lint 0 errors, build passes.

## [2026-08-10] - Deeper pre-processing file inspection

### Backend
- **`inspectUploadContent` pre-processing gate** — before the analysis pipeline (and dedup lookup) runs, the worker now rejects uploads whose content is empty/truncated or whose magic bytes match **no** supported image format (renamed PDFs/executables/archives), landing the scan in `failed` with an actionable `failure_reason`. A supported-image header mismatch (e.g. PNG bytes declared as JPEG) is deliberately **not** rejected — that mismatch is the forensic `suspicious` signal the pipeline reports. 5 new tests (20 total in `analysis-pipeline.spec.ts`).

### Task list
- `PHASE_TASK_LIST.md` — deeper file inspection, queue metrics/backlog monitoring (Monitoring page queue_health), and founder diagnostics marked Complete; malware scanning + worker error alerting explicitly deferred as vendor/channel decisions.

### Verified
- Backend jest **326/326**, `nest build` clean.

## [2026-08-10] - Payload versioning, retention policy baseline, task-list sync

### Backend
- **`result_payload.payload_version`** — every analysis payload now carries a top-level `payload_version: '1.0.0'` (semantic-lite `MAJOR.MINOR.PATCH`), with the versioning strategy documented in `SCAN_UPLOAD_CONTRACT.md` (MAJOR = breaking shape, MINOR = additive, PATCH = value-level). The mock scan payload mirrors the same field so mock/real cannot drift.
- **Retention env keys validated** — `REPORT_RETENTION_DAYS` (default 365) and `AUDIT_RETENTION_DAYS` (default 730) are now parsed/validated in `env.validation.ts` and documented in `.env.example`, matching the values already surfaced in admin Settings.

### Docs
- **`RETENTION_POLICY.md`** (new) — ratified baseline for uploaded media (365d), report payloads (365d), audit events (730d), crash reports (90d), and the session ledger; archival-not-deletion semantics and the planned enforcement job.
- **`PHASE_TASK_LIST.md` synced** — cookie-based session transport, auth transport hardening, payload schema versioning, retention policy docs, and the dev/shared queue strategy decision all marked Complete (they shipped in prior slices); the remaining Not Started items are now an accurate backlog.

### Verified
- Backend jest scans+config suites **38/38**, frontend spot suites green; full gates re-verified before the branch push (321 backend / 444 frontend).

## [2026-08-10] - Team-tagged session ledger + org-admin session revocation

### Backend
- **`SecurityService` sessions are now team-tagged** — `SessionView` carries `teamId`, resolved profile-first (`profiles.team_id`, migration 0012) with an `organization_members` fallback, so the Security page badges every device with the user's team. `listSessions` accepts `{ targetUserId, teamId }` opts so the org view lists another member's rows without an extra lookup (the org service passes the membership's team).
- **Org-admin revocation** — three new routes behind the existing owner/admin gate: `GET /v1/organization/members/:memberId/sessions` (team-tagged ledger), `DELETE .../sessions` (revoke all non-current, returns `revoked` count, sequential so a single GoTrue failure never strands the batch), and `DELETE .../sessions/:sessionId` (single). The owner seat is protected (`400`) and an admin still cannot revoke their own current session — `SecurityService.revokeSessionForUser` shares the self-service internals (`getLedgerRow`/`assertNotCurrentSession`/`revokeLedgerRow`) and writes a `session_revoked` audit event carrying `targetUserId`. `OrganizationModule` imports `SecurityModule`.

### Frontend
- **Organization page** — a "Sessions" action on each manageable member row (owners and the current user excluded) opens a drawer listing the member's devices with a team badge, per-session Revoke, and "Revoke all other sessions", with loading/error/empty states and toasts.
- **Security page** — each session row now renders the `TeamBadge` from `session.teamId`.
- Mock parity: `mockMemberSessionsByUserId` (per-member ledger, `teamId` on every row; the owner reuses the Security page's rows so both surfaces agree), `mockGetMemberSessions` (actor-derived `isCurrent`), `mockRevokeMemberSession`/`mockRevokeMemberSessions` (owner + current-session guards, module-store persistence); `api.js` gains `getMemberSessions`, `revokeMemberSession`, `revokeMemberSessions` real-path branches.

### Tests
- `security.service.spec.ts` +7 (team tagging profile-first, membership fallback, targetUserId/teamId opts, `revokeSessionForUser` success/current-session/other-user-sid/404); `organization.service.spec.ts` +8 (list/403/404, single + revoke-all with owner guards, sequential count, partial-failure count). New `organization.e2e-spec.ts` slice (5 tests) — GET list with team tag, 403, single revoke via mocked GoTrue fetch, revoke-all count + ledger cleanup, owner 400 — CI-safe via a lazy `ConfigService` override.
- New `src/lib/memberSessions.test.js` (7 tests) locking mock/real parity for the surface.
- **Fix: e2e suite boot** — `test/jest-e2e.json` now maps the ESM-only `better-auth` packages to CJS stubs (`test/stubs/`), repairing an AppModule-import crash that had broken every e2e spec since the Option A controller mount.

### Verified
- Backend jest **321/321** (+15), e2e **54/54** across 5 suites (the live `invite-accept` spec is excluded locally because it un-skips when another e2e spec's ConfigModule load leaks `.env.local` into `process.env` — pre-existing, CI unaffected); frontend vitest **444/444** (+7), lint 0 errors, build passes; `ORGANIZATION_API_CONTRACT.md` updated (nine endpoints, session response shapes, security-module ownership).

## [2026-08-09] - Better Auth backend mount behind USE_BETTER_AUTH (Option A)

### Added (backend)
- `USE_BETTER_AUTH` env flag (default **OFF**) added to `env.validation.ts` — the provider only registers email/password + session + plugin routes when the flag is truthy **and** `DATABASE_URL` is set; the live GoTrue flow at `/v1/auth/*` is untouched either way.
- The Better Auth handler is now a **NestJS controller** (`BetterAuthModule` → `BetterAuthController`) instead of the raw `app.use` mount in `main.ts`: `@Controller('better-auth')` + `@All('*')` catch-all delegates to `toNodeHandler(auth)` (better-call's node adapter falls back to Nest's pre-parsed `req.body`), and `@Get('ok')` answers unconditionally with the gate state — `{ ok, provider, basePath, enabled, database, detail }`. With the flag off, `/ok` names the missing gate and every other route 404s.
- `better-auth.config.ts` gated on `betterAuthEnabled` (flag AND database): `basePath: '/v1/better-auth'`, plugins (twoFactor, organization, apiKey) and `emailAndPassword` only register when ready — otherwise the instance runs stateless with a console warning naming the missing gate. Production still fails hard on a missing `BETTER_AUTH_SECRET`.
- `better-auth-status.ts` — the gate logic extracted into a pure module (no better-auth import) so it is unit-testable under the backend jest CJS runner; `better-auth.controller.spec.ts` (6 tests) covers the disabled path, the `/ok` shape/basePath contract, and the catch-all 404.
- Frontend client `src/lib/betterAuthClient.js` `basePath` moved to `/v1/better-auth` to match the controller mount.

### Verified
- Backend jest **306/306** (+6 controller/status), `nest build` clean; frontend vitest **437/437**, lint 0 errors (12-warning baseline), build passes.
- Live on :4000 with the flag off: `/v1/better-auth/ok` → `{ ok:false, enabled:false, database:'missing', detail:'USE_BETTER_AUTH is not enabled' }`; the catch-all 404s; `/v1/auth/sign-in` (GoTrue) still answers — the parallel-provider contract holds.
- To light it up: set `USE_BETTER_AUTH=true` + `DATABASE_URL` in `backend/.env.local`, apply `0018_better_auth.sql`, restart — `/ok` flips to `ok: true` and the sign-up/sign-in/plugin routes register (see `BETTER_AUTH_PLUGINS.md` rollout).

## [2026-08-09] - Idempotent scan initiation (Idempotency-Key)

### Backend
- **POST /scans is now idempotent** — a client-supplied `Idempotency-Key` header (≤128 chars) dedupes retries: `initiateScan` first looks up an existing `awaiting_upload` row for `(user_id, key)` and returns the original reservation with a freshly-minted signed URL — no duplicate row, and the quota gate is skipped (a retry is the same logical operation, not a new scan). The key is stored on insert, and a concurrent duplicate insert (23505 on the new partial unique index) falls back to the winner's row instead of failing.
- Migration **`0019_scan_idempotency.sql`** — `scans.idempotency_key text` + partial unique index `scans_user_idempotency_awaiting_idx (user_id, idempotency_key) where status = 'awaiting_upload'`, so the guarantee is scoped to the pre-submission window and the same key after submit starts a fresh record.
- `schemaErrorHint` is now **column-aware**: a 42703/PGRST204 now names the missing column and the migration that introduces it (`processing_mode`/`completed_at` → 0009, `team_id` → 0012, `file_hash_sha256` → 0013, `idempotency_key` → 0019) instead of always blaming 0009 — an unapplied migration is diagnosable with one request.

### Frontend
- `api.js` `initiateScan(payload, idempotencyKey)` forwards the `Idempotency-Key` header in real mode; the Uploads page generates a stable key per selected file (regenerated on file change/reset, stable across retries) so a network blip or double-click reuses the original reservation.
- Mock parity: `mockInitiateScan` dedupes on the key while the record is pre-submission (checked before the quota gate), and the scan row stores `idempotency_key`.

### Tests
- Backend `scans.service.spec.ts` +5: same-key dedupe (no insert, no quota call), key stored on insert, 23505 fallback, over-long key 400, and the 0019 column-missing hint. New `src/lib/scanIdempotency.test.js` (3 tests): same-key reservation, window closes after submit, different keys → separate records. Backend jest **300/300**, frontend vitest **437/437**, lint 0 errors, build passes.

### Live check
- Verified against the running backend: with migration 0019 not yet applied, POST /scans with a key now returns the actionable 503 naming `idempotency_key` → `0019_scan_idempotency.sql` (previously it misattributed to 0009). Apply `0019` in the Supabase dashboard to enable the dedupe round-trip.

## [2026-08-09] - Swagger/OpenAPI at /v1/docs

### Backend
- Added `@nestjs/swagger` (11.4.6) + `swagger-ui-express` — the API is now self-documenting: `main.ts` builds an OpenAPI 3.0 document from route metadata and mounts the UI at `/v1/docs` (raw spec at `/v1/docs-json`) via `useGlobalPrefix: true`, with `addBearerAuth` so the access-token security scheme is one click in the UI.
- All **20 request DTOs** decorated with `@ApiProperty` (descriptions, examples, enums, min/max, required flags) so request bodies render in the spec — including the nested `CrashReportDto` array and the `UpdateSecuritySettingDto` polymorphic `value` (oneOf boolean/number/object).
- `docs/engineering/API_DESIGN_STANDARDS.md` P1 item "OpenAPI contract" marked ✅ live; new DTOs are expected to carry `@ApiProperty`.

### Verified
- `nest build` clean, backend jest **295/295**; live on :4000: `/v1/docs` serves the swagger-ui HTML, `/v1/docs-json` returns the document with `/v1/…` paths and 21 schemas (SignInDto descriptions/examples/minLengths and InitiateScanDto's 5 fields confirmed in the payload).

## [2026-08-09] - P0 slice: normalized error envelope + standard pagination

### Backend
- `GlobalExceptionFilter` — `message` is now **always a string** with structured validator failures in a separate `details` array (single-element arrays collapse to the plain string). Non-HttpException 5xx stays a generic `Internal server error.`; `Retry-After` on 402s unchanged. New `global-exception.filter.spec.ts` (7 tests) locking the contract: array/string/coerced-message/5xx/402-header/path+requestId.
- Pagination envelope standardized to `{ data, page, pageSize, total, totalPages }` across list endpoints: `totalPages` added to `AdminService.listJobs` and `ReportsService.listReports`, and `ScansService.listScans` reworked from the flat `{ data, scans }` to the full envelope — page/pageSize threaded through the controller (`DefaultValuePipe`/`ParseIntPipe`) and service with clamps (1–500), `.range()` slicing, and a `count: 'exact'` query so `total` reflects the filtered set. The `scans` alias is dropped; every frontend consumer already reads `.data`.

### Frontend
- `api.js` `listScans(params)` now forwards `page`/`pageSize` as query params in real mode (same `URLSearchParams` filter pattern as `getAdminUsers`), closing the mock/real drift where the mock returned a paginated envelope and the real path returned flat rows.
- `docs/engineering/API_DESIGN_STANDARDS.md` §3.2 corrected — `totalPages` is computed server-side and included in every list envelope (the doc previously claimed it was client-derived).

### Tests
- `scans.service.spec.ts` listScans suite extended: envelope assertions (page/pageSize/total/totalPages), count-derived `totalPages` (5 rows / 2 pageSize → 3), and degenerate-input clamps (page 0, pageSize 9999).
- Backend jest **295/295**, `nest build` clean; frontend vitest **434/434**, lint 0 errors (12-warning baseline), build passes.

## [2026-08-09] - API design standards ratified

### Docs
- `docs/engineering/API_DESIGN_STANDARDS.md` — the contract future backend slices build against, extracted from live conventions: full `/v1` route inventory across all 13 controllers (auth, account, organization, scans, reports, security, notifications, billing, admin/roles, health, waitlist, telemetry), the REST principles (plural resource nouns, verb-suffix action endpoints for state transitions, URL versioning, guard-authenticated stateless requests), P0 checklist (GlobalExceptionFilter error envelope `{statusCode,message,path,requestId,timestamp}` + `Retry-After` on 402s, `{data,page,pageSize,total}` pagination envelope with enum→400, camelCase validated DTOs with `whitelist+forbidNonWhitelisted`, guards/throttle/best-effort writes, mock parity), P1 checklist (idempotency, OpenAPI contract, 404-vs-403 consistency, honest nulls), and the GraphQL/RPC decisions (no GraphQL; REST + guarded action suffixes; PostgREST/RLS is not the API; `/api/auth` is a framework exception).

## [2026-08-09] - Auth provider decision brief (GoTrue vs Better Auth)

### Docs
- `docs/engineering/AUTH_PROVIDER_DECISION.md` — founder-facing brief covering the OAuth/passkey roadmap on both providers (Supabase native passkeys went beta May 2026; Better Auth ships a mature first-party passkey plugin), a plugin-coverage table vs Provance surfaces (2FA/org+teams/API keys/RBAC/admin), the migration cost (bcrypt→scrypt forced reset; UUID→text id repointing across the 7 `auth.users` references in 0004/0005/0010/0011/0017; `auth.uid()` RLS rework; sessions/guards; managed vs self-hosted ops), and a weighted founder decision gate (GoTrue 4.30 vs Better Auth 3.80 — with the time-sensitive argument that the forced reset costs ~nothing at the current ≈zero real-user base). Recommendation: Option B (migrate now behind the existing flag, then retire GoTrue), with the sequenced 6-step cutover.
- Renamed the Better Auth schema migration `0011_better_auth.sql` → `0018_better_auth.sql` (it collided with the existing `0011_notifications.sql`); references updated in the config, plugin doc, and changelog.
- `BETTER_AUTH_PLUGINS.md` cross-links the decision brief.

## [2026-08-09] - Frontend Better Auth flag (USE_BETTER_AUTH)

### Added (frontend)
- `src/lib/betterAuthClient.js` — `createAuthClient` singleton (baseURL from `VITE_BETTER_AUTH_URL`, default `http://localhost:4000`, `credentials: 'include'`) plus adapters that normalize `{ data, error }` responses into the exact mock/GoTrue shapes api.js already produces.
- `USE_BETTER_AUTH` in `src/lib/api.js` (`VITE_USE_BETTER_AUTH=true`) — takes precedence over `USE_MOCK`/GoTrue for `signInWithPassword`, `requestPasswordReset`, `confirmPasswordReset`, `signOut`, `getCurrentViewer`, `getSecuritySettings`, `changePassword`, `revokeSession`, `updateSecuritySetting`.
- AuthContext hydration branch for better-auth mode (`getSession()` is the session check — no GoTrue refresh dance); sign-in/sign-out flow unchanged through api.js.
- Security page mapping: sessions synthesized from `listSessions()` (real device rows, `isCurrent` via the live session), password change with `revokeOtherSessions`, session revoke via token map; the 2FA toggle fails loudly (plugin needs the password + TOTP enrollment flow — `twoFactorClient` UI is the next slice); mock-only toggles persist locally.
- `better-auth@1.6.26` added to the frontend (npm, exact), `VITE_USE_BETTER_AUTH`/`VITE_BETTER_AUTH_URL` documented in `.env.example`, rollout doc updated.
- Tests: `src/lib/betterAuthClient.test.js` (3) locking the viewer normalization to the AuthContext contract (accessToken synthesis, expiresAt ms, ADMIN_EMAILS admin mapping, displayName fallback).

### Verified
- vitest 434/434 (38 files), oxlint 0 errors (12-warning baseline), vite build passes.

## [2026-08-09] - Better Auth plugins enabled (twoFactor, organization, apiKey)

### Added (backend)
- `backend/src/auth/better-auth.config.ts` — enabled three plugins behind the existing `DATABASE_URL` gate (same branch as `emailAndPassword`, so nothing registers while the provider is stateless): `twoFactor({ issuer: 'Provance' })` (TOTP + backup codes + trusted devices + lockout), `organization()` (default roles owner/admin/member — identical to the org module's model — with teams via `team`/`teamMember`), and `apiKey({ references: 'user' })` from `@better-auth/api-key@1.6.26` (the API Key plugin was extracted to its own package in Better Auth 1.5 and is not inside `better-auth@1.6.26`).
- `supabase/migrations/0018_better_auth.sql` — idempotent schema for core (`user`, `session`, `account`, `verification`) + plugin tables (`twoFactor`, `organization`, `member`, `invitation`, `team`, `teamMember`, `role`, `apiKey`), field lists extracted from the installed packages; note to reconcile with `npx @better-auth/cli generate` once `DATABASE_URL` is set.
- `docs/engineering/BETTER_AUTH_PLUGINS.md` — evaluation + replacement map: twoFactor replaces the Security page's mock-only 2FA toggle (first real provider), organization replaces the org module + six org mock functions (seat limits + invite-token hashing stay custom), apiKey replaces the entire mock API-keys layer (first real backend for that page).
- Build fix: `auth` exported with a double assertion to `ReturnType<typeof betterAuth>` — plugin schemas reference pnpm's isolated zod path, breaking declaration emit (TS2742).

### Verified
- `nest build` clean, backend jest 286/286, CLI `info` loads the config (`plugins: []` while `DATABASE_URL` unset — gate proven), backend restarted on :4000 with `/api/auth/ok` live.

## [2026-08-09] - Mock audit trail for job retry/fail

### Added (frontend)
- `mockRetryJob` / `mockFailJob` (src/lib/mockApi.js) now prepend live `scan.retried` (medium) / `scan.failed` (high) events to the module-level `mockAuditEvents` store, mirroring exactly what the real backend writes to `audit_logs` on POST /admin/jobs/:id/retry and /fail — actor read from the persisted mock session (`currentMockActorEmail`, falling back to the seeded super_admin), `resource_id` = the scan id, `details` carrying `{ from, to, reason }`, newest-first, unique `audit_live_*` ids.
- `AUDIT_SEVERITY_BY_ACTION` is now exported from mockData.js (single source for the new events' severity), and the Audit Logs page gained a `retried: 'info'` action tone so the badge renders on the `scan.retried` short action.
- New vitest spec `src/lib/jobsAuditTrail.test.js` (4 tests) locking the writes: event shape/severity/actor attribution, session fallback, invalid-transition guards write nothing, and newest-first ordering with unique ids across repeated mutations. Suite 431/431, lint 0 errors, build passes.

## [2026-08-09] - Real /admin/jobs: filters, pagination, audit trail

### Added (backend)
- `AdminService.listJobs({ status, page, pageSize })` + controller wiring — `GET /v1/admin/jobs` now supports `?status=` (display dialect: `queued`/`processing`/`completed`/`failed`, mapped to DB `scan_status` values; `queued` spans `awaiting_upload`+`queued`; unknown values → 400) and `page`/`pageSize` (clamped 1–500; `count: 'exact'` returns the filtered total; default pageSize 500 preserves the no-params frontend contract that computes counts client-side). Response gains `page`/`pageSize` alongside the existing `{ data, total }`
- `POST /v1/admin/jobs/:id/retry` + `/fail` now write an **audit trail** to `audit_logs` (0008) via the existing `insertAdminAuditEvent` helper (new `entityType` param, `'scan'`): actions `scan.retried` (medium) / `scan.failed` (high), actor email from the session `@CurrentUser`, details carry `from`/`to` + reason. The write is **best-effort** — a missing `audit_logs` table (0008 not applied) never blocks the admin action (warn + continue)
- `scan.retried` added to the shared backend `AUDIT_SEVERITY_BY_ACTION` (`backend/src/common/audit-severity.ts`) and its frontend mirror (`src/lib/mockData.js`) so audit surfaces badge the new action identically in both modes
- `JOB_COLUMNS` constant extracted (listJobs/retry/fail share one select string)

### Tests
- `admin.service.spec.ts`: `insert` added to the plan-based mock builder; new listJobs cases (status mapping for `completed`/`queued`/`all`-no-op, range pagination with filtered count, page/pageSize clamps, unknown-status 400); retry/fail happy paths now assert the audit insert payload (actor_email, action, severity, entity_type `scan`, details) plus best-effort audit-failure tests

### Verification
- Backend jest **286/286**, `nest build` clean; frontend vitest **427/427**, lint 0 errors (12-warning baseline), build passes
- Live HTTP check (dev admin, restarted backend): `GET /v1/admin/jobs?status=bogus` → **400** "Unknown job status filter: bogus"; no-params → **503** only because the live project still lacks migration 0009 columns (select on `processing_mode`/`team_id`/`completed_at`) — resolves automatically once 0009 lands

## [2026-08-09] - Admin Jobs: worker-utilization panel

### Added
- `src/pages/admin/JobsPage.jsx` — new **WorkerUtilizationPanel** above the job ledger:
  - Per-worker stat cards (in-flight / completed / failed + total) derived from the ledger, so mock and real modes stay in sync with whatever worker attribution the API returns (null worker → "Unassigned")
  - A self-hosted stacked SVG bar chart of jobs per worker (queued → in-flight → completed → failed, bottom-up with failed on top), reusing the Analytics visual language: shared `ChartHoverReadout`, `CHART_W/CHART_H/PAD`/`pctOfViewBoxX` geometry, edge-to-edge hover hit cells with outline + per-status readout, crisp HTML worker axis labels, and a stack-order legend
  - **Worker column filter** — a second chip row (All workers + per-worker chips with counts) that filters the ledger, joins the search + status filters, and resets via the existing Clear-filters action; header meta now includes the worker count
- Empty state handled ("No worker activity yet") when the ledger has no jobs

### Verification
- vitest **427/427**, lint 0 errors (12-warning baseline), build passes
- Live check on `/app/admin/jobs` (dev admin, mock mode): panel renders 4 workers / 25 jobs; hover on the AP-01 bar shows "AP-01 · 2 in-flight · 2 completed · 2 failed" with the outline; clicking the AP-01 chip filters the ledger to 6 rows, all `worker-ap-01`, with Clear filters appearing
- Note: one `TrendChart.test.jsx` hover test flaked once on a 5s timeout under full-suite load (passes in isolation, 12/12) — pre-existing timing flakiness, unrelated to this change

## [2026-08-09] - Schema migration runbook (0003–0010)

### Added
- `docs/engineering/MIGRATION_RUNBOOK.md` — step-by-step procedure for applying `supabase/migrations/0003–0010` via the dashboard SQL Editor: dependency order (numeric order is correct; 0004/0005 need `set_updated_at` from 0001, 0009 needs `scans` from 0002), per-migration "what it creates / unlocks / verify" checklist with copy-paste SQL (expected row/object counts: 0003→2, 0004→1, 0005→4, 0006→10, 0007→5, 0008→15, 0009→3, 0010→2), a one-shot combined verification query, the `GET /v1/health/readiness` acceptance gate (flips to `ready` only when 0009 + 0010 land), a service-role REST probe snippet, and a troubleshooting table (PGRST205/42703/503, cache lag, out-of-order runs)
- Cross-linked from `SCAN_UPLOAD_CONTRACT.md`

## [2026-08-09] - BullMQ scan queue live (Upstash Redis + worker)

### Added
- Provisioned an Upstash Redis instance via `POST upstash.com/start-redis` (no signup; 3-day expiry) and wired `REDIS_URL` (`rediss://default:<token>@…:6379`) into `backend/.env.local` — `createRedisConnection` already parses the rediss URL (TLS + user/password), no code change needed
- `backend/scripts/verify-bullmq.mjs` (registered as `npm run validate:bullmq`) — inserts a real `queued` scan row via the service role, enqueues a `process-scan` job with the exact options `ScansService` uses, and polls the BullMQ job state + row status until the worker claims it; the row is cleaned up afterwards

### Verified (live)
- `GET /v1/health/readiness` queue check flipped: **"BullMQ worker queue configured (REDIS_URL set)"** (was "REDIS_URL unset — scans process inline")
- Worker booted via `start:worker`: **"Worker is ready for queue \"scan-processing\" with concurrency 4"**
- Job round-trip: `waiting → active` (row transitioned `queued → failed` with `failure_reason="Failed to download the uploaded asset."` — expected, no asset exists without the full upload flow), worker logged `Completed scan job <id>`; BullMQ counts ended `completed: 1` — jobs now process through the separate worker process, not the inline fallback

### Gotcha fixed + documented
- The shell inherits `PORT=62392`; dotenv doesn't override env vars, so the API was binding 62392 instead of `.env.local`'s `PORT=4000` — restart with `PORT=4000 node dist/main`; documented in SCAN_UPLOAD_CONTRACT.md

### Still blocked
- Readiness overall remains `degraded` — migrations **0009** (scans processing columns) and **0010** (user_sessions) are still missing in the `dmhrwdcuwtgscwlaagsa` project, so the happy-path round-trip (initiate → upload → submit → complete → report) still 503s at initiate. The queue + worker are fully functional and will process real jobs the moment 0009 lands
- Upstash database is ephemeral (expires **2026-08-12**); claim at `https://upstash.com/start-redis/console/8d0709fc-213c-4400-8175-e026ab2119bb` to keep it

## [2026-08-09] - Verdict palette → CSS custom properties (single color source)

### Added
- `VERDICT_PALETTE` in `src/components/app/scanPresentation.js` — the single source of truth for verdict colors + tones (authentic/suspicious/inconclusive → hex, tone, readout class). `VERDICT_CHART_SEGMENTS` and `VERDICT_META` are now **derived** from it, so chart fills and the Badge tone mapping can't drift from each other
- `applyVerdictPalette()` — exports the palette as CSS custom properties on `<html>` at boot: `--color-verdict-{key}` plus `--color-tone-{tone}` aliases; called from `src/main.jsx` before render, no-op in non-browser envs
- `TONE_CSS_VARS` — the semantic-tone → var map the ui primitives consume

### Changed
- `StatCard` — verdict-mapped tone accents (`success`/`info`/`warning`) now draw their border-left color from `var(--color-tone-*)` (inline style); `default`/`danger` keep the Tailwind stone/rose shades
- `Badge` — the status dot for verdict-mapped tones now uses `bg-(--color-tone-*)`, matching the exact chart hex; the pastel chip bg/border/text stay on the Tailwind scale for readable contrast on tiny text
- `src/index.css` — design-token comment documenting the runtime-exported vars (values live only in the JS module)

### Tests
- `scanPresentation.test.js` — verdict palette single-source describe (segments/meta derived from the palette, stack order, tone→var mapping, node-env no-op)
- `src/components/app/verdictPalette.test.js` (new, jsdom) — `applyVerdictPalette` writes every `--color-verdict-*` and `--color-tone-*` alias and is idempotent
- `Badge.test.jsx` — dot class locked to `bg-(--color-tone-success)`

### Verification
- Frontend vitest **427/427** (36 files, +20), lint 0 errors (12-warning baseline), build passes; live check confirms `--color-verdict-*` / `--color-tone-*` land on `<html>` at boot

## [2026-08-09] - DonutChart primitive (admin media distribution)

### Added
- `src/components/ui/DonutChart.jsx` — self-hosted SVG ring/donut chart with full-panel card chrome like TrendChart/StackedBarChart (eyebrow title, description, badge, hover readout with widening arc, crisp HTML center total, per-segment legend); `buildDonutSegments` in `chartGeometry.js`; both exported from the ui barrel
- `src/components/ui/DonutChart.test.jsx` + chartGeometry cases (arc geometry, empty/all-zero, hover, legend shares, center total)
- Admin Analytics media-type distribution migrated onto the primitive (hex `MEDIA_HEX` palette), replacing the hand-rolled `MediaTypeBar` percentage rows

### Verification
- ui suite green at migration time; full vitest suite now **427/427**

## [2026-08-09] - /admin/monitoring Series Parity Walk (re-run)

### Verified (live, 2026-08-09)
- Re-fetched the real `GET /v1/admin/monitoring` payload and diffed the two queue series against `mockMonitoring` **field-by-field on every row**: `hourly_series` (12 rows) and `daily_series` (14 rows) both carry the exact contract key sets (`hour, processed` / `date, processed, completed, failed`), ISO timestamps (top-of-hour / noon UTC), integer counts, and monotonic oldest→newest ordering — **full series parity**

### Changed
- `backend/scripts/parity-monitoring.mjs` — upgraded to a hard/soft drift model and deep series checks:
  - `checkSeries` verifies key sets on **all** rows (not just the first), ISO-date + integer-count value classes, and monotonic ordering for both series
  - **Hard drift** (missing keys, wrong element shapes, non-ISO dates, non-integer counts, non-monotonic series) exits 2; **soft drift** (nulls the page renders as '—', fewer live buckets, zero live counts) is reported separately and no longer fails the walk
  - The walk now exits **0 (CONTRACT PARITY)** with the 3 known soft drifts listed, and would exit 2 on any genuine structural break
- `docs/engineering/MONITORING_PARITY_VALIDATION.md` — documents the hard/soft semantics and the all-rows series contract

### Reconciliation status
- The one real bug the original walk surfaced — a missing `admin_incidents` table 503-ing the whole endpoint — was already fixed (incidents section degrades; overall forced to degraded) and is running on :4000; the live payload now returns 200 with `incidents: []`

## [2026-08-09] - TrendChart labels + Empty Degradation Tests

### Added
- `src/components/ui/TrendChart.test.jsx` — 6 new tests (new "labels + empty degradation" describe block, alongside the existing hover suite): empty series renders the default empty card (title + description, no SVG, no legend); custom `emptyTitle`/`emptyDescription` flow through; default legend labels (`Scans (231)` / `Completed (112)` / `Failed (14)` — verified against the series totals); custom `labels` relabel the legend with totals and drop the defaults; custom labels flow lowercased into the hover readout; and the legend keeps the prop's casing while only the readout lowercases it

### Verification
- Frontend vitest **407/407** (34 files, +6; TrendChart file 6 → 12), lint 0 errors (12-warning baseline), build passes

## [2026-08-09] - stackedOutlineBounds Extraction

### Added
- `src/components/ui/chartGeometry.js` — `stackedOutlineBounds(point, geometry, segments)`: the hover-outline math extracted from StackedBarChart (stack top from the last segment's `yTop`, baseline from the first segment's `bottom`, clamped non-negative height). With no segments it falls back to the shared PAD plot bounds (`PAD.top` → `PAD.top + plotH`) and all-zero points collapse to zero height — never inverted or NaN. Exported from the ui barrel
- `chartGeometry.test.js` — 5 new tests: outline spans the full stack (last-segment top → first-segment bottom, height = Σ segment heights, strictly taller than the bottom segment alone — the historic bug), all-zero collapse, no-segments PAD fallback, single-segment exact match, and point-level consistency with the `stackedSegmentBounds` contract (min top / max bottom / height parity across a whole series)

### Changed
- `src/components/ui/StackedBarChart.jsx` — the inline hover-outline computation (calling `stackedSegmentBounds` + the `stackTop`/`baseline`/`height` arithmetic inline in the render) now delegates to `stackedOutlineBounds`; the guide line stays in the component

### Verification
- Frontend vitest **401/401** (34 files, +5), lint 0 errors (12-warning baseline), build passes. Live check on the Admin Analytics verdict chart: hovering a bar renders the full-stack outline rect (y 150.4, height 41.6, bottom at `PAD.top + plotH` = 192) exactly as before

## [2026-08-09] - /admin/monitoring Live Parity Walk

### Fixed
- `backend/src/admin/admin.service.ts` (getMonitoring) — the incidents query no longer 503s the whole monitoring surface when its table is missing/errored. The incidents section is display-only, so `incidentError` now degrades to `incidents: []` and forces `overall.status` to `degraded` (the data gap stays visible); the seven core queries (scans/queued/in-flight/profiles/waitlist/audit) still fail hard. This is exactly what the live walk surfaced: the live project never applied `supabase/migrations/0007_incidents.sql`, so every /admin/monitoring call returned 503
- `backend/src/admin/admin.service.spec.ts` — new test locking the degrade path: missing `admin_incidents` → `incidents: []`, `open_incidents: 0`, `overall.status: 'degraded'`, no throw, core surfaces intact

### Added
- `backend/scripts/parity-monitoring.mjs` (registered as `npm run validate:monitoring-parity`) — field-by-field comparison of the real `GET /v1/admin/monitoring` payload vs `mockMonitoring`, covering `queue_health` (incl. `hourly_series`/`daily_series` row shapes), `storage_utilization`, and `db_performance`; exits 0 on full parity, 2 on drift
- `backend/scripts/probe-monitoring-tables.mjs` — dev-only probe that pins down which monitoring table is missing in a live project (reads `backend/.env.local`, never prints secrets)
- `docs/engineering/MONITORING_PARITY_VALIDATION.md` — the walk, the reproduction steps, and the drift table

### Verified (live, 2026-08-09)
- Endpoint parity: top-level keys match exactly; `hourly_series` (12) and `daily_series` (14) match row-for-row in shape. The 3 remaining drifts are value-level nulls, all rendered as '—' by the page: `avg_processing_time_ms` (no 24h completions live), `storage_utilization.buckets` (1 honest uploads bucket vs the mock's 4-bucket vision), `db_performance.cache_hit_rate` (not readable via the REST API)
- Page-level: with `USE_MOCK = false` the Monitoring page rendered the real payload (measured probe latencies, real table stats, `Queue: Not configured`, 0 incidents, every null as '—') with no crashes
- Backend jest **278/278** (+1), `nest build` clean

## [2026-08-09] - HourlyBarChart Primitive Extraction

### Added
- `src/components/ui/HourlyBarChart.jsx` — the reusable hourly bar chart primitive extracted from the admin queue panels (bars, hover readout via the shared `ChartHoverReadout`, guide line + outlined bar, transparent edge-to-edge hit cells, and crisp first/middle/last hour axis labels). Geometry is configurable (`chartW`/`chartH`/`pad`/`barAreaH`/`barBaseY`/`guideTop`/`svgClassName`) with defaults matching the shared `CHART_W/CHART_H/PAD`; renders nothing for empty or all-zero series so callers keep their own gating
- `src/components/ui/chartGeometry.js` — `buildHourlyBarGeometry(points, options)`: slot width, series max (clamped, `Math.max`-compatible), bar width, and the `buildGroupedHitAreaCells` edge-to-edge hit cells aligned to the caller's pad (custom `QUEUE_PAD` bounds flow through); exported from the ui barrel alongside `HourlyBarChart`
- `src/components/ui/HourlyBarChart.test.jsx` — 6 hover-interaction tests mirroring the TrendChart suite: first/last hit-rect hover (first-cell-at-`PAD.left` dead-zone regression), readout + guide line updates, mouseleave reset, axis labels, and empty/all-zero → no SVG
- `chartGeometry.test.js` — 5 `buildHourlyBarGeometry` cases: shared-default geometry math, the custom queue-panel geometry (`720×120`, 8-unit pads, `barBaseY` 104) with edge-to-edge cells, first-slot-inside-its-cell, empty series, and zero/negative → `hourlyMax` 0

### Changed
- `src/pages/admin/AnalyticsPage.jsx` (QueueThroughputPanel) and `src/pages/admin/MonitoringPage.jsx` (QueueHealthPanel) — both hand-rolled hourly bar SVGs (bar rects, hover guide, highlight, hit cells, readout, axis labels — ~80 duplicated lines each) replaced with the `<HourlyBarChart>` primitive. Analytics keeps the shared-geometry defaults; Monitoring passes its custom `720×120` viewBox, 8-unit pads, `barAreaH` 92, `barBaseY` 104, `guideTop` 0, and `h-20` render height, preserving its exact look. The `QUEUE_CHART_W/H`/`QUEUE_PAD` constants and per-panel `slotW`/`hitAreas`/`hoverIndex` memos are gone; the pages keep only the `hourly`/`hourlyMax` gate memos. No admin surface hand-rolls chart SVG anymore

### Verification
- Frontend vitest **396/396** (34 files, +11: 6 primitive + 5 geometry), lint 0 errors (12-warning baseline), build passes. Live check against the dev server: both admin panels render the primitive (Monitoring `720×120`/`h-20`, Analytics `720×220`/`h-24`, 12 hit cells each) and a dispatched hover updates the readout ("7 AM · 24 processed") with the guide line

## [2026-08-09] - Account Module Coverage Closed

### Changed
- `backend/src/account/account.service.spec.ts` — coverage-driven gap closure for `AccountService` (was 53% stmts / 51% lines on the service): 24 new tests across three new describe blocks plus getActivity branch edges, taking the service to **100% stmts / 100% funcs / 100% lines / 98.6% branch**
  - **ensureProfile** (was ~0% covered): insert path with the resolved default row (`buildDefaultProfileRow` incl. display-name derivation, `Provance User` fallback for a missing email, admin promotion via `ADMIN_EMAILS`), untouched-return when no repair, the repair path (blank display name, stale email, role change, missing JWT email → stored email kept), and the 503s (select/insert/update/not-configured)
  - **updateProfile**: dto overrides → exact update payload + serialized envelope, blank-string fallbacks (display name → current, role title → null, organization trim, missing JWT email → profile email), team-workspace-without-access 400, 503s
  - **getCurrentViewer**: authenticated envelope with permissions + serialization (team workspace only with team access; null org/role → empty strings)
  - **getActivity branch edges**: default input + default table names when config keys absent, `actor_email` null → 'system', incident `resolved_at` null → `started_at`, non-object error → 503 (not missing-table), and the `data ?? []` fallbacks (empty-envelope test now passes `data: null`)
  - The plan-based mock builder gained `update`/`insert`/`maybeSingle`/`single` for the profile chains

### Coverage run note
- On Windows, `--collectCoverageFrom` paths are relative to jest's `rootDir` (`src`), so the pattern is `account/**/*.ts`, not `src/account/**` — the config's own `collectCoverageFrom` is `**/*.(t|j)s`

## [2026-08-09] - Activity Category Contract Parity Test

### Added
- `backend/src/account/activity-categories.ts` — the category contract extracted into a **pure module** (no NestJS imports): the `ActivityCategory` union, `ACTIVITY_CATEGORY_ACTIONS` (account/team/system action lists), and `ACTIVITY_CATEGORY_LIKE_PATTERNS` (`scan.%` / `report.%`). `account.service.ts` now imports it (local copy removed), so the frontend parity test can import the server's own source of truth without pulling the DI graph into vitest
- `src/lib/activityCategoryParity.test.js` — 5 vitest tests importing `activity-categories.ts` directly and locking mock/real parity: the six tab keys equal the backend union; every tab has a unique label; the frontend's hoisted `ACTIVITY_CATEGORY_ACTION_LISTS` equal the backend's action lists **exactly in both directions** (sorted set-equality for account/team/system); every backend action still matches its tab predicate behaviorally; and the scans/exports LIKE prefixes line up with the frontend `startsWith` predicates

### Changed
- `src/lib/activityCategories.js` — the account/team/system match lists are hoisted into the exported `ACTIVITY_CATEGORY_ACTION_LISTS` (predicates now reference them, behavior unchanged) so the parity test can do exact set-equality instead of parsing predicates

## [2026-08-09] - totalPages Count-Null Fallback Lock

### Added
- `backend/src/notifications/notifications.service.spec.ts` — new `list` test locking the `totalPages` math under the `count ?? rows.length` fallback: with the head-count query resolving `null` and 45 rows at pageSize 20, `total` falls back to 45 and `totalPages` must be `Math.ceil(45/20) = 3` (never 1), and the same math holds from page 2 (page-independent). The fallback lives in `NotificationsService.list` (the account service computes `total` in memory from the merged feed — its multi-page `totalPages` is already covered by `account.service.spec.ts`)

### Confirmed (finding)
- The frontend Activity page's pagination does **not** consume the backend `totalPages` envelope: `AppActivityPage` fetches `getActivityLogs({ pageSize: 100 })` and keeps only `r.data`, then paginates **client-side** at 8/page over the filtered snapshot (`pageCount = Math.ceil(filtered.length / PAGE_SIZE)`). A repo-wide grep confirms `totalPages` is consumed nowhere in `src/` (the only reference is a comment in `UsersPage.jsx`) — the backend field is produced but unused; wiring server-side pagination (or a "Page X of Y" footer from `totalPages`) is a deliberate UX change left for a follow-up

## [2026-08-09] - Unread-Count Endpoint + Bell Polling

### Added
- `backend/src/notifications/notifications.service.ts` — `getUnreadCount(user)`: a head-count query (`select('id', { count: 'exact', head: true })`) scoped to the user with `is_read = false`, returning `{ unread }` — no rows transferred
- `backend/src/notifications/notifications.controller.ts` — `GET /v1/notifications/unread-count` (guarded + throttled like the rest of the controller)
- `backend/src/notifications/notifications.service.spec.ts` — 5 tests: happy path with the `is_read=false` + user scoping chain assertions, `count: null → unread 0`, 400 without a user id, 503 when not configured, 503 on query failure
- `backend/src/notifications/notifications.controller.spec.ts` — route-order test updated to `list → unread-count → read-all → :id/read` (paths `['/', 'unread-count', 'read-all', ':id/read']`, verbs `[GET, GET, PATCH, PATCH]`), plus an HTTP test proving the count is served without calling `service.list`
- `src/lib/api.js` + `src/lib/mockApi.js` — `getUnreadNotificationCount()` (`GET /notifications/unread-count`) with `mockGetUnreadNotificationCount` counting the live mock store so it tracks mark-read persistence

### Changed
- `src/components/app/AppShellLayout.jsx` — the bell badge is now owned by a dedicated `badgeCount` state: initialized from the feed fetch, refreshed by polling `getUnreadNotificationCount` (immediately + every 30s) without refetching the feed, and adjusted optimistically by mark-read (`−1`, only when the notification was unread) and mark-all-read (`0`). The popover header and "Mark all read" button read the same badge count. A poll failure keeps the last known count
- `src/components/app/notificationBell.test.jsx` — +1 test (3 total): with the count endpoint reporting 3 while the feed still carries 8 unread rows, the badge shows 3 and `getNotifications` is fetched exactly once (proving the poll never refetches the feed); mocked API call history cleared per test

## [2026-08-09] - Notification Bell Deep Links

### Changed
- `src/components/app/AppShellLayout.jsx` — clicking a bell notification now: marks it read, closes the popover, and when the notification carries a `link` navigates to the linked report route (same contract as the full Notifications page's `openNotification`); link-less notifications keep the mark-read + close fallback without navigating. Removed the stale "intentionally not navigated" note
- `src/lib/mockData.js` — `mockNotifications` links now point at **scan ids** (`/app/reports/scan_007` etc.) instead of `rpt_XXX`: the `/app/reports/:scanId` route resolves the param via `getScan` against the scan store, so the old links would have landed on a not-found state. Linked notifications are mapped onto scans that are `completed` with a `result_payload` (7, 10, 13, 16, 19), so the deep link renders a full report instead of a processing/queued state

### Added
- `src/components/app/notificationBell.test.jsx` — 2 jsdom tests with the notifications API mocked deterministically (8 seed rows, all unread; store never mutated so counts can't drift): clicking "Scan completed successfully" navigates to `REPORT_MARKER:scan_007` (nested-route harness so the bell survives navigation), decrements the unread badge by one, and the popover rows unmount after the exit animation; clicking a link-less notification stays on the dashboard, marks read, and closes. Counts are derived from the live aria-label, and popover-close waits for framer-motion's exit

## [2026-08-09] - Notifications Controller HTTP-Layer Spec

### Added
- `backend/src/notifications/notifications.controller.spec.ts` — 11 supertest tests booting a minimal Nest app with the REAL `SupabaseAuthGuard` (mocked `SupabaseService`), REAL `ApiThrottlerGuard` + `ThrottlerModule` (60/60s), `v1` prefix, and the `main.ts` ValidationPipe/GlobalExceptionFilter wiring, locking the notifications HTTP contract:
  - **Route order** — declaration order `list → read-all → :id/read` via PATH/METHOD metadata (class-keyed, `@Get()` registers `/`), plus behavior: `PATCH /v1/notifications/read-all` hits `markAllRead` (never `:id/read`) and `PATCH /v1/notifications/:id/read` hits `markRead` with the raw id
  - **Query parsing** — ROUTE_ARGS_METADATA assertions (`DefaultValuePipe(1|20)` instance + `ParseIntPipe` class reference on the `${RouteParamtypes.QUERY}:1|2` keys), int parsing (`page=2&pageSize=5` → `{page:2,pageSize:5}`), defaults when omitted, `page=2.5` → 400 (ParseIntPipe strict `/^-?\d+$/`), and the empirically-verified quirk that `page=abc` **silently defaults to 1** (global implicit conversion → NaN → DefaultValuePipe treats NaN as nil) — locked as the actual production contract with a comment
  - **Guard** — 401 without an Authorization header and 401 for an invalid token (real guard, `getUser` failure)
  - **Throttle** — the 61st request in 60s returns 429 with exactly 60 service calls (fresh app per test so the counter never leaks across tests)

## [2026-08-09] - Live Session Lifecycle Validation

### Added
- `backend/scripts/validate-session-lifecycle.mjs` — zero-dependency live e2e validation of the session lifecycle against a running backend + real Supabase: creates a throwaway GoTrue user (admin API, `email_confirm: true`), signs in twice with distinct User-Agents (two devices), asserts both rows appear in GET /v1/security/sessions with `isCurrent` on the requester, revokes device B, then asserts the ledger drops to 1 row and device B's access token 401s on GET /v1/auth/me while device A's still works. Always deletes the throwaway user (idempotent; purges leftover `sessions.e2e.*` users first); prints PASS/FAIL + contract notes and exits non-zero on any failure. Registered as `npm run validate:sessions`
- `docs/engineering/SESSION_LIFECYCLE_VALIDATION.md` — what the script walks, how to run it, the ambient-`PORT` gotcha (this workspace's shell exports `PORT=62392`, which shadows `.env.local` unless pinned), the 2026-08-09 live results, and the unblock steps

### Findings (live run 2026-08-09)
- **5/11 checks pass**; the 6 failures share one root cause: the live Supabase project has **not applied migration 0010** (`user_sessions` table missing — flagged by the readiness probe added earlier today). Degradation is exactly as designed: sign-in works, `listSessions` returns `[]`, revocation is impossible (404)
- Observed contract behavior: refresh token travels via Set-Cookie only (body `refreshToken` stripped — `AUTH_COOKIE_ENABLED` default true); no backend errors during the run; the revoked-token-after-revocation behavior remains **unverified** until 0010 is applied and the script re-runs

## [2026-08-09] - user_sessions Readiness Probe + Seed

### Added
- `backend/src/health/health.controller.ts` — GET /v1/health/readiness now probes the `user_sessions` table (step 3, `checks.userSessions`), matching the scans-schema probe: a read-only `.select('id').limit(1)` that flags a missing 0010 migration with the exact file to apply (`PGRST205`/"Could not find the table"/relation errors map to an actionable message), honors the `SUPABASE_USER_SESSIONS_TABLE` override, and never throws — any probe failure degrades the check entry instead of 500ing. `ready` now requires `supabase && scansSchema && sessionsSchema`
- `backend/src/health/health.controller.spec.ts` — 5 tests: both schema probes present, healthy path (scans + user_sessions both ready → `status: 'ready'`), missing 0010 flagged with the actionable migration message, not-configured detail, and probe-throw degradation
- `supabase/migrations/0017_user_sessions_seed.sql` — guarded seed for the session ledger: inserts 3 demo rows (desktop/current, laptop, mobile — relative timestamps, `encode(sha256(...))` hashes of dummy refresh values, never raw tokens) only when `founder.admin@provance.local` exists in `auth.users` **and** has no ledger rows yet, so a fresh DB or a production DB without that account is a strict no-op and real sessions are never fought. Revoking a demo row errors on the GoTrue admin call (fake session id) — documented in the header

## [2026-08-08] - Security Sessions E2E Slice (HTTP layer)

### Added
- `backend/test/security.e2e-spec.ts` — 8 e2e tests booting the **real module graph** (`AppModule`) and walking the security sessions endpoints against the stateful in-memory Supabase mock (organization.e2e-spec.ts convention), proving the controller wiring at the HTTP layer:
  - **GET /v1/security/sessions** — lists rows newest-first with `isCurrent` marked from the guard-provided `sid` (the controller passes `user.sid` through), and an empty-ledger → `[]` case
  - **DELETE /v1/security/sessions/:sessionId** — revokes a non-current session: asserts the 200 `{ ok, sessionId }`, the GoTrue admin DELETE hit `{SUPABASE_URL}/auth/v1/admin/users/{user}/sessions/{auth_session_id}`, the ledger row dropped, and the `session_revoked` `auth_audit_events` row; 400 for the current session (never touches the ledger), 404 for an unknown id, and 503 when the GoTrue call fails (ledger untouched)
  - **Controller wiring** — 401 without an Authorization header (real `SupabaseAuthGuard` in an app without the override, proving the guard), and 429 past the 30/60s controller throttle (proving the `@Throttle` + global `ApiThrottlerGuard`)
- **Hermetic env pinning** — `ConfigModule.forRoot` reads env when `app.module.ts` is first imported, so the file pins the fake SUPABASE trio (`https://example.supabase.co` etc.) via a statement *before* the import (CommonJS emit preserves order) — a dev machine's real `backend/.env.local` can never leak creds into the suite, and `global.fetch` is stubbed so no real network call ever happens

## [2026-08-08] - Roles Page Save Actions Wired to the API

### Added
- `src/lib/api.js` — two real-path branches matching the backend RolesController contract: `updateRoleScopes(roleId, scopes)` → `PATCH /admin/roles/:roleId/scopes` (body `{ scopes }`) and `reassignMemberRole(memberId, roleId)` → `PATCH /admin/roles/members/:memberId` (body `{ roleId }`), both `USE_MOCK`-gated. Note: the reassign route follows the backend's `/admin/roles/members/:memberId` (not `/:memberId/role`) so real mode hits the live endpoint
- `src/lib/mockApi.js` — `mockUpdateRoleScopes` (persists the full scope map on the session store; Owner-edit, unknown-scope, and non-boolean guards mirroring the real service) and `mockReassignMemberRole` (moves the member between roles and reconciles `mockAdminRoles[].member_count`; owner-seat / Owner-role guards, `changed: false` no-op for an unchanged RBAC role)

### Changed
- `src/pages/admin/RolesPage.jsx` — the save actions now persist through the API instead of toasting only:
  - Per-card **Save role** calls `updateRoleScopes` with the card's current scopes (spinner via the Button `loading` state, `savingRoleId` double-click guard), fires a `role.scope_updated` live audit event ("permission changes saved (N of 10 scopes enabled)"), and toasts success/error
  - Header **Save all changes** loops the editable roles sequentially (`savingAll` guard + spinner) with one summary audit event
  - **Member reassign** is now optimistic + API-backed: `reassignMemberRole` fires after the local move; on failure the member and both role counts revert and an error toast explains why; the audit event only lands on success. The select is disabled while its save is in flight

### Added
- `src/pages/admin/rolesSaveActions.test.jsx` — 3 jsdom tests (stubbed `updateRoleScopes`/`reassignMemberRole`, deterministic via the noise kill-switch): Save role persists the Admin card's toggled scopes + success toast + audit row; Save all changes persists all three editable roles in order; a failed reassignment reverts the selector and the Admin count chip, toasts the error, and records no audit event

## [2026-08-08] - Backend Roles Module (list / update scopes / reassign + audit)

### Added
- `backend/src/roles/` — a dedicated admin **RolesModule** owning the whole Roles & Permissions surface, moved out of `AdminService` (which kept only its derived endpoints):
  - `RolesService.list()` — GET /admin/roles (route moved from AdminController → RolesController, same contract): the RBAC matrix with real member counts (org membership → profiles), the 10-scope catalog, members mapped through `ORG_ROLE_TO_RBAC`, and the `role.%` audit trail. Persisted `role_scopes` overrides are merged over the `ADMIN_ROLES` defaults (DB wins); a missing `role_scopes` table (migration 0016 not applied) degrades to the defaults instead of 503ing — the incidents/monitoring best-effort precedent
  - `RolesService.updateRoleScopes(user, roleId, scopes)` — PATCH /admin/roles/:roleId/scopes: 403 on the Owner role (`editable: false`), 400 naming an unknown scope key / non-boolean value, delete + re-insert of the role's `role_scopes` rows, and a `role.scope_updated` audit event (actor from the session)
  - `RolesService.reassignMember(user, memberId, roleId)` — PATCH /admin/roles/members/:memberId: 403 when assigning the Owner role or touching the owner seat, 404 for unknown member/role, no-op `changed: false` when the RBAC role is unchanged, updates `organization_members.role` via `RBAC_TO_ORG_ROLE`, and writes a `role.member_assigned` audit event carrying both vocabularies (from_role_id/to_role_id + from_role/to_role) in details
- `supabase/migrations/0016_role_scopes.sql` — `role_scopes(role_id, scope_key, enabled)` table (PK on both, RLS enabled, backend-only writes) holding scope *overrides*; defaults stay product config in `roles.constants.ts`
- `backend/src/roles/roles.service.spec.ts` — **23 tests** following the notifications.service.spec.ts plan-based mock convention: list (matrix shape, overrides-merge, migration-missing fallback, empty-members skips the profiles query, 503s), updateRoleScopes (persist + audit payloads, Owner 403 with zero DB calls, unknown-key / non-boolean 400s, delete-failure 503, custom table name, actor/no-client guards), and reassignMember (org-vocabulary mapping + audit details, Owner-role and owner-seat 403s, no-op changed:false, update-failure 503, 404s, guards)

### Changed
- `backend/src/admin/admin.service.ts` — removed the now-superseded `getRoles()` and its private `ADMIN_ROLES` / `ADMIN_SCOPES` / `ORG_ROLE_TO_RBAC` constants + `initials` / `readDetailsDescription` / `RoleAuditRow` (moved to `roles/roles.constants.ts` / the service); `AdminController` dropped its GET /admin/roles route (now served by RolesController); `admin.service.spec.ts` lost the getRoles block + its fixtures (list coverage lives in the new suite)
- `backend/src/app.module.ts` — `RolesModule` registered

## [2026-08-08] - Live Audit Trail on the Roles Page

### Changed
- `src/pages/admin/RolesPage.jsx` — the role audit trail is no longer static: every in-session scope toggle and member reassignment now **prepends a live event** (actor = the signed-in admin from `useAuth`, description in the existing `role.scope_updated` / `role.member_assigned` copy style, `created_at = now`), merged newest-first over the seeded rows via `allAuditEvents`. The header meta count, the trail list, and the "Latest:" footer all read from the merged feed, and the trail description now advertises the instant session events. Events are held in component state only (they die with the tab, matching the once-issued semantics of the mock trail)

### Added
- `src/pages/admin/rolesLiveAudit.test.jsx` — 3 jsdom component tests (deterministic via the noise kill-switch + a stubbed `useAuth` admin actor): toggling a scope renders the live event with the signed-in actor and bumps the header meta to 7 events; reassigning Amina from Admin → Analyst renders the "moved from…to…" event; two rapid toggles stay **newest-first** in document order

## [2026-08-08] - Vitest Coverage for the Migrated Organizations / Feature Flags Pages

### Added
- `src/lib/flagToggle.js` — pure helpers extracted from `FeatureFlagsPage`'s optimistic working-copy logic: `applyToggle(rows, key, enabled)` (immutable per-key flip) and `countFlagKpis(rows)` (total/enabled/disabled/high-exposure). The page now uses them for the optimistic update, the revert, and the KPI memo
- `src/lib/flagToggle.test.js` — 9 cases: toggle semantics + immutability, both directions, unknown-key no-op, the stale-closure updater contract (safe when the working copy is `null`, never blanks the table), applying on top of an existing working copy, and KPI counts incl. zero-safe + lockstep-after-flip
- `src/lib/useDemoState.test.js` — 6 cases for `withDemoOverride`: null/undefined passthrough (same reference), forced loading (data preserved), forced error (demo message), forced empty (ready + `emptyData`), custom empty data, source resource never mutated
- `src/pages/admin/adminStateForcing.render.test.jsx` (jsdom) — page-level `?state=` forcing for both pages: empty surfaces ('No organizations found' / 'No feature flags configured yet'), error surfaces ('Could not load data' + demo message + Retry), and the live table without forcing (deterministic via the localStorage noise kill switch, since MemoryRouter can't carry the URL flag)
- `src/pages/admin/featureFlagsToggle.test.jsx` (jsdom) — 3 cases with `updateFeatureFlag` stubbed: optimistic flip + API call + KPI Enabled count decrement + full table still rendered (stale-closure no-blank guard); revert-on-error (switch back, KPI unchanged, error toast); other switches untouched

### Changed
- `src/lib/mockInvite.test.js` — silenced the mock's random error injection via a stubbed `?noisy=0` window so the seat-aware invite parity test is deterministic

### Notes
- Gates: vitest 371/371 (29 files), lint 0 errors (10 baseline), build passes

## [2026-08-08] - Removed the Archived Legacy Admin Components

### Removed
- `src/archive/legacy-admin/` (whole directory) — `AdminTable.jsx`, `AdminDrawer.jsx`, `AdminSearch.jsx`, `StatCard.jsx` (admin StatCard), and its `README.md`. All four had **zero consumers** since the 2026-08-07 migration sweep (last `AdminTable` consumer was AnalyticsPage's top-orgs table → `DataTable`); nothing in `src/` imported from the archive
- `docs/MASTER_DOCUMENTATION_INDEX.md` — dropped the four stale legacy rows (AdminTable/AdminDrawer/AdminSearch/admin StatCard)

### Cleaned
- `src/components/ui/StatCard.jsx` + `src/pages/UiKitPage.jsx` — stale doc copy referencing the removed admin StatCard reworded to describe the unified StatCard as the single shared component

### Kept
- `AppStatePanel` (`src/components/app/AppStatePanel.jsx`) — **still used** by 8+ live surfaces (Team, Account, AccessDenied, Reports print, admin Users/Overview/Monitoring/Analytics), so it stays; the archive's internal imports of it went away with the directory
- `HealthCheckRow` — remains in `src/components/admin/` (consumed by `SystemHealthPanel`/`QueueSnapshotPanel`)

### Notes
- Verified: zero references to `AdminTable`/`AdminDrawer`/`AdminSearch`/`legacy-admin` remain in `src/`

## [2026-08-08] - Live E2E for the Org-Invite Accept Path

### Added
- `backend/test/invite-accept.e2e-spec.ts` — live integration spec for `POST /v1/auth/invites/accept`: seeds an org (seats 10) + pending invite via the admin client (token stored as SHA-256 `token_hash`), accepts with the raw token, then asserts the auth user was created, the `organization_members` row exists with the invited role + `active` status, and the invite flips to `accepted`; a second case rejects a never-issued token with 401. **Skipped when Supabase credentials are absent** (the GoTrue `auth.admin.createUser` call can't be table-mocked), so CI without a live project stays green; cleans up the created user + org after each run, and names the missing-0005-migration fix if the seed hits a schema-cache miss
- `docs/engineering/ORGANIZATION_API_CONTRACT.md` — live e2e coverage section (skip gate, migration requirement, cleanup)

### Notes
- Verified locally: suite skips (2 skipped) when credentials are stripped; with `backend/.env.local` creds it runs against the live project and currently stops at seed with the actionable hint — the 0005 org tables aren't applied to that project yet

## [2026-08-08] - Org Invite Token Hardening (SHA-256 at Rest)

### Changed
- `supabase/migrations/0015_invite_token_hash.sql` — new nullable `organization_invites.token_hash` column, backfilled with `sha256(token)` from existing rows so pending invites stay acceptable, partial unique index, and the deprecated raw `token` column's default + not-null dropped (follow-up migration removes the column after deploy)
- `backend/src/organization/organization.service.ts` — `inviteMember` now generates a 32-byte random token, persists **only** its SHA-256 hex as `token_hash`, and returns the raw `token` + `/accept-invite?token=…` `inviteLink` once in the response so the token travels only via the share/email link
- `backend/src/auth/auth.service.ts` — `acceptInvite` matches the org invite by `token_hash` (sha256 of the submitted token) instead of the raw `organization_invites.token`, mirroring the existing access_invites flow; the shared `tokenHash` computed once for both branches
- `src/pages/app/AppOrganizationPage.jsx` — after inviting, the page builds the absolute accept link from the returned token and copies it to the clipboard (toast confirms), the current email-link delivery path
- `src/lib/mockApi.js` — `mockInviteMember` returns `token` + `inviteLink` for parity

### Notes
- Gates: backend 48/48 (org + auth suites), tsc clean. Specs assert the insert stores a 64-hex `token_hash` and never the raw token, the response carries the one-time token + link, and the accept lookup hashes the submitted token
- A leaked invites table now exposes only unusable hashes

## [2026-08-08] - Global Runtime-Error Capture (window.onerror + unhandledrejection)

### Changed
- `src/lib/telemetry.js` — new `initGlobalErrorListeners()` (wired from `src/main.jsx`) attaches window `error` + `unhandledrejection` listeners so non-React runtime errors are captured into the crash buffer, not just boundary render errors: uncaught exceptions preserve the Error stack; resource-load failures (img/script/link) record `meta.kind: 'resource'` + `resource_tag` + `resource_url` from the failing element; cross-origin `Script error.` events keep filename/line/column when available; unhandled rejections capture `event.reason` (Error, string, or fallback). `buildCrashRecord` now honors `context.type` (`render_error` default / `unhandled_error`). Listeners are purely observational (no `preventDefault`), idempotent per window (WeakSet — StrictMode/HMR safe), and never throw
- `src/lib/telemetry.test.js` — new suite for the listeners (6 cases): uncaught-Error capture, idempotent double-init, resource failure meta, Script-error meta, rejection with Error/string/missing reasons, and no-window safety (22 total)
- `docs/engineering/TELEMETRY_CONTRACT.md` — capture paths documented (boundary vs global listeners + record meta shapes)

### Notes
- Gates: vitest 22/22 for the module, lint 0 errors
- Capture now covers async code, timers, event handlers, resource loads, and promise rejections; flush + beforeunload wiring remains a follow-up

## [2026-08-08] - Evidence Appendix in Reports — Last Approved MVP Feature

### Added
- `backend/src/reports/report-document.ts` — `ReportDocument` now carries an `appendix` block (methodology ×3, limitations ×4) built by the new exported `buildAppendix()`. The copy is deliberately honest for court-oriented trust: what the pipeline does, that incomplete signal suites lower source confidence rather than raising it, that results inform human review rather than substituting for legal/editorial/security judgment, and that the methodology version bounds how the report should be read. Version interpolated from the payload, `Not assessed` fallback
- `backend/src/reports/report-pdf.ts` — the server PDF renders `Appendix — Methodology` and `Appendix — Limitations` sections after the analysis timeline
- `src/lib/reportAppendix.js` + test — frontend mirror of `buildAppendix` (same copy) used by the printable report and the sample demo; 6 vitest cases (shape, version interpolation, empty/undefined fallback, honest-framing no-absolute-claims check, fresh arrays)
- `src/pages/app/AppReportPrintPage.jsx` — printable report renders the two-column Methodology + Limitations appendix before the chain-of-custody strip
- `src/components/SampleReportDocument.jsx` — sample report demo renders the same appendix sections above the disclaimer

### Notes
- Gates: backend reports 20/20 + tsc clean, vitest 340/340, lint 0 errors (10 baseline). PDF spec gains a TJ-aware content extractor (decodes pdfkit's hex glyph runs) to assert the appendix text literally
- This closes the approved MVP feature set — all approved features now shipped (error boundary, PDF export, scan dedup, webhooks UI, evidence appendix)

## [2026-08-08] - Crash-Report Telemetry Endpoint (Real Path)

### Added
- `supabase/migrations/0014_crash_reports.sql` — `crash_reports` table (`client_id` text primary key, `reported_at desc` index for a future admin crash surface)
- `backend/src/telemetry/` — new module: `TelemetryController` (`POST /v1/telemetry/errors`, public + throttled 60/min per the waitlist pattern, `202` on accept), `TelemetryService` (upserts the batch with `onConflict: 'client_id'` so retried flushes are idempotent; throws `503` on any insert error so the client keeps its buffer), `CreateCrashReportsDto` (max 50 records, per-field length caps mirroring `buildCrashRecord`), registered in `app.module.ts`; table name overridable via `SUPABASE_CRASH_REPORTS_TABLE`
- `src/lib/telemetry.js` — `flushErrors()` now ships the buffered records through `api.submitCrashReports` and clears the buffer only on success (empty buffer skips the network call)
- `src/lib/api.js` + `mockApi.js` — USE_MOCK-gated `submitCrashReports` (real → POST, mock → instant resolve)
- `src/lib/telemetry.test.js` — flush tests rewritten against a mocked `submitCrashReports`: success clears buffer, failure keeps buffer, empty skips network
- `docs/engineering/TELEMETRY_CONTRACT.md` — endpoint contract (shape, status codes, backend pipeline, frontend wiring, migration, test map)

### Notes
- Gates: backend telemetry 8/8, tsc clean, frontend telemetry 15/15
- Crash reports survive before Sentry/PostHog land (approved feature #8); the ErrorBoundary already buffers locally, this makes the real path live

## [2026-08-08] - Account Activity Emits Incident Events (Real Path)

### Changed
- `backend/src/account/account.service.ts` — `getActivity` now merges resolved `admin_incidents` rows into the feed as `incident.resolved` system events for the `all`/`system` categories, mapping the exact mock shape: `incident_<id>` ids, `actor_email: 'system'`, the incident's own `severity` (critical/major/minor → Monitoring accordion tones), `resource_type: 'incident'`, `created_at` from `resolved_at || started_at`, and the `summary` post-mortem text. The merged feed is sorted newest-first and paginated in memory (mirroring `mockGetActivityLogs`), and the incidents query is best-effort — a missing `admin_incidents` table (migration 0007 not applied) degrades to the audit trail alone instead of 503ing. `incident.resolved` added to the backend `system` category action set for parity with the frontend tabs
- `backend/src/account/account.service.spec.ts` — spec rewritten for the merged-feed contract (18 tests): audit/incident query scoping, merge order + pagination slicing across the audit/incident boundary, category gating (incidents only for all/system), missing-table degradation, hard-failure 503, clamping, and custom table names
- `docs/engineering/ACCOUNT_ACTIVITY_CONTRACT.md` + `src/lib/mockApi.js` comment — contract updated: incident events documented in the category semantics + response shape, stale 'incidents are mock-only' note removed

### Notes
- This closes the last mock/real parity gap on the Activity page — real and mock feeds now emit the same incident events

## [2026-08-08] - Webhooks UI — Approved MVP Feature

### Added
- `src/pages/app/AppWebhooksPage.jsx` — new `/app/webhooks` surface: endpoint list with events badges + delivery health, reveal-once signing secret banner (copy via shared clipboard helper), create-endpoint drawer (name / destination URL / event checkboxes with validation), delivery-log drawer (HTTP status tones, latency, relative timestamps, response body), test-ping with toast feedback, pause/resume + rotate-secret + delete flows, `?state=` demo forcing, and ⌘K commands (create, test-first, toggle)
- `src/lib/webhookPresentation.js` + `src/lib/webhookPresentation.test.js` — pure helpers: event meta fallback, endpoint status tones, delivery HTTP-status tone map (2xx success / 4xx warning / 5xx error / boundary neutral / invalid → 'No response'), and a zero-denominator-guarded `failureRate` — 12 vitest cases
- `src/lib/mockData.js` — `mockWebhooks` (4 endpoints), `WEBHOOK_EVENTS` catalog, `mockWebhookLimits`, and per-endpoint `mockWebhookDeliveries` logs
- `src/lib/mockApi.js` — `mockGetWebhooks` / `mockCreateWebhook` (reveal-once secret) / `mockUpdateWebhookStatus` / `mockRotateWebhookSecret` / `mockDeleteWebhook` / `mockTestWebhook` / `mockGetWebhookDeliveries`, with the same delay/error-injection conventions
- `src/lib/api.js` — USE_MOCK-gated real paths for all seven webhook functions (REST conventions matching `/api-keys`; backend slice can implement behind the same gate)
- `src/App.jsx` route + `AppShellLayout.jsx` Developer-group sidebar entry

### Notes
- Gates: lint 0 errors (10 baseline), vitest 12/12 for the new helper suite, live-verified in the preview
- Remaining approved MVP features: evidence appendix in reports

## [2026-08-08] - Server-Side Report PDF Export Wired Into the UI

### Added
- `src/lib/reportPdfDownload.js` — shared Export PDF action wrapping `api.exportReportPdf`: mock mode returns `{ kind: 'mock', printPath }` (caller keeps the browser-print flow); real mode fires the blob download through a temporary anchor (`triggerObjectUrlDownload`, object URL revoked after 1s) and returns `{ kind: 'download', filename }`
- `src/lib/reportPdfDownload.test.js` — 5 vitest cases (jsdom): mock passthrough with no DOM touch, single anchor download + filename, object-URL revocation timing, error propagation, anchor mechanics
- `docs/engineering/REPORT_PDF_CONTRACT.md` — the endpoint contract (auth/throttle/headers/status codes), the backend pipeline (controller → service → `report-document` → pdfkit), the frontend wiring, and the test map

### Changed
- `src/pages/app/AppReportPrintPage.jsx` — Export PDF button now downloads the **server-generated PDF** (`GET /reports/:id/pdf`) in real mode; the print-dialog flow (toast.info → deferred `window.print()` → afterprint toast) remains the mock-mode fallback; signal rows use the same stable key fallback (`signal_id || model || label || signal_category`) as the report detail, clearing the pre-existing duplicate-key warning on this surface too
- `src/pages/app/AppReportsPage.jsx` — Export PDF button + ⌘K `reports.export-pdf` command route to `downloadReportPdf`: real mode downloads directly with success/error toasts; mock mode navigates to the printable view (unchanged behavior)

### Notes
- The backend endpoint already existed (pdfkit generator + controller route + e2e coverage in `scans-flow.e2e-spec.ts`); this slice closes the gap where no UI surface consumed `exportReportPdf`, so real-mode exports no longer rely on the browser print dialog
- Public sample print page stays on browser print (no backend scan row for sample content)

## [2026-08-08] - Scan Deduplication (Hash-Based) — Approved MVP Feature

### Added
- `supabase/migrations/0013_scan_dedup.sql` — `file_hash_sha256` column on `public.scans` + partial index `scans_user_hash_complete_idx` (user_id, hash) filtered to completed rows for indexed equality lookups
- `backend/src/scans/scans.service.ts` — worker-side dedup on submit: SHA-256 of the uploaded asset, `findCompletedScanByHash` best-effort lookup (skips gracefully when migration 0013 isn't applied), and `buildDeduplicatedPayload` which reuses the prior scan's result payload with a regenerated report identity + `deduplicated_from` marker
- `backend/src/scans/scans.service.spec.ts` — 4 spec tests: dedup hit returns the reused payload, miss returns null, missing-column gracefully degrades, and payload regeneration carries the `deduplicated_from` marker
- `src/lib/mockApi.js` — mock parity: pseudo-hash (FNV-1a) written on every mock scan record, `mockSubmitScan` dedup hit/miss, and a dev-only `?dedup=1` seam (mirrors `?quota=exhausted`) that completes the next submission instantly with a reused payload
- `src/pages/app/AppUploadsPage.jsx` — handles the deduplicated submit response: toast ('This file matched a prior verification…'), reused-report panel state, and auto-nav straight to the reused report instead of the queue
- `src/pages/app/AppReportsPage.jsx` — report detail shows a 'Reused from' badge via `result_payload.deduplicated_from`; signal rows now use a stable key fallback (`signal_id || model || label || signal_category`) which clears a pre-existing duplicate-key console warning on every completed report detail

### Changed
- Docs marked shipped: `current-feature-status.md`, `MASTER_DEVELOPMENT_ROADMAP.md`, `PHASE_TASK_LIST.md`, `what-is-in-development.md`, `CURRENT_IMPLEMENTATION_STATUS.md` — remaining approved MVP features are webhooks UI + evidence appendix

### Notes
- Dedup is scoped to the owning user (same user + hash on a completed scan), so identical files across different users still reprocess — no cross-tenant reuse

## [2026-08-08] - Public Sample Report PDF Export Treatment

### Changed
- `src/pages/SampleReportPrintPage.jsx` — `/sample-report/print` now gets the full app-side Export PDF treatment: a charcoal **Export PDF** button (download icon, `ui-focus-ring`) in the `print:hidden` toolbar, `document.title` set to `Provance sample report PRV-20260716-041` on mount and restored on unmount, and the toast loop (toast.info 'Opening print dialog' → deferred `window.print()` → afterprint listener → toast.success 'PDF export complete'), firing only for button-initiated exports; the decorative 'Print-ready document' hint is hidden below `sm` so the button never crowds on mobile
- `src/components/SampleReportDocument.jsx` — the `showPrintControls` strip button now accepts an `onExport` prop (falls back to `window.print()`), so both the toolbar and the in-document strip route through the same toast flow
- `src/index.css` — the `@media print` `break-inside: avoid` rule now also covers `.report-paper article/section` (the sample document's class), matching the `.print-sheet` treatment so sample report panels don't split mid-card

### Notes
- Gates: lint 0 errors (10 baseline warnings), vitest **315/315**, live-verified in the preview (toast.info → print → afterprint → toast.success all fire; title correct)

## [2026-08-08] - Admin Monitoring Unit Spec (getMonitoring)

### Added
- `backend/src/admin/admin.service.spec.ts` — `AdminService.getMonitoring` describe block (6 tests) using the plan-based mock client (extended with `.storage.from().list()` for the storage probe) and a frozen clock:
  - Full-precision bucket test: queue_health (`queued`/`in_flight`/`failed_24h`/`throughput_per_hour` at the inclusive `<= HOUR_MS` boundary/`avg_processing_time_ms`/`failure_rate`), the 12-hour hourly series and 14-day daily series (Map-derived indices, matching the getAnalytics precedent), storage totals (5 GB / 500 GB capacity), overall `uptime_30d`, `checks_24h`, `open_incidents`, worker-degraded-vs-queue-operational statuses, incident pass-through, and frozen-probe `db_performance` zeros
  - Worker status matrix: idle-no-backlog → operational, backlog + recent activity (completion 5 min before the frozen clock) → operational, stale backlog → degraded
  - Probe-failure semantics: storage probe failure → storage `degraded` + overall `unreachable`; db probe failure → api/database `unreachable` + overall `unreachable`
  - Storage-null case: zero/absent `file_size_bytes` (`Number() || 0` guard) → `storage_utilization` null while queue buckets still flow, plus the zero-completion `failure_rate` div-by-zero guard

### Notes
- Gates: admin spec **37/37**, full backend jest **200/200** (15 suites), `tsc -p tsconfig.build.json` clean (the `backend/test/` e2e tsc errors are pre-existing at HEAD, untouched)

## [2026-08-08] - ChartHoverReadout Primitive (Shared Readout + Axis Labels)

### Added
- `src/components/ui/ChartHoverReadout.jsx` — two reusable chart-markup primitives extracted from TrendChart:
  - **ChartHoverReadout** — the `aria-live` readout strip (bold label · colored items, or idle hint) with `size` default (`mb-3 mt-3 h-6`) vs `compact` (`mb-2 h-5`) variants, so the verdict/queue charts stop re-declaring the font-mono strip classes
  - **ChartAxisLabels** — the HTML axis-label overlay (crisp y-grid labels from the viewBox percentages + every-other x labels with an `xLabelX` bar-center anchor override); documented coupling: expects the shared-PAD geometry (queue panels' custom QUEUE_PAD stays on its own simple hour row)
- Both exported from the ui barrel; `ChartHoverReadout.test.jsx` (8 tests) locks the exact default/compact class strings, aria-live contract, label/hint/item rendering, y-label PAD width, and the x cadence + anchor override

### Changed
- TrendChart, StackedBarChart, and both queue panels (AnalyticsPage + MonitoringPage) migrated onto the primitives — class-identical output verified live in the DOM (all three readout strips render with the original class strings)

### Notes
- Gates: vitest **315/315**, lint 0 errors, production build passes

## [2026-08-08] - TrendChart Hover Interaction Tests

### Added
- `src/components/ui/TrendChart.test.jsx` — 6 RTL/jsdom tests locking in the transparent hit-rect hover contract: default readout before hover, first-cell hover updates readout + guide line for index 0 (regression: first cell starts at `PAD.left` so the first point is never in a dead zone), last-cell hover for the final point (cell ends at the plot right edge), hover travel between cells moves the readout, mouseleave resets it and removes the guide line, and the empty state renders no SVG/hit cells
- Full-prefix readout regexes (e.g. `/Jul 1·10 scans/`) so each assertion independently proves the hovered index without relying on a second assertion to disambiguate from a neighbor (bare `/Jul 1/` would also match "Jul 10"/"Jul 11")

### Notes
- Dates use noon-UTC timestamps matching the existing formatter-suite convention (safe across UTC−12…+11, covering all realistic CI timezones)
- Gates: vitest **307/307**, lint 0 errors

## [2026-08-08] - Grouped Chart Hit-Area Migration (No-Dead-Zone Hover Everywhere)

### Added
- `buildGroupedHitAreaCells(pointCount, groupW, { plotLeft, plotRight })` in `src/components/ui/chartGeometry.js` — the grouped analogue of `buildHitAreaCells` for bar charts: one full slot-width cell per bar, tiled edge-to-edge across the plot so no bar (including the first and last) falls in a dead zone. Bounds parameter lets charts with their own viewBox (the queue panels' `QUEUE_CHART_W`/`QUEUE_PAD`) align cells with their bars
- 6 new `chartGeometry.test.js` cases for the grouped helper: edge-to-edge tiling, first/last bar coverage, one-bar series, in-bounds for any count, determinism, and **custom plot-bounds coverage** (the case that would have caught the +26-unit QUEUE_PAD shift)

### Changed
- `StackedBarChart` (verdict mix chart) now computes hover cells via the shared `buildGroupedHitAreaCells` instead of inline rect math
- `AnalyticsPage` `QueueThroughputPanel` and `MonitoringPage` `QueueHealthPanel` hourly bar charts gained the full hover treatment — hover readout (hour + processed count), guide line, outlined bar, and transparent hit cells that overlap the drawn bars (`y = barBaseY - barAreaH`, custom bounds for the QUEUE viewBox)

### Fixed
- Both queue panels' hit cells were initially placed above the bars (y 16–80 vs bars at 136–200) and the MonitoringPage cells used the shared PAD while its bars used `QUEUE_PAD` (left 8) — a +26-unit shift that recreated the first-bar dead zone. Both are corrected and covered by the custom-bounds test

### Notes
- Gates: vitest **301/301**, lint 0 errors, production build passes. Live-verified in the browser: hovering the first bar's leftmost edge on both admin panels triggers the correct hourly readout

## [2026-08-08] - Frontend Completion Sign-Off: 28/28 Pages Verified

### Changed
- Marked the frontend **100% complete** across the state docs after the final sign-off audit re-verified every workspace and admin route (`?state=` demo forcing, ⌘K commands, and loading/empty/error states on all surfaces)
- `docs/project-state/current-feature-status.md` — "Frontend completion (all surfaces)" now reads **28/28 pages** (16 user workspace + 12 admin), with all 12 admin pages closed out (Overview, Waitlist, Users, Organizations, Feature Flags, Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings)
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` + `docs/project-state/engineering-roadmap.md` — Phase 3 status updated to user workspace **16/16** + admin **12/12**, noting only backend slices and the approved feature set remain
- Consistency pass on `docs/project-state/what-is-in-development.md`, `docs/project-state/development-priorities.md`, and `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` (stale 15/15 counts corrected to 16/16)

### Notes
- Verified by the 2026-08-08 sign-off audit: 28/28 pages pass with `?state=loading|empty|error`, ⌘K commands, and empty/error states; print view + access-denied page are justified exemptions (print document surface / static guard page)
- Docs-only change — no code or tests touched

## [2026-08-08] - Admin Analytics Bucket Precision Tests

### Added
- Two frozen-clock precision tests in `backend/src/admin/admin.service.spec.ts` (`AdminService.getAnalytics`) that seed a mocked scans table with known verdict/status/timestamp rows and assert the aggregation buckets **exactly**:
  - **verdict_trend / volume_trend** — 14-day series rebuilt from the same day-key math, seeded with authentic/suspicious/inconclusive completes across three days plus failed/queued/processing rows; KPIs pinned at `scans_today=6`, `scans_7d=7`, completion/failure/suspicious rates 4/7, 1/7, 1/7
  - **queue_throughput** — hourly 12-bucket series (T11 + T05 = 1), `processed_last_hour=1` (exactly-1h row), `processed_24h=3` (1h/6.5h/exactly-24h rows), 25h row excluded, `queue_depth=2`/`in_flight=3` from the head-count queries, and `avg_processing_time_ms=75000` from the updated−created latency proxy
- Clock pinned via `jest.spyOn(Date, 'now')` in a `try/finally` (restores even on plan-exhaustion throws); boundary semantics (≤ inclusive at exactly 1h/24h) genuinely exercised

### Notes
- Expected arrays use hardcoded counts at computed indices so the tests cannot pass against a broken implementation; date-label format pinned independently
- Gates: backend jest **194/194** (31 in admin spec), `tsc -p tsconfig.build.json` clean

## [2026-08-08] - Scans API E2E Coverage (Validation, Contract, Queue Enqueue)

### Added
- `backend/test/scans-api.e2e-spec.ts` — 12 e2e tests following the `scans-flow.e2e-spec.ts` conventions (stateful in-memory Supabase mock, global v1 prefix, whitelisting ValidationPipe + GlobalExceptionFilter, guard override):
  - **POST /scans validation** — media-type `IsIn` 400, service MIME allow-list 400, `MAX_UPLOAD_BYTES` size gate 400, `Min(1)` 400, unknown processing-mode 400, and whitelist + `forbidNonWhitelisted` 400s — each asserting `scans.size === 0` (nothing persisted)
  - **Signed-upload contract shape** — full initiate body (`bucket`/`path`/`token`/`signedUrl`), exact storage path `${userId}/${scanId}/filename`, persisted row with team scoping + `processing_mode` default
  - **Submit pre-flight** — 400 when the asset is missing (row stays `awaiting_upload`, nothing enqueued) and 404 for unknown scan ids
  - **Queue enqueue path** — with Redis configured (`isConfigured: true`), submit calls `enqueueScanProcessing(scanId)` and the scan stays `queued` (no inline fallback); with Redis absent, no enqueue and the inline fallback drives the scan to `completed`

### Notes
- Queue behavior is a per-`describe` switch (`boot(queueConfigured)` helper) — no dual-app booting inside a test
- Complements the existing `scans-flow.e2e-spec.ts` (lifecycle/PDF/report) and the analysis-pipeline unit suite
- Gates: e2e **41/41** (4 suites, 12 new), `tsc -p tsconfig.build.json` clean

## [2026-08-08] - Scan Analysis Pipeline Unit Tests

### Added
- `backend/src/scans/analysis-pipeline.spec.ts` — 15 unit tests for the analysis pipeline against **deterministic Jimp-generated image fixtures** (seeded mulberry32 noise JPEG/PNG + a hand-crafted PNG with a `tEXt` "c2pa" chunk): clean JPEG with mocked EXIF capture metadata → `likely_authentic`; EXIF-stripped PNG → `inconclusive`; header-mismatch file (PNG bytes declared JPEG) → `suspicious` with an integrity `warning`; C2PA-marker PNG → provenance signal `clear`; and real SHA-256/MD5 fingerprint assertions on the fixture bytes
- Direct `buildVerdict` threshold lock tests: baseline → `likely_authentic`, each penalty in isolation → `inconclusive`/`suspicious`, the clamp at 0.9, and the IEEE-754 boundary behavior (0.18+0.12+0.05+0.10 accumulates to 0.44999999999999996 → stays `inconclusive` under the strict `<`; adding blockiness crosses to `suspicious`)

### Changed
- `backend/src/scans/scans.service.ts` — `buildVerdict` exported (was module-private) as a documented test seam; no behavior change

### Notes
- `exifr.parse` is stubbed (Jimp cannot write EXIF segments); format detection, fingerprints, image stats, C2PA scan, and verdict all run on real bytes. JPEG quality pinned to 92 so encoded bytes (and decoded stats) stay stable across jpeg-js upgrades
- Gates: backend jest **192/192** (15 new), `tsc -p tsconfig.build.json` clean

## [2026-08-08] - Scan Upload & Queue Round-Trip Contract Doc

### Added
- `docs/engineering/SCAN_UPLOAD_CONTRACT.md` — the full initiate → signed-URL upload → submit → queue → worker → complete lifecycle: endpoint table (`POST /scans`, `POST /scans/:id/submit`, `GET /scans`, `GET /scans/:id`, `GET /scans/queue-snapshot`, `GET /reports/:id` + `/pdf`), the `scan_status` state machine, env-var reference (Supabase trio, `REDIS_URL`, `MAX_UPLOAD_BYTES`, `ALLOWED_UPLOAD_MIME_TYPES`, queue names), the inline-fallback behavior when Redis is unset, the schema dependency on migrations 0002 + 0009 (with the actionable 503 hint when 0009 is missing), and step-by-step local worker run instructions for a live demo

### Notes
- Written against the real implementation (`backend/src/scans/`, `backend/src/queue/`, `backend/src/worker.ts`, `src/pages/app/AppUploadsPage.jsx`, `src/lib/api.js`) and the `ORGANIZATION_API_CONTRACT.md` doc conventions
- Docs-only change — no code touched, no build/test gates apply

## [2026-08-07] - Final Frontend Sign-Off Sweep (v5 Checklist)

### Verified
- **Mechanical per-file audit** of all 28 page files in `src/pages/app/` + `src/pages/admin/` against the three sign-off criteria: `?state=` demo forcing (`useDemoState`/`withDemoOverride`/`useDemoStateControl`) — **26/26** pages; ⌘K commands (`useRegisterCommands`) — **26/26**; empty/error-state coverage — **26/26**. The only N/A screens are the print view and access-denied (no data-loading surface). Counts moved up from the v3 checklist (24) because Uploads, Account, and Team gained commands + demo dressing
- The seven pages that don't import `EmptyState` directly (History, Queue, Team, admin Analytics, Feature Flags, Monitoring, Settings) individually verified to delegate to the DataTable/Card/panel loading·empty·error surfaces — each carries status/loading/error/emptyTitle/emptyDescription markers
- **Live spot-checks** (Preview): `/app/admin/reports?state=empty&noisy=0` → "No reports generated yet" + DEMO STATE · EMPTY banner; `?state=error&noisy=0` → forced-error panel + Retry + DEMO STATE · ERROR banner; console clean
- **Documented the noise interaction**: mock random transient errors can race a forced state, so the sign-off checklist now instructs `&noisy=0` for clean forced-state screenshots

### Changed
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` — revised to **v5 FINAL**: verdict table refreshed (26/26 for all three criteria + 2 N/A), Confirmed By updated with the mechanical-audit method + live spot-checks, quality gates corrected to the current numbers (vitest **295/295**, lint 7w/0e, build clean)

### Notes
- One vitest flake observed mid-run (294/295 once, timing-sensitive) — green 295/295 on re-run; flagged for future triage if it recurs
- Gates: vitest 295/295, lint at baseline (7w/0e), production build clean (4.88s)

### Changed
- `docs/project-state/current-feature-status.md` — new **"Frontend completion (all surfaces)"** row: 27/27 pages shipped and verified (15 user workspace + 12 admin), each with loading/empty/error states, `?state=` demo forcing, and ⌘K commands; explicitly states no frontend slices remain and active work is exclusively backend integration + the approved feature set
- `docs/project-state/engineering-roadmap.md` — date refreshed to 2026-08-07; Phase 3 status tightened to "frontend **100% complete** (15/15 user + 12/12 admin pages shipped and verified); only backend slices and the approved feature set remain"
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` — date refreshed to 2026-08-07; **Phase 2 resolved from In Progress → Completed** (drift fix — engineering-roadmap already listed it Completed, and the frontend foundation it covers is fully shipped); Phase 3 status + Immediate Active Phase now name the 12-admin-page close-out (Overview, Waitlist, Users, Organizations, Feature Flags, Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings) with no frontend slices remaining
- `docs/engineering/PHASE_TASK_LIST.md` — date refreshed to 2026-08-07; Admin Workspace section gains an explicit "all 12 admin pages shipped and verified" line; formatter-suite count corrected from 63 → 113 tests (295/295 vitest total)

### Notes
- All four docs already recorded the admin pages as built; this pass closed the loop with explicit frontend-100% framing, resolved the Phase 2 status drift, and removed stale dates — docs-only change, no code touched

### Added
- `backend/test/organization.e2e-spec.ts` — HTTP-level e2e spec for the full organization surface following the scans-flow conventions (full `AppModule` boot, `v1` prefix + whitelisting `ValidationPipe` + `GlobalExceptionFilter`, `SupabaseAuthGuard` overridden to inject the test user, `QueueService` stubbed):
  - **GET /v1/organization** — full payload mapping (profile seatsUsed, teams, members with profile join, pending invites) + 404 when the caller has no membership
  - **POST /v1/organization/invites** — creation with the requested team (stored row + follow-up GET surfaces the pending invite), first-team default, **seat-limit 400**, already-a-member 400, already-pending 400, member-caller 403, and DTO validation 400s (bad email, `owner` role, non-UUID team) with an `invites.size === 0` guard proving rejection happens before the service
  - **PATCH members/:id/role** — promote-to-admin (stored row flipped), owner-protection 400, missing-member 404
  - **PATCH members/:id/team** — reassignment (stored row flipped), unknown-team 400, owner-protection 400, non-UUID teamId 400
  - **DELETE members/:id** — roster removal (row gone + GET confirms), owner-protection 400
  - **DELETE invites/:id** — cancel (status → `cancelled`, dropped from pending list), 404 for foreign invites, member-caller 403
- A **stateful in-memory Supabase mock** (members/orgs/teams/invites Maps) that mirrors the service's query order and DB defaults (`single()` commits inserts with `id`/`status: 'pending'`/`created_at`; count-head queries resolve `{ count }`; update/delete thenables mutate stored rows). It faithfully reproduces `resolveTeam`'s chain-reuse quirk: a strict teams id miss flags `teamsStrictMiss`, and `order()` (the first-team fallback marker) drops the stale id only under that flag — so strict lookups (`getTeamOrThrow`) still 400 on unknown teams while the fallback resolves the org's first team

### Notes
- run with `npm --prefix backend run test:e2e`; e2e suite now **29 tests across 3 suites** (8 existing + 21 new); backend `tsc -p tsconfig.build.json` clean; reviewer nits applied (narrowed `order()` guard, invite assertion keyed by email instead of insertion order, guard-override comment explaining authz comes from the seeded membership row, `ResolvedResult` rename)

### Added
- `src/pages/admin/ReportsPage.jsx` — the admin Reports surface now carries the full team-scoping treatment used across the workspace + admin Users/Organizations/Analytics views: a **TeamFilter** (chips with live per-team counts + one-click Copy link) backed by the shared `useTeamFilterParam` (`?team=` URL scoping, shareable/linkable), a **new Organization column** on the report table, an **Organization row in the Inspect drawer**, and a **"X scoped" badge in the header meta** when a team is active. The Team column switched to the shared `TeamBadge`; `clearFilters` (button + ⌘K) now also resets the team
- `src/lib/mockData.js` — `mockReports` gained `user_id` + `org_id` (team_id already rode the same user rotation as mockScans), so every report's team/org attribution is present and filterable in mock mode
- `src/lib/mockApi.js` — `mockGetAdminReports({ team })` filters by team server-style, matching `mockGetAdminUsers` (API-client parity; the page still fetches the full feed and filters client-side like UsersPage)

### Changed
- `backend/src/admin/admin.service.ts` — `listAdminReports` now selects `user_id`/`team_id` alongside the report payload, accepts an optional `?team=` filter (applied to the data + count query), resolves each report's org via the membership table (single-org assumption) **and** the org's name from the organizations table, and `toReportView` carries `user_id`/`team_id`/`org_id`/`org_name` — so the Organization column renders real names in both mock and real modes (getAnalytics precedent)
- `backend/src/admin/admin.controller.ts` — `@Query('team')` wired into `GET /admin/reports` (behind AdminGuard + throttle)
- `backend/src/admin/admin.service.spec.ts` — 4 new `listAdminReports` tests: org/team attribution via membership + org-name lookup (3-chain plan), team-filter eq on the reports query, `'all'` sentinel producing no team clause, and the select-column contract (`team_id`/`user_id` present in the select); suite now **29/29** in the admin spec, **177/177** backend total

### Verified
- Live (Preview, admin test account): `/app/admin/reports?team=team_legal` → "LEGAL & COMPLIANCE SCOPED" badge, chip counts 15/4/5/6, exactly 4 Legal rows with LEGAL badges + "Provance Internal" org; Inspect drawer shows both Team and Organization rows; clicking the Product chip rewrites the URL to `?team=team_product` with 5 PRODUCT rows; unscoped view restores all 15 + no scoped badge, org column showing multiple org names
- Gates: backend **177/177** jest + `tsc` clean, frontend **295/295** vitest, lint at baseline (7w/0e), production build clean

## [2026-08-07] - Real Team Scoping In The Backend

### Added
- `supabase/migrations/0012_profiles_team.sql` — `profiles.team_id` (uuid FK to `public.teams`, on delete set null) + index; backfill from `organization_members` (distinct on user_id, active members only, earliest `created_at` wins) so existing rows gain a team without manual data work
- `backend/src/admin/admin.service.ts` — `listUsers` now resolves and returns each user's `team_id` (profile column first, membership fallback) and accepts an optional `team` filter applied to **both** the data and count queries; `getAnalytics({ team })` scopes only the top-organizations accounting to the team (mirroring the mock + UI semantics — KPIs/trends/queue stay global, matching how the page labels only the top-orgs panel as scoped) and returns a `team_breakdown: [{ team_id, scans }]` array computed from the full 30-day unscoped window
- `backend/src/admin/admin.controller.ts` — `@Query('team')` wired into `GET /admin/users` and `GET /admin/analytics` (behind AdminGuard + throttle)
- `backend/src/admin/admin.service.spec.ts` — team-filter tests for `listUsers` (eq applied to data + count chains, `'all'` sentinel produces no clauses) and `getAnalytics` (org accounting scoped, KPIs untouched, `team_breakdown` shape); chainable mock gained `gte`/`eq` support; suite now **26/26** in the admin spec, **174/174** backend total

### Changed
- `src/lib/api.js` — real paths now forward query params: `getAdminUsers({ page, pageSize, team })`, `getAnalytics({ team })`
- `src/lib/mockApi.js` — `mockGetAdminUsers` filters rows by `team_id`; `mockGetAnalytics({ team })` recomputes the scoped top-org list from `mockScans` (user → org resolution) and returns `team_breakdown`, keeping mock/real payload parity
- `src/pages/admin/AnalyticsPage.jsx` — the local `mockScans`/`mockUsers` join (`userOrgByTeam`) replaced by server-scoped data: the top-orgs table refetches when the `?team=` filter changes, and the TeamFilter chips' counts come from the payload's `team_breakdown`

### Verified
- Live (Preview, admin test account): `/app/admin/analytics?team=team_legal` → "LEGAL SCOPED" label, chip counts 25/5/10/10 from `team_breakdown`, top-orgs table scoped to Legal's 5 scans (40% share) while KPIs stay global (47 scans today); unscoped view restores all 5 ranked orgs; `/app/admin/users?team=team_legal` → exactly 2 Legal rows (Joshua, Amina) with TeamBadges
- Gates: backend **174/174** jest, frontend **295/295** vitest, lint clean, production build clean

## [2026-08-07] - Admin Team-Scoped Organizations (Linkable ?team=)

### Changed
- `src/pages/admin/OrganizationsPage.jsx` — team scoping added via the shared `useTeamFilterParam` (URL-backed, same pattern as UsersPage): a **Teams column** on the org table (distinct member-team badges, derived from mockUsers since orgs have no `team_id`), a **TeamFilter** control above the table (counts = orgs per team), filtered rows (orgs containing the selected team), a "Showing orgs with {team} members" Badge, team-aware DataTable empty states, and a **Team column on the drawer's Members tab** — which also respects the active team filter (with a scoping note) so the drawer stays coherent with the scoped table

### Notes
- Admin views are now linkable: `/app/admin/organizations?team=team_legal` and `/app/admin/users?team=team_legal` restore the filter on load, matching the workspace `?team=` convention
- UsersPage already carried the full team scoping from a prior session (verified intact)
- `src/pages/admin/adminTeamPages.render.test.jsx` (new) — 2 render smokes for Organizations + Users with `?team=` in MemoryRouter so derivation regressions fail CI
- Live-verified: Organizations `?team=team_legal` → Legal pressed (count 1), 1 row (Provance Internal with LEGAL/PRODUCT/GROWTH badges), SHOWING badge; drawer Members shows "Showing Legal & Compliance members" with the 2 Legal rows; Users `?team=team_legal` → 2 Legal rows
- Full suite **243/243**; lint 0/0; build clean

## [2026-08-07] - Team-Aware Scan-Volume TrendChart

### Added
- `useTeamScoping` now returns `volumeTrend` — a 14-day `[{ date, scans, completed, failed, suspicious }]` series recomputed from the scoped scan ledger (local-midnight daily buckets), matching the TrendChart data contract; null when no team is active; **zero-filled** for an empty team so the chart shows honest zeros instead of falling back to global volume (deliberately unlike teamKpis)

### Changed
- `AppDashboardPage` — the scan-volume TrendChart is team-aware: when a team filter is active it renders the recomputed series with a **"Team-scoped · {team}"** badge, a team-aware description, loading/error state tracking the scans resource, and a Retry that reloads the correct source (`scans.reload` when scoped)

### Tests
- `useTeamScoping.test.jsx` +3: null when unscoped; 14-bucket math for a scoped team (day-located assertions, midnight-straddle-proof); zero-fill for an empty team

### Notes
- Reviewer catches fixed: the chart's error Retry now targets `scans.reload` when scoped (was always `analytics.reload`); the team-aware emptyDescription was dead code under zero-fill and was removed with a NOTE
- Full suite **241/241**; lint 0/0; build clean; live-verified: `/app?team=team_legal` → "TEAM-SCOPED · LEGAL & COMPLIANCE" + "Scans (0)" legend (mock scans predate the 14-day window — honest zeros), `/app` → "Scans (738)" + no badge, and the `?state=error` chart panel renders with Retry

## [2026-08-07] - Shared useTeamScoping Hook

### Added
- `src/lib/useTeamScoping.js` — extracts the dashboard's team-scoping memo chain (teamCounts / filteredScans / teamKpis / kpi·kpiLoading·kpiError) behind one hook that also owns the URL-backed `?team=` filter; `analytics` is an optional fallback resource (dashboard-only)
- `src/lib/useTeamScoping.test.jsx` — 5 tests (renderHook + MemoryRouter): default "all" scope with analytics fallback, `?team=` scoping with recomputed KPIs, empty-team fallback, empty data, and loading/error derivation switching
- `src/pages/app/workspacePages.render.test.jsx` — 4 render smokes for the hook's consumers (Reports, Queue, History, Dashboard) so mount-order regressions fail CI

### Changed
- `AppDashboardPage` — local teamName/teamCounts/teamScans/teamKpis/kpi memos replaced by one `useTeamScoping({ scans, analytics })` call (behavior parity)
- `AppReportsPage` + `AppQueuePage` — duplicated teamCounts/filtered memo chains replaced by the hook; Queue additionally gets team-scoped queue posture (StatCards + MiniStats + "Live queue · Team" title + footnote) via teamKpis
- `AppHistoryPage` — team scoping **added**: TeamFilter, Team column (TeamBadge), filtered rows, team-aware empty states

### Notes
- A TDZ bug (hook called before `scans` was declared on Reports) was caught during live verification and fixed; the new render smoke prevents that class of regression
- Preserved parity quirk (reviewer-flagged): a scoped team with zero scans falls back to global analytics KPIs — same as the original dashboard behavior
- Full suite **238/238**; lint 0/0 on touched files; build clean; live-verified `?team=` scoping on all four pages

## [2026-08-07] - Mock Noise Kill-Switch (?noisy=0)

### Added
- `src/lib/mockNoise.js` — dev-only kill switch for the mock API's random error injection (`maybeError`): `?noisy=0` in the URL and/or `localStorage['provance.mock.noisy.v1'] = '0'` suppress the simulated transient errors, so interactive demos (team filter, upload loop, admin actions) run without random state resets; inert in production builds via the `import.meta.env.DEV` gate, matching the `?state=`/`?quota=` precedent
- `src/lib/mockNoise.test.js` — 7 tests: default-on, `?noisy=0`/`1`/empty, coexistence with `?state=`/`?team=`, storage flag + removal, `setNoiseDisabled` round-trip, and `vi.stubEnv('DEV', false)` proving prod-inertness
- `src/lib/mockApi.js` — `maybeError()` early-returns when noise is disabled (single choke point, no per-endpoint changes); header documents the flag

### Notes
- Live-verified via the dev server: `/app?noisy=0` → `isNoiseDisabled()` true with the dashboard rendering clean; storage toggle round-trip confirmed; clean URL → noise re-enabled
- Full suite **229/229**; oxlint clean on the new files (the `mockWaitlist` unused-import warning in mockApi.js is pre-existing and untouched)

## [2026-08-07] - Tabs Primitive Component Tests

### Added
- `src/components/ui/Tabs.test.jsx` — 8 vitest component tests (@testing-library/react + user-event) for the Tabs primitive: labelled tablist + first-selected default + roving tabindex, `aria-controls` panel contract, uncontrolled click selection, controlled mode (`onChange` + value reflection), arrow-key/Home/End navigation with wrap-around, disabled tabs not selectable on click, badge in the accessible name, pill-variant container classes
- Closes the last named primitive gap: Button (as-link), Badge (tones), Card (states), DataTable, and Tabs now all have specs in `src/components/ui/`

### Notes
- The disabled-tab keyboard quirk (arrow nav selects by index without skipping disabled items) is intentionally not asserted and documented in the spec
- Full suite now **222/222** (ui dir 66 tests); oxlint clean on the new file

## [2026-08-07] - CI Smoke Gate for Built Frontend

### Added
- `scripts/smoke.sh` — smoke-tests the built app: boots `vite preview` against `dist/`, curls `/`, `/benchmark`, `/app`, `/app/admin` asserting 200 + non-empty SPA shell with `#root` mount, and verifies the hashed JS bundle from `index.html` actually serves. Fails the build with `::error::` annotations on blank-page/asset regressions. Launches the vite binary via node directly so the job PID is the server (avoids a Git Bash process leak from the npm/cmd shim on Windows); `PORT` env overrides the port
- `package.json` — `check:smoke` script (`bash scripts/smoke.sh`)
- `.github/workflows/ci.yml` — frontend job now runs `npm run check:smoke` after Build, failing the job on non-zero exit

### Notes
- Validated locally: positive path (fresh build → 4 routes + bundle OK, exit 0, no port leak) and negative path (server returning a shell without `#root` → `::error::/ missing #root mount — blank-page regression`, exit 1)
- Scope note: curl cannot exercise the client-side session, so `/app` is verified as the SPA shell it serves pre-auth; the shell/asset checks catch the blank-page regressions a curl gate can. A browser-based test (e.g. Playwright) would be the only way to assert the post-sign-in rendered page

## [2026-08-07] - Full Frontend Route Walk Sign-Off

### Verified
- Walked every route in `App.jsx` live in the Preview (mock mode) with per-route render checks — **56/56 routes render clean**: 20 public, 18 user workspace, 13 admin (incl. the `/overview` → `/app/admin` redirect), `/ui-kit`, and the 404 fallback
- Auth guard confirmed: `/signin` redirects to `/app` when a session exists; console clean throughout (no React errors, no error-boundary triggers)
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` — added §6 “Full Route Walk — Final Confirmation” and updated §7 Confirmed By

## [2026-08-07] - Legacy Admin Primitive Migration Complete

### Changed
- `src/pages/admin/AnalyticsPage.jsx` — the top-organizations table migrated from the legacy `AdminTable` to the `DataTable` primitive: `TOP_ORG_COLUMNS` `label` → `header`, per-column `sortable` with the primitive's internal sort state (dropped the manual `orgSort` state + `handleOrgSort` + `sortedTopOrgs` memo), rows passed through in natural order

### Archived (now dead legacy admin components)
- `src/archive/legacy-admin/` — `AdminTable`, `AdminDrawer`, `AdminSearch`, and the admin `StatCard` moved here with a README (all 0 consumers after the AnalyticsPage migration); `admin/index.js` exports trimmed to the kept components; `HealthCheckRow` was **kept** (still consumed by `SystemHealthPanel`/`QueueSnapshotPanel`)

### Notes
- Organizations + Feature Flags were already on the ui primitives (prior session); this final sweep closed the last `AdminTable` consumer. Verified: **zero** legacy `AdminTable`/`AdminDrawer`/`AdminSearch`/admin-`StatCard` imports remain anywhere in `src/pages/` or `src/components/`; `PHASE_TASK_LIST.md` polish item marked Complete
- Live-verified on `/app/admin/analytics`: org rows render (Trusted Media Nigeria, NewsHub Africa…), all 5 column headers are sortable buttons, clicking Scans toggles `aria-sort` ascending (342 → 2,150) / descending (2,150 first)
- vitest **214/214**, lint 0 warnings on touched files, `npm run build` clean

## [2026-08-07] - Forensic Directory Resolution (Archive + Reuse)

### Decided
- `src/components/forensic/` was verified **unreferenced dead code** (zero imports outside the directory; `ForensicMediaFrame` in `src/components/` is a separate, in-use component). Decided NOT to route `ForensicReportPreview` into `/app/reports/:scanId` — it is a static mockup with hardcoded fabricated findings (Sora attribution, 0.947 veracity, case refs), which would show fake evidence on real scans and undermine the product's veracity positioning.

### Added
- `src/archive/forensic/README.md` — documents why the mockups were archived, what was kept, and what each piece would need to be resurrected as a real data-driven surface

### Moved (archived, unreferenced → excluded from bundle)
- `ForensicReportPreview`, `EvidenceAppendix`, `PDFReportMediaAudit`, `SignalVisualizer`, `SignatureCatalog` → `src/archive/forensic/` (its `VeracitySeal` import path updated to the kept location)

### Kept + Wired (the two prop-driven, genuinely reusable pieces)
- `src/components/forensic/VeracitySeal.jsx` — wired into the printable report header (`AppReportPrintPage`)
- `src/components/forensic/TransparencyFooter.jsx` — wired as the print article's closing chain-of-custody strip, fed by real scan metadata (report id, sha256, C2PA marker status, methodology version)

### Notes
- `AppReportPrintPage` now carries the forensic identity: VeracitySeal stamp in the header + TransparencyFooter audit strip. Verified live on `/app/reports/scan_001/print`; lint baseline unchanged (4 pre-existing warnings), vitest 214/214, build clean

## [2026-08-07] - Demo-State Forcing On Remaining Pages (Account + Team)

### Added
- `src/components/app/DemoStateBanner.jsx` — shared dev-only banner extracted from AppDashboardPage (renders nothing in production builds)
- `src/lib/useDemoState.js` — new `useDemoStateControl()` hook combining `useDemoState` with the URL-syncing `selectDemoState` handler

### Changed
- **AppDashboardPage** now uses the shared `DemoStateBanner` + `useDemoStateControl` (removed the local copy and the now-unused `useLocation`)
- **AppAccountPage** honors `?state=` with non-data demo dressing: `?state=error` forces a save-failure inline error on submit (real `updateProfile` untouched), `?state=loading` renders a form skeleton, `?state=empty` swaps the side panel to an empty profile surface
- **AppTeamPage** honors `?state=`: swaps AppStatePanel variant (loading skeleton / empty / error) and renders the banner

### Notes
- The sign-off checklist (v4) now records Account/Team as demo-forcible (✅*) instead of N/A; the 7 data pages that already carried `useDemoState`/`withDemoOverride` (History, Reports, admin Overview/Waitlist/Users/Organizations/Feature Flags) are unchanged — verified via grep ref counts
- vitest **214/214**, lint clean on touched files, `npm run build` passes

## [2026-08-07] - UI Primitive Component Tests (testing-library)

### Added
- devDependencies: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@testing-library/dom`, `jsdom`
- `vitest.config.js` — `setupFiles` points at `src/test/setup.js` (jest-dom matchers + explicit `afterEach(cleanup)` since vitest runs with `globals: false` and RTL cannot auto-register); component tests opt into jsdom via the `// @vitest-environment jsdom` docblock (vitest 4 has no `environmentMatchGlobs`)
- 4 new component specs (35 tests) under `src/components/ui/`:
  - **Button.test.jsx** (8) — native `<button>` vs router `<Link>` when `to` is set (real href semantics), onClick on both forms, loading (spinner span + aria-busy + disabled), disabled click blocking, variant/size classes
  - **Badge.test.jsx** (11) — default + all five tone classes, dot rendering/omission, sm size, title forwarding, unknown-tone fallback
  - **Card.test.jsx** (8) — header block + children, loading skeletons (count = loadingRows), empty state, error state with/without retry, children hidden in non-default states
  - **DataTable.test.jsx** (8) — populated rows + headers, loading skeleton, default + custom empty states, error retry, search filtering + no-matches, row click, pagination page flip

### Notes
- vitest now **214/214 tests** (was 179; 35 new) across 10 files; lint at baseline (8 pre-existing warnings, 0 errors)
- first jsdom-based tests in the repo — the existing pure-logic suites stay in the fast node environment

## [2026-08-07] - getActivity Test Suite Extended (19 Tests)

### Added
- `backend/src/account/account.service.spec.ts` — three new `getActivity` cases completing the category/edge matrix, matching the existing chainable-mock style (16 → 19 tests):
  - **team category** — the `in` filter is applied to both chains with the membership/role/org action set (`team.member_added`, `team.member_removed`, `role.changed`, `org.created`) — asserted exactly (`toEqual`) so constant drift fails in either direction (reviewer tightening)
  - **system category** — the `in` filter covers the full 6-action waitlist/feature-flag set including the underscore dialect real services write (`waitlist_reviewed`), also asserted exactly
  - **empty results** — a zero-event feed resolves to `{ data: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }` (no events is a valid state, and totalPages never floors to zero)

### Notes
- backend suite now **168/168 tests** (account 19, admin 20); `nest build` clean; oxlint 0 warnings on the touched spec

## [2026-08-07] - Real Admin Audit Logs Endpoint (Filters + Pagination)

### Added
- `backend/src/admin/admin.service.ts` — `listAuditLogs` extended from limit-only to the **account-activity pattern** (`AccountService.getActivity`): optional `severity` / `actor` / `action` / `resourceType` / `search` filters applied to **both** the data and count queries (count parity), pagination clamping (page ≥ 1, pageSize ≤ 500), and the `{ data, page, pageSize, total, totalPages }` envelope. Severity still prefers the stored row value and falls back to the shared `auditSeverity()` map (`audit-severity.ts`) so legacy rows badge identically to the frontend. Free-text `search` uses a PostgREST `or()` filter over `actor_email`/`action`/`entity_type`/`entity_id` — matching the fields the frontend page searches (reviewer catch: the initial single-column ilike on actor_email would have returned zero real-mode results for action/resource searches)
- `backend/src/admin/admin.controller.ts` — `GET /admin/audit-logs` now accepts `page`, `pageSize`, `severity`, `actor`, `action`, `resourceType`, `search` query params (replacing the old `limit`)
- `backend/src/admin/admin.service.spec.ts` — 5 new `listAuditLogs` tests: envelope + severity fallback for legacy rows, all four eq filters applied to both chains (8 `eq` calls), multi-column search (`or()` twice, one per chain) + page/pageSize clamping, `'all'` sentinels producing no clauses, and the 503 path

### Changed
- `src/lib/api.js` — `getAdminAuditLogs(params)` builds the query string for the real path
- `src/lib/mockApi.js` — `mockGetAdminAuditLogs(params)` now mirrors the real endpoint: same server-style filters + `paginate()` envelope, keeping mock/real parity
- `src/pages/admin/AuditLogsPage.jsx` — the active filter state is now pushed to the API (page 1, pageSize 500 for facet derivation); the client-side pass and CSV export stay as-is

### Notes
- backend suite now **165/165 tests**; `nest build` clean; oxlint 0 errors on all six touched files (the 1 `mockWaitlist` warning is pre-existing); vitest **179/179**
- live-verified in Preview: High-severity filter returns 7 events with the facet dropdowns correctly narrowed to high-only actors/actions/resources (proving the mock round-trips the server-style filter), `?state=empty` still forces the empty surface, console clean

## [2026-08-07] - Client-Side Report PDF Export Complete

### Added
- `src/pages/app/AppReportPrintPage.jsx` — export loop now closes with feedback: the Export PDF button (detail page + print page + ⌘K) opens the print dialog with an info toast, and an `afterprint` listener fires a **success toast** ("PDF export complete") once the dialog closes. The confirmation is gated on a `exportRequestedRef` so only button-initiated exports toast — a spontaneous Ctrl+P on the page stays silent

### Changed
- `docs/project-state/current-feature-status.md` — **Print-ready report** and **Report PDF export** both closed from In Progress / Approved → **Complete** (the last frontend feature-status rows; approved 2026-08-04, shipped 2026-08-07)
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` + `docs/project-state/what-is-in-development.md` — PDF export marked shipped; remaining approved MVP features narrowed to scan dedup, webhooks UI, evidence appendix

### Notes
- the printable view, print stylesheet (`@media print` hiding shell chrome + `break-inside: avoid` for report panels), and the descriptive save filename (`Provance report PRV-…`) were already on disk from the earlier print-flow slice — this pass completed the user-facing export feedback and closed the status docs

## [2026-08-07] - Workspace-Wide Scan Lifecycle Polling

### Added
- `src/pages/app/AppHistoryPage.jsx` — the scan ledger resource now silent-polls every 5s while active scan work exists (`pollMs: 5000`, `pollWhen: hasActiveScanWork`), so completed scans appear without a manual reload
- `src/pages/app/AppReportsPage.jsx` — the reports list resource polls under the same gate, and the per-scan detail resource polls only while its scan is `queued`/`processing` (`scanNeedsPolling`), so a report being viewed flips to completed live
- `src/components/app/scanPresentation.js` — `scanNeedsPolling(scan)` extracted as the single-scan form of `hasActiveScanWork` (reviewer suggestion), keeping the poll vocabulary in one place; `hasActiveScanWork` now delegates to it
- `src/components/app/scanPresentation.test.js` — 4 new `scanNeedsPolling` cases (null/undefined/{} → false, queued/processing → true, completed/complete/failed/awaiting_upload → false)

### Notes
- closes the last workspace gap: Dashboard + Queue already polled; History and Reports now do too, so the whole workspace reflects real scan lifecycle states
- live-verified in Preview: a probe scan injected into the mock store landed as the first History row via a silent poll without any reload (the mock's 8% transient-error injection visibly kept last-known-good between cycles, as designed)
- vitest **179/179 tests** (6 files); oxlint 0 warnings on the four touched files

## [2026-08-07] - Real Admin Endpoints: Jobs, Reports, Roles, Settings

### Added
- `backend/src/admin/admin.service.ts` — four new derivation-based endpoints plus two job actions, following the `getAnalytics`/`getMonitoring` honest-derivation precedent (no dedicated jobs/reports/roles/settings tables exist, so they derive from `scans`, `profiles`, `organization_members`, `feature_flags`, and `audit_logs`):
  - **`GET /admin/jobs`** — the scans table as an admin job ledger: DB `complete` → display `completed` (matching the page's status tabs), `awaiting_upload` → `queued` (a job is submitted work); real `processing_mode`/`team_id`/`completed_at` columns (0009_scan_processing.sql) surfaced directly; `priority`/`attempts`/`worker`/`progress` defaulted neutrally where no column exists (page renders '—'); `error` from the real `failure_reason` column
  - **`POST /admin/jobs/:id/retry`** + **`POST /admin/jobs/:id/fail`** — find-first-then-update status transitions on the scans table with the mock's exact guard semantics ('Only failed jobs can be re-queued.', 'Completed jobs cannot be failed.', 'This job is already failed.') and `{ ok: true, job }` returns
  - **`GET /admin/reports`** — paginated ledger of completed scans (clamped page/pageSize, `{ data, page, pageSize, total, totalPages }` envelope matching `paginate()`), with `report_id` from `result_payload` (flat mirror or nested `report.report_id`, fallback `PRV-YYYYMMDD-XXXX`), verdict display map (`likely_authentic`→`authentic`), `confidence_score`, and `signals`
  - **`GET /admin/roles`** — the static RBAC matrix (`ADMIN_ROLES`/`ADMIN_SCOPES`, product config) with **real member counts** derived from `organization_members` role → role_id mapping (`owner`→`role_owner`, `admin`→`role_admin`, `member`→`role_analyst`), members joined with profiles (initials avatar), and `role.%` audit events from `audit_logs` (details.description)
  - **`GET /admin/settings`** — config-driven environment (name/region/versions/commit), operational toggles backed by `feature_flags` (`deep_scan_mode` → `deep_processing`) plus config defaults for upload/retention inputs, and config-driven security posture
- `backend/src/admin/admin.controller.ts` — six routes wired behind the class-level `SupabaseAuthGuard` + `AdminGuard` + throttle; `backend/src/admin/dto/fail-job.dto.ts` (optional `reason`, `IsString`/`MaxLength(500)`)
- `backend/src/admin/admin.service.spec.ts` — 15 unit tests (chainable thenable mock per the account-spec convention): jobs dialect + neutral defaults, retry/fail guard paths + 404s, report pagination clamping + report-id fallback, roles matrix with real member counts + audit events, settings flag/config defaults, and 503 paths

### Notes
- backend suite now **160/160 tests** (14 suites); `nest build` + `tsc -p tsconfig.build.json` clean; oxlint 0 warnings on all four files (the backend strict-eslint ruleset was never clean on this file — 330 baseline errors — and is not an enforced gate)
- reviewer findings applied: real `processing_mode`/`completed_at` pass-through in `toJobView` (was hardcoded, despite the columns existing per 0009) and `getRoles` now throws on profiles-lookup failure instead of silently yielding zero members
- The four frontend pages (Jobs, Reports, Roles, Settings) already consumed these exact shapes via `USE_MOCK`; this slice makes the real paths live — no frontend changes required

### Added
- `?state=loading|empty|error` demo forcing retrofitted onto the five remaining data pages, so **every page with a data surface is now URL-forcible** (22 data pages + 2 N/A):
  - **`AppHistoryPage`** — the `listScans` resource wrapped in `useDemoState`/`withDemoOverride` (cleanest retrofit; the DataTable already renders all three states from the resource)
  - **`AppReportsPage`** — the verification-list resource wrapped; the per-scan detail pane keeps its own loading/error rendering
  - **admin `OverviewPage`** — migrated from the legacy `useMockData` hook onto `useResource` + `withDemoOverride`, with the aggregate loading/error/empty branches reworked to status-based checks and a `forceLoading` flag so the skeleton shows even when prior data is cached
  - **admin `WaitlistPage`** / **`UsersPage`** — force flags (`forceLoading`/`forceError`/`forceEmpty`) drive each page's hand-rolled state machine (error branch, KPI/table loading, forced-empty rows), with an explicit forced-error message

### Fixed
- **Unreachable admin-Overview empty state** — `isEmpty` reads `kpis.scansLast7Days` from the static `mockAnalytics` import (not the resource), so the "Admin workspace is ready" panel could never render; the empty branch is now driven by a `forceEmpty` flag in addition to the derived check

### Changed
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` — revised to **v3**: `?state=` forcing row is now **22 of 22 data pages (+ 2 N/A) — no gaps**; Account (profile form from AuthContext) and Team (static guarded placeholder) reclassified as N/A with rationale; the legacy-admin-components gap (Organizations + Feature Flags) also marked closed by the primitives migration; Confirmed By refreshed with the 2026-08-07 live walk

### Notes
- Organizations + Feature Flags already had forcing from their ui-primitives migration — no change needed there
- Verified live in the Preview (2026-08-07): History empty + error, Reports empty + error, Overview loading/empty/error, Waitlist empty + error, Users empty + error — all render their designed states with the forced-error message
- Gates: lint at baseline (8 warnings — the Overview `events` memo dep is pre-existing), 175/175 vitest, production build passes

## [2026-08-07] - Presentation Helper Fallback Coverage (getVerdictMeta / getScanStatusMeta / getTeamMeta)

### Added
- `src/components/app/scanPresentation.test.js` — 9 new tests closing the Badge-facing map gaps; the formatter file is now **113 tests** and the suite **175/175**:
  - **getScanStatusMeta** — fallback for `null`/empty/non-string statuses, plus an exact-object identity check that an unknown status returns the *full* `awaiting_upload` meta (badge + tone ride along, so a fallback never renders with a mismatched presentation)
  - **getVerdictMeta** — completed scans with no payload at all (`{ status: 'complete' }` and `result_payload: {}`), empty-string verdict, **unknown verdict class fall-through** (both the flat field and `result_payload.verdict.class` degrade to the neutral Pending badge instead of crashing), and a pin that a queued/processing scan carrying a payload verdict still renders Pending
  - **getTeamMeta** — first coverage ever: all three known teams resolve to their full `{ name, short, tone }` meta, unknown ids fall back to `Unassigned`/`—`/`neutral`, and `null`/`undefined`/empty do the same

### Verified
- 113/113 in the formatter file, **175/175 across the suite**, lint 0 warnings on the changed file

## [2026-08-07] - Combined check:test Gate + Watch Variant

### Added
- `package.json` — `check:test` (`npm run lint && npm test`) merges the previously separate lint and vitest gates into one pre-ship command, so the formatter suite + lint are covered together before every deploy
- `check:test:watch` — watch-friendly variant: lint once as a fast upfront gate, then vitest in watch mode so every save re-runs the formatter suite

### Changed
- `check:launch` now starts with `npm run check:test` (was bare `npm test`) — this also brings **oxlint into the deploy gate for the first time**
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` + `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` — deployment checklist and baseline release gates updated to the `check:test` first step, with the stale "63 tests" count corrected to the current 166

### Verified
- `npm run check:test` runs end-to-end green (lint → 166/166 vitest)

## [2026-08-07] - Frontend Status Polling Lands The Scan Round-Trip

### Added
- `src/lib/useResource.js` — optional third `options` argument turns any resource into a live surface: `pollMs` (silent background refresh interval) + `pollWhen` (predicate over the current state). Unlike `reload()`, a poll never flashes the loading state — it swaps in fresh data in place, and **keeps last-known-good data** (status stays `ready`) on failure, so a transient network blip can't blank a live panel. Polls skip while one is in flight, the loop pauses while the tab is hidden (visibilitychange catches up on return), a poll never clobbers an in-progress manual load, and a throwing gate is caught instead of surfacing as an unhandled rejection. Fully backward-compatible (`(loader)` / `(loader, deps)` callers unaffected)
- `src/components/app/scanPresentation.js` — two pure polling gates: `hasActiveScanWork(scans)` (any scan queued/processing) and `queueNeedsPolling(snapshot)` (queued/processing counts > 0), so live surfaces idle their polling once the queue drains
- `src/pages/app/AppDashboardPage.jsx` + `src/pages/app/AppQueuePage.jsx` — the scans ledger + queue-posture resources now poll every **5s while work is in flight** (queued/processing), so worker-driven queued → processing → complete transitions land in the dashboard and Verification Queue **without a reload**; queue-page copy updated ("refreshed automatically while work is in flight")
- `src/components/app/scanPresentation.test.js` — 7 new tests for the two gates (null/non-array input, terminal-only idle, queued/processing trigger, missing-count tolerance); suite now **166/166**

### Notes
- The backend half of the round-trip was already shipped and validated (POST /v1/scans creates the row → signed-URL upload → submit → BullMQ worker / inline pipeline → report payload; e2e spec + live walk). This slice completes the loop on the frontend — real mode now observes worker transitions instead of relying on a manual reload
- `?state=` demo forcing does not idle the polls (the gate reads the resource's internal state; the forced display still wins) — documented in the hook, inert in production
- Verified live in the Preview: a probe scan injected into the mock store appeared in the queue table as the first row within one 5s poll cycle with no reload, and the dev-only poll-failure warn fired once (mock's simulated transient error) while last-known-good data stayed put; probe rows cleaned up afterwards
- Reviewer's two findings applied: gate call moved inside the poll `try` (throwing predicate → caught + logged), and the demo-forcing interplay documented

## [2026-08-07] - Formatter Suite Edge-Case Parity (25 New Tests)

### Added
- `src/components/app/scanPresentation.test.js` — extended every shared formatter describe block so coverage is uniform (not just the date core), now **97 tests in the file / 159 total**; all expected values were verified against the real module with `node` before pinning:
  - **formatDateTime** — midnight/noon 12-hour rendering (`Jul 24, 2026, 12:00 AM`) + an Intl contract spy pinning the `en-US` `{ dateStyle: 'medium', timeStyle: 'short' }` call (mirrors formatDate's existing spy)
  - **formatDateLong / formatTimeShort / formatHourShort** — undefined/empty/non-date-primitive (0, false) fallbacks, custom-fallback checks, Date-object boundaries (`December 31, 2026`, noon `12:00 PM`, hour labels ignoring the minute component — `9:45` → `9 AM`, `23:59` → `11 PM`)
  - **formatShortDate** — custom-fallback parity
  - **formatCurrency** — numeric-string rejection (`'1234'` → `—`), half-away rounding at the whole-dollar boundary (`999.5` → `$1,000`), negative-zero pin (`-$0`, documented as a behavior pin)
  - **formatDurationMs** — second-scale rounding (`2499.6` → `2.5s`), negative ms-branch pin (`-1500` → `-1500ms`), sub-ms collapse (`0.4` → `0ms`)
  - **formatStorageGb** — `Infinity` fallback, toFixed-boundary pin (`999.96` → `1000.0 GB` stays GB because the ≥1000 check runs pre-rounding), TB rounding (`1999.96` → `2.0 TB`), negative pin
  - **formatFileSize** — `Infinity` → `Unknown size`, fractional-byte rounding (`999.5` → `1000 B`), KB-just-below-MB boundary (`1048575` → `1024.0 KB`)

### Notes
- all datetime assertions use local-time constructors (the suite's established TZ-deterministic pattern) or Intl parity checks — no CI drift; reviewer confirmed the suite matches the verified implementation behavior, with the `-0` currency pin the only cross-ICU consideration (drop the assertion, never the implementation, if a future runner differs)
- validated: 97/97 in the formatter file, **159/159 vitest across the suite**, lint 0 warnings on the changed file

## [2026-08-07] - Admin Organizations + Feature Flags Migrated To ui Primitives

### Changed
- `src/pages/admin/OrganizationsPage.jsx` — legacy `AdminTable`/admin `StatCard`/`AdminDrawer` stack replaced with the ui primitives: `useResource(getOrganizations)` + `?state=` forcing, ui `StatCard` KPI row (loading/error props), sortable/searchable/paginated `DataTable` with row-click → ui `Drawer` + pill `Tabs` (Members tab is a nested DataTable with role `Badge`s, Settings keeps the storage meter, Activity reuses the shared `ActivityRow`)
- `src/pages/admin/FeatureFlagsPage.jsx` — same migration: ui `StatCard` KPIs, `DataTable` with exposure `Badge`s and a switch column, `AdminPageHeader` added, toggle feedback moved from the inline aria-live div to the Toast system (success/error with revert), `ConfirmDialog` kept for blast-radius toggles

### Fixed
- **Optimistic-toggle stale-closure bug** — the columns memo (`[toggleState]` deps) captured handlers from the mount render, whose `rows` closure was `[]` during loading; toggling then mapped the optimistic update over the empty array, blanking the table (KPIs stayed correct). `setFlagsData` now reads `rowsRef.current` (synced each render) so stale closures act on the live data
- KPI Enabled/Disabled counts now derive from the working copy (`displayRows`), so they stay in lockstep with the optimistic table after a toggle

### Verified
- Live: orgs table + drawer tabs render; feature-flag toggle → confirm → switch flips, 10 rows retained, KPIs 6→7 enabled, success toast fires; `?state=error|empty` forcing works on both pages
- Lint 0 warnings on both files, 134/134 vitest, full-project lint at baseline; reviewer's findings applied (rowsRef fix, KPI-from-working-copy)

## [2026-08-07] - Admin Roles Page: Member Assignment + Audit Trail

### Added
- `src/pages/admin/RolesPage.jsx` — the Roles & Permissions page now has three surfaces: the RBAC matrix (unchanged scope toggles), a Member assignment panel (role filter chips with live counts + a per-member role selector that optimistically reconciles role counts on reassign), and a Role change history audit trail reusing the shared ActivityRow component
- `mockRoleMembers` (12 members derived deterministically from `mockUsers`) + `mockRoleAuditEvents` (6 role.* events) in `mockData.js`; `mockGetAdminRoles` returns `{ roles, scopes, members, auditEvents }`; Analyst `member_count` aligned 7 → 6 so the roster reconciles
- Header meta now reports `N events`; ⌘K gains a "Filter members to Viewers" command; loading/empty/error states cover all three cards via `?state=`

## [2026-08-07] - Real Notifications Endpoint (GET /v1/notifications)

### Added
- `supabase/migrations/0011_notifications.sql` — user-scoped `notifications` table (category/title/description/is_read/link/created_at), RLS on with no public policies, `(user_id, created_at desc)` index
- Backend `NotificationsModule` — `GET /v1/notifications` (paginated, user-scoped via `user_id`, maps `is_read` → `read` to the mockNotifications shape), `PATCH /v1/notifications/:id/read` (404 if not owned by the user), `PATCH /v1/notifications/read-all`, all behind SupabaseAuthGuard; 15 new jest tests (145/145 total)
- Frontend `api.js`: `getNotifications` now passes `page`/`pageSize` as query params; new `markNotificationRead` + `markAllNotificationsRead` with USE_MOCK-gated mock branches (`mockApi.js`) that mutate the shared mock store so the bell + page stay consistent
- The app-shell notification bell now fetches from the API (mock fallback keeps the demo usable on load failure) and persists mark-read through the API with optimistic local updates

## [2026-08-07] - AccountService.getActivity Jest Coverage

### Added
- `backend/src/account/account.service.spec.ts` — 16 tests for `GET /v1/account/activity` using the plan-based chainable Supabase mock convention: normalized email scoping (trim/lowercase applied to both data + count chains), category filter application (`scans`/`exports` → like, `account` → in, unknown → all), pagination clamping (page 0 → 1, pageSize 300 → 200 cap, negative pageSize → 1), count-query parity (including a distinct-builder test proving each chain gets its own filter), the 400 on missing/whitespace email, 503s, row-count fallback, and the custom-table config path
- Backend suite is now 130/130 unit tests

## [2026-08-07] - chartGeometry Edge-Case Test Suite + Negative Clamp

### Added
- `chartGeometry.test.js` suite for `buildChartGeometry` edge cases (empty series, single-point centering, all-zero baselines, negative/NaN clamp) and the `pctOfViewBoxX/Y` helpers (133/133 vitest)
- `pctOfViewBoxX/Y` now round to 3 decimals (e.g. `4.722%` not `4.722222222222222%`) so HTML axis-label `top`/`left` styles stay short and readable

### Fixed
- `buildChartGeometry` clamps negative/NaN scan values to 0 — previously a negative value rendered *above* the plot top instead of at the baseline

## [2026-08-07] - TrendChart On Admin Monitoring Queue Health

### Added
- `daily_series` (14-day processed / completed / failed) to `queue_health` in both the mock (`mockData.js`) and the real backend `/admin/monitoring` payload (`admin.service.ts`) so every admin surface reuses the TrendChart primitive
- `TrendChart` now accepts a `labels` prop (`{ scans, completed, failed }`) to relabel the legend and hover readout — the Monitoring page queue-health panel renders it with queue vocabulary ("Processed / Completed / Failed") below the hourly bars

## [2026-08-07] - StackedBarChart Primitive + Verdict Mix Reuse

### Added
- `src/components/ui/StackedBarChart.jsx` — generic self-hosted SVG stacked-bar chart primitive (segments config, hover readout with per-segment tint, full-cell hit areas, HTML axis labels, legend with totals + shares), exported from the ui barrel beside TrendChart
- `buildStackedBarGeometry` + `stackedSegmentBounds` in `chartGeometry.js` (stacked-bar geometry + per-bar segment rect math), exported from the barrel with 4 new unit tests (123/123 vitest)
- `VERDICT_CHART_SEGMENTS` in scanPresentation.js — shared authentic/suspicious/inconclusive segment config used by both chart consumers

### Changed
- Admin AnalyticsPage: inline `VerdictVolumeChart` removed → `StackedBarChart` with verdict segments (identical visuals, dead `pctOfViewBoxX/Y` imports dropped)
- User Dashboard: new "Verdict mix" panel renders the already-fetched `verdict_trend` beside the volume trend (2-col grid on xl), with loading/empty/error states via the existing demo forcing

### Verified
- Live preview: admin analytics stacked bars + hover readout ("Jul 17 · 24 authentic · 9 suspicious · 8 inconclusive"), dashboard Verdict mix panel with legend, and `?state=empty|error` forcing both work
- Reviewer fix applied: hover outline now spans the full stack (was only outlining the bottom segment); verified live (outline top = stack top, bottom = baseline) + a geometry test locks the contract

## [2026-08-07] - Real Scan Round-Trip Verification + Readiness Probe

### Added
- `GET /v1/health/readiness` — deep probe reporting supabase / scans-schema / queue readiness separately, so a partially-migrated database is diagnosable with one request instead of a confusing 503 from the scans endpoints
- ScansService surfaces an actionable message when the scans table is missing the 0009 processing columns (`42703`/`PGRST204` → "apply supabase/migrations/0009_scan_processing.sql") on initiate/update failures

### Verified
- Live walk against the real Supabase project: sign-in 200, initiate 503 **only** because migrations 0003–0010 are not applied to the live DB (scans table lacks `processing_mode`/`team_id`/`completed_at`); the e2e spec proves the full initiate → signed-URL upload → submit → inline processing → report payload lifecycle against the exact schema (8/8 e2e, 113/113 unit, typecheck + build clean)
- BullMQ worker wiring confirmed end-to-end (`worker.ts` + `start:worker` + `Dockerfile.worker` + `fly.worker.toml`); with `REDIS_URL` unset the flow correctly falls back to inline processing (existing complete rows prove the pipeline ran live before)

### Notes
- The one live blocker is applying the pending migrations (0003–0010) via the Supabase dashboard SQL editor; `pg-meta` REST remains locked and no `DATABASE_URL` is configured

## [2026-08-07] - Admin Jobs: Retry/Fail Actions + Payload Inspection

### Added
- `mockRetryJob` / `mockFailJob` in mockApi (mutate the module-level ledger so the view reflects them in-session) + `retryJob` / `failJob` real-path branches in api.js (`POST /admin/jobs/:id/retry`, `POST /admin/jobs/:id/fail`), USE_MOCK-gated like every endpoint
- Jobs page: **Fail** action on queued/processing jobs (the admin kill-switch), **Retry** on failed jobs (attempts bumped, error cleared), busy states + success/error toasts, and a **Retry all failed jobs** ⌘K command
- **Payload inspection**: completed jobs now carry `result_payload` (signals + report id) and the detail drawer shows a collapsible JSON inspector
- `mockGetAdminJobs` returns a shallow copy so the reference changes on refetch — fixes stale memoized status counts after retry/fail mutations

### Verified
- Live: fail → ledger updates (4 queued / 4 failed) → retry → back to 5/3 with toast; payload drawer renders 4 signals + report id + expandable JSON; `?state=error` forcing works
- FE lint at baseline (14w/0e) · 119/119 vitest

## [2026-08-07] - Better Auth Spike (Parallel Auth Provider)

### Added
- `better-auth@1.6.26` + `pg@8.22` installed in the backend (pnpm — the npm `package-lock.json` is stale; the workspace is pnpm-managed)
- `backend/src/auth/better-auth.config.ts` — Better Auth instance (appName Provance, email/password, 7-day sliding sessions, trusted origins, `useSecureCookies` behind NODE_ENV); connects to Supabase Postgres via `DATABASE_URL` when set, otherwise runs stateless (cookie-cache mode)
- Handler mounted in `main.ts` at `/api/auth` via `better-auth/node`'s `toNodeHandler`, registered **before** Nest's body parser so the auth routes read the raw request body — the live GoTrue flow at `/v1/auth/*` is untouched
- `env.validation.ts`: optional `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `DATABASE_URL` (postgres://) — the app must boot without them; `.env.example` placeholders added; generated secret written to gitignored `backend/.env.local`

### Verified
- `GET /api/auth/ok` → `{ ok: true }` (skill step-6 check) · POST sign-up/sign-in parse JSON bodies and issue sessions (stateless — ephemeral until `DATABASE_URL` is provided) · `/v1/health` 200, `/v1/auth/me` 401 without token, GoTrue sign-in 200 (coexistence proven)
- Backend 109/109 unit + 8/8 e2e + typecheck + build clean

### Next (needs Supabase dashboard)
- Provide `DATABASE_URL` (Settings → Database → connection string / pooler URL) in `backend/.env.local`, then `npx @better-auth/cli generate` + apply the auth schema, and plugins (twoFactor/organization/admin/apiKey) become additive

## [2026-08-07] - Real Active-Sessions Surface

### Added
- `supabase/migrations/0010_user_sessions.sql` — `user_sessions` ledger (keyed by the access-token `sid` claim; only a SHA-256 hash of the refresh token is stored) + `user_security_settings`, both RLS-protected service-role-only
- Backend `SecurityModule` — `GET/PATCH /security/settings`, `GET/DELETE /security/sessions`, `PATCH /security/password` behind `SupabaseAuthGuard`:
  - Session rows are upserted on every sign-in and session refresh (rotation keeps the same auth id, so the row bumps `last_active_at` and stores the fresh token hash), and dropped on sign-out via refresh-token hash match
  - Revocation deletes the GoTrue session server-side (`DELETE /auth/v1/admin/users/{user_id}/sessions/{session_id}`) then clears the ledger row — the device is signed out immediately
  - Password change verifies the current password (burning the throwaway verification session), updates via the admin API, and revokes every other tracked session
  - Settings degrade to defaults + empty sessions when the migration is not applied, so fresh DBs never block auth (billing-plan-fallback pattern)
- `SupabaseAuthGuard` now decodes the JWT `sid` claim (shared `jwt-sid.util.ts`) so session-scoped endpoints can mark the current session
- Device/IP/location metadata (`session-meta.util.ts`) derived from request headers (user-agent classifier → `<Browser> on <OS>`, proxy chain left-most IP, country hints)

### Notes
- The frontend real paths (`getSecuritySettings` → `GET /security/settings`, `revokeSession` → `DELETE /security/sessions/:id`, etc.) were already wired in api.js; this slice makes them live
- Verified live: settings/sessions/PATCH branches against real Supabase (graceful degradation); the ledger + GoTrue-revoke paths are covered by unit tests until migration 0010 is applied to the project (needs dashboard/CLI, like 0005/0007/0008/0009)

## [2026-08-06] - Usage & Entitlement: Per-Plan Scan Quotas + Billing Metering

### Added
- `backend/src/billing/` — new **BillingModule**: `PLAN_SCAN_QUOTAS` registry (starter 100 / pro 500 / team 2500 / enterprise 10000 monthly scans, `DEFAULT_PLAN` pro), calendar-month `currentBillingCycle()` (UTC, with a clamped `retryAfterSeconds`), and `BillingService` with `resolveUserPlan` (active org membership → org `plan`, never-throws fallback), `countCycleScans` (head-count on the scans table), `assertScanQuota` (the entitlement gate), and `getBilling` (mirrors the frontend `mockBillingProfile` contract)
- `GET /v1/billing` (BillingController, behind `SupabaseAuthGuard` + throttle) — real metering payload: plan + usage (scansUsed from the scans table, scansLimit from the plan), empty invoices/payment methods until a processor is wired
- **402 enforcement on `POST /v1/scans`**: `ScansService.initiateScan` calls `assertScanQuota(userId)` before creating any record; exhaustion throws `QuotaExceededException` (402, `code: QUOTA_EXCEEDED`, used/limit/plan/periodEnd) and `GlobalExceptionFilter` now emits the **`Retry-After` header** (RFC 9110) from the exception's `retryAfterSeconds`
- frontend: `request()` attaches `status` + `retryAfterSeconds` to thrown errors; `AppUploadsPage` shows a dedicated **"Monthly scan quota reached"** error state (resets with the cycle) instead of a generic upload failure; `AppBillingPage` surfaces a **quota-exhausted banner** (alert role, all scans used, reset date, upgrade action) driven by the same usage the upload gate enforces
- dev-only demo forcing: `?quota=exhausted` (inert in production builds) makes `mockInitiateScan` throw the 402-shaped error and `mockGetBilling` report the plan at its limit, so the 402/entitlement surfaces can be reviewed without waiting for 500 mock scans

### Changed
- `backend/src/scans/scans.module.ts` imports `BillingModule`; `ScansService` constructor gains the billing dependency
- `backend/src/common/filters/global-exception.filter.ts` — sets `Retry-After` when the caught exception exposes `retryAfterSeconds`
- `backend/test/scans-flow.e2e-spec.ts` — stateful mock builder gained `gte`/`lte` for the cycle count query

### Tests
- `backend/src/billing/billing.service.spec.ts` (13 tests) — quota registry, plan fallbacks (no membership / missing org tables / unconfigured supabase), cycle math + 60s floor, count, 402 exhaustion with retry-after, plan-matched limits, `/billing` payload shape
- `scans.service.spec.ts` — new test: initiate rejects 402 when the billing quota gate throws, before any supabase call

### Notes
- live-verified against the real backend + Supabase: `GET /v1/billing` returns Pro/500 with scansUsed from the actual scans table; seeding 499 test scans then `POST /v1/scans` returns **HTTP 402** with `Retry-After: 2162221` and `Monthly scan quota reached (500/500 on the pro plan)`; test rows cleaned up afterwards
- gates: backend 91/91 unit tests (9 suites), 8/8 e2e, `nest build` clean; FE 119/119, lint at baseline (14w/0e), build passes

## [2026-08-06] - Scan Flow E2E Spec (Initiate → Upload → Queue → Report)

### Added
- `backend/test/scans-flow.e2e-spec.ts` — **HTTP-level e2e spec for the full scan lifecycle** against the real routes (`/v1/scans` → `/v1/scans/:id/submit` → `/v1/reports/:id`): initiate returns the signed-URL upload contract, submit runs the upload-exists pre-flight (`storage.info`), the no-Redis inline pipeline processes a real 1×1 PNG through Jimp + exifr, and the completed scan serves both the document report payload and a server-generated PDF artifact
- a **stateful in-memory Supabase mock** (rows stored per test, mutations applied on `insert`/`update` thenables, `maybeSingle` resolves by `id + user_id`) that lets the async queue → processing → completed transitions be observed by polling `GET /v1/scans/:id`; `organization_members` resolves a fixed active team
- negative branches: DTO validation 400 (unsupported media type), submit 400 when the asset was never uploaded, submit 400 when the scan is not `awaiting_upload`, report 404 when `result_payload` is not ready, and ownership scoping (foreign-user scans/reports 404)
- the e2e app mirrors production bootstrap: `v1` global prefix, whitelisting `ValidationPipe`, and `GlobalExceptionFilter`; `SupabaseAuthGuard` is overridden to inject the test user and `QueueService` to force inline processing

### Notes
- run with `npm --prefix backend run test:e2e`; suite now 8 e2e tests (7 new + health) alongside 76 unit tests, `nest build` clean

## [2026-08-06] - Auth Hardening: Frontend Cookie-Session Migration + __Host- Cookie

### Added
- `src/lib/api.js` — real-path **in-memory access-token store** (`setMemorySession` / `getMemorySession` / `clearMemorySession`) and a `refreshRealSession` path that posts an **empty-body refresh** (the refresh token arrives in the backend's httpOnly cookie), caching the new access token in memory only; exported `ensureSession()` boot seam. The mock-mode session flow (localStorage persistence for dev reloads) is untouched, cleanly split as `refreshMockSession`
- `src/context/AuthContext.jsx` — real mode now boots via a **silent cookie refresh** (`ensureSession` → `getCurrentViewer` with the memory session as the session fallback, since `/auth/me` returns no session block), persists **nothing** to localStorage, and clears memory on sign-out/expiry; mock mode keeps the persisted session. Storage writes are gated on `USE_MOCK`
- `backend/src/auth/cookie-session.util.ts` — **`__Host-` cookie prefix**: secure deployments (`AUTH_COOKIE_SECURE=true`, or `SameSite=None`) now set `__Host-provance_refresh` (browser-enforced origin binding — Secure, `Path=/`, no Domain); local HTTP dev keeps the plain `provance_refresh` because browsers reject `__Host-` cookies on insecure origins. `CookieSessionOptions` carries `cookieName`; `readRefreshCookie` takes the configured name; controller passes `this.cookieOptions.cookieName`
- `docs/engineering/AUTH_HARDENING_MIGRATION.md` — full migration doc: current vs target state, session lifecycle (sign-in/rotation/boot/401/sign-out), shipped-when table, deploy order, env matrix, rollback (revert frontend + `AUTH_COOKIE_ENABLED=false`), security posture (XSS-safe refresh token, in-memory access token trade-off, SameSite=Lax CSRF), and open items

### Changed
- `backend/src/auth/cookie-session.util.spec.ts` — new coverage: `__Host-` name on secure configs, `readRefreshCookie` with the prefixed name, and cookieName on every serialization option
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` — Active Auth Strategy refreshed (access token in memory only, silent-cookie-refresh boot, `__Host-` note) with a pointer to the migration doc

### Notes
- the backend cookie flow (set/rotate/burn + body stripping) shipped 2026-08-04; this slice completes the migration on the frontend and adds the `__Host-` hardening — existing users with a cookie transition seamlessly; enabling `AUTH_COOKIE_SECURE=true` in prod changes the cookie name and causes one re-sign-in (documented)
- validated: backend 75/75 tests (8 suites) + `nest build`, frontend 119/119 tests + lint at baseline (14 warnings, 0 errors) + build; mock auth flow verified live (sign-in state restored from localStorage, dashboard renders)

## [2026-08-06] - Mobile Overflow Sweep (grid-cols-1 Base)

### Fixed
- **Dashboard Risk Watch cards overflowed at mobile** — the flagged-upload cards carried a `truncate` filename + verdict badge whose intrinsic min-content (~335px) could not shrink below the implicit `auto` grid track, pushing the page 65px wide at ≤360px viewports. Root cause: multi-column grids relied on the implicit single-column `auto` track at small sizes, which sizes to content min-content instead of the available width.
- **Systemic sweep (52 files, 105 insertions)** — every `className="grid …"` with a responsive column breakpoint (`sm:/md:/lg:/xl:grid-cols-*`) and no base column declaration now sets `grid grid-cols-1 …`, so mobile/tablet tracks become `minmax(0,1fr)` and can never blow out. Covered public landing components (Hero, ProductShowcase, SampleReport, Pricing, WhyProvance, UseCases, TrustBar, Footer), forensic previews, and all app + admin workspace pages; single-cell icon wrappers (`place-items-center`) skipped.
- **Template-literal grids**: `PageHero` (`grid grid-cols-1 gap-8 ${heroLayoutClass}`) and `SampleReportDocument`'s `KeyValueGrid` default (`grid-cols-1 md:grid-cols-2`)

### Verified
- Live at 332px viewport: `/app`, `/app/history`, `/app/admin`, `/app/admin/users`, `/app/admin/analytics`, `/app/reports`, `/app/uploads` all report **zero** horizontal document overflow; wide DataTable/AdminTable rows scroll inside their existing `overflow-x-auto` wrappers (unchanged); the mobile nav drawer opens with all 16 links and no overflow
- Shell audit: user + admin sidebars collapse to a Menu toggle below `lg`; header actions progressively disclose at `md:`/`xl:`; desktop `lg:grid-cols-[300px_minmax(0,1fr)]` shells are already minmax-safe
- Gates: lint at baseline (14 warnings, 0 errors), 119/119 tests, production build passes

## [2026-08-06] - Real Report Payload + Server-Side PDF Export

### Added
- `backend/src/reports/report-document.ts` — pure mapper converting a scan row + `result_payload` into the **sampleReportContent-shaped document** (camelCase keys matching the sample): `meta` (report id, verification id, analysis timestamp, processing time, methodology version, hash), `cover` (verdict + tone, confidence, authenticity score, risk level, signal agreement, source confidence, analysis mode, media type, file name), `executiveSummary`, the six `metrics`, `mediaInformation` / `metadataAnalysis` tables, `aiDetectionResults` / `manipulationIndicators` (signals split by category with legacy/seed-dialect fallback classification), `technicalFindings` (findings flattened, per-signal fallback rows), `recommendedNextSteps`, `chainOfCustody`, and `timeline`; unbacked values render "Not assessed" instead of fabricated precision
- `backend/src/reports/report-pdf.ts` — **server-side PDF export** via `pdfkit` (pure JS, fly.io-safe): branded A4 layout (ink header band, verdict banner, 2-column metrics grid, evidence sections, recommendations, custody chain) with per-page footers via the canonical `bufferPages` + `switchToPage` pattern
- `GET /v1/reports/:id/pdf` (ReportsController, behind `SupabaseAuthGuard` + throttle) — streams `application/pdf` with `Content-Disposition: attachment`
- `backend/src/reports/report-document.spec.ts` (13 tests) + `report-pdf.spec.ts` (3 tests) — verdict tone/risk mapping, weighted authenticity, signal agreement, source-confidence heuristic, AI/manipulation split, findings flattening, null-payload fallbacks, legacy dialect, PDF validity (`%PDF-` header, FlateDecode streams, `%%EOF`)
- `src/lib/api.js` — `exportReportPdf(reportId)` gated by `USE_MOCK` (mock returns the print path; real path fetches the blob with auth + credentials)

### Changed
- `backend/src/reports/reports.service.ts` — `getReport` now includes the derived `document` block alongside `result_payload` (non-breaking; the print/report pages keep rendering the existing payload), plus `getReportDocument` / `getReportPdf` for the export path
- `backend/package.json` + `backend/pnpm-lock.yaml` — `pdfkit@^0.19.1` dependency + `@types/pdfkit` devDependency

### Notes
- smoke-verified end to end: generated a real 5.9 KB PDF from the compiled pipeline with a suspicious verdict (warning tone, 11/100 authenticity, 80% signal agreement, 70% source confidence)
- the frontend print page keeps its client-side print-to-PDF flow; this endpoint is the API-level artifact (blob download) for programmatic consumers and future UI wiring
- pre-existing issue flagged: `npm install --package-lock-only` fails on the committed `backend/package-lock.json` ("Invalid Version") even before this change — the canonical installer remains `npx pnpm@9 install --dir backend`, and `pnpm-lock.yaml` is updated
- validated: backend 71/71 tests (7 suites), `nest build` clean, frontend 119/119 tests, lint at baseline (14 warnings, 0 errors), frontend build passes

## [2026-08-06] - Real Scan Submission Path + Queue Round-Trip Complete

### Added
- `supabase/migrations/0009_scan_processing.sql` - `processing_mode` (text, default `standard`), `team_id` (uuid), and `completed_at` (timestamptz) columns on `scans` plus `(status)` and `(user_id, status)` indexes, so the real submission path persists the same row fields the mock scan records carry
- `GET /v1/scans/queue-snapshot` (ScansController, declared before `:scanId` so the literal route wins) - user-scoped queue posture `{ queued, processing, failed, avg_processing_time_ms }` matching `mockGetQueueSnapshot`; the average uses `result_payload.metadata.total_processing_time_ms` when present and falls back to the completed scan's `updated_at − created_at` wall-clock difference; `null` average when no completed scans
- `backend/src/scans/scans.service.spec.ts` (10 tests, plan-based fluent mock per the org-spec precedent) - initiateScan media-type 400, processingMode/team persistence + `standard` default, team-resolution-failure fallback to null, queue-snapshot counts + averaged durations (explicit duration wins over wall-clock) + null average, 503 paths, and listScans row shaping

### Changed
- `backend/src/scans/scans.service.ts` - `initiateScan` now persists `processing_mode` (from the DTO, default `standard`) and resolves the user's team best-effort from their active `organization_members` row (guarded try/catch so a fresh DB without org tables can never block scan creation); `runScanProcessing` stamps `completed_at` on the complete transition; `listScans`/`getScan` shape rows into the exact mock row dialect the frontend consumes (`status` `complete`→`completed`, flat `verdict` mapped from `result_payload.verdict.class` (`likely_authentic`→`authentic`), `processing_mode`/`team_id`/`completed_at` surfaced, and a flat `report_id` mirror injected into `result_payload` for the ledger reads)
- `src/lib/api.js` - `getQueueSnapshot` real path now hits `/scans/queue-snapshot` (user-scoped; the admin Overview's mock-only `useMockData` consumer is unaffected)
- `src/components/app/scanPresentation.js` - `SCAN_STATUS_META.completed` alias (the mock dialect now renders "Complete" instead of falling back to "Awaiting upload") and `getVerdictMeta` accepts both `completed`/`complete` statuses and resolves `result_payload.verdict.class` through the display mapping
- `src/components/app/scanPresentation.test.js` - 25 new tests for the status-dialect alias and verdict resolution (flat field, payload class, both statuses, flat-preferred, missing-verdict Pending)

### Notes
- The multipart upload itself was already live: the Uploads page PUTs through the signed URL from `POST /v1/scans`, and the worker (`backend/src/worker.ts`) or the inline fallback runs the queued → processing → complete/failed transitions; this slice closed the shape gaps so the real path renders identically to the mock
- Validated: frontend 119/119 tests, backend 55/55 tests (5 suites), lint at baseline (14 warnings, 0 errors), backend `nest build` + frontend build both pass

## [2026-08-06] - Supabase Org Seed Script

### Added
- `backend/scripts/seed-org.ts` - idempotent seed for the real Supabase project: creates/reuses the owner auth user (`founder.admin@provance.local`, `provance-seed-pass-123`, email-confirmed), upserts their admin+team profile, an org (`Provance HQ`, 25 seats), three teams (Product & Engineering / Legal & Compliance / Trust & Safety), the owner membership row (making `GET /v1/organization` resolvable), and 8 sample scans spanning queued/processing/complete/failed with verdict payloads feeding the queue/analytics/reports surfaces; every write is a deterministic-id upsert so re-runs are safe; loads `backend/.env` without a dotenv dependency and refuses to run without `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- npm scripts: `seed:org` (backend, via ts-node) and `backend:seed:org` (root)

### Notes
- Run from the backend directory: `npm run seed:org`; prints the sign-in credentials. The script intentionally leaves org invites unseeded so the `POST /organization/invites` → accept flow can be exercised end-to-end through the API

## [2026-08-06] - Organization Service Spec

### Added
- `backend/src/organization/organization.service.spec.ts` (25 tests) - Jest unit spec for the org module following the auth-spec precedent (plain instantiation, plan-based fluent mock Supabase client that throws loudly on plan exhaustion): getOrganization mapping + 404 no-membership + 503 membership-query failure; inviteMember 403 for plain members, 400 duplicate member / pending invite / seat-limit rules, email normalization, team resolution + first-team fallback (both no-team and bogus-team paths); updateMemberRole/updateMemberTeam/removeMember 403 + owner-400 + 404 paths with the strict team 400; cancelInvite 403/404; 503 when Supabase is unconfigured

### Changed
- `backend/src/auth/auth.service.spec.ts` - the mock ConfigService now emulates `get(key, fallback)` so the auth constructor's org-table defaults resolve (fixes the rollback test after the org-invite pre-check landed; the spec now exercises the two-path acceptInvite: organization_invites lookup first, then access_invites)

## [2026-08-06] - Org Invite Acceptance Joins The Roster

### Changed
- `backend/src/auth/auth.service.ts` - `acceptInvite` now resolves **organization invites first** by raw `token` on `organization_invites` (the token `POST /organization/invites` issues), falling back to the existing waitlist `access_invites` hashed-token flow; new `acceptOrganizationInvite` creates the auth user, enforces the seat limit (mirroring the organization service's plan check), inserts the `organization_members` row with the invited role/team, marks the invite accepted, and rolls back (user deletion + invite restore) on any failure; org table names are config-backed via `SUPABASE_ORGANIZATIONS_TABLE` / `SUPABASE_ORGANIZATION_MEMBERS_TABLE` / `SUPABASE_ORGANIZATION_INVITES_TABLE`
- `backend/src/config/env.validation.ts` + `backend/.env.example` - the three organization table keys (plus `SUPABASE_TEAMS_TABLE`) are now registered with schema-matching defaults

### Notes
- `organization_invites.token` is stored plaintext (schema default) and matched verbatim — distinct from `access_invites.token_hash`; the two flows now share one `POST /auth/invites/accept` endpoint

## [2026-08-06] - Workspace Activity CSV Export

### Changed
- `src/pages/app/AppActivityPage.jsx` - the workspace Activity Log page now exports its filtered event view to CSV using the same shared helpers (`buildCsv`/`downloadCsv` from `src/lib/csv.js`) and the identical 6-column contract as the admin Audit Logs page (`Timestamp, Actor, Action, Severity, Resource type, Resource id`), so both surfaces export identically; new header **Export CSV** button (disabled when the view is empty) with download icon, success toast (`Activity log exported — N events in the CSV.`), and a matching `activity.export-csv` ⌘K command

## [2026-08-06] - Real /admin/audit-logs Backend Slice

### Added
- `supabase/migrations/0008_audit_logs.sql` - `public.audit_logs` table (id, actor_email, action, severity with check constraint, entity_type/entity_id, details jsonb, created_at) with RLS enabled (service-role only), indexes on created_at desc / action / severity, and 15 seeded rows mirroring the frontend `mockAuditEvents` contract so the real path renders data on day one

### Changed
- `backend/src/admin/admin.service.ts` - `listAuditLogs` now reads from the `audit_logs` table (configurable via `SUPABASE_AUDIT_LOGS_TABLE`, default `audit_logs`) instead of the phantom `auth_audit_events`; severity is read from the stored row with the shared `auditSeverity(action)` map as fallback for legacy rows; `getDashboard` recent-audit read and `insertAdminAuditEvent` write moved onto the same table (admin actions now appear in the audit log they're viewing); monitoring `db_performance.tables` label corrected to `audit_logs`
- `backend/src/config/env.validation.ts` + `backend/.env.example` - `SUPABASE_AUDIT_LOGS_TABLE` registered (default `audit_logs`)

### Notes
- The account Activity feed (`/v1/account/activity`) and auth sign-in/out writes still target `auth_audit_events`; unifying the whole trail onto `audit_logs` is the natural follow-up slice

## [2026-08-05] - Pre-Sentry Crash Telemetry Stub

### Added
- `src/lib/telemetry.js` (new) — `captureError()` persists every crash as a structured record: dev console output plus a capped localStorage buffer (`provance.crashReports.v1`, newest 25, oldest dropped) so reports survive before Sentry lands. Attaches user_id/email from the persisted auth session, route, user agent, truncated stack, and component stack; never throws on quota/unavailable storage. `getBufferedErrors()` / `clearBufferedErrors()` / `flushErrors()` (backend-flush seam)
- `src/components/app/ErrorBoundary.jsx` — `componentDidCatch` now forwards every caught crash to `captureError`; the `onError` prop remains the swap-in point for Sentry
- `src/context/AuthContext.jsx` — `AUTH_STORAGE_KEY` exported for reuse
- `src/lib/telemetry.test.js` (new, 13 tests) — record shape, non-Error thrown values, stack truncation, identity attach from a fake session, malformed-session tolerance, 25-record cap with oldest-dropped, quota/storage-failure tolerance, corrupt-buffer recovery, clear + flush

## [2026-08-05] - PDF Report Export (Print-to-PDF Flow)

### Added
- `src/pages/app/AppReportsPage.jsx` — detail header now has an **Export PDF** primary button (react-router `Link` via the Button `to` prop, so it keeps real href/middle-click semantics) that navigates to the print page and fires a toast guiding the user to choose "Save as PDF"
- `src/pages/app/AppReportsPage.jsx` — new ⌘K command **"Export current report as PDF"** on the report detail page
- `src/pages/app/AppReportPrintPage.jsx` — the toolbar's action is now **Export PDF** with a download icon; clicking fires a toast and `window.print()`. `document.title` is set to `Provance report {report_id|scanId}` so the browser suggests a sensible PDF filename (restored on unmount); the toolbar hides in print output via `print:hidden`
- `src/index.css` — the `@media print` block now hides the app/admin shell chrome (sidebar + header) and resets shell main padding so only page content prints, plus `break-inside: avoid` for `.print-sheet` panels so report cards don't split across pages

### Notes
- mock-backed end-to-end: the printable report loads via `getReport` behind `USE_MOCK`, and the export is a pure client-side print-to-PDF flow (no new API surface)

## [2026-08-05] - Resolved Incidents Surface in the Activity Log

### Added
- `src/lib/mockData.js` — `buildIncidentActivityEvents()` maps resolved `mockMonitoring.incidents` to `incident.resolved` system events carrying the verbatim post-mortem summary, severity, and resolution timestamp (open incidents stay on Monitoring only)
- `src/lib/activityCategories.js` — `incident.resolved` added to the `system` tab predicate
- `src/lib/mockApi.js` — `mockGetActivityLogs` merges incident events into the feed, sorted newest-first by timestamp so incidents interleave correctly with the audit trail
- `src/pages/app/AppActivityPage.jsx` — severity-aware row tones (critical=rose, major=amber, minor=sky — same as the Monitoring accordion) via `SEVERITY_TONE`, plus a post-mortem summary block in the expanded row detail
- `src/lib/incidentActivityEvents.test.js` — 6 tests: resolved-only mapping, open-incident exclusion, verbatim summary parity, severity/timestamp stamping, unique ids, and merged-feed system-tab disjointness

### Notes
- Incidents are mock-mode-only for now: the real `/v1/account/activity` reads `auth_audit_events` and does not emit incident rows yet

## [2026-08-05] - Real /admin/monitoring Backend Slice

### Added
- `supabase/migrations/0007_incidents.sql` — `admin_incidents` table (severity/status check constraints, services text[], status index) seeded with 5 incidents mirroring the frontend mock
- `backend/src/admin/admin.service.ts` — `getMonitoring()` with real timed probes (database head-count, storage bucket list), derived queue health (12h hourly series, 24h/1h throughput, failure rates, avg processing time), storage utilization from scan byte totals, measured p50/p95 query latency + real table row counts, worker status that treats an idle no-backlog worker as operational, and incidents from the table; shape parity with `mockMonitoring` (overall/services/queue_health/storage_utilization/db_performance/incidents)
- `backend/src/admin/admin.controller.ts` — `GET /admin/monitoring` behind Supabase + Admin guards
- `backend/src/config/env.validation.ts` + `.env.example` — `SUPABASE_INCIDENTS_TABLE`, `STORAGE_CAPACITY_GB`, `DB_MAX_CONNECTIONS`

### Notes
- `cache_hit_rate` and `dead_tuples_pct` are intentionally null (no honest Supabase source); the Monitoring page renders '—' via `formatPct` and hides the gauges
- `checks_24h` mixes 24h scan completions/failures with whole-table backlog head counts (documented proxy)

## [2026-08-05] - TrendChart Hover Hit-Area Fix + Geometry Tests

### Changed
- `src/components/ui/chartGeometry.js` — new pure export `buildHitAreaCells(points)` that tiles full-cell hover rects edge-to-edge across the plot (first cell starts at `PAD.left`, last cell clamps to the plot's right edge, interior cells centered on each point); fixes the dead zone where the first data point (at `x = PAD.left`) fell between the old half-width edge rects
- `src/components/ui/TrendChart.jsx` — hover hit-areas now render from `buildHitAreaCells` instead of the hand-rolled half-width edge rects

### Added
- `src/components/ui/chartGeometry.test.js` — 8 geometry tests locking in edge-to-edge contiguity, per-point containment (including first/last), 1/2/7/14/30-point series, y-value independence, and positive in-bounds widths

## [2026-08-05] - Admin Team Scoping: Users Team Column + Analytics Top-Orgs

### Changed
- `src/lib/mockData.js` — `mockUserTeamById` moved above `mockUsers` (was a TDZ ReferenceError once users referenced it) and every `mockUsers` record now carries `team_id`, so the admin feed exposes each user's team assignment
- `src/pages/admin/UsersPage.jsx` — new **Team** column (TeamBadge, `getTeamMeta` sort) between Role and Team Access; URL-backed `TeamFilter` chips (`?team=` via `useTeamFilterParam`) with counts from the live admin feed; the boolean team-access select renamed `filterTeamAccess` to disambiguate from team assignment
- `src/pages/admin/AnalyticsPage.jsx` — `TeamFilter` chips above the top-orgs table (counts from `mockScans`); selecting a team recomputes the top-orgs rows from the scan ledger (scan `team_id` + user→org join), with a `{Team} scoped` chip and an empty note when the team has no org usage

### Notes
- Verified live: `/app/admin/users?team=team_legal` filters the roster to the 2 Legal users; `/app/admin/analytics?team=team_legal` swaps the top-orgs table to the team's usage split (e.g. Provance Internal with the team's scan counts)
- Review confirmed no leftover `filterTeam` refs, correct null-fallback in `sortedTopOrgs`, and hooks top-level; added the user-detail drawer TeamBadge per review suggestion

## [2026-08-05] - URL-Backed Team Filter (?team=) Across Workspace Surfaces

### Added
- `src/lib/useTeamFilterParam.js` — shared hook that persists the workspace team filter in the query string (`?team=team_legal`), following the existing `?state=` demo-param pattern. Reads `?team=` on mount (invalid/unknown values fall back to `all`), syncs changes to the URL via `replace` while preserving other params, and re-derives on back/forward or manual URL edits. Exports `TEAM_FILTER_VALUES`, `isValidTeamFilter`, `readFromSearch`
- `src/lib/useTeamFilterParam.test.js` — 5 vitest tests covering value validation against `TEAM_IDS`, unknown/empty/null fallbacks, search-string extraction, and coexistence with `?state=`

### Changed
- `AppDashboardPage.jsx` (KPI row + queue posture + ledger), `AppQueuePage.jsx`, and `AppReportsPage.jsx` — team filter migrated from local `useState('all')` to the shared `useTeamFilterParam` hook, so the selection survives navigation and produces shareable links

### Notes
- Verified live: `?team=team_legal` scopes the dashboard KPIs + queue, the queue ledger, and the reports list; clicking a chip rewrites the URL; `?team=team_growth&state=empty` keeps both params
- Review confirmed the two-effect design is loop-safe (React identical-state bail-out) and imports were properly pruned (lint at baseline, 82/82 tests, build passes)

## [2026-08-05] - Activity Category Filter: Extracted + Unit-Tested

### Added
- `src/lib/activityCategories.js` — pure module extracting the Activity page's `CATEGORIES` matching (the inline const in `AppActivityPage.jsx`): `ACTIVITY_CATEGORIES` with per-tab match predicates (all/scans/exports/account/team/system) plus `getActivityCategory()` fallback. Single source of truth on the frontend, mirroring `GET /v1/account/activity`'s server-side semantics; includes both dotted (mock) and underscore (real service) action forms
- `src/lib/activityCategories.test.js` — 14 vitest tests: every category's predicate asserted against the real `mockAuditEvents` (30 events, 20 actions), partition coverage + disjointness (classified actions == total, per-category sum == all count), real-backend underscore parity (`invite_created`→account, `waitlist_reviewed`→system, no bleed), unknown-action fall-through, and `getActivityCategory` fallback

### Changed
- `src/pages/app/AppActivityPage.jsx` — imports the module; removed the inline `CATEGORIES` const (three usage sites migrated: filtered memo, tab items, ⌘K hint)

### Verified
- Live tab counts (Scans·5 / Exports·4 / Account·8 / Team·4 / System·9 = 30) match the module partition exactly; 77/77 tests, lint at baseline, build passes

## [2026-08-05] - Launch Checklist Records Vitest Gate

### Documentation
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` — Deployment Checklist rewritten: names the vitest suite as step 1 (63 tests) and clarifies that `check:launch` runs `npm test` **first**, then frontend build → backend build → backend e2e, with the CI workflow noted as enforcing the same gate on push/PR
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` — baseline release gates now list the vitest suite explicitly and describe `check:launch`'s ordering

## [2026-08-05] - CI Gate: GitHub Actions (Frontend + Backend)

### Added
- `.github/workflows/ci.yml` — CI gate on push to `main` + all PRs, with two jobs:
  - **frontend** — `npm ci`, `npm run lint`, `npm test` (vitest, 63 tests), `npm run build` on Node 22 with npm cache
  - **backend** — `npx pnpm@9 install --frozen-lockfile` (matching `backend:install`), `npm run backend:build`, backend jest unit tests, and the in-memory Nest e2e health spec (no server/env required)
  - `concurrency` group cancels superseded runs; 15-min timeouts per job
- Closes the completion-review §4.2 Deployment row ("add GitHub Actions CI" → shipped)

### Verified
- All five gates pass locally before shipping: frontend lint (14 warnings, 0 errors), 63/63 vitest tests, frontend build, backend build, 20/20 backend unit tests, 1/1 e2e health test

## [2026-08-05] - Final Frontend Sign-Off Checklist (v2, Post-Admin-Completion)

### Documentation
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` revised to **v2**: re-audited the full surface after the admin workspace completion (12/12 pages)
  - **`?state=` forcing — 17 of 24 data pages** (was 13 of 22; the four new admin pages shipped with forcing built in); **9 pages still missing** (History, Reports, Account, Team + admin Overview, Waitlist, Users, Organizations, Feature Flags) — the one recommended close-out
  - **⌘K — 24 of 24 data pages pass** (print view exempt)
  - **Empty states — 24 of 24 pass**
- Live-verified this pass: `/app?state=empty` (forced empty), `/app/admin/jobs?state=error` (banner + retry), `/app/history` (25-row ledger, no banner — gap confirmed)

## [2026-08-05] - Phase 3 Records Formatter Consolidation As Complete

### Documentation
- `docs/reports/2026-08-04-frontend-completion-review.md` — formatter-consolidation note updated to record the consolidation as **confirmed complete before backend work**: test-suite count refreshed 30 → 63 (null/NaN/zero/sub-second/invalid-input edge cases), and the final sign-off sweep added (Billing storage meters → `formatStorageGb`, forensic `VeracityGauge` → `formatPct`; remaining `toFixed` calls confirmed intentional — SVG path geometry + static benchmark axis formatters)
- `docs/engineering/PHASE_TASK_LIST.md` — Shared Foundation And Polish section: test-suite row updated to 63 tests and a new `[x] Complete` row records the formatter sign-off sweep
- Historical CHANGELOG validation notes that reference 30 tests are left as-of-date records (the suite genuinely was 30 tests on those days)

## [2026-08-05] - Formatter Sign-Off Sweep (Forensic + Sample Report Surfaces)

### Changed
- Final hand-rolled-formatting sweep across the forensic components and Sample Report surfaces — migrated the last stragglers onto the shared `scanPresentation.js` module:
  - **Billing storage meters** — `AppBillingPage` was hand-rolling `${value.toFixed(1)} GB` for the storage StatCard and UsageMeter; both now use `formatStorageGb` (with TB escalation + fallback guards for free)
  - **Forensic VeracityGauge** — `ForensicReportPreview`'s `percentage.toFixed(1)` now renders through `formatPct`
- Verified the Sample Report surfaces (landing/page/document/print) were already fully migrated to `formatDateTime(sampleReportMeta.analysisTimestampIso)` and `ForensicMediaFrame` was clean
- Remaining `toFixed` calls are intentional: SVG path geometry (`chartGeometry.js`) and static benchmark-axis formatters (`BenchmarkPage.jsx`) that render raw values (`0.79`, `7.5%`) — not presentation formatting

### Notes
- The `src/components/forensic/` directory (ForensicReportPreview + 6 companions) is currently **unreferenced** — built as a static illustrative preview and not yet wired into any route; migrated anyway for consistency
- Gates: 63/63 tests, lint at baseline (14 warnings, 0 errors), production build passes

## [2026-08-05] - Frontend 100% Complete (User + Admin Workspaces Shipped)

### Status
- The full user workspace (15/15 pages) and admin workspace (12/12 pages) are both built and verified — **no frontend placeholders remain** (previously tracked as "6 admin placeholders")
- Completion-review report, engineering-roadmap, recommended-improvements, and CURRENT_IMPLEMENTATION_STATUS docs refreshed to reflect the shipped state; only approved MVP features (PDF export, scan dedup) and backend integration remain before launch

## [2026-08-05] - Admin Workspace 100% Complete (Last Four Placeholders)

### Added
- **Admin Jobs page** (`/app/admin/jobs`) — global verification job ledger with status filter tabs, queue/worker posture stats, drawer detail with file/timing info, and a retry action
- **Admin Reports page** (`/app/admin/reports`) — full report ledger with verdict badges, confidence bars, owning-team badges, search + verdict filters, pagination, and a signal-breakdown drawer; "Open" navigates to the workspace report view
- **Admin Roles page** (`/app/admin/roles`) — RBAC matrix with role cards, permission-scope grids, and member assignment counts
- **Admin Settings page** (`/app/admin/settings`) — environment readout, operational toggles, and platform-config surface
- All four are mock-backed with loading/empty/error states and `?state=` demo forcing; data layer: `mockAdminJobs`/`mockAdminRoles`/`mockAdminSettings` + `mockGetAdminJobs/Reports/Roles/Settings` + `USE_MOCK`-gated real paths in `api.js`; routes wired in `App.jsx`; dead `PlaceholderPage` deleted — the admin workspace is now **12/12 pages built**

### Fixed
- `mockReports` entries now carry `status: 'completed'` so verdict badges resolve instead of showing "Pending"
- `useMockData` hardened to pass `params ?? {}` to loaders — prevents destructure crashes for param-taking mocks called without args
- `getAdminReports` real path now serializes query params (matches `getActivityLogs` convention)

## [2026-08-05] - Frontend Sign-Off Checklist (Final Completion Review)

### Added
- `docs/reports/2026-08-05-frontend-signoff-checklist.md` — final audit of every built page (public, user workspace, admin workspace) against three sign-off criteria:
  - **`?state=loading|empty|error` demo forcing** — 13 of 22 data pages ✅; **9 data pages missing** (History, Reports, Account, Team + admin Overview, Waitlist, Users, Organizations, Feature Flags) — flagged as the one recommended close-out (~1 slice, same `useDemoState`/`withDemoOverride` pattern as the dashboard)
  - **⌘K command coverage** — 21 of 22 workspace pages ✅ (print view exempt as a non-command surface)
  - **Empty-state coverage** — all 22 data pages ✅ (loading/error/empty verified)
- Includes the full per-page matrix (route, forcing, commands, empty state), a public-page note (criteria N/A for static pages), and the carried legacy-admin-component note (Organizations + Feature Flags)

### Notes
- verified live: `/app?state=empty` renders the forced empty surface + demo banner; `/app/history` and `/app/admin` render real states with no demo banner (gaps confirmed, not assumed)
- overall verdict: **ready for Founder sign-off** with the demo-forcing retrofit recommended before investor/partner demos
- quality gates at review time: lint at baseline (14 warnings, 0 errors), 63/63 formatter tests, build passes

## [2026-08-05] - Formatter Test Suite Extended To Full Edge-Case Coverage

### Added
- `src/components/app/scanPresentation.test.js` expanded from 30 → **63 tests**, closing the coverage gap on the newer consolidated formatters so the shared module is regression-proof:
  - **formatPct** — zero/tiny ratios (`0.0009, 2` → `0.09%`), rounding boundaries (`1/3` → `33%`, `2/3` → `67%`, `0.996` → `100%`), `Infinity`/`-Infinity` fallback, `-0` → `0%`
  - **formatDateTime** — null/empty/invalid → fallback, custom fallback, TZ-deterministic local-constructor assertions (`Jul 24, 2026, 3:45 PM`), ISO-string parity via the en-US Intl contract, non-string/non-Date rejection
  - **formatScanTimestamp** — `Not available` fallback + delegation parity with formatDateTime
  - **formatDateLong** (`July 24, 2026`), **formatTimeShort** (`3:45 PM`, `12:05 AM`), **formatShortDate** (`Jul 24`, `Dec 1`) — fallbacks + en-US rendering
  - **formatCurrency** — null/NaN/Infinity fallback, whole-dollar grouping (`$1,234`), rounding (`1234.6` → `$1,235`), negative amounts (`-$1,234`)
  - **formatDurationMs** — null/NaN/Infinity/non-numeric fallback, sub-second ms (`850ms`), the 1s boundary (`1000` → `1.0s`), fractional rounding (`999.6` → `1000ms`)
  - **formatStorageGb** — fallbacks, GB with one decimal, the 1000 GB → TB boundary (`1.2 TB`)
  - **formatFileSize** — `Unknown size` for null/NaN/zero/negative, B without decimal, 1024-boundary stepping (KB/MB/GB), fractional rounding, GB-cap behavior pinned (`2048.0 GB`)

### Notes
- all datetime assertions use local-time constructors (the suite's established TZ-deterministic pattern, mirroring the formatHourShort tests) or en-US Intl parity checks — no locale/timezone drift in CI
- review notes: the `formatDurationMs(999.6) → "1000ms"` case is a deliberate behavior pin (the `<1000` branch runs before `Math.round`) with an inline comment so it is not "fixed"; the negative-currency and GB-cap boundaries were added per review
- validated: 63/63 tests pass, lint at baseline (14 warnings, 0 errors), build passes

## [2026-08-05] - Date-Format Sweep: Locale Pinning And Sample-Report Timestamp Standardization

### Changed
- **`formatDate` locale pinned to `en-US`** (`src/components/app/scanPresentation.js`) — was `toLocaleDateString(undefined, …)` (browser-locale-dependent) while every sibling formatter already pinned `en-US`; now `Intl.DateTimeFormat('en-US', …)` so output never shifts with the viewer's locale
- **`formatRelativeTime` >1-week fallback delegates to `formatDate`** — was `new Date(x).toLocaleDateString()` (locale-default AND a different format than `formatDate`); now both surfaces agree on the shared medium-date format
- **Sample Report timestamp standardized to a single canonical source** — the surfaces showed divergent hardcoded dates (`2026-06-25` in `SampleReport.jsx` + `SampleReportPage.jsx` vs `2026-07-16` in the document, which matches the report ID `PRV-20260716-041`):
  - `sampleReportContent.js`: `analysisTimestamp: '2026-07-16 14:32 UTC'` → canonical `analysisTimestampIso: '2026-07-16T14:32:00Z'`
  - `SampleReportDocument.jsx` (Generated + footer Timestamp), `SampleReport.jsx` (header), and `SampleReportPage.jsx` (header + Metadata Summary) now render `formatDateTime(sampleReportMeta.analysisTimestampIso)` instead of hardcoded strings

### Tests
- `scanPresentation.test.js` updated to the pinned contract: the `formatDate` options-contract test now spies on `Intl.DateTimeFormat` with `'en-US'` + the medium-date options, and the relative-time fallback test asserts parity with `formatDate`

### Notes
- audit confirmed `AppReportPrintPage` and all admin drawers (Users/Waitlist/Organizations) were already on the shared formatters; the remaining `.toLocaleString()` hits across src are plain-number formatting (correct)
- the `TIMESTAMP: 2026-06-25T14:32:01Z` lines in `ForensicReportPreview` and `SecurityPage` are intentional illustrative audit-log text in mono code blocks, not date rendering — left as-is
- validated: lint at baseline (14 warnings, 0 errors), 30/30 tests pass, build passes; live DOM checks confirmed the formatted timestamps render on the homepage section, `/sample-report`, and `/sample-report/print`

## [2026-08-05] - Account Activity API: Real GET /v1/account/activity

### Added
- `AccountService.getActivity()` — the user's workspace activity feed backed by the real `auth_audit_events` table:
  - **Scoped by actor email** (the table has no `user_id` column — events are matched on `actor_email = user.email`, trimmed + lowercased; a JWT without an email gets `400`)
  - **Category filters** mirroring the Activity page tabs (`all` / `scans` → `LIKE 'scan.%'` / `exports` → `LIKE 'report.%'` / `account` / `team` / `system` via explicit action lists, shared via `ACTIVITY_CATEGORY_ACTIONS`)
  - **Pagination envelope** matching `mockGetActivityLogs` exactly — `{ data, page, pageSize, total, totalPages }` (pageSize clamped 1–200, filter applied to both the data query and the exact-count query so `total` reconciles)
  - Rows mapped to the mock event shape: `severity` via the shared `auditSeverity` map, `resource_type`/`resource_id` from `entity_type`/`entity_id`, `actor_email` defaulting to `system`
- `GET /v1/account/activity` on `AccountController` (behind `SupabaseAuthGuard`, 30 req/min) accepting `category` / `page` / `pageSize` query params
- `backend/src/common/audit-severity.ts` — shared `auditSeverity` map extracted from the admin service (previously local) so the Account Activity and Admin Audit Logs surfaces badge events identically
- Frontend `getActivityLogs` now serializes `category`/`page`/`pageSize` into the query string on the real path (mock path unchanged)
- `docs/engineering/ACCOUNT_ACTIVITY_CONTRACT.md` — endpoint table, category semantics, response shape, scoping rationale, frontend callers

### Notes
- the Activity page fetches `{ pageSize: 100 }` and filters client-side, so real mode behaves identically to mock today; server-side `category` filtering is ready for future use
- reviewed + hardened: the generic category-filter helper was replaced with the codebase's conditional-builder pattern (see `countMembers`) to fix two typecheck errors (`TS7053` map indexing + `TS2589` excessively-deep instantiation)
- validated: backend `tsc --noEmit` clean, `nest build` passes, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - TrendChart Primitive Extracted And Reused

### Added
- **`src/components/ui/TrendChart.jsx`** — new ui primitive extracted from the admin AnalyticsPage `VolumeTrendChart`: self-hosted SVG line/area chart with range toggle (7d/14d), hover readout + guide line, crisp HTML axis labels, legend with range totals, and a built-in empty-data fallback (`emptyTitle`/`emptyDescription` props)
- **`src/components/ui/chartGeometry.js`** — shared chart geometry (`CHART_W/H`, `PAD`, `buildChartGeometry`, `pctOfViewBoxY/X`) split into a fast-refresh-safe module (mirrors the `popoverOrigin.js` pattern); exported from the ui barrel
- **Reused in three surfaces**: admin AnalyticsPage (replaces the local `VolumeTrendChart`), admin OverviewPage (new Scan Volume Trend section fed from `mockAnalytics.volume_trend`, with an Open-analytics link), and the user Dashboard (new Verification Volume section fed from the `analytics` resource with loading skeleton / retryable error / empty fallback)

### Notes
- AnalyticsPage now imports `CHART_W/H`/`PAD`/`pctOfViewBoxY/X` from the barrel for its VerdictVolumeChart + QueueThroughputPanel — no geometry duplication remains
- legend changed from last-point to range totals (with a "Last day" chip) — a deliberate improvement the range toggle now reflects
- review hardening: null-safe geometry (`p.scans || 0`), `defaultRange` validated against `ranges`, `useId`-scoped SVG gradient, `aria-pressed` on the range toggle, Last-day chip no longer hides on zero-scan days
- validated: frontend lint at baseline (14 warnings, 0 errors), 30/30 tests pass, build passes; live DOM checks on all three surfaces incl. the range toggle (14d 738 → 7d 477) and the dashboard `?state=empty` fallback

## [2026-08-05] - Admin Analytics API: Real GET /admin/analytics

### Added
- `AdminService.getAnalytics()` — aggregates the real `scans` table (30-day fetch, service-role client) into the exact `mockAnalytics` shape the Analytics page consumes:
  - 14-day `volume_trend` + `verdict_trend` daily buckets (verdict read from `result_payload.verdict.class`: `likely_authentic`/`suspicious`/`inconclusive`)
  - `scans_today`/`scans_7d`, `completion_rate`/`failure_rate`/`suspicious_rate` over the trend window
  - 7-day `media_type_distribution` keyed by `mime_type` (mock parity: media totals == `scans_7d`)
  - `queue_throughput` — whole-table exact head counts for `queue_depth`/`in_flight`, 12h `hourly_series`, `avg_processing_time_ms` proxied from `updated_at − created_at`
  - `top_organizations` (≤6) — real member counts, real per-org scan counts via first-membership mapping over the same 14-day window as the trends (so the page's numbers reconcile), storage from `organizations.storage_used_gb`, per-org completion
- `GET /admin/analytics` on `AdminController` behind the existing `SupabaseAuthGuard + AdminGuard` pair (30 req/min)
- `docs/engineering/ADMIN_ANALYTICS_CONTRACT.md` — response shape, per-field derivation table, verdict mapping, mock→real parity notes, error semantics

### Notes
- scans table has no dedicated processing-time column, so avg processing time is the completed-scan `updated_at − created_at` proxy (documented); `null` when no samples
- verdict lives in `result_payload.verdict.class` (written by `ScansService.buildVerdict`), not a scans column — malformed payloads count toward volume/completion but never a verdict bucket
- review hardening: top-org scan counts aligned to the 14-day trend window, `created_at` null-guarded, scalability path (Postgres-side aggregate) documented in the contract
- validated: backend `tsc --noEmit` clean, `nest build` passes, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - Admin Monitoring: Queue Health, Storage, DB Performance, External Services

### Added
- **`mockMonitoring` extended** (`src/lib/mockData.js`) with three new deterministic sections kept consistent with the existing `mockQueueSnapshot`/`mockAnalytics` values: `queue_health` (queued/in-flight/throughput/failure + 12-hour hourly series), `storage_utilization` (287.1 GB of 500 GB across media/reports/evidence/backups buckets with 30-day growth), and `db_performance` (avg/p95 query latency, connection pool 42/100, cache hit 98.2%, per-table row/size/dead-tuple stats)
- **`MonitoringPage` deepened** (`src/pages/admin/MonitoringPage.jsx`) — the four requested surfaces, all self-hosted SVG/CSS on the same mock-backed state pattern as Analytics (`useMockData` + `?state=loading|empty|error` forcing):
  - **Queue health** panel — queued/in-flight/throughput/avg-time stat cells, 12-hour hourly bar chart, failure-rate footer
  - **Storage utilization** panel — overall capacity meter with tone chips (57% used), per-bucket usage bars with share-of-total + 30-day growth deltas
  - **Database performance** panel — latency, connection-pool, and cache-hit stat cells plus a table-stats ledger with dead-tuple bars
  - **External service status** — the existing service list retitled and clarified against the other surfaces
- Loading skeleton extended for the new panels; empty/error states (incl. forced demo states) verified live

### Notes
- header copy updated to describe the full surface; all KPI/panel values trace to the same mock sources so monitoring and analytics never contradict
- validated: frontend lint at baseline (14 warnings, 0 errors), 30/30 tests pass, build passes, live DOM checks on populated/empty/error states

## [2026-08-05] - Admin API: Real Users / Organizations / Feature Flags / Audit Logs

### Added
- Five real admin routes on `AdminController` (all behind the existing `SupabaseAuthGuard + AdminGuard` pair, 30 req/min):
  - `GET /admin/users` — profiles mapped to the mock user shape (`{ id, email, displayName, role, team_enabled, created_at, last_sign_in, avatar_url, org_id }`; `last_sign_in` proxies `profiles.updated_at`, `org_id` resolved from `organization_members`, paginated `{ data, page, pageSize, total, totalPages }`)
  - `GET /admin/organizations` — organizations + live member/admin counts (admin = owner + admin) matching the mock array shape
  - `GET /admin/feature-flags` + `PATCH /admin/feature-flags/:key` (`UpdateFeatureFlagDto { enabled }`, 404 on unknown key, echoes `{ key, enabled, updated_at }`)
  - `GET /admin/audit-logs` — `auth_audit_events` mapped to the mock event shape with `severity` derived from the action (mirror of the mock's `AUDIT_SEVERITY_BY_ACTION`), `resource_type`/`resource_id` from `entity_type`/`entity_id`, returning `{ data, total }`
- `supabase/migrations/0006_feature_flags.sql` — `feature_flags` table (key PK, label, description, enabled, exposure with check constraint, owner) seeded with the 10 reference flags mirroring `mockFeatureFlags` (`on conflict (key) do nothing`)

### Notes
- review hardening: the backend severity map now covers the two real actions the admin service writes (`waitlist_reviewed`, `invite_created` → medium) instead of falling through to generic low; the Audit Logs page tone map was keyed in the spaced form `shortAction()` actually emits, which fixes the pre-existing dead keys for `team.member_added`/`member_removed` (rendered neutral before) and tones the real backend actions correctly
- validated: backend `tsc --noEmit` clean, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

### Notes
- dashboard + waitlist review/invite were already real and Supabase-backed; this slice closed the remaining admin surfaces the pages consume
- severity derivation keeps the Audit Logs page's severity chips/filters working identically in real mode
- validated: backend `tsc --noEmit` clean, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - Organization API: Real Routes, Schema, And Contract

### Added
- `supabase/migrations/0005_organization.sql` — new append-only migration defining `organizations` (plan/seats/storage/counters), `teams`, `organization_members` (join table, `owner/admin/member`, team_id set null on delete), and `organization_invites` (token, status, +7d expiry); RLS enabled with member-scoped read policies (writes are backend-only), `set_updated_at` triggers
- `backend/src/organization/` — new NestJS module implementing the six routes the frontend already targets: `GET /organization`, `POST /organization/invites`, `PATCH /organization/members/:id/role`, `PATCH /organization/members/:id/team`, `DELETE /organization/members/:id`, `DELETE /organization/invites/:id` (SupabaseAuthGuard + 30 req/min throttle, registered in `app.module.ts`)
- Three strict DTOs matching the frontend payloads exactly (`forbidNonWhitelisted`): invite `{ email, role, team }`, role `{ role }`, team `{ teamId }`
- `docs/engineering/ORGANIZATION_API_CONTRACT.md` — endpoint table, request/response shapes, business rules (owner guard, duplicate checks, seat capacity), schema summary, mock-to-real mapping, and deployment notes

### Notes
- **frontend required zero changes** — `api.js` already pointed all six functions at these routes behind `USE_MOCK` (verified path-for-path); flipping `USE_MOCK` activates the real flow
- review fixes: **all five mutations are now owner/admin-only server-side** (`403` via `assertCanManage`, enforcing the UI's `canManage` gating so a plain member cannot escalate or manage via direct API calls); the team-reassignment path uses a strict team lookup (`400` on unknown, mirroring the mock's rejection — the first-team fallback is invites-only); `cancelInvite` 404s on an unknown invite; `teams(organization_id)` + `organization_invites(organization_id, status)` indexes added; single-org-per-user and seeded-owner assumptions documented
- the org tables live in migration **0005, not 0002** — `0002_scans.sql` is scans-only and already applied to the remote Supabase project, so editing it would create migration drift (documented in the contract doc)
- service maps DB rows to the exact `mockGetOrganization` shape (`{ profile, teams, members, pendingInvites }`) with mock-parity rules (owner cannot be modified, invite fallback-to-first-team, seats enforced)
- validated: backend `tsc --noEmit` clean, `nest build` passes, backend jest 20/20, frontend lint at baseline (14 warnings, 0 errors)

## [2026-08-05] - Admin Audit Logs Page (replaces /app/admin/audit-logs placeholder)

### Added
- New `src/pages/admin/AuditLogsPage.jsx` — the full admin event trail (30 mock audit events) with: **severity filter chips** (All/Critical/High/Medium/Low with live counts), **actor / action / resource** selects, and a search box; severity + action badges per row (ui Badge palette); resource target chips; expandable rows with absolute timestamps; pagination (8/page); and **CSV export that mirrors the filtered view** (toast with the exported count)
- Deterministic `severity` on `mockAuditEvents` (`AUDIT_SEVERITY_BY_ACTION` — destructive/security actions are high, reads are low)
- `getAdminAuditLogs` in `api.js` gated behind `USE_MOCK` (real path `/admin/audit-logs`) + `mockGetAdminAuditLogs`
- `src/lib/csv.js` — shared `buildCsv` (quoted + escaped cells) and `downloadCsv` helpers extracted from WaitlistPage; **WaitlistPage migrated** onto the shared helper
- Page-scoped ⌘K commands: export CSV, filter to high severity, clear filters, go to overview; full loading/error/empty states with `?state=` demo forcing

### Changed
- `src/App.jsx`: `/app/admin/audit-logs` now routes to `AdminAuditLogsPage` instead of the placeholder

### Notes
- verified live: header meta (30 events / in view / high severity), severity chips with counts, High filter → 7 events all HIGH, Export CSV → toast "7 events in the CSV" (filtered view), 8 rows/page; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Global Error Boundary (approved feature #1)

### Added
- New `src/components/app/ErrorBoundary.jsx` — class boundary with a recoverable fallback: designed card (error glyph, "Something went wrong" serif heading, recovery copy), the error message in a mono detail block, **Reload page** (window.location.reload) + **Try again** (state reset that re-mounts the subtree) actions, and a **dev-only stack trace** (`import.meta.env.DEV` gated `<details>` showing `error.stack` + `componentStack`)
- The fallback is deliberately raw token-styled markup (no ui primitives) so it can never re-crash from the very failure it is presenting; `role="alert"` for screen readers; optional `onError` callback hook for the future Sentry integration

### Changed
- **Three wiring levels** so no crashing page blanks the screen: (1) a top-level boundary around `<Routes>` as the last-resort full-screen fallback; (2) `PublicLayout` wraps its `<Outlet />`; (3) both `AppShellLayout` and `AdminShell` wrap their `<Outlet />` with a **location-keyed** boundary (`key={location.pathname}`) so a page crash shows the fallback inside the intact shell and navigating to another route resets the boundary

### Fixed
- dev stack trace never rendered on first pass — `getDerivedStateFromError` only stored `error`, so `componentStack` was never saved; `componentDidCatch` now stores `errorInfo` in state

### Notes
- live-verified end to end with a temporary injected render crash on the admin monitoring page: fallback card rendered inside the intact admin shell (CONTROL ROOM chrome + breadcrumb persisted), the injected message displayed in the detail box, dev stack trace expanded with real frames, and navigating to `/app/admin` recovered the shell to a fully-rendered overview; injection fully reverted; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Admin Monitoring Page (replaces /app/admin/monitoring placeholder)

### Added
- New `src/pages/admin/MonitoringPage.jsx` — status banner + header meta pills (overall status, 30d uptime, open incidents), KPI StatCard row (uptime, avg response, open incidents, checks 24h), the shared `SystemHealthPanel` with refresh, a richer `ServiceStatusList`, and an expandable incident history with severity dots / status chips / duration / date range / post-mortem summary
- `mockMonitoring` in `mockData.js` (overall status, 6 services with latency/region/uptime/last-check, 5 incidents across severities incl. one open) + `mockGetMonitoring` in `mockApi.js` + `getMonitoring` in `api.js` gated behind `USE_MOCK` (real path `/admin/monitoring`)
- `src/components/admin/ServiceStatusList.jsx` — detailed per-service rows (status dot, region, latency via `formatDurationMs`, 30d uptime via `formatPct`, last check via `formatTimeShort`), responsive grid with mobile sub-labels
- `src/components/admin/healthStatus.js` — shared `STATUS_CONFIG` moved out of `HealthCheckRow` (fast-refresh-safe module, mirrors the popoverOrigin pattern) so the panel and the service list share one status vocabulary
- Incident history includes an **Open only** filter chip (1 open incident), expandable rows, and page-scoped ⌘K commands (refresh checks, toggle open-only, go to overview); full loading/error/empty surfaces with `?state=` demo forcing

### Changed
- `src/App.jsx`: `/app/admin/monitoring` now routes to `AdminMonitoringPage` instead of the placeholder

### Notes
- verified live: header pills (PARTIAL DEGRADATION / 99.98% UPTIME / 1 OPEN INCIDENT), KPI cards (214ms avg), SystemHealthPanel with Refresh checks, service list reading "4 of 6 services operational" (worker degraded + email not configured), and all 5 incidents incl. the ongoing worker-memory-pressure one; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Admin Analytics: Verdict Mix And Queue Throughput

### Added
- **Scan volume by verdict** (`VerdictVolumeChart` on AnalyticsPage): self-hosted SVG stacked-bar chart of the same 14-day window, split into Authentic (emerald) / Suspicious (amber) / Inconclusive (sky) segments that always sum to each day's scan total; hover guide with day-level split readout, HTML axis labels, and a legend with totals + shares
- **Queue throughput** (`QueueThroughputPanel`): headline stat blocks (scans last hour, avg processing time via `formatDurationMs`, queue depth + in-flight) plus a self-hosted SVG 12-hour processed-per-hour bar chart with hour axis labels, a 24h processed note, and the failure rate
- `verdict_trend` + `queue_throughput` on `mockAnalytics` (deterministic; throughput mirrors `mockQueueSnapshot`); both added to `EMPTY_ANALYTICS` so the `?state=empty` surface stays safe
- `formatHourShort` ("9 AM") in `scanPresentation.js` + test coverage — keeps the zero-inline-date-time-formatting standard (hour labels previously would have been a page-local Intl call)

### Notes
- the page already covered KPI trend charts + top organizations from the earlier slice; this pass completed the spec's two missing surfaces (header copy updated to match)
- verified live: all three chart SVGs render (trend, verdict stack, hourly bars), queue stat blocks + legend + 24h/failure readouts present; lint at baseline (14 warnings, 0 errors), 30 tests pass, build passes

## [2026-08-05] - Team Scoping In The Workspace

### Added
- `mockUserTeamById` in `src/lib/mockData.js` — single source of truth mapping every seed user to a workspace team (org_001 members resolve to their roster team, consistent with `mockOrgWorkspace.members`; other-org seed users are distributed deterministically so every scan carries a team)
- `team_id` on `mockScans` and `mockReports`; `mockInitiateScan` now stamps new uploads with the creator's team so the upload → queue loop stays team-scoped
- `TEAM_META` / `TEAM_IDS` / `getTeamMeta` in `scanPresentation.js` (team registry mirroring `mockOrgTeams`, mapped onto the ui Badge palette)
- `src/components/app/TeamBadge.jsx` — owning-team chip (short name in a tone-coded ui Badge, full name as tooltip)
- `src/components/app/TeamFilter.jsx` — pill-chip team scoping with live counts ("All teams" + one chip per team)

### Changed
- **Dashboard ledger** (History tab): new Team column with badges, plus a TeamFilter above the DataTable (counts derived from the full scan list, contextual empty state when a filter yields nothing); the Recent-reports feed cards now show the owning-team badge
- **Queue page**: Team column + TeamFilter on the Recent Jobs table (filter combines with search/pagination)
- **Reports page**: TeamFilter above the verification list and a team badge on every row; a filtered-empty state appears when a team has no scans

### Notes
- verified live: ledger shows "All teams 25 / Legal 5 / Product 10 / Growth 10" chips, Legal filter → 5 rows all Legal, queue Growth filter → 8 Growth rows, reports Product filter → 10 Product rows, feed card badges render; lint at baseline (14 warnings, 0 errors), 28 tests pass, build passes

## [2026-08-04] - Frontend Unit Tests: scanPresentation Formatter Suite

### Added
- `vitest` devDependency + `vitest.config.js` scoped to `src/**/*.test.{js,jsx}` (the backend jest suite is untouched)
- `npm test` / `npm run test:watch` scripts; `check:launch` now runs frontend tests first
- `src/components/app/scanPresentation.test.js` — 26 tests covering `formatCount`, `formatDate`, `formatPct`, `percentOf`, and `formatRelativeTime` edge cases (null/undefined/NaN, zero limits, rounding boundaries, exact unit boundaries via fake timers)

### Fixed
- `formatDate` crashed (`RangeError: Invalid time value`) on invalid date strings — it now shares the `parseTimestamp` guard used by the other date formatters and returns the fallback instead (parity preserved for valid inputs; verified live)

## [2026-08-04] - Activity Log: Actor/Action/Target Chip Presentation

### Changed
- `AppActivityPage` row metadata now renders the full **actor / action / target chip triad**: actor avatar + name, the tone-coded action badge, and a new bordered **target chip** (resource type + resource id in a mono pill) replacing the previously bare resource-id text
- Card description updated to reflect the chip presentation

### Notes
- The page was already complete from the prior slice (category tabs with live counts, searchable ledger, detail expansion, pagination, `?state=` loading/empty/error forcing, and ⌘K commands) — this pass finished the chip treatment per the approved spec; verified live (8 target chips on page 1, e.g. `user · user_0001`), lint at baseline, build passes

## [2026-08-04] - Formatter Consolidation (date-family completion)

### Added
- `formatShortDate` ("Jul 22") — consolidates the analytics chart's 3 inline month/day labels
- `formatDateLong` ("July 31, 2026") — consolidates the org-drawer long-date
- `formatTimeShort` ("3:45 PM") — consolidates the last-updated/last-checked time-only labels (admin overview + system health panel)
- Shared internal `parseTimestamp` validation used by all date formatters

### Changed
- `formatScanTimestamp` now delegates to `formatDateTime(value, 'Not available')` — one canonical medium-date/short-time implementation instead of two overlapping ones (the prior sentinel coupling is gone)
- AnalyticsPage (3 chart-label sites), OrganizationsPage (long date), OverviewPage (last-updated time), SystemHealthPanel (last-checked time) all migrated to the shared helpers

### Notes
- Sweep confirms **zero** inline `toLocaleDateString`/`toLocaleTimeString`/`dateStyle`/`timeStyle` usages remain outside `scanPresentation.js` — every date/time string in the app now flows through the shared module
- Minor cosmetic unification: time-only labels use the app-wide short-time style (1-digit hour, e.g. "9:00 AM" instead of "09:00 AM")

## [2026-08-04] - Formatter Consolidation (final pass into scanPresentation.js)

### Added
- `formatCurrency` (USD, integer dollars, em-dash fallback) — moved from Billing into the shared module
- `formatDurationMs` ("850ms" / "2.5s") — consolidates the ms→s formatting that existed in three queue surfaces
- `formatStorageGb` ("18.4 GB" / "1.2 TB") — consolidates the org-storage formatting shared by the admin orgs + analytics pages

### Changed
- Billing: local `formatCurrency` removed; two inline percent details now use `formatPct` (NaN-safe)
- Reports confidence + EvidenceAppendix confidence now render through shared `formatPct` (with the 'Pending' fallback preserved)
- Queue snapshot panel, Queue page, and Dashboard queue posture all use `formatDurationMs` (no more local `formatMs`/inline `(ms/1000).toFixed(1)`)
- Activity page inline `dateStyle/timeStyle` datetime → shared `formatDateTime`
- Waitlist page: 4 raw `toLocaleDateString`/`toLocaleString` call sites → shared `formatDate`/`formatDateTime` (dates now use the standard medium format)
- Organizations page: local `formatStorage` removed; created-date column → shared `formatDate`
- Analytics top-orgs table storage column → shared `formatStorageGb`

### Notes
- Zero local formatter definitions remain outside `scanPresentation.js`; the remaining raw `.toLocaleString()` calls are plain-number formatting and the chart's page-specific short-date axis labels

## [2026-08-04] - Admin Analytics Page (replaces /app/admin/analytics placeholder)

### Added
- New `src/pages/admin/AnalyticsPage.jsx` — KPI StatCard row (scans today/7d, completion, failure, suspicious), self-hosted SVG scan-volume trend chart (7d/14d range toggle, hover day-level readout, area + completed + failure layers), outcome-rate meters, media-type distribution bars, and a sortable top-organizations AdminTable
- `mockAnalytics` extended with a deterministic 14-day `volume_trend` and `top_organizations` (derived from the org registry)
- Full loading/empty/error surfaces with `?state=loading|empty|error` demo forcing, page-scoped ⌘K commands (incl. an analytics-export toast action), and responsive behavior (min-w-0 grid children so the AdminTable scrolls internally instead of stretching the layout at mobile)

### Changed
- `src/App.jsx`: `/app/admin/analytics` now routes to `AdminAnalyticsPage` instead of the analytics placeholder

## [2026-08-04] - Backend Kickoff: Cookie-Based Auth Hardening, Scan Round-Trip Fixes, Report Payload API

### Added
- **Auth hardening**: refresh tokens now travel in an httpOnly cookie (`provance_refresh`) set by `POST /v1/auth/sign-in` and rotated on every `POST /v1/auth/refresh`; new `POST /v1/auth/sign-out` burns the refresh token server-side (rotation consumes it) before clearing the cookie
- `AUTH_COOKIE_ENABLED` / `AUTH_COOKIE_SAME_SITE` / `AUTH_COOKIE_SECURE` / `AUTH_COOKIE_MAX_AGE_DAYS` env config (validated in `env.validation.ts`, documented in `backend/.env.example`)
- **Reports API**: new `ReportsModule` with `GET /v1/reports` (paginated completed scans, `{ data, total, page, pageSize }`) and `GET /v1/reports/:id` (full `result_payload` + signed asset preview URL)
- Backend tests: `cookie-session.util.spec.ts` + `auth.controller.spec.ts` (cookie set/rotate/clear, body stripping, body fallback) — 20 tests total pass

### Fixed
- Real upload round-trip blocked by `InitiateScanDto` rejecting the frontend's `processingMode` under `forbidNonWhitelisted` → DTO now accepts `quick|standard|deep`
- `submitScan` now verifies the file actually exists in Supabase Storage before queueing (missing upload → 400 instead of a queued job that fails in the worker)

### Changed
- `listScans` returns the frontend `data` contract (with a `scans` alias for older consumers)
- Frontend: `credentials: 'include'` on all API calls; cookie-aware refresh (refreshes even when the body refresh token is absent); `signOut()` API call wired into `AuthContext`; `getReport()` added and the printable report page migrated to it (tolerant of `{ report }` / `{ scan }` / bare shapes)
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` refreshed (cookie flow, reports endpoints, next-strategy work)

## [2026-08-04] - Approved Feature Set Folded Into Roadmap Docs

### Added
- Founder approved all 10 recommended features from `docs/reports/2026-08-04-frontend-completion-review.md` (error boundary, report PDF export, scan dedup, org invites, admin analytics/monitoring, session hardening, Sentry + PostHog, webhooks UI, usage enforcement, evidence appendix)
- New **Approved Feature Set** tables/sections in `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` and `docs/product/development-roadmap.md`
- Approved features tracked in `docs/project-state/current-feature-status.md` (10 new rows), `product-roadmap.md`, `development-priorities.md` (priorities renumbered), and `future-improvements.md`

### Changed
- Organization Management (member roster, roles, team access, invites) marked **shipped** in all docs — it was built during the Phase 3 workspace build-out and was approved feature #4
- `MASTER_DEVELOPMENT_ROADMAP.md`: Phase 3/4/5 tasks extended with the approved features; "Post-MVP Expansion Themes" and "Immediate Active Phase" refreshed (Phase 3 in progress; team/org workflows removed from deferred)
- `engineering-roadmap.md`: Phase 2 marked Completed, Phase 3 In Progress
- Review report recommendation table now shows Approval status with a cross-doc note

## [2026-08-04] - Phase 3 Polish Pass (Eyebrows, ⌘K Parity, Responsive)

### Changed
- **Unified page headers**: `AppReportsPage`, `AppAccountPage`, `AppTeamPage`, `AppAccessDeniedPage` moved from `text-xs tracking-[0.18em]` to the standard `font-mono text-[11px] tracking-[0.22em]` eyebrow — all 14 user-workspace pages now match
- **⌘K command parity**: added page-scoped commands to the 6 previously-bare workspace pages (Uploads: browse/mode/start; Queue: upload-more/open-next; History: start-verification/open-latest; Reports: upload-new/open-latest; Account: security/notifications; Team: organization/account)
- **Admin shell ⌘K**: `AdminShell` now wraps in `CommandRegistryProvider` and renders a `CommandPalette` (all admin routes + a proper `Actions` group with back-to-workspace / sign-out), with a mobile search trigger; page-scoped commands added to all 5 admin pages (Overview, Waitlist, Users, Organizations, Feature Flags)

### Fixed
- **Responsive overflow**: the `Tabs` primitive now `flex flex-wrap` — the workspace dashboard's activity tab strip overflowed horizontally at mobile widths (411px > 340px); verified clean across workspace + admin pages at 340px
- **rules-of-hooks**: `OverviewPage`'s `useRegisterCommands` was initially placed after conditional loading/error/empty returns — moved above all returns (caught by lint)

## [2026-08-04] - Shared Formatter Consolidation (formatDateTime + formatPct fallback)

### Added
- `formatDateTime(value, fallback = '—')` in `src/components/app/scanPresentation.js` — canonical medium-date/short-time formatter, replacing the duplicated local versions in admin `UsersPage` (5-field `toLocaleString`) and `AppReportPrintPage` (wrapper over `formatScanTimestamp`)
- `formatPct` gained a third `fallback` parameter and now guards `!Number.isFinite` in addition to `== null`

### Changed
- `UsersPage` imports the shared `formatDateTime` (hour style unified to the app-wide short-time format)
- `AppReportPrintPage` imports `formatDateTime` + `formatPct`; 6 `formatPercent` call sites now `formatPct(value, 0, 'Pending')` and 4 timestamp call sites pass `'Not available'` — output identical to the removed locals
- No local `formatDateTime`/`formatPercent` copies remain in `src`

### Fixed
- **Pre-existing print-page crash** (found while verifying): `mockGetScan` returns the bare scan while `AppReportPrintPage` read `response.scan` strictly, so a loaded page hit `state.scan.id` on `undefined`. Now `response?.scan || response` — the same tolerant pattern `AppReportsPage` already uses

## [2026-08-04] - Activity Log Page (User Workspace Complete)

### Added
- `src/pages/app/AppActivityPage.jsx` replacing the `/app/activity` placeholder — the **last user-workspace placeholder**; all 15 user pages are now built
- Category tabs (All / Scans / Exports / Account / Team / System) with live event counts, driven by a single `CATEGORIES` action→category map
- Live search across actor, action, resource type, and resource id, combined with the active category
- Paginated ledger (8/page) of expandable rows: controlled `aria-expanded` toggles reveal an event detail panel (event id, actor, resource, absolute timestamp)
- Two page-scoped ⌘K commands: **Expand all activity rows** (toggle inversion over the visible page) and **Filter to scan events**
- Loading / empty / error states via `?state=` demo forcing; `ACTION_META` presentation map with tone-coded dots and badges

### Changed
- `src/App.jsx` route swapped and `src/pages/app/AppPlaceholderPage.jsx` **deleted** (no remaining references — queue/history/profile/activity all have real pages)

### Fixed
- `useRegisterCommands` deps: `visible` is now memoized and the expand-all `onSelect` reads `expanded` via the functional `setExpanded` update — removing a latent stale-closure bug where expand-all would toggle from an outdated snapshot

## [2026-08-04] - Organization Management: Team Access

### Added
- **Teams & access card** on the Organization page (`/app/organization`): workspace teams with live member counts derived from the roster, descriptions, and avatar stacks
- **Per-member team select** in the member roster — owners and admins can reassign any non-owner member to a team (mock-backed `updateMemberTeam`, owner-guarded)
- **Team capture in the invite flow** — the invite Drawer now includes a team radio-card selector (preselected to the first team); pending invites display their target team
- Team chips on non-editable roster rows (owner/self/read-only views) so membership stays visible
- `Card` primitive now forwards an `id` prop (scroll targets/anchors) — fixes the latent dead `#org-members` ⌘K scroll target

### Fixed
- **Permission gating (review HIGH)**: the per-row role/team/Remove controls were gated only by the *target's* role, so a Member sign-in could re-scope other members. All member-management controls (and the Invite button) are now gated on `canManage` (owner or admin) — verified live across both test accounts
- **Mock owner guard**: `mockUpdateMemberTeam` now rejects owner reassignment (defense-in-depth, consistent with `mockUpdateMemberRole`)
- **Missing import**: `mockUpdateMemberTeam` was called in `api.js` but not imported — the handler threw `mockUpdateMemberTeam is not defined` on every team change

## [2026-08-04] - Shared Formatter Extraction

### Changed
- Extracted `formatCount`, `formatDate`, `formatPct`, and `percentOf` into `src/components/app/scanPresentation.js`, alongside the existing `formatRelativeTime`
- Migrated callers to the shared utils: `AppBillingPage` (formatCount/formatDate + used/limit meters now via `percentOf`), `AppApiKeysPage` (formatCount/formatDate, keeping the `'Never'` fallback), `AppDashboardPage` (formatPct), admin `OverviewPage` (formatPct with `digits=1` to preserve the old `toFixed(1)` output), and admin `UsersPage` (formatDate)
- Verified zero local copies remain and outputs are byte-identical to the removed helpers (e.g. `0.94 → "94%"`, meter clamping, em-dash fallbacks)

## [2026-08-04] - Phase 2: Minimal Supabase-Ready Auth (Mock-First Test Accounts)

### Added
- Mock auth layer in `src/lib/mockApi.js`: `mockSignInWithPassword`, `mockRequestPasswordReset`, `mockConfirmPasswordReset`, `mockAcceptInvite`, and a rewritten `mockGetCurrentViewer`
- Two documented test accounts (see `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md`): `founder.admin@provance.local` (admin: dashboard + admin panel) and `founder.test@provance.local` (member: dashboard only, admin routes blocked); any 8+ char password is accepted for a known account
- `src/lib/api.js` now gates `signInWithPassword` / `requestPasswordReset` / `confirmPasswordReset` / `acceptInvite` behind `USE_MOCK` (ADR 004 compliance — auth was the last un-gated surface)

### Fixed
- **Identity elevation bug**: `mockGetCurrentViewer` always returned the admin account, so AuthContext session hydration on any full page load overwrote a signed-in member session with an admin one (requireAdmin never blocked). It now returns the account actually signed in (read from the persisted session), re-deriving permissions from the account by email so tampered sessions cannot elevate

### Notes
- verified live: admin sign-in → dashboard + admin panel; member sign-in → dashboard; member reload on `/app/admin` → `/app/access-denied`; sign-out clears the session and redirects; logged-out visits to protected routes redirect to `/signin?redirect=...`
- legacy sessions seeded with the old mock viewer email (`joshua.onyekachukwu@provance.io`) are no longer recognized on reload and will be cleared — use the two documented test accounts
- the real Supabase path (backend `/auth/sign-in` + `ADMIN_EMAILS` allowlist) is untouched and activates when `USE_MOCK` flips to `false`

## [2026-08-04] - Development Reset: Phase 1 Landing Page Cleanup

### Removed
- `src/pages/HomePage.jsx` — removed the **Open Benchmark** (TrustBar) and **Live Product Preview** (ProductShowcase) sections from the landing page per the Founder reset directive. The component files are preserved in the repo for reintroduction when real product functionality exists to showcase

### Restored
- `src/components/SampleReport.jsx`, `src/components/SampleReportDocument.jsx`, `src/lib/sampleReportContent.js` — reverted to the pre-redesign version (HEAD): the sample report now uses the remote broadcast-frame image instead of the self-hosted ForensicMediaFrame visual

### Notes
- the restored remote image (trae.ai text-to-image host) does not resolve in the preview environment (naturalWidth 0, no network response). Decision pending with the Founder: keep the literal remote image as restored, or render the self-hosted ForensicMediaFrame inside the restored layout (recommended for reliability)

## [2026-08-04] - Multi-Agent Development Operating Model

### Added
- `docs/ai-agents/RUNTIME_MAPPING.md` — operationalizes the documented agent org: every organizational role mapped to the runtime agent types this environment actually exposes (orchestrator, file-picker, code-searcher, basher, researcher-web/docs, code-reviewer-deepseek-flash, preview tools), plus the routing and review workflow
- `docs/engineering/ENGINEERING_STANDARDS.md` — standing code conventions grounded in the codebase: ui primitive kit rules (barrel exports, fast-refresh split, Button `to` prop), Kowalski motion treatment, data layer (USE_MOCK gate, useResource, useDemoState), design tokens, copy rules (no em dashes), quality gates, docs-sync rules
- `docs/engineering/PR_REVIEW_GUIDELINES.md` — reviewer checklist (correctness, consistency, security, scope, docs, validation), severity levels, verdicts, review output format, review-driven fix loop
- `docs/decisions/002-design-system-ratification.md` — UNIFIED design system + ui primitive kit ratified
- `docs/decisions/003-multi-agent-operating-model.md` — multi-agent development operating model ratified (Founder directive)
- `docs/decisions/004-mock-first-frontend-development.md` — single USE_MOCK gate ratified for the MVP phase

### Updated
- `docs/ai-agents/agent-registry.json` — `runtime_mapping` fields updated to the real runtime agent types (was platform names / null)
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` — Phase 2 completion recorded (ui kit, app shell, dashboard, uploads, queue, command registry, Popover, Benchmark page, mock scan lifecycle)
- `docs/MASTER_DOCUMENTATION_INDEX.md` — dead links fixed (WORKFLOW.md, DESIGN_DIRECTION.md, design-audit.md), Phase 2 ui kit table added, user dashboard build status corrected

### Notes
- ratified by the Founder on 2026-08-04 (ADR 003); committed on chore/docs-multi-agent-operating-model

## [2026-08-04] - Media Upload Page (Drag-and-Drop Into The Queue)

### Added
- `src/pages/app/AppUploadsPage.jsx` — full rebuild of the Media Upload page: drag-and-drop zone (click-to-browse via a label-wrapped sr-only input, drag-over highlight, `relatedTarget`-guarded dragleave), **ForensicMediaFrame** preview with a phase-driven badge, and a **processing-mode selector** (Quick / Standard / Deep) with per-mode ETA, description, and coverage list
- Upload-into-queue state machine: `starting → uploading (simulated progress bar in mock mode) → submitting → queued`, with a 4-step tracker, verification ID readout, error state with retry, and a dev-only `?demo=file|start` affordance (inert in production, module-guarded against StrictMode/HMR double-runs)
- Auto-lands on the **Verification Queue** (`/app/queue`) two seconds after the scan is queued (skippable), passing the new scan id via navigation state
- `src/pages/app/AppQueuePage.jsx` — new **Recent Jobs** section: DataTable of all scans with a dismissible "just entered the queue" banner and a "Just added" badge on the newly uploaded scan; demo-state support via `useDemoState`
- Mock scan lifecycle in `src/lib/mockApi.js` — in-memory scan store (localStorage-persisted, capped at 50) plus `mockInitiateScan` / `mockSubmitScan` / `mockGetScan`, with `mockGetQueueSnapshot` now derived from the live store; `initiateScan` / `submitScan` gated behind `USE_MOCK` in `src/lib/api.js` so the upload → queue loop runs end-to-end without a backend

### Notes
- review fixes: `acceptFile` is a no-op while an upload is in flight (no mid-flight file swap desync), validation errors render once (amber block only), dead `inputRef` removed, manual "View verification queue" button forwards the scan id state, `JOBS_COLUMNS` memoized, `aria-live` on the status card
- verified live: file → preview → mode → start → queued → auto-land on the queue with highlight; scan persists across reloads

## [2026-08-03] - Shared Popover Primitive (Origin-Aware Kowalski Treatment)

### Added
- `src/components/ui/Popover.jsx` — new reusable primitive encapsulating the origin-aware popover treatment previously hand-rolled in the shell and CommandPalette: trigger render-prop (`open`/`close`/`toggle`/`isOpen`/`triggerRef`), children render-prop (`{ close }`), transform-origin computed from the trigger element's screen position (clamped to safe %), sub-300ms opacity/scale/y entrance (160ms, `[0.22, 1, 0.36, 1]`), dismissal on outside pointer-down and Escape, and focus moved into the panel on open / restored to the trigger on close
- Reduced-motion path renders the panel as a **plain element** (no framer-motion / `AnimatePresence`) so open/close is instant and never depends on `requestAnimationFrame` — fixes stalled exits when rAF is throttled (verified in the preview, which runs with `prefers-reduced-motion: reduce`)
- `src/components/ui/popoverOrigin.js` — shared `computeTransformOrigin(rect)` helper used by both Popover and CommandPalette so the origin math can't drift; exported from the ui barrel
- UI-kit demo section on `/ui-kit` with a left-anchored popover (open / close-and-count / Escape)

### Migrated
- `src/components/app/AppShellLayout.jsx` — notification bell (`role="dialog"`) and avatar menu (`role="menu"`) rebuilt on the Popover primitive; the local `useDismiss`, `usePopoverFocus`, and `POPOVER_MOTION` helpers plus the now-unused `useRef` and framer-motion imports were deleted (net ~120 lines removed)

### Notes
- review fixes: `desktopClassName` on the migrated components trimmed to just the width (the primitive's default already anchors under the trigger); close() snapshots whether focus was in the panel so focus restore works even when the reduced-motion branch unmounts synchronously
- verified live: bell + avatar menu open with origin-aware transforms, dismiss on outside pointer / Escape, focus returns to the trigger, and the CommandPalette still opens with the shared-helper origin

## [2026-08-03] - CommandPalette Command Registry

### Added
- `CommandRegistryProvider` + `useRegisterCommands` / `useCommandRegistry` (fast-refresh-safe split: component in `commandRegistry.jsx`, hooks/context in `commandRegistryContext.js`)
- any page can contribute ⌘K commands while mounted — auto-register on mount, unregister on unmount, re-register on deps change; page commands override same-id base palette items
- `CommandPalette` merges registry commands into its item list (registry wins by id; no provider = unchanged behavior)
- dashboard registers two page commands: **Export report PDF** (jumps to the latest completed report's print page) and a **workspace toggle** that overrides the shell's same-id action

### Notes
- verified live: commands appear on the dashboard, disappear on other pages, re-appear on return; override collapses duplicate workspace toggle to one entry

## [2026-08-03] - Button-as-Link Primitive (to prop)

### Added
- `Button` now accepts a `to` prop: when set, it renders a react-router `<Link>` with real `href` / middle-click / cmd-click semantics while keeping the exact same visual class string
- disabled + loading handled for the link form via `aria-disabled` + `preventDefault`, with caller `onClick` still forwarded

### Migrated
- placeholder "Back to dashboard", dashboard hero actions (Start verification / View reports / Scan history), and the ui-kit header back link now use `to` instead of hand-rolled Link class strings or navigate-on-click
- `UiKitPage` gained an "As link (to)" demo row

### Notes
- verified live: all migrated actions render as real `<a href=...>` anchors carrying the Button class string

## [2026-08-03] - Dashboard Overview: Triage vs History Workspace Tabs

### Added
- `WorkspaceTabs` — primary workspace surface rebuilt around the Phase 2 primitives: a Tabs (pill) switch between **Triage** (Risk Watch, Queue Posture, System Status Card panels) and **History** (full scan ledger DataTable)
- `LedgerPanel` gains a `pageSize` prop (default 5; History tab uses 8)

### Notes
- keeps the existing mock-backed data flow, hero, analytics KPI StatCard grid, and Activity tabs untouched
- verified live: tab switching (triage panels ↔ history table with 8 rows), demo-state forcing still works across the new structure, and Live restore

## [2026-08-03] - Shared useResource Hook + Real Queue / History / Reports Pages

### Added
- `src/lib/useResource.js` — shared per-slice loader hook extracted from the dashboard, with docs and an optional `deps` param for parameterized loaders (e.g. `[scanId]`); every future workspace page gets loading / empty / error + retry for free
- Real `AppQueuePage` (queue snapshot StatCards + posture card) and `AppHistoryPage` (scans ledger DataTable) replacing their placeholder routes
- `AppReportsPage` rewritten on the hook with retry everywhere; fixed two latent mock-shape bugs (read `response.scans`/`response.scan` which the mock never returns → list and detail now resolve correctly)

### Notes
- dashboard imports the shared hook; local definition and unused react imports pruned
- verified live: dashboard regression clean, queue/history/reports list + scanId-keyed detail render with all state surfaces

## [2026-08-03] - Dashboard Demo-State Controls (dev-only)

### Added
- `src/lib/useDemoState.js` — dev-only utility forcing dashboard section states for review and screenshots
- URL param `?state=loading|empty|error` on `/app` renders every section in that state, gated by `import.meta.env.DEV` so it is inert in production builds
- Floating demo-state banner (Live / Loading / Empty / Error) that switches states without editing the URL
- All seven dashboard resources (scans, reports, notifications, queue, health, analytics, activity) wrapped with `withDemoOverride`; zeroed empty-data fixtures for object-shaped slices

### Notes
- eliminates reliance on the mock's random error injection for demonstrating loading/empty/error surfaces
- verified live: empty (ledger/risk/activity empties + zeroed KPIs), error (every section + retry), loading (all skeletons), and Live restore

## [2026-08-03] - Dashboard Phase 2: Analytics KPI Row, Activity Feed, And Tabs

### Changed
- `src/pages/app/AppDashboardPage.jsx` — the KPI row is now driven directly by `mockAnalytics` instead of scan-derived counts: **Scans Today** (47) and **7-Day Volume** (312) as raw counts, **Completion Rate** (94%) and **Suspicious Rate** (22%) as formatted percents, each StatCard with its own loading / error state from the analytics `useResource` slice (the old Workspace/Queue/Completed/Flagged cards and the now-unused `completionRate` memo were removed)
- Added a **workspace activity feed**: a new `getActivityLogs({ pageSize: 50 })` slice feeds `ActivityFeedRow` items (action prettified via `formatAction`, resource-type colored dots, relative timestamps)
- The bottom Reports + Notifications grid is now an **`ActivityTabsPanel`** using the `Tabs` primitive (pill variant, controlled value) to switch between **Activity / Recent reports / Notifications** — each tab body manages its own loading (skeleton rows), error (retryable EmptyState), and empty states via a shared `FeedState` component; the Notifications tab shows an unread-count badge
- `src/components/ui/Tabs.jsx` — added an optional stable `id` prop so parent panels can complete the `aria-controls` → `role="tabpanel"`/`aria-labelledby` wiring (previously `aria-controls` pointed at non-existent ids)

### Notes
- Live-verified at `/app`: 47 / 312 / 94% / 22% KPI cards, ledger + queue posture panels intact, tab switching renders each feed (report IDs on Recent reports, alert titles on Notifications), activity feed shows formatted events with actor emails, and all 3 tabpanels are aria-linked
- Lint: 14 warnings, 0 errors (below the pre-existing baseline of 15). Build passes.

## [2026-08-03] - Admin Pages Migrated Onto The UI Primitives

### Changed
- `src/pages/admin/OverviewPage.jsx` — admin `StatCard` swapped for the unified `ui/StatCard` (identical props, `size="sm"`) and all raw buttons (retry, show-more) swapped for `ui/Button`; section structure, AttentionCard, QueueSnapshotPanel, SystemHealthPanel, and the audit feed retained
- `src/pages/admin/WaitlistPage.jsx` — rebuilt on the primitives: `DataTable` now owns search/sort/pagination (controlled search so CSV export matches the filtered view), row selection with a bulk-action bar (Approve/Defer/Reject via `Button` success/warning/danger variants), `ui/Drawer` with the decision controls in the sticky footer, `ui/StatCard` with `loading` states (bespoke skeleton deleted), and `Badge` status tones; `ConfirmDialog` retained
- `src/pages/admin/UsersPage.jsx` — rebuilt on the primitives: loads all users once (`pageSize: 200`) so `DataTable` owns search/sort/pagination, role/team pre-filters kept as selects, `AdminSearch` deleted, `ui/Drawer` with inline loading (Spinner) / error (EmptyState + retry) states, role/team `Badge`s, all buttons swapped for `ui/Button`; `ConfirmDialog` retained
- `src/components/ui/DataTable.jsx` — extended with `selectable` rows (checkbox column, select-all with indeterminate, bulk-action bar), controlled search (`searchValue`/`onSearchChange`), and a page-size selector; search input + selection bar now persist across loading/error/empty states so filters can always be cleared
- `src/components/ui/Button.jsx` — added `success` and `warning` variants (emerald / amber) for approve/defer semantics

### Fixed
- WaitlistPage `loadDashboard` no longer depends on `selectedApplicationId` — clicking a row previously re-created the loader, re-ran the mount effect, and reloaded the dashboard mid-drawer (which could wipe the page on the mock's transient error injection); replaced with a `useRef` guard for the one-time auto-select

### Notes
- OrganizationsPage and FeatureFlagsPage still use the legacy admin components (intentionally not in scope; nothing broken — old `admin/StatCard`, `AdminTable`, `AdminDrawer` remain for them)
- Live-verified at `/app/admin`, `/app/admin/waitlist`, `/app/admin/users`: KPI StatCards populated, selectable DataTable with bulk actions, drawer content + decision footers, role/team badges, search persisting in empty state
- Lint: 14 warnings, 0 errors (below the pre-existing baseline of 15). Build passes.

## [2026-08-03] - App Shell: Bell + Avatar Menu Wired To The Toast System

### Changed
- `src/components/app/AppShellLayout.jsx` — the notification bell and avatar menu (plus workspace and sign-out actions) now give real-time feedback through the global `ToastProvider`:
  - **Bell** — "Mark all read" fires a success toast with the pre-cleared unread count (e.g. "All caught up — Marked 13 notifications as read.")
  - **Avatar menu** — Sign out closes the menu and fires an info toast ("Signed out — Your session has ended.")
  - **Sidebar footer** — the sign-out button fires the same info toast
  - **Workspace toggle** — switching Individual/Team fires an info toast describing the new context
  - **Command palette actions** — the workspace-switch and sign-out actions fire the same toasts as their header/sidebar counterparts
- Added shared `signOutWithToast(signOut, toast)` helper so the sign-out toast copy/behavior stays consistent across the three call sites

### Notes
- Toasts survive the sign-out redirect because `ToastProvider` wraps the entire router (including `/signin`) in `App.jsx`
- Review fixes: workspace toggle no longer toasts when the already-active context is clicked (same-context guard), and the triplicated sign-out toast was deduped into one helper
- The grouped sidebar IA, header without debug Route/Access stats, and the bell/avatar-menu popovers themselves were already in place from the earlier shell pass — this change wires them to the toast system
- Live-verified: mark-all-read toast (13 count + badge cleared), workspace-switch toast (badge updated), sign-out toast surviving navigation to `/signin` with session cleared, and no-op toggle producing no toast
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes.

## [2026-08-03] - CommandPalette Primitive (⌘K) + Shell Wiring

### Added
- `src/components/ui/CommandPalette.jsx` — new reusable primitive: dependency-free fuzzy launcher for routes and actions
  - Fuzzy scoring (prefix > word-boundary > contiguous > subsequence) across label, group, and keywords
  - Self-contained global **⌘K / Ctrl+K** shortcut (stale-closure-safe via refs + stable setters)
  - Render-prop trigger (`trigger={({ open, triggerRef }) => …}`) so the launch control is rendered by the palette itself — enabling origin-aware Kowalski popover: the panel scales from the trigger element's screen position via `transformOrigin`, sub-300ms transform/opacity only, honors `prefers-reduced-motion` via the global `MotionConfig`
  - Full keyboard support: ArrowUp/Down (wrapped), Home/End, Enter, Esc, Tab focus trap (options are `tabIndex={-1}` per the `aria-activedescendant` pattern)
  - Accessible combobox: `role=combobox` + `aria-controls` + `aria-activedescendant`, `role=listbox`/`option` with `aria-selected`, `role=dialog` + `aria-modal`, body scroll lock, focus restore to trigger on close, portal + AnimatePresence, grouped results, empty state, footer kbd hints
- Barrel export in `src/components/ui/index.js`; live demo section on `/ui-kit` with navigation items + toast action items

### Changed
- `src/components/app/AppShellLayout.jsx` — palette wired into the app shell: items built from `NAV_SECTIONS` (permission-filtered, locked team routes excluded) plus workspace actions (Start a verification, Browse reports, Switch workspace, Sign out); header search trigger button (icon-only on mobile, label + ⌘K hint on larger screens) opens the palette

### Notes
- Review found + fixed: missing modal focus trap (Tab now stays in the input), and the palette being unreachable on touch devices (trigger was `hidden md:flex` — now always visible as an icon button, ⌘K hint revealed at `sm:`)
- Live-verified: ⌘K opens 20 items with input auto-focused, "reports"/"upload" fuzzy filters correctly, ArrowDown syncs `aria-activedescendant`, Enter navigates (e.g. → /app/uploads), Tab trapped in input
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes.

## [2026-08-03] - Dashboard Overview Rebuilt On Phase 2 Primitives

### Changed
- `src/pages/app/AppDashboardPage.jsx` — full rebuild from first principles on the ui primitive library:
  - **Greeting header** (`DashboardHero`) — signature dark surface with time-of-day greeting, workspace-context `Badge` (team/individual with dot), three quick-action `Button`s (Start verification / View reports / Scan history), last-activity line, and a system-reading panel with loading/error/ready states and live API/Queue health dots
  - **KPI StatCards** — Workspace / Queue / Completed / Flagged via the unified `StatCard` with loading + error states and an analytics-backed completion-rate trend
  - **Verification ledger** — `Card` + `DataTable` (searchable, sortable, paginated, row-click → `/app/reports/:id`, verdict `Badge`s, status `ScanStatusBadge`)
  - **Queue / Risk / System panels** — `Card`-based Queue Posture (MiniStats + backlog warning), Risk Watch (flagged uploads), and Infrastructure status, each with loading/empty/error states
  - **Reports + Notifications** — `Card`-based panels with all four states, verdict badges + confidence bars on reports, category dots on notifications
- Added a `useResource` per-slice loader hook so every section loads independently and can show its own loading/error/retry state without blanking the whole page

### Fixed
- Latent bug: `listScans()` returns `{ data: [...] }` (paginated), but the old dashboard read `response.scans` — the ledger and KPIs could never populate; now reads `r.data`
- Latent bug: the old status filter used `'complete'` while mock data uses `'completed'` — completed counts always read 0
- Unread notification badge now shows the true count (13) instead of the sliced preview count (4)

### Notes
- `AppStatePanel` no longer used on the dashboard (still shared by other app surfaces)
- Live-verified at `/app`: populated ledger, KPIs, queue/risk/infra panels, reports, notifications; the mock's random error injection exercised the error + retry paths end-to-end
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes.

## [2026-08-03] - App Shell Wired Onto Phase 2 Primitives

### Changed
- `src/pages/app/AppPlaceholderPage.jsx` — rebuilt from the bespoke `AppStatePanel` onto the ui primitives: `Card` with `state="empty"` (eyebrow "Coming soon" + `EmptyState` content) and a secondary-sm `Button` with back-arrow icon that navigates to the dashboard via `useNavigate`
- `src/components/app/AppShellLayout.jsx` — the shell now consumes the Phase 2 primitive library: the notification panel's "Mark all read" uses `Button` (ghost/sm), the team-gated nav "Locked" chip uses `Badge` (warning/sm), and the header workspace-context pill uses `Badge` with a status dot (success/info), wrapped in a `hidden xl:block` div to avoid Tailwind display-class merging
- `AppStatePanel` remains untouched — it is shared by 15+ other surfaces (dashboard, reports, uploads, admin, etc.)

### Notes
- Back-navigation uses `Button` + `useNavigate` per the primitive-first directive; a `Link`-styled variant remains an option if link semantics are preferred
- Lint: 0 errors, no new warnings (15 pre-existing untouched). Build passes. Live-verified: placeholder empty-state + back button, ghost mark-all-read, and the Locked `Badge` (confirmed by temporarily seeding team access off, then reverted byte-identical)

## [2026-08-03] - Public Benchmark Page (/benchmark)

### Added
- New public `/benchmark` page rendering the shipped benchmark assets as a designed experience instead of raw file links: executive summary, self-hosted CSS comparison chart (Standard vs. Provance V0.1), error analysis, catalog breakdown, V0.2 expansion panel, and raw-data access strip
- All numbers sourced from `public/benchmark/gold/` — V0.1 report metrics (TWA 1.00 vs 0.79, FPR 0.0% vs 7.5%, 0 vs 4 confident-wrong, ES 1.0 vs 0.0) and the on-disk catalog distribution (100 assets: authentic 40 / synthetic 40 / manipulated 20, tiers 1:64 / 2:16 / 3:20, 8 sources, JPEG 60 / PNG 40)

### Changed
- TrustBar CTAs now point at `/benchmark` (designed page) and `/benchmark#catalog` instead of the raw `.md`/`.json` files
- `ScrollToTop` is now hash-aware so `#catalog` anchors scroll into view after client-side navigation
- Added Benchmark to the footer Resources links

### Notes
- The V0.2 expansion is presented honestly as documented (README_V0.2), not claimed as shipped — the catalog on disk holds the 100-asset gold subset


## [2026-08-03] - App Shell Redesign: Grouped IA, Notification Bell, Avatar Menu

### Added
- Rewrote `AppShellLayout` with a grouped sidebar information architecture: **Overview / Workspace / Organization / Developer / Settings / Help**, each with inline SVG icons and a locked state for team-gated routes
- Notification bell in the header with unread badge (13 from `mockNotifications`), dropdown dialog with mark-as-read + mark-all-read, and a view-all link to `/app/notifications`
- Avatar menu with profile header, quick links (Profile / Security / Notifications / Billing / Help & Support), and sign out; proper `role="menu"/"menuitem"` semantics
- 10 new placeholder routes (`/app/activity`, `/app/queue`, `/app/history`, `/app/organization`, `/app/billing`, `/app/api-keys`, `/app/docs`, `/app/security`, `/app/notifications`, `/app/help`) wired through `AppPlaceholderPage`
- `useDismiss` (outside-click + Escape) and `usePopoverFocus` (focus-in-on-open, focus-restore-on-close) popover primitives

### Changed
- Removed the debug Route / Access stat cards from the header; replaced the stat grid with a workspace-context pill, notification bell, and avatar menu
- Page metadata (eyebrow/title/detail) is now derived from the single `NAV_SECTIONS` source of truth

### Notes
- `mockNotifications[].link` is intentionally not navigated yet (report routes not wired to the bell); documented in code


## [2026-08-03] - Phase 2 Foundation: UI Tokens And Component Primitives

### Added
- Extended app UI tokens and base utilities in `src/index.css` (`.ui-eyebrow`, `.ui-card`, `.ui-input`, `.ui-focus-ring`) per the UNIFIED design system.
- New primitive library `src/components/ui/` (with barrel export): `Button` (4 variants × 3 sizes, loading/disabled, icons, `aria-busy`), `Badge` (5 tones, dots, sizes), `Card` (default/loading/empty/error states), `StatCard` (tones, trend chips, loading/error — API-compatible with the admin StatCard), `DataTable` (sort with `aria-sort`, search, pagination, row click, full states), `Tabs` (roving tabindex, arrow keys, animated indicator), `Drawer` (portal, focus trap, Esc, scroll lock), `Toast` + `ToastProvider`/`useToast` (global notifications, `aria-live`, auto-dismiss), `EmptyState`, `Skeleton`, `Spinner`.
- `src/pages/UiKitPage.jsx` — live gallery at `/ui-kit` demonstrating every primitive in every state, driven by real `mockData.js`.
- App wiring in `src/App.jsx`: `ToastProvider` wraps the router, `MotionConfig reducedMotion="user"` makes all framer-motion animations respect `prefers-reduced-motion`, `/ui-kit` route added.

### Notes
- `useToast` lives in `src/components/ui/useToast.js` to satisfy react-refresh/only-export-components.
- Kowalski-informed behavior: sub-300ms transform/opacity animations, `active:scale(0.97)` press feedback, explicit focus-visible rings, `print:hidden` on the toast viewport.
- Lint: 0 new warnings (baseline 15 pre-existing, untouched). Build passes. Live preview verified at `http://localhost:3000/ui-kit`.

## [2026-08-03] - Landing Page P0: Product Proof And Trust Signals

### Added
- `src/components/ForensicMediaFrame.jsx` — self-hosted SVG/CSS "media under verification" visual (broadcast scene, forensic grid, animated scan band, corner brackets, annotation chips, metadata readouts). Replaces all remote AI-generated image dependencies; respects `prefers-reduced-motion` and uses namespaced gradient IDs.
- `src/components/TrustBar.jsx` — homepage benchmark/trust strip surfacing real figures from `public/benchmark/` (TWA 1.00 vs 0.79, 0.0% FPR vs 7.5%, 0 confident-wrong results, 500-asset adversarial gold catalog) with links to the published report and catalog.

### Changed
- `src/pages/HomePage.jsx` — homepage now includes TrustBar and the recovered Product Showcase section directly after the Hero.
- `src/components/ProductShowcase.jsx` — recovered from dead code, remote image replaced with ForensicMediaFrame, hedged "coming-soon" copy made present-tense.
- `src/components/SampleReport.jsx`, `src/pages/SampleReportPage.jsx`, `src/components/SampleReportDocument.jsx` — remote trae.ai images replaced with ForensicMediaFrame.
- `src/lib/sampleReportContent.js` — removed the now-unused remote `sampleReportPreviewImage` export.
- `src/components/Pricing.jsx` — homepage pricing expanded from 3 to 4 tiers (Early Access / Pro / Team / Enterprise), aligned with `/pricing`, with indicative prices (Pro from $49/mo, Team from $249/mo), a founding-rate note, and a link to the full pricing model.
- `src/index.css` — added the forensic scan-band keyframe animation (transform-only, gated by `prefers-reduced-motion`).

### Notes
- All benchmark figures are taken directly from `public/benchmark/gold/BENCHMARK_REPORT_V0.1.md` and `README_V0.2.md`; no invented numbers.
- Benchmark links use native anchors (not router `Link`) so the static files load directly instead of hitting the SPA 404 route.
- `npm run lint` and `npm run build` pass; live preview verified at `http://localhost:3000`.

## [2026-08-04] - Phase 3 Slice 6: Organization Management

### Added
- `src/pages/app/AppOrganizationPage.jsx` - full Organization Management page replacing the placeholder: workspace profile stat grid (plan/seats/scans/storage), member roster with avatar initials + role badges, per-member role select + Remove (owner + current user protected), pending-invites list with Cancel, invite Drawer (email + role radio cards with validation), all with loading/empty/error via `?state=` demo forcing and page-scoped ⌘K commands
- `src/lib/mockData.js` - `mockOrgWorkspace` (profile, 4 members, 2 pending invites)
- `src/lib/mockApi.js` - `mockGetOrganization` / `mockInviteMember` / `mockUpdateMemberRole` / `mockRemoveMember` / `mockCancelInvite`; `src/lib/api.js` - five functions gated behind `USE_MOCK`
- `/app/organization` route now renders the real page

### Fixed
- HIGH: current-user identity was hardcoded to `usr_001` — a member sign-in would still see owner controls. Now derived from `useAuth().user?.id`, so the member account correctly shows zero Remove/role/invite controls and the "You" badge tracks the real session
- invite-id generation is max-numeric + 1 (no collisions after cancels)
- seat capacity is now enforced: invite button disabled at 4/4 and the mock rejects invites past the seat limit

### Notes
- page-scoped ⌘K commands: invite a team member, view member roster
- dead `organization` entry removed from `AppPlaceholderPage`; unused `ORG_ROLE_META` export removed

## [2026-08-04] - Frontend Completion Review + Backend Stack Recommendation

### Added
- `docs/reports/2026-08-04-frontend-completion-review.md` - full frontend completion report, remaining-work list, backend readiness verdict, technology-by-technology stack review (Neon, Redis/Valkey, Fly.io, Cloudflare, R2, Workers, queues, storage, CDN, caching, search, monitoring, logging, email, auth, API architecture, file processing, deployment), performance/scalability recommendations, complete feature inventory from the docs corpus, and 10 recommended new features pending Founder approval

### Updated
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - refreshed to Phase 3 completion state
- `docs/project-state/current-feature-status.md` - status table refreshed (Phase 3 slices marked Complete, remaining placeholders listed)
- `docs/MASTER_DOCUMENTATION_INDEX.md` - user dashboard table expanded to 14 rows with real build status; report linked

### Notes
- no new features added automatically; recommendations await Founder review (per workflow)

## [2026-08-04] - Phase 3 Slice 5: Help & Documentation

### Added
- `src/pages/app/AppHelpDocsPage.jsx` - one component serving both `/app/docs` (searchable guide cards with category badges / read minutes / numbered steps, category Tabs) and `/app/help` (FAQ accordions with aria-expanded/aria-controls wiring, category Tabs), plus a shared contact-channels card and a contact Drawer (form → simulated send → success state) with page-scoped ⌘K commands per module
- `src/lib/mockData.js` - `mockDocsContent` (7 guides across 4 categories + channels) and `mockHelpContent` (8 FAQs across 4 categories + channels)
- `src/lib/mockApi.js` - `mockGetHelpContent({ module })`; `src/lib/api.js` - `getHelpContent` gated behind `USE_MOCK`
- both routes render the real page; loading/empty/error states wired to `?state=` demo forcing

### Fixed
- HIGH: both routes render the same component, so React Router updates `module` without remounting — `module` is now a `useResource` dep so content refetches when switching docs ↔ help
- send-simulation timer is cleared on drawer close/unmount (no stale success state or orphaned toast)
- search/category/FAQ state resets when switching modules
- contact channel links now navigate (`/app` hrefs) instead of being dead

### Notes
- dead `docs` and `help` entries removed from `AppPlaceholderPage`

## [2026-08-04] - Phase 3 Slice 4: API Keys

### Added
- `src/pages/app/AppApiKeysPage.jsx` - full API Keys page replacing the placeholder: 4 summary stats (active keys, 30d requests, scopes, limit), key table with prefix masking / scope badges / usage + last-use / status badges and Regenerate + Revoke actions, reveal-once token banner with Copy (clipboard with selection fallback), limits & scopes reference card, create-key Drawer (name + scope checkboxes with validation), revoke-confirmation Drawer
- `src/lib/mockData.js` - `mockApiKeys` (4 keys across active/expired/revoked), `API_KEY_SCOPES`, `mockApiKeyLimits`
- `src/lib/mockApi.js` - `mockGetApiKeys` / `mockCreateApiKey` (full token returned exactly once, store keeps only the prefix) / `mockRevokeApiKey` / `mockRegenerateApiKey`; `src/lib/api.js` - four functions gated behind `USE_MOCK`
- `/app/api-keys` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Fixed
- clipboard copy now awaits + catches, falling back to selecting the token text (no more false success toast)
- removed the dead "Hide token" dead-end state (Done closes the banner; token is unrecoverable after)
- `makeKeyId` derives max numeric id + 1 instead of length-based (future removal-path safe)

### Notes
- page-scoped ⌘K commands: create a key, regenerate a key
- dead `api-keys` entry removed from `AppPlaceholderPage`

## [2026-08-04] - Shared formatRelativeTime Util

### Refactored
- Extracted the duplicated `formatRelativeTime` helper into a single shared export in `src/components/app/scanPresentation.js` (null guard, just now / m / h / d ago branches, 7-day threshold, locale-date fallback)
- Migrated all five callers off their local copies: `AppShellLayout`, `AppDashboardPage`, `AppNotificationsPage`, `AppSecurityPage`, and admin `ActivityRow` — local declarations removed, imports wired at the correct relative depth per file

### Notes
- the shell's old compact style ("now"/"3m", 30-day threshold) is unified to the app-wide "just now"/"3m ago", 7-day threshold — a deliberate consistency normalization

## [2026-08-04] - Phase 3 Slice 3: Security Settings

### Added
- `src/pages/app/AppSecurityPage.jsx` - full Security Settings page replacing the placeholder: password change form with live requirement checks (min length / uppercase / number / symbol), active sessions list with per-session Revoke (current-device badge, current session protected), and sign-in controls (2FA toggle, new-device alerts, password-change alerts, auto sign-out timeout select)
- `src/lib/mockData.js` - `mockSecuritySettings` (password policy, 4 active sessions, sign-in controls)
- `src/lib/mockApi.js` - `mockGetSecuritySettings` / `mockChangePassword` / `mockRevokeSession` / `mockUpdateSecuritySetting`; `src/lib/api.js` - four functions gated behind `USE_MOCK`
- `/app/security` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Fixed
- shape-aware toggle so boolean notify flags (vs the `{enabled}` 2FA object) toggle correctly
- mock revoke now persists at the module level, matching 2FA persistence semantics

### Notes
- 2FA toggle is an explicit preview action (not wired to a real provider)
- page-scoped ⌘K commands: change password (focuses the form), revoke all other sessions, toggle 2FA
- dead `security` entry removed from `AppPlaceholderPage`

## [2026-08-04] - Phase 3 Slice 2: Billing (UI only)

### Added
- `src/pages/app/AppBillingPage.jsx` - full Billing page replacing the placeholder: plan overview card (Pro / $49 / renews date / Active badge), usage metering (StatCard row + progress meters with 70/90% tone thresholds), payment-method cards (Visa/MC brand marks, Default badge), and invoice history table (PV-26-xxxx numbers, paid/open badges, download toast)
- `src/lib/mockData.js` - `mockBillingProfile` (plan, usage limits, payment methods) + `mockInvoices` (8 records)
- `src/lib/mockApi.js` - `mockGetBilling` (bundled profile + invoices) + `mockGetInvoices` (paginated); `src/lib/api.js` - `getBilling` / `getInvoices` gated behind `USE_MOCK`
- `/app/billing` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Notes
- billing is explicitly a UI preview: plan change, add card, and invoice download are toast-backed preview actions
- page-scoped ⌘K commands: change plan, download latest invoice, add payment method
- dead `billing` entry removed from `AppPlaceholderPage`

## [2026-08-04] - Phase 3 Slice 1: Notifications Center

### Added
- `src/pages/app/AppNotificationsPage.jsx` - full Notifications Center replacing the placeholder: category tabs with live counts, unread-first sorting, per-item mark-read with toast, linked notifications navigate to report routes, mark-all-read, expandable detail for unlinked items, and page-scoped ⌘K commands (mark all read, show unread, open first unread)
- `/app/notifications` route now renders the real page; loading/empty/error states wired to `?state=` demo forcing

### Notes
- page commands follow the palette's `label`/`group`/`hint`/`keywords`/`onSelect` registry contract
- dead `notifications` entry removed from `AppPlaceholderPage` module map

## [2026-08-04] - Dev Test-Account Quick-Fill + Phase 3 Kickoff

### Added
- Dev-only test-account quick-fill on the sign-in page (`src/pages/SignInPage.jsx`): one click fills either documented account, inert in production builds via `import.meta.env.DEV` (matches the `?state=` / `?demo=` dev affordance pattern)

### Notes
- quick-fill buttons: Admin account (`founder.admin@provance.local`) and Member account (`founder.test@provance.local`), both with the standard 8+ char mock password
- Phase 3 (user dashboard polish) begins after Phase 1 + 2 approvals

## [2026-08-07] - Full Trello Board Spec (32 Cards)

### Added
- `scripts/trello.spec.json` rebuilt from `current-feature-status.md` + `MASTER_DEVELOPMENT_ROADMAP.md`: **32 cards** across Done (15) / In Progress (5) / Backlog (12), each with phase/type/priority labels and acceptance criteria — covers the shipped frontend + admin backend slices, approved-but-unbuilt features (scan dedup, session hardening, Sentry+PostHog, usage enforcement, webhooks, evidence appendix), Phase 4 pipeline slices (image signal pipeline, queue reliability, payload versioning, benchmark), Phase 5/6 security/launch work, and deferred post-MVP multimodal themes

### Changed
- `scripts/trello.mjs` - phase taxonomy extended with a `Phase: Post-MVP` bucket (black) so deferred roadmap themes have a home; `phaseLabel` accepts `Post-MVP` / `post mvp` / `Phase: Post-MVP`
- `scripts/trello.test.mjs` - +2 tests for the Post-MVP normalization and taxonomy entry (21 total)
- `docs/trello-workflow.md` - board-content section documents the 32-card spec and regeneration workflow

### Notes
- validated through the CLI's `validateSpec`: no errors; ready to push once Trello credentials exist

## [2026-08-07] - Trello Sync CLI

### Added
- `scripts/trello.mjs` - zero-dependency Trello CLI (Node 18+ builtin fetch): `init` (find/create board + lists + label taxonomy), `push` (idempotent card upserts from a JSON spec with phase/type/priority labels + acceptance-criteria checklists), `move`, `comment`, `snapshot` (writes `docs/trello-board.md`), `status`, `--help` — board id cached in a gitignored state file, requests throttled ~4/s under Trello's limit
- `scripts/trello.test.mjs` - 19 vitest tests for the pure helpers (label normalization, buildCardDesc, idempotency matching, validateSpec, summarize, buildUrl, parseArgs, renderSnapshot) and the createApi factory (mock fetch: URL/auth params, JSON bodies, error propagation)
- `scripts/trello.spec.json` - starter card spec mirroring current roadmap slices (8 cards)
- `docs/trello-workflow.md` - API key setup, env vars, command reference, spec schema, and the plan → push → move → comment → snapshot workflow; linked from `docs/MASTER_DOCUMENTATION_INDEX.md`

### Changed
- `vitest.config.js` - include extended to `scripts/**/*.test.mjs`; `package.json` gains a `trello` script (`node scripts/trello.mjs`); `.gitignore` covers `scripts/.trello-state.json`

### Notes
- exported pure helpers make the CLI testable without network; the module only runs main() when executed directly
- `idLabels` sent as comma-separated strings per Trello's documented contract; `push` validates the spec before any network call (even before the credentials check)
- `move`/`comment`/`snapshot`/`status` resolve an existing board and error on a typo — only `init`/`push` create one
- validated live: `--help` renders, missing credentials fail with a clear message, starter spec passes validateSpec

## [2026-08-07] - TeamFilter Copy Link Affordance

### Added
- `src/lib/clipboard.js` - shared clipboard utilities: `shareableUrl(pathname, search)` (absolute shareable URL) and `copyText(text)` (async Clipboard API with a hidden-textarea `execCommand` fallback for non-secure contexts, boolean result)
- `src/lib/clipboard.test.js` - 6 tests covering shareableUrl joins/normalization and copyText success, unavailable-API fallback, and rejected-API fallback with textarea cleanup

### Changed
- `src/components/app/TeamFilter.jsx` - one-click **Copy link** affordance next to the team chips: copies the shareable URL (active `?team=` plus any co-scoped `?from=` / `?to=`, dev-only `?state=` / `?noisy=` stripped so a shared link always opens the live view), flips to a 2s "Copied" state with a check icon (pending-timer ref prevents rapid-click races), and fires success/error toasts — available on all 8 TeamFilter surfaces (Dashboard, History, Queue, Reports, admin Users/Organizations/Analytics)
- `src/pages/app/AppApiKeysPage.jsx` - token copy migrated onto `copyText`, gaining the hidden-textarea fallback (previously it asked the user to select the token manually on clipboard failure)
- render smokes wrapped in `ToastProvider` (`adminTeamPages`, Queue/History in `workspacePages`) and pinned the copy button's presence

### Notes
- live-verified: with `?team=team_legal&state=empty` active, one click copied `http://localhost:3000/app?team=team_legal` (demo param stripped, real filter kept), button showed "Copied" then reverted, toast fired
- `shareableUrl` gained an optional `excludeKeys` argument; `copyText` guards the deprecated `document.execCommand` path (absent in modern jsdom / some browsers)

## [2026-08-07] - Generic useQueryParam Hook Extraction

### Added
- `src/lib/useQueryParam.js` - generic URL-backed single-value query-param hook (`key` / `validate` / `defaultValue` / optional `read` / `serialize`) plus the pure `readQueryParam` extractor, extracted from the duplicated plumbing in `useTeamFilterParam` / `useDateRangeParam`
- `src/lib/useQueryParam.test.jsx` - 11 tests: pure reader, hook init/fallback, URL write preserving sibling params, delete-on-default, invalid-set canonicalization, functional updates, external re-derivation, custom read/serialize overrides

### Changed
- `src/lib/useTeamFilterParam.js` - reimplemented on top of `useQueryParam`; public API (`TEAM_FILTER_VALUES`, `isValidTeamFilter`, `readFromSearch`, `useTeamFilterParam`) unchanged, all 5 existing tests pass untouched

### Fixed
- back/forward / manual-URL-edit ping-pong: the naive write-then-re-derive effect structure (and the original duplicated hooks) fought external same-route navigations — the write effect navigated back to the stale value's URL while the re-derive adopted the new one, oscillating forever. The generic hook runs the re-derive effect first and marks URL-originated changes (origin ref), so the write effect stands down for that round. Live-verified: external `?team=team_legal` → `team_product` with stale state settles on `team_product`; back to unscoped settles on `all`

### Notes
- `src/lib/useDateRangeParam.js` hardened with the same origin-ref synchronization (it previously kept the naive write-then-re-derive structure and carried the same latent back/forward ping-pong)
- future shareable filters (status, sort, page, …) should reuse `useQueryParam`; multi-key params that update atomically (like `?from=/?to=`) keep their own hook since composing single-key instances would race the write effects

## [2026-08-07] - URL-Backed Date Range On Scan History

### Added
- `src/lib/useDateRangeParam.js` - URL-backed `?from=` / `?to=` (canonical YYYY-MM-DD) date-range params mirroring `useTeamFilterParam`: `parseDateParam` (calendar-validity + overflow guard), `readFromSearch`, `useDateRangeParam` (replace:true writes preserving `?team=` / `?state=`), and `inDateRange` (inclusive UTC-string bounds, end-of-day `to`)
- `src/lib/useDateRangeParam.test.js` - 11 tests covering validation, canonicalization, single-bound open-ended ranges, `from > to` empty semantics, inclusive boundaries, and coexistence with `?team=`

### Changed
- `src/pages/app/AppHistoryPage.jsx` - date-range inputs + Clear range wired to the hook; the ledger filters the team-scoped list by `inDateRange`; range-aware empty states ("No scans in this date range" / "…in this team and range")

### Notes
- a fully scoped ledger view (`?team=team_legal&from=…&to=…`) is now shareable as one link, following the `?team=` convention
- live-verified: URL restore, input→URL push, empty range, and combined team + range scoping

## [2026-07-29] - Scorecard Improvement And Multimodal MVP Strategy

### Added
- `docs/startup-scorecard-improvement-plan.md` - Follow-up strategy report showing how to improve the startup scorecard, reduce risk, and expand the MVP from image-first into controlled audio and video verification

### Notes
- this document builds on the existing investor-facing diligence package
- the recommended multimodal path keeps image as the strongest wedge while treating audio and video as controlled beta expansions

## [2026-07-29] - Startup Assessment And Investor Documentation Package

### Added
- `docs/startup-assessment-report.md` - Institutional-style startup assessment and due diligence report covering market, product, technology, valuation, risks, competitive landscape, and recommendations
- `docs/investor-memo.md` - Investment-committee style memo for investors, advisors, accelerators, and strategic partners
- `docs/executive-summary.md` - One-page investor overview summarizing the company, opportunity, readiness, valuation posture, and recommendation

### Notes
- these documents are based primarily on the repository documentation corpus under `docs/`
- current-state implementation and roadmap documents were treated as the primary source of truth where older materials were more aspirational

## [2026-07-23] - Planning, Roadmap, Architecture, And Setup Documentation Sync

### Added
- `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md` - Official stack reference for the MVP and early growth architecture
- `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md` - Pre-coding setup and approval checklist
- `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md` - Current MVP service and infrastructure configuration guide
- `docs/engineering/TREZO_TEMPLATE_EVALUATION.md` - Audit of the Trezo template and recommendations for Provance dashboard and admin work

### Updated
- `README.md` - Replaced outdated workflow and priority notes with the current MVP focus and source-of-truth doc set
- `docs/README.md` - Reorganized the canonical documentation order and roles
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Rebuilt the roadmap around the current MVP sequence and approval gate
- `docs/engineering/PHASE_TASK_LIST.md` - Replaced the old phase summary with a definitive feature and phase checklist
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` - Formalized the standing workflow, review, and merge rules
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Synced implementation truth to the current product and planning state
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md` - Split environment needs into required-now and required-later groups
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md` - Documented the current queue cost guidance and deployment rules
- `docs/architecture/system-design-document.md` - Updated the system design to match the real MVP stack and target direction
- `docs/project-state/README.md` - Updated the living-state documentation priorities
- `docs/project-state/current-feature-status.md` - Synced feature statuses to the current MVP focus
- `docs/project-state/development-priorities.md` - Moved active priority from landing-page work to app and system work
- `docs/project-state/what-is-in-development.md` - Synced active work to dashboard, admin, reports, and reliability
- `docs/project-state/overall-project-architecture.md` - Synced the current architecture and preserved the replaceable system boundaries
- `docs/project-state/outstanding-questions.md` - Recorded current blockers, risks, and unresolved setup items
- `docs/project-state/engineering-roadmap.md` - Synced the quick-reference roadmap to the canonical roadmap
- `docs/project-state/product-roadmap.md` - Synced the product summary roadmap to the current execution focus
- `docs/project-state/technical-risks.md` - Updated the current delivery and infrastructure risks
- `docs/project-state/recommended-improvements.md` - Updated the current improvement recommendations
- `docs/project-state/decision-log.md` - Recorded current planning, infrastructure, and template-adoption decisions

### Notes
- no production feature code was added in this update
- this change set exists to align the repository before the next implementation phase begins
- the remote Supabase `profiles` migration was also applied and verified
- the planning package was approved and Phase 0 was closed in the roadmap

## 2026-07-23 - Dashboard and admin Phase 2 closeout pass

### Updated
- `src/pages/app/AppDashboardPage.jsx` - Upgraded the dashboard into a stronger command surface with queue posture, triage panels, quick actions, and faster drill-in paths
- `src/pages/app/AppAdminPage.jsx` - Expanded admin into a broader control room with users, verification requests, request diagnostics, and feature-state visibility
- `src/components/app/AppShellLayout.jsx` - Updated admin navigation and page framing to match the broader control-room role
- `backend/src/admin/admin.service.ts` - Expanded admin dashboard payload with users, scans, diagnostics, and feature-state data
- `docs/engineering/PHASE_TASK_LIST.md` - Synced dashboard and admin completion progress
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Synced current implementation scope after the dashboard and admin pass
- `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md` - Documented the current admin surface in more detail

### Validation
- frontend production build passed
- backend production build passed
- backend e2e health test passed

## 2026-07-24 - Phase 2 closeout completion pass

### Updated
- `src/pages/app/AppReportsPage.jsx` - Expanded reports into a denser triage and evidence-review workspace with filters, findings, and recommendations
- `src/pages/app/AppUploadsPage.jsx` - Improved upload workflow clarity, stage visibility, failure recovery, and next-step actions
- `src/pages/app/AppAccountPage.jsx` - Improved account posture, profile clarity, and settings polish
- `backend/src/common/guards/admin.guard.ts` - Added profile-backed admin role fallback to support safer internal testing
- `backend/src/admin/admin.controller.ts` - Added admin feature-flag update endpoint
- `backend/src/admin/admin.service.ts` - Added persisted feature-flag loading and update support
- `backend/src/admin/dto/update-feature-flag.dto.ts` - Added validation for admin feature-flag updates
- `src/lib/api.js` - Added frontend helper for admin feature-flag updates
- `supabase/migrations/0005_feature_flags.sql` - Added persisted feature-flag table and default rollout flags
- `docs/engineering/PHASE_TASK_LIST.md` - Marked the remaining Phase 2 closeout work complete
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Moved Phase 2 to review-ready status
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Marked Phase 2 as in review

### Validation
- frontend production build passed
- backend production build passed
- backend e2e health test passed
- remote Supabase feature flag migration applied successfully

## 2026-07-24 - Trezo audit direction reset and verified hero fix

### Updated
- `src/components/Hero.jsx` - Replaced the hero supporting copy and removed the `Image-first early access` attribute from the live hero component
- `docs/engineering/TREZO_TEMPLATE_EVALUATION.md` - Expanded the Trezo review into a detailed dashboard and admin implementation plan mapped to Provance pages
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Reflected that Phase 2 remains in progress pending the Trezo-guided dashboard/admin direction
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Moved Phase 2 back to in-progress status after the UI direction reset

### Validation
- verified the live hero route uses `src/components/Hero.jsx`
- verified the removed hero attribute string no longer exists in `src/`

## 2026-07-24 - Dashboard and admin platform redesign expansion

### Added
- `src/components/app/AppWorkspacePrimitives.jsx` - Shared section, metric, card, and pill primitives for the broader Trezo-guided app redesign

### Updated
- `src/components/app/AppShellLayout.jsx` - Refined route framing and page metadata so the expanded platform surfaces read as a coherent enterprise workspace
- `src/pages/app/AppAdminPage.jsx` - Expanded the internal control room into broader modules for organizations, jobs, reports, analytics, monitoring, flags, roles, and audit
- `src/pages/app/AppBillingPage.jsx` - Rebuilt billing from a placeholder into a structured commercial readiness surface with plan, invoice, and payment posture sections
- `src/pages/app/AppDeveloperPage.jsx` - Rebuilt the developer route into a structured API portal surface with key, webhook, SDK, and documentation patterns
- `src/pages/app/AppHistoryPage.jsx` - Added sorting, pagination, and bulk-selection behavior to the scan ledger
- `src/pages/app/AppNotificationsPage.jsx` - Rebuilt notifications into a real in-app event center fed by recent verification activity and system notices
- `src/pages/app/AppSettingsPage.jsx` - Rebuilt settings into a broader account, security, session, and preference surface
- `src/pages/app/AppTeamPage.jsx` - Rebuilt the team route into a collaboration architecture surface instead of a simple access placeholder
- `src/pages/app/AppUploadsPage.jsx` - Added drag-and-drop intake framing and stronger queue, ETA, and validation posture panels
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Synced the current-state documentation with the expanded platform redesign scope

### Validation
- frontend production build passed

## 2026-07-24 - Documentation preservation and temporary handover update

### Added
- `docs/engineering/DOCUMENTATION_STATUS_AND_HANDOVER_2026-07-24.md` - Final documentation status report and temporary handover package for continuation from another environment

### Updated
- `README.md` - Preserved as the top-level project entry point for the documentation-first handover
- `docs/README.md` - Added the handover report to the canonical reading order and updated the active focus
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Recorded the documentation-preservation focus and the pause on further dashboard and admin redesign work pending a new approved direction
- `docs/engineering/PHASE_TASK_LIST.md` - Reflected the dashboard and admin redesign pause and clarified the next execution queue
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the handover focus, paused UI direction, and remaining documentation-normalization constraint

### Notes
- this update is documentation-only
- the Trezo reference template and third-party template code remain excluded from the documentation handover branch

## [2026-07-16] - Phase 2 Expansion: Auth, Account Foundation, And Responsive App Polish

### Added
- `backend/src/account/account.module.ts` - New account module for authenticated profile management
- `backend/src/account/account.controller.ts` - Authenticated account profile read and update endpoints
- `backend/src/account/account.service.ts` - Server-backed profile initialization, profile updates, and permission shaping
- `backend/src/account/dto/update-profile.dto.ts` - Validated account profile update DTO
- `supabase/migrations/0004_profiles.sql` - Profiles table, RLS policies, and update timestamp trigger

### Updated
- `backend/src/auth/auth.controller.ts` - Added `GET /v1/auth/me` for current signed-in identity hydration
- `backend/src/auth/auth.service.ts` - Auth responses now include backend-hydrated profile and permission state
- `backend/src/auth/auth.module.ts` - Wired auth into the new account module
- `backend/src/app.module.ts` - Registered the account module
- `backend/src/auth/auth.service.spec.ts` - Updated auth service coverage for the new account-aware flow
- `src/lib/api.js` - Added account profile and current-viewer API helpers
- `src/context/AuthContext.jsx` - Replaced local-only profile persistence with backend-backed profile hydration and save flow
- `src/components/app/AppShellLayout.jsx` - Added stronger mobile and tablet navigation behavior in the authenticated shell
- `src/pages/app/AppAccountPage.jsx` - Connected account settings to real backend persistence and improved save-state handling
- `src/pages/app/AppUploadsPage.jsx` - Refined spacing and typography for better smaller-screen readability
- `src/pages/app/AppReportsPage.jsx` - Refined spacing and typography for better smaller-screen readability
- `src/pages/app/AppAdminPage.jsx` - Refined spacing and typography for better smaller-screen readability
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` - Expanded Phase 2 to include auth and backend foundation work
- `docs/project-state/engineering-roadmap.md` - Synced the summary roadmap to the updated Phase 2 scope
- `docs/project-state/decision-log.md` - Recorded the roadmap-canonical rule and the expanded Phase 2 decision
- `docs/project-state/current-feature-status.md` - Updated profile persistence and authenticated app status
- `docs/project-state/overall-project-architecture.md` - Reflected backend-hydrated identity and the new account module
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Updated implementation notes for account/profile foundation
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md` - Documented the current auth and account endpoint surface

### Validated
- `npm run build`
- `npm run lint`
- `npm run backend:build`
- `npm --prefix backend run test -- --runInBand`
- `npm run backend:test:e2e`
- `GET http://localhost:3000/app/account`
- `GET http://localhost:4000/v1/health`

### Notes
- frontend lint still shows only the same pre-existing warnings in `src/context/AuthContext.jsx` and `src/pages/app/AppReportPrintPage.jsx`
- current auth transport is still token-based in the browser; hardened cookie transport remains a later security-hardening phase

## [2026-07-07] - Report Refinement, Broader Dashboard Copy, And Local Admin Test Pattern

### Updated
- `backend/src/scans/scans.service.ts` - Added signed asset preview URLs to scan detail responses and included result payloads in scan listings for richer report surfaces
- `backend/.env.example` - Added `founder.admin@provance.local` as the documented local admin example inside `ADMIN_EMAILS`
- `src/pages/app/AppReportPrintPage.jsx` - Rebuilt the printable report into a more professional report document with analyzed media preview, executive summary, scorecards, metadata, findings, timeline, recommendations, and supporting evidence
- `src/pages/app/AppReportsPage.jsx` - Added inline media preview support on report detail and rewrote report language toward broader verification use cases
- `src/pages/app/AppDashboardPage.jsx` - Repositioned dashboard language away from narrow legal-only phrasing toward broader verification workflows
- `src/components/app/AppShellLayout.jsx` - Renamed and refined shell copy to present the app as a verification workspace rather than an analyst console
- `src/pages/app/AppUploadsPage.jsx` - Rewrote upload states and helper text to match the updated brand positioning
- `src/pages/app/AppAdminPage.jsx` - Refined internal admin copy and helper text
- `src/pages/app/AppAccountPage.jsx` - Refined account and notification copy
- `src/pages/app/AppTeamPage.jsx` - Refined team placeholder language
- `src/pages/app/AppAccessDeniedPage.jsx` - Refined restricted-access copy
- `src/pages/SignInPage.jsx` - Refined access messaging and onboarding language
- `src/pages/AcceptInvitePage.jsx` - Refined activation copy
- `src/pages/RequestPasswordResetPage.jsx` - Refined reset-request copy
- `src/pages/ResetPasswordConfirmPage.jsx` - Refined recovery confirmation copy
- `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md` - Documented the local admin test-account pattern and local-only usage guidance
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the report refinement and copy-positioning pass
- `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md` - Added the latest refinement-pass handoff notes and resume point
- `README.md` - Updated the current MVP scope and immediate priorities to reflect the refined report and paused-next-step posture

### Validated
- `npm run build`
- `npm run backend:build`
- diagnostics on the edited frontend and backend files

## [2026-07-07] - Dashboard And Sidebar Redesign

### Updated
- `src/components/app/AppShellLayout.jsx` - Reworked the authenticated shell into a darker analyst control rail with clearer route context, denser identity state, and stronger navigation hierarchy
- `src/pages/app/AppDashboardPage.jsx` - Redesigned the dashboard into an analyst-facing operations surface with a verification ledger, system posture panel, denser status metrics, and live signal readouts
- `README.md` - Updated the MVP scope and immediate priorities to reflect the redesigned analyst workspace
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the dashboard and sidebar redesign in the current-state tracker
- `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md` - Added the redesigned analyst workspace to the handoff summary

### Validated
- `npm run build`
- browser review of the updated dashboard and sidebar through the local preview

## [2026-07-07] - MVP Auth Recovery, Admin Operations, And Structured Report Output

### Added
- `backend/src/admin/*` - Admin module, controller, DTOs, and service for waitlist review and invite issuance
- `backend/src/common/guards/admin.guard.ts` - Admin allowlist enforcement based on `ADMIN_EMAILS`
- `backend/src/auth/dto/refresh-session.dto.ts` - Session refresh input DTO
- `supabase/migrations/0003_admin_ops.sql` - Admin-ops schema additions for notes and invite metadata
- `src/pages/AcceptInvitePage.jsx` - Invite activation page
- `src/pages/RequestPasswordResetPage.jsx` - Password reset request page
- `src/pages/ResetPasswordConfirmPage.jsx` - Password reset confirmation page
- `src/pages/app/AppAdminPage.jsx` - Internal admin workspace
- `src/pages/app/AppReportPrintPage.jsx` - Printable report page
- `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md` - Admin setup and usage guide
- `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md` - Detailed engineer handoff
- `docs/checkpoints/*` - Phase, admin, verification pipeline, and report checkpoint documents

### Updated
- `backend/src/auth/auth.controller.ts` - Added session refresh endpoint
- `backend/src/auth/auth.service.ts` - Added permission payloads and session refresh handling
- `backend/src/config/env.validation.ts` - Added `ADMIN_EMAILS` validation
- `backend/src/scans/scans.service.ts` - Replaced the single placeholder signal with image-first evidence extraction, fingerprints, metadata parsing, and structured report output
- `backend/.env.example` - Added `ADMIN_EMAILS`
- `src/lib/api.js` - Added automatic token refresh, admin API helpers, and auth recovery helpers
- `src/context/AuthContext.jsx` - Added admin permission handling
- `src/App.jsx` - Added auth-recovery, admin, and printable report routes
- `src/components/app/AppShellLayout.jsx` - Added admin navigation support
- `src/components/auth/ProtectedRoute.jsx` - Added admin-gated route support
- `src/pages/SignInPage.jsx` - Added recovery and invite entry links
- `src/pages/app/AppReportsPage.jsx` - Added report ID display and printable report access
- `src/pages/app/AppUploadsPage.jsx` - Updated workflow copy to reflect the new MVP evidence payload
- `README.md` - Updated current MVP scope and route inventory
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded auth recovery, admin ops, and report/output progress
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md` - Added admin environment configuration

### Validated
- `npm run build`
- `npm run backend:build`
- `npm --prefix backend test -- --runInBand`
- `npm run backend:test:e2e`
- `npm run lint`
- `npm run check:launch`
- remote Supabase migration apply for `0003_admin_ops.sql`

## [2026-07-07] - Queue Worker And Report Workspace

### Added
- `backend/src/queue/*` - Queue module, Redis connection parsing, and job enqueue service for worker-backed scan processing
- `backend/src/worker.ts` - Dedicated worker runtime for background scan processing
- `backend/Dockerfile.worker` - Separate worker image for Fly deployment
- `backend/fly.worker.toml` - Fly configuration for the worker service
- `src/components/app/ScanStatusBadge.jsx` - Shared scan-status badge for dashboard and reports surfaces
- `src/components/app/scanPresentation.js` - Shared scan formatting and verdict presentation helpers

### Updated
- `backend/src/scans/scans.service.ts` - Enqueues scans into Redis when configured and processes them through the worker path
- `backend/src/main.ts` - Explicitly binds the backend service to `0.0.0.0` for Fly machine networking
- `backend/src/config/env.validation.ts` - Added Redis URL, queue name, and worker concurrency validation
- `backend/package.json` - Added the worker start script and queue dependencies
- `src/pages/app/AppDashboardPage.jsx` - Replaced placeholder dashboard stats with live scan-backed metrics and recent case links
- `src/pages/app/AppReportsPage.jsx` - Replaced the placeholder reports state with real case listing and report detail rendering
- `src/pages/app/AppUploadsPage.jsx` - Added direct navigation into report review after a scan completes
- `src/components/app/AppShellLayout.jsx` - Updated shell messaging to reflect the live MVP workspace instead of the old Phase 4 label
- `src/App.jsx` - Added `/app/reports/:scanId` report-detail routing
- `.env.example` - Expanded the frontend template as a clearer single source of truth
- `backend/.env.example` - Added queue and worker environment template values
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md` - Added ready-to-paste platform values and current configuration status
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md` - Documented worker deployment and queue environment setup
- `docs/engineering/PHASE_TASK_LIST.md` - Updated the phase map to reflect queue-backed processing, report surfaces, and the future dashboard redesign
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the report workspace and worker-backed scan processing status

### Validated
- `npm run check:launch`
- Fly deployment of `provance-api`
- Fly deployment of `provance-worker`
- live `GET https://provance-api.fly.dev/v1/health`

## [2026-07-07] - Phase 5 Upload Workflow Foundation

### Added
- `backend/src/scans/*` - Scan module with signed-upload initiation, submit endpoint, scan listing, and scan detail payloads
- `backend/src/common/guards/supabase-auth.guard.ts` - Supabase JWT enforcement for authenticated endpoints
- `backend/src/common/decorators/current-user.decorator.ts` - Request user decorator for authenticated controllers
- `supabase/migrations/0002_scans.sql` - Scan table, RLS policies for owner access, and the private uploads bucket definition
- `src/lib/supabase.js` - Supabase client for signed Storage uploads (no persisted browser session)

### Updated
- `src/pages/app/AppUploadsPage.jsx` - Replaced the placeholder with a real scan-initiate, upload, submit, and status polling workflow
- `src/lib/api.js` - Added automatic Authorization bearer header support and scan API helpers
- `backend/src/supabase/supabase.service.ts` - Added per-request public client creation with bearer-token header support
- `backend/src/app.module.ts` - Registered the scan module
- `backend/src/config/env.validation.ts` - Added upload-related environment validation defaults
- `.env.example` - Added Supabase frontend environment keys for Storage uploads
- `backend/.env.example` - Added scan table and upload bucket environment settings
- `package.json` - Added frontend dependency on `@supabase/supabase-js` for Storage uploads
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded Phase 5 upload foundation status and validation requirements

### Validated
- `npm run build`
- `npm run check:launch`

## [2026-07-07] - Authenticated App Shell

### Added
- `src/context/AuthContext.jsx` - Frontend auth state with session restore, sign-in, sign-out, workspace context, and profile preferences
- `src/components/auth/ProtectedRoute.jsx` - Protected-route gate with redirect preservation and team-permission enforcement
- `src/components/app/AppShellLayout.jsx` - Authenticated layout shell and navigation for signed-in users
- `src/components/app/AppStatePanel.jsx` - Shared empty, loading, success, and error presentation surface for app pages
- `src/pages/app/*` - Initial dashboard, uploads, reports, account, team, and access denied pages

### Updated
- `src/App.jsx` - Split public and authenticated layouts and introduced `/app/*` routing
- `src/pages/SignInPage.jsx` - Signed-in redirect handling and auth-context integration
- `src/components/Navbar.jsx` - Session-aware navigation that surfaces Dashboard and Sign Out when authenticated
- `backend/src/main.ts` - Default CORS allow-list now includes `http://localhost:3000` and `http://localhost:5173`
- `backend/src/config/env.validation.ts` - Default frontend origins now include both Vite ports for local development
- `backend/.env.example` - Updated default `FRONTEND_ORIGIN` list for local development
- `backend/README.md` - Documented the recommended local CORS origin list
- `docs/engineering/PHASE_TASK_LIST.md` - Updated immediate priorities after the app shell work
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Recorded the Phase 4 app shell status and validation notes
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` - Added frontend protected routing coverage and clarified production session strategy still required

### Validated
- `npm run build`
- `npm run check:launch`
- browser validation of sign-in redirect, `/app` protected routes, account preference persistence, and team denial state

## [2026-07-07] - Live Supabase Auth And Waitlist Foundation

### Added
- `backend/src/auth/auth.service.spec.ts` - Targeted unit coverage for fresh auth-client usage, sign-in failure auditing, and invite rollback handling

### Updated
- `backend/src/auth/auth.service.ts` - Replaced scaffold auth behavior with live Supabase-backed sign-in, invite activation hardening, rollback safeguards, and audit-event writes
- `backend/src/supabase/supabase.service.ts` - Switched public auth access to per-request Supabase client creation to prevent shared in-memory session state across requests
- `backend/src/waitlist/waitlist.service.ts` - Verified live persistence behavior against the connected Supabase waitlist table
- `backend/src/config/env.validation.ts` - Continued validation support for the live Supabase environment configuration
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Updated the repo status to reflect live waitlist, invite, sign-in, and audit verification
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` - Expanded the active security baseline with per-request auth isolation and live auth validation coverage

### Validated
- `npm --prefix backend run test -- --runInBand`
- `npm run backend:build`
- `npm run backend:test:e2e`
- `npm run check:launch`
- live `POST /v1/waitlist/applications` submission verified against remote Supabase
- live `POST /v1/auth/invites/accept` and `POST /v1/auth/sign-in` verified against remote Supabase
- live `auth_audit_events` writes verified for invite acceptance and sign-in

### Notes
- remote Supabase tables are now active for `waitlist_applications`, `access_invites`, and `auth_audit_events`
- the next auth phase should focus on secure frontend session handling, recovery UX, invite issuance tooling, and protected routes

## [2026-07-06] - Backend Security Foundation And Launch Checks

### Added
- `backend/src/common/filters/global-exception.filter.ts` - Sanitized API error responses with request IDs and timestamps
- `backend/src/common/guards/api-throttler.guard.ts` - Proxy-aware throttling tracker for backend request limits
- `backend/src/config/env.validation.ts` - Startup validation and normalization for critical backend environment settings
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` - Repeatable security and launch gate for backend and auth phases

### Updated
- `backend/src/main.ts` - Added request ID tracing, `helmet`, stricter CORS handling, global exception filtering, and safer startup configuration
- `backend/src/app.module.ts` - Added validated config bootstrapping and global throttling
- `backend/src/auth/auth.controller.ts` - Added tighter rate limiting for auth routes
- `backend/src/waitlist/waitlist.controller.ts` - Added tighter rate limiting for waitlist routes
- `backend/src/health/health.controller.ts` - Reduced health response exposure and skipped throttling for health checks
- `backend/src/auth/auth.service.ts` - Adjusted scaffold responses to reduce configuration leakage
- `backend/src/waitlist/waitlist.service.ts` - Reduced internal detail exposure in public write responses
- auth and waitlist DTO files - Added normalization, trimming, and stricter token and password constraints
- `backend/.env.example` - Added security-related backend environment settings
- `backend/README.md` - Documented the backend security baseline
- `README.md` - Added launch-check commands and linked the security checklist
- `package.json` - Added `backend:test:e2e` and `check:launch` scripts
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Updated current-state tracking for the new security baseline

### Validated
- `npm run backend:build`
- `npm run backend:test:e2e`
- `npm run check:launch`

## [2026-07-06] - Root Readme And Phase Task Planning Update

### Added
- `docs/engineering/PHASE_TASK_LIST.md` - Phase-by-phase execution list covering public site work, auth, backend, app shell, workflows, reporting, team features, security, API foundations, and MVP launch readiness

### Updated
- `README.md` - Replaced the default Vite template with a real project overview, architecture summary, setup instructions, workflow rules, and current priorities
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Linked the new root overview and phase task list into the current implementation status flow

### Notes
- This update establishes the repo-level direction documents that should be maintained after every major engineering phase

## [2026-07-06] - Waitlist Auth Backend Scaffold And Legal Page Expansion

### Added
- `backend/` - New NestJS backend scaffold for the long-term Provance API
- `backend/src/health/*` - Health module and endpoint
- `backend/src/waitlist/*` - Waitlist module, DTO, controller, and service
- `backend/src/auth/*` - Auth module, DTOs, controller, and service scaffold
- `backend/src/supabase/*` - Supabase-ready service layer
- `supabase/migrations/0001_waitlist_auth.sql` - Starter waitlist and auth-adjacent schema
- `backend/.env.example` - Backend environment template
- `.env.example` - Frontend API base URL template
- `src/lib/api.js` - Shared frontend API helper for waitlist and sign-in calls
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Current system status, completed work, and handoff notes

### Updated
- `src/pages/WaitlistPage.jsx` - Waitlist form now targets the new API shape and supports loading, success, and error states
- `src/pages/SignInPage.jsx` - Sign-in form now targets the new API shape and supports loading, success, and error states
- `src/pages/PrivacyPage.jsx` - Expanded into fuller privacy-policy style content
- `src/pages/TermsPage.jsx` - Expanded into fuller terms-of-service style content
- `src/pages/CookiesPage.jsx` - Expanded into fuller cookies-policy style content
- `src/pages/ContactPage.jsx` - Support and pilot copy refined for production tone
- `src/pages/SecurityPage.jsx` - Security copy refined to remove roadmap phrasing
- `src/components/WhyProvance.jsx` - Redesigned to use a four-card two-by-two layout aligned with the Use Cases section
- `package.json` - Added root scripts for backend dev, build, and start

### Validated
- Frontend production build completed successfully
- Backend NestJS build completed successfully
- Backend e2e health test passed

### Notes
- Backend dependency installation hit an npm resolver issue in this environment
- Validation completed successfully using `pnpm` installation followed by backend build and e2e checks

## [2026-06-26] — Investor Data Room & Seed Round Outreach Strategy

### Added
- `docs/fundraising/data-room/DATA_ROOM_INDEX.md` — Master data room index linking to 30+ documents across all categories with quick-reference metrics table.

- `docs/fundraising/seed-round-outreach-strategy.md` — Comprehensive outreach strategy including:
  - 15 targeted VC firms across 3 tiers (Costanoa, Bessemer, Felicis, a16z, Lightspeed, Accel, Sequoia, GV, Greylock, Madrona, Harpoon, Decibel, Susa, AI Fund, SignalFire)
  - 4 target angel investors (Elad Gil, Nat Friedman, Lachy Groom, Sarah Guo)
  - 3-phase outreach sequence (prep → first wave → diligence & close)
  - Meeting agenda structures and data room sharing protocol

- `docs/fundraising/investor-update-template.md` — Structured investor update template with metrics table, highlights, challenges, asks, forward look, and cadence guidelines

### Updated
- Changelog updated to reflect all recent additions

## [2026-06-25] — Business Strategy & Investor Readiness

### Added
- `docs/finance/BUSINESS_STRATEGY.md` — Comprehensive strategy document
- `docs/finance/3-year-financial-model.md` — Detailed financial projections
- `docs/fundraising/investor-pitch-deck.md` — 16-slide investor deck
- `docs/decisions/001-revenue-model-ratification.md` — Decision record
- `docs/sales/sales-enablement-courtroom-test.md` — Sales enablement

### Updated
- `docs/business/investor-pitch-deck-outline.md` — Refined for $2M-$5M seed round
