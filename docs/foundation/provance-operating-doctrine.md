# Provance Operating Doctrine

> Current-state note. Updated 2026-07-07.
>
> This doctrine remains directionally correct. Read references to full image-and-video parity as long-range ambition rather than current shipped scope.
>
> The current MVP is image-first, while preserving an architectural path to future video support.

## Purpose

This document defines the operating philosophy for Provance.

It is meant to answer four questions clearly:

- what we are building
- what winning looks like
- what the next six months should produce
- what we will not compromise, even under pressure

This doctrine should be used as a decision filter across product, engineering, design, GTM, fundraising, and hiring.

## 1. Core Vision

Provance exists to become the **trust infrastructure layer for synthetic media verification**.

That means Provance should not behave like a novelty detector, a consumer toy, or a one-off scoring tool.

The ambition is bigger:

- a platform where users can verify image and video
- a system that explains *why* a result was reached
- a workflow that produces a report another person can review
- an operational layer that serious teams can trust in high-stakes moments

The long-term vision is:

**When the stakes are real, Provance becomes the standard workflow for deciding what is authentic, what is synthetic, and what remains uncertain.**

## 2. Mission

Give high-trust teams the fastest credible way to verify media, understand the evidence, and move forward with a report they can defend.

## 3. What We Are Actually Building

Provance is a unified **image + video verification platform** built around four pillars:

- **Verdict clarity**
  Clear output language including likely synthetic, likely authentic, and uncertain.
- **Explainable evidence**
  Signal-level reasoning, confidence language, uncertainty handling, and visible limits.
- **Report-grade artifact**
  Downloadable forensic-style reports with evidence appendix, metadata, and methodology versioning.
- **Workflow readiness**
  History, audit posture, team workflows, API path, and enterprise integration hooks.

The category is not "AI detector."

The category is:

**verification, evidence, and trust workflow infrastructure**

## 4. Why This Company Should Exist

Synthetic media is becoming easier to produce, faster to distribute, and harder for organizations to assess responsibly.

The pain is not only technical. It is operational.

Teams do not just need a model output. They need:

- something credible enough to review internally
- something fast enough to use under pressure
- something structured enough to share
- something honest enough to admit uncertainty

That gap is where Provance should win.

## 5. Our Strategic Goal

The goal is to build a company that can sit at the center of trust-critical media decisions across:

- journalism and fact-checking
- legal and investigations
- trust and safety
- fraud and impersonation defense
- enterprise risk and security workflows
- API-based verification infrastructure

Provance should aim to become a category-defining company, not a feature.

## 6. The Six-Month Picture

Six months from now, success should look like a serious early platform, not a concept deck.

### 6.1 Product State

We should have a working end-to-end product flow:

- landing page
- auth
- dashboard
- upload
- processing state
- result page
- downloadable report
- scan history

Both media types should exist in-product:

- image verification
- video verification

Video may still be more constrained operationally, but it must be real, usable, and architecturally sound.

### 6.2 Experience Standard

The experience should feel:

- fast
- calm
- premium
- credible
- deliberate

Users should understand what happened, what the result means, and what they can do next.

### 6.3 Trust Standard

Every scan should produce:

- a verdict
- evidence context
- confidence language
- explicit uncertainty handling
- report exportability

The product should already reflect the posture of a high-trust system, even before full enterprise maturity.

### 6.4 Commercial Standard

Within six months, we should have:

- a strong demo narrative
- active design partners
- a small number of paying users, pilots, or signed commercial commitments
- a pricing and packaging story that is coherent
- a clear enterprise path

The commercial proof does not need to be large, but it must be real.

### 6.5 Strategic Moat Direction

Within six months, we should be able to see the beginnings of the moat:

- edge-case learning
- workflow data
- evidence system maturity
- report credibility
- fingerprint and attribution direction

We do not need a finished moat in six months.

We do need evidence that one is forming.

## 7. What Winning Looks Like

Winning does not mean "people like the design."

Winning means:

