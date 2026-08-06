# Product Roadmap

Last updated: 2026-08-04

## Purpose

This document records the current user-facing product sequence.

## Current Product Priority

Deliver a working MVP application that users and internal operators can actually rely on.

### Immediate Objectives

- strengthen the dashboard as a real workspace
- strengthen the admin surface as a real internal tool
- improve report review utility
- improve upload and processing reliability
- keep the account and session experience stable

## Near-Term Product Priorities

- improve report depth and evidence usefulness
- add operational diagnostics that support internal validation
- prepare a trustworthy beta-ready product experience

### Approved Feature Set (2026-08-04)

These features were recommended in the frontend completion review and approved by the Founder for inclusion:

| Feature | Priority | Target |
| --- | --- | --- |
| Global error boundary + crash recovery | High | MVP |
| Report PDF export (client-side) | High | MVP |
| Scan deduplication (hash-based) | Medium | MVP |
| Organization invites + roles | High | MVP (shipped) |
| Admin analytics + monitoring pages | Medium | MVP (admin) (**shipped**) |
| Session hardening (httpOnly cookies) | High | Before beta |
| Sentry + PostHog baseline | Medium | Before beta |
| Webhooks UI | Medium | Later |
| Usage/entitlement enforcement | Medium | Later |
| Evidence appendix in reports | Medium | Later |

## Deferred Product Priorities

- billing and subscriptions (UI shipped; enforcement deferred until Stripe)
- API product
- video verification
- audio verification
- deeper enterprise controls
