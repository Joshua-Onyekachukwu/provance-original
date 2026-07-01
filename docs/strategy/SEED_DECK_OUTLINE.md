# Provance — Seed Deck: Narrative & Content Outline

**Author:** Business Strategy Lead
**Date:** 2026-06-26
**Purpose:** Narrative spine for the Provance Seed Round investor presentation ($2M–$5M)
**Audience:** VC partners, angel investors, family offices

---

## The Narrative Arc

The deck should tell one coherent story: **"The infrastructure for trust in synthetic media doesn't exist. We're building it. Here's why it's urgent, why we win, and how we'll scale."**

Each section builds on the last. The flow moves from **establishing the crisis** → **presenting the solution** → **proving the market** → **demonstrating the business** → **making the ask.**

---

## Section 1: The Problem — The Crisis of Trust in Synthetic Media

**One-line thesis:** *Synthetic media is now indistinguishable from authentic capture, and the tools designed to verify it are not fit for high-stakes decisions.*

### Key Points (3 min)

1. **The scale of the crisis**
   - Generative AI produces photorealistic media indistinguishable from authentic capture
   - $12B lost to deepfake fraud in 2025 (Deloitte)
   - Every major newsroom has had a near-miss with synthetic UGC
   - Courts are seeing deepfake evidence without standards for authentication

2. **The failure of existing tools**
   - Current "AI detectors" return opaque scores — not defensible answers
   - They produce no transferable artifact (no PDF, no evidence appendix, no chain of custody)
   - They never say "I don't know" — false certainty erodes trust
   - They require enterprise sales calls, locking out solo professionals

3. **The gap in the market**
   - The synthetic media detection market will reach $2.3B by 2028 (Gartner)
   - But the market isn't buying "detection" — it's buying *trust* and *defensibility*
   - Regulatory pressure (EU AI Act, US state deepfake laws) is creating compliance buyers

### Visual / Hook
> *Open with a split-screen: a real photo and a synthetic photo. Ask: "Which one is real?" Pause. Reveal both are synthetic. "The human eye can't tell anymore. And the tools that claim to help you? They can't produce evidence you can use."*

---

## Section 2: The Solution — Provance as Trust Infrastructure

**One-line thesis:** *Provance is the first verification platform designed for high-stakes decisions — producing explainable evidence, forensic-grade reports, and audit-ready workflows.*

### Key Points (3 min)

1. **The workflow (simple to explain)**
   - Upload image or video → 5-signal forensic analysis → Clear verdict (6 classes) → Downloadable forensic PDF report
   - Images: <8 seconds. Video: async with real-time progress.
   - No black box — every signal has an explainable breakdown

2. **The six verdict classes (the Veracity Language)**
   - Authentic → Likely Authentic → Inconclusive → Suspicious → Likely Synthetic → Synthetic
   - Each with color-coding, icon, evidence breakdown, and plain-language explanation
   - "Inconclusive" is a first-class verdict — not a failure mode

3. **The report (the unit of value)**
   - Not a screenshot of a score. A structured PDF with:
     - Cover page with report ID, timestamp, methodology version
     - Executive summary with plain-language verdict
     - Signal-by-signal evidence appendix
     - Metadata and chain-of-custody tables
     - Methodology appendix with versioning
     - Citation snippets (APA, MLA, Chicago, Bluebook)

4. **Category positioning**
   - We are NOT an AI detector. We are **trust infrastructure**.
   - Detection tells you a number. Trust infrastructure gives you evidence you can use.
   - This protects us from commoditization — we compete on defensibility, not accuracy scores.

### Visual
> *Show the product flow in 4 clean steps: Upload → Analyze → Verdict → Export. End with the forensic report PDF as the hero image.*

---

## Section 3: The Market — High-Stakes Segments

**One-line thesis:** *Our initial ICP is anyone whose decision about media authenticity has material consequences. We start with four high-willingness-to-pay segments.*

### Key Points (2 min)

