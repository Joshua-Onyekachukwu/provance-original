# Provance — Investor Pitch Deck

**Seed Round: $2M–$5M**
**Category: Trust Infrastructure for Synthetic Media**
**Date: 2026-06-25**
**Author: Business Strategy Lead**

> Current-state note. Updated 2026-07-07.
>
> This deck is an investor narrative document and includes future-state product claims.
>
> Before using it as an execution reference, align it with current MVP reality:
> - current product is image-first
> - authenticated dashboard, uploads, history, and report detail foundations are already live
> - PDF export, share links, citation tooling, public packaging tiers, and video parity are not shipped yet

---

## Slide 1: Title

# Provance

### Trust Infrastructure for Synthetic Media

*Explainable verification. Forensic evidence. Enterprise workflow.*

**Seed Round – $2M to $5M**

---

## Slide 2: The Problem — Trust Has Not Kept Pace With Generation

Synthetic media is now indistinguishable from authentic capture to the naked eye. The tools that exist to verify it are not designed for high-stakes decisions.

**The four failures of current "AI detectors":**

| Failure | What It Means |
|---------|---------------|
| **Opaque scores** | "73% likely AI" is not a defensible answer. Journalists can't cite it. Lawyers can't admit it. |
| **False certainty** | Most detectors never say "I don't know." They return confident-looking numbers regardless of quality. |
| **No artifact** | There is no PDF, no evidence appendix, no chain-of-custody log. Nothing to file, cite, or share. |
| **No self-serve** | Enterprise sales calls for every prospect. Solo professionals and small teams are locked out. |

**Cost of failure:** A newsroom publishes a fake image. A court admits fraudulent evidence. A security team misses a deepfake impersonation. A platform fails a regulatory audit.

---

## Slide 3: Why Now — Three Forces Converge

### 1. Regulatory Mandate
- **EU AI Act** — Requires labeling of AI-generated content. Non-compliance fines up to 7% of global revenue.
- **US State Laws** — California, New York, Texas passing deepfake disclosure laws. Legal teams need provable methods.
- **C2PA Standard** — Coalition for Content Provenance and Authenticity gaining industry adoption.

### 2. Professional Demand
- Newsrooms burned by viral fakes. Reuters, AP, AFP all have dedicated verification desks.
- Law firms seeing deepfake evidence in discovery. New "digital evidence practice groups" forming.
- Security teams fighting AI-generated fraud — $12B lost to deepfake fraud in 2025 (Deloitte).

### 3. Technical Maturity
- Multi-signal forensic analysis (pixel, metadata, generative fingerprint, compression, C2PA) has reached production reliability.
- GPU costs declining. Frame-sampling algorithms efficient enough for video at scale.
- Foundation models (CLIP, DINOv2) provide strong feature extractors for forensic comparison.

**Market timing:** The window is now. Regulation creates compliance buyers. High-profile deepfake incidents create urgency. The technical stack is ready.

---

## Slide 4: The Solution — Defensible Verification, Not Detection

