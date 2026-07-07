# Provance Admin System Design

Last updated: 2026-07-07

## MVP Administration Decision

Provance should keep the administration module inside the main platform for MVP.

Reason:

- it reuses the same authentication flow
- it avoids a second deployment surface
- it keeps admin actions close to the real product data
- it is enough for founder-led operations during MVP

Recommended route:

- `/app/admin`

## MVP Modules Implemented

### Waitlist Operations

- total registrations
- pending review count
- approved and rejected counts
- pending invite and accepted invite counts
- applicant search
- status filtering
- applicant detail view
- operator notes
- approve, reject, defer, and under-review actions
- secure invite creation
- CSV export

### Audit Layer

- admin actions are written to the audit log
- the admin UI surfaces recent operational activity

## MVP Modules Planned Next

### User Operations

- suspend or reactivate accounts
- view last sign-in time
- support notes
- password-reset resend assistance

### Verification Operations

- scan retry controls
- failed job review
- queue health detail
- manual-review flagging

### Platform Operations

- worker health
- storage error tracking
- environment health summary
- feature flags

## Full Role Model

### Super Admin

- full access to roles, system configuration, admin creation, and platform-wide controls

### Platform Administrator

- user operations, queue operations, content notices, support workflows, and admin reporting

### Operations Manager

- waitlist review, invite issuance, review notes, exports, and onboarding operations

### Customer Success

- account visibility, resend help, support notes, limited user assistance actions

### Support

- read-only user support tools plus invite and reset assistance

### Security Analyst

- audit trails, security events, auth activity, and read-only investigation access

### Finance

- billing, refunds, invoices, and entitlement review

### Read-only Analyst

- dashboards, exports, and reporting only

## Why The Admin Layer Matters

- It closes the gap between demand capture and controlled user activation.
- It removes direct database work from daily operator tasks.
- It creates auditable onboarding and access decisions.
- It prepares the platform for Phase 7 team and organization workflows.
