# Master Product Blueprint

> Current-state note. Updated 2026-07-07.
>
> This blueprint is still useful for long-range product direction, but several references are historical.
>
> Current implementation updates:
> - the live product identity is `Provance`, not `VerifAI`
> - the repo now includes a real authenticated app, NestJS backend, queue-backed processing path, and deployed infrastructure
> - image-first MVP execution is ahead of broader image-and-video platform parity

## 1. Executive Thesis

Provance is building a trust infrastructure company for the AI-content era. The initial product concept, currently framed as VerifAI, is an explainable forensic verification platform that helps users determine whether images and videos are synthetic, manipulated, or authentic enough for decision-making.

The product should not be positioned as "just another AI detector." It should be positioned as a **decision-support and evidence platform** for environments where confidence, traceability, and explainability matter.

## 2. Product Understanding

### What the product is

An explainable media forensics platform that combines signal analysis, machine learning, metadata inspection, and attribution workflows to generate:

- a verdict
- a confidence score
- evidence-backed reasoning
- chain-of-custody aware reports
- optional API responses for platform and enterprise use

### Who it serves

Primary customer groups:

- Journalists and newsroom verification teams
- Legal professionals, investigators, and expert witness workflows
- Trust and safety teams at platforms and marketplaces
- Enterprises exposed to brand fraud, impersonation, or evidence disputes

Secondary customer groups:

- Developers integrating media verification into products
- Researchers and analysts
- Consumers who need occasional verification

### Core value proposition

Provance helps users make higher-confidence decisions about media authenticity by turning opaque detection into evidence they can inspect, explain, and operationalize.

### Competitive advantages

- Multi-signal detection instead of a single-model verdict
- Explainable outputs rather than black-box scoring
- Model attribution and fingerprint accumulation over time
- Court-oriented reporting and auditability
- Stronger product wedge in legal and verification workflows than commodity moderation tools

### Potential market position

Near term: premium verification platform for high-trust image analysis.

Mid term: API-first verification layer for media workflows, legal evidence support, and enterprise content trust.

Long term: trust infrastructure standard for synthetic media verification and provenance-aware workflows.

### Long-term vision

Become the default verification and evidentiary layer used when AI-generated media may affect public trust, litigation, platform integrity, reputational damage, insurance outcomes, or regulatory scrutiny.

## 3. Problem Definition

### Problem being solved

Synthetic media is improving faster than public trust infrastructure. Most users and institutions cannot reliably determine:

- whether content is synthetic
- whether a result is trustworthy
- why a detector reached its conclusion
- whether the evidence is usable in legal or operational settings

### Why existing solutions are insufficient

- Many tools optimize for headline accuracy, not defensibility.
- Most products do not present evidence in a way that survives scrutiny.
- Legal and enterprise users need workflows, auditability, and documentation, not just scores.
- Consumer tools rarely build durable data moats.

## 4. Customer Segmentation

### Segment 1: Verification Professionals

Includes journalists, fact-checkers, investigators, and analysts.

- Need: fast verification with interpretable evidence
- Pain: false positives damage credibility
- Buying trigger: repeat verification workload and public trust pressure

### Segment 2: Legal and Forensic Workflows

Includes law firms, expert witnesses, compliance teams, and digital evidence consultants.

- Need: defensible reports, audit trails, chain of custody
- Pain: existing tools are hard to present as evidence
- Buying trigger: disputed media in active matters

### Segment 3: Enterprise Trust & Safety

Includes social platforms, marketplaces, fintech compliance teams, and brands.

- Need: API-scale classification, routing, and escalation
- Pain: fraud and impersonation cases scale faster than manual review
- Buying trigger: fraud losses, policy pressure, SLA needs

### Segment 4: Developers and Product Teams

- Need: API and SDK access
- Pain: building ML verification in-house is expensive and slow
- Buying trigger: speed to market

### Segment 5: Consumers

- Need: quick answers
- Pain: low willingness to pay, high support burden
- Buying trigger: virality, media scares, election cycles

## 5. Strategic Positioning

### Category

Explainable synthetic media verification.

### Positioning statement

For organizations and professionals that must verify whether digital media is authentic or AI-generated, Provance provides explainable, evidence-based forensic analysis with reporting and auditability, unlike commodity detectors that only return opaque scores.

### Why this is credible

The concept already has a coherent signal stack, a staged architecture, and a clear strategic wedge. What it lacks today is implementation, dataset operations, and company-grade execution planning, which this blueprint addresses.

