# Master Development Plan

> Current-state note. Updated 2026-07-07.
>
> This is a strategy and long-range planning document. It should not be read as the literal current implementation state.
>
> Current implementation differs in a few important ways:
> - the shipped product is image-first, with video kept as future scope
> - the live frontend stack is React + Vite
> - the live backend direction is NestJS plus a BullMQ worker on Fly.io, not a Python-first compute stack
> - report detail foundations are live, while PDF export is still planned work

## 1. Executive Direction

This plan assumes Provance is being built for the **best possible outcome**, not for a small demo product.

That means:

- build for a serious trust infrastructure company
- launch a unified product for **both image and video verification**
- include downloadable report generation from the start of the platform design
- optimize for **speed, explainability, and defensibility**
- use early infrastructure that accelerates shipping without creating architectural dead ends

The goal is not to become "another detector."

The goal is to become the **verification, evidence, and workflow layer** for synthetic media decisions.

## 2. The Unicorn Version Of Provance

Provance becomes a unicorn only if it evolves into a platform with all of the following:

- a unified verification product for image and video
- an enterprise-grade API layer
- a defensible fingerprint and attribution graph
- team workflows and case management
- report-grade evidence outputs
- standards alignment around provenance and trust
- a proprietary data and retraining moat

The eventual company should sit across:

- media verification
- trust and safety
- fraud and impersonation defense
- digital forensics
- enterprise risk
- evidence workflow infrastructure

## 3. Hard Strategic Recommendation

### What We Should Build

Build one platform with two verification lanes:

- **Image verification lane**
- **Video verification lane**

But do **not** treat them as identical workloads.

### What We Should Not Do

Do not build:

- a single shared naive pipeline
- a synchronous upload-and-process architecture
- a "just ship something fast" system that will melt under video load

## 4. Product Thesis

Provance should launch as:

**an explainable synthetic media verification platform for image and video, with forensic evidence, downloadable reports, and enterprise-ready workflow hooks**

## 5. Product Scope

## 5.1 Core Product Surfaces

### Public / Marketing

- Landing page
- Product pages
- Solutions pages
- Methodology page
- Pricing page
- Documentation pages

### Authenticated Product

- Upload workspace
- Scan results page
- Report download page
- Scan history
- Team dashboard
- Settings and API keys

### Internal / Admin

- Review queue
- failed job management
- model version visibility
- scan diagnostics

## 5.2 Core User Flows

### Flow 1: User Uploads Image

1. user authenticates
2. uploads image directly to storage
3. job enters image queue
4. image signals run
5. results are persisted
6. downloadable report is generated
7. user receives result and report

### Flow 2: User Uploads Video

1. user authenticates
2. uploads video directly to storage
3. video preflight runs immediately
4. adaptive frame pipeline begins
5. video-specific and shared signals run
6. results and evidence are aggregated
7. downloadable report is generated
8. user receives result and report

### Flow 3: API / Enterprise Workflow

1. API client authenticates
2. media reference or upload is submitted
3. request is queued
4. job completes asynchronously
5. result is returned by polling or webhook
6. report artifact can be requested or downloaded

## 6. What Makes This Stand Out

Provance should stand out through a combination of product, intelligence, and workflow features:

### Must-Have Differentiators

- explainable verdicts
- signal-level evidence breakdown
- attribution roadmap
- honest uncertainty output
- downloadable forensic report
- chain-of-custody aware audit trail
- image + video in one product

### High-Value Expansion Features

- side-by-side comparison across scans
- case workspace for investigative or legal use
- team collaboration and reviewer approval
- re-scan when model or fingerprint database improves
- provenance ingestion and C2PA-aware enrichment
- API and workflow automation

## 7. Build Philosophy For Image + Video Together

Yes, we should support **both image and video together** from the product perspective.

But the correct execution is:

- one product
- one upload experience
- one report system
- two processing architectures

### Why

Image and video are not equal in:

