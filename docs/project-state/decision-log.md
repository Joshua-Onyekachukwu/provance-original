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

### Master Roadmap Is The Canonical Phase Source

Decision:

`docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` is the canonical source for phase numbering, phase naming, and development order. Summary documents must mirror it rather than invent alternate phase sequences.

Impact:

- prevents roadmap drift between summary docs and the master plan
- keeps planning discussions anchored to one agreed source of truth
- confirms that the next phase after Phase 1 is Phase 2: App Visual Consistency And Premium UI Polish

### Phase 2 Is Expanded To Include Backend And Auth Foundation

Decision:

Phase 2 is no longer frontend-only. It now includes authenticated app polish, mobile and tablet responsiveness, server-backed account profile persistence, and incremental auth/backend foundation work that supports production readiness without collapsing later phases into one oversized change.

Impact:

- Phase 2 now covers both app UX quality and core account/auth foundation
- local-only profile state should be replaced by backend-backed account persistence
- full cookie-based session transport, full organization workflows, and deeper security hardening still remain later roadmap work unless explicitly reprioritized again

## Maintenance Rule

When a major decision is made:

1. add it here
2. update `docs/decisions/` when a formal decision record is warranted
3. update affected roadmap or architecture documents
