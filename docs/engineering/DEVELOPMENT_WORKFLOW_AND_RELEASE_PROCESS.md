# Development Workflow And Release Process

Last updated: 2026-07-23

## Purpose

This document defines how Provance is planned, built, tested, documented, reviewed, and merged.

These are standing engineering rules, not temporary instructions.

## Core Rules

- documentation is a first-class deliverable
- code and documentation must stay synchronized
- work happens in phases, not in unrelated parallel feature jumps
- no major implementation begins without a documented plan
- no feature is complete until technical validation and Founder review are both complete
- nothing merges directly into `main` without the review process

## Ownership Model

- the engineering lead maintains architecture, documentation, standards, and consistency
- recommendations must include trade-offs, risks, and migration impact where relevant
- the Founder retains final approval on product, design, architecture, and release decisions

## Required Phase Lifecycle

### 1. Analysis

Before implementation:

- review the relevant roadmap phase
- review related documentation and existing code
- identify dependencies, blockers, and risks
- define acceptance criteria
- define required test coverage and manual validation
- define required documentation updates

### 2. Planning

Planning outputs must be written into the repository as Markdown before major implementation starts.

Minimum planning outputs:

- roadmap updates where needed
- phase checklist updates where needed
- architecture updates where needed
- setup or configuration updates where needed

### 3. Implementation

During implementation:

- work on a dedicated branch
- keep changes aligned to the active phase
- do not mix unrelated features into the same task branch
- preserve maintainability over short-term speed
- document any accepted trade-off or technical debt

### 4. Validation

Before review:

- confirm the feature behaves correctly
- run the relevant tests
- fix build issues
- verify linting where applicable
- check for obvious regressions
- verify the affected UX flows manually when needed

Baseline release gates:

- `npm run build`
- `npm run backend:build`
- `npm run backend:test:e2e`
- `npm run check:launch`

Run additional targeted checks when the phase needs them.

### 5. Documentation

Before the work is considered complete:

- update every relevant current-state document
- update setup, architecture, roadmap, and checklist docs when the change affects them
- update `docs/changelogs/CHANGELOG.md`
- ensure no active documentation contradicts the shipped behavior

### 6. Review

After validation and documentation:

- push the feature branch
- open a pull request
- provide a review summary covering:
  - what changed
  - why it changed
  - trade-offs
  - risks
  - testing performed
- wait for Founder review and approval

### 7. Merge

Merge is allowed only when:

- the implementation is approved
- required checks pass
- documentation is updated
- the branch is ready for stable integration

## Branching Standard

Use dedicated branches:

- `phase/<phase-id>-<short-name>`
- `feature/<short-name>`
- `chore/docs-<short-name>`
- `fix/<short-name>`

Examples:

- `phase/phase-3-dashboard-admin-maturity`
- `feature/report-workspace-refinement`
- `chore/docs-planning-sync`
- `fix/upload-status-regression`

## Definition Of Done

A phase or feature is done only when:

- implementation is complete for the approved scope
- required tests and checks pass
- documentation is updated
- changelog is updated
- review notes are prepared
- Founder review is complete
- the approved branch is merged

## Documentation Minimums

Update these when relevant:

- `README.md`
- `docs/README.md`
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`
- `docs/engineering/PHASE_TASK_LIST.md`
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/project-state/*`
- `docs/changelogs/CHANGELOG.md`

## Paid Service Rule For MVP

During the MVP phase:

- prefer production-suitable services with free tiers or startup credits
- do not adopt paid tools unless they solve a real blocker or meaningfully reduce delivery risk
- when a paid tool is recommended, document:
  - why it is needed
  - monthly starting cost
  - the problem it solves
  - whether adoption can be delayed
  - viable free alternatives during development

## Infrastructure Access Rule

If a task requires access that is not currently available:

- explain what account, permission, or credential is missing
- explain why it is needed
- provide concise action steps for the Founder
- avoid blocking unrelated implementation work when a practical fallback exists

## Admin Testing Rule

Internal admin functionality should support Founder-led testing throughout development.

The admin interface should help with:

- waitlist review
- user inspection
- verification-request inspection
- report inspection
- job monitoring
- diagnostics and internal validation

## Current Stop Condition

No new feature implementation should begin until the current planning and documentation update set is reviewed and approved.
