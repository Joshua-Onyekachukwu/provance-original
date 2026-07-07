# Provance — Design Partner Beta Program Guide
*Phase 1.0: Landing the First 10 Design Partners*
*Document Owner: Head of Product*
*Revision: 1.0*

> Current-state note. Updated 2026-07-07.
>
> This guide remains useful for design partner planning, but parts of the feature matrix now overstate shipped product scope.
>
> Current shipped reality:
> - sign-in and invite acceptance exist, but public signup and full password reset UX are not complete
> - uploads are currently image-first
> - scan history and report detail views exist
> - PDF export, API keys, batch workflows, video analysis, and advanced settings remain future work

---

## Table of Contents
1. [Program Overview](#1-program-overview)
2. [Phase 1.0 Feature Set (Design Partner MVP)](#2-phase-10-feature-set-design-partner-mvp)
3. [Feature Prioritization Matrix](#3-feature-prioritization-matrix)
4. [Beta Program Structure](#4-beta-program-structure)
5. [Partner Onboarding & Feedback Loops](#5-partner-onboarding--feedback-loops)
6. [3-Month Timeline](#6-3-month-timeline)
7. [Success Criteria & KPIs](#7-success-criteria--kpis)
8. [Risk Register](#8-risk-register)
9. [Appendix: Outreach Templates & Materials](#9-appendix-outreach-templates--materials)

---

## 1. Program Overview

### 1.1 Why Design Partners Before Public Launch

Provance is building **trust infrastructure**. Trust cannot be engineered in a vacuum — it must be earned through real-world use, critical feedback, and iterative hardening. Design partners serve three purposes:

1. **Validate product-market fit** — Do professional users actually complete the workflow? Do they download the report?
2. **Harden the evidence** — Is each signal explanation clear enough for a courtroom? For a newsroom?
3. **Generate social proof** — Case studies, testimonials, and co-branded reports that unlock the next 100 customers.

### 1.2 Program Principles

| Principle | Rationale |
|-----------|-----------|
| **Quality over quantity** | 10 active, engaged partners > 30 silent signups |
| **Segment balance** | 4 segments ensure diverse signal validation |
| **Feedback is the product** | Every bug report, confusion signal, and feature request shapes the roadmap |
| **Conversion is the goal** | Design partners should be willing to pay by month 6 |
| **No cold handoffs** | Every partner has a named contact on the founding team |

### 1.3 Target Partner Mix (First 10)

| Segment | Target | Profile | Primary Use Case |
|---------|--------|---------|-----------------|
| **Journalism** | 4 | Newsroom verification desks, investigative reporters, fact-checking orgs | Verify UGC before publication; cite reports in articles |
| **Legal** | 2 | Law firms with digital evidence practice; e-discovery teams | Authenticate evidence for discovery motions; create court-admissible records |
| **Trust & Safety** | 2 | Mid-market platform security teams; brand protection agencies | Moderate content; detect deepfake fraud; audit media at scale |
| **Developer/API** | 2 | Teams building verification tooling; open-source journalism tools | Integrate verification into automated pipelines |
| **Total** | **10** | | |

---

## 2. Phase 1.0 Feature Set (Design Partner MVP)

### 2.1 Feature Scope Definition

Phase 1.0 is the minimum viable feature set required for design partners to complete a meaningful end-to-end verification workflow. It is NOT the full PRD_DASHBOARD.md — it is the subset that creates value for partners while allowing rapid iteration.

### 2.2 Phase 1.0 Feature Inventory

#### ✅ Included (Must Ship for Partner Beta)

| # | Feature | Source | Description |
|---|---------|--------|-------------|
| F1 | **User Authentication** | PRD §4.1 | Email+password signup/login; JWT session management; password reset |
| F2 | **Dashboard Home** | PRD §4.2 | Scan history list; empty state with "start scan" CTA; credit badge showing remaining scans |
| F3 | **Media Upload** | PRD §4.3 | Single file upload (drag-drop + file picker); URL paste; file validation (type, size, hash) |
| F4 | **Image Analysis Pipeline** | Dev Roadmap Phase 2 | Multi-signal processing (generative fingerprint, pixel/frequency, metadata, compression, C2PA); async status polling |
| F5 | **Processing View** | PRD §4.4 | Progressive signal disclosure; real-time status updates; abort button for long jobs |
| F6 | **Verdict & Evidence Breakdown** | PRD §4.5 | 6-class verdict banner; expandable signal cards with findings; "What This Means" plain-language; methodology footer |
| F7 | **PDF Report Generation** | PRD §4.6 | Cover page + verdict summary + evidence appendix + methodology appendix; unwatermarked for design partners; watermark placeholder "BETA — Methodology vX.Y.Z" |
| F8 | **Scan History** | PRD §4.2 | Persistent history; re-open past results; re-download reports |
| F9 | **Account Settings (Basic)** | PRD §4.7 | Profile (name, email, password); API key generation |

#### ❌ Excluded from Phase 1.0 (After Beta Launch)

| # | Feature | Planned Phase | Rationale for Deferral |
|---|---------|---------------|------------------------|
| F10 | **Video Analysis** | Phase 1.1 | Async video infra is 4-6 weeks of additional engineering; image-only validates core workflow |
| F11 | **Video Zoom Scrubber** | Phase 1.2 | Requires video pipeline; defer until video is working |
| F12 | **Share Links** | Phase 1.1 | Partners can download/share PDFs directly for now |
| F13 | **Citation Export** | Phase 1.1 | Manual cite option in report footer is sufficient for MVP |
| F14 | **Batch Processing** | Phase 2 | Single-file workflow is the unit of value; batching adds queue complexity |
| F15 | **Team Workspaces** | Phase 2 | Individual accounts suffice for partners; team features add auth/RBAC complexity |
| F16 | **White-labeled Reports** | Phase 2 | "Powered by Provance" watermark on reports is fine for beta |
| F17 | **SSO/SAML** | Enterprise | Not needed for 10 design partners |
| F18 | **Email Notifications** | Phase 1.1 | Partners are in active calls; push notifications not needed |
| F19 | **Browser Extension** | Phase 3 | Mobile/web extension is post-PMF scope |
| F20 | **Full Video Scrubber** | Phase 2 | Storyboard-style frame analysis; depends on video pipeline |

### 2.3 Feature Dependencies Map

```
F1 (Auth)
  └── F2 (Dashboard) ──────────────────────── F9 (Settings)
  └── F3 (Upload)
        └── F4 (Analysis Pipeline)
              └── F5 (Processing View)
                    └── F6 (Verdict)
                          └── F7 (PDF Report)
  F2 ──────────────────────────────────────── F8 (History)
```

**Critical Path:** F1 → F3 → F4 → F5 → F6 → F7

---

## 3. Feature Prioritization Matrix

### 3.1 Scoring Methodology

Each feature is scored on two axes:

**Impact (1-5):**
- 5 = Directly enables a partner to complete their job-to-be-done
- 4 = Significantly improves completion quality
- 3 = Nice usability improvement
- 2 = Low usage / edge case
- 1 = No impact on partner workflow

**Effort (1-5):**
- 5 = Weeks of engineering, external dependencies, or infrastructure changes
- 4 = Multiple days, cross-team coordination
- 3 = 1-2 days of focused work
- 2 = Half-day change
- 1 = Configuration or trivial change

**Priority Score = Impact × (6 - Effort)**

This weighting favors high-impact, low-effort features first.

### 3.2 Feature Scorecard

| # | Feature | Impact (1-5) | Effort (1-5) | Priority Score | Priority Tier |
|---|---------|:-----------:|:-----------:|:--------------:|:-------------:|
| F1 | User Authentication | 5 | 3 | 15 | **MUST-HAVE** |
| F2 | Dashboard Home | 4 | 3 | 12 | **MUST-HAVE** |
| F3 | Media Upload | 5 | 3 | 15 | **MUST-HAVE** |
| F4 | Image Analysis Pipeline | 5 | 5 | 5 | **MUST-HAVE** |
| F5 | Processing View | 4 | 2 | 16 | **MUST-HAVE** |
| F6 | Verdict & Evidence Breakdown | 5 | 3 | 15 | **MUST-HAVE** |
| F7 | PDF Report Generation | 5 | 4 | 10 | **MUST-HAVE** |
| F8 | Scan History | 3 | 2 | 12 | **MUST-HAVE** |
| F9 | Account Settings (Basic) | 3 | 2 | 12 | **MUST-HAVE** |
| --- | --- | --- | --- | --- | --- |
| F10 | Video Analysis | 3 | 5 | 3 | NICE-TO-HAVE |
| F11 | Video Zoom Scrubber | 2 | 5 | 2 | NICE-TO-HAVE |
| F12 | Share Links | 3 | 2 | 12 | NICE-TO-HAVE |
| F13 | Citation Export | 2 | 2 | 8 | NICE-TO-HAVE |
| F14 | Batch Processing | 3 | 4 | 6 | NICE-TO-HAVE |
| F15 | Team Workspaces | 4 | 5 | 4 | NICE-TO-HAVE |
| F16 | White-labeled Reports | 2 | 3 | 6 | NICE-TO-HAVE |
| F17 | SSO/SAML | 2 | 4 | 4 | NICE-TO-HAVE |
| F18 | Email Notifications | 3 | 3 | 9 | NICE-TO-HAVE |
| F19 | Browser Extension | 2 | 5 | 2 | NICE-TO-HAVE |
| F20 | Full Video Scrubber | 2 | 5 | 2 | NICE-TO-HAVE |

### 3.3 Must-Have vs. Nice-to-Have Summary

**MUST-HAVE (Phase 1.0) — Ship or delay beta:**

| Priority | Features |
|----------|----------|
| 🏆 **Core Workflow (P0)** | F1 Auth, F3 Upload, F4 Analysis, F5 Processing, F6 Verdict, F7 Report |
| 🔧 **Essential UX (P1)** | F2 Dashboard, F8 History, F9 Settings |

**NICE-TO-HAVE (Post-launch by end of month 2):**

| Priority | Features |
|----------|----------|
| 📋 **Near-term (P2)** | F12 Share Links, F13 Citation Export, F18 Email Notifications |
| 🔭 **Medium-term (P3)** | F10 Video, F14 Batch, F15 Teams |
| 🌌 **Future (P4)** | F11 Scrubber, F16 White-label, F17 SSO, F19 Extension, F20 Full Scrubber |

### 3.4 Build Sequence (Recommended)

| Sprint | Features | Goal |
|--------|----------|------|
| **Sprint 1** (Week 1-2) | F1 Auth + F2 Dashboard + F3 Upload | "User can sign up and upload media" |
| **Sprint 2** (Week 3-4) | F4 Analysis Pipeline + F5 Processing View | "User can see analysis happening" |
| **Sprint 3** (Week 5-6) | F6 Verdict + F7 Report + F8 History | "User can complete the flywheel" |
| **Sprint 4** (Week 7-8) | F9 Settings + Polish + Bug Bash | "Ready for partner onboarding" |
| **Sprint 5** (Week 9-10) | F12 Share Links + F13 Citations + F18 Emails | "First partner-requested additions" |
| **Sprint 6** (Week 11-12) | Partner feedback integration + iteration | "Hardening based on real usage" |

---

## 4. Beta Program Structure

### 4.1 Partner Value Exchange

```
┌─────────────────────────────────────────────────────────┐
│                    PARTNER GETS                          │
├─────────────────────────────────────────────────────────┤
│  • Free Pro/Team tier for 6 months ($49–$249/mo value)  │
│  • Direct access to founding team (Slack channel)        │
│  • Named in product credits (with permission)            │
│  • Co-branded case study / press opportunity             │
│  • Influence on feature roadmap                          │
│  • Priority bug fixes and support                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    PROVANCE GETS                          │
├─────────────────────────────────────────────────────────┤
│  • Real-world usage data (anonymized)                    │
│  • 30-min bi-weekly feedback call                        │
│  • Bug reports + edge cases                              │
│  • Feature priority input                                │
│  • Case study testimonial (mutually agreed)              │
│  • Permission to reference as design partner             │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Partner Tiers

All design partners receive the same base package. "Commitment tier" determines feedback expectations:

| Tier | Feedback Commitment | Best For | Max Partners |
|------|--------------------|----------|-------------|
| **Core** | Bi-weekly 30min call + monthly written feedback + bug reports | Journalists, legal | 6 |
| **Advisor** | Weekly calls + roadmap participation + intro to network | Strategic partners | 2 |
| **Lite** | Monthly written feedback + bug reports | Busy practitioners | 2 |

### 4.3 Program Rules

| Rule | Detail |
|------|--------|
| **Duration** | 6 months (renewable by mutual agreement) |
| **NDA** | Optional — partners can share publicly unless discussing pre-release features |
| **Confidentiality** | Partners agree not to disclose pending features, pricing, or internal metrics |
| **Case study** | Right of first refusal — partner can decline at any time |
| **Termination** | Either party can terminate with 2 weeks notice |
| **Conversion** | At month 5, begin commercial conversation for month 7+ |

---

## 5. Partner Onboarding & Feedback Loops

### 5.1 Onboarding Flow

```
Day -7: Invite email sent
  └── Partner clicks link → creates account (F1)
       └── Welcome email with:
            ├── Link to "Sample Forensic Report"
            ├── Link to 5-min "Quickstart Guide" video
            ├── Slack channel invitation
            └── Calendar link for onboarding call

Day 0: Onboarding call (30 min)
  ├── Product demo: upload → verdict → report
  ├── Define partner's use case
  ├── Agree on feedback cadence
  └── First "mission": Run 3 scans this week

Day 7: Check-in call (15 min)
  ├── Review first 3 scans
  ├── Any confusion or blockers?
  └── Next mission: Integrate into real workflow
```

### 5.2 Feedback Loop Architecture

```
PARTNER → US
  ╔═══════════════════════════════════════════╗
  ║  CHANNEL          │ FREQ     │ OWNER      ║
  ╠═══════════════════════════════════════════╣
  ║  Slack channel    │ Ongoing  │ Head of    ║
  ║  (#design-partners)│          │ Product    ║
  ╠═══════════════════════════════════════════╣
  ║  Bi-weekly call   │ 2 weeks  │ Head of    ║
  ║                   │          │ Product    ║
  ╠═══════════════════════════════════════════╣
  ║  In-app feedback  │ Per use  │ Automated  ║
  ║  (thumbs up/down) │          │            ║
  ╠═══════════════════════════════════════════╣
  ║  Monthly NPS      │ Monthly  │ Head of    ║
  ║  survey           │          │ Product    ║
  ╠═══════════════════════════════════════════╣
  ║  Bug report form  │ As needed│ CTO        ║
  ║  (in-app + Slack) │          │            ║
  ╚═══════════════════════════════════════════╝

US → PARTNER
  ╔═══════════════════════════════════════════╗
  ║  What's shipped  │ Bi-weekly │ Product    ║
  ║  changelog       │           │ Updates    ║
  ╠═══════════════════════════════════════════╣
  ║  Roadmap preview │ Monthly   │ Head of    ║
  ║                  │           │ Product    ║
  ╠═══════════════════════════════════════════╣
  ║  Feature request │ Per request│ Head of    ║
  ║  responses       │           │ Product    ║
  ╚═══════════════════════════════════════════╝
```

### 5.3 Feedback Collection Template

**Bi-weekly call agenda (30 min):**
1. What worked well this sprint? (5 min)
2. What was confusing or blocked you? (10 min)
3. What feature would save you the most time? (5 min)
4. One thing to improve before next call? (5 min)
5. Open discussion (5 min)

**Monthly NPS survey (3 questions):**
- "How likely are you to recommend Provance to a colleague?" (0-10)
- "What is the single biggest improvement we could make?"
- "How has your trust in synthetic media verification changed since using Provance?"

### 5.4 Feedback Triage Process

| Priority | Definition | Response Time | Action |
|----------|------------|---------------|--------|
| 🔴 **Critical** | Blocked workflow, data loss, security | < 4 hours | CTO notified; fix deployed within 24 hours |
| 🟡 **High** | Feature broken, wrong verdict, report error | < 24 hours | Engineering assigned; fix within next sprint |
| 🟢 **Medium** | Usability issue, unclear UX, missing feature | < 1 week | Added to prioritization queue |
| 🔵 **Low** | Nice-to-have, cosmetic, future request | < 1 month | Reviewed in monthly roadmap meeting |

---

## 6. 3-Month Timeline

### 6.1 Phase 1.0 Build Track (Sprints 1-4)

```
WEEK 1-2    │ WEEK 3-4    │ WEEK 5-6    │ WEEK 7-8
════════════╪═════════════╪═════════════╪═════════════
Sprint 1    │ Sprint 2    │ Sprint 3    │ Sprint 4
Auth +      │ Pipeline +  │ Verdict +   │ Settings +
Upload +    │ Processing  │ Report +    │ Polish +
Dashboard   │             │ History     │ Bug Bash
            │             │             │
[------- BUILD: NO PARTNERS YET -------]  [ONBOARD]
```

### 6.2 Partner Onboarding & Iteration (Sprints 5-8+)

```
WEEK 9-10     │ WEEK 11-12   │ WEEK 13-14  │ WEEK 15-16
══════════════╪══════════════╪═════════════╪══════════════
Sprint 5      │ Sprint 6     │ Sprint 7    │ Sprint 8
Share Links + │ Partner      │ Video       │ Video
Citations +   │ feedback     │ Pipeline    │ Scrubber
Notifications │ hardening    │ (async)     │ (v1)
              │              │             │
WAVE 1:       │ WAVE 2:      │ WAVE 3:     │ WAVE 4:
2-3 partners  │ 3-4 partners │ 2 partners  │ 2 partners
onboarded     │ onboarded    │ onboarded   │ onboarded
              │              │             │
[--- ACTIVE DESIGN PARTNER FEEDBACK ---> ]
```

### 6.3 Detailed Week-by-Week

#### Month 1: Build Complete

| Week | Engineering Focus | Product/Partners |
|------|-------------------|-----------------|
| **1** | User auth system (email/password, JWT, session management); Dashboard skeleton; Upload component (drag-drop, URL paste, file validation) | Finalize partner target list; Draft outreach materials; Prepare NDA/agreement templates |
| **2** | Dashboard continue; Upload integration; Basic scan record schema in database | First outreach emails sent (Day 10); Schedule first discovery calls |
| **3** | Image analysis pipeline orchestration (backend); Processing view (polling, progressive signals); Signal result storage | Discovery calls with top 10 prospects; Qualify fit against ICP |
| **4** | Signal processing integration (generative fingerprint, metadata, compression); Processing view polish; Error handling for failed signals | Send partnership agreements to top 5 prospects; Begin onboarding call scheduling |
| **5** | Verdict page (6-class banner, signal cards, expand/collapse); PDF report engine (cover, summary, appendix) | Welcome email sent to first 2-3 partners; Onboarding calls begin |
| **6** | Report engine continue; Scan history (list, re-open, re-download); Integration testing | Check-in calls (Day 7 post-onboarding); First feedback collected |
| **7** | Account settings (profile, password, API keys); Bug fixes; Performance optimization | Iterate on feedback; Fix top 5 issues |
| **8** | **Bug Bash week** — all hands on quality; Edge case testing; Load testing | Second check-in calls; First NPS survey sent |

#### Month 2: Partner Onboarding Wave

| Week | Engineering Focus | Product/Partners |
|------|-------------------|-----------------|
| **9** | Share links (generate, expire, revoke); Citation export (APA, MLA, Chicago) | **Wave 1**: 2-3 partners fully onboarded; First bi-weekly feedback calls |
| **10** | Email notification system (scan complete); Feedback widget (in-app thumbs up/down) | Bug fixes from Wave 1; Roadmap preview shared with partners |
| **11** | Begin video pipeline groundwork (frame extraction, sampling strategy); Async job model | **Wave 2**: 3-4 more partners onboarded; First monthly NPS results analyzed |
| **12** | Video pipeline continue; Frame storage design | Mid-program health check; Adjust scope based on partner feedback |

#### Month 3: Expansion

| Week | Engineering Focus | Product/Partners |
|------|-------------------|-----------------|
| **13** | Video analysis MVP (frame-level classification); Video verdict page | **Wave 3**: 2 partners onboarded (developer/API focus) |
| **14** | Video processing view (frame timeline, async progress) | First case study drafted with Wave 1 partner; Partner spotlight blog post |
| **15** | Video scrubber v1 (basic timeline, frame nav, verdict colors) | **Wave 4**: Final 2 partners onboarded; 10 partner milestone |
| **16** | Polish, bug fixes, performance; Video report appendix; Security audit | End-of-milestone review; Convert top 3 partners to commercial discussion |

### 6.4 Communication Cadence

| Cadence | Channel | Audience | Content |
|---------|---------|----------|---------|
| Daily (standup) | Team Slack | Internal | What we shipped, what broke, what we learned |
| Bi-weekly (call) | Video call | Each partner | Feature demos, feedback collection, questions |
| Bi-weekly (written) | Email / Slack | All partners | "What shipped this sprint" changelog |
| Monthly (survey) | Typeform | All partners | NPS + qualitative feedback |
| Monthly (roadmap) | Google Doc | All partners | What's coming next, how feedback shaped it |
| Quarterly (review) | Video call | All partners | Program results, case study progress, conversion discussion |

---

## 7. Success Criteria & KPIs

### 7.1 Phase 1.0 Completion Criteria (Gate to Phase 1.1)

All must be met:

| # | Criterion | Target | Verifiable By |
|---|-----------|--------|---------------|
| G1 | Auth + Upload + Analysis + Verdict + Report flow complete | End-to-end working | QA sign-off |
| G2 | 10 design partners signed and onboarded | 10 active | Partner agreements signed |
| G3 | Partners have run ≥ 5 scans each | ≥ 50 total scans | Database query |
| G4 | PDF report downloads reflect reality | ≥ 60% of scan results | Download logs |
| G5 | NPS score from partners | ≥ 30 (baseline) | Monthly survey |
| G6 | Top 5 feedback issues addressed | All resolved or in-progress | Feedback tracker |
| G7 | At least 1 case study published | 1 published | Marketing channel |

### 7.2 Key Performance Indicators (Tracked Weekly)

| KPI | Target (End of Month 3) | Why It Matters |
|-----|------------------------|----------------|
| Active design partners | 10 / 10 | Core metric |
| Scans per partner per week | ≥ 3 | Engagement validates need |
| Scan completion rate | ≥ 90% | Technical reliability |
| Time to first verdict (image) | < 10s P95 | Perceived speed |
| Report download rate | ≥ 60% | PDF is unit of value |
| Partner-initiated feature requests | 5-15 / month | Shows deep engagement |
| Bug reports filed | Managed | Early signal quality |
| In-app feedback rating | ≥ 4.0 / 5.0 | Satisfaction proxy |
| NPS (monthly) | ≥ 30 | Net promoter threshold |
| Case studies secured | 2 (in progress) | Social proof for next phase |

### 7.3 Conversion Targets (Month 5-6)

| Metric | Target | Trigger |
|--------|--------|---------|
| Partners willing to continue at Pro ($49/mo) | 4 of 10 | Month 5 conversation |
| Partners willing to continue at Team ($249/mo) | 2 of 10 | Month 5 conversation |
| Partners requesting Enterprise quote | 1 of 10 | Month 5 conversation |
| Case studies published | 2 | End of Month 3 |
| Referrals from partners | 3+ prospects | End of Month 3 |

---

## 8. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|:----------:|:------:|-----------|
| R1 | **Feature delay:** Image pipeline not ready for partner onboarding | Medium | Critical | Trim scope to "3 of 5 signals" for beta; label clearly in UI |
| R2 | **False positive erodes trust:** Partner uploads authentic media, gets "Synthetic" verdict | Medium | Critical | "Inconclusive" default when confidence < 75%; educate partners on reading evidence breakdown |
| R3 | **Partners don't engage:** Signed up but never run a scan | High | High | Mandate first 3 scans during onboarding call; Slack reminders; gamified "mission" system |
| R4 | **Partner churn before case study:** Leaves program before testimonial | Medium | Medium | Set case study expectations in Week 3 of engagement; offer opt-out with no hard feelings |
| R5 | **Competitive pressure:** Competitor announces free tier or report feature | Low | Medium | Double down on evidence quality and methodology versioning — moat is defensibility, not price |
| R6 | **Under-resourced support:** 10 partners overwhelm solo Head of Product | Medium | High | CTO handles technical Slack; delegate Slack monitoring; batch partner questions into weekly FAQ |
| R7 | **Scope creep:** Partners request features outside Phase 1.0 scope | High | Medium | Maintain prioritization matrix; "Roadmap preview" sets expectations; nice-to-haves go to Phase 1.1 |
| R8 | **Security incident:** Partner upload leaks or cross-tenant access | Low | Critical | Ephemeral mode default; signed upload URLs; private-by-design storage; penetration test before Month 2 |
| R9 | **GPT-evolution surprise:** New generative model evades all signals | Low | High | Invest in C2PA/provenance signals that don't depend on model artifacts; publish limitations transparently |

### 8.1 Risk Response Plan

| Trigger | Action | Owner |
|---------|--------|-------|
| Any partner reports wrong verdict | Immediate signal log review within 4 hours | CTO + AI Researcher |
| Partner misses 2 consecutive feedback calls | Check-in email + Slack DM; offer Lite tier | Head of Product |
| Bug report frequency > 3/week | Dedicated bug-fix sprint; pause new feature work | CTO + Engineering |
| NPS drops below 20 | Emergency partner call + root cause analysis | Head of Product + Team |
| Competitor launches similar feature | Internal strategy session; assess response required | Business Strategy Lead |

---

## 9. Appendix: Outreach Templates & Materials

### 9.1 Outreach Email Template

```
Subject: Provance — building the trust infrastructure for synthetic media

Hi [Name],

I'm [Name], Head of Product at Provance. We're building the evidence-first
verification platform for synthetic media — used by journalists, legal
professionals, and trust & safety teams who need defensible answers, not
black-box scores.

I'm reaching out because [specific connection / reason]. We're launching
our Design Partner Program and looking for [segment] teams who:

• Need to verify images quickly and credibly
• Want explainable evidence, not just a score
• Are frustrated that current detectors produce nothing courtroom- or
  newsroom-ready

If this resonates, I'd love to show you what we're building and discuss
whether a design partnership makes sense. Design partners get:

→ Free Pro/Team access for 6 months
→ Direct line to our founding team
→ Influence on the product roadmap

No obligation — just an honest conversation about the problem.

I've attached a sample forensic report so you can see the artifact we produce.

Would you be open to a 20-min call next week?

Best,
[Name]
Head of Product, Provance
```

### 9.2 Partner Agreement Summary (for signature)

```
PROVANCE DESIGN PARTNER AGREEMENT — SUMMARY

Partner: [Organization Name]
Contact: [Name, Title]
Segment: [Journalism / Legal / Trust & Safety / Developer]
Tier: [Core / Advisor / Lite]
Start Date: [Date]
Duration: 6 months

Partner receives:
✓ Free [Pro/Team/Enterprise] tier access for 6 months
✓ Dedicated Slack channel with founding team
✓ Bi-weekly feedback calls
✓ Co-branded case study opportunity
✓ Product credits (opt-in)

Partner agrees to:
✓ Use product in real workflow (min 3 scans/week)
✓ Share honest feedback (positive and negative)
✓ Report bugs and edge cases
✓ Participate in bi-weekly calls (per tier)
✓ Optional: Case study participation (mutually agreed)

Termination: 2 weeks written notice from either party.

Signed: ______________            Date: ______________
Signed: ______________            Date: ______________
```

### 9.3 Welcome Email (Post-Signup)

```
Subject: 🎉 Welcome to the Provance Beta — your first steps

Hi [Name],

Welcome to the Provance Design Partner Program! Here's everything you need
to get started.

1. YOUR ACCOUNT
   Login: [link]
   Your plan: [Pro/Team] — you have [N] scans available

2. YOUR FIRST MISSION
   This week: Run 3 scans using real media you're currently investigating.
   Don't have anything? Try our sample images: [link]

3. QUICKSTART
   - 5-min video guide: [link]
   - Sample forensic report: [link]
   - Methodology overview: [link]

4. STAY CONNECTED
   Slack channel: #design-partners-[segment]
   Onboarding call: [Calendar link]

5. GIVE FEEDBACK
   After each scan, tap 👍 or 👎 in the verdict page.
   Questions? Drop them in Slack (fastest) or email me.

Looking forward to what we'll build together.

Best,
[Name]
Head of Product, Provance
```

### 9.4 Bi-weekly Feedback Call Agenda Template

```
PROVANCE — BI-WEEKLY FEEDBACK CALL
Partner: [Name]
Date: [Date]
Attendees: [Partner] + [Head of Product]

AGENDA (30 min)

1. Wins (5 min)
   What worked well since our last call?
   - [Partner shares]
   - [PM shares recent wins/changes]

2. Puzzles (10 min)
   What was confusing, frustrating, or blocked you?
   - [Specific questions about workflow]
   - [Where did you expect something different?]

3. Feature Requests (5 min)
   If you could change one thing, what would it be?
   - [Partner proposes]
   - [PM notes for prioritization]

4. Product Updates (5 min)
   - What we shipped this sprint
   - What's coming next sprint
   - How partner feedback shaped recent changes

5. Any Other Business (5 min)
   - Next call scheduling
   - Anything else?

NEXT CALL: [Date in 2 weeks]
```

### 9.5 Monthly NPS Survey

```
PROVANCE — MONTHLY PARTNER PULSE

1. How likely are you to recommend Provance to a colleague?
   0 (Not at all) — 1 — 2 — 3 — 4 — 5 — 6 — 7 — 8 — 9 — 10 (Extremely)

2. What is the single biggest improvement we could make?
   [Open text]

3. How has your trust in synthetic media verification changed since using Provance?
   ○ Significantly improved
   ○ Somewhat improved
   ○ No change
   ○ Somewhat decreased
   ○ Significantly decreased

4. Which signal do you find most useful?
   ○ Generative Fingerprint Detection
   ○ Pixel/Frequency Analysis
   ○ Metadata Forensics
   ○ Compression/Artifact Analysis
   ○ C2PA / Content Credentials

5. Anything else you'd like to share?
   [Open text]
```

---

## Appendices

### A. Feature Prioritization Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│              PHASE 1.0 — MUST-HAVE FOR BETA                 │
├─────────────────────────────────────────────────────────────┤
│  Auth │ Upload │ Pipeline │ Processing │ Verdict │ Report   │
│  Dashboard │ History │ Settings                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PHASE 1.1 — NICE-TO-HAVE (SPRINTS 5-8)         │
├─────────────────────────────────────────────────────────────┤
│  Share Links │ Citation Export │ Email Notifications │ Video │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PHASE 2 — DEFERRED                              │
├─────────────────────────────────────────────────────────────┤
│  Video Scrubber │ Batch │ Teams │ White-label │ SSO │ Ext    │
└─────────────────────────────────────────────────────────────┘
```

### B. Partner Contact Log Template

| Partner | Segment | Tier | Onboarded | Week 1 Check | Week 3 Check | NPS M1 | Case Study |
|---------|---------|------|-----------|-------------|-------------|-------|------------|
| Partner A | Journalism | Core | Week 8 | ✅ Done | ✅ Done | 45 | 📝 Drafting |
| Partner B | Legal | Advisor | Week 9 | ✅ Done | ✅ Done | 38 | 🔜 Month 3 |
| Partner C | Developer | Lite | Week 10 | ✅ Done | ⏳ Pending | — | ❌ Opted out |

---

*This Beta Program Guide is a living document. Update feature prioritization based on partner feedback. Migrate to Phase 1.1 when all Phase 1.0 gates are met.*

*Revision: 1.0 | Owner: Head of Product | Last Updated: 2026-06-25*
