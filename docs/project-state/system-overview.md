# System Overview

Last updated: 2026-07-16

## Purpose

This document provides a current high-level overview of the Provance system, product posture, and operating model.

## Product Summary

Provance is a trust infrastructure platform for synthetic media verification.

The current product posture is:

- image-first
- report-first
- evidence-first
- waitlist-first onboarding
- invite-based account activation
- authenticated verification workspace
- queue-backed scan processing
- printable forensic-style report output

## Current User Journey

The current core journey is:

1. visitor lands on the public site
2. visitor joins the waitlist or signs in if already approved
3. approved user accepts invite and activates account
4. authenticated user uploads an image
5. upload is stored using a signed private-storage flow
6. scan is submitted to the queue-backed processing path
7. worker generates a structured result payload
8. user reviews the report in-app and via print-ready presentation

## Current System Shape

### Frontend

- React 19
- Vite
- Tailwind v4
- React Router
- Framer Motion for public-site interactions

### Backend

- NestJS modular backend in `backend/`
- API prefix under `/v1`
- Supabase-backed auth, Postgres persistence, and Storage
- BullMQ-compatible queue orchestration with Upstash Redis

### Worker

- dedicated worker runtime
- consumes scan jobs
- processes uploaded assets
- writes structured evidence payloads back to scan records

### Hosting

- frontend on Vercel
- API on Fly.io
- worker on Fly.io
- auth, DB, and storage on Supabase
- queue transport via Upstash Redis

## Current Product Surfaces

### Public Experience

- landing page
- product page
- methodology page
- pricing page
- docs page
- sample report page
- security page
- contact page
- waitlist page
- sign-in page
- legal pages

### Auth And Access

- invite acceptance
- password reset request
- password reset confirmation

### Authenticated Application

- dashboard
- uploads
- reports list
- report detail
- print view
- account
- team placeholder
- admin workspace
- access denied page

## System Intent

Provance is being built to evolve from the current MVP into a broader platform that can support:

- video verification
- audio verification
- richer evidence timelines
- export workflows
- team and organization access
- enterprise APIs
- larger-scale operational workflows

## Current Priority Context

The active company priority is not backend cleanup or infrastructure expansion.

The immediate focus is improving first impression and perceived product quality through:

- landing page refinement
- typography improvements
- stronger design tokens
- improved spacing and hierarchy
- more premium and consistent UI
- stronger messaging and storytelling
