# Provance

Provance is a trust infrastructure platform for synthetic media verification.

The current repository contains the public product site, the authenticated MVP workspace, the NestJS backend, the Supabase-backed auth and storage path, and the worker-backed queue foundation for asynchronous scan processing.

## Repository Status

This repository is active and shipping toward a production-ready MVP.

Current state:

- public marketing and product pages are live and production-oriented
- waitlist submission and sign-in flows are wired to the deployed backend
- authenticated routes under `/app/*` are live
- users can upload supported image files into a real scan workflow
- scan jobs move through a queue-backed lifecycle
- report history and report detail are now available inside the authenticated workspace
- account preferences exist, but still persist locally rather than through a backend profile model

## Current MVP Scope

Provance currently supports:

- waitlist-first onboarding and invite-based access
- email and password sign-in through the backend
- invite acceptance and password reset UX
- protected application routes
- image-first uploads with file validation and signed Supabase storage upload
- queue-backed scan submission with status polling
- report history, report detail, printable report output, analyzed media preview, and MVP signal review
- internal waitlist review and secure invite issuance tooling
- redesigned authenticated dashboard and sidebar with broader verification-workspace positioning

Not complete yet:

- deeper evidence and signal output beyond the current MVP image-first heuristics
- full PDF export and share workflows beyond the printable report view
- real video preview and audio-summary support inside reports
- team and organization workflows
- shared report triage and organization-aware dashboards

## Architecture

### Frontend

- React
- Vite
- Tailwind CSS
- Framer Motion
- React Router

`src/` contains the public site, authenticated app routes, shared components, and frontend API helpers.

### Backend

- NestJS
- versioned API under `/v1`
- Supabase-backed auth, persistence, and signed upload support
- BullMQ-compatible queue wiring backed by Upstash Redis

`backend/` contains the long-term backend, worker runtime, and Fly deployment config.

### Worker

- separate Fly worker deployment
- consumes queued scan jobs
- updates scan records asynchronously

### Legacy API

- `api/` contains older backend experiments
- new backend work should target `backend/`

## Important Routes

Public routes include:

- `/`
- `/product`
- `/methodology`
- `/pricing`
- `/docs`
- `/sample-report`
- `/security`
- `/contact`
- `/signin`
- `/waitlist`
- `/accept-invite`
- `/reset-password`
- `/reset-password/confirm`
- legal pages for privacy, terms, and cookies

Authenticated routes include:

- `/app`
- `/app/uploads`
- `/app/reports`
- `/app/reports/:scanId`
- `/app/reports/:scanId/print`
- `/app/account`
- `/app/team`
- `/app/admin`

Backend endpoints currently include:

- `GET /v1/health`
- `POST /v1/waitlist/applications`
- `POST /v1/auth/sign-in`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/refresh`
- `POST /v1/auth/invites/accept`
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
- queue: Upstash Redis

## Local Development

### Frontend

```bash
npm install
npm run dev
```

Build the frontend:

```bash
npm run build
```

### Backend

Install backend dependencies:

```bash
npm run backend:install
```

Run the backend in development:

```bash
npm run backend:dev
```

Build the backend:

```bash
npm run backend:build
```

Run backend e2e tests:

```bash
npm run backend:test:e2e
```

Run the release check bundle:

```bash
npm run check:launch
```

Start the backend production build locally:

```bash
npm run backend:start
```

## Environment

Environment templates:

- frontend template: `.env.example`
- backend template: `backend/.env.example`

Single source of truth for deployment variables:

- `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`

## Documentation

Current engineering source-of-truth docs:

- implementation status: `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- phase map: `docs/engineering/PHASE_TASK_LIST.md`
- env and credentials checklist: `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
- admin operations guide: `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md`
- engineer handoff: `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md`
- Fly and Upstash deployment playbook: `docs/engineering/DEPLOYMENT_FLYIO_AND_UPSTASH.md`
- security and launch checklist: `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md`
- changelog: `docs/changelogs/CHANGELOG.md`

Important note:

- some older product, audit, and strategy docs are intentionally preserved as planning or historical records
- if a historical document conflicts with the current codebase, prefer the engineering docs above

## Working Rules

This repo follows a phase-based workflow:

- build one meaningful phase slice at a time
- validate changes before shipping
- update documentation after major engineering changes
- push tested work directly to `main`
- keep the repository collaboration-ready for additional engineers

## Immediate Priorities

The next major work areas are:

- validate the full live end-to-end upload, queue, and report workflow through the deployed frontend
- expand the media pipeline beyond images so reports can support real video and audio preview workflows
- move account profile persistence into Supabase-backed storage
- hold Phase 7 until the next roadmap decision and continue refining the verification workspace where needed

## License

This repository is private and under active product development. Licensing and external usage terms should be defined before any public redistribution or external reuse.
