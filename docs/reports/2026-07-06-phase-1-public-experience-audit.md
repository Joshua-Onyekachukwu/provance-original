# Phase 1 Public Experience Audit And Design Recommendations

**Date:** 2026-07-06  
**Scope:** Landing page, public-facing pages, linked destinations, conversion surfaces, accessibility, responsiveness, performance, SEO, and non-destructive design-system recommendations  
**Status:** Ready for founder review before implementation

## 1. Objective

This document defines what should be improved in the current public experience before we move deeper into the authenticated product.

The goal is not to redesign Provance from scratch.

The goal is to:

- preserve the existing visual language
- improve public credibility
- repair broken conversion paths
- fill critical public-page gaps
- formalize the current design system
- prepare the site for a waitlist and early-access funnel

## 2. Current Assessment

### 2.1 What Already Works

The public site already has several strong qualities:

- distinctive editorial / forensic visual identity
- coherent palette and spacing rhythm
- polished motion on the best surfaces
- strong premium feel on the homepage and sample report
- a well-articulated trust-oriented product story
- production-buildable frontend

The strongest implemented assets today are:

- homepage visual direction
- methodology page
- sample report page
- forensic report and evidence presentation patterns

### 2.2 What Is Not Yet Good Enough

The public site is currently more polished than the backend, but it is still not ready to serve as a production-grade public foundation.

The main reasons are:

- conversion paths are weak or broken
- several public links are placeholders
- key support/legal/company pages are missing
- some copy overclaims current product maturity
- accessibility basics are incomplete
- design consistency exists visually, but not yet systemically

## 3. Route And Page Inventory

### 3.1 Currently Implemented Public Routes

- `/`
- `/product`
- `/methodology`
- `/pricing`
- `/security`
- `/sample-report`
- `/docs`

### 3.2 Missing Public Routes Required For A Complete Public Foundation

- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/cookies`
- `/careers` or a hidden/not-in-nav decision
- `/resources` or `/blog`
- `/404`

### 3.3 Recommended Navigation Structure

Primary navigation:

- Product
- Methodology
- Pricing
- Sample Report
- Docs
- Security
- Sign In
- Join Waitlist
- Request Demo

Footer navigation:

- About
- Contact
- Privacy Policy
- Terms of Service
- Cookies Policy
- Security
- Sample Report
- Docs
- Resources

## 4. High-Priority Findings

## 4.1 Conversion Problems

The current public experience does not have a real conversion system.

Main issues:

- most CTAs point to `/#demo`
- the `#demo` target is an FAQ block, not a real conversion form
- “Request Demo,” “Start Free Trial,” “Get API Key,” and “Contact Sales” collapse into the same weak action
- sample-report download CTAs are non-functional

### Recommendation

Create three distinct public conversion actions:

1. `Join Waitlist`
2. `Request Demo`
3. `View Sample Report`

Then route users intentionally:

- high-intent buyers -> demo form
- curious evaluators -> sample report
- early users / design partners -> waitlist form
- developers -> docs page + API interest waitlist

## 4.2 Public Trust Gaps

For a company selling trust infrastructure, the footer and trust layer are incomplete.

Missing trust-critical surfaces:

- privacy policy
- terms of service
- cookies policy
- real contact page
- real compliance / trust explanation
- working company links

### Recommendation

Public trust pages should be treated as P0, not polish.

## 4.3 Product-Maturity Overclaiming

Several pages currently imply capabilities that do not exist yet or are not mature enough to promise publicly.

Examples include:

- fully operational image and video verification
- mature SDK ecosystem
- SSO / SCIM
- SOC 2
- webhook maturity
- enterprise integrations
- legal-grade reporting posture

### Recommendation

Shift public copy from “fully available” language to one of:

- available now
- available in pilot
- available for design partners
- roadmap
- enterprise roadmap

The site should still feel ambitious, but it must remain credible.

## 5. Landing Page Audit

## 5.1 Hero

### Current Strengths

- memorable headline treatment
- strong visual artifact with the signal visualizer
- premium spacing and restraint

### Issues

- headline currently emphasizes both image and video, which may outrun the image-first MVP
- CTA structure does not separate demo, waitlist, and sample-report intent
- proof is too light directly under the hero
- on shorter viewports, the hero can feel too tall before conversion action

### Recommendation

- tighten headline around evidence-first verification
- keep sample report as secondary CTA
- add waitlist or demo capture as the primary conversion action
- add a compact proof rail below the hero
- reduce claim inflation in the hero copy

## 5.2 Navigation

### Current Strengths

- clean sticky behavior
- polished mobile menu animation

### Issues

- no Sample Report in primary nav
- no sign-in or waitlist path
- mobile button lacks fuller accessibility state attributes

### Recommendation

- add Sample Report
- add Sign In
- replace generic `Request Demo` top-nav path with a clearer CTA stack
- improve accessibility attributes and keyboard behavior

## 5.3 Why Provance / Features

### Current Strengths

- strong editorial treatment
- clean explanation of differentiation

### Issues

- needs stronger evidence and proof signals
- some claims feel abstract rather than operational

### Recommendation

- add one concrete proof module
- add one “how teams use this in practice” proof block
- reduce generalized enterprise language

## 5.4 How It Works

### Current Strengths

- simple and readable structure

### Issues

- flow is directionally correct, but too generic
- should map more explicitly to upload -> analyze -> review evidence -> export/report

### Recommendation

- refine the sequence to align with the actual intended product flow
- use real workflow language

## 5.5 Sample Report Section

### Current Strengths

- one of the strongest proof assets on the site
- visually differentiated

### Issues

- download CTA is fake
- sample report should be more heavily used as a trust anchor

### Recommendation

