# Technical Risks

Last updated: 2026-07-23

## Purpose

This document records the major current technical risks in delivery order.

## Priority 1 Risks

### App Maturity Risk

The authenticated application exists, but the dashboard, admin, and report surfaces still need more operational depth for real internal and early-user usage.

### Queue Cost And Reliability Risk

The async worker pattern is valid, but the free-tier Redis setup is not suitable for always-on worker usage.

### Observability Risk

Without Sentry, analytics, and queue monitoring, issue diagnosis and beta support will be slower than necessary.

## Priority 2 Risks

### Session Transport Risk

The current token transport remains weaker than the later hardened session model we expect for a broader beta.

### Documentation Drift Risk

The repo contains a large amount of historical and future-state documentation, so stale documents can mislead implementation if not maintained carefully.

## Priority 3 Risks

### Schema Drift Risk

Local migration expectations and remote Supabase state must stay aligned as account and admin work continues.

### Template Adoption Risk

Adopting an external admin template without careful evaluation could create visual inconsistency and frontend technical debt.
