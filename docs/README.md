# Provance Documentation Suite

Last updated: 2026-07-07

## Start Here

Use these files as the current source of truth for the shipped product and active infrastructure:

1. `README.md`
2. `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
3. `docs/engineering/PHASE_TASK_LIST.md`
4. `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md`
5. `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
6. `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`
7. `backend/README.md`

## How To Read The Rest

The repo contains three kinds of documentation:

- `engineering/` for current implementation, deployment, environment setup, and phase tracking
- `project-state/` for living summaries of project status, risks, readiness, roadmaps, and priorities
- `product/` for product requirements, UX direction, and future-state planning
- `foundation/`, `architecture/`, `reports/`, `sales/`, and `fundraising/` for strategy, historical planning, and operating materials

Some older planning documents describe future-state product behavior that is not fully shipped yet. When there is a conflict, follow the current-state engineering docs listed above.

## Living Project-State Docs

For an always-updated view of where the project stands today, start here:

- `docs/project-state/README.md`

This directory should be updated alongside major engineering, product, design, and roadmap changes so that the repository remains the practical source of truth for current project status.

## Recommended Review Order

If you are onboarding into the codebase today, read in this order:

1. `README.md`
2. `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
3. `docs/engineering/PHASE_TASK_LIST.md`
4. `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md`
5. `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
6. `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md`
7. `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md`
8. `backend/README.md`
9. `docs/product/PRD_DASHBOARD.md`
10. `docs/product/REPORT_FLYWHEEL.md`
11. `docs/foundation/provance-operating-doctrine.md`

## Current Product Notes

As of this update:

- the live authenticated product uses `/signin` and `/app/*` routes
- the current workflow is image-first, not full image-and-video parity
- uploads are created through the API, stored in private Supabase storage, and submitted to a Redis-backed queue
- report history and report detail views exist, but PDF export, share links, citation tools, batch processing, and video workflows remain future work

## Deployment Playbook

- `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`
- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
- `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md`

## Development Workflow

- `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`
- `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`

## Technical Vision

- `docs/architecture/competitive-advantage-and-technical-vision.md`
