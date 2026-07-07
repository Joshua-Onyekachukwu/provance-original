# Provance Admin Access And Operations

Last updated: 2026-07-07

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

The current admin module does not yet send transactional invite emails automatically.

Invite delivery is currently manual after a secure invite link is generated.

## Admin Access Requirements

An account must meet both requirements below:

1. the user must already have a valid Provance account and be able to sign in
2. the user email must be listed in the backend `ADMIN_EMAILS` environment variable

## Required Environment Variable

Backend environment variable:

```bash
ADMIN_EMAILS=founder@example.com,ops@example.com
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

## Recommended Operations Practice

For the current MVP:

- keep `ADMIN_EMAILS` limited to a very small number of trusted internal operators
- use the admin page for all waitlist review decisions instead of direct database changes
- preserve generated invite links carefully because they grant account activation access
- rotate invite handling into email automation only after the manual flow is stable
