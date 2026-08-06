# Provance Investor Memo

Prepared: 2026-07-29

## Executive Summary

Provance is building trust infrastructure for synthetic media verification, starting with an image-first, report-first workflow for high-scrutiny users. The company is not positioning as a generic AI detector. Its documented wedge is operationally usable evidence: verdict clarity, explainable signals, and report artifacts that can support newsroom, investigative, legal-adjacent, fraud, and enterprise trust workflows.

Based on the current documentation, Provance is beyond idea stage but not yet seed-grade in the institutional sense. The repo documents a real product and technical base, including a React/Vite frontend, a NestJS backend, Supabase-backed identity and storage, a queue-backed processing path, authenticated application routes, report views, and internal admin operations. At the same time, the company does not yet document recurring revenue, published benchmark credibility, hardened enterprise controls, or signed design partners. The right posture today is disciplined pre-seed, not premium seed.

## Investment Thesis

1. Synthetic media verification is becoming infrastructure, not a feature. The need is strongest where authenticity changes decisions, liability, or public trust.
2. Provance is targeting a more defensible wedge than score-only AI detection: evidence-first verification built around reports, explainability, and workflow utility.
3. The company appears to understand the category correctly. The documentation consistently emphasizes honest uncertainty, methodology, and artifact quality rather than exaggerated claims.
4. If Provance proves benchmark credibility and converts early design partners, it can occupy a valuable layer between provenance systems, API detectors, and enterprise security products.

## Problem

Synthetic media quality is improving faster than verification infrastructure. Most available products either focus on throughput, moderation, or provenance. High-stakes users often still lack:

- evidence they can review and share
- explainability they can defend internally
- clear verdict language for uncertain cases
- workflow outputs that are more useful than a raw score

This is especially relevant in journalism, investigations, legal-adjacent review, fraud operations, and trust-and-safety environments.

## Solution

Provance is designed as a trust workflow rather than a single-model detector. The product direction documented in the repo includes:

- image-first verification
- report-first product experience
- explainable, multi-signal analysis
- verdict language oriented to real decision-making
- future support for broader attribution, provenance, and API-based integration

The company’s strongest conceptual move is treating the report artifact as product infrastructure, not as an afterthought.

## Product

Documented current-state capabilities include:

- public site and waitlist funnel
- sign-in, invite acceptance, and password reset
- authenticated app shell
- uploads, scan history, report detail, and print-ready report routes
- account and notifications surfaces
- developer and billing placeholder surfaces
- internal admin operations for waitlist, invites, diagnostics, and feature controls

Documented partial or deferred items include:

- session hardening
- richer observability
- billing and subscriptions
- API product commercialization
- organization and team workflows
- enterprise SSO
- video and audio verification

The product is real enough for pre-seed diligence, but still too incomplete for broad institutional seed confidence.

## Technology

The current architecture is sensible for stage:

- frontend: React 19, Vite, Tailwind v4
- backend: NestJS with `/v1` API, validation, throttling, helmet, and exception handling
- data and infra: Supabase Auth, Postgres, Storage, and a Redis-compatible queue path
- deployment direction: Vercel frontend, Fly.io API and worker

Strengths:

- direct-to-storage upload path
- queue-backed processing model
- modular boundaries around storage, auth, queue, and AI-provider layers
- unusually strong documentation discipline

Weaknesses:

- session posture and RLS maturity are not fully hardened
- observability is still limited
- queue reliability and cost posture remain active concerns
- benchmark and payload richness are not yet external-proof points

## Market Opportunity

Provance sits inside a growing digital-trust category spanning synthetic media verification, trust and safety, fraud prevention, and evidence-sensitive workflow software. The opportunity is meaningful, but the right framing is narrower than “all AI.”

The most credible near-term market is the set of workflows where authenticity materially affects editorial, investigative, legal, compliance, or operational decisions. If the company executes, it can expand from specialist users into enterprise teams and API consumers.

