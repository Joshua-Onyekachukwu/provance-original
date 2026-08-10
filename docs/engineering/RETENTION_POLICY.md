# Retention Policy — Uploaded Artifacts, Reports, and Audit Events

Status: **Ratified baseline** (2026-08-10)

## Purpose

Define how long Provance keeps the three data classes that accumulate during
verification work — uploaded media, completed report payloads, and audit
events — and what happens when each window elapses. This document is the
operational contract behind the admin Settings surface values
(`report_retention_days`, `audit_retention_days`) and the storage capacity
probe in `GET /v1/admin/monitoring`.

## Data classes and windows

| Data class | Storage | Default window | Config key | Enforced by |
| --- | --- | --- | --- | --- |
| Uploaded media (original asset) | Supabase Storage `provance-uploads` | 365 days | `REPORT_RETENTION_DAYS` | Archival job (planned) |
| Completed report payloads (`result_payload`) | `public.scans.result_payload` | 365 days | `REPORT_RETENTION_DAYS` | Archival job (planned) |
| Scan metadata rows | `public.scans` | Kept indefinitely (hard-delete only on account deletion) | — | Account lifecycle |
| Audit events | `public.audit_logs` | 730 days | `AUDIT_RETENTION_DAYS` | Archival job (planned) |
| Crash reports | `public.crash_reports` | 90 days | (fixed constant) | Archival job (planned) |
| Session ledger | `public.user_sessions` | Pruned on sign-out; `last_active_at` rows older than `AUTH_COOKIE_MAX_AGE_DAYS` are candidates | `AUTH_COOKIE_MAX_AGE_DAYS` | Sign-out + refresh |

## Semantics

- **Report retention** is measured from `completed_at` (not `created_at`) — an
  `awaiting_upload` reservation that never completes is not aged out by the
  report window; it is already covered by the queue's own failed/abandoned
  handling.
- **Audit retention** is a compliance-oriented window: keep enough history to
  reconstruct access and admin actions, but do not accumulate forever.
- **Archival, not deletion, by default.** The intended production behavior is
  to move aged payloads to cold storage and null out the hot-path
  `result_payload` (keeping the scan row and its flat verdict) rather than
  destroying evidence a customer may still need. A hard-delete path exists for
  account deletion and legal takedown, and must be logged to `audit_logs`.

## Status of enforcement

As of this baseline, the **windows are configured and surfaced** (admin
Settings page reads `REPORT_RETENTION_DAYS` / `AUDIT_RETENTION_DAYS` via the
admin service; both keys are validated in `backend/src/config/env.validation.ts`
and documented in `.env.example`), but **no background archival job runs yet**.
The job is a Phase 5 backlog item — see `docs/engineering/PHASE_TASK_LIST.md`
(Storage And Data → "retention policy documentation for uploaded artifacts",
now complete as a document; enforcement tracked there).

Until the archival job ships, operators should treat the configured windows
as the *planned* policy and rely on the storage-capacity probe in
`GET /v1/admin/monitoring` for visibility into utilization.

## Related

- `docs/engineering/SCAN_UPLOAD_CONTRACT.md` — scan lifecycle and storage paths
- `docs/engineering/ORGANIZATION_API_CONTRACT.md` — member/session lifecycle
- `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` — pre-beta security review
- `backend/src/config/env.validation.ts` — retention key validation
