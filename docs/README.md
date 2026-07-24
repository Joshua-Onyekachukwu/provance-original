# Provance Documentation Suite

Last updated: 2026-07-23

## Start Here

Use these files as the current planning and implementation source of truth:

1. `README.md`
2. `docs/engineering/DOCUMENTATION_STATUS_AND_HANDOVER_2026-07-24.md`
3. `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`
4. `docs/engineering/PHASE_TASK_LIST.md`
5. `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md`
6. `docs/project-state/overall-project-architecture.md`
7. `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
8. `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md`
9. `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md`
10. `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
11. `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`

## Documentation Rules

- documentation is a first-class deliverable
- code and docs must stay synchronized
- update the relevant docs before marking a phase complete
- do not create duplicate planning documents when an existing canonical file can be updated
- if an older file is historical, label it clearly rather than letting it conflict silently

## Canonical Document Roles

### Roadmap And Execution

- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`: canonical phase roadmap
- `docs/engineering/PHASE_TASK_LIST.md`: actionable feature and phase checklist
- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`: workflow, review, and release rules

### Architecture And Stack

- `docs/project-state/overall-project-architecture.md`: current working architecture
- `docs/architecture/system-design-document.md`: target system design from MVP to enterprise
- `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md`: official technology stack reference

### Current State

- `docs/engineering/DOCUMENTATION_STATUS_AND_HANDOVER_2026-07-24.md`: temporary handover and documentation status report
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`: current implementation truth
- `docs/project-state/current-feature-status.md`: concise feature status grid
- `docs/project-state/development-priorities.md`: active development focus
- `docs/project-state/what-is-in-development.md`: active and near-term work
- `docs/project-state/outstanding-questions.md`: unresolved questions, blockers, and risks

### Setup And Infrastructure

- `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md`: pre-coding checklist
- `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md`: service configuration guide
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`: environment variable inventory
- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`: current deployment notes and queue guidance

## Historical And Future-State Material

The repository also contains product, business, foundation, fundraising, and historical architecture material.

Those documents are useful for context, but when they conflict with the current planning set above:

1. trust the canonical current-state docs
2. update the stale file if it is still meant to be active
3. mark the stale file as historical if it is no longer meant to drive implementation

## Recommended Review Order

1. `README.md`
2. `docs/engineering/DOCUMENTATION_STATUS_AND_HANDOVER_2026-07-24.md`
3. `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`
4. `docs/engineering/PHASE_TASK_LIST.md`
5. `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md`
6. `docs/project-state/overall-project-architecture.md`
7. `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
8. `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md`
9. `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md`
10. `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
11. `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`

## Current Product Notes

As of this planning update:

- the landing page is complete enough for the current phase
- the active focus is documentation preservation, handover readiness, and maintaining the current implementation truth while dashboard and admin design direction is reset
- the current verification workflow is image-first
- OpenAI, Anthropic, and billing integrations are not part of the immediate implementation scope
- no new dashboard or admin implementation work should resume until the next approved design direction is documented