- link to the actual sample report page
- optionally provide a downloadable static sample artifact
- elevate this section earlier in the credibility sequence

## 5.6 Pricing

### Current Strengths

- premium card layout
- readable structure

### Issues

- pricing overcommits capability and packaging
- all tiers use nearly the same CTA destination
- enterprise-level claims are too mature for current product reality

### Recommendation

- simplify pricing into “Early Access / Pro / Team / Enterprise”
- separate CTA destinations by buyer intent
- position enterprise capabilities carefully

## 5.7 FAQ

### Current Strengths

- clean implementation
- sensible scan pattern

### Issues

- currently mixed with demo intent
- some answers overstate technical maturity

### Recommendation

- keep FAQ as FAQ
- move demo/waitlist into a separate conversion section
- update answers to reflect current and near-term product truth

## 5.8 Footer

### Current Strengths

- visually clean
- brand-consistent

### Issues

- placeholder links
- missing legal/company destinations
- underpowered trust footer for an enterprise-sensitive product

### Recommendation

- convert the footer into a real trust and navigation layer
- include public contact details or form path
- include legal pages

## 6. Public Page Audit

## 6.1 Product Page

Status: good design, needs stronger routing and tighter claims.

Main actions:

- correct API/docs CTA destination
- align feature language to current roadmap
- improve conversion CTA hierarchy

## 6.2 Methodology Page

Status: strongest trust-building public page.

Main actions:

- preserve overall structure
- improve SEO structure
- add limitations language where helpful
- use this page as a credibility asset in conversion flows

## 6.3 Pricing Page

Status: strong visual framework, weak packaging discipline.

Main actions:

- revise plan names if needed
- reduce overclaiming
- differentiate self-serve vs sales-led conversion
- improve mobile handling of the comparison table

## 6.4 Security Page

Status: visually strong but currently too aspirational.

Main actions:

- separate implemented controls from roadmap or target posture
- avoid certification claims unless confirmed
- turn this page into a real trust-center-lite page

## 6.5 Docs Page

Status: visually polished, but functionally aspirational.

Main actions:

- recast as “developer preview” or “API access” page if the API is not ready
- align CTAs to API interest / early access
- reduce unsupported SDK and webhook claims

## 6.6 Sample Report Page

Status: highly valuable.

Main actions:

- make downloads real
- add clearer explanatory framing
- use it as a primary conversion proof page

## 6.7 Missing Pages

These pages should be created in Phase 1:

- About
- Contact
- Privacy Policy
- Terms of Service
- Cookies Policy
- 404

These pages are optional but useful:

- Resources / Blog
- Careers

## 7. Design-System Recommendations Before Implementation

These recommendations are intentionally non-destructive. They improve consistency without changing the site’s identity.

## 7.1 Keep

Keep the following as core visual language:

- parchment / charcoal foundation
- amber accent
- editorial serif display typography
- mono utility accents
- forensic-grid motif
- quiet premium spacing
- restrained motion

## 7.2 Standardize

Formalize semantic tokens on top of the current palette:

- `surface-default`
- `surface-muted`
- `surface-strong`
- `text-primary`
- `text-secondary`
- `text-inverse`
- `border-subtle`
- `border-strong`
- `accent-primary`
- `status-success`
- `status-warning`
- `status-danger`

## 7.3 Introduce Shared Primitives

Create a small, focused public-system layer:

- `PageHero`
- `SectionHeader`
- `Button`
- `StatusBadge`
- `ProofCard`
- `LegalPageLayout`
- `CodePanel`
- `TrustStat` or `ProofChip`

This is enough to improve consistency without introducing unnecessary component sprawl.

## 7.4 Typography Recommendation

Unify the typography specification and implementation.

Recommended direction:

- display: current serif display treatment
- body UI: one primary sans system
- utility/data: one mono system

Do not allow design docs and implementation to drift further.

## 7.5 Iconography Recommendation

Replace emoji icon usage with lightweight SVG line icons that match the forensic/editorial tone.

## 7.6 Motion Recommendation

Keep motion, but make it more disciplined:

- respect reduced motion
- reserve largest animations for hero and section reveals
- use micro-interactions for trust, not spectacle

## 7.7 Accessibility Recommendation

Implement baseline public accessibility standards:

- visible focus states
- skip link
- improved menu ARIA state
- reduced-motion support
- non-color status communication
- better keyboard support for navigation and accordions

## 8. SEO Recommendations

## 8.1 Immediate

- unique page titles and meta descriptions
- structured heading hierarchy
- internal links between methodology, sample report, docs, pricing, and security
- real contact/legal pages
- 404 page

## 8.2 Near-Term

- resources/blog hub
- targeted pages for AI image verification and related category terms
- structured data where relevant

## 9. Performance Recommendations

- reduce oversized hero overhead where possible
- audit Framer Motion usage on lower-end devices
- optimize heavy sections and large code blocks for mobile
- avoid shipping unused decorative complexity

## 10. Phase 1 Implementation Sequence

Recommended build order:

1. Fix public routing and placeholder links
2. Add missing legal/company/contact pages
3. Add waitlist and demo conversion structure
4. Refine hero, CTA strategy, and public copy accuracy
5. Standardize public design primitives and semantic tokens
6. Improve accessibility baseline
7. Improve SEO metadata and 404 handling
8. Revisit secondary public pages for consistency and routing polish

## 11. Final Recommendation

Provance already looks better than most early-stage SaaS landing pages. The problem is not aesthetics. The problem is that the public site currently behaves more like a polished concept site than a trustworthy production-facing public foundation.

Phase 1 should therefore focus on:

- trust completion
- conversion completion
- page completeness
- design-system formalization
- claim discipline

Once those are in place, the public-facing experience will be strong enough to support the waitlist, early-access, and future authenticated product rollout.