## 6. Current State Analysis

### Completed

- High-level vision and category definition
- Initial multi-signal detection concept
- Staged build order from prototype to scale
- Baseline architecture concept using Next.js, FastAPI, Supabase, Redis, and PyTorch
- Early monetization thesis and fundraising framing

### Partially completed

- Technical architecture is drafted but not production-hardened
- Security posture is partially described but incomplete
- Product roadmap exists but is feature-led rather than outcome-led
- Pricing direction exists but is not packaged by segment
- Naming is unresolved between Provance and VerifAI

### Missing

- Implementation codebase
- PRD and formal feature specifications
- TRD and operational architecture detail
- CI/CD, monitoring, and environment strategy
- Governance and compliance framework
- Sales motion and GTM sequencing
- Dataset strategy and annotation operations plan
- Explicit acceptance criteria for launch readiness

### Technical debt identified

- Draft backend flow reads large files into memory
- Auth flow is insufficiently specified for production
- Access controls are incomplete across all entities
- Storage and upload model is not yet optimized for large media
- Legal-grade evidence requirements are implied more than engineered

### Design inconsistencies

- Product identity is split between Provance and VerifAI
- Consumer, legal, and enterprise UX needs are conflated
- No formal design system or interaction model exists
- No landing page or conversion architecture is defined

### Architecture concerns

- Sample system assumes synchronous upload to API, which is weak for large files
- No explicit eventing or orchestration model beyond Celery
- Realtime path is tied too tightly to a specific vendor in the early concept
- Model lifecycle management is postponed too long relative to trust requirements

### Security concerns

- Missing production-grade token verification flow
- No rate limiting, abuse prevention, or malware scanning defined
- No explicit key rotation or secrets management approach
- No documented evidence integrity controls beyond placeholders

### Scalability concerns

- Supabase is suitable early but not for the eventual evidence platform scale
- Video workloads can distort infrastructure cost quickly
- Fingerprint retrieval and retraining pipelines require a clearer data platform plan

## 7. Opportunity Analysis

### Features that strengthen the product

- Chain-of-custody capture from upload to report
- Analyst workspace for case management
- Report builder with confidence notes and evidence appendix
- Team review, escalation, and approval workflows
- API usage analytics and policy routing
- Provenance and C2PA-aware result enrichment

### Areas where competitors are weak

- Legal-grade documentation
- Transparent reasoning
- Productized attribution
- Human review workflow integration
- Open benchmarking credibility

### Opportunities for differentiation

- Become the forensic-grade trust layer, not the cheapest detector
- Own attribution intelligence across model families and versions
- Publish methodology and benchmark evaluation without exposing core IP
- Build a compliance-ready audit posture early

### Potential revenue models

- Self-serve subscription
- Usage-based API pricing
- Enterprise contracts with SLA
- Paid forensic report generation
- Analyst seats and collaboration workflows
- White-label or OEM trust infrastructure

### Growth opportunities

- Browser extension for media verification in the wild
- Plugin ecosystem for CMS, newsroom, and evidence workflows
- Partnerships with law firms, insurers, media houses, and platforms
- Standards participation around provenance and AI content policy

### AI opportunities

- Multi-model ensembling
- Active learning from uncertain cases
- Attribution fingerprint graph
- Report drafting assistance with evidence-grounded explanations
- Analyst copilot for triage and escalation

### Automation opportunities

- Automatic scan deduplication
- Case routing by risk profile
- Threshold-based escalation workflows
- Scheduled rescans when new fingerprints are added
- Customer-facing webhook notifications and compliance logs

## 8. Landing Page Blueprint

### Homepage structure

1. Trust-first hero
2. Social proof and credibility bar
3. How it works in three steps
4. Evidence and explainability section
5. Use-case blocks by segment
6. Product screenshots / workflow previews
7. Pricing preview
8. Security and compliance callout
9. FAQ
10. Primary CTA footer

### Hero section

- Headline: verify media with evidence, not guesswork
- Subheadline: explainable AI-generated media detection for journalists, investigators, platforms, and legal teams
- Primary CTA: `Request Access`
- Secondary CTA: `View Sample Report`

### Navigation

- Product
- Solutions
- Pricing
- API
- Resources
- Documentation
- Blog
- Sign In
- Request Demo

### User journeys

