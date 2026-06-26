# Provance — Sales Enablement: The "Courtroom Test" Narrative

**Author:** Business Strategy Lead
**Date:** 2026-06-25
**Purpose:** Sales script, objection handling, and competitive positioning for enterprise sales conversations

---

## 1. Core Sales Narrative

### The "Courtroom Test" (Elevator Pitch, 30 seconds)

> *"Every AI detector on the market returns a number. Every single one. But when a judge, editor, or regulator asks *why* that number is what it is — 'How do you know? What signals triggered? What's your methodology? Where's your chain of custody?' — most detectors fail. They can't produce evidence. They can only produce a score.
>
> Provance doesn't give you a score. We run the media through five forensic signals, produce a clear verdict classification, and generate a downloadable forensic PDF report with evidence breakdown, methodology appendix, and chain-of-custody log. We pass the courtroom test because every finding is explainable."

### The Problem Statement (60 seconds)

> *"Synthetic media is now production-grade. You cannot tell the difference with the naked eye. The tools that claim to detect it operate as black boxes — they return a confidence percentage with zero visibility into how that number was derived.
>
> For a journalist trying to verify UGC before publication, that's not a usable answer. '73% likely AI' doesn't belong in a news article.
>
> For a lawyer facing deepfake evidence in discovery, that's not admissible. There's no chain of custody, no methodology appendix, no expert report to file.
>
> For a security team protecting their brand, that's a blind spot. They need audit trails, compliance-ready documentation, and explainable outputs they can defend to their board.
>
> The market is full of detectors. What's missing is trust infrastructure."

### The Solution (60 seconds)

> *"Provance is the verification platform built for high-stakes decisions. Here's how it works:
>
> **Step 1:** Upload the media — drag and drop or paste a URL.
>
> **Step 2:** Our pipeline runs five parallel forensic analyses: metadata forensics, pixel/frequency analysis, generative fingerprint detection, compression artifact analysis, and C2PA provenance verification. For images, this takes seconds. For video, we use an async job model with clear progress indicators.
>
> **Step 3:** You get a verdict — one of six clear classifications from 'Authenticity Confirmed' to 'Synthetic Generation Confirmed' — plus an explainable evidence breakdown showing what each signal found.
>
> **Step 4:** You download a forensic PDF report. This isn't a screenshot. It's a structured document with a cover page, executive summary, signal-by-signal evidence appendix, raw metadata table, methodology appendix with versioning, chain-of-custody log, and citation snippets in four formats.
>
> No other tool in the market produces a report designed for evidentiary use."

---

## 2. Segment-Specific Scripts

### For Journalism / Newsroom Verification Desks

**Hook:**
> *"You've seen what happens when a fake image makes it past the verification desk. The retraction is always quieter than the original spread. Provance gives you a defensible verdict in under 8 seconds — and a PDF you can file alongside your editorial record."*

**Objection: "We already have tools."**
> *"Most newsrooms use a combination of Google reverse image search, EXIF viewers, and — increasingly — one of the API detection tools. But none of those produce a citation-ready artifact. If your editor asks 'can you prove this was AI-generated?' and all you have is a screenshot of a number, that's not proof. Provance gives you a structured, exportable report you can attach to your editorial workflow."*

**Pricing fit:**
- Pro ($49/mo): Solo freelance journalist
- Team ($249/mo): Newsroom verification desk (5 seats)
- Enterprise ($2K+/mo): Major wire service with dedicated verification unit

### For Legal / Investigations

**Hook:**
> *"When opposing counsel introduces digital evidence, you need to be able to challenge it. The problem is, you can't depose an AI detector. If you walk into court with 'this is 87% likely to be fake' and the judge asks 'on what basis?', you have nothing. Provance produces a forensic report that gives you a foundation for admission or exclusion."*

**Objection: "Is this court-admissible?"**
> *"We design our reports to meet the standards for expert evidence under Daubert and Frye. The report includes methodology versioning, chain-of-custody logging, and signal-level explanations. Is every report automatically admissible? That depends on the jurisdiction, the judge, and the expert foundation. But Provance gives you the raw material to lay that foundation — no other detection tool gives you anything close."*

**Pricing fit:**
- Pro ($49/mo): Solo practitioner, one-off cases
- Team ($249/mo): Law firm investigation team
- Enterprise ($2K+/mo): Litigation support departments, e-discovery workflows

### For Enterprise Trust & Safety

**Hook:**
> *"Deepfake fraud isn't hypothetical — it's happening now. Your team needs to verify media at scale, maintain audit trails, and demonstrate compliance. Provance gives you a batch processing workflow, API integration, and SOC 2-ready reporting."*

**Objection: "We have a platform security team."**
> *"Platform teams usually build in-house solutions or integrate with API-first detectors. The problem is scale vs. depth. For high-volume triage, a score-based API works. But for high-severity incidents — the ones that go to legal, PR, or the board — you need audit-grade evidence. Provance gives you both: the API for volume, and the forensic report for escalation."*

**Pricing fit:**
- Team ($249/mo): Small trust & safety team
- Enterprise ($2K+/mo): Platform-level deployment with custom integration

