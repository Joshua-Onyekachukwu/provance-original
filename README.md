# Provance

Provance is a trust infrastructure platform for synthetic media verification.

This repository contains the public product site, the authenticated application, the NestJS API, the worker-backed scan pipeline, and the documentation set that governs how the product is built.

## Current Status

Provance is not starting from scratch.

The current codebase already includes:

- a completed public marketing site
- waitlist and invite-based onboarding
- sign-in and password recovery flows
- an authenticated application shell under `/app/*`
- image-first upload and scan workflows
- report history, report detail, and print-ready report output
- an internal admin workspace for waitlist and invite operations
- a NestJS backend in `backend/`
- Supabase-backed auth, database, and storage
- a worker-backed async processing path

## Current Development Focus

The current product priority is:

1. finish the working MVP application
2. strengthen the dashboard, admin, reports, account, and core system flows
3. tighten documentation, architecture, and development standards
4. defer non-essential integrations until they are needed

For the current MVP planning phase:

- the landing page is considered complete
- OpenAI and Anthropic integrations are not current implementation priorities
- billing and store integrations are deferred
- new feature implementation should not begin until the updated planning documents are approved

## Architecture Snapshot

### Frontend

- React 19
- Vite
- Tailwind CSS v4
- React Router
- Framer Motion

### Backend

- NestJS modular monolith in `backend/`
- versioned API under `/v1`
- DTO validation, throttling, helmet, request IDs, and global exception filtering

### Data And Infrastructure

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- BullMQ-compatible queue flow
- Fly.io API deployment
- Fly.io worker deployment
- Vercel frontend deployment

## Important Routes

### Public

- `/`
- `/about`
- `/contact`
- `/product`
- `/methodology`
- `/pricing`
- `/security`
- `/sample-report`
- `/sample-report/print`
- `/docs`
- `/resources`
- `/privacy`
- `/terms`
- `/cookies`
- `/waitlist`
- `/signin`
- `/accept-invite`
- `/reset-password`
- `/reset-password/confirm`

### Authenticated

- `/app`
- `/app/uploads`
- `/app/reports`
- `/app/reports/:scanId`
- `/app/reports/:scanId/print`
- `/app/account`
- `/app/access-denied`
- `/app/admin`
- `/app/team`

## Important Backend Endpoints

- `GET /v1/health`
- `POST /v1/waitlist/applications`
- `GET /v1/auth/me`
- `POST /v1/auth/sign-in`
- `POST /v1/auth/refresh`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/invites/accept`
- `GET /v1/account/profile`
- `PATCH /v1/account/profile`
- `POST /v1/scans`
- `POST /v1/scans/:scanId/submit`
- `GET /v1/scans`
- `GET /v1/scans/:scanId`
- `GET /v1/admin/dashboard`
- `PATCH /v1/admin/waitlist/:applicationId`
- `POST /v1/admin/waitlist/:applicationId/invite`

## Deployment Snapshot

Current deployed services:

- frontend: `https://provanc3.vercel.app`
- API: `https://provance-api.fly.dev/v1`
- worker: Fly app `provance-worker`
- auth, database, and storage: Supabase
- queue transport: Redis-compatible provider

## Source Of Truth Docs

Start here:

1. `README.md`
2. `docs/README.md`
3. `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`
4. `docs/engineering/PHASE_TASK_LIST.md`
5. `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md`
6. `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
7. `docs/engineering/PRE_DEVELOPMENT_SETUP_CHECKLIST.md`
8. `docs/engineering/INFRASTRUCTURE_AND_SERVICE_CONFIGURATION_GUIDE.md`

If an older document conflicts with the files above, update the stale document and follow the current-state planning set listed here.

## Local Development

### Frontend

```bash
npm install
npm run dev
```

### Frontend Build

```bash
npm run build
```

### Backend

```bash
npm run backend:install
npm run backend:dev
npm run backend:build
npm run backend:test:e2e
```

### Full Launch Check

```bash
npm run check:launch
```

## Environment Templates

- frontend template: `.env.example`
- backend template: `backend/.env.example`
- canonical environment reference: `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`

## Working Rules

- documentation is a first-class deliverable
- work is phase-based
- use a dedicated branch for each phase or task
- run relevant build and test gates before review
- update docs before considering work complete
- open a pull request and wait for Founder approval before merge
- do not merge directly into `main` without review approval

## Immediate Next Step

The immediate next step is documentation approval.

No new feature implementation should begin until the updated roadmap, stack reference, setup guide, architecture docs, and feature checklist are reviewed and approved.

## License

This repository is private and under active product development. Licensing and external usage terms should be defined before any public redistribution or external reuse.
