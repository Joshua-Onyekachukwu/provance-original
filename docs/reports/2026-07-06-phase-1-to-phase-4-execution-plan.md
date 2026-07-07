# Phase 1 To Phase 4 Execution Plan

**Date:** 2026-07-06  
**Scope:** Ordered delivery plan for public experience, authentication, backend decision, and startup infrastructure actions  
**Status:** Historical execution plan before the current backend and product-shell implementation

> Update note. 2026-07-07.
>
> This plan reflects the repo before backend direction was fully locked and before major parts of the authenticated product were shipped.
>
> Since then, the public foundation, sign-in flow, protected app shell, NestJS backend, Fly deployments, and Redis-backed worker path have all advanced. Use `docs/engineering/PHASE_TASK_LIST.md` for the active phase view.

## 1. Guiding Principle

We should not move straight into the product application surface while the public foundation, access strategy, and backend direction remain unresolved.

The correct sequence is:

1. complete the public foundation
2. implement waitlist-first authentication
3. finalize backend architecture
4. secure startup infrastructure leverage

## 2. Phase Summary

## Phase 1: Public Foundation

### Objective

Make the entire public-facing experience polished, complete, trustworthy, and conversion-ready.

### Includes

- landing-page refinement
- working CTA flows
- public copy tightening
- missing public pages
- legal/trust pages
- accessibility improvements
- performance and SEO improvements
- non-destructive design-system formalization

### Exit Criteria

- no placeholder public links
- working waitlist/demo/report pathways
- public trust pages live
- accessibility baseline in place
- design-system recommendations implemented

## Phase 2: Waitlist-First Authentication

### Objective

Build a secure authentication and access-control layer that supports early access before full application rollout.

### Includes

- waitlist submission
- email verification
- invite-based account activation
- sign in
- password reset
- session management
- protected routes
- account management
- admin approval model
- audit logging

### Exit Criteria

- real auth flow works end to end
- early users can be approved and invited
- session handling is secure
- auth events are auditable

## Phase 3: Backend Architecture Commitment

### Objective

Approve and lock the backend foundation before building deeper application functionality.

### Includes

- final framework choice
- data layer choice
- storage and queue strategy
- auth implementation approach
- module boundaries
- infrastructure alignment

### Exit Criteria

- one approved stack decision
- one approved backend architecture document
- no unresolved primary framework ambiguity

## Phase 4: Startup Infrastructure Leverage

### Objective

Reduce cost and increase strategic leverage through well-timed startup program applications.

### Includes

- cloud credit applications
- dev tooling applications
- hosting/data-layer program applications where relevant
- application pack preparation

### Exit Criteria

- immediate-priority applications submitted
- deferred applications scheduled against product milestones

## 3. Recommended Work Order

## 3.1 Immediate Order

1. founder review and approval of current audit/recommendation docs
2. implement Phase 1 public foundation
3. validate public conversion and waitlist readiness
4. implement Phase 2 authentication
5. begin backend foundation on approved stack
6. submit startup applications aligned with the approved stack

## 3.2 Why This Order Is Correct

- the public site is the credibility layer
- the waitlist is the correct first auth use case
- the backend should be built once the operating model is approved
- startup credits are most useful when aligned to real decisions, not guesses

## 4. Phase 1 Detailed Implementation Order

1. fix broken links and routing
2. create missing public pages
3. add waitlist and demo flows
4. refine hero and CTA structure
5. tighten public claims and pricing language
6. formalize design primitives and tokens
7. improve accessibility and SEO
8. final polish and QA

## 5. Phase 2 Detailed Implementation Order

1. create waitlist data model
2. implement waitlist submission API
3. implement email verification
4. implement admin review and invite flow
5. implement sign in and session management
6. implement password reset
7. implement profile management
8. implement protected route layer

## 6. Risks To Avoid

- redesigning the site instead of refining it
- overpromising capabilities publicly before the product exists
- building open signup before access controls are ready
- delaying architecture decisions until after auth work starts
- applying too early for programs with limited windows

## 7. Approval Needed

Before implementation begins, the following decisions should be approved:

- public-site claim posture
- waitlist-first auth model
- backend framework direction
- cloud/application priority order

## 8. Final Recommendation

The correct next step is not immediate feature coding across all four phases at once.

The correct next step is:

**approve the public audit, auth strategy, backend recommendation, and startup-program plan, then execute Phase 1 first with discipline.**
