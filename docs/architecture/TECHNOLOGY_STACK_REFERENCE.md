# Provance Technology Stack Reference

Last updated: 2026-07-23

## Purpose

This document is the official technology stack reference for Provance.

It explains:

- what each technology is used for
- why it was selected
- why it currently beats the alternatives
- MVP free-tier or startup-credit considerations
- migration considerations
- long-term suitability

## Selection Principles

During the MVP phase, every major service should satisfy as many of these goals as possible:

- suitable for production
- strong free tier or startup-credit path
- low operational overhead
- scalable without a forced rewrite
- replaceable through clear boundaries if needed later

## Official MVP Stack

### Frontend Application

**Technology**

- React 19
- Vite
- Tailwind CSS v4
- React Router
- Framer Motion

**Purpose**

Build the public site and authenticated application quickly with a modern component-driven frontend.

**Why It Was Selected**

- already implemented in the repo
- fast local development
- good fit for a high-design marketing site and app surface
- lightweight deployment path on Vercel

**Why It Beats The Main Alternatives Right Now**

- simpler than moving to Next.js during MVP
- lower migration cost than replacing the current frontend foundation
- enough control for a custom design system without heavy framework lock-in

**Free Tier Limitations**

- Vercel Hobby is sufficient early, but team collaboration and higher usage can push the project to Pro later

**Cost After Scaling**

- Vercel starts at `Hobby: $0`
- Vercel Pro starts at `about $20/month per user`

**Migration Considerations**

- frontend is portable
- routing and UI code can move to another host without a rewrite

**Long-Term Suitability**

- strong for MVP and early growth
- still suitable later if the backend remains API-first

## Backend API

**Technology**

- NestJS

**Purpose**

Own the verification workflow, auth-adjacent business logic, admin operations, scan lifecycle, and future service boundaries.

**Why It Was Selected**

- modular monolith structure
- strong DTO validation and guard patterns
- good fit for long-lived product logic
- easier to evolve into service boundaries later than ad hoc server code

**Why It Beats The Main Alternatives Right Now**

- better fit than rewriting to FastAPI or Express mid-MVP
- stronger structure than lightweight servers for a growing product
- better team-scale maintainability

**Free Tier Limitations**

- framework itself is free
- cost depends on hosting, not the framework

**Cost After Scaling**

- driven by compute platform rather than NestJS

**Migration Considerations**

- the modular monolith should remain the pattern until scale or ownership justifies service splits

**Long-Term Suitability**

- high

## Primary Database, Auth, And Initial Storage

**Technology**

- Supabase Auth
- Supabase Postgres
- Supabase Storage

**Purpose**

Move quickly with one backend platform for identity, database, and object storage during the MVP.

**Why It Was Selected**

- already integrated
- fast setup
- good developer experience
- reduces initial infrastructure burden

**Why It Beats The Main Alternatives Right Now**

- faster MVP path than splitting database, auth, and storage across separate providers
- lower integration cost than moving to Neon plus separate auth and storage today

**Free Tier Limitations**

- Supabase Free currently includes a paused-after-inactivity project model, `500 MB` database, `1 GB` file storage, `5 GB` egress, and `50,000` monthly active users

**Cost After Scaling**

- Supabase Pro starts at `about $25/month`
- Team and enterprise plans are significantly more expensive and should be delayed until truly needed

**Migration Considerations**

- keep SQL migrations app-owned
- keep storage and auth access behind app services where practical
- avoid hard-coding Supabase-only assumptions into every domain module

**Long-Term Suitability**

- strong for MVP and early growth
- may later be complemented or partially replaced if enterprise auth, storage, or database constraints demand it

## Queue And Background Processing

**Technology**

- BullMQ-compatible queue pattern
- Redis-compatible transport

**Current Provider Direction**

- local development: inline processing or local Redis / Valkey
- shared MVP environment: hosted Redis only when needed for real async validation

**Purpose**

Run scan processing asynchronously without blocking API requests.

**Why It Was Selected**

- already wired into the current backend and worker path
- appropriate abstraction for scan processing and retries

**Why It Beats The Main Alternatives Right Now**

- lower rewrite cost than replacing the queue system before we finish the product
- good enough for the image-first MVP if infrastructure usage is controlled

**Free Tier Limitations**

- Upstash Free is not a good fit for always-on BullMQ workers because the monthly command limit is too small

**Cost After Scaling**

- Upstash Redis Free: `500K commands/month`
- Upstash Redis Fixed 250MB: `about $10/month`
- Upstash Prod Pack: additional `about $200/month` per database if enterprise-grade operational features are needed

**Migration Considerations**

- keep queue operations behind a queue service abstraction
- this preserves a migration path to self-hosted Valkey, Redis Cloud, SQS, or another provider later

**Long-Term Suitability**

- the queue pattern is suitable long term
- the provider may change later

## API And Worker Hosting

**Technology**

- Fly.io for API and worker

**Purpose**

Run the NestJS API and background worker as always-on processes.

**Why It Was Selected**

- good fit for containerized app and worker processes
- easier than forcing worker execution into a frontend-first host
- already represented in the repo deployment files

**Why It Beats The Main Alternatives Right Now**

- lower migration cost than replatforming to AWS or GCP before MVP
- better fit for long-running worker processes than Vercel

**Free Tier Limitations**

- Fly pricing is usage-based and no longer centered on a broad always-free tier