1. **Segment 1: Journalism & Media (ICP Priority #1)**
   - Pain: Publishing a fake image destroys credibility. Verification desks need defensible answers.
   - Willingness to pay: $49–$249/mo (cost of a fact-check subscription)
   - Scale: 10,000+ newsrooms globally with dedicated verification workflows
   - Case study: AP Verify desk, Reuters Fact Check, Bellingcat

2. **Segment 2: Legal & Investigations (ICP Priority #2)**
   - Pain: Deepfake evidence appearing in discovery. No standard for authentication.
   - Willingness to pay: $249–$3,000+/mo (one hour of attorney time)
   - Scale: Every law firm handling digital evidence — rapidly growing need
   - Case study: Digital evidence practice groups at AmLaw firms

3. **Segment 3: Enterprise Trust & Safety (ICP Priority #3)**
   - Pain: Deepfake fraud, impersonation, content moderation at scale
   - Willingness to pay: $2K–$10K+/mo (fraction of fraud loss)
   - Scale: Every platform, marketplace, and brand with online presence
   - Case study: Mid-market social platforms, fraud teams at fintech

4. **Segment 4: Developers (ICP Priority #4)**
   - Pain: Building verification in-house is expensive and slow
   - Willingness to pay: $0.05/req – $199/mo
   - Scale: Thousands of teams building AI-powered tools

### TAM Breakdown
| Segment | TAM (2028) |
|---------|-----------|
| Synthetic media detection | $2.3B |
| Digital forensics | $4.8B |
| Trust & safety platforms | $6.1B |
| **Provance addressable** | **~$3.5B** |

### Visual
> *Four-quadrant grid showing each segment with pain point, willingness to pay, and target price.*

---

## Section 4: Business Model — The SaaS + API Flywheel

**One-line thesis:** *We capture value through a tiered subscription model, with the forensic report as the unit of value and the API as the scale engine.*

### Key Points (3 min)

1. **Four-tier SaaS model**

| Tier | Price | Users | Verifications | Key Features |
|------|-------|-------|---------------|-------------|
| Trial | $0 (14d) | 1 | 10 | Full features, watermarked reports |
| Pro | $49/mo | 1 | 100/mo | Unwatermarked, 1K API req |
| Team | $249/mo | 5 | 1K/mo shared | SSO, RBAC, batch, white-label |
| Enterprise | $2K–$10K+/mo | Unlimited | Unlimited | On-premise, SLA, dedicated engineer |

2. **API pricing**
   - API Lite: $0.05/req (PAYG)
   - API Pro: $199/mo (5K req included)
   - Enterprise API: Custom

3. **The Phase 1.0 Beta Flywheel**
   - 20 design partners recruited from target segments
   - 6 months free access → conversion to paid at M7
   - Target conversion: 40% Pro, 20% Team (from journalism segment)
   - Refined Y1 revenue: ~$182K (conservative — accounts for beta discounts and ramp)

4. **Unit economics**

| Tier | CAC | Monthly Rev | Payback | LTV:CAC |
|------|-----|-------------|---------|---------|
| Pro | $200 | $49 | 4 mo | 7.4:1 |
| Team | $800 | $249 | 3.2 mo | 9.3:1 |
| Enterprise | $5,000 | $3,000 | 1.7 mo | 18:1 |

5. **Revenue trajectory**
   - Y1: ~$182K (beta-informed, realistic base case)
   - Y2: ~$2.3M (post-beta acceleration)
   - Y3: ~$7.3M (enterprise + API scale)

### Visual
> *Simple pricing comparison table + ARR growth chart (Y1→Y2→Y3).*

---

## Section 5: The Team — Forensic & AI Expertise

**One-line thesis:** *We combine deep expertise in forensic analysis, AI/ML infrastructure, and enterprise SaaS to build the trust layer for synthetic media.*

### Key Points (1 min)

1. **Core team composition**
   - Product / Architecture: Deep experience in forensic analysis methodology and product vision
   - AI/ML: Signal model development, dataset operations, model evaluation
   - Engineering: Full-stack, platform, and secure infrastructure
   - Design: Editorial UI, forensic UX, premium brand
   - Business: Revenue model, GTM, investor relations, partnerships

2. **Why this team wins**
   - We understand both the **technical** (multi-signal forensics, attribution graphs) and the **commercial** (tiered SaaS, design partner conversion)
   - We've designed the product from day one for courtroom-ready output — not as an afterthought
   - We're building category-defining infrastructure, not a feature

3. **Seed hiring plan (5–8 FTEs)**
   - ML Engineer (signal model development)
   - Full-Stack Engineer (dashboard + API)
   - Platform/Backend Engineer (async processing, infrastructure)
   - Customer Success / Solutions Engineer (enterprise onboarding)
   - Part-time SOC 2 / Compliance consultant

### Visual
> *Small team photo or avatar grid with role and 1-line expertise.*

---

## Section 6: The Ask — Seed Round Targets

**One-line thesis:** *We're raising $2M–$5M to complete the product, onboard design partners, and scale to our first enterprise customers.*

### Key Points (2 min)

1. **The round**
   - Amount: $2M–$5M
   - Instrument: Post-money SAFE with cap, or priced round
   - Target cap/valuation: $12M–$15M cap ($8M–$10M pre for priced)
   - Target investors: AI infrastructure, trust & safety, legal-tech, enterprise security funds

2. **Use of funds ($3M scenario)**

| Allocation | Amount | % |
|------------|--------|---|
| Engineering (5 FTEs, 18 months) | $1,350,000 | 45% |
| Design & Product (2 FTEs) | $450,000 | 15% |
| GTM & Partnerships (2 FTEs) | $540,000 | 18% |
| Infrastructure (cloud, AI compute) | $300,000 | 10% |
| Legal & Compliance (SOC 2, IP) | $180,000 | 6% |
| Operations & Buffer | $180,000 | 6% |

3. **Milestones to Series A**

| Milestone | Metric | Target Date |
|-----------|--------|-------------|
| Design partner activation | 15+ active | M3 (Sep 2026) |
| First paid conversion | 5+ beta→paid | M5 (Nov 2026) |
| First enterprise deal | $2K+/mo | M6 (Dec 2026) |
| $10K MRR | Revenue milestone | M9 (Mar 2027) |
| 20% trial conversion | Efficiency | M12 (Jun 2027) |
| $300K ARR run rate | Series A ready | M18 (Dec 2027) |

4. **Path to next round**
   - Series A ($8M–$12M) at $3M–$5M ARR
   - Target: 2–3x multiple on ARR
   - Timeline: 12–18 months post-seed close

### Visual
> *Clean use-of-funds pie chart + milestone timeline.*

---

## Closing Vision Slide

**One-line thesis:** *When the stakes are real, Provance is the standard.*

> *"When the stakes are real — a newsroom fact-check, a court filing, an election integrity investigation — Provance is the workflow used to decide what's authentic, what's synthetic, and what's uncertain. Backed by evidence. Ready for the record."*

**The long game:**
- Phase 1 (2026): Image verification, forensic report, design partners
- Phase 2 (2027): Video API, team workflows, enterprise contracts
- Phase 3 (2028–29): Browser extension, C2PA integration, mobile field tool
- Phase 4 (2030+): Real-time verification API, platform partnerships

---

## Appendix: Key Data Points for Investor Conversations

| Topic | Data Point | Source |
|-------|------------|--------|
| Market size | $2.3B synthetic media detection by 2028 | Gartner |
| Deepfake fraud | $12B lost in 2025 | Deloitte |
| EU AI Act fines | Up to 7% of global revenue | EU Commission |
| SaaS pricing benchmark | $49–$249/mo for professional tools | Industry |
| Trial conversion (SaaS avg) | 15–25% | Recurly benchmark |
| Gross margin target | 65–79% | Our model |
| Seed round | $2M–$5M | Our ask |
| Breakeven | Month 22–24 | Our model |
| Design partner target | 20 orgs | Our plan |

---

*End of Seed Deck Narrative Outline*
*Use this as the story spine for all investor presentations*