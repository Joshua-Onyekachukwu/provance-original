# Current Feature Status

Last updated: 2026-07-16

## Purpose

This document provides a concise status table for current major features.

## Status Legend

- Complete
- Partial
- Planned
- Deferred

## Feature Status

| Feature | Status | Notes |
| --- | --- | --- |
| Public marketing site | Complete | Phase 1 refinement is complete and approved. |
| Waitlist submission | Complete | Wired to backend and live table flow. |
| Invite-based onboarding | Complete | Activation path exists through backend invite validation. |
| Sign-in | Complete | Backend-mediated auth flow in place. |
| Password reset | Complete | Request and confirmation flows implemented. |
| Authenticated app shell | Partial | Core app navigation is implemented and Phase 2 is now refining app-shell polish and responsiveness across mobile, tablet, and desktop. |
| Upload workflow | Complete | Signed upload flow and submit step are in place. |
| Queue-backed processing | Complete | Worker path exists with inline fallback. |
| Report detail view | Complete | Loads real report data. |
| Printable report view | Partial | Good print-ready view exists; dedicated export and deeper PDF workflow remain future work. |
| Admin workspace | Complete | Review, notes, status updates, CSV export, and invite generation are present. |
| Team workspace | Deferred | Placeholder route exists; real workflow is not active. |
| Organization access control | Deferred | Not implemented beyond current basic permission model. |
| Video verification | Deferred | Not yet supported in real processing flow. |
| Audio verification | Deferred | Not yet supported in real processing flow. |
| Share links | Deferred | Not implemented. |
| Full PDF export pipeline | Deferred | Not implemented beyond print view. |
| Backend profile persistence | Complete | Account profile data is now persisted through the backend profile layer instead of local-only browser state. |
| Account settings API | Complete | Authenticated profile read and update endpoints now exist for app account settings. |
| Current-session identity endpoint | Complete | The frontend can now hydrate signed-in identity, permissions, and profile state from the backend. |
| Session hardening | Planned | Document now, implement later. |
| RLS expansion for non-scan tables | Planned | Document now, implement later. |
