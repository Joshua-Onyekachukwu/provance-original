# Technical Risks

Last updated: 2026-07-16

## Purpose

This document records the current major technical risks in priority order.

## Priority 1 Risks

### Session Transport Risk

The current MVP stores session tokens locally in the frontend.

Impact:

- larger XSS blast radius
- weaker production security posture

Status:

- documented
- not current implementation priority

### Non-Scan Table Security Risk

Waitlist and invite-related tables are not yet fully hardened with RLS.

Impact:

- future exposure risk if access patterns change
- avoidable security debt if deferred too long

Status:

- document now
- implement in a later security phase

## Priority 2 Risks

### Brand-Perception Risk

The current public experience is solid, but not yet distinctive or premium enough to create the intended first impression.

Impact:

- weaker conversion
- lower perceived enterprise credibility
- underperformance in early market trust

Status:

- active priority

### Documentation Drift Risk

As the repo grows, older docs can drift away from current implementation.

Impact:

- onboarding confusion
- repeated work
- mistaken architecture assumptions

Status:

- mitigated through living docs
- requires continuous maintenance

## Priority 3 Risks

### Legacy Backend Cleanup Risk

Removing or ignoring legacy backend artifacts without validation could destabilize workflows or erase context prematurely.

Impact:

- accidental loss of needed logic
- incorrect assumptions about environment usage

Status:

- cleanup must be documented before removal

### Multi-Media Expansion Risk

Video and audio support are part of the product vision but not yet supported in production.

Impact:

- roadmap pressure
- possible mismatch between vision and current capability

Status:

- defer implementation until after current presentation-focused phase
