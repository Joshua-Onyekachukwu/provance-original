# Pull Request Review Guidelines

**Last updated:** 2026-08-04
**Status:** Approved (Founder directive: multi-agent operating model)
**Companion:** `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`

## Purpose

Define what "reviewed" means for Provance so the review gate is consistent whether
the reviewer is an AI agent (`code-reviewer-deepseek-flash`) or a human engineer.

## When Review Is Required

- **Always:** any code change beyond a trivial one-liner; anything touching auth,
  storage, admin, infra, or verification logic (mandatory per
  `DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`).
- **Docs-only changes:** a lighter review pass, but consistency with source-of-truth
  docs is still checked.
- **Never merged without:** reviewer approval + passing gates + Founder approval.

## Reviewer Checklist

Work through these in order. Report findings by severity, never as an open-ended essay.

### 1. Correctness
- Does the code do what the task packet's acceptance criteria say?
- Are async paths safe (cancellation, stale closures, race conditions)?
- Are state machines total (every phase has a defined UI/behavior)?

### 2. Consistency with source of truth
- Does the change follow `ENGINEERING_STANDARDS.md` and the UNIFIED design system?
- Does it reuse existing primitives (ui kit, `useResource`, `useDemoState`) instead of
  re-implementing? Duplication is a finding.
- Are new data shapes consistent with `mockData.js` / real API payloads?

### 3. Security & risk
- Any auth, session, upload, or admin surface touched? Flag transport, retention,
  or exposure implications.
- Any claim that could carry legal/credibility risk (verification certainty, pricing,
  investor-facing numbers)? Escalate to Founder per the org's one-way-door list.

### 4. Scope & integration
- Scope creep: does the diff contain unrelated changes? Flag them.
- Do the changes break other callers? (Check references to renamed symbols.)
- Does the new code wire into routing, navigation, and the shell correctly?

### 5. Documentation
- Is `docs/changelogs/CHANGELOG.md` updated?
- Do current-state docs (`CURRENT_IMPLEMENTATION_STATUS.md`, roadmap, specs) that the
  change affects need updates?
- Are dev-only affordances (e.g. `?state=`, `?demo=`) documented or clearly inert in
  production?

### 6. Tests & validation
- Were the declared gates run (lint, build, targeted tests)?
- Was the change verified live (preview) when UI behavior changed?
- Are loading/empty/error states exercised for any new data surface?

## Severity Levels

| Severity | Meaning | Action |
|---|---|---|
| **Critical** | Bug, security issue, or correctness break | Must fix before merge; blocks merge recommendation |
| **Medium** | Maintainability, consistency, or edge-case risk | Fix before merge unless Founder waives with a note |
| **Minor** | Polish, naming, dead code, perf nit | Optional; can be tracked and fixed later |
| **Nit** | Style preference | Leave or fix opportunistically |

## Verdicts

- **Approve**: no critical or medium findings, or all are resolved.
- **Changes requested**: medium findings that need a follow-up pass.
- **Block**: critical findings unresolved; merge is not recommended.

## Review Output Format

```text
Summary: [2-3 sentences on what changed and its risk profile]

Critical:
- ...

Medium:
- ...

Minor:
- ...

Verdict: Approve | Changes requested | Block
Follow-ups: [anything to track outside this change]
```

## Review-Driven Fix Loop

1. Reviewer returns findings by severity.
2. Owner fixes critical + medium items; minor items are triaged.
3. Re-run gates (lint/build) and re-verify any changed behavior live.
4. Re-review only the delta (the fix, not the whole diff again).
5. Present the final result to the Founder for approval.

## Escalation

Escalate immediately if a review surfaces: a security/data-exposure issue, an
irreversible migration, a legal/claims risk, or a conflict between docs and code that
no single owner can resolve. Escalation goes to the Founder via the orchestrator.
