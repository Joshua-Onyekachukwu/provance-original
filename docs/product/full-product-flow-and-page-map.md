# Full Product Flow And Page Map

## Purpose

This document defines the complete user journey across the public site and the authenticated product.

It answers:

- what pages we should have
- how users move through them
- what each page must do
- how the landing page connects to the product

## 1. Full Experience Overview

Provance should feel like one connected system:

1. public trust and conversion layer
2. authentication and onboarding layer
3. verification workspace
4. result and report layer
5. account, API, and team layer

## 2. Public Site Pages

## 2.1 Homepage

### Purpose

Explain the product fast, establish trust, and drive users into demo, signup, or sample-report review.

### Required Sections

- hero
- trust / credibility bar
- problem and stakes
- how it works
- why Provance is different
- image + video support section
- downloadable reports section
- sample report preview
- use cases
- pricing preview
- FAQ
- final CTA

### Standout Claims That Should Be On The Landing Page

- Verify image and video in one platform.
- Get explainable evidence, not just a score.
- Download a complete forensic-style report.
- See uncertainty handled honestly.
- Access an enterprise-ready API and workflow path.
- Build decisions on evidence you can review, save, and share.

## 2.2 Product Page

### Purpose

Show the product in more detail than the homepage.

### Modules

- upload workflow preview
- result page preview
- evidence breakdown preview
- report preview
- dashboard preview

## 2.3 Solutions Pages

Separate pages for:

- journalism and fact-checking
- legal and investigations
- enterprise trust and fraud
- developers and API teams

Each page should:

- restate the ICP pain
- show why Provance fits
- point to the right CTA

## 2.4 Pricing Page

### Tiers

- Trial
- Pro
- Team
- Enterprise

### CTA Logic

- Trial and Pro go to signup
- Team and Enterprise go to demo / sales

## 2.5 Methodology Page

### Purpose

Build credibility through transparent explanation of how the platform works without exposing proprietary internals.

### Modules

- signal categories
- model versioning philosophy
- uncertainty handling
- limitations and disclaimers

## 2.6 Sample Report Page

### Purpose

Show exactly what users get after a scan.

### Modules

- report cover preview
- verdict summary
- evidence page preview
- metadata and audit section
- CTA into signup or demo

## 2.7 API / Docs Landing Page

### Purpose

Route technical users into the developer journey.

### Modules

- quickstart preview
- example flow
- API authentication summary
- CTA to docs or API signup

## 2.8 Security Page

### Purpose

Answer trust questions before enterprise buyers ask them in calls.

### Modules

- file handling
- private storage
- data retention controls
- audit posture

## 2.9 Blog / Resources

### Purpose

Support SEO, thought leadership, and credibility.

### Content Types

- benchmark posts
- methodology thought pieces
- case studies
- product updates
- comparisons and educational posts

## 3. Public-Site User Flows

## 3.1 General Visitor Flow

1. homepage
2. reads value proposition
3. selects CTA
4. goes to demo request, sample report, pricing, or signup

## 3.2 Professional Buyer Flow

1. homepage
2. sample report or solutions page
3. methodology page
4. pricing or demo request
5. signup or sales call

## 3.3 Developer Flow

1. homepage or product page
2. API / docs landing
3. signup
4. dashboard and API keys

## 4. Authentication Layer

## 4.1 Auth Pages

- sign up
- sign in
- forgot password
- verify email
- invite accept flow later

## 4.2 Signup Flow

1. user selects trial, signup, or API access
2. user creates account
3. email verification if enabled
4. basic onboarding starts
5. user lands in dashboard

## 4.3 Onboarding Flow

### Recommended Steps

- choose use case
- choose individual or team path
- optional first-upload prompt
- optional API interest selection

## 5. Authenticated Product Pages

## 5.1 Dashboard Home

### Purpose

Act as the logged-in control center.

### Modules

- new scan CTA
- recent scans
- scan status cards
- quick stats
- report downloads
- upgrade / plan state

## 5.2 New Scan / Upload Page

### Purpose

Start the core product action.

### Modules

- drag-and-drop upload
- image or video tabs
- supported formats / limits
- progress state
- job status state

## 5.3 Scan Processing State

### Purpose

Keep users informed while async work happens.

### Modules

- upload complete state
- queue state
- analyzing state
- estimated status messaging
- background processing notice

## 5.4 Result Page

### Purpose

Show the actual product value.

### Required Modules

- verdict card
- confidence and uncertainty
- media preview
- signal breakdown
- attribution summary when available
- metadata section
- report actions
- share / copy / rescan actions

## 5.5 Report Download Page

### Purpose

Give users a clean report retrieval surface.

### Modules

- report type
- generation status
- download CTA
- report history

## 5.6 Scan History Page

### Purpose

Support repeat workflows.

### Modules

- filter by status
- filter by media type
- search
- previous results list
- quick action to reopen result

## 5.7 Reports Library

### Purpose

Central place for all generated reports.

### Modules

- report list
- report type
- generated date
- scan reference
- redownload action

## 5.8 Settings Page

### Modules

- profile
- password / auth
- notifications
- retention preferences later
- account plan

## 5.9 API Keys Page

### Purpose

Serve developers and enterprise technical users.

### Modules

- create key
- revoke key
- usage summary
- docs links
- webhook settings later

## 5.10 Team / Organization Page

### Later-Stage Modules

- members
- roles
- shared scans
- workspace settings

## 6. Internal / Admin Pages

- review queue
- failed jobs
- scan diagnostics
- user and account visibility
- model version panel
- system health view later

## 7. End-To-End Product Flows

## 7.1 Landing Page To Trial User

1. user lands on homepage
2. user reads claims and use cases
3. user clicks `Start Trial` or equivalent
4. user signs up
5. user lands in dashboard
6. user uploads media
7. user gets result
8. user downloads report

## 7.2 Landing Page To Enterprise Buyer

1. buyer lands on homepage
2. buyer reads solutions page
3. buyer views sample report or security page
4. buyer requests demo
5. buyer is qualified
6. buyer is provisioned into team workspace later

## 7.3 Landing Page To Developer

1. developer lands on homepage
2. developer clicks API / docs
3. developer signs up
4. developer enters dashboard
5. developer creates API key
6. developer submits media
7. developer retrieves result and report

## 8. Recommended Page Priority

## P0 Public Pages

- homepage
- product page
- pricing page
- methodology page
- sample report page

## P0 Auth Pages

- sign up
- sign in
- dashboard home
- upload page
- result page
- history page

## P0 Support Pages

- settings
- reports library

## P1 Pages

- solutions pages
- API / docs landing
- API keys page
- security page

## P2 Pages

- team workspace
- collaboration pages
- admin health views
- case workspace

## 9. Navigation Recommendation

## Public Nav

- Product
- Solutions
- Pricing
- Methodology
- Sample Report
- Docs
- Sign In
- Request Demo

## Authenticated Nav

- Dashboard
- New Scan
- History
- Reports
- API
- Settings

## 10. Final Recommendation

Provance should not feel like a one-page tool.

It should feel like:

- a premium trust product in public
- a clean verification workspace after login
- a repeat-use professional system once users begin scanning

That means the full journey should be intentionally designed from:

landing page -> auth -> onboarding -> dashboard -> upload -> result -> report -> history -> API / team expansion
