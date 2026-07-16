# Decision Log

Last updated: 2026-07-16

## Purpose

This is the living decision log for major current-state project decisions that affect direction, sequencing, or standards.

## 2026-07-16

### Documentation Is A First-Class Deliverable

Decision:

Substantial analysis, audits, architecture reviews, roadmaps, and recommendations must be written into repository Markdown documents rather than living only in chat.

Impact:

- repository becomes the long-term project memory
- every major discussion should produce or update documentation

### Current Priority Is Premium Frontend Refinement

Decision:

The immediate focus is landing-page redesign and refinement, not backend optimization or session hardening implementation.

Impact:

- design and brand polish move to the front of the queue
- security and infrastructure hardening are documented now and implemented later

### Preserve Stability Over Premature Cleanup

Decision:

Do not remove backend code, services, or infrastructure that might still be needed without first documenting why it appears removable and verifying that it is safe to remove.

Impact:

- legacy cleanup becomes a documented validation exercise
- stability is prioritized over tidiness

### RLS Should Be Treated As Planned Security Foundation

Decision:

RLS should be properly configured later for waitlist and admin-related tables as part of the security hardening phase, even if those tables are mostly server-side today.

Impact:

- security work is planned deliberately instead of being improvised later

### Competitive Advantage And Technical Vision Is Now Explicitly Documented

Decision:

Provance should continuously evaluate architecture and product direction against trust, speed, accuracy, scalability, and defensibility rather than treating those questions as one-time strategy exercises.

Impact:

- major decisions gain a consistent evaluation framework
- research and pipeline evolution become more deliberate
- roadmap and architecture can be tied to moat development over time

Reference:

- `docs/architecture/competitive-advantage-and-technical-vision.md`

### Trust-Building Market Assets Should Be Added When Real Evidence Exists

Decision:

The public site should later incorporate case studies, pilot language, benchmark summaries, customer logos, and methodology visuals, but only when those assets are backed by real product maturity, customer work, or approved evidence.

Impact:

- future trust surfaces are documented now so they are not forgotten
- the marketing site stays disciplined instead of filling space with weak placeholders
- later phases gain a clearer bridge between brand, product proof, and enterprise conversion

## Maintenance Rule

When a major decision is made:

1. add it here
2. update `docs/decisions/` when a formal decision record is warranted
3. update affected roadmap or architecture documents
