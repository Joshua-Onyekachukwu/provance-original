# Decision Log

Last updated: 2026-07-23

## Purpose

This is the living decision log for major current-state decisions that affect direction, sequencing, standards, or infrastructure.

## 2026-07-23

### Documentation Set Is The Pre-Implementation Gate

Decision:

No new feature implementation should begin until the updated planning, roadmap, stack, setup, and architecture documents are reviewed and approved.

Impact:

- documentation approval becomes the immediate gate before coding resumes
- roadmap and setup clarity are treated as launch-critical engineering work

### Landing Page Work Is No Longer The Active Priority

Decision:

The landing page is considered complete enough for the current phase. The active priority is now the application workspace and core system.

Impact:

- roadmap and project-state docs now focus on dashboard, admin, reports, account, and system reliability

### Paid Tools Must Be Justified During MVP

Decision:

During MVP, paid services should only be adopted when they solve a real blocker or materially reduce delivery risk.

Impact:

- free tiers and startup-credit paths are preferred where technically sound
- paid recommendations must include cost, benefit, delay options, and alternatives

### Supabase Remains The MVP Platform

Decision:

Supabase remains the current MVP platform for auth, database, and initial storage.

Impact:

- no immediate Neon migration
- database and auth work should prioritize shipping the product instead of replatforming

### Queue Pattern Stays, Free-Tier Hosted Redis Does Not

Decision:

The async queue architecture stays, but the free-tier hosted Redis path is not suitable for always-on worker usage.

Impact:

- local development should prefer inline processing or local Redis / Valkey
- shared hosted queue usage should only be paid for when real async validation requires it

### Cloudflare Is The Planned Edge Layer

Decision:

Cloudflare should be the planned DNS, CDN, WAF, and edge security layer for the MVP and early growth stack.

Impact:

- backend and frontend hosting choices remain unchanged for now
- Cloudflare is added around the application rather than replacing the core app runtime

### Full Trezo Template Adoption Is Not Approved

Decision:

Do not commit to a full Trezo admin template adoption without the actual template files and a file-level review.

Impact:

- the current recommendation is to keep the admin UI in-house
- only selective reuse should be considered later if the real files are supplied and pass review

## 2026-07-16

### Documentation Is A First-Class Deliverable

Decision:

Substantial analysis, audits, architecture reviews, roadmaps, and recommendations must be written into repository Markdown documents rather than living only in chat.

### Preserve Stability Over Premature Cleanup

Decision:

Do not remove backend code, services, or infrastructure that might still be needed without first documenting why it appears removable and verifying that it is safe to remove.

### Master Roadmap Is The Canonical Phase Source

Decision:

`docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` is the canonical source for phase numbering, naming, and development order.
