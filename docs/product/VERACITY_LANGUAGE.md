# Provance — The Veracity Language
*Establishing the specific terms, confidence scales, and classification taxonomy*
*Document Owner: Head of Product*
*Revision: 1.0*

## Purpose

The Veracity Language is Provance's standardized taxonomy for communicating media authenticity results. It replaces vague "AI detection scores" with clear, defensible, and legally-appropriate classifications. Every verdict must be:

1. **Honest** — Never overstate confidence. "Uncertain" is a valid, respected outcome.
2. **Explainable** — Every verdict includes a breakdown of *why*.
3. **Consistent** — Same input produces same classification, regardless of context.
4. **Actionable** — The user knows what to do next.

---

## The Six Verdict Classes

Provance uses **6 discrete verdict classes**. There is no numerical score exposed to end users — only the class and its supporting evidence.

| # | Class | Label | Color | Definition | When to Use |
|---|-------|-------|-------|------------|-------------|
| 1 | **Authentic** | Authenticity Confirmed | Green (#16A34A) | Strong forensic evidence supports that the media is authentically captured and not synthetically generated or manipulated. | All signals agree: no generative artifacts, metadata consistent, no tampering detected. |
| 2 | **Likely Authentic** | Authenticity Probable | Teal (#0D9488) | The balance of evidence suggests authentic capture, but some minor signals warrant marginal uncertainty (e.g., missing metadata, slight compression artifacts). | No generative fingerprints found, but metadata is incomplete or non-standard. |
| 3 | **Inconclusive** | Evidence Insufficient | Gray (#6B7280) | Provance cannot reach a confident determination. The media may be too low-resolution, heavily compressed, or contain too few analyzable artifacts. | Signals cancel each other out, or media quality is below analysis threshold. |
| 4 | **Suspicious** | Artifacts Detected | Amber (#F59E0B) | Specific forensic artifacts consistent with synthetic generation or manipulation have been identified, but not at a high-confidence threshold. | One or two signals flag anomalies, but others remain inconclusive. |
| 5 | **Likely Synthetic** | Synthetic Generation Probable | Orange (#EA580C) | Multiple signals strongly indicate synthetic generation or manipulation. High confidence in the finding. | Majority of signals converge on synthetic origin. |
| 6 | **Synthetic** | Synthetic Generation Confirmed | Red (#DC2626) | Overwhelming forensic evidence confirms synthetic generation. Defensible at the highest standard. | All applicable signals return strong positive indicators of synthetic origin. |

---

## Verdict Visual System

The verdict class is always displayed with three elements:

1. **Color Banner** — Full-width banner at top of verdict view, color-coded by class
2. **Icon** — Each class has a unique icon (shield-check for Authentic, magnifying glass for Inconclusive, alert-triangle for Suspicious, etc.)
3. **Short Label + Long Definition** — The label is shown prominently; the definition appears on hover or in the detail view

---

## Confidence Scoring (Internal)

Internally, Provance uses a **weighted multi-signal confidence model**. This is NOT exposed to the user — only the verdict class and evidence breakdown are shown.

### Signal Weights

| Signal | Weight | Description |
|--------|--------|-------------|
| Generative Fingerprint Detection | 35% | Matches against known generative model architectures |
| Pixel/Frequency Analysis | 25% | Statistical anomalies in pixel distribution, frequency domain artifacts |
| Metadata Forensics | 20% | EXIF inconsistencies, missing or tampered metadata, editing history anomalies |
| Compression/Artifact Analysis | 10% | Unusual compression signatures, splicing artifacts |
| C2PA / Content Credentials | 10% | Cryptographic provenance verification (when available) |

### Confidence Thresholds

| Confidence Level | Score Range | Maps To |
|-----------------|-------------|---------|
| Very High | 90-100% | Authentic / Synthetic |
| High | 75-89% | Likely Authentic / Likely Synthetic |
| Moderate | 55-74% | Suspicious / Likely Authentic |
| Low | 30-54% | Inconclusive / Suspicious |
| Insufficient | <30% | Inconclusive |

---

## Verdict Detail Components

Every verdict view includes these mandatory components:

### 1. Verdict Banner
```
┌──────────────────────────────────────────────────────┐
│  🛡️  Authenticity Confirmed                           │
│  Strong forensic evidence supports authentic capture  │
│  Confidence: High (based on 4 of 5 signals)           │
│                                         [Download Report] │
└──────────────────────────────────────────────────────┘
```

### 2. Signal Scorecards

Each signal gets its own card showing:
- **Signal Name** (e.g., "Generative Fingerprint Detection")
- **Status Icon** (✅ Clear / ⚠️ Flagged / ❓ Inconclusive / ❌ Error)
- **Key Findings** (2-3 bullet points with plain-language explanations)
- **Expandable Detail** (raw values, thresholds applied, methodology notes)

### 3. Methodology Footer

Every verdict includes a collapsible footer:
- Analysis engine version
- Signal versions and model IDs
- Timestamp of analysis
- Timezone and geographic context
- Report UUID for cross-referencing

---

## Plain-Language Translations

For non-expert users (journalists, attorneys, compliance officers), each verdict includes a "What This Means" plain-language explanation.

**Example — Suspicious:**
> "Provance found several indicators that are commonly associated with AI-generated or edited media. These findings are not conclusive on their own, but together they suggest the media may have been manipulated. We recommend obtaining the original source file for comparison."

**Example — Inconclusive:**
> "The image provided is too heavily compressed for Provance to reach a confident determination. This does not mean the media is authentic or synthetic — it means our analysis tools cannot find enough data to work with. For best results, upload the highest-quality original file."

---

## Edge Cases & Special Handling

| Scenario | Verdict Class | Rationale |
|----------|--------------|-----------|
| Media too small (<100px) | Inconclusive | Insufficient pixel data for analysis |
| Metadata stripped completely | Likely Authentic (downgraded) | Missing metadata is common in legitimate workflows |
| C2PA signature validates but visual signals flag | Suspicious + C2PA verified note | Content credentials and visual analysis conflict — surface both |
| Video with mixed frames (some authentic, some synthetic) | Suspicious | Frame-by-frame breakdown needed; overall verdict reflects worst case |
| Known benchmark test image uploaded | Inconclusive with warning | System recognizes standard benchmarks; flags as non-representative |

---

## Language Guidelines (Tone of Voice)

All Verdict Language must follow these principles:

1. **No false certainty** — Never use "100%," "definitely," or "guaranteed" in user-facing language
2. **Prefer evidence attribution** — Instead of "This is fake," say "Generative fingerprints consistent with [model class] were detected"
3. **Normalize uncertainty** — "Inconclusive" is a valid, respected outcome. Train users to trust it.
4. **Avoid AI jargon** — No "GAN artifacts" or "diffusion fingerprints" without plain-language explanations
5. **Audience-aware** — Allow toggling between "Forensic Detail" and "Plain Language" views

---

## Glossary of Terms

| Term | Definition |
|------|------------|
| Authentic Media | Media captured by a camera or recording device without synthetic generation or significant manipulation |
| Synthetic Media | Media generated or substantially altered by artificial intelligence (GANs, diffusion models, LLMs) |
| Forensic Artifact | A measurable trace in media data that provides evidence of its origin or processing history |
| Signal | An individual forensic analysis dimension (e.g., metadata analysis, pixel frequency analysis) |
| Confidence | The system's internal assessment of how reliable a given signal or overall verdict is |
| C2PA | Coalition for Content Provenance and Authenticity — cryptographic standards for media provenance |
| Chain of Custody | Documented history of who collected, handled, and processed the media |

---

*This document defines the authoritative Veracity Language. All product surfaces — dashboard, API responses, PDF reports, browser extension — must use these exact classifications and language.*