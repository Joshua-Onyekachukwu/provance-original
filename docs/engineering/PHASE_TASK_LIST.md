# Provance Phase Task List

Last updated: 2026-07-06

## Purpose

This document is the working phase map for Provance. It lists the major product, engineering, infrastructure, and operational phases required to move from the current state to a production-ready MVP.

Update this file after each major phase so the team always has a clear build sequence, current focus, and next set of deliverables.

## Phase 0. Current Baseline

Current repo status:

- public marketing and product site exists
- major public pages exist
- legal pages now have fuller production-style content
- frontend waitlist and sign-in flows target a real backend API shape
- NestJS backend scaffold exists in `backend/`
- Supabase-ready auth and persistence direction is prepared

## Phase 1. Public Site Completion

Goal:

Finish the public-facing website so it is clean, credible, consistent, and ready to support waitlist and early-access conversion.

Core tasks:

- finish remaining homepage polish and consistency cleanup
- review all public pages for copy quality, hierarchy, spacing, and clarity
- refine product, methodology, pricing, docs, sample report, and security pages
- ensure site-wide consistency for typography, color, spacing, and motion
- remove any remaining placeholder or staging-tone copy
- confirm navigation, footer, and route coverage are complete

Exit criteria:

- all public pages feel production-ready
- no placeholder or reporting-style copy remains
- legal and support pages are present and coherent

## Phase 2. Waitlist And Access Foundation

Goal:

Turn the current waitlist and sign-in frontend into a real working early-access system.

Core tasks:

- connect waitlist submissions to Supabase persistence
- define waitlist application schema and review status fields
- connect sign-in to real Supabase Auth
- implement password reset request and confirmation
- implement invite acceptance flow
- add protected route handling on the frontend
- add session-aware navigation and auth state management

Exit criteria:

- users can submit to the waitlist successfully
- approved users can sign in through a real auth flow
- auth state survives refresh and protected routes enforce access

## Phase 3. Admin And Internal Operations Layer

Goal:

Create the minimum internal workflow needed to review waitlist users and control access.

Core tasks:

- build admin view for waitlist applications
- support approval, rejection, and invite issuance
- track status history and audit events
- add lightweight internal notes and review metadata
- add operational email hooks for invite and access notifications

Exit criteria:

- team can review waitlist demand and control onboarding
- access approvals are traceable and repeatable

## Phase 4. Authenticated App Shell

Goal:

Establish the first real in-product experience for authenticated users.

Core tasks:

- build dashboard shell and authenticated layout
- add top-level navigation for uploads, reports, account, and team areas
- create empty, loading, success, and error states
- add account profile and basic settings
- define permission checks for individual and team contexts

Exit criteria:

- approved users land in a working authenticated product shell
- core app navigation and state handling exist

## Phase 5. Upload And Verification Workflow

Goal:

Build the first usable verification flow for submitted media.

Core tasks:

- create media upload flow
- validate file types and upload constraints
- store uploaded files and metadata
- create job records for analysis
- define verification status lifecycle
- show analysis progress and result states in the app

Exit criteria:

- users can submit a file into a real workflow
- the system can track a verification case from submission to result

## Phase 6. Report And Evidence Layer

Goal:

Turn analysis results into structured, reviewable outputs.

Core tasks:

- build report view inside the application
- define report sections for verdict, evidence, metadata, timeline, and references
- support report export or printable output
- preserve audit trail and report identifiers
- prepare evidence structures for future explainability tooling

Exit criteria:

- users can review a structured report from a real case
- report output is suitable for sharing and follow-up review

## Phase 7. Team And Organization Workflows

Goal:

Expand beyond single-user use and support shared review environments.

Core tasks:

- add organization and team entities
- add role-based access control
- add shared case visibility and assignment logic
- add collaboration metadata such as ownership, reviewer state, and comments
- add organization-aware report and case access rules

Exit criteria:

- teams can work in shared environments with controlled access

## Phase 8. Reliability, Security, And Compliance Readiness

Goal:

Make the system stable, secure, observable, and ready for broader beta usage.

Core tasks:

- add structured logging and monitoring
- add rate limiting and abuse protection
- harden auth, cookies, tokens, and session handling
- improve validation, error boundaries, and failure handling
- document retention, deletion, and access control policies
- prepare security review checklist and incident response basics

Exit criteria:

- the system is safer to expose to early users
- operational visibility exists for debugging and support

## Phase 9. Developer And API Foundation

Goal:

Prepare the product for future programmatic integrations and internal acceleration.

Core tasks:

- define API authentication approach
- formalize request and response contracts
- document key endpoints and object models
- create initial external API plan for verification jobs and report retrieval
- improve docs for internal and external developers

Exit criteria:

- backend contracts are clear enough for future integration work

## Phase 10. MVP Launch Readiness

Goal:

Pull the public site, onboarding system, authenticated workflow, and operations into one stable MVP release.

Core tasks:

- run end-to-end flow review from waitlist to authenticated use
- tighten copy, UX, and support content across the full experience
- complete deployment and environment readiness review
- ensure documentation reflects the shipped state
- finalize launch checklist and beta support workflow

Exit criteria:

- Provance has a coherent, usable MVP for early users

## Immediate Active Priorities

The most important next tasks are:

1. connect real Supabase project values and apply the starter migration
2. wire real waitlist persistence and Supabase Auth
3. add protected frontend routing and session management
4. build the first authenticated app shell

## Documentation Rules

After every major phase:

- update this file
- update `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- update `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md` when security gates or release checks change
- update `docs/changelogs/CHANGELOG.md`
- push the tested phase to `main`
