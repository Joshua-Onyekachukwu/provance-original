# Provance

Provance is a trust infrastructure platform for synthetic media verification.

The product direction is centered on explainable image and video verification, reviewable evidence, downloadable forensic reports, and enterprise-ready trust workflows. The current repo contains the public product site, the first waitlist and sign-in flows, and the scaffold for the long-term backend architecture.

## Repository Status

This repository is actively being built toward a production MVP.

Current state:

- public marketing and product site is live in development
- major public pages exist and have been through content and structure cleanup
- waitlist and sign-in frontend flows are wired to a real backend API shape
- a new NestJS backend scaffold exists in `backend/`
- Supabase-ready persistence and auth integration paths are prepared
- the full authenticated application is not built yet

## Product Direction

Provance is being built to support:

- explainable media verification
- forensic-style report generation
- waitlist-first onboarding and invite-based access
- future authenticated workflows for uploads, review, reporting, and collaboration
- future API access for programmatic integrations

## Architecture

### Frontend

- React
- Vite
- Tailwind CSS
- Framer Motion
- React Router

Location:

- `src/` contains the public site, shared components, page routes, and frontend API helpers

### Backend

- NestJS
- versioned API under `/v1`
- Supabase-ready service layer

Location:

- `backend/` contains the long-term backend scaffold

### Legacy API

- `api/` contains older backend experiments and should not be treated as the long-term backend direction
- new backend work should target `backend/`

## Key Routes And Features

Current public-facing routes include:

- home
- product
- methodology
- pricing
- docs
- sample report
- security
- contact
- sign in
- join waitlist
- legal pages including privacy, terms, and cookies

Current backend scaffold includes:

- `GET /v1/health`
- `POST /v1/waitlist/applications`
- `POST /v1/auth/sign-in`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/invites/accept`

## Local Development

### Frontend

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
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

Run the backend e2e tests:

```bash
npm run backend:test:e2e
```

Run the release check bundle:

```bash
npm run check:launch
```

Start the backend production build:

```bash
npm run backend:start
```

Important note:

- backend dependency installation is currently safest through `npm run backend:install`
- that script uses `npx pnpm@9 install --dir backend`
- this is documented because `npm install` in `backend/` hit a resolver issue in the current environment

## Environment

Environment templates:

- root frontend template: `.env.example`
- backend template: `backend/.env.example`

Expected next setup steps:

- connect real Supabase project values
- apply the starter SQL migration in `backend/supabase/migrations/0001_waitlist_auth.sql`
- replace scaffold auth logic with real Supabase Auth integration

## Documentation

Core documentation for the current engineering state:

- implementation status: `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
- phase task list: `docs/engineering/PHASE_TASK_LIST.md`
- security and launch checklist: `docs/engineering/SECURITY_AND_LAUNCH_CHECKLIST.md`
- changelog: `docs/changelogs/CHANGELOG.md`
- auth and waitlist direction: `docs/architecture/2026-07-06-auth-waitlist-strategy.md`
- backend stack evaluation: `docs/architecture/2026-07-06-backend-stack-evaluation.md`

## Working Rules

This repo is being managed with a phase-based workflow:

- work locally on one major phase at a time
- validate the phase before shipping
- update documentation after major engineering changes
- push tested work directly to `main`
- treat the repo as collaboration-ready so additional engineers can join without losing context

## Immediate Priorities

The next major work areas are:

- complete real Supabase auth and waitlist persistence
- add protected frontend routing and session handling
- build the first authenticated app shell
- start the dashboard, upload, and report workflows
- continue refining public-site polish where needed

## License

This repository is currently private and under active product development. Licensing and external usage terms should be defined before any public redistribution or external reuse.