---

## 3. Objection Handling

| Objection | Response |
|-----------|----------|
| **"Your accuracy isn't as good as Hive's on benchmarks."** | "Accuracy benchmarks test one thing: classification. But classification isn't the product — evidence is. A high-accuracy black box is still a black box. Our reports are designed for use in contexts where the answer must be defensible, not just correct. Also, our five-signal methodology gives us transparency that no single-model detector can match." |
| **"Why should I pay $49/mo when I can use <free tool>?"** | "Free tools give you a number. For casual curiosity, that's fine. For professional decisions — publishing, filing, investigating — you need an artifact. The forensic report is the unit of value. If your time is worth more than a few dollars an hour, the report pays for itself on the first use." |
| **"Can I try it before I buy?"** | "Absolutely. Our Trial tier gives you 10 full verifications over 14 days. Full-featured — you get the same multi-signal analysis, same verdict, same forensic report PDF. The only difference is a watermark on the report. No credit card required." |
| **"What about video?"** | "Video is supported now for async processing. Upload your clip, get a queue position and estimated completion time, and receive a notification when your results are ready. For high-resolution or long-form video, Enterprise tier offers batch processing." |
| **"Do you offer on-premise deployment?"** | "For Enterprise customers, yes. We offer private cloud deployment with regional data residency. SOC 2 Type II reports are provided. Ephemeral processing mode is available where files are never written to disk." |
| **"What happens if you're wrong?"** | "We will be wrong sometimes. No detector is perfect. That's why we have six verdict classes, including 'Inconclusive' — we explicitly call out when we're uncertain. We also provide evidence breakdowns so a human expert can validate the finding. We never present false certainty." |

---

## 4. Competitive Battlecards

### vs. Hive AI

| Dimension | Hive | Provance |
|-----------|------|----------|
| Pricing | ~$0.0015/image | $49/mo (100 verifications) to $2K+/mo enterprise |
| Output | Score + model attribution | 6-class verdict + evidence breakdown + PDF report |
| Best for | High-volume moderation | High-stakes verification |
| Weakness | No workflow, no report artifact | — |
| **Provance advantage** | "You can run a million images through Hive and never have a single document you can file. One Provance report gives you more evidence than a thousand Hive scores." |

### vs. Sensity AI

| Dimension | Sensity | Provance |
|-----------|---------|----------|
| Pricing | $50K–$200K+/year enterprise | $0–$10K+/mo with self-serve entry |
| Output | Monitoring dashboard, alerts | Per-item forensic report |
| Best for | Enterprise threat intelligence | High-stakes item-level verification |
| Weakness | No self-serve, long sales cycle, expensive entry | — |
| **Provance advantage** | "Sensity is designed for monitoring at scale. But when you need to answer one question about one piece of media — and defend that answer — Provance is the right tool. Also, you can try Provance today for free. Sensity requires a six-month sales cycle." |

### vs. Reality Defender

| Dimension | Reality Defender | Provance |
|-----------|-----------------|----------|
| Pricing | $100K+/year enterprise | $0–$10K+/mo with self-serve |
| Output | Real-time detection across channels | Post-hoc forensic analysis per item |
| Best for | Enterprise communication security | Media verification, legal, editorial |
| Weakness | High entry cost, channel-focused | — |
| **Provance advantage** | "Reality Defender protects communication channels. Provance protects decisions about individual media items. They're complementary — but if you need a PDF you can file in court, you need Provance." |

---

## 5. Discovery Questions

Use these questions to qualify prospects and identify the right tier:

**For journalism:**
- "How do you currently verify suspicious media before publication?"
- "Have you ever had a near-miss where a fake image almost got published?"
- "What format would your ideal verification result come in?"
- "Is there budget for verification tools at your desk, or is it per-item?"

**For legal:**
- "Have you encountered synthetic media in discovery yet?"
- "How do you currently challenge or authenticate digital evidence?"
- "What would a 'court-ready' report need to include for your jurisdiction?"
- "Are you seeing more deepfake evidence this year vs. last?"

**For trust & safety:**
- "What's your current escalation path for high-severity media incidents?"
- "How do you audit your moderation decisions for compliance?"
- "Are regulators asking about your AI content policies?"
- "What's your current cost per investigation?"

---

## 6. Deal Sizing Guide

| Customer Profile | Recommended Tier | Expected Monthly | Annual Value | Sales Motion |
|-----------------|-----------------|-----------------|-------------|------------|
| Solo journalist | Pro ($49) | $49 | $468 | Self-serve |
| 5-person newsroom | Team ($249) | $249 | $2,388 | Self-serve + quick call |
| Law firm (10 investigators) | Team + add-ons ($399) | $399 | $4,788 | Sales-assisted |
| Mid-market T&S (20 analysts) | Enterprise ($2,000) | $2,000 | $24,000 | Demo + pilot |
| Major news org (50 users) | Enterprise ($5,000) | $5,000 | $60,000 | Pilot + POC |
| Platform (enterprise-wide) | Enterprise ($10,000+) | $10,000+ | $120,000+ | Executive + custom |

---

*End of Sales Enablement Document*