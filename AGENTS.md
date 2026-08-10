# Agent Instructions — Provance

Operational rules for any agent (Codebuff or otherwise) working in this repo.
These are hard requirements, not suggestions.

## 1. Every task ends with the docs updated — never skip

Two files must be touched at the end of **every** completed task, no matter
how small:

- **`docs/project-state/followup-recommendations.md`** — the running log of
  "what's next" recommendations made at the end of each task. Append a row
  for every recommendation/suggestion this task produced (follow-ups,
  open items, blockers, next steps). Update a row's status when the task
  picks it up, finishes it, or declines it.
- **`docs/changelogs/CHANGELOG.md`** — a dated entry at the top of the file
  summarizing what the task changed, with test/build results.

The follow-up log is the single source of truth the Founder uses to direct
the next round of work. Missing rows = lost work. When in doubt, append.

**The two rules that make this airtight:**

1. **The `suggest_prompts` cards rendered at the end of the turn are the
   log rows.** Every suggestion you show the user at the end of a task MUST
   be appended to the log as a row in the same turn — same idea, one row
   per suggestion. If you end a turn without rendering suggestions, log the
   next steps / blockers you identified anyway.
2. **Turn-start self-check.** At the start of each new task, before writing
   any code, verify the log contains the rows for the *previous* task's
   suggestions. If they're missing, append them first and say so. This
   converts "I'll remember" into a mechanical check.

When a later task completes a logged recommendation, flip that row to
`Done` (keep the row, mark it) in the same turn that completes it.

## 2. Commit and push actively — after every task

- Commit + push at the end of each task once the gates pass (backend jest,
  frontend vitest, `npm run build`, lint).
- Push to the working branch — currently **`dev/backend-integration-milestone`**.
- **Do not merge to `main` on your own.** The Founder wants to test the
  branch first; main only moves after they approve it (it auto-deploys to
  Vercel).
- Stage only the files your task touched. Never `git add -A` blindly, and
  never commit or overwrite changes you didn't make.

## 3. Verification before declaring done

- Run the project's gates for the area you touched (backend: `cd backend &&
  npx jest`; frontend: `npx vitest run` + `npm run build`; lint via
  `npm run lint`).
- Backend work follows `docs/engineering/API_DESIGN_STANDARDS.md` and the
  existing NestJS module conventions; frontend work follows the ui-primitives
  kit and `scanPresentation.js` formatter consolidation (guarded by the
  import-parity test — keep it in sync when the module surface changes).

## 4. Docs that matter

- `docs/project-state/followup-recommendations.md` — emergent follow-ups (this file's log)
- `docs/project-state/PHASE_TASK_LIST.md` — phase checklist
- `docs/project-state/current-feature-status.md` — shipped vs in-progress features
- `docs/engineering/` — contracts, runbooks, standards
