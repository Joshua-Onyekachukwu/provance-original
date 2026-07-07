# Product Requirements Document

## Product Name

> Current-state note. Updated 2026-07-07.
>
> This PRD still contains useful product intent, but some naming and scope details are dated.
>
> Current shipped reality:
> - the product and repo now use `Provance` consistently
> - the current MVP is image-first
> - the app has live sign-in, uploads, scan history, and report detail foundations
> - video parity, external API program, and full report export remain future scope

Working company name: Provance  
Working product name: Provance

## Product Summary

VerifAI is an explainable AI-generated media verification platform that helps organizations and professionals evaluate the authenticity of images and videos using multi-signal analysis, attribution, and evidence-focused reporting.

## Problem Statement

Users with high trust obligations cannot rely on opaque AI detectors when reputational, legal, editorial, or fraud-related decisions are at stake. They need results that are understandable, actionable, and operationally usable.

## Product Goals

### Goal 1

Deliver a trustworthy image verification MVP that combines multiple signals and presents clear evidence-backed outputs.

### Goal 2

Support repeat workflows for professionals rather than one-off novelty usage.

### Goal 3

Create an architecture that can evolve into legal-grade reporting, enterprise API usage, and video verification.

## Non-Goals

- Competing on consumer scale before trust and accuracy are proven
- Claiming definitive legal admissibility in all jurisdictions at launch
- Supporting every media type in the MVP
- Building a mobile app before the core workflow is proven

## Target Users

### Primary

- Journalists and fact-checkers
- Investigators and analysts
- Legal-adjacent users evaluating disputed media
- Enterprise buyers with trust and safety use cases

### Secondary

- Developers needing API access
- Consumers needing occasional verification

## Jobs To Be Done

- Determine whether an image is likely AI-generated, authentic, or uncertain.
- Understand why the system reached that conclusion.
- Save, revisit, and share the result.
- Export findings in a professional report format.
- Integrate verification into a larger workflow through API.

## Core User Journeys

### Journey 1: Self-serve verification

1. User lands on product page.
2. User uploads image.
3. System validates and queues scan.
4. User watches status updates.
5. User receives verdict, confidence, signal summary, and explanation.
6. User saves or exports result.

### Journey 2: Team workflow

1. Team member uploads media.
2. Scan enters workspace.
3. Reviewer inspects result and evidence.
4. Team comments or escalates.
5. Team exports report or shares case result.

### Journey 3: Developer integration

1. Developer signs up.
2. Developer creates API key.
3. Developer submits file or URL for scan.
4. Developer receives status and verdict via API / webhook.
5. Developer inspects logs and usage in dashboard.

## MVP Scope

### Included

- Authenticated user accounts
- Secure image upload
- Hash-based duplicate detection
- Image verification pipeline
- Result page with verdict and confidence
- Signal-level evidence summary
- Scan history dashboard
- Basic API endpoint
- Internal admin visibility

### Excluded

- Full video pipeline
- Team collaboration
- Formal legal-grade signed report
- Browser extension
- Native mobile apps
- Enterprise SSO

## Functional Requirements

### Upload

- Support common image types
- Validate file type and size
- Provide progress and queued states
- Prevent duplicate scans where possible

### Detection

- Run defined image signals
- Produce verdict: `ai`, `real`, or `uncertain`
- Produce confidence score
- Store per-signal evidence

### Results

- Display verdict and confidence prominently
- Show signal summary with plain-language explanation
- Display attribution if available
- Allow export or copy-share action

### Accounts

- Sign up and sign in
- View scan history
- Access only own scans unless elevated role

### API

- Submit media for scan
- Poll or subscribe for status
- Return structured result payload

## Quality Requirements

- High trust UX over flashy speed claims
- Accurate handling of uncertainty
- Strong audit logging for state changes
- Secure private file handling
- Operational observability from day one

## Success Metrics

### Product

- Time to first scan completion
- Completion rate
- Repeat weekly usage by target users
- Percentage of scans viewed to full result

### Model / Trust

- Precision and recall by media type
- False positive rate on authentic media
- Uncertain verdict rate
- Analyst trust score from pilot users

### Commercial

- Trial-to-paid conversion
- Paid team adoption
- API activation rate
- Retention by segment

## Risks and Constraints

- Dataset quality is the main delivery risk.
- Trust can be damaged by aggressive confidence claims.
- Legal positioning must be carefully scoped.
- Video support can overwhelm cost structure if introduced too early.

## Launch Readiness Criteria

- Image pipeline reaches agreed benchmark threshold
- False positives stay under agreed threshold on representative test data
- Auth, logging, monitoring, and error handling are production-ready
- Results experience is understandable to non-technical users
- Pricing, support, and terms are ready for launch
