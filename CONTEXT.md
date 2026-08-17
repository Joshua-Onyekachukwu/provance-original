# CONTEXT.md — Provance Domain Glossary

The shared vocabulary for architecture reviews, ADRs, and cross-team discussion.
Terms are grounded in the shipped code (backend `src/`, frontend `src/`) and the
migration schema (`supabase/migrations/`). When a term drifts, update this file
in the same turn you change the code — never let a renamed concept live here
unmirrored.

Conventions used in this file:

- **Bold term** — the canonical name. Use it verbatim in architecture writing.
- **Aliases** — names that appear in code or older docs; prefer the bold term.
- **Contract** — the source of truth that pins the term's shape.

---

## Domain

### Scan

The atomic unit of work in Provance: one submitted file (image today; video on
the roadmap) that moves through the verification pipeline. Persisted in the
`scans` table; owned by a user and optionally tagged to a team (`team_id`).

- **Lifecycle** (`scans.status`): `queued` → `processing` → `complete` | `failed`.
  A scan is created as `queued` by `POST /scans`, picked up by the queue, and
  only leaves `complete`/`failed` once processing finishes.
- **Processing mode** (`processing_mode`): `quick` | `standard` | `deep` —
  a depth dial, not a priority. `standard` is the default.
- **Key fields**: `original_filename`, `mime_type`, `file_size_bytes`,
  `failure_reason` (set on `failed`), `result_payload` (set on `complete`),
  `completed_at`, `processing_mode`, `team_id`.
- **Contract**: `backend/src/scans/scans.types.ts`, `scans.service.ts`;
  lifecycle documented in `docs/engineering/SCAN_UPLOAD_CONTRACT.md`.
- **Aliases**: "upload", "submission", "job" (job is the queue-level term — see
  Queue).

### Initiation (Scan Initiation)

The first stage of the upload round-trip: `POST /scans` creates the `scans`
row and returns an upload contract (signed URL or direct-upload credentials).
Distinct from **Submission**, which is the client's final "start processing"
signal. The two-stage split lets the client upload bytes before the scan is
eligible for queue pickup.

### Upload

Transport of the file bytes into Supabase Storage (signed-URL upload path).
Not a domain state — an activity. A scan row exists before upload completes;
the row's status does not advance until **Submit** marks it ready.

### Submit

The client-facing action that moves a scan from "uploaded but idle" into the
queue: the queue is enqueued, and the row transitions `queued` → `processing`
once the worker picks it up.

### Verdict

The classification result of a scan — the product's core output. One verdict
per completed scan, held in `result_payload`.

- **Display vocabulary** (what the UI and reports show):
  `authentic` · `suspicious` · `inconclusive`.
- **Backend classifier classes** (what the classifier emits, slightly wider):
  `likely_authentic` · `suspicious` · `inconclusive` (see `buildVerdict` in
  `scans.service.ts`). The flat display value maps `likely_authentic` →
  `authentic`.
- **Contract**: `VERDICT_PALETTE` / `VERDICT_META` in
  `src/components/app/scanPresentation.js` is the single source of truth for
  verdict colors, labels, and Badge tones; `getVerdictMeta()` resolves a raw
  class to display metadata. Chart segments derive from `VERDICT_CHART_SEGMENTS`.
- **Aliases**: "result", "classification", "decision". Avoid "score" — see
  Confidence Score.

### Confidence Score

A per-verdict confidence figure (0–100). **Never rendered above 100%** — the
report/UI must clamp; an over-100 figure is a bug in the producer, not a real
value. The current report generator had a 6900% artifact from compounding a
ratio — fixed by clamping at the source.

### Signal / Evidence Signal

An individual measurement feeding the verdict: model-signature matching,
frequency-domain analysis, provenance review, frame-level continuity (for
video), spectral profile, etc. Signals are named, per-signal findings with a
strength; they are the granular layer beneath the verdict.

### Report

The user-facing deliverable for a completed scan: the branded verification
document containing the verdict, confidence, signal findings, and
recommendations.

- **Two render paths**:
  1. **Export PDF** — the real, branded document (see
     `backend/src/reports/report-document.ts`), produced as a blob download
     when `USE_MOCK` is off.
  2. **Print view** — the browser print-path fallback used in mock mode.
- **Contract**: `docs/engineering/REPORT_CONTRACT.md` (if present); sample
  content lives in `src/lib/sampleReportContent.js`. The Sample Report page
  must mirror the Export PDF design, not a page print.
- **Aliases**: "verification report", "PDF". "Report payload" = the raw
  `result_payload` JSON, not the rendered document — keep the two distinct.

### Queue

The async processing pipeline that moves scans from submission to completion.

- **Queue name**: `scan-processing` (`SCAN_PROCESSING_QUEUE_NAME` in
  `queue.constants.ts`).
- **Backend**: BullMQ on Redis (`REDIS_URL`; Upstash in production). When Redis
  is not configured, `QueueService.isConfigured()` returns false and the
  worker falls back to **inline processing** (process synchronously in the
  request path). Both paths must produce identical row transitions.
- **Job lifecycle** (BullMQ): `waiting` → `active` → `completed` | `failed`.
  Row lifecycle (`queued`/`processing`) tracks the queue, not the other way.
