# Development Workflow And Release Process

Last updated: 2026-07-16

## Purpose

This document defines the long-term development workflow for Provance.

All work should be organized into phases.

Each phase is a milestone toward a production-ready SaaS platform.

This document describes:

- how phases are planned, built, tested, documented, released, and reviewed
- how Git branches are used
- which documents must be updated as part of phase completion

## Non-Negotiables

- Documentation is a first-class deliverable.
- Work is phase-based, not random.
- Each phase has explicit success criteria and definition of done.
- No phase is considered complete until its checklist is validated.
- Major product, design, and architectural decisions require Founder approval before implementation.

## Phase Template

Every phase must define:

- Objective
- Features to implement
- Technical tasks
- UI and UX tasks
- Backend tasks
- Documentation updates
- Testing requirements
- Success criteria
- Definition of done
- Release milestone

## Phase Lifecycle

### Step 1. Planning

Planning outputs must be written into the repository as Markdown.

Required planning actions:

- review requirements
- review existing documentation
- identify dependencies
- identify risks
- define acceptance criteria and definition of done
- define testing plan
- define required documentation updates

### Step 2. Development

Implementation expectations:

- keep code modular and maintainable
- preserve system stability
- follow existing conventions
- avoid unnecessary complexity
- ensure changes are aligned to the current phase objective

### Step 3. Testing

Testing must happen before phase completion.

Required checks vary by phase, but should include:

- verify new functionality works
- verify existing functionality still works
- verify responsiveness
- verify accessibility
- verify performance where relevant
- verify no regressions were introduced

Engineering release gates to use as a baseline:

- `npm run build`
- `npm run backend:build`
- `npm run backend:test:e2e`
- `npm run check:launch`

### Step 4. Documentation

Documentation must reflect reality after implementation.

Minimum required updates when relevant:

- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/engineering/PHASE_TASK_LIST.md`
- `docs/changelogs/CHANGELOG.md`
- `docs/project-state/*`
- `README.md` or `docs/README.md` when onboarding paths change

### Step 5. Git Workflow

Every phase runs on a dedicated branch.

Workflow:

1. create branch
2. commit phase work
3. push branch to GitHub
4. prepare for merge
5. merge to `main` only after Founder approval

### Step 6. Review

Founder review happens after the phase is complete and pushed.

Possible outcomes:

- approve and merge
- request refinement and changes
- adjust priorities and scope
- request additional features

Only after the phase is approved should we begin the next phase.

## Branch Naming Standard

Use this naming scheme:

- `phase/<phase-id>-<short-name>`
- `chore/docs-<short-name>`
- `fix/<short-name>`

Examples:

- `phase/landing-premium-refinement`
- `phase/profiles-and-accounts`
- `phase/billing-and-payments`
- `chore/docs-foundation-sync`
- `fix/upload-retry-regression`

## Release Milestones

Each phase should end in one of these milestone outcomes:

- internal milestone: merged and deployed to staging or preview
- external milestone: merged and deployed to production
- partner milestone: deployed for design partners with explicit scope statement

## Definition Of Done Standard

A phase is done when:

- all tasks are implemented
- all tests and checks pass
- documentation is updated
- the changelog reflects the work
- the phase is reviewed and approved
- the branch is merged into `main`

## Decision Process

Ownership model:

- the technical lead proposes solutions and tradeoffs
- the Founder makes final product decisions

Escalate for approval before implementation:

- major design direction changes
- major architecture changes
- major data model changes
- user-facing claim or positioning changes

## Relationship To Other Docs

- Phase execution map: `docs/engineering/PHASE_TASK_LIST.md`
- Current implementation state: `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- Living status snapshot: `docs/project-state/README.md`
- Long-term roadmap: `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`
