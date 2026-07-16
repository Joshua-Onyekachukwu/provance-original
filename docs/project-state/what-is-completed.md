# What Is Completed

Last updated: 2026-07-16

## Purpose

This document summarizes the major parts of the project that are currently implemented and working at the repository level.

## Public Site

Completed:

- live marketing and product-facing site
- revised homepage structure and content
- legal pages
- methodology, pricing, product, security, contact, and sample-report pages
- improved public positioning toward broader verification workflows

## Waitlist And Account Access

Completed:

- waitlist form connected to backend
- invite-based activation
- sign-in flow through backend
- password reset request flow
- password reset confirmation flow
- route protection for authenticated pages

## Authenticated Workspace

Completed:

- dashboard
- uploads experience
- reports list
- report detail page
- printable report page
- account page
- team placeholder route
- admin route gating
- access denied handling

## Upload And Scan Flow

Completed:

- scan initiation endpoint
- direct signed upload flow to private storage
- submit scan endpoint
- queue-backed processing path
- inline processing fallback when queue is unavailable
- scan history retrieval
- scan detail retrieval

## Reporting

Completed:

- structured report payload generation
- report identifiers
- printable report layout
- signed image preview support in reports
- verdict and evidence presentation in-app

## Admin Operations

Completed:

- internal admin workspace
- waitlist review
- notes
- status updates
- invite generation
- CSV export
- admin audit trail

## Backend Foundation

Completed:

- NestJS service structure
- health endpoint
- waitlist endpoints
- auth endpoints
- scan endpoints
- admin endpoints
- worker runtime

## Security Foundation

Completed:

- throttle protection
- helmet usage
- startup env validation
- exception filtering
- request tracing support
- auth audit events
- admin audit events

## Documentation Foundation

Completed:

- current engineering source-of-truth docs
- AI organization and operating system docs
- machine-readable agent registry and routing rules
- living project-state documentation set
