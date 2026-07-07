# Provance Documentation Map

## Purpose

> Current-state note. Updated 2026-07-07.
>
> This document is historical context for how the documentation set was originally assembled. It is no longer the best entry point for the live codebase.
>
> For current implementation truth, start with `README.md`, `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`, and `docs/engineering/PHASE_TASK_LIST.md`.

This repository originally drew from source strategy documents where the product concept was described as **VerifAI**. The live repo, codebase, and active product identity now use **Provance** consistently.

Older references to `VerifAI` should be treated as legacy naming, not the current shipped brand.

## Source Inputs Reviewed

- `VerifAI_Founder_Summary_Report.md`
- `Provance_Complete_Development_Guide.md`
- `provance.pdf` (present in repository; assumed to be a presentation export related to the same concept, but not machine-extracted in this pass)

## Deliverable Map

### Foundation

- Master Product Blueprint:
  `docs/foundation/master-product-blueprint.md`
- Master Development Plan:
  `docs/foundation/master-development-plan.md`
- Implementation Sequence:
  `docs/foundation/implementation-sequence.md`
- Documentation Map:
  `docs/foundation/document-map.md`

### Product

- Product Requirements Document (PRD):
  `docs/product/product-requirements-document.md`
- Feature Specifications, User Stories, Acceptance Criteria:
  `docs/product/feature-specifications-and-user-stories.md`
- Development Roadmap:
  `docs/product/development-roadmap.md`
- Full Product Flow And Page Map:
  `docs/product/full-product-flow-and-page-map.md`

### Architecture

- System Design Document:
  `docs/architecture/system-design-document.md`
- Technical Architecture Document:
  `docs/architecture/technical-architecture-document.md`
- Technical Requirements Document (TRD):
  `docs/architecture/technical-requirements-document.md`
- Algorithms & Intelligence Layer:
  `docs/architecture/algorithms-and-intelligence-layer.md`

### Design & Brand

- Design System Guide:
  `docs/brand/design-system-guide.md`
- Naming & Brand Strategy Report:
  `docs/brand/naming-and-brand-strategy-report.md`
- Landing Page Strategy / Copy / Conversion Blueprint:
  `docs/brand/landing-page-strategy-copy-and-conversion-blueprint.md`

### Business

- Business Plan:
  `docs/business/business-plan.md`
- Financial Model Framework:
  `docs/business/financial-model-framework.md`
- V2PROM Analysis Report:
  `docs/business/v2prom-analysis-report.md`
- Investor Pitch Deck Outline:
  `docs/business/investor-pitch-deck-outline.md`
- Fundraising Strategy & Valuation Memo:
  `docs/business/fundraising-strategy-and-valuation-memo.md`
- Investment Memo:
  `docs/business/investment-memo.md`
- Cap Table Framework:
  `docs/business/cap-table-framework.md`
- Data Room Checklist:
  `docs/business/data-room-checklist.md`
- Competition Analysis & Positioning Report:
  `docs/business/competition-analysis-and-positioning-report.md`
- GTM / Sales Motion Document:
  `docs/business/gtm-and-sales-motion-document.md`

### Operations & Governance

- Team Operating Structure:
  `docs/operations/team-operating-structure.md`
- Governance, Risk, Compliance:
  `docs/operations/governance-risk-and-compliance.md`

### Legal

- Incorporation And Legal Setup Guide:
  `docs/legal/incorporation-and-legal-setup-guide.md`
- IP Assignment Agreement Template Brief:
  `docs/legal/ip-assignment-agreement-template-brief.md`
- SAFE Template And Term Sheet Brief:
  `docs/legal/safe-template-and-term-sheet-brief.md`

## Key Strategic Reframe

The source material is strong on vision and rough architecture, but it is still **pre-product** and **pre-company-system**. The new suite shifts the project from:

- concept-first to execution-first
- model-centric to product-system-centric
- startup idea to investment-ready platform plan
- detection tool to trust infrastructure business

## Working Assumptions

- The product starts as a web platform with API access.
- The initial moat is not raw benchmark accuracy alone; it is explainability, defensibility, evidence workflows, and a proprietary fingerprint graph.
- Legal, media, and enterprise verification use cases produce stronger defensibility and higher willingness to pay than a consumer-only strategy.
- The MVP should prove trustworthy image detection before scaling to heavy video workloads.
- The company should avoid over-investing in GPU infrastructure before paid usage validates demand.

## Decision Rules

When future documents conflict, use this priority order:

1. `master-product-blueprint.md`
2. `product-requirements-document.md`
3. `technical-architecture-document.md`
4. `development-roadmap.md`
5. remaining supporting documents

## Immediate Next Use

Before implementation begins, leadership should:

1. Approve the product positioning and ICP order.
2. Approve the MVP feature line.
3. Approve the target architecture and security posture.
4. Approve naming direction.
5. Approve Phase 1 execution scope and team shape.