- file size
- latency tolerance
- compute cost
- model complexity
- queue behavior

If we force them into one identical technical flow, speed and cost will suffer badly.

## 8. Speed Strategy

If speed is a hard requirement, the platform must be designed around it from day one.

### Speed Principles

- direct-to-storage uploads
- hash-based deduplication
- preflight checks before expensive inference
- separate image and video queues
- progressive status updates
- adaptive frame sampling for video
- GPU batching for heavy inference
- caching repeated results
- report generation after verdict persistence, not before

### Image Speed Targets

- ideal target: `2-8 seconds`
- acceptable early target: `8-20 seconds`

### Video Speed Targets

- short clip target: `15-45 seconds`
- longer clips: async completion with live status

### Important Reality

Fast video processing is possible only if:

- we sample smartly
- we batch inference
- we avoid downloading full files repeatedly
- we separate urgent user feedback from final heavy processing

## 9. Backend Recommendation

## 9.1 Convex vs Supabase vs Custom Backend

### Convex

Convex is excellent for:

- reactive apps
- product velocity
- simple backend logic

Convex is **not** the best foundation for Provance because:

- heavy media and GPU workflows do not belong inside its main execution pattern
- long-running compute tasks are not its sweet spot
- video processing and model orchestration will require external compute anyway

### Supabase

Supabase is better than Convex for Provance's early phase because it gives:

- PostgreSQL
- Auth
- object storage
- SQL and analytics flexibility
- easier migration path into a more custom architecture

### Final Recommendation

**Start with Supabase as the control plane, not as the compute engine.**

That means:

- Supabase for auth, metadata, storage, and app state
- Python backend for scanning
- Redis / queue for background jobs
- dedicated worker layer for image and video processing

This gives speed now and preserves the path to a heavier real backend later.

## 9.2 Migration Philosophy

Do **not** plan to "replace the backend later" in a total rewrite.

Instead:

- build the real compute backend from day one
- keep Supabase as the early platform layer
- later move storage, auth, or operational data only if scale demands it

That is a much safer path than building a fake backend now and rebuilding the core later.

## 10. Recommended Technical Architecture

## 10.1 Architecture Layers

### Frontend Layer

- Next.js web app
- landing page + authenticated product
- real-time status UI

### Platform Layer

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- optional Supabase realtime early

### API Layer

- FastAPI or equivalent Python service
- REST endpoints for upload session, job creation, result retrieval, report requests

### Orchestration Layer

- queue service
- worker coordination
- image and video routing

### Intelligence Layer

- image signal workers
- video signal workers
- attribution engine
- ensemble engine
- explanation engine

### Report Layer

- PDF / structured report generation service
- signed artifact metadata
- downloadable user report

## 10.2 Queue Design

Create separate queues:

- `image-fast-lane`
- `video-standard-lane`
- `report-generation`
- `retrain-or-backfill`

This prevents video jobs from choking image throughput.

## 10.3 Storage Design

Buckets or storage partitions:

- raw uploads
- normalized processing artifacts
- heatmaps and evidence outputs
- downloadable reports

## 10.4 Data Model Additions

Core entities:

- users
- organizations
- scans
- media_assets
- signal_results
- attribution_results
- reports
- audit_events
- api_keys
- usage_events

## 11. Detection Plan

## 11.1 Image Detection Signals

- frequency analysis
- neural classifier
- metadata forensics
- noise fingerprinting
- anatomy / facial checks
- attribution retrieval

## 11.2 Video Detection Signals

- keyframe and adaptive frame analysis
- temporal consistency
- frame-level classifier
- metadata and container analysis
- audio analysis when present
- attribution hints when applicable

## 11.3 Shared Ensemble Layer

Both image and video should produce:

- verdict
- confidence
- uncertainty band
- evidence summary
- methodology version

## 12. Report System

The report system should be a first-class feature, not an afterthought.

## 12.1 Report Outputs

