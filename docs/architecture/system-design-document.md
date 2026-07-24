# System Design Document

Last updated: 2026-07-23

## Purpose

This document describes the target system design for Provance from the current MVP through early growth, while staying grounded in the architecture that already exists in the repository.

## System Objective

Design a trustworthy, scalable platform for synthetic media verification that can:

- launch quickly as an MVP
- validate verification workflows in production
- support internal and early-user operations
- scale into a more enterprise-ready platform without a rewrite

## Current MVP Topology

```text
User
  -> Vercel Frontend
     -> NestJS API on Fly.io
        -> Supabase Auth / Postgres / Storage
        -> Redis-compatible queue transport when enabled
        -> Fly.io worker for async scan processing
```

## Recommended Near-Term Topology

```text
User
  -> Cloudflare DNS / CDN / WAF
     -> Vercel Frontend
     -> NestJS API
        -> Auth service boundary
        -> Scan service boundary
        -> Report service boundary
        -> Admin service boundary
        -> Queue service boundary
        -> Storage service boundary
     -> PostgreSQL + object storage + queue + worker
     -> Sentry + analytics + operational monitoring
```

## Core Subsystems

### Public Experience

- marketing pages
- sample report and trust-building pages
- waitlist and contact entry points

### Authentication And Onboarding

- sign-in
- invite acceptance
- password recovery
- current-session identity reads

### Verification Workspace

- dashboard
- uploads
- reports
- account
- admin

### Scan Pipeline

- upload initiation
- direct signed upload
- scan submission
- async processing
- result persistence
- report rendering

### Operational Layer

- admin controls
- audit events
- system diagnostics
- observability and alerts

## Request Flow

### Current Upload Flow

1. user authenticates
2. frontend requests scan initiation
3. backend creates a scan record and returns signed upload data
4. browser uploads directly to private storage
5. frontend submits the scan for processing
6. backend queues work or falls back to inline processing
7. worker processes the scan and writes `result_payload`
8. frontend polls and renders the report

### Future Media Flow

For later video and audio support, keep this same top-level contract:

1. initiate upload
2. direct upload to object storage
3. async orchestration
4. preprocessing and extraction
5. signal execution
6. aggregation
7. report generation

## Data Design Principles

- PostgreSQL remains the system of record
- large artifacts live in object storage
- result payloads must be versionable
- audit trails must remain append-oriented
- provider choices should stay replaceable through service boundaries

## Authentication Design

Current MVP:

- Supabase Auth
- backend-verified identity
- route guards in frontend plus server-side checks

Near-term improvement:

- strengthen session transport
- keep auth provider abstraction clean enough for future migration if needed

## Authorization Design

Current MVP:

- authenticated access checks
- admin allowlist
- team placeholder guard

Future direction:

- organization-aware RBAC
- stronger admin protection
- broader policy hardening

## Queue And Worker Design

Current rule:

- keep async processing available
- avoid per-command free-tier assumptions for always-on workers

Design principle:

- queue provider should remain replaceable

## Monitoring Design

Minimum recommended stack before broader beta:

- error monitoring
- product analytics
- queue and worker health visibility
- backend and worker troubleshooting signals

## Security Design

Current baseline:

- validation
- throttling
- helmet
- request IDs
- signed uploads
- private storage

Near-term additions:

- session hardening
- stronger admin protection
- edge-layer protection through Cloudflare
- deeper upload safety review

## System Design Rule

Provance should remain:

- modular
- provider-aware but not provider-trapped
- fast to iterate
- explicit about deferred enterprise complexity

The MVP should be built on the architecture we can actually operate today, not on a hypothetical perfect architecture that delays product validation.
