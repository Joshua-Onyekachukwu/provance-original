# Authentication, Waitlist, And Early Access Strategy

**Date:** 2026-07-06  
**Scope:** Waitlist-first authentication architecture, security model, early-access flow, and future extensibility toward full product authentication  
**Status:** Ready for founder review before implementation

## 1. Executive Recommendation

Provance should not launch Phase 2 authentication as a generic open-signup SaaS auth system.

It should launch as a:

**waitlist -> review -> invite -> account activation -> protected access**

model.

This approach is better aligned with:

- the design-partner / early-access go-to-market motion
- the current product maturity
- a trust-sensitive product category
- founder preference for admin-led verification in early stages

It also lets us build the right long-term architecture now without opening the product too widely before access control, reporting, and support workflows are mature.

## 2. Goals

The Phase 2 authentication system should support:

- waitlist capture
- email verification
- invite-only account creation
- sign in
- password reset
- session management
- protected routes
- account/profile management
- early-access interest capture
- future onboarding invitations
- role-based access control
- audit logging for auth-sensitive events

It must also be extensible into a broader product-authentication system later without requiring a foundational rewrite.

## 3. Non-Goals For Initial Auth

These should not block the first auth release:

- consumer-scale open registration
- broad social authentication
- enterprise SSO on day one
- complex multi-workspace collaboration
- advanced org lifecycle automation

Those can be layered in later.

## 4. Recommended Access Model

## 4.1 Public Identity Funnel

Public users should have three top-level paths:

1. Join waitlist
2. Request demo
3. Sign in

Only approved or invited users should be able to create a full product account initially.

## 4.2 Recommended User States

Users and prospects should move through explicit states:

- `anonymous`
- `waitlist_submitted`
- `email_verified`
- `under_review`
- `invited`
- `account_created`
- `beta_active`
- `beta_paused`
- `suspended`
- `admin`

This is better than a simple “signed up / not signed up” model because it reflects the actual operating reality of an early-access product.

## 4.3 Recommended Roles

Initial roles:

- `member`
- `admin`

Optional later roles:

- `owner`
- `reviewer`
- `auditor`
- `support`

Roles should control product access, not marketing-state access alone.

Marketing/access state and in-app role should be separate concepts.

## 5. Recommended User Flows

## 5.1 Join Waitlist Flow

1. User submits waitlist form
2. System validates input
3. System creates waitlist application record
4. System sends verification email
5. User verifies email
6. Application moves to `under_review`
7. Admin reviews submission
8. Admin approves, denies, or defers
9. If approved, system sends invite

## 5.2 Invite Acceptance Flow

1. User opens invite email
2. Invite token is validated
3. User sets password
4. User confirms basic profile
5. Account is created or completed
6. Access entitlement is activated
7. User lands in onboarding or account area

## 5.3 Sign In Flow

1. User enters email and password
2. System validates credentials
3. System checks account state
4. If active, session is created
5. User enters protected area

Blocked states should be handled explicitly:

- invite expired
- account suspended
- access not yet approved
- email not verified

## 5.4 Password Reset Flow

1. User requests reset
2. System issues short-lived reset token
3. User resets password
4. Existing sessions are revoked if desired
5. Audit event is recorded

## 5.5 Profile Management Flow

Authenticated users should be able to:

- update name
- update company / role metadata
- update password
- review account state
- express product-interest details
- manage communication preferences

## 6. Recommended Data Model

The current schema is too thin for a proper waitlist and early-access system.

Recommended additions:

### 6.1 Core Tables

- `users`
- `memberships` or `organization_memberships`
- `sessions`
- `waitlist_applications`
- `invites`
- `email_verification_tokens`
- `password_reset_tokens`
- `entitlements` or `access_grants`
- `audit_events`

### 6.2 Waitlist Application Fields

Suggested fields:

- `id`
- `email`
- `full_name`
- `company`
- `role_title`
- `use_case`
- `team_size`
- `interest_type`
- `source`
- `notes`
- `status`
- `email_verified_at`
- `reviewed_by`
- `reviewed_at`
- `approved_at`
- `created_at`

### 6.3 Invite Fields

- `id`
- `email`
- `user_id` nullable
- `application_id` nullable
- `invited_by`
- `token_hash`
- `status`
- `expires_at`
- `accepted_at`
- `created_at`

### 6.4 Session Fields

- `id`
- `user_id`
- `refresh_token_hash`
- `ip_address`
- `user_agent`
- `last_seen_at`
- `expires_at`
- `revoked_at`
- `created_at`

