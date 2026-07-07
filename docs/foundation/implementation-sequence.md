# Implementation Sequence

> Current-state note. Updated 2026-07-07.
>
> This document still helps explain the intended build order, but several early phases are already complete or partially complete in the live repo.
>
> Current shipped reality:
> - the public site, sign-in flow, protected app shell, upload workflow foundation, queue-backed processing, scan history, and report detail foundations already exist
> - the current product is image-first
> - report export, batch workflows, and constrained video verification remain future phases

## Purpose

This document defines the exact build order for Provance so the team can move from planning into execution without losing speed or building the wrong layers too early.

This is not a strategy document.

It is the **execution order**.

## Core Build Principle

Build in this order:

1. credibility surface
2. product shell
3. upload and job system
4. result and report system
5. image verification lane
6. constrained video verification lane
7. workflow and API depth

This sequence gives us:

- a public-facing brand and conversion asset
- a usable product shell early
- a platform that can support both image and video
- fast visible progress without fake architecture shortcuts

## Phase 0: Delivery Foundation

### Objective

Create the minimum engineering foundation so all later work lands on stable rails.

### Deliverables

- monorepo or clearly separated app/services structure
- frontend app bootstrap
- backend API bootstrap
- worker service bootstrap
- environment configuration
- linting, formatting, CI baseline
- secrets and local development setup

### Recommended Structure

- `apps/web`
- `services/api`
- `services/workers`
- `packages/ui`
- `packages/config`
- `infra` or deployment config

### Exit Criteria

- local dev runs end-to-end
- CI passes
- shared environment variables are defined

## Phase 1: Landing Page And Marketing Surface

### Objective

Ship the credibility layer first.

### Why First

The landing page is not decoration. It is:

- brand positioning
- investor signal
- waitlist / demo funnel
- ICP qualification layer
- message test bed

### Deliverables

- homepage
- product page
- solutions page
- pricing preview page
- methodology page
- sample report page
- API / docs placeholder page
- contact / demo conversion flow

### Claims That Must Appear On The Landing Surface

- image and video verification in one platform
- explainable evidence, not just scores
- downloadable forensic reports
- honest uncertainty handling
- attribution roadmap
- enterprise-ready workflow and API path

### Exit Criteria

- landing page is production-quality
- core claims are visible and credible
- demo / waitlist capture works

## Phase 2: Authentication And Product Shell

### Objective

Build the logged-in application shell immediately after the landing surface.

### Deliverables

- sign up
- sign in
- password reset / magic link flow
- onboarding shell
- protected routes
- dashboard layout
- settings shell

### Exit Criteria

- user can move from public site to auth to dashboard
- roles and basic permissions exist

## Phase 3: Upload And Scan Orchestration

### Objective

Build the media ingestion and async processing backbone.

### Deliverables

- direct signed uploads
- media validation
- scan creation API
- separate image and video queues
- status model and polling / live updates
- scan history persistence

### Exit Criteria

- image and video files can be uploaded
- jobs are queued reliably
- dashboard reflects scan states correctly

## Phase 4: Result And Report System

### Objective

Build the experience users actually pay for.

### Deliverables

- result page shell
- verdict state
- confidence and uncertainty display
- evidence sections
- report metadata
- downloadable PDF report v1

### Exit Criteria

- completed scan produces a result page
- user can download a report

## Phase 5: Image Verification Lane V1

### Objective

Ship the first reliable image intelligence layer.

### Deliverables

- image preprocessing
- initial signal stack
- image ensemble output
- evidence payload format
- result mapping into UI and report

### Exit Criteria

- supported image formats scan successfully
- image results appear inside the real product flow

## Phase 6: Video Verification Lane V1

### Objective

Ship constrained but real video verification inside the same product.

### Deliverables

- video preflight checks
- duration and file-size rules
- adaptive frame sampling
- video signal stack v1
- video result aggregation
- video report support

### Guardrails

- clip duration caps
- async completion only
- queue isolation from image scans

### Exit Criteria

- supported videos scan end-to-end
- output lands in the same result and report framework

## Phase 7: Dashboard Depth

### Objective

Turn the product into a repeat-use workspace.

### Deliverables

- scan history filters
- scan detail pages
- report library
- retry / rescan states
- account usage view
- basic organization / team shell

### Exit Criteria

- users can manage past scans, reports, and usage without leaving the app

## Phase 8: API And Developer Surface

### Objective

Open the product to integrations and enterprise workflows.

### Deliverables

- API key management
- scan submission API
- status API
- result retrieval API
- report download endpoint
- webhooks
- API docs

### Exit Criteria

- external client can submit media and receive result lifecycle events

## Phase 9: Differentiation Layer

### Objective

Build the features that move Provance from "tool" to "platform."

### Deliverables

- attribution v1
- case workspace
- team collaboration
- review and approval flow
- audit event timeline
- report tiering

### Exit Criteria

- product supports professional workflows, not just solo uploads

## Phase 10: Performance And Scale

### Objective

Make the system fast, reliable, and commercially viable under higher load.

### Deliverables

- GPU-backed workers
- queue tuning
- inference acceleration
- cost monitoring
- caching and dedup optimization
- report generation throughput optimization

### Exit Criteria

- image latency is competitive
- short-video throughput is commercially usable

## Recommended Sprint Order

### Sprint 1

- repository and platform foundation
- landing page structure
- design system primitives

### Sprint 2

- landing page polish
- auth
- dashboard shell

### Sprint 3

- upload flow
- storage integration
- scan job creation

### Sprint 4

- result page shell
- report generation v1
- history view

### Sprint 5

- image verification lane v1
- image result evidence mapping

### Sprint 6

- constrained video verification lane v1
- video result integration

### Sprint 7

- API keys
- developer flow
- dashboard improvements

### Sprint 8+

- attribution
- team workflows
- performance hardening

## Non-Negotiable Rules

- do not block the landing page behind model completion
- do not block auth and dashboard shell behind full detection quality
- do not ship upload without async orchestration
- do not ship video without queue isolation
- do not delay report generation too far

## Final Recommendation

The implementation sequence should be:

1. landing page
2. auth and dashboard shell
3. upload and orchestration
4. result and report system
5. image lane
6. video lane
7. API and team workflows
8. differentiation and performance scale

That gives Provance the best path to fast visible progress without sacrificing the long-term platform vision.
