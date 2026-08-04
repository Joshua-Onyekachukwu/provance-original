# Decision Record: Multi-Agent Development Operating Model

**Status:** Ratified
**Date:** 2026-08-04
**Author:** Founder (directive) / CTO (ratification)
**Reviewers:** Founder (approval)
**Related:** `docs/ai-agents/README.md`, `docs/ai-agents/HOW_TO_RUN_THE_ORG.md`,
`docs/ai-agents/RUNTIME_MAPPING.md`, `docs/ai-agents/TASK_PACKET_TEMPLATE.md`

## Context

The Founder proposed replacing ad-hoc single-agent development with a structured
multi-agent development system: the assistant operates as CTO / Principal Architect /
Engineering Manager, specialist agents own scoped work, and the Founder approves all
output before anything is committed. The repository already contained a documented AI
agent organization (`docs/ai-agents/`, 31 files) but it was not operationalized: no
document mapped org roles to the runtime agent types this environment actually exposes.

## Decision

Ratify the multi-agent operating model as the standing development workflow:

1. The Founder issues directives (objective + acceptance criteria).
2. The orchestrator (CTO) writes a task packet, routes to specialists per
   `RUNTIME_MAPPING.md`, and integrates output.
3. Every non-trivial change passes the review gate (`code-reviewer-deepseek-flash`,
   lint/build, live preview) per `PR_REVIEW_GUIDELINES.md`.
4. Documentation is updated (changelog, current-state docs, ADRs) as part of done.
5. Nothing is committed, pushed, or merged without Founder approval.

## Rationale

1. The org infrastructure already existed and was aligned with the Founder's proposal;
   building a parallel system would duplicate it.
2. Parallel specialist agents genuinely run concurrently in this environment, so the
   workflow is executable today, not aspirational.
3. The missing piece was the runtime mapping and the standards docs, which this
   decision activates.

## Alternatives Considered

1. Build a brand-new org from the Founder's role list. Rejected: it would duplicate
   `docs/ai-agents/` and create two sources of truth.
2. Keep single-agent development. Rejected: loses parallel execution, specialist
   review, and the documentation discipline the Founder wants.
3. Wait for platform-level custom agent registration. Rejected: the in-repo
   operating system delivers the workflow today without platform changes.

## Consequences

- Task packets are required for non-trivial work; specialists are spawned by role.
- Review and documentation gates are mandatory before approval requests.
- The Founder review loop becomes the release gate; nothing merges silently.

## Risks And Mitigations

- **Process theater** (docs ahead of code): mitigated by the Founder-approval gate and
  the changelog/current-state sync rules.
- **Context cost** of spawning agents: mitigated by "smallest effective context"
  (task packets carry file paths and acceptance criteria, not the whole repo).
- **Stale org docs**: `RUNTIME_MAPPING.md` and the registry are maintained by the
  Technical Documentation role as part of the changelog cycle.

## Documentation Updates Required

- `docs/ai-agents/HOW_TO_RUN_THE_ORG.md` (supersede note for the runtime mapping)
- `docs/ai-agents/RUNTIME_MAPPING.md` (status flipped to Approved on Founder approval)
- `docs/ai-agents/agent-registry.json` (runtime_mapping fields)
- `docs/decisions/001` numbering continues from this record
