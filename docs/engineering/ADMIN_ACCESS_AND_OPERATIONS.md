# Provance Admin Access And Operations

Last updated: 2026-07-23

## Purpose

This document explains:

- what the current admin system includes
- which environment variables control admin access
- how an operator reaches the admin page
- how the waitlist and invite flow works in the current MVP

## What The Admin Module Does

The current MVP admin module is an internal operations surface for:

- reviewing waitlist applications
- moving applicants into `under_review`, `approved`, `deferred`, or `rejected`
- storing internal operator notes on applicants
- generating secure invite links for approved users
- exporting the waitlist to CSV
- reviewing recent admin and auth audit events

Today, this is the easiest way to access the live waitlist that has already been collected.

The current admin module does not yet send transactional invite emails automatically.

Invite delivery is currently manual after a secure invite link is generated.

## Admin Access Requirements

An account must meet both requirements below:

1. the user must already have a valid Provance account and be able to sign in
2. the user email must be listed in the backend `ADMIN_EMAILS` environment variable

## Required Environment Variable

Backend environment variable:

```bash
ADMIN_EMAILS=founder@example.com,ops@example.com,founder.admin@provance.local
```

Rules:

- use a comma-separated list
- use full email addresses
- do not add quotes
- these emails are matched case-insensitively

## Where To Configure It

### Local backend

Set `ADMIN_EMAILS` in:

- `backend/.env`
- or `backend/.env.local`

### Fly.io API app

Set `ADMIN_EMAILS` in the `provance-api` Fly secrets or environment configuration.

The worker does not need this variable.

## How To Access The Admin Page

Once an approved admin user signs in:

1. go to `/signin`
2. sign in with the admin-enabled account
3. open `/app/admin`

If the signed-in email is included in `ADMIN_EMAILS`, the sidebar will show an `Admin` navigation item.

If the email is not allowlisted, the route is blocked by the backend and the protected frontend route handling.

## Local Admin Test Account Pattern

For controlled local development, use a dedicated admin test account instead of reusing a normal test user.

Recommended local admin email:

```bash
founder.admin@provance.local
```

Recommended local standard user:

```bash
founder.test@provance.local
```

How to use the local admin pattern:

1. create the account through the normal invite flow or directly in Supabase Auth for local-only testing
2. add `founder.admin@provance.local` to `ADMIN_EMAILS`
3. sign in with that account at `/signin`
4. open `/app/admin`

Important notes:

- the email alone does not create the account. it only grants admin permission after a real account exists
- do not use the local admin email in production
- keep local-only admin emails out of live Fly secrets unless intentionally needed for staging

## Current Admin Routes

Frontend:

- `/app/admin`

Backend:

- `GET /v1/admin/dashboard`
- `PATCH /v1/admin/waitlist/:applicationId`
- `POST /v1/admin/waitlist/:applicationId/invite`

## Waitlist Review Flow

### Step 1. Review queue

The admin dashboard loads:

- summary metrics
- the applicant list
- search and filtering
- recent audit events

### Step 2. Open an applicant

The operator selects a waitlist record and reviews:

- full name
- email
- company
- role
- use case
- current status
- existing notes

### Step 3. Record notes

The operator can store internal notes for review context, priority, or follow-up.

### Step 4. Update the status

Available review states:

- `under_review`
- `approved`
- `deferred`
- `rejected`

### Step 5. Create invite

For approved users, the operator can create a secure access invite.

This generates:

- an invite record in `access_invites`
- a secure raw token returned to the admin UI
- an invite URL using the frontend route `/accept-invite?token=...`

### Step 6. Deliver invite

Current MVP process:

- copy the generated invite URL
- send it manually to the approved user

### Step 7. User activation

The invite recipient opens the link, lands on `/accept-invite`, sets a password, and activates the account.

## Current Database Dependencies

The admin flow relies on:

- `waitlist_applications`
- `access_invites`
- `auth_audit_events`
- the migration `supabase/migrations/0003_admin_ops.sql`

## Current Limitations

- no automated email provider integration yet
- no resend-invite action yet
- no user suspension or account-management panel yet
- no full RBAC model beyond admin email allowlisting
- no separate admin application, because MVP keeps admin inside the main app

## Confirmed MVP Expansion Direction

The admin surface is no longer intended to stay waitlist-only.

The confirmed target scope now includes:

- registered users
- verification requests
- report inspection
- job monitoring
- diagnostics
- feature flags

This expansion should preserve the current route-based admin model inside the main app during the present testing phase.

Later, the admin area can be further protected through Cloudflare Zero Trust once domain and Cloudflare setup are available.

## Current Delivered Scope

The current admin interface now includes:

- waitlist review queue with search, filtering, notes, status changes, and CSV export
- invite creation with copyable secure invite links
- registered user visibility from the `profiles` table
- verification request visibility from the `scans` table
- report and signal inspection inside admin for recent requests
- queue and request posture summaries
- internal diagnostics pulled from backend configuration
- persisted feature-flag controls for the current MVP rollout posture

## Recommended Operations Practice

For the current MVP:

- keep `ADMIN_EMAILS` limited to a very small number of trusted internal operators
- use the admin page for all waitlist review decisions instead of direct database changes
- preserve generated invite links carefully because they grant account activation access
- rotate invite handling into email automation only after the manual flow is stable