Provance is a **verification platform**, not a detector. The user workflow:

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ UPLOAD  │───▶│ ANALYZE  │───▶│ VERDICT   │───▶│ EXPORT   │
│ Image   │    │ 5 signals│    │ 6 classes │    │ Forensic │
│ or Video│    │ parallel │    │ + evidence│    │ PDF      │
└─────────┘    └──────────┘    └───────────┘    └──────────┘
```

### The Output: A Forensic Report

| Component | Purpose |
|-----------|---------|
| Cover page | Report ID, timestamp, methodology version |
| Executive summary | Plain-language verdict with confidence |
| Signal breakdown | Per-signal findings (expandable) |
| Metadata appendix | EXIF, file hash, size, provenance |
| Methodology appendix | Signal versions, model IDs, thresholds |
| Chain-of-custody | Who handled the file, when, how |
| Citation snippets | APA, MLA, Chicago, Bluebook |

### The Six Verdict Classes

| Class | Label | Color |
|-------|-------|-------|
| Authentic | Authenticity Confirmed | Green |
| Likely Authentic | Authenticity Probable | Teal |
| Inconclusive | Evidence Insufficient | Gray |
| Suspicious | Artifacts Detected | Amber |
| Likely Synthetic | Synthetic Generation Probable | Orange |
| Synthetic | Synthetic Generation Confirmed | Red |

**Key differentiator:** "Inconclusive" is a first-class, respected verdict — not a failure mode.

---

## Slide 5: Product Demo — How It Works

### Step 1: Upload
- Drag-and-drop or paste URL
- Instant confirmation (<500ms)
- Supported: JPEG, PNG, WebP, GIF (images); MP4, MOV, WebM (video)
- Max: 50MB (Pro), 500MB (Enterprise)

### Step 2: Analysis (Progressive Disclosure)
```
┌── Signal Pipeline ──────────────────────────────┐
│  ✅  Metadata Forensics              0.4s       │
│  ✅  Pixel/Frequency Analysis         1.2s       │
│  ⏳  Generative Fingerprint            63%       │
│  ⏳  Compression Artifacts             Pending   │
│  ⏳  C2PA Verification                 Pending   │
└──────────────────────────────────────────────────┘
```
- Images: Near-instant (<8s P95)
- Videos: Async job model with clear ETA

### Step 3: Verdict & Evidence
- Color-coded verdict banner
- Expandable signal scorecards
- Executive Summary ↔ Forensic Detail toggle
- "Download Report" always visible

### Step 4: Export
- PDF forensic report
- Share link (time-limited, revocable)
- Citation copy (4 formats)
- JSON export (API users)

---

## Slide 6: Why We Win — The Trust Gap

Black-box detectors fail on four dimensions. Provance wins on every one.

| Dimension | Black-Box Detectors | Provance |
|-----------|-------------------|----------|
| **Epistemology** | "Trust us, it's 94.7%" | Explainable signal-by-signal evidence |
| **Admissibility** | Screenshot of a score | Forensic PDF with chain-of-custody |
| **Honesty** | Never says "I don't know" | "Inconclusive" is first-class verdict |
| **Access** | Enterprise-only, sales call | Self-serve Trial → Pro for $49/mo |

### Positioning: We Are Not "Better Detection"

We are **building a new category**: *Defensible Verification* vs. *AI Detection*.

| | AI Detection | Defensible Verification |
|---|---|---|
| **Output** | Score (0–100%) | Verdict class + evidence |
| **Artifact** | None / screenshot | Forensic PDF report |
| **Uncertainty** | Ignored | First-class ("Inconclusive") |
| **Audience** | Technologists | Journalists, lawyers, security teams |
| **Buying motive** | Curiosity | Legal defense, publication, compliance |

**This protects us from commoditization.** If we compete on accuracy scores, it's a race to zero. If we compete on trust, workflow, and defensibility, it's a premium market.

---

## Slide 7: Market Opportunity

### Total Addressable Market

| Segment | TAM (2028 est.) | Growth Driver |
|---------|----------------|---------------|
| Synthetic media detection | $2.3B (Gartner) | AI-generated content proliferation |
| Digital forensics | $4.8B (MarketsandMarkets) | Legal discovery, investigations |
| Trust & safety platforms | $6.1B (Grand View) | Platform regulation |
| Fraud prevention | $45B (Juniper) | Deepfake fraud, identity theft |

**Provance addressable market:** ~$3.5B (intersection of verification + workflow + compliance)

### Initial ICP Priority

| Priority | Segment | Pain | Willingness to Pay |
|----------|---------|------|-------------------|
| 1 | Journalism/Media | Publish fake → reputational damage | Moderate |
| 2 | Legal/Investigations | Admit fake evidence → case dismissal | High |
| 3 | Enterprise Trust & Safety | Deepfake fraud → financial loss | High |
| 4 | Developers | Building verification internally → expensive | Moderate |

### Go-to-Market Motion
1. **Credibility-led** — Benchmark reports, methodology content, sample forensic report
2. **Founder-led** — Direct outreach to 30-50 target organizations for design partner pilots
3. **Product-led** — Self-serve Trial → Pro conversion; API documentation

---

## Slide 8: Business Model

### Pricing Tiers

| Tier | Price | Monthly Verifications | Users | Key Features |
|------|-------|---------------------|-------|-------------|
| **Trial** | $0 (14 days) | 10 total | 1 | Watermarked reports, no API |
| **Pro** | $49/mo | 100 | 1 | Unwatermarked, 1K API req, 90-day history |
| **Team** | $249/mo | 1K (shared pool) | 5 + $30/seat | SSO, RBAC, batch, white-label |
| **Enterprise** | $2K-$10K+/mo | Unlimited | Unlimited | On-premise, SLA, dedicated engineer |
| **API Lite** | $0.05/req | PAYG | — | Pay-as-you-go |
| **API Pro** | $199/mo | 5K + overage | — | $0.03/req overage |

### Annual Discount
- All tiers: 20% discount for annual billing
- Pro: $468/yr ($39/mo)
- Team: $2,388/yr ($199/mo)

### Unit Economics

| Tier | CAC | Monthly Revenue | Payback | LTV (3yr) |
|------|-----|----------------|---------|-----------|
| Pro | $200 | $49 | 4 months | $1,470 |
| Team | $800 | $249 | 3.2 months | $7,470 |
| Enterprise | $5,000 | $3,000 avg | 1.7 months | $90,000 |
| API Pro | $150 | $199 | <1 month | $5,970 |

### Pricing Philosophy
- Price to **decision value**, not compute cost
- $49/mo = "one journalist fact-check subscription" (easy budget item)
- $249/mo = "one hour of attorney time" (trivial for law firms)
- Enterprise = base + usage — captures compliance premium

---

## Slide 9: Revenue Projections (3-Year Model)

### Annual Recurring Revenue Build

| Metric | Y1 (2027) | Y2 (2028) | Y3 (2029) |
|--------|-----------|-----------|-----------|
| Pro customers | 100 | 500 | 1,500 |
| Team customers | 30 | 150 | 500 |
| Enterprise customers | 10 | 25 | 75 |
| API Pro customers | 50 | 200 | 600 |
| **Total customers** | **190** | **875** | **2,675** |

### Revenue by Stream

| Stream | Y1 | Y2 | Y3 |
|--------|----|----|----|
| Pro subscriptions | $58,800 | $294,000 | $882,000 |
| Team subscriptions | $89,640 | $448,200 | $1,494,000 |
| Enterprise contracts | $360,000 | $1,080,000 | $3,240,000 |
| API Pro revenue | $119,400 | $477,600 | $1,432,800 |
| API Lite (PAYG) | $5,000 | $50,000 | $250,000 |
| **Total ARR** | **$632,840** | **$2,349,800** | **$7,298,800** |

### Gross Margin

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Revenue | $632,840 | $2,349,800 | $7,298,800 |
| COGS (compute + storage) | $221,494 | $657,944 | $1,605,736 |
| **Gross margin** | **65%** | **72%** | **78%** |

### Net Revenue Retention
- Y1: N/A (new customers only)
- Y2: 110% (expansion in existing accounts)
- Y3: 125% (enterprise upsell + API volume growth)

---

## Slide 10: Traction

### What's Built (June 2026)

| Asset | Status |
|-------|--------|
| Marketing website (5 pages) | ✅ Live on port 3000 |
| Brand identity & design system | ✅ Ratified |
| Veracity Language (6-class taxonomy) | ✅ Defined |
| Report Flywheel (growth model) | ✅ Designed |
| Pricing & Security pages | ✅ Live |
| Product & Methodology pages | ✅ Live |
| Revenue model (4-tier + API) | ✅ Ratified |
| Business strategy document | ✅ Filed |
| Investor narrative | ✅ Drafted |

### In Progress
- Interactive Signal Visualizer (hero redesign)
- Authenticated dashboard (MVP)
- Video async processing engine
- Design partner outreach program
- Sample Forensic Report interactive page

### Design Partner Pipeline
- Target: 10–30 design partners across 4 segments
- Journalism: AP Verify, Reuters Fact Check, Bellingcat identified
- Legal: Digital evidence practice groups at law firms
- Trust & Safety: Mid-market social platforms, fraud teams
- Developers: Open-source journalism tools

### Upcoming Milestones

| Milestone | Target Date |
|-----------|-------------|
| Interactive dashboard beta | Q3 2026 |
| First 5 design partners active | Q3 2026 |
| Video async processing | Q4 2026 |
| Enterprise API pilots | Q1 2027 |
| First paying customer | Q4 2026 |
| $60K ARR run rate | Q2 2027 |

---

## Slide 11: Competitive Landscape

### Competitive Set

| Company | Focus | Entry Price | Weakness (Provance Advantage) |
|---------|-------|-------------|-------------------------------|
| **Hive AI** | API detection, moderation | ~$0.0015/img | Score-only, no report artifact |
| **Sensity AI** | Enterprise deepfake monitoring | $50K+/yr | Expensive entry, black-box scoring |
| **Reality Defender** | Enterprise channel security | $100K+/yr | No self-serve, compliance focused |
| **Deepware** | Open-source detection | Free/$50K | Limited signals, no workflow |
| **Truepic** | C2PA provenance capture | Custom | Different problem (capture, not post-hoc) |

### Positioning Map

```
                    HIGH
                     ▲
                     │            ┌─ Reality Defender
                     │            │
   PRICE             │   Hive ────┤  Sensity
   PER               │            │
   VERIFICATION      │   Deepware │
                     │            │
                     │   ┌──── Provance ─────┐
                     │   │  ($0→$49→$249→$2K) │
                     │   └────────────────────┘
                     └──────────────────────────────────►
                    LOW                      HIGH
                         WORKFLOW READINESS
