# How To Run The Org

This document is the operational entry point for the Provance AI organization.

It explains how work should enter the system, how agents should be selected, how they should collaborate, how decisions should be escalated, and how to keep the organization efficient.

## Mission

Provance is building a trust infrastructure platform for synthetic media verification.

The long-term goal is to become the industry standard for verifying AI-generated and manipulated images, video, audio, and other digital content through:

- verification workflows
- authenticity assessment
- forensic analysis
- explainable reports
- confidence scoring
- downloadable professional reports
- enterprise-grade APIs
- scalable SaaS infrastructure

Every agent must optimize for that mission.

## Organizational Model

Provance runs as a lean hub-and-spoke system.

- The Founder sets direction.
- The Chief of Staff converts directives into operational work.
- Department leads own their functional domains.
- Specialist agents execute tightly scoped tasks.
- Documentation acts as institutional memory.

## Core Principles

### 1. One Owner Per Task

Every task packet must have one primary owner.

Supporting agents may contribute research, implementation, review, or QA, but they are not co-owners unless explicitly stated.

### 2. Use The Smallest Effective Context

Agents should receive only the context they need.

Do not send the entire repository history or all business context to every agent.

Instead, send:

- a short objective
- the current state
- the specific files or documents to use
- the acceptance criteria
- the risks or constraints

### 3. Reuse Existing Documentation

Before creating new analysis, check whether it already exists in:

- `README.md`
- `docs/engineering/*`
- `docs/product/*`
- `docs/brand/*`
- `docs/business/*`
- `docs/fundraising/*`
- this `docs/ai-agents/` directory

### 4. Prefer Specialized Delegation

Do not use a generalist for work that clearly belongs to a specialist.

Examples:

- use Security Engineering for auth hardening
- use Financial Narrative for fundraising storytelling
- use Legal and Compliance for policy and claims review
- use AI Research for confidence-model and signature work

### 5. Escalate High-Impact Decisions

The following decisions always require escalation:

- auth transport changes
- data retention changes
- pricing model changes
- legal claims or policy wording with risk
- investor-facing financial claims
- architectural changes that affect the whole platform

## Standard Workflow

### Step 1. Intake

The Founder or lead submits a directive, question, issue, or opportunity.

### Step 2. Chief Of Staff Triage

The Chief of Staff:

- clarifies the objective
- checks existing documentation
- identifies the correct owner
- creates a task packet
- assigns collaborators only if necessary

### Step 3. Specialist Execution

The owner agent completes the work within scope.

If more expertise is needed, the owner requests narrowly scoped support from specialists.

### Step 4. Review

Review depends on work type:

- code changes: Code Review + QA + Documentation
- product scope: Product Strategy + Requirements
- security-sensitive work: Security + Legal or Privacy if needed
- investor materials: CFO + Financial Narrative + Legal claims review

### Step 5. Decision And Handoff

Once reviewed:

- the output is approved
- docs are updated
- blockers are escalated
- the next owner is assigned

### Step 6. Recordkeeping

If the work changes reality, update the relevant docs.

For engineering changes, the default update set is:

- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- `docs/engineering/PHASE_TASK_LIST.md`
- `docs/changelogs/CHANGELOG.md`

## Task Packet Standard

Every non-trivial task should be written as a compact task packet.

## Task Packet v1

### Objective

One sentence describing the outcome.

### Why This Matters

One short paragraph linking the task to product or company goals.

### Current State

Three to seven bullets summarizing what is already true.

### Source Of Truth

List the exact files or documents to use.

### Constraints

List only the relevant constraints.

Examples:

- no em dashes in site copy
- use backend-mediated auth
- do not change legacy `api/`
- keep docs in sync

### Acceptance Criteria

Three to seven bullets that define done.

### Non-Goals

List what is intentionally out of scope.

### Risks

List material risks and what would trigger escalation.

### Owner

Exactly one owner.

### Collaborators

Only supporting agents required for delivery.

## Prompt Templates

### Universal Execution Template

Use this for most agent assignments:

```text
You are acting as the [Agent Name] for Provance.

Objective:
[one-sentence objective]

Why this matters:
[short business or product context]

Current state:
- ...
- ...

Source of truth:
- [file path]
- [file path]

Constraints:
- ...
- ...

Acceptance criteria:
- ...
- ...

Non-goals:
- ...

Deliverable format:
[memo / PR plan / policy draft / checklist / copy / analysis]

Escalate if:
- ...
```

### Review Template

```text
Review this output as the [Reviewing Agent].

Check for:
- correctness
- consistency with source-of-truth docs
- security or legal risk
- hidden scope creep
- missing documentation

Return:
1. critical issues
2. medium-risk issues
3. minor issues
4. approval recommendation
```

### Decision Memo Template

```text
Decision:

Options considered:
1.
2.
3.

Recommendation:

Why:

Risks:

Escalation required:

Docs to update:
```

## Day-To-Day Development Workflow

1. Founder or CoS defines the next priority.
2. Product and Requirements refine scope if needed.
3. Technical Architect or CTO translates requirements into implementation shape.
4. VP Engineering breaks work into executable slices.
5. Frontend, Backend, Database, Security, or AI owners execute.
6. QA validates behavior.
7. Code Review checks maintainability and risk.
8. Technical Documentation updates the source-of-truth docs.
9. Release Manager decides readiness.
10. DevOps deploys and verifies.

## Product Release Workflow

1. Product Manager defines release scope.
2. Release Manager creates release checklist.
3. Engineering owners complete work.
4. QA validates acceptance criteria and regression coverage.
5. Security reviews any sensitive changes.
6. Documentation Engineer updates release docs.
7. DevOps deploys API, worker, and frontend in the correct sequence.
8. Release Manager verifies health and closes the release.

## Fundraising Workflow

1. CEO Advisor, CFO Advisor, and Business Strategy align on the story.
2. Financial Modeling updates metrics and scenarios.
3. Financial Narrative turns the model into an investor-ready message.
4. Pitch Deck Creator drafts slide copy.
5. Pitch Deck Editor refines clarity and sequence.
6. Investor Research builds a target list.
7. Investor CRM tracks pipeline and follow-up.
8. Data Room Manager ensures all supporting materials match the current company state.
9. Legal and Policy reviews risky claims before external use.

## Compliance And Legal Workflow

1. Product or Engineering flags a policy or risk question.
2. Legal Research frames the issue.
3. Privacy, GDPR, AI Governance, or Copyright agents review based on topic.
4. Legal and Policy Lead consolidates the conclusion.
5. Terms and Policy Writer updates user-facing documents if needed.
6. CoS logs the decision and routes implementation follow-up.

## Efficiency Rules

### Token Efficiency

- route through the correct owner first
- avoid giving all docs to every agent
- provide exact file paths
- ask specialists for sub-artifacts, not full project restarts
- reuse existing analyses

### Duplication Prevention

- one owner per task
- one canonical document per process
- review against existing docs before drafting new ones

### Escalation Discipline

- escalate only when the decision has meaningful downside or irreversibility
- otherwise let the owning agent complete the work

## Runtime Agent Mapping In This Chat Environment

The organizational agents in this directory are documentation and operating definitions.

They are not automatically turned into clickable runtime agents by writing Markdown alone.

In this chat environment, only the built-in callable agent types exposed by the platform can be invoked directly.

That means:

- I can document the full organization here.
- I can follow that structure while working.
- I can map organizational roles to the callable agent types that already exist.
- I cannot create brand-new platform-level callable chat agents just by adding files to the repository.

## Practical Mapping

Use these runtime-capable agent types as the closest operational matches when available:

- Chief of Staff -> organization orchestrator
- CEO Advisor -> CEO strategy advisor
- CTO -> technical strategy lead
- VP Engineering -> engineering delivery lead
- AI Researcher -> AI forensics researcher
- focused codebase lookup -> explorer
- browser testing -> browser use

For all other roles, the organization can still function through:

- role-specific documents
- prompt templates
- task packets
- manual routing by the Chief of Staff or by me during execution

## How To Make This More Automatic Later

If you want a more automated runtime system beyond documentation, there are two paths:

### Path 1. Platform-Level Custom Agents

If your chat platform supports custom agent registration, these Markdown specs can be translated into platform-native agent configs.

### Path 2. In-Repo Agent Router

We can build a lightweight internal orchestration layer that stores:

- an agent registry
- role metadata
- routing rules
- task packet schemas
- escalation logic

That would not change the platform's built-in agent list by itself, but it would give us a working internal operating system that can decide which role should handle each task.

## Machine-Readable Org Files

These files are the machine-readable starting point for automation:

- `docs/ai-agents/agent-registry.json`
- `docs/ai-agents/agent-routing.json`
- `docs/ai-agents/TASK_PACKET_TEMPLATE.md`
- `docs/ai-agents/DECISION_LOG_TEMPLATE.md`

## Required Review Cadence

- weekly operating review
- biweekly roadmap review
- monthly security and compliance review
- monthly fundraising and finance review while raising
- per-release go/no-go review

## Success Condition

This organization is working correctly when:

- work is delegated to the right owner the first time
- duplicate effort stays low
- docs stay in sync with implementation
- major decisions are logged
- launches happen with less founder overhead
- the company can scale execution without losing quality
