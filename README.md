# Provance

**Evidence-first AI media verification.** Upload suspicious images and video, get
a defensible verdict backed by per-signal evidence — not a black-box score — with
professional reports built for high-trust review.

This repository is the full product: the public marketing site, the authenticated
workspace (`/app/*`), a 12-page internal admin console (`/app/admin/*`), the NestJS
API (`backend/`), a BullMQ-backed scan worker, the Supabase schema, and the docs
set that governs how the product is built.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Quality Gates & Testing](#quality-gates--testing)
- [Deployment](#deployment)
- [Important Routes](#important-routes)
- [Environment Variables](#environment-variables)
- [Documentation Index](#documentation-index)
- [Skills](#skills)
- [Working Rules](#working-rules)

## Features

**Public site**

- Landing with Hero, Why Provance, an interactive Sample Report, How It Works,
  Use Cases, a live Product Showcase demo, Pricing, and FAQ sections
- Waitlist sign-up, sign-in, password recovery, invite acceptance
- Sample report with a print-to-PDF flow, benchmark, docs, resources, and
  security center
- Custom 404 page; every unmatched route resolves to it (no Vercel 404s on
  deep links or refreshes)

**Workspace (`/app/*`)**

- Dashboard with KPI row, queue posture, scan-volume trend, team filter
  (URL-backed `?team=`), and live auto-refreshing polling
- Media uploads → signed-URL upload → queue round-trip (queued → analyzing →
  complete), status polling lands in the dashboard
- Reports list/detail, per-signal evidence, print view + client and server PDF
  export
- Queue, History, Activity (audit feed), Account, Security (active sessions,
  revoke), Notifications, Billing (plans, quotas, metering), API keys,
  Webhooks, Organization (teams, members, invites, roles), Help/Docs

**Admin (`/app/admin/*`)** — 12 pages

- Overview, Waitlist, Users, Organizations, Jobs (worker-level view with
  retry/fail), Reports, Analytics, Monitoring (health probes + incidents),
  Feature Flags, Roles & Permissions, Audit Logs, Settings

**Backend & infrastructure**

- NestJS modular monolith under `/v1` with DTO validation, throttling, Helmet,
  request IDs, global exception filtering, and Swagger at `/v1/docs`
- Supabase: Auth (GoTrue), Postgres, Storage
- BullMQ queue + worker for async scan processing (Redis)
- httpOnly cookie sessions with rotation + refresh-token reuse detection
- Entitlements: per-plan scan quotas with `402` + `Retry-After`
- Telemetry stub, audit trail, session ledger, notifications
- Optional Better Auth provider behind a `USE_BETTER_AUTH` flag

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, Framer Motion, Vercel Analytics |
| Charts | Hand-rolled SVG primitives (TrendChart, StackedBarChart, DonutChart, HourlyBarChart) in the ui kit |
| Backend | NestJS, `@supabase/supabase-js`, BullMQ, Zod/class-validator DTOs |
| Data | Supabase Postgres + Storage, Redis (Upstash) |
| Tests | Vitest (frontend, 518 tests), Jest + supertest e2e (backend), Playwright (responsive gate) |
| CI | GitHub Actions — lint, vitest, build, backend e2e, responsive audit, live cookie gate |
| Deploy | Vercel (frontend), Fly.io (API + worker), Supabase (auth/db/storage) |

## Repository Layout

```
├── src/                  # React SPA (public + workspace + admin)
│   ├── components/       # Landing, admin, app, and ui-primitives (Button, Badge,
│   │                     #   Card, DataTable, charts, Toast, …)
│   ├── context/          # AuthContext, ToastProvider, etc.
│   ├── lib/              # api.js (real + mock branches), mockData, formatters,
│   │                     #   telemetry, hooks (useResource, useQueryParam, …)
│   └── pages/            # Public, app, and admin page components
├── backend/              # NestJS API + BullMQ worker
│   ├── src/              #   modules (auth, scans, account, admin, organization,
│   │                     #   billing, notifications, security, telemetry, …)
│   ├── test/             #   jest unit + supertest e2e suites
│   └── scripts/          #   live-walk validation scripts (validate:*, parity:*)
├── supabase/migrations/  # Ordered SQL migrations 0001–0020
├── scripts/              # audit:responsive (Playwright layout gate), smoke, trello
├── api/                  # Legacy Hono server (superseded by backend/) — not deployed
└── docs/                 # Project state, changelogs, engineering standards, decisions,
                          #   skills (docs/skills/)
```

## Getting Started

```bash
# 1. Frontend dependencies
npm install

# 2. Backend dependencies
npm run backend:install

# 3. Environment templates
cp .env.example .env.local             # frontend (VITE_* vars)
cp backend/.env.example backend/.env.local   # backend (Supabase keys, Redis, …)
```

### Frontend (dev)

```bash
npm run dev            # vite dev server
```

`USE_MOCK` is env-driven: unset → mock in dev, real in production builds.
Force either mode with `VITE_USE_MOCK=true|false npm run dev`.

### Backend (dev)

```bash
npm run backend:dev            # NestJS watch mode (default :4000)
npm run backend:start:worker   # BullMQ worker for scan processing
```

### Full launch check (everything)

```bash
npm run check:launch
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production SPA build (`vite build`) |
| `npm run lint` | oxlint |
| `npm test` | Vitest (518 frontend tests) |
| `npm run check:test` | Lint + tests together |
| `npm run check:launch` | Lint + tests + SPA build + backend build + backend e2e |
| `npm run audit:responsive` | Playwright layout gate — 52 routes × 5 viewports, fails on overflow/clipped elements |
| `npm run backend:*` | Backend dev/build/start/e2e/seed helpers |

## Quality Gates & Testing

Every change is expected to pass:

- **Frontend**: `npm test` (Vitest — formatters, chart geometry, page logic, ui
  primitives), `npm run lint`, `npm run build`
- **Backend**: `cd backend && npx jest` (unit) + `npm run test:e2e` (supertest)
- **Responsive**: `npm run audit:responsive` — boots vite in mock mode and walks
  every route at 375/640/768/1024/1280 in headless Chromium, failing on
  page-level overflow or clipped in-flow elements
- **CI (GitHub Actions)**: frontend lint/test/build, backend unit + e2e,
  responsive audit, and a live cookie-contract gate (boots the real backend
  against Supabase and asserts the httpOnly Set-Cookie contract)

## Deployment

**Frontend — Vercel.** Pushes to `main` auto-deploy (Vercel runs `npm run
build` and serves `dist/`). `vercel.json` contains the SPA fallback rewrite
(`/(.*) → /index.html`), so deep links like `/app/activity` and hard refreshes
render the app — and the custom 404 page — instead of a platform 404. Vercel
Web Analytics is wired in via `@vercel/analytics` (no-op in dev; dashboards in
the Vercel project).

**Backend + worker — Fly.io** (or any Node host): build `backend/`, run
`dist/main.js` (API) and the worker separately, both pointed at the same
Supabase project + Redis.

**Database — Supabase.** Apply `supabase/migrations/` in numeric order
(dashboard SQL editor or `DATABASE_URL`). `GET /v1/health/readiness` reports
which migrations are still missing.

**Before you deploy real mode:** the SPA defaults to real API calls in
production builds. If the backend/schema isn't live yet, set
`VITE_USE_MOCK=true` as a Vercel environment variable to keep the demo on mock
data.

## Important Routes

**Public** — `/`, `/about`, `/contact`, `/product`, `/methodology`, `/pricing`,
`/security`, `/sample-report`, `/sample-report/print`, `/benchmark`, `/docs`,
`/resources`, `/privacy`, `/terms`, `/cookies`, `/waitlist`, `/signin`,
`/accept-invite`, `/reset-password`, `/reset-password/confirm`, `/ui-kit`

**Workspace** — `/app`, `/app/uploads`, `/app/reports`, `/app/reports/:scanId`,
`/app/reports/:scanId/print`, `/app/queue`, `/app/history`, `/app/activity`,
`/app/account`, `/app/security`, `/app/notifications`, `/app/billing`,
`/app/api-keys`, `/app/webhooks`, `/app/organization`, `/app/docs`, `/app/help`

**Admin** — `/app/admin` (+ overview), `/app/admin/waitlist`, `/app/admin/users`,
`/app/admin/organizations`, `/app/admin/jobs`, `/app/admin/reports`,
`/app/admin/analytics`, `/app/admin/monitoring`, `/app/admin/feature-flags`,
`/app/admin/roles`, `/app/admin/audit-logs`, `/app/admin/settings`

**Catch-all** — anything else renders the custom 404 page.

## Environment Variables

- Frontend: `.env.example` — `VITE_API_BASE_URL`, Supabase keys,
  `VITE_USE_MOCK`, `VITE_USE_BETTER_AUTH`
- Backend: `backend/.env.example` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `DATABASE_URL`, session secrets
- Canonical reference: `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`

## Documentation Index

Start here, in order:

1. `docs/README.md`
2. `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md`
3. `docs/engineering/PHASE_TASK_LIST.md`
4. `docs/architecture/TECHNOLOGY_STACK_REFERENCE.md`
5. `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
6. `docs/engineering/API_DESIGN_STANDARDS.md`
7. `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md`
8. `docs/project-state/followup-recommendations.md` — the running log of
   what's next, appended after every task
9. `docs/skills/` — Provance-specific agent skills (see [Skills](#skills))

If an older document conflicts with the files above, update the stale document
and follow the current-state set listed here.

## Skills

Agent skills (SKILL.md conventions) the repo ships and uses. Provance-specific
skills are drafted under `docs/skills/` — that directory is the source of
truth — and installed to `~/.agents/skills/` so agent runtimes (Codebuff and
others that read that directory) surface them on the matching tasks.

| Skill | Source | Installed | Status |
| --- | --- | --- | --- |
| `provance-nestjs` | `docs/skills/provance-nestjs/` | `~/.agents/skills/provance-nestjs/` | Live (byte-identical, `skills list -g`) |
| `provance-bullmq-redis-queue` | `docs/skills/provance-bullmq-redis-queue/` | `~/.agents/skills/provance-bullmq-redis-queue/` | Live (byte-identical, `skills list -g`) |
| `supabase` + `supabase-postgres-best-practices` | official `supabase/agent-skills` collection | `~/.agents/skills/` | Live (installed via `npx skills add supabase/agent-skills`) |

Install/refresh from the repo copy (byte-identical):

```bash
mkdir -p ~/.agents/skills/provance-nestjs ~/.agents/skills/provance-bullmq-redis-queue
cp docs/skills/provance-nestjs/SKILL.md ~/.agents/skills/provance-nestjs/SKILL.md
cp docs/skills/provance-bullmq-redis-queue/SKILL.md ~/.agents/skills/provance-bullmq-redis-queue/SKILL.md
npx skills list -g   # verify both register (Source: local)
```

Other third-party skills (api-design-principles, better-auth-best-practices,
anti-ui-slop, deploy-to-vercel, …) live in `~/.agents/skills/` as installed;
the Provance-specific pair above are the repo-owned ones under version
control.

## Working Rules

- Documentation is a first-class deliverable — every task updates the changelog
  and the follow-up log
- Work is phase-based on a dedicated branch (`dev/backend-integration-milestone`)
- Run the build/test gates before declaring anything done
- Open a PR and wait for Founder approval before merging to `main` — `main`
  auto-deploys to Vercel, so it only moves on explicit approval

## License

Proprietary — © 2026 Provance. All rights reserved.