```

**Key insight:** Provance uniquely combines affordable entry + evidence-first workflow. No competitor spans Trial→Pro→Team→Enterprise with forensic-grade output.

---

## Slide 12: Technology & Moat

### Multi-Signal Architecture

| Signal | Weight | What It Detects |
|--------|--------|-----------------|
| Generative Fingerprint Detection | 35% | Matches against known generative models |
| Pixel/Frequency Analysis | 25% | Statistical anomalies in pixel distribution |
| Metadata Forensics | 20% | EXIF inconsistencies, tampering history |
| Compression/Artifact Analysis | 10% | Unusual compression signatures, splicing |
| C2PA / Content Credentials | 10% | Cryptographic provenance verification |

### The Moat (4 Layers)

1. **Data Loop** — Every upload improves detection without compromising privacy. Proprietary labeled dataset of synthetic vs. authentic media grows with each scan.

2. **Attribution Graph** — Fingerprint database mapping generative artifacts to specific model families (Midjourney, DALL-E, Stable Diffusion, etc.). Harder to replicate than generic detection.

3. **Workflow Lock-In** — Teams import their history, reports, audit logs. Switching costs increase with every exported report.

4. **Trust Credibility** — Published benchmark methodology, transparent uncertainty handling, chain-of-custody standards. Reputation is a moat that cannot be bought.

---

## Slide 13: Team

### Core Team Requirements

| Role | Priority | Notes |
|------|----------|-------|
| Founder / Product Architect | ✅ In place | Product vision, forensic methodology |
| ML Engineer | ⬜ Seed hire | Signal model development, dataset ops |
| Full-Stack Engineer | ⬜ Seed hire | Dashboard, API, workflow layer |
| Backend / Platform Engineer | ⬜ Seed hire | Async processing, infrastructure, security |
| Product Designer | ✅ In place | Editorial UI, forensic UX, brand |
| Business / GTM Lead | ✅ In place | Revenue model, investor relations, partnerships |

### Seed Round Hiring Plan
- Hires 5–8 FTEs in first 12 months
- Engineering: ML engineer, full-stack, platform
- GTM: Customer success / solutions engineer
- Compliance: Part-time SOC 2 consultant

---

## Slide 14: Financial Summary

### Use of Funds ($3M scenario)

| Allocation | Amount | % |
|------------|--------|---|
| Engineering (5 FTEs) | $1,350,000 | 45% |
| Design & Product (2) | $450,000 | 15% |
| GTM & Partnerships (2) | $540,000 | 18% |
| Infrastructure (cloud, AI compute) | $300,000 | 10% |
| Legal & Compliance (SOC 2, IP) | $180,000 | 6% |
| Operations & Buffer | $180,000 | 6% |
| **Total** | **$3,000,000** | **100%** |

### Key Financial Metrics

| Metric | Y1 | Y2 | Y3 |
|--------|----|----|----|
| ARR | $632K | $2.3M | $7.3M |
| Gross margin | 65% | 72% | 78% |
| Net revenue retention | — | 110% | 125% |
| CAC (blended) | $1,200 | $800 | $600 |
| LTV:CAC (blended) | 3.5:1 | 5:1 | 8:1 |
| Employees | 8 | 15 | 25 |
| Monthly burn | $125K | $200K | self-sustaining |

### Path to Next Round
- Milestone: $500K+ ARR, 25+ paying customers, 3 enterprise pilots, benchmark published
- Next round: Series A ($8M–$12M) at $3M–$5M ARR

---

## Slide 15: The Ask

# $2M–$5M Seed Round

**Instrument:** Post-money SAFE with valuation cap, or priced round

**Use of Funds:**
1. Complete interactive dashboard + authenticated workflow (Q3 2026)
2. Onboard 10–30 design partners (Q3–Q4 2026)
3. Build video async processing engine (Q4 2026)
4. Launch Enterprise API pilots (Q1 2027)
5. Scale to $2.5M ARR by end of Y2

**Key Milestones to Series A:**
- ✅ 25+ paying customers
- ✅ 3+ enterprise contracts
- ✅ Published forensic benchmark
- ✅ $500K+ ARR run rate
- ✅ SOC 2 Type I in progress

---

## Slide 16: Vision

# The Trust Infrastructure for the Age of Synthetic Media

> *"When the stakes are real — a newsroom fact-check, a court filing, an election integrity investigation — Provance is the standard workflow used to decide what's authentic, what's synthetic, and what's uncertain. Backed by evidence. Ready for the record."*

### The Long Game

| Phase | Timeline | Focus |
|-------|----------|-------|
| Phase 1: Foundation | 2026 | Image verification, forensic report, design partners |
| Phase 2: Scale | 2027 | Video API, team workflows, first enterprise contracts |
| Phase 3: Ecosystem | 2028–2029 | Browser extension, C2PA integration, mobile field tool |
| Phase 4: Infrastructure | 2030+ | Real-time verification API, platform partnerships |

---

## Appendix: Data Room Contents

| Document | Location |
|----------|----------|
| Business Strategy & Revenue Model | `docs/finance/BUSINESS_STRATEGY.md` |
| 3-Year Financial Model | `docs/finance/3-year-financial-model.md` |
| Competition Analysis | `docs/business/competition-analysis-and-positioning-report.md` |
| GTM & Sales Motion | `docs/business/gtm-and-sales-motion-document.md` |
| Product Requirements (Dashboard) | `docs/product/product-requirements-document.md` |
| Report Flywheel | `docs/product/report-flywheel.md` |
| Veracity Language | `docs/product/veracity-language.md` |
| Technical Architecture | `docs/architecture/system-design-document.md` |
| Development Roadmap | `docs/product/development-roadmap.md` |
| Brand Design Spec | `docs/brand/landing-page-strategy-copy-and-conversion-blueprint.md` |
| Investment Memo | `docs/business/investment-memo.md` |
| Cap Table Framework | `docs/business/cap-table-framework.md` |

---

*End of Investor Pitch Deck — Ready for Presentation*