- summary verdict
- confidence and uncertainty
- per-signal breakdown
- attribution summary where available
- audit timestamps
- chain-of-custody metadata
- methodology / version reference
- downloadable PDF

## 12.2 Report Tiers

### Standard Report

- consumer / prosumer friendly
- concise result summary

### Professional Report

- evidence appendix
- signal breakdown
- hash and timing metadata

### Forensic Report

- expanded chain-of-custody
- stronger audit package
- enterprise / legal-facing format

## 13. Unicorn-Build Feature Roadmap

## Phase A: Foundation Platform

### Goal

Create the real base for a trust platform, not a throwaway MVP.

### Deliverables

- repo setup
- frontend shell
- auth and storage
- FastAPI service
- queue and worker skeleton
- image and video upload orchestration
- base report framework
- benchmark harness

### Recommendation

Even before model quality is perfect, the platform shape should already support both image and video.

## Phase B: Unified Image + Video MVP

### Goal

Launch one product that accepts both image and video.

### Deliverables

- image verification v1
- constrained video verification v1
- unified upload page
- result page
- downloadable report v1
- scan history
- status tracking

### Important Note

Video v1 should ship with controlled scope:

- supported file size limits
- clip duration limits
- async job completion

This still counts as a unified product.

## Phase C: Trust And Workflow Differentiation

### Goal

Move beyond detector category.

### Deliverables

- stronger evidence UI
- attribution v1
- case workspace
- team collaboration
- review and approval flows
- API and webhook support

## Phase D: Performance And Scale

### Goal

Make the platform operationally strong.

### Deliverables

- GPU-backed video workers
- ONNX or accelerated inference
- queue isolation
- auto-scaling workers
- better report generation throughput
- cost observability

## Phase E: Moat And Platform Expansion

### Goal

Build the elements that support unicorn-scale value.

### Deliverables

- retraining pipeline
- fingerprint graph
- provenance / C2PA support
- browser extension
- enterprise trust and policy engine
- white-label / OEM API

## 14. Team Plan

## Minimum Serious Team

- founder / product architect
- ML engineer
- backend / platform engineer
- frontend engineer
- product designer

## Recommended Expanded Team

- second ML engineer
- video ML specialist
- DevOps / infrastructure engineer
- QA / validation support
- legal / compliance advisor

## 15. Timeline Recommendation

## Track 1: Platform Foundation

- 4-6 weeks

## Track 2: Unified Image + Video MVP

- 8-12 weeks

## Track 3: Differentiation Layer

- 8-10 weeks

## Track 4: Performance And Enterprise Readiness

- 10-16 weeks

### Total To Serious Market-Ready Product

- roughly `6-9 months` with a focused team

## 16. Risks

### Technical

- video compute cost
- dataset quality
- latency under queue pressure
- false positives in trust-sensitive use cases

### Product

- trying to make consumer and enterprise needs identical
- overclaiming legal readiness
- shipping report outputs before evidence quality is mature

### Business

- weak pilot acquisition
- long time-to-trust in enterprise workflows
- underfunding before video optimization

## 17. Final Recommendation

### Should We Build Image And Video Together?

**Yes, at the product level.**

### Should We Process Them The Same Way?

**No.**

### Should We Start With Convex?

**No.**

### Should We Start With Supabase?

**Yes, for auth, metadata, storage, and app control plane.**

### Should We Build A Real Python Compute Backend From Day One?

**Yes.**

### Should Downloadable Reports Be In Scope Early?

**Yes. They are one of the main strategic differentiators.**

### What Gives Us The Best Chance To Stand Out?

Build Provance as:

- one unified image + video verification product
- with fast async processing
- with report-grade evidence
- with attribution and workflow ambition
- on a platform architecture that can grow into enterprise trust infrastructure

## 18. What We Should Aim For

Aim to become:

**the fastest trustworthy image and video verification platform with explainable evidence, downloadable forensic reports, and enterprise-ready trust workflows**

That is a company worth building.