- **Retries**: default `attempts: 3` with backoff; a scan that exhausts
  retries lands in `failed` with `failure_reason` set and a `scan.failed`
  audit row. Locked by backend specs + `validate-scan-roundtrip.mjs`.
- **Contract**: `docs/engineering/SCAN_UPLOAD_CONTRACT.md`; worker entry
  `backend/src/worker.ts`; skill: `provance-bullmq-redis-queue`.
- **Aliases**: "pipeline", "worker". "Job" = the queue unit; "scan" = the
  domain unit. One scan may map to one job; don't conflate the two words.

### Audit Log (Audit Trail)

The append-only record of security- and admin-relevant events, persisted in
`audit_logs` (or the mock ledger in mock mode).

- **Actions** (canonical `action` strings): `scan.failed`, `job_retried`,
  `job_failed`, `session.revoked`, `member_session_revoked`,
  `refresh_token_rejected`, `refresh_lockout`, `new_device_signin`,
  `waitlist.rejected`, `team.member_removed`, `api_key.revoked`,
  `role.changed`, `feature_flag.toggled`, plus the standard auth/CRUD set.
- **Severity**: every action maps to `low` | `medium` | `high` via
  `AUDIT_SEVERITY_BY_ACTION` (shared `backend/src/common/audit-severity.ts` and
  the frontend mock mirror). Security/destructive actions are `high`.
- **Contract**: `backend/src/common/audit-severity.ts`; surfaced on the Admin
  Audit Logs page and the account Activity page.
- **Aliases**: "audit trail", "audit events", "ledger" (see Session Ledger —
  the ledger is sessions, not audit).

### Session Ledger

The per-user session registry (`user_sessions` table) tracking active devices:
each sign-in writes a row; rows carry device/IP metadata; one row is
`is_current`. Sessions are revocable (own page + org-admin revoke of a
member's sessions). Password change revokes every session except the current
one.

- **Contract**: `docs/engineering/AUTH_HARDENING_MIGRATION.md`; `DELETE
  /v1/security/sessions/:id` returns 400 when revoking the current session.
- **Distinct from** Audit Log — a session row is a fact, an audit event is a
  recorded action.

### Organization / Team

The multi-tenant grouping: a workspace with members, roles, and billing.
Scans and API keys can be tagged to a team (`team_id`); workspace admins can
revoke a member's sessions.

- **Roles**: `owner` · `admin` · `member` (PATCH `/organization/members/:id/role`
  is Owner-guarded; member role changes are `admin`/`member` only).
- **Billing**: `storage_used_gb`/`storage_limit_gb` and
  `api_calls_used`/`api_calls_limit` on `organizations` (+ `api_usage` table);
  contract in `docs/engineering/BILLING_AND_ENTITLEMENTS_CONTRACT.md`.
- **Aliases**: "workspace", "team". Prefer **Organization** for the entity and
  **team** for the tagging relationship (`team_id`).

### Waitlist

Early-access signup queue (`waitlist` table). Statuses: `waitlist_submitted`
→ `accepted` (or rejected, which writes a high-severity `waitlist.rejected`
audit event). Contract: `backend/src/waitlist/`.

### Migration

A numbered schema change in `supabase/migrations/` (0001–0021), applied in
numeric order to the live Supabase project. The repo is the source of truth;
the live schema is verified against it.

- **Verification**: `npm run validate:migrations` (probe list vs live schema),
  `npm run check:migrations` (file set/order/content vs the runbook's combined
  block), `npm run apply:migrations -- --verify` (apply + re-verify).
- **Contract**: `docs/engineering/MIGRATION_RUNBOOK.md`. A migration is
  "applied" only when the probe confirms it on the live project — the founder's
  SQL Editor paste is not authoritative until verified.

---

## Cross-cutting vocabulary

| Term | Meaning |
|---|---|
| **USE_MOCK** | Frontend flag choosing mock (`src/lib/mockApi.js`) vs real API. Real mode is the default going forward; mock stays for offline dev. |
| **result_payload** | The raw per-scan JSON blob from processing (verdict, signals, metadata). Not the rendered Report. |
| **processing_mode** | `quick`/`standard`/`deep` depth dial on a scan. |
| **Idempotency-Key** | Client-supplied header on `POST /scans` that dedupes retried submissions. |
| **team_id** | The Organization a scan/API key is tagged to; null for personal assets. |

## Rules of the vocabulary

1. **Scan ≠ Job.** Scan is the domain unit (`scans` table); job is the queue
   unit (BullMQ). The mapping is 1:1 in practice — say which one you mean.
2. **Verdict display ≠ classifier class.** The UI/report dialect is
   `authentic`/`suspicious`/`inconclusive`; the classifier emits
   `likely_authentic`/`suspicious`/`inconclusive`. Map at the boundary
   (`getVerdictMeta`), don't leak classes into UI copy.
3. **Report ≠ result_payload.** The Report is the rendered document (Export
   PDF or print view); `result_payload` is the JSON it renders from.
4. **Session Ledger ≠ Audit Log.** Sessions are facts; audit events are
   recorded actions. Both named "ledger/log" in docs — keep the qualifier.
5. **Confidence is 0–100.** Anything else is a producer bug; clamp at the
   source, and don't "fix" it in copy.