## Competitive Advantage

Provance’s best current differentiation is not scale, multimodal breadth, or provenance ownership. It is a workflow position:

- stronger evidence orientation than score-led API products
- stronger post-hoc verification value than provenance-only systems
- more artifact-centric than enterprise deepfake alerting products

That wedge is credible, but not yet durable. Defensibility will come from:

- benchmark credibility
- report workflow adoption
- accumulated edge-case data
- attribution and fingerprinting assets
- trusted reference customers

## Business Model

The documented commercial model is coherent:

- Trial
- Pro
- Team
- Enterprise
- API Lite
- API Pro

Published internal pricing assumptions suggest a pathway from low-friction entry to enterprise ACV and usage-based expansion. The model is attractive on paper, especially if image-first workloads preserve healthy gross margins. However, revenue remains forecast-based rather than validated. Investors should underwrite the model as plausible, not proven.

## Traction

### Documented Facts

- meaningful documentation maturity
- working application and backend foundation
- report, upload, and admin workflow infrastructure
- a defined roadmap and fundraising posture

### Not Yet Documented

- recurring revenue
- signed design partners
- reference customers
- benchmark publication
- retention or conversion metrics

This is pre-traction by institutional standards, though not pre-product.

## Roadmap

The roadmap supports a clear near-term sequence:

1. complete the image-first MVP and report artifact
2. harden sessions, observability, and operational reliability
3. publish benchmark and methodology credibility assets
4. convert design partners into paid pilots
5. expand into team workflows, API readiness, and enterprise controls

This is the right order. The company should resist broadening too early into video, enterprise checklists, or API scale before the image-first wedge is proven.

## Financial Outlook

Internal modeling indicates a professionally structured revenue plan, with pricing designed to support subscription, enterprise, and API expansion. The model projects healthy long-term margins, but the near-term question is commercial validation, not spreadsheet quality.

Our working diligence view:

- fair current financing posture: `$500K-$750K`
- preferred immediate raise: around `$650K`
- reasonable current SAFE cap range: `$5M-$7M` post-money
- likely seed range after milestones: `$10M-$14M` pre-money

These ranges align with the repo’s own grounded fundraising memo and are more credible than hype-tier AI pricing.

## Risks

Key diligence risks:

- technical: session hardening, RLS maturity, observability, queue economics
- product: incomplete artifact depth and potential mismatch between promise and workflow reality
- market: noisy category with adjacent incumbents and shifting buyer education needs
- legal: trust-sensitive claims must remain carefully scoped
- commercial: long enterprise cycles and no documented revenue proof yet
- AI-specific: false positives, drift, and adversarial adaptation could erode trust quickly

## Exit Opportunities

Most plausible exit paths, if execution is strong:

- acquisition by trust-and-safety, fraud, or security platforms
- acquisition by digital forensics or evidence-workflow vendors
- acquisition by media, compliance, or authenticity infrastructure players
- broader infrastructure outcome if Provance becomes a trusted verification layer with meaningful API and enterprise penetration

An IPO-style path is too early to underwrite. Acquisition remains the more realistic base-case exit lens.

## Funding Recommendation

### Recommendation

`Watch`, with selective pre-seed support appropriate for specialist investors.

### Why

Provance has a coherent thesis, a meaningful product and architecture foundation, and a differentiated market position. It does not yet have the benchmark, traction, or enterprise-hardening proof required for a conventional seed conviction.

### What Must Be True For A Stronger Next Round

- benchmark methodology and initial performance proof are published
- 3-5 credible design partners are secured
- at least a small set of pilots converts into paid usage
- report artifacts become visibly indispensable in user workflow
- security and operational posture improve enough to reduce enterprise diligence friction

### Investment Committee View

For a specialist AI, trust, security, or legal-tech investor, Provance merits serious pre-seed consideration. For a generalist fund, the company is better monitored until it converts its strong narrative and technical foundation into proof of demand and trust performance.
