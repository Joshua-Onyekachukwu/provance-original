# Provance: Revenue Model, Competitive Analysis & Investor Narrative

**Document Owner:** Business Strategy Lead  
**Revision:** 1.0  
**Status:** Ratified  
**Date:** 2026-06-25

---

## Table of Contents

1. [Refined Revenue Model](#1-refined-revenue-model)
2. [Competitive Landscape Analysis](#2-competitive-landscape-analysis)
3. [Investor Narrative (5-Minute Pitch)](#3-investor-narrative-5-minute-pitch)
4. [GTM & Distribution Strategy](#4-gtm--distribution-strategy)
5. [Financial Projections (Seed Round)](#5-financial-projections-seed-round)
6. [Pilot & Design Partner Plan](#6-pilot--design-partner-plan)
7. [Key Risks & Mitigation](#7-key-risks--mitigation)

---

## 1. Refined Revenue Model

### 1.1 Overview

Provance employs a **hybrid SaaS + usage-based revenue model** across four tiers. Revenue is driven by verification volume, workflow features, and infrastructure control. The model is designed to:

- **Convert freemium users** through clear value progression (Trial → Pro)
- **Capture team spend** through seat-based + volume bundling (Team)
- **Command premium pricing** for compliance, control, and dedicated infrastructure (Enterprise)
- **Scale with API usage** via transaction-based pricing for developer teams

### 1.2 Pricing Tiers

### 🆓 Trial — $0 (14 days)
*"The Show-Me Tier"*

| Parameter | Limit |
|-----------|-------|
| Verifications | 10 total (lifetime of trial) |
| File size cap | 10 MB per file |
| Users | 1 |
| Image support | ✓ (all formats) |
| Video support | ✓ (up to 60s clips) |
| Web dashboard | ✓ |
| PDF forensic report | ✓ (with "TRIAL — Not for Evidentiary Use" watermark) |
| API access | ✗ |
| Support | Community (Discord) |
| Credit card required? | No |

**Conversion goal:** 20% of trial users → Pro within 14 days  
**Trigger:** Trial users receive email on day 7 with "Your trial is half over — here's what you've verified" plus sample Pro report showing watermarked vs. clean comparison.

---

### 🚀 Pro — $49/month or $49/month billed annually ($39/month)
*"For the solo professional"*

| Parameter | Limit |
|-----------|-------|
| Verifications | 100 / month (+ rollover of unused up to 50) |
| File size cap | 50 MB per file |
| Users | 1 |
| Image + video support | ✓ (video up to 10 min) |
| API access | 1,000 requests/month |
| Priority processing | Standard queue |
| PDF forensic reports | ✓ (unwatermarked) |
| JSON report export | ✓ |
| History retention | 90 days |
| Support | Email + Slack community |
| Feature: Citation export (APA/MLA/Chicago/Bluebook) | ✓ |

**Annual pricing:** $468/year ($39/mo — saves 20%)  
**Ideal for:** Investigative journalists, forensic analysts, legal investigators, freelancers

---

### 👥 Team — $249/month
*"For newsrooms, legal teams, and trust & safety groups"*

| Parameter | Limit |
|-----------|-------|
| Verifications | 1,000 / month (shared pool) |
| File size cap | 100 MB per file |
| Users | Up to 5 included ($30/mo per additional) |
| Video support | Up to 30 min clips |
| API access | 10,000 requests/month |
| Priority processing | High queue |
| SSO / SAML | ✓ |
| Role-based access (Admin/Editor/Viewer) | ✓ |
| Team workspaces & shared history | ✓ |
| Batch processing (up to 50 files) | ✓ |
| Audit log access (30-day retention) | ✓ |
| Support | Priority email + Slack channel |
| White-labelled reports (Team-name branding) | ✓ |

**Annual pricing:** $2,388/year ($199/mo — saves 20%)  
**Ideal for:** Newsroom verification desks, law firm investigation teams, mid-market trust & safety

---

### 🏢 Enterprise — Custom (typically $2,000–$10,000+/month)
*"For organizations requiring dedicated infrastructure and compliance readiness"*

| Parameter | Limit |
|-----------|-------|
| Verifications | Unlimited (with fair-use policy) |
| File size cap | 500 MB per file |
| Users | Unlimited (per-org pricing) |
| All Team features | ✓ |
| Custom integrations & webhooks | ✓ |
| On-premise / private cloud deployment | ✓ |
| Dedicated support engineer | ✓ |
| SLA guarantee (99.9% uptime) | ✓ |
| Audit log exports (SOC 2 compliant, 1-year retention) | ✓ |
| Custom model fine-tuning (domain-specific signals) | ✓ |
| SOC 2 Type II reports provided | ✓ |
| Regional data residency (EU/Asia) | ✓ |
| Volume discounts on API usage | ✓ |
| Custom branding (full white-label) | ✓ |

**Pricing model:** Base platform fee ($2,000/mo) + usage-based pricing ($0.05–$0.50 per verification depending on volume)  
**Ideal for:** Large news organizations, government agencies, enterprise security teams, platform trust & safety

---

### 🔌 API-Only Usage

For developer teams who want to integrate without a dashboard:

| Plan | Price | Requests | Support |
|------|-------|----------|---------|
| API Lite | $0.05/req | Pay-as-you-go | Community |
| API Pro | $199/mo | 5,000 included + $0.03/req overage | Email |
| API Enterprise | Custom | Unlimited | Dedicated engineer |

---

### 1.3 Commercial Logic: Seat-to-Volume Ratios

| Plan | Monthly Revenue | Est. Annual (per customer) | Target Customers (Y1) | Est. Annual Revenue Contribution |
|------|----------------|---------------------------|----------------------|----------------------------------|
| Trial → Pro (20% conversion) | $49 | $588 | 100 paying | $58,800 |
| Team | $249 | $2,988 | 30 | $89,640 |
| Enterprise (base) | $2,000–$5,000 avg | $36,000 | 10 | $360,000 |
| API Pro | $199 | $2,388 | 50 | $119,400 |
| **Total Y1 ARR (target)** | | | | **~$628,000** |

**Y2 Target ARR:** $2.5M (scaling via enterprise + API adoption)  
**Y3 Target ARR:** $8M+ (ecosystem effects from Report Flywheel)

---

## 2. Competitive Landscape Analysis

### 2.1 Competitive Set

| Company | Core Product | Pricing Model | Price Point | Key Weakness (Provance advantage) |
|---------|-------------|---------------|-------------|----------------------------------|
| **Sensity AI** | Deepfake detection (VerifAI) | Enterprise contract only | $50K–$200K+/yr | Black-box scoring, no courtroom-ready reports |
| **Hive AI** | AI-gen detection API | Per-request | ~$0.0015/img | No workflow, no PDF report, score-only |
| **Reality Defender** | Enterprise deepfake detection | Enterprise only | $100K+/yr | Expensive entry point, no self-serve tier |
| **Deepware** | Open-source scanner + API | Free + Enterprise | $0–$50K/yr | Limited signals, no professional report artifact |
| **Truepic (Integrity)** | C2PA provenance capture | Enterprise | Custom | Different problem (capture), not post-hoc verification |
| **AccessData (FTK)** | Digital forensics suite | Per-seat license | ~$1,500/seat/yr | Legacy tooling, no AI-specific signals |
| **Magnet Forensics** | Digital forensics | Per-seat license | ~$2,000/seat/yr | No synthetic media focus |
| **Amper** | Media forensics | Enterprise | Custom | Narrower focus, less workflow-ready |

### 2.2 Market Positioning Map

```
                    HIGH
                     ▲
                     │            ┌─ Reality Defender
                     │            │
                     │   Hive ────┤  Sensity
    PRICE            │            │
    PER              │   Deepware │
    VERIFICATION     │            │
                     │            │
                     │            │
                     │   ┌──── Provance ────┐
                     │   │  (Trial→Pro→Team→Enterprise) │
                     │   └──────────────────────────────┘
                     │
                     └──────────────────────────────────►
                    LOW                      HIGH
                        
                         WORKFLOW READINESS
                   (Scoring → Report → Audit → Compliance)
```

**Key insight:** Provance is uniquely positioned at the intersection of **affordable entry point** and **high workflow readiness**. Competitors force users to choose: cheap but shallow (Hive, Deepware) or expensive and limited-access (Sensity, Reality Defender). No one offers the Trial→Pro→Team→Enterprise ramp with evidence-first forensic reports.

### 2.3 Provance's Differentiation

| Dimension | Competitors | Provance |
|-----------|------------|----------|
| **Verdict format** | Single score (0–100%) | 6-class Veracity Language + evidence breakdown |
| **Report artifact** | None or basic | Full forensic PDF with evidence appendix, methodology versioning, chain-of-custody |
| **Free tier** | Rare / limited | Full-featured 14-day trial (10 verifications) |
| **Uncertainty handling** | Ignores / high-confidence only | "Inconclusive" is a first-class verdict |
| **Courtroom readiness** | No | Report structure designed for admissibility |
| **Self-serve onboarding** | Enterprise-only (sales calls) | Instant signup → dashboard → verification |
| **API + Dashboard** | Usually one or the other | Both, with usage-based + subscription |
| **Transparency** | Proprietary black-box | Explainable signals, methodology versioning |

---

## 3. Investor Narrative (5-Minute Pitch)

### The Hook (30 seconds)

> *"The 2024 elections were the first synthetic media election — and the world wasn't ready. Journalists, lawyers, and security teams were handed 'AI detectors' that returned a number between 0 and 100 with no explanation, no courtroom-ready evidence, and no workflow. That's not trust infrastructure. That's a guessing game with a score.
>
> Provance is the defensible trust layer for synthetic media. We take an image or video, run it through multi-signal forensic analysis, and output a clear verdict with explainable evidence and a downloadable forensic-grade PDF report. Not a black-box score — a defensible answer."*

### The Problem (45 seconds)

Synthetic media is now indistinguishable from authentic capture to the naked eye. The market is flooded with "AI detectors" that:

1. **Return opaque scores** — A journalist can't cite "73% probability of AI generation" in a news article
2. **Refuse to say "I don't know"** — Every detector claims certainty, eroding trust when they're wrong
3. **Produce no transferable artifact** — There's no PDF, no evidence appendix, no chain-of-custody log
4. **Require enterprise sales calls** — Most competitors have no self-serve path, leaving SMB and solo professionals unserved

**The market:** $2.3B in synthetic media detection by 2028 (Gartner), accelerated by regulatory pressure (EU AI Act, US Executive Order on AI, state-level deepfake laws).

### The Solution (60 seconds)

Provance is a verification platform, not a detector. The workflow:

1. **Upload** — Drag-and-drop or paste URL (image or video)
2. **Analyze** — Multi-signal forensic pipeline runs in seconds for images, async for video
3. **Verdict** — One of 6 clear classifications (Authentic → Synthetic), each with explainable evidence breakdown
4. **Export** — Downloadable forensic PDF report with methodology appendix, chain-of-custody, and audit trail

**Key innovation:** We're the first platform to combine:
- Evidence-first verdicts (not scores)
- A forensic-grade report artifact (the product's unit of value)
- Self-serve ramp (Trial → Pro → Team → Enterprise)
- Transparent uncertainty handling ("Inconclusive" is a first-class outcome)

### Why Now (30 seconds)

Three market forces converged:

1. **Regulatory mandate** — EU AI Act requires labeling of AI-generated content. US states passing deepfake disclosure laws. Legal teams need provable methods.
2. **Professional demand** — Newsrooms burned by fake content, law firms seeing deepfake evidence in discovery, security teams fighting AI-generated fraud.
3. **Technical maturity** — Multi-signal forensic analysis has reached production reliability. C2PA standards are gaining adoption. The infrastructure is ready.

### Business Model (30 seconds)

| Tier | Price | Customer |
|------|-------|----------|
| Trial | Free / 14 days | Evaluation |
| Pro | $49/mo ($468/yr) | Solo professionals |
| Team | $249/mo ($2,388/yr) | Newsrooms, legal teams |
| Enterprise | $2K–$10K+/mo | Government, platforms |
| API | $0.05/req – $199/mo | Developer teams |

**Target metrics:**
- Y1 ARR: ~$628K (150 customers)
- Y2 ARR: $2.5M
- Y3 ARR: $8M+
- Gross margin: 70%+ (compute + storage = primary COGS)

### Traction (30 seconds)

- Live website with 5 pages (Home, Product, Methodology, Pricing, Security)
- Forensic Report taxonomy defined (6-class Veracity Language)
- Report Flywheel growth model designed
- Design partner conversations underway
- **Next:** Interactive Signal Visualizer hero + authenticated dashboard beta

### The Team (15 seconds)

- **Product & Engineering:** Seasoned SaaS builders with experience in forensic analysis, AI/ML infrastructure, and secure cloud platforms
- **Design:** Premium editorial & forensic UI expertise
- **Strategy:** Revenue and GTM experience in enterprise security/trust tools

### The Ask (15 seconds)

> *"We're raising a $2M–$5M seed round to:*
> - *Complete the interactive dashboard (Q3 2026)*
> - *Onboard 10–30 design partners across journalism, legal, and trust & safety (Q3–Q4 2026)*
> - *Build the video async processing engine (Q4 2026)*
> - *Launch Enterprise API pilots (Q1 2027)*
> - *Scale to $2.5M ARR by end of Y2"*

### Vision (15 seconds)

> *"When the stakes are real — a newsroom fact-check, a court filing, an election integrity investigation — Provance will be the standard workflow used to decide what's authentic, what's synthetic, and what's uncertain. We're building the trust infrastructure for the age of synthetic media."*

---

## 4. GTM & Distribution Strategy

### 4.1 Phase 1: Design Partner Program (Now — Q4 2026)

**Target:** 10–30 design partners across 4 segments

| Segment | Target Partners | Use Case | Value Exchange |
|---------|----------------|----------|----------------|
| **Journalism** | 5–10 newsrooms (Reuters, AP, BBC verify desks; local investigative outlets) | Verify UGC before publication | Free Pro tier + early access + co-branded case study |
| **Legal** | 3–5 law firms or legal aid orgs | Deepfake evidence in discovery | Free Team tier + "Legal Appendix" feature influence |
| **Trust & Safety** | 3–5 platform security teams (social media, marketplaces) | Content moderation, fraud detection | Free Enterprise pilot + API access |
| **Developers** | 3–5 dev teams building verification tools | API integration for automated pipelines | Free API tier + documentation co-creation |

**Partner benefits:**
- Free highest-tier access for 6 months
- Direct product feedback loop with founding team
- Co-branded case studies and press opportunities
- Named in product credits (with permission)

### 4.2 Phase 2: Organic Growth via Report Flywheel (Q4 2026 — Q2 2027)

- Every exported PDF contains "Verified by Provance" watermark + methodology link
- Journalists cite reports → embedded methodology URL drives discovery
- API integration partners display "Verification by Provance" badge
- Content marketing: "The Provance Forensic Benchmark" — public accuracy comparison vs. generic detectors

### 4.3 Phase 3: Channel Partnerships (Q2 2027+)

- **C2PA Alliance** — Align with Content Credentials standard
- **Legal tech integrations** — Relativity, Everlaw, Logikcull
- **CMS plugins** — WordPress, Contentful for inline verification
- **Social media platform APIs** — Twitter/X, Meta, TikTok verification badges

### 4.4 Content & Thought Leadership

| Asset | Format | Purpose |
|-------|--------|---------|
| "The Provance Forensic Benchmark" | Public report | Comparison vs. competitor detectors |
| Forensic Methodology Whitepaper | Technical PDF | Enterprise procurement enablement |
| "Veracity vs. Detection" blog series | Blog posts | Category creation |
| Sample Forensic Report | Interactive page | Lead magnet on homepage |
| Webinars: "Synthetic Media in the Courtroom" | Live event | Legal segment education |

---

## 5. Financial Projections (Seed Round)

### 5.1 Seed Round: $2M–$5M

**Use of Funds:**

| Allocation | $2M Scenario | $5M Scenario |
|------------|-------------|-------------|
| Engineering (5–8 FTEs) | $900K | $2.2M |
| Design & Product (2–3) | $300K | $750K |
| GTM & Partnerships (2–3) | $300K | $900K |
| Infrastructure (cloud, AI compute) | $200K | $500K |
| Legal & Compliance (SOC 2, IP) | $100K | $250K |
| Operations & Buffer | $200K | $400K |
| **Total** | **$2M** | **$5M** |

### 5.2 Revenue Projections

| Metric | Y1 | Y2 | Y3 |
|--------|----|----|----|
| Pro customers | 100 | 500 | 1,500 |
| Team customers | 30 | 150 | 500 |
| Enterprise customers | 10 | 25 | 75 |
| API customers | 50 | 200 | 600 |
| **Total ARR** | **$628K** | **$2.5M** | **$8.1M** |
| Gross margin | 65% | 72% | 78% |
| Net revenue retention | N/A | 110% | 125% |
| CAC (blended) | $1,200 | $800 | $600 |
| LTV:CAC (blended) | 3.5:1 | 5:1 | 8:1 |

### 5.3 Key Unit Economics

| Tier | CAC | Avg. Monthly Revenue | Payback Period | LTV (3yr) |
|------|-----|---------------------|----------------|-----------|
| Pro | $200 | $49 | 4 months | $1,470 |
| Team | $800 | $249 | 3.2 months | $7,470 |
| Enterprise | $5,000 | $3,000 | 1.7 months | $90,000 |
| API | $150 | $199 (API Pro) | <1 month | $5,970 |

---

## 6. Pilot & Design Partner Plan

### 6.1 Outreach Sequence

1. **Target identification:** Map 50 potential design partners across segments
2. **Warm introduction:** Leverage team networks, industry events, cold outreach with Sample Forensic Report as lead magnet
3. **Pilot program:** Offer 6 months free at highest tier + dedicated support
4. **Feedback loop:** Bi-weekly calls, shared roadmap, feature prioritization input
5. **Case study:** Co-author case study after 3 months of active use
6. **Conversion:** Convert to paying customer at end of pilot (target 50% conversion)

### 6.2 Target Partners for Initial Outreach

**Journalism:**
- Associated Press Verify desk
- Reuters Fact Check
- Bellingcat (investigative journalism)
- Local newsrooms (5–10 regional outlets)
- European fact-checking network members

**Legal:**
- Law firms with digital evidence practice groups
- Legal aid organizations dealing with deepfake evidence
- E-discovery providers (Relativity partner ecosystem)

**Trust & Safety:**
- Mid-market social platforms (not Meta/Twitter — start with smaller platforms)
- Online marketplaces (fraud teams)
- Brand protection agencies

**Developers:**
- Open-source journalism tools (HAR, Alethio)
- Content verification APIs

---

## 7. Key Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| Rapid AI model evolution outpaces detection | High | Medium | Focus on provenance & consistency signals (not model-specific); invest in C2PA alignment |
| Compute costs for video analysis | Medium | High | Usage-based pricing; frame-sampling optimization; GPU spot instances |
| Competitors add workflow/report features | Medium | Medium | First-mover advantage in Workflow+Forensic Report; brand moat via Report Flywheel |
| Regulatory uncertainty | Medium | Medium | Proactive EU AI Act alignment; build for compliance-first positioning |
| "Inconclusive" verdicts frustrate users | Low | Medium | Educate market that uncertainty is honest; make it a trusted signal of integrity |
| Enterprise sales cycles too long for seed-stage | High | Medium | Start with Team tier (self-serve); use design partners to build case studies; typical first enterprise sale in month 7–9 |
| Cash runway < 18 months | High | Low | Capital-efficient build; focus on Pro/Team for early revenue; $2M minimum seed |

---

## Appendix A: Competitive Pricing Reference Table

| Company | Free Tier | Entry Price | Mid Tier | Enterprise | API Pricing |
|---------|-----------|-------------|----------|------------|-------------|
| Hive AI | ✓ (limited) | ~$200/mo | — | Custom | $0.0015/img |
| Sensity AI | ✗ | ~$50K/yr | — | Custom | Not public |
| Reality Defender | ✗ | ~$100K/yr | — | Custom | Not public |
| Deepware | ✓ (OSS) | Free | — | $50K/yr | Free OSS |
| Truepic | ✗ | Custom | — | Custom | Not public |
| **Provance** | **✓ (14-day)** | **$49/mo** | **$249/mo** | **$2K+/mo** | **$0.05/req** |

---

## Appendix B: Key Metrics Dashboard

| KPI | Current | Target (6 months) | Target (12 months) |
|-----|---------|-------------------|--------------------|
| Waitlist signups | 0 | 500 | 2,000 |
| Trial → Pro conversion | N/A | 15–20% | 20% |
| Monthly Active Users | N/A | 100 | 500 |
| Design Partners active | 0 | 10–30 | 15–30 (converting) |
| Paying customers | 0 | 25 | 150 |
| ARR | $0 | $60K | $628K |
| Forensic Reports downloaded | 0 | 500 | 5,000 |
| API requests (monthly) | 0 | 5,000 | 100,000 |
| Report Flywheel referrals | 0 | 10 (from reports) | 200 |

---

*End of Business Strategy Document — Ready for Investor Review*
