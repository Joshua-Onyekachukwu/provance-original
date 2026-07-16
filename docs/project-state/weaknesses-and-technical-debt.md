# Weaknesses And Technical Debt

Last updated: 2026-07-16

## Purpose

This document tracks the main weaknesses and current technical debt areas in the project.

## Product And UX Weaknesses

- public site needs more premium polish
- typography and token system are not yet at the desired level
- brand consistency is not yet strong enough across marketing and application surfaces
- current first impression does not yet fully match enterprise-grade positioning

## Frontend Technical Debt

- typography tokens and actual font usage need alignment
- some visual systems feel iterative rather than fully unified
- app and marketing surfaces need more consistent design language

## Backend And Security Debt

- session tokens are still stored in local storage
- waitlist and invite tables do not yet have fully documented RLS posture
- observability is still light for a production-grade system

## Architecture And Repo Debt

- legacy `api/` directory remains in the repository
- some historical docs still describe older architecture assumptions
- some design and brand references conflict with current implementation details

## Documentation Debt

- older docs remain useful but can confuse new contributors if not clearly marked as historical
- decision logging needs continued discipline as work accelerates
