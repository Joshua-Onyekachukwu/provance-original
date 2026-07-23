# Deployment Notes: Fly.io And Redis-Compatible Queue

Last updated: 2026-07-23

## Purpose

This document explains the current deployment path for the API, worker, and queue-backed processing flow.

## Current Deployment Model

- frontend on Vercel
- API on Fly.io
- worker on Fly.io
- auth, database, and initial object storage on Supabase
- Redis-compatible queue transport when async processing is enabled

## Important Queue Decision

The queue architecture is valid.

The free-tier hosted Redis plan is not.

Why:

- an always-on worker can generate steady background command usage even with little real traffic
- this makes free per-command plans a poor fit for BullMQ-style worker patterns

## Current Recommendation

### Local Development

- prefer inline processing or local Redis / Valkey
- do not default local workflows to a paid hosted Redis instance

### Shared Async Validation

- if we need deployed async validation, use a paid hosted Redis-compatible plan or a self-hosted shared alternative
- Upstash Fixed 250MB starts at about `$10/month`
- Upstash Free should not be used for always-on worker validation

## Fly.io API

The repo already includes:

- `backend/Dockerfile`
- `backend/fly.toml`

Required API secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN`
- `SUPABASE_UPLOADS_BUCKET`
- `SUPABASE_SCANS_TABLE`
- `SUPABASE_WAITLIST_TABLE`
- `ADMIN_EMAILS`

Optional queue-related API secrets:

- `REDIS_URL`
- `SCAN_PROCESSING_QUEUE_NAME`

## Fly.io Worker

The repo already includes:

- `backend/Dockerfile.worker`
- `backend/fly.worker.toml`
- `backend/src/worker.ts`

Only run the worker in environments where async queue processing is intentionally enabled.

Required worker secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCANS_TABLE`
- `SUPABASE_UPLOADS_BUCKET`
- `REDIS_URL`

Optional worker secrets:

- `SCAN_PROCESSING_QUEUE_NAME`
- `WORKER_CONCURRENCY`

## Vercel Frontend

Required Vercel variables:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase Notes

The current MVP expects:

- waitlist, invite, auth audit, profiles, and scans tables
- a private uploads bucket named `provance-uploads`

## Collaboration Rules

- never store secrets in git
- update deployment docs when service decisions or env requirements change
- merge deployment-affecting changes only after review and approval