**Cost After Scaling**

- depends on VM size, region, storage, and bandwidth
- treat Fly as cost-efficient for MVP, but not a guaranteed cheapest option at scale

**Migration Considerations**

- containerized backend makes later migration to AWS, GCP, or Render more manageable

**Long-Term Suitability**

- strong for MVP and early growth
- revisit when compute, GPU, or enterprise networking needs become more complex

## Frontend Hosting

**Technology**

- Vercel

**Purpose**

Deploy the public site and frontend application quickly with preview deployments and low friction.

**Why It Was Selected**

- excellent frontend DX
- easy GitHub integration
- good preview workflow

**Why It Beats The Main Alternatives Right Now**

- lower setup cost than standing up custom frontend hosting infrastructure

**Free Tier Limitations**

- Hobby is good for early MVP work but has team and usage limits

**Cost After Scaling**

- Pro starts at `about $20/month per user`

**Migration Considerations**

- frontend is portable if later moved behind Cloudflare or another host

**Long-Term Suitability**

- high for frontend delivery

## Edge, DNS, And Security Layer

**Technology**

- Cloudflare DNS
- Cloudflare CDN
- Cloudflare WAF
- Cloudflare Turnstile
- Cloudflare Zero Trust

**Purpose**

Provide edge protection, DNS, CDN, bot mitigation, and internal access controls.

**Why It Was Selected**

- strongest practical edge/security addition for MVP and beyond
- good free and startup-credit path
- useful without forcing a backend rewrite

**Why It Beats The Main Alternatives Right Now**

- more directly useful than adopting Workers, Durable Objects, or D1 as core app architecture today

**Free Tier Limitations**

- Cloudflare Free is strong for DNS, CDN, SSL, and base protection
- some higher-grade WAF and enterprise controls require paid plans

**Cost After Scaling**

- Pro starts around `about $20/month per site`
- Business starts around `about $200/month per site`

**Migration Considerations**

- low migration risk because Cloudflare sits at the edge rather than inside app logic

**Long-Term Suitability**

- very high

## Transactional Email

**Recommended MVP Choice**

- Resend

**Purpose**

Handle transactional emails such as password reset, invite delivery, and operational notifications.

**Why It Was Selected**

- easy setup
- good developer experience
- sufficient free tier for MVP testing

**Why It Beats The Main Alternatives Right Now**

- simpler than SES for an early-stage team
- lighter than full marketing suites

**Free Tier Limitations**

- Resend Free currently supports `3,000 emails/month`, `100 emails/day`, and `1 domain`

**Cost After Scaling**

- Resend Pro starts at `about $20/month`

**Migration Considerations**

- keep email sending behind a provider adapter

**Long-Term Suitability**

- good for MVP and early growth
- reassess if enterprise deliverability needs justify Postmark or SES later

## Error Monitoring

**Recommended MVP Choice**

- Sentry

**Purpose**

Capture frontend, backend, and worker errors with enough detail to debug real user issues.

**Why It Was Selected**

- mature ecosystem
- good cross-stack support
- fast time to value

**Free Tier Limitations**

- Sentry Developer plan is free but limited

**Cost After Scaling**

- Team starts at `about $26/month`

**Migration Considerations**

- low migration risk if instrumentation is kept clean

**Long-Term Suitability**

- high

## Product Analytics

**Recommended MVP Choice**

- PostHog

**Purpose**

Track activation, usage, funnel movement, and key product behaviors.

**Why It Was Selected**

- useful for product learning without needing a large analytics stack
- feature flags can be added later on the same platform

**Free Tier Limitations**

- free usage is generous for early MVP traffic, but usage-based billing will appear later

**Cost After Scaling**

- cost depends on product analytics volume and enabled products

**Migration Considerations**

- keep analytics events behind a small event helper to avoid vendor lock-in

**Long-Term Suitability**

- high for startup-stage product analytics

## Search

**MVP Choice**

- PostgreSQL search only

**Why**

- no separate search engine is needed for MVP

**Deferred Recommendation**

- Typesense if product search becomes necessary before enterprise scale

## AI And Model Infrastructure

**MVP Choice**

- provider-agnostic service boundary
- application-owned orchestration
- queue-backed worker execution

**Purpose**

Keep model orchestration replaceable while the product learns what actual verification workloads need.

**Current Scope Rule**

- do not integrate OpenAI or Anthropic into the immediate MVP unless a clearly approved feature requires it

**Long-Term Suitability**

- high if provider access is kept behind adapters

## Explicit Non-Recommendations For Current MVP

### Neon As Primary Database

Do not migrate now.

Reason:

- migration work outweighs the current benefit
- the existing bottlenecks are product completion, reliability, and operational visibility

### Full Cloudflare Worker-Centric Backend

Do not re-architect now.

Reason:

- current NestJS backend and worker model is already working
- Cloudflare should be added first as an edge and security layer

### Clerk Or Custom Auth

Do not switch now.

Reason:

- Supabase Auth is already working
- switching now creates cost and migration risk without solving a pressing MVP blocker

## Long-Term Migration Boundaries To Preserve

These boundaries should remain explicit in the codebase:

- auth provider boundary
- storage provider boundary
- queue provider boundary
- AI provider boundary
- email provider boundary
- analytics and monitoring boundaries

If those boundaries remain clean, Provance can evolve into a larger architecture without a destructive rewrite.
