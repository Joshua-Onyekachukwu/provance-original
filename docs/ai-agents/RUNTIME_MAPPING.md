# Runtime Agent Mapping

**Last updated:** 2026-08-04
**Status:** Approved (Founder ratification of the multi-agent operating model, ADR 003)
**Canonical source of truth:** `docs/ai-agents/agent-registry.json` (agents) + this file (runtime)

## Purpose

The organizational agents defined in `docs/ai-agents/` are operating definitions, not
automatically callable runtime agents. In the current chat environment, only the
platform's built-in agent types can be invoked directly. This file maps every
organizational role to the runtime agent type that operationalizes it, or to
"manual orchestration" where no dedicated runtime agent exists.

The rule: **routing always starts from the organizational role** (as defined in
`agent-routing.json`) and lands on the runtime mapping below. When a role has no
runtime agent, the orchestrator (CTO / VP Engineering) executes it manually using
the task-packet + prompt-template discipline.

## Runtime Agent Inventory (this environment)

| Runtime agent type | Purpose | Best for |
|---|---|---|
| `file-picker` | Fuzzy file discovery | Finding relevant files/components for a task |
| `code-searcher` | ripgrep content search | Locating every reference to a symbol, pattern, or convention |
| `basher` | Shell command execution | Lint, build, tests, git inspection, dev-server checks |
| `researcher-web` | Web research | Market/competitor/paper research, external facts |
| `researcher-docs` | Technical documentation research | Library/framework API questions (React, Vite, Tailwind, Supabase) |
| `code-reviewer-deepseek-flash` | Independent code review | Post-implementation review of any non-trivial change |
| `context-pruner` | Conversation summarization | Keeping long sessions within context limits |
| preview tools (`preview_*`) | Live browser testing | Manual validation of rendered UI, interactions, screenshots |
| orchestrator (main agent) | Coordination + integration | Triage, task packets, routing, review synthesis, docs |

## Role → Runtime Mapping

### Executive & Leadership

| Organizational role | Runtime mapping | Notes |
|---|---|---|
| Chief of Staff | orchestrator | Converts directives to task packets; owns routing |
| CTO | orchestrator | Architecture decisions, standards, risk; approves major technical changes |
| VP Engineering | orchestrator | Execution planning, breaking work into slices, release sequencing |
| CEO Advisor | orchestrator + `researcher-web` | Strategy synthesis with external research support |

### Engineering

| Organizational role | Runtime mapping | Notes |
|---|---|---|
| Frontend Engineering Lead | orchestrator + `file-picker` + `code-searcher` + preview tools | Implementation, UI validation in the live preview |
| Backend Engineering Lead | orchestrator + `basher` | NestJS work; validate with backend build/test gates |
| AI & Forensics Engineering Lead | orchestrator + `researcher-web` + `researcher-docs` | Signal logic, benchmark grounding |
| AI Researcher | `researcher-web` + `researcher-docs` + orchestrator | Research briefs; advisory only for production logic |
| MLOps & Evaluation Engineer | orchestrator + `basher` | Eval harnesses, regression checks |
| DevOps & SRE | orchestrator + `basher` | Deploy runbooks, health checks, log inspection |
| Cloud Infrastructure Engineer | orchestrator + `researcher-web` | Sizing/cost analysis |
| Database Engineering | orchestrator + `basher` | Migrations, schema; validate SQL |
| Security Engineering | orchestrator + `code-reviewer-deepseek-flash` | Threat modeling, auth/storage review |
| Performance Optimization Engineer | orchestrator + preview tools + `basher` | Profiling, bundle analysis |
| QA & Test Engineering Lead | `basher` + preview tools | Test gates, acceptance validation, screenshots |
| Bug Investigation Agent | `code-searcher` + preview tools + `basher` | Reproduction, root-cause, logs |
| Code Review Agent | `code-reviewer-deepseek-flash` | Independent review of every non-trivial PR/change |
| Technical Documentation Engineer | orchestrator | Doc updates, changelog, source-of-truth hygiene |

### Product, Design, Operations, Business

| Organizational role | Runtime mapping | Notes |
|---|---|---|
| Product Manager / Head of Product | orchestrator | Requirements refinement, scope decisions |
| UI/UX + Design System Engineer | orchestrator + preview tools | Design spec adherence, visual validation |
| Project Management / Risk Agent | orchestrator | Sequencing, task packets, risk register |
| Operations / Knowledge Management | orchestrator | Doc organization, deduplication |
| Marketing / Sales / Finance / Legal agents | orchestrator + `researcher-web` | Manual execution with external research support |

## How Routing Works In Practice

1. **Founder directive arrives.** Orchestrator (CTO) checks `agent-routing.json` for
   the routing rule (default: Chief of Staff intake).
2. **Task packet written** (`TASK_PACKET_TEMPLATE.md`): objective, current state,
   source-of-truth files, constraints, acceptance criteria, owner, collaborators.
3. **Specialists spawned in parallel** using the mapping above (context gatherers
   first, then implementers, then reviewers).
4. **Review gate:** `code-reviewer-deepseek-flash` on any non-trivial change; lint +
   build via `basher`; live UI validation via preview tools.
5. **Orchestrator integrates**, updates source-of-truth docs, records decisions in
   `docs/decisions/`, updates `docs/changelogs/CHANGELOG.md`.
6. **Founder review and approval** before anything is committed or merged.

## Escalation Triggers (unchanged from HOW_TO_RUN_THE_ORG.md)

- auth transport changes, data retention changes, pricing changes
- investor-facing financial claims, public claims about detection certainty
- irreversible infrastructure migrations

## Future Automation Paths

- **Platform custom agents:** if the chat platform gains custom agent registration,
  these role definitions can be compiled into platform-native agent configs.
- **In-repo router:** `agent-routing.json` can be consumed by a small internal tool
  that recommends an owner + runtime mapping for any incoming request.