- Visitor to waitlist/demo request
- Visitor to sample report review
- Developer to API docs
- Legal user to forensic report workflow
- Platform buyer to enterprise contact funnel

### Call-to-actions

- Request Demo
- View Sample Report
- Start Free Trial
- Explore API
- Talk to Sales

### Pricing pages

- Free / Trial
- Pro
- Team
- Enterprise / Custom

### Feature pages

- Image Verification
- Video Verification
- Forensic Reports
- Attribution Intelligence
- API & Integrations

### Documentation pages

- Quickstart
- API Reference
- Webhooks
- Security & Compliance
- Methodology
- SDK Guides

### Blog strategy

- Thought leadership on synthetic media trust
- Benchmark reports
- Case studies
- Standards and regulation analysis
- Product updates

### SEO structure

- Category pages for AI image detection, video verification, deepfake evidence, forensic media analysis
- Long-tail content around legal and newsroom verification workflows
- Comparison pages against broad detector categories, not direct trademark-heavy competitor attacks

### Conversion strategy

- Use sample report and methodology content as trust builders
- Separate self-serve and enterprise conversion paths
- Gate premium assets behind qualified lead capture
- Use benchmark content to attract researchers and credibility traffic

## 9. Product Feature Blueprint

### MVP Features

1. Secure media upload
2. Image scan orchestration
3. Core signal ensemble for images
4. Result page with verdict, confidence, and evidence summary
5. User accounts and scan history
6. Basic API endpoint
7. Admin / internal review view

### Core Features

1. Noise fingerprinting and attribution
2. Plain-language explanation layer
3. Team dashboard and scan management
4. Billing and quota controls
5. API keys, usage controls, and webhooks
6. Basic forensic PDF report

### Advanced Features

1. Video analysis pipeline
2. Temporal consistency engine
3. Legal-grade chain-of-custody workflows
4. Analyst review and approval queues
5. Attribution intelligence graph
6. Enterprise SSO, SLA, and audit export

### Future Expansion Features

1. Browser extension
2. Mobile capture verification
3. C2PA and provenance ingestion
4. Continuous retraining platform
5. Policy engine for automated routing
6. OEM / embedded verification services

## 10. Feature Priority Model

### Priority P0

- Dataset program
- Image verification MVP
- Explainable result experience
- Auth and access controls
- Audit logging foundation

### Priority P1

- Attribution
- Billing
- API program
- Team workflows
- Report generation

### Priority P2

- Video
- Browser extension
- Enterprise controls
- Automated retraining

## 11. Business Model Blueprint

### Recommended packaging

- Free Trial: limited scans, watermark report, no API
- Pro: individual analyst / journalist plan
- Team: shared workspace, collaboration, usage controls
- Enterprise: API, SLA, SSO, premium reporting, support

### Revenue quality

Best near-term revenue quality comes from:

1. Team and enterprise subscriptions
2. Usage-based API revenue
3. Paid report generation

Consumer-only monetization should remain acquisition-oriented, not the main forecast base.

## 12. Key Risks

### Strategic risks

- Competing head-on with accuracy-first incumbents too early
- Over-serving consumers at the expense of high-value segments
- Positioning confusion caused by naming mismatch

### Product risks

- False positives erode trust quickly
- Explainability may be harder to standardize than detection
- Users may want definitive answers when uncertainty is the correct outcome

### Technical risks

- Dataset quality and drift
- Video compute cost
- Attribution brittleness as model families evolve

### Legal and operational risks

- Evidence claims outrunning actual defensibility
- Privacy and retention issues around user uploads
- Misuse of output in sensitive contexts without disclaimers

## 13. Recommended Strategic Moves

1. Narrow the launch ICP to journalists, investigators, and legal-adjacent verification teams.
2. Build a trustworthy image MVP before broad video ambition.
3. Prioritize evidence UX and auditability alongside accuracy.
4. Treat fingerprint data collection as a first-class moat program.
5. Resolve naming before public launch.
6. Build enterprise credibility assets early: sample report, methodology page, security posture, benchmark policy.

## 14. Success Definition

### Product success

- Users trust the output enough to act on it
- Uncertain cases are handled responsibly
- The explanation layer is cited as a differentiator

### Business success

- Paid teams adopt the platform for repeat workflows
- Enterprise pilots convert into recurring contracts
- Gross margin remains attractive as usage scales

### Strategic success

- Provance becomes associated with trust, defensibility, and verification rigor
- The fingerprint graph and evidence workflow become durable moats
