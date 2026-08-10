# Current Feature Status

Last updated: 2026-08-08

## Purpose

This document provides a concise status view of the major product features.

## Status Legend

- Complete
- In Progress
- Planned
- Deferred

## Feature Status

| Feature | Status | Notes |
| --- | --- | --- |
| Public marketing site | Complete | Current MVP focus has moved beyond landing-page work. |
| Waitlist submission | Complete | Wired to the backend and live persistence path. |
| Invite-based onboarding | Complete | Acceptance flow exists through the backend. |
| Sign-in | Complete | Backend-mediated auth flow is in place. |
| Password reset | Complete | Request and confirmation flows are implemented. |
| Authenticated app shell | Complete | Grouped sidebar IA, notification bell, avatar menu, ⌘K command palette. |
| User workspace (all pages) | **Shipped** | All 16 user-workspace pages built and verified: Dashboard, Uploads, Queue, History, Reports (+ detail + print), Account, Notifications, Activity, Organization, Billing, API Keys, Docs/Help, Security, Team, Access Denied — mock-backed with loading/empty/error states, `?state=` demo forcing, and ⌘K commands (2026-08-05). |
| Dashboard workspace | Complete | StatCard grid, scan ledger, triage/history tabs, queue/report/risk panels. |
| Upload workflow | Complete | Drag-and-drop, processing modes, upload-into-queue state machine. |
| Queue-backed processing | In Progress | Mock queue lifecycle works; real worker path exists, needs operational confidence. |
| Report list and detail | Complete | Reports + detail + printable view with verdict, confidence, and signals. |
| Print-ready report | Complete | Printable view with verdict, confidence, signals, media preview, and evidence sections — print stylesheet keeps panels intact across page breaks. |
| Account profile persistence | Complete | Profile state is backend-backed. |
| Notifications | Complete | Notification center with category tabs, mark-read, ⌘K commands. |
| Billing (UI only) | Complete | Plan, usage meters, payment methods, invoice history — preview actions only. |
| Security settings | Complete | Password change, active sessions with revoke, sign-in controls (2FA preview). |
| API keys | Complete | Create with reveal-once token, scopes, revoke, limits reference. |
| Help & documentation | Complete | Searchable guides (docs) and FAQ accordions (help), contact drawer. |
| Activity log | Done | Filterable event ledger: category tabs, search, expandable detail rows, pagination, demo states. |
| Organization management | Complete | Member roster with roles and team access, invite flow with pending invites, workspace profile — owner/admin gated. |
| Admin workspace | Complete | All 12 pages built: Overview, Waitlist, Users, Organizations, Feature Flags, Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings — mock-backed with loading/empty/error states and `?state=` demo forcing (2026-08-05). |
| Frontend completion (all surfaces) | **Complete** | 28/28 pages shipped and verified (16 user workspace + 12 admin), each with loading/empty/error states, `?state=` demo forcing, and ⌘K commands. Final sign-off audit re-verified every workspace and admin route 2026-08-08: all 12 admin pages closed out (Overview, Waitlist, Users, Organizations, Feature Flags, Analytics, Monitoring, Audit Logs, Jobs, Reports, Roles, Settings). No frontend slices remain — active work is exclusively backend integration and the approved feature set. |
| Shared formatters | Complete | All date/number/duration/storage formatters consolidated in `scanPresentation.js`, locale pinned to en-US, 63-test vitest suite with edge-case coverage (polish pass 2026-08-05). |
| Sample report timestamps | Complete | Single canonical `analysisTimestampIso` rendered via `formatDateTime` on landing/page/document/print surfaces (was hardcoded and divergent). |
| Team workspace | Deferred | Protected route exists; collaboration features planned later. |
| Organization access control | Deferred | Not implemented beyond current permission model. |
| Video verification | Deferred | Not supported in the live processing flow. |
| Audio verification | Deferred | Not supported in the live processing flow. |
| OpenAI integration | Deferred | Not part of the immediate implementation plan. |
| Anthropic integration | Deferred | Not part of the immediate implementation plan. |
| Session hardening | Approved | httpOnly-cookie sessions; required before broader beta (approved 2026-08-04). |
| Expanded observability | Approved | Sentry (errors) + PostHog (product analytics) baseline before first real users (approved 2026-08-04). |
| Global error boundary | Complete | Crash recovery with retry across the app (approved 2026-08-04, shipped 2026-08-05). |
| Report PDF export | Complete | Client-side export from the printable view: Export PDF button (report detail + print page + ⌘K), print-dialog flow with pre/post toasts, descriptive save filename (approved 2026-08-04, shipped 2026-08-07). |
| Scan deduplication | **Complete** | Hash-based dedup: worker computes SHA-256, reuses the prior completed payload with a `deduplicated_from` marker (approved 2026-08-04, shipped 2026-08-08; migration 0013 + mock `?dedup=1` demo seam). |
| Webhooks UI | **Complete** | /app/webhooks: create/manage endpoints with reveal-once signing secrets, event subscription, delivery logs, test pings, pause/resume/rotate/delete — mock-backed with loading/empty/error states and ⌘K (approved 2026-08-04, shipped 2026-08-08). |
| Admin analytics + monitoring | Complete | Analytics + Monitoring pages with the real `GET /admin/analytics` backend endpoint (approved 2026-08-04, shipped 2026-08-05). |
| Usage/entitlement enforcement | Approved | Enforce plan limits once billing is wired (approved 2026-08-04, later release). |
| Evidence appendix in reports | Complete | Methodology + limitations appendix for court-oriented trust — shipped 2026-08-08 on the report document model, server PDF, printable report, and sample report demo (approved 2026-08-04). |