- serious users trust the outputs enough to use them in real workflows
- the report becomes a signature product asset
- the product is fast enough to fit real operational timelines
- the system is honest enough to preserve trust
- enterprises can clearly see how Provance fits into their workflow stack

## 8. Non-Negotiables

These are the rules we do not break, even when speed or pressure tempt us.

### 8.1 We Do Not Fake Certainty

If the system is uncertain, it must say so.

We will not manufacture false confidence for the sake of cleaner UX or marketing language.

### 8.2 We Are Evidence-First

A score alone is not enough.

Every meaningful output must have visible reasoning, evidence framing, and defensible language.

### 8.3 The Report Is Core Product, Not Decoration

The downloadable report is not a side feature.

It is central to the credibility, differentiation, and enterprise value of the platform.

### 8.4 Speed Cannot Destroy Integrity

We optimize for speed, but not by hiding limits, collapsing nuance, or overstating what the system knows.

### 8.5 Upload Trust Matters

User media must be handled seriously.

Security, retention posture, access control, and privacy-aware architecture are foundational, not later polish.

### 8.6 We Build For Real Workflow Use

Provance must support repeatable decision-making, not one-time curiosity.

That means history, consistency, reportability, and operational clarity matter from the beginning.

### 8.7 We Will Not Position As "Just Another AI Detector"

The market for generic detectors is weak, noisy, and easy to commoditize.

We stay anchored to trust infrastructure, evidence workflows, and defensible verification.

## 9. Product Principles

These principles should guide day-to-day product decisions.

### 9.1 Clarity Over Cleverness

Users should immediately understand what the result means and what the next action is.

### 9.2 Calm Over Noise

The product should feel composed and trustworthy, not flashy or over-animated.

### 9.3 Seriousness Over Hype

Design, copy, and product behavior should communicate maturity and accountability.

### 9.4 Explainability Over Black Box Theatre

We should never hide behind technical mystery when the user needs usable reasoning.

### 9.5 Trust Over Vanity Metrics

We should care more about defensibility, reliability, and repeat usage than superficial engagement.

## 10. Engineering Principles

### 10.1 Architect For Image And Video From The Start

Provance is one product with two verification lanes.

The system should never treat image and video as identical workloads.

### 10.2 Design For Async Reality

Heavy media processing must use queues, job states, and durable orchestration.

### 10.3 Preserve A Real Backend Path

We can use fast-moving tools to accelerate shipping, but we should not build ourselves into a dead-end architecture.

### 10.4 Ship Tested Work

Work should be verified before it is pushed and before it reaches `main`, especially for major development work.

## 11. GTM Principles

### 11.1 Start Where Trust Pain Is Highest

The strongest early users are not casual consumers.

They are teams where false confidence, ambiguity, or slow review create real cost.

### 11.2 Sell The Artifact, Not Just The Model

The report, workflow posture, and explainability layer should carry the commercial narrative.

### 11.3 Earn Enterprise Credibility Early

Even before full enterprise maturity, the product should visibly signal seriousness in:

- security posture
- workflow structure
- documentation
- audit mindset

## 12. Decision Filters

When choosing between roadmap options, use these filters:

1. Does this improve trust?
2. Does this improve evidence quality or evidence communication?
3. Does this strengthen the report artifact?
4. Does this make the workflow more operationally usable?
5. Does this improve speed without weakening integrity?
6. Does this reinforce the moat?
7. Does this help us become infrastructure rather than a feature?

If the answer is "no" to most of those, it is probably not a priority.

## 13. Anti-Goals

Things Provance should explicitly avoid becoming:

- a generic AI detector site
- a gimmicky consumer entertainment product
- a benchmark vanity project with weak workflow utility
- an overbuilt infrastructure stack with no paid usage
- a product that looks polished but is operationally untrustworthy

## 14. Final Doctrine Statement

Provance should be built as a serious trust product for serious decisions.

We win by being:

- faster than manual review
- more credible than black-box detectors
- more usable than forensic tooling that normal teams cannot operate
- more defensible than novelty AI products

If we stay evidence-first, report-first, workflow-ready, and honest about uncertainty, we give ourselves the best chance to build something durable and category-defining.