### 6.5 Entitlement Fields

- `id`
- `user_id`
- `access_level`
- `cohort`
- `status`
- `effective_from`
- `effective_to`
- `notes`

## 7. Security Requirements

## 7.1 Password Security

- use strong password hashing
- enforce server-side password validation
- never store plain tokens or passwords
- reset tokens and invite tokens should be hashed at rest

## 7.2 Session Strategy

Recommended approach:

- short-lived access token
- server-tracked refresh/session record
- secure cookies where appropriate
- explicit session revocation support

Do not rely on the current stateless signout behavior.

## 7.3 Rate Limiting

Add rate limiting to:

- sign in
- password reset request
- waitlist submission
- invite acceptance
- verification resend

## 7.4 Input Validation

Every auth boundary must use explicit validation for:

- email
- password
- names
- optional metadata
- token payloads

## 7.5 CSRF

If using cookie-based sessions or hybrid auth, apply CSRF protection where relevant.

If using bearer-only APIs, keep auth boundaries explicit and avoid mixing browser-cookie assumptions carelessly.

## 7.6 XSS Prevention

- sanitize any user-generated display fields
- keep templated emails controlled
- avoid unsafe HTML rendering
- use secure response headers

## 7.7 Cookie Handling

If cookies are used, they must be:

- `HttpOnly`
- `Secure`
- `SameSite` configured intentionally
- scoped appropriately

## 7.8 Audit Logging

Log at minimum:

- waitlist submitted
- email verified
- invite sent
- invite accepted
- password changed
- password reset requested
- sign in success
- sign in failure threshold event
- session revoked
- account suspended
- account reactivated

Do not log secrets, raw tokens, or passwords.

## 8. Recommended Frontend Architecture

Phase 2 should introduce these public/authenticated routes:

- `/waitlist`
- `/signin`
- `/verify-email`
- `/accept-invite`
- `/forgot-password`
- `/reset-password`
- `/account`

Protected product routes can remain minimal initially.

Recommended client responsibilities:

- auth form handling
- validation messaging
- loading and error states
- protected route enforcement
- account-state messaging

## 9. Recommended Backend Responsibilities

Backend auth services should own:

- waitlist application creation
- email verification
- invite issuance
- password set/reset
- sign in / sign out
- session refresh/revoke
- entitlement checks
- audit event creation

The backend should always derive identity from verified auth context, not client-submitted user identifiers.

## 10. API Surface Recommendation

Suggested initial endpoints:

- `POST /api/waitlist`
- `POST /api/waitlist/verify`
- `POST /api/auth/invite/accept`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `PATCH /api/account/profile`
- `POST /api/auth/session/refresh`

Admin endpoints later:

- `GET /api/admin/waitlist`
- `POST /api/admin/waitlist/:id/approve`
- `POST /api/admin/waitlist/:id/reject`
- `POST /api/admin/invites`
- `POST /api/admin/users/:id/suspend`

## 11. Recommended Implementation Strategy

## 11.1 Phase 2A: Public Access Layer

Build:

- waitlist form
- verification email flow
- reviewable admin-facing data model
- invite issuance foundation

## 11.2 Phase 2B: Account Activation Layer

Build:

- invite acceptance
- password set
- sign in
- sign out
- account state checks

## 11.3 Phase 2C: Account Management Layer

Build:

- password reset
- profile management
- session management
- audit views or admin traceability

## 11.4 Phase 2D: Product Access Layer

Build:

- protected routes
- access gating
- early-access cohort control

## 12. Recommended Technology Posture

The auth system should be implemented so it can later support:

- broader self-serve signup
- paid plans
- API keys
- organization accounts
- enterprise SSO

That means:

- use explicit auth modules
- use formal token/session tables
- separate entitlements from roles
- avoid a purely ad hoc auth layer

## 13. What Not To Do

Avoid these mistakes:

- open public account creation before approval and entitlement controls exist
- rely on raw JWT-only stateless sessions with no revocation model
- store raw reset or invite tokens
- mix marketing-state logic into role logic
- bolt on waitlist behavior after building a generic auth system

## 14. Final Recommendation

Provance should treat authentication as an access-orchestration system, not just a login form.

The correct first implementation is:

- public waitlist
- verified identity
- admin approval
- invite-driven account activation
- secure account/session management
- future-ready role and entitlement model

This gives us:

- better product control
- lower support risk
- stronger trust posture
- a clean path into full SaaS authentication later
