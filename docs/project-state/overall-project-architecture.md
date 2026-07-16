# Overall Project Architecture

Last updated: 2026-07-16

## Purpose

This document describes the current implemented architecture of Provance and the intended near-term architectural direction.

## Current Architecture Summary

Provance currently operates as a web application with:

- a React and Vite frontend
- a NestJS backend
- Supabase for auth, Postgres, and Storage
- a Redis-backed queue path
- a dedicated worker process for scan execution

## Frontend Architecture

The frontend lives in `src/` and contains:

- public marketing routes
- auth and onboarding routes
- authenticated application routes
- reusable report and forensic presentation components
- auth context and API client helpers

Key characteristics:

- client-side routing with React Router
- app-shell model for authenticated routes
- local session storage for the current MVP auth model
- direct browser upload to private Supabase Storage via signed upload flow

## Backend Architecture

The active backend lives in `backend/`.

It is a NestJS modular monolith with focused modules for:

- health
- waitlist
- auth
- scans
- admin
- queue
- Supabase integration

Key characteristics:

- versioned `/v1` API prefix
- DTO validation and throttling
- global exception filtering
- environment validation at startup
- service-oriented module boundaries

## Data And Storage Architecture

Supabase currently provides:

- Auth for user identity and session issuance
- Postgres tables for waitlist, invites, audit events, and scans
- private Storage bucket for uploads

Current migrated objects:

- `waitlist_applications`
- `access_invites`
- `auth_audit_events`
- `scans`
- `provance-uploads` storage bucket

## Upload And Processing Architecture

The upload flow follows this sequence:

1. frontend requests scan initiation from backend
2. backend creates a scan record and returns signed upload information
3. browser uploads directly to Supabase Storage
4. frontend calls submit endpoint
5. backend enqueues processing or falls back to inline processing
6. worker downloads asset and builds result payload
7. frontend polls and renders reports from persisted scan state

## Report Architecture

The report model is currently based on a structured `result_payload` stored on the scan record.

The report includes:

- report identifier
- verdict
- confidence and authenticity scores
- metadata summary
- signals
- key findings
- timeline
- recommendations
- evidence sections
- signed media preview for image reports

## Deployment Architecture

The live deployment model is:

- frontend deployed separately on Vercel
- API deployed on Fly.io
- worker deployed on Fly.io
- shared Supabase project for DB, auth, and storage
- shared Redis queue transport via Upstash

## Legacy Architecture Note

The repository still contains a legacy `api/` folder.

Current policy:

- do not remove it just because it appears inactive
- do not build new functionality there
- document any cleanup recommendation before removal
- preserve stability over premature cleanup

## Near-Term Architectural Guidance

Near-term architecture work should support:

- premium frontend refinement
- stronger design consistency
- documentation maturity
- later auth hardening plan
- later RLS expansion plan

These items should be documented now even where implementation is deferred.
