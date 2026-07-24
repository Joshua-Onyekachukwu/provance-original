# Infrastructure And Service Configuration Guide

Last updated: 2026-07-23

## Purpose

This guide explains which services Provance should use during the MVP, what each service is responsible for, and when it actually needs to be configured.

## Current MVP Infrastructure Decisions

### Frontend Hosting

- Provider: Vercel
- Status: current path
- Required now: yes
- Notes: keep for MVP

### API And Worker Hosting

- Provider: Fly.io
- Status: current path
- Required now: yes
- Notes: keep for MVP unless a real hosting blocker appears

### Database, Auth, And Initial Storage

- Provider: Supabase
- Status: current path
- Required now: yes
- Notes: keep as the MVP platform

### Queue Transport

- Provider direction: Redis-compatible
- Status: needed for shared async validation, not for every local workflow
- Required now: not always
- Notes: use inline processing or local Redis / Valkey where practical

### DNS, CDN, And Security Edge

- Provider direction: Cloudflare
- Status: recommended
- Required now: no, because the project does not yet have a domain
- Notes: adopt Cloudflare after domain purchase and before broader beta exposure

### Transactional Email

- Provider direction: Resend
- Status: recommended, not yet required
- Required now: no
- Notes: add when automated invite or reset email delivery becomes implementation-critical

### Error Monitoring

- Provider direction: Sentry
- Status: recommended, not yet configured
- Required now: no
- Notes: add in the MVP security and observability phase

### Product Analytics

- Provider direction: PostHog
- Status: recommended, not yet configured
- Required now: no
- Notes: add in the MVP security and observability phase

## Queue Strategy Guidance

## Recommended Rule

Do not spend money on hosted queue infrastructure during routine local development unless it solves a real blocker.

## Recommended Setup By Stage

### Local Development

- use inline processing by default
- use local Redis or local Valkey only when queue semantics, retries, or worker behavior must be tested
- avoid burning commands on shared hosted Redis

### Shared MVP Validation

- if real deployed async validation is needed, use a hosted Redis-compatible provider
- Upstash Fixed 250MB starts at about `$10/month`
- Upstash Free should not be used for always-on worker validation
- justify this spend once real test users or shared end-to-end async validation begin

### Later Growth

- keep the queue service abstract enough to move to self-hosted Valkey, Redis Cloud, SQS, or another provider later

## Service Setup Order

### Set Up Before The Next Implementation Phase

1. GitHub access and branch workflow
2. Supabase project and schema verification
3. Vercel environment variables
4. backend environment variables
5. decision on local versus shared queue usage

### Set Up During Later MVP Phases

1. Cloudflare DNS and WAF after domain purchase
2. Sentry
3. PostHog
4. Resend

### Set Up Later

1. OpenAI
2. Anthropic
3. Stripe
4. Neon

## Cloudflare Configuration Plan

When the account and domain are ready, configure:

- DNS for root, app, api, and staging subdomains
- SSL / TLS defaults
- CDN and edge caching
- WAF baseline
- Turnstile for abuse-sensitive public forms if needed
- Zero Trust for higher-assurance admin protection later

## Supabase Configuration Plan

Required current objects:

- auth enabled
- tables for waitlist, invites, auth audit, profiles, and scans
- private uploads bucket

Required checks:

- confirm remote schema matches current migrations
- confirm service-role key is only used server-side
- confirm browser upload flow uses only anon-safe credentials and signed upload URLs
- confirm `profiles` is present remotely with RLS enabled

## Fly.io Configuration Plan

Required apps:

- API app
- worker app, only if async queue processing is enabled in the environment

Required checks:

- secrets are populated
- app and worker configs match current env docs
- health endpoint responds

## Vercel Configuration Plan

Required checks:

- project linked to current repo
- frontend environment variables populated
- API base URL points to the intended backend

## Monitoring Configuration Plan

When Phase 5 opens:

- add Sentry to frontend, backend, and worker
- add PostHog to product surfaces that matter for activation and core workflow learning
- define a minimal set of queue and pipeline alerts

## Trezo Admin Template Evaluation

Current status:

- the Trezo template files are present in `react-nextjs-tailwindcss`

Current recommendation:

- do not commit to adopting the full template
- keep the admin UI aligned to the existing Provance design system
- only consider selective reuse of layout-neutral patterns, interaction ideas, and engineering approaches that can be restyled and simplified for Provance
