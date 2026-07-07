# Provance — Forensic Signal Schema & Data Specification
*Bridging Veracity Language to Technical Implementation*
*Document Owner: Head of Product*
*Revision: 1.0*
*Status: Draft future-state schema*

> Current-state note. Updated 2026-07-07.
>
> This is an aspirational schema and interface specification, not the current canonical backend payload.
>
> Current shipped reality:
> - scan detail exists, but result payloads are still placeholder-level compared with this spec
> - video scrubber UX, methodology endpoints, share links, and extended report contracts described here are not implemented yet
> - use this document to shape future payload design, not to describe current API behavior

---

## Table of Contents
1. [Overview & Purpose](#1-overview--purpose)
2. [Signal Schema: Core Structure](#2-signal-schema-core-structure)
3. [Signal-Specific Schemas](#3-signal-specific-schemas)
4. [Verdict Aggregate Schema](#4-verdict-aggregate-schema)
5. [Interactive Video Zoom Scrubber UX](#5-interactive-video-zoom-scrubber-ux)
6. [Methodology Versioning Policy](#6-methodology-versioning-policy)
7. [API Contract Examples](#7-api-contract-examples)
8. [Appendix: Data Dictionary](#8-appendix-data-dictionary)

---

## 1. Overview & Purpose

This document defines the **canonical data schema** for all forensic signals produced by the Provance analysis pipeline. It serves as the contract between:

- **AI Researcher** (who produces signal algorithms)
- **CTO / Engineering** (who implements the pipeline)
- **Head of Product** (who defines the veracity language)
- **Creative Director / Designer** (who visualizes signal results)

Every signal output must conform to this schema. The schema is designed to support:
- **Explainability**: Every finding has a plain-language explanation
- **Defensibility**: Raw data is preserved alongside interpretations
- **Versioning**: Every output is pinned to a methodology version
- **Extensibility**: New signals can be added without breaking existing contracts

### Guiding Principles

| Principle | Rationale |
|-----------|-----------|
| **Immutable Findings** | Once stored, signal results are never mutated — only superseded by methodology versions |
| **Progressive Disclosure** | The schema supports three tiers: Summary → Detail → Raw Data |
| **Audit Trail** | Every signal result includes the exact model/algorithm version that produced it |
| **Uncertainty First** | Confidence must always be explicit; null/inconclusive is a first-class state |

---

## 2. Signal Schema: Core Structure

Every signal in the Provance pipeline produces a payload conforming to this base type:

```jsonc
{
  "$schema": "https://provance.io/schemas/signal-v1.json",

  "signal_id": "string (UUID v4)",
  "signal_name": "string (e.g., 'generative_fingerprint')",
  "signal_display_name": "string (e.g., 'Generative Fingerprint Detection')",
  "signal_category": "string (enum: 'pixel_frequency' | 'metadata' | 'generative' | 'compression' | 'c2pa')",

  "methodology_version": "string (semver, e.g., '1.4.2')",
  "model_id": "string (e.g., 'gf-detector-v3')",
  "model_version": "string (e.g., '2026-06-15')",
  "analysis_timestamp": "string (ISO 8601 UTC)",

  "status": "string (enum: 'complete' | 'inconclusive' | 'error' | 'skipped')",
  "status_reason": "string (plain-text explanation of non-complete status, if applicable)",

  "confidence": {
    "score": "float (0.0 – 1.0, null if inconclusive)",
    "level": "string (enum: 'very_high' | 'high' | 'moderate' | 'low' | 'insufficient')",
    "threshold_applied": "float (the minimum score for this signal to be considered 'high')"
  },

  "findings": [
    {
      "finding_id": "string (UUID v4)",
      "finding_type": "string (enum: 'anomaly' | 'normal' | 'signal_absent' | 'metadata_present' | 'metadata_absent')",
      "severity": "string (enum: 'critical' | 'high' | 'medium' | 'low' | 'informational')",
      "label": "string (short label, e.g., 'Spectral Spike Detected')",
      "description": "string (plain-language explanation, 1-3 sentences)",
      "technical_detail": "string (technical explanation for expert view, optional)",
      "raw_value": "any (the raw numeric/boolean/string value that triggered this finding, optional)",
      "reference_range": "string (what a normal/expected value would look like, optional)"
    }
  ],

  "supplementary_data": {
    "description": "string (what this data represents)",
    "mime_type": "string (e.g., 'image/png', 'application/json')",
    "data_url": "string (URL to retrieve supplementary data, e.g., heatmap overlay)",
    "thumbnail_url": "string (thumbnail of supplementary data, optional)"
  },

  "processing_time_ms": "integer",
  "signal_weight": "float (0.0 – 1.0, used in aggregate verdict calculation)"
}
```

### Field Constraints

| Field | Required | Nullable | Notes |
|-------|----------|----------|-------|
| `signal_id` | ✅ | No | UUID v4, generated at scan time |
| `signal_name` | ✅ | No | Machine-readable kebab-case |
| `signal_display_name` | ✅ | No | User-facing title |
| `signal_category` | ✅ | No | Maps to the 5 signal pillars |
| `methodology_version` | ✅ | No | Must match system methodology version |
| `model_id` | ✅ | No | Specific model/algorithm identifier |
| `model_version` | ✅ | No | Date or semver of model deployment |
| `analysis_timestamp` | ✅ | No | When analysis was performed |
| `status` | ✅ | No | One of the 4 enum values |
| `status_reason` | ✅ | Yes | Required when status ≠ complete |
| `confidence.score` | ✅ | Yes | Null when status ≠ complete |
| `confidence.level` | ✅ | Yes | Derived from score |
| `confidence.threshold_applied` | ✅ | No | The threshold value used |
| `findings` | ✅ | No | At least 1 finding, or empty array if inconclusive |
| `supplementary_data` | ❌ | Yes | Optional visual/data artifacts |
| `processing_time_ms` | ✅ | No | Measured wall-clock time |
| `signal_weight` | ✅ | No | As defined in Veracity Language |

---

## 3. Signal-Specific Schemas

### 3.1 Generative Fingerprint Detection

**signal_name:** `generative_fingerprint`
**signal_category:** `generative`
**weight:** 0.35

**Purpose:** Detect statistical and structural artifacts characteristic of generative AI models (GANs, diffusion models, transformers).

```jsonc
{
  "signal_name": "generative_fingerprint",
  "signal_display_name": "Generative Fingerprint Detection",
  "methodology_version": "1.4.2",

  "status": "complete",
  "confidence": {
    "score": 0.88,
    "level": "high",
    "threshold_applied": 0.70
  },

  "findings": [
    {
      "finding_id": "f-001-abc",
      "finding_type": "anomaly",
      "severity": "high",
      "label": "Spectral Decoupling Detected",
      "description": "The high-frequency bands of this image show statistical anomalies consistent with latent diffusion models. Natural camera sensor noise is absent; instead, a synthetic noise pattern characteristic of model upscaling is present.",
      "technical_detail": "PSNR of high-frequency subbands deviates 3.2σ from expected distribution. Dominant frequency peak at 3.4 cycles/pixel, matching Midjourney v6 signature profile.",
      "raw_value": 3.2,
      "reference_range": "< 2.0 standard deviations"
    },
    {
      "finding_id": "f-001-abd",
      "finding_type": "anomaly",
      "severity": "medium",
      "label": "Non-Natural Bokeh Transition",
      "description": "The depth-of-field falloff in this image follows a mathematically perfect curve rather than an optical lens pattern. Authentic camera lenses produce subtle spherical aberration in bokeh transitions.",
      "technical_detail": "Bokeh transition gradient measured at 0.97 linearity index (expected < 0.85 for optical lens).",
      "raw_value": 0.97,
      "reference_range": "< 0.85"
    }
  ],

  "supplementary_data": {
    "description": "Frequency-domain heatmap highlighting spectral anomalies",
    "mime_type": "image/png",
    "data_url": "https://storage.provance.io/scans/abc-123/heatmap-spectral.png",
    "thumbnail_url": "https://storage.provance.io/scans/abc-123/heatmap-spectral-thumb.png"
  },

  "processing_time_ms": 2340,
  "signal_weight": 0.35
}
```

**Edge Cases:**

| Scenario | status | confidence.score | Notes |
|----------|--------|------------------|-------|
| No generative artifacts found | ✅ complete | 0.08 (low) | Low score = no anomaly |
| Model signature ambiguous (e.g., low-res input) | ⚠️ inconclusive | null | "Insufficient resolution for spectral analysis" |
| Known model fingerprint matched (e.g., Flux.1 grid) | ✅ complete | 0.94 (very_high) | "Chroma grid artifact detected — consistent with Flux.1" |
| New unknown generative pattern | ✅ complete | 0.65 (moderate) | "Anomalous pattern detected, does not match known model catalog" |

---

### 3.2 Pixel/Frequency Analysis

**signal_name:** `pixel_frequency`
**signal_category:** `pixel_frequency`
**weight:** 0.25

**Purpose:** Analyze pixel-level statistics and frequency-domain characteristics for signs of manipulation or synthetic generation.

```jsonc
{
  "signal_name": "pixel_frequency",
  "display_name": "Pixel & Frequency Analysis",
  "methodology_version": "1.3.1",

  "status": "complete",
  "confidence": {
    "score": 0.92,
    "level": "very_high",
    "threshold_applied": 0.70
  },

  "findings": [
    {
      "finding_id": "f-002-abc",
      "finding_type": "normal",
      "severity": "informational",
      "label": "Natural Noise Distribution",
      "description": "Pixel-level noise follows expected Gaussian distribution consistent with CMOS sensor capture. No statistical anomalies detected in the spatial domain.",
      "technical_detail": "Noise σ = 1.24, expected range 1.1–1.6 for this sensor class (iPhone 15 Pro).",
      "raw_value": 1.24,
      "reference_range": "1.1–1.6"
    },
    {
      "finding_id": "f-002-abd",
      "finding_type": "normal",
      "severity": "informational",
      "label": "Sensor PRNU Fingerprint Present",
      "description": "Photo Response Non-Uniformity (PRNU) pattern is present and consistent with known camera sensor characteristics. Absence of PRNU would be a strong manipulation indicator.",
      "technical_detail": "PRNU correlation coefficient: 0.87 (threshold: > 0.40)",
      "raw_value": 0.87,
      "reference_range": "> 0.40"
    }
  ],

  "processing_time_ms": 1890,
  "signal_weight": 0.25
}
```

**Video-Specific Fields (when analyzing video frames):**

```jsonc
{
  "signal_name": "pixel_frequency",
  "status": "complete",
  "confidence": { "score": 0.76, "level": "high", "threshold_applied": 0.70 },

  // Video-specific: frame-level analysis
  "frame_analysis": {
    "total_frames_analyzed": 120,
    "sampling_strategy": "keyframe_interval",
    "interval_frames": 12,
    "frame_results": [
      {
        "frame_index": 0,
        "timestamp_seconds": 0.0,
        "confidence_score": 0.91,
        "status": "normal",
        "findings": [ /* per-frame findings */ ]
      },
      {
        "frame_index": 12,
        "timestamp_seconds": 0.48,
        "confidence_score": 0.45,
        "status": "anomaly",
        "findings": [ /* per-frame findings for this frame */ ]
      }
    ],
    "anomalous_frame_indices": [12, 24, 36, 108],
    "anomaly_sequence_boundaries": [
      { "start_frame": 12, "end_frame": 48, "pattern": "temporal_inconsistency" }
    ]
  }
}
```

---

### 3.3 Metadata Forensics

**signal_name:** `metadata_forensics`
**signal_category:** `metadata`
**weight:** 0.20

**Purpose:** Analyze EXIF, XMP, and other embedded metadata for consistency, completeness, and signs of tampering.

```jsonc
{
  "signal_name": "metadata_forensics",
  "display_name": "Metadata Forensics",
  "methodology_version": "1.2.0",

  "status": "complete",
  "confidence": {
    "score": 0.45,
    "level": "low",
    "threshold_applied": 0.70
  },

  "findings": [
    {
      "finding_id": "f-003-abc",
      "finding_type": "metadata_present",
      "severity": "informational",
      "label": "EXIF Data Present",
      "description": "The file contains EXIF metadata, which provides information about capture conditions.",
      "raw_value": {
        "make": "Apple",
        "model": "iPhone 15 Pro",
        "focal_length": "6.8mm",
        "aperture": "f/1.78",
        "iso": 400,
        "timestamp": "2026-06-20T14:32:10Z",
        "gps": { "lat": 48.8584, "lon": 2.2945 }
      }
    },
    {
      "finding_id": "f-003-abd",
      "finding_type": "anomaly",
      "severity": "medium",
      "label": "Missing Editing History",
      "description": "The metadata indicates the image was captured by an iPhone 15 Pro, but the expected 'EditHistory' or 'ProcessingSoftware' fields are absent. Most iPhone photos include at least one processing software tag.",
      "technical_detail": "Expected 'XMP:ProcessingSoftware' or 'Apple:EditHistory' — neither found.",
      "raw_value": null,
      "reference_range": "'ProcessingSoftware' should be present"
    }
  ],

  "supplementary_data": {
    "description": "Full EXIF table as formatted JSON",
    "mime_type": "application/json",
    "data_url": "https://storage.provance.io/scans/abc-123/metadata-raw.json"
  },

  "processing_time_ms": 120,
  "signal_weight": 0.20
}
```

**Edge Cases:**

| Scenario | Handling |
|----------|----------|
| All metadata stripped | status: `complete`, confidence: low, findings: `metadata_absent` — "No metadata found. This is common in social media downloads, but prevents full forensic analysis." |
| Conflicting metadata (e.g., GPS says Paris, timezone says Tokyo) | finding with severity `high` — "GPS coordinates and timezone metadata are contradictory" |
| Metadata edited by standard tools | status: `complete`, finding: "Editing software tag shows 'Adobe Lightroom' — expected for legitimate editing" |
| Metadata forged with spoofing tools | status: `complete`, finding with severity `critical` — "EXIF creation timestamp predates camera model release date" |

---

### 3.4 Compression & Artifact Analysis

**signal_name:** `compression_analysis`
**signal_category:** `compression`
**weight:** 0.10

**Purpose:** Detect unusual compression signatures, double-compression artifacts, and splicing indicators.

```jsonc
{
  "signal_name": "compression_analysis",
  "display_name": "Compression & Artifact Analysis",
  "methodology_version": "1.1.3",

  "status": "complete",
  "confidence": {
    "score": 0.72,
    "level": "high",
    "threshold_applied": 0.70
  },

  "findings": [
    {
      "finding_id": "f-004-abc",
      "finding_type": "anomaly",
      "severity": "high",
      "label": "Double Quantization Detected",
      "description": "The JPEG quantization tables show evidence of being compressed twice at different quality levels. This is common when an AI-generated image (saved by the model at high quality) is re-saved by a social media platform.",
      "technical_detail": "Quantization matrix divergence: 17.4% (threshold: > 12%). Primary QF ~95%, secondary QF ~82%.",
      "raw_value": 17.4,
      "reference_range": "< 12% divergence"
    },
    {
      "finding_id": "f-004-abe",
      "finding_type": "anomaly",
      "severity": "medium",
      "label": "ELA Boundary Detected",
      "description": "Error Level Analysis reveals a defined boundary line between regions of different compression quality, suggesting possible compositing or splicing. The area around the subject's face has different compression characteristics than the background.",
      "raw_value": null,
      "technical_detail": "Boundary at coordinates (1200, 800) to (1400, 850) with 22% ELA differential."
    }
  ],

  "supplementary_data": {
    "description": "Error Level Analysis (ELA) heatmap",
    "mime_type": "image/png",
    "data_url": "https://storage.provance.io/scans/abc-123/ela-heatmap.png"
  },

  "processing_time_ms": 890,
  "signal_weight": 0.10
}
```

---

### 3.5 C2PA / Content Credentials

**signal_name:** `c2pa_verification`
**signal_category:** `c2pa`
**weight:** 0.10

**Purpose:** Verify cryptographic content provenance credentials (C2PA standard) when present.

```jsonc
{
  "signal_name": "c2pa_verification",
  "display_name": "Content Credentials (C2PA)",
  "methodology_version": "1.0.1",

  "status": "skipped",
  "status_reason": "No C2PA manifest found in file. Content credentials are an emerging standard and are not present in most media.",
  "confidence": {
    "score": null,
    "level": null,
    "threshold_applied": 0.70
  },

  "findings": [],
  "processing_time_ms": 45,
  "signal_weight": 0.10
}
```

When C2PA IS present:

```jsonc
{
  "signal_name": "c2pa_verification",
  "status": "complete",
  "confidence": { "score": 0.95, "level": "very_high", "threshold_applied": 0.70 },

  "findings": [
    {
      "finding_id": "f-005-abc",
      "finding_type": "metadata_present",
      "severity": "informational",
      "label": "C2PA Manifest Validated",
      "description": "The file contains a valid C2PA content credential manifest. The cryptographic signature is intact and traces back to a trusted hardware root of trust.",
      "technical_detail": "Signature verified: Adobe CAI 2024 Intermediate. Hardware binding: Apple Secure Enclave.",
      "raw_value": {
        "manifest_version": "2.0",
        "issuer": "Adobe Content Authenticity Initiative",
        "timestamp": "2026-06-20T14:32:12Z",
        "hardware_binding": "Apple Secure Enclave",
        "signature_valid": true
      }
    }
  ],

  "supplementary_data": {
    "description": "Full C2PA manifest JSON",
    "mime_type": "application/json",
    "data_url": "https://storage.provance.io/scans/abc-123/c2pa-manifest.json"
  },

  "processing_time_ms": 230,
  "signal_weight": 0.10
}
```

---

## 4. Verdict Aggregate Schema

The final verdict is the aggregate of all signals, conforming to this schema:

```jsonc
{
  "scan_id": "string (UUID v4)",
  "organization_id": "string (UUID v4, optional)",
  "user_id": "string (UUID v4)",

  "media": {
    "original_filename": "string",
    "media_type": "string (enum: 'image' | 'video')",
    "mime_type": "string",
    "file_size_bytes": "integer",
    "file_hash_sha256": "string (hex)",
    "media_hash_md5": "string (hex, optional)",
    "width": "integer",
    "height": "integer",
    "duration_seconds": "float (video only)",
    "is_ephemeral": "boolean (true if processed in-memory mode)"
  },

  "verdict": {
    "class": "string (enum: 'authentic' | 'likely_authentic' | 'inconclusive' | 'suspicious' | 'likely_synthetic' | 'synthetic')",
    "display_label": "string (e.g., 'Authenticity Confirmed')",
    "display_color": "string (hex, e.g., '#16A34A')",
    "confidence_score": "float (0.0 – 1.0)",
    "confidence_level": "string (enum: 'very_high' | 'high' | 'moderate' | 'low' | 'insufficient')",
    "signal_count_total": "integer",
    "signal_count_completed": "integer",
    "primary_contributing_signals": ["string (signal names of top-2 signals by weight × confidence)"],
    "plain_language_summary": "string (1-3 sentence plain-language explanation)"
  },

  "signals": [
    { /* Signal Schema (section 2) — one entry per signal */ }
  ],

  "methodology": {
    "version": "string (semver, e.g., '2.4.1')",
    "release_date": "string (ISO 8601)",
    "analysis_timestamp": "string (ISO 8601 UTC)",
    "environment": "string (deployment environment, optional)",
    "node_id": "string (processing node ID, optional)"
  },

  "report": {
    "report_id": "string (format: PRV-YYYYMMDD-NNN)",
    "report_url": "string (URL to download PDF)",
    "share_url": "string (time-limited share URL, optional)",
    "generated_at": "string (ISO 8601 UTC)"
  },

  "metadata": {
    "scan_created_at": "string (ISO 8601 UTC)",
    "scan_completed_at": "string (ISO 8601 UTC)",
    "total_processing_time_ms": "integer",
    "processing_cost_credits": "float (optional)"
  }
}
```

### Verdict Calculation Logic

```
verdict.confidence_score = Σ(signal_weight_i × signal_confidence_i) / Σ(signal_weight_i)
                           for each completed signal i

verdict.class is mapped from verdict.confidence_score using the threshold table
  in VERACITY_LANGUAGE.md.
```

### Video Verdict Extension

For video scans, the verdict schema includes an additional `frame_timeline` block:

```jsonc
{
  "verdict": {
    "class": "suspicious",
    "display_label": "Artifacts Detected",
    "confidence_score": 0.65,
    "plain_language_summary": "Most frames appear authentic, but frames 12-48 show anomalies consistent with AI-generated insertion. The overall video is classified as Suspicious."
  },

  "frame_timeline": {
    "total_frames": 120,
    "frame_count_analyzed": 10,
    "frame_verdicts": [
      { "frame_index": 0, "timestamp": 0.0, "verdict_class": "authentic", "confidence": 0.91 },
      { "frame_index": 12, "timestamp": 0.48, "verdict_class": "synthetic", "confidence": 0.85 },
      { "frame_index": 24, "timestamp": 0.96, "verdict_class": "synthetic", "confidence": 0.82 },
      { "frame_index": 36, "timestamp": 1.44, "verdict_class": "synthetic", "confidence": 0.79 },
      { "frame_index": 48, "timestamp": 1.92, "verdict_class": "likely_authentic", "confidence": 0.73 }
    ],
    "anomaly_segments": [
      {
        "start_frame": 12,
        "start_time": 0.48,
        "end_frame": 48,
        "end_time": 1.92,
        "pattern": "temporal_inconsistency",
        "confidence": 0.82,
        "description": "Temporal frequency anomalies suggest frame insertion or regeneration between frames 12-48."
      }
    ],
    "overall_verdict_derivation": "worst_case",
    "derivation_note": "Overall verdict reflects highest-severity segment. 80% of frames are authentic, but 20% show strong synthetic indicators."
  }
}
```

---

## 5. Interactive Video Zoom Scrubber UX

### 5.1 Overview

The **Interactive Zoom Scrubber** is the primary interface for frame-by-frame forensic analysis of video content. It enables users to scrub through video frames, zoom into regions of interest, and overlay forensic signal data at the frame level.

It bridges the **Processing View** (Stage 2 of the Report Flywheel) and the **Verdict & Evidence Breakdown** (Stage 3).

### 5.2 Layout & Components

```
┌────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                    │    │
│  │              VIDEO CANVAS (640×360)                │    │
│  │                                                    │    │
│  │      ┌──────────┐                                  │    │
│  │      │ Zoom      │  (↕ Drag to pan)                │    │
│  │      │ Region    │                                  │    │
│  │      └──────────┘                                  │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Layer Toggle ─────────────────────────────────────┐    │
│  │  [Raw] [Spectral] [Metadata] [ELA] [C2PA] [Signals] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Timeline Scrubber ──────────────────────────────────┐  │
│  │  ◄  ┌────────────────────●──────────────────┐  ►     │  │
│  │     │ ████████████████░░░░░░░░░░████████████ │        │  │
│  │     └──────────────────────────────────────┘         │  │
│  │    0:00   0:48   0:96   1:44   1:92   2:40   3:20   │  │
│  │     Frame 12 of 120                                  │  │
│  │                                                       │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │   │ Authentic│  │ Synthetic│  │ Authentic│  ...      │  │
│  │   │  0:00    │  │  0:48    │  │  1.92    │           │  │
│  │   └──────────┘  └──────────┘  └──────────┘          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌── Frame Detail Panel ─────────────────────────────────┐  │
│  │  Frame 12  |  0:48  |  Verdict: Synthetic (0.85)      │  │
│  │  ┌── Signal Scorecards ──────────────────────────┐    │  │
│  │  │  ✅ Pixel/Frequency: 0.91         [Expand]    │    │  │
│  │  │  ⚠️ Generative Fingerprint: 0.78 [Expand]    │    │  │
│  │  │  ❓ Metadata: N/A (video)        [Expand]    │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │  [Add to Report] [Flag This Frame]                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 5.3 Component Specifications

#### A. Video Canvas

| Property | Specification |
|----------|--------------|
| Container | 16:9 aspect ratio, max 960px wide, responsive |
| Default Scale | Fit-to-width with letterboxing (charcoal bars) |
| Min Scale | Fit-to-width (no zoom-out beyond container) |
| Max Zoom | 8× optical zoom (integer steps: 1×, 2×, 4×, 8×) |
| Zoom Interaction | Pinch-to-zoom (touch) / Ctrl+Scroll (desktop) / Zoom buttons |
| Pan Interaction | Click-and-drag to pan when zoomed in |
| Frame Navigation | Arrow keys (← →) to step one frame at a time |
| Overlay Opacity | Global slider: 0–100% (forensic overlay transparency) |

**States:**

| State | Visual |
|-------|--------|
| Loading (async) | Skeleton outline + pulse animation |
| Ready — No overlay | Clean video frame with forensic grid overlay (subtle 20px grid) |
| Overlay Active | Current overlay layer rendered at 50% opacity (adjustable) |
| Zoomed In | Magnified region with pan ability; grid scales proportionally |
| Error — Frame Unavailable | Diagonal hash pattern + "Frame data unavailable" label |
| Empty — No Video | "Upload a video to begin frame analysis" |

#### B. Layer Toggle

**Position:** Below video canvas, full width

**Layer Options:**

| Layer | Shortcut | Description | Visual Treatment |
|-------|----------|-------------|------------------|
| Raw | `1` | Original video frame | Clean frame, no overlay |
| Spectral | `2` | Frequency-domain heatmap | Neon-amber (`#F59E0B`) ghosting overlay |
| Metadata | `3` | Frame-level metadata overlay | Blue (`#1E3A8A`) text annotations at bottom |
| ELA | `4` | Error Level Analysis | High-contrast purple/black map |
| C2PA | `5` | Content credential status | Green shield icon or red "No C2PA" badge |
| Signals | `6` | All signal indicators combined | Color-coded borders + heat zones |

**Behavior:**
- Keyboard shortcuts: `1`–`6` to switch layers instantly
- Toggle buttons highlight active layer with amber underline
- Opacity slider appears when a forensic layer (not Raw) is active
- Layer state persists during scrubbing

#### C. Timeline Scrubber

| Property | Specification |
|----------|--------------|
| Min Width | 100% of container (no less than 320px) |
| Track Height | 8px with 2px rounded thumb |
| Thumb Size | 16px diameter, amber fill, white border |
| Color Coding | Track colored per-frame by verdict: Green (authentic), Amber (suspicious), Red (synthetic), Gray (inconclusive) |
| Marker Labels | Frame count and timestamp displayed below track |
| Step Size | 1 frame (arrow keys); click on track to jump |
| Frame Counter | "Frame 12 of 120" label, updated live |

**Mini Thumbnail Strip:**
Below the timeline, a horizontal strip of frame thumbnails (48×27px) representing keyframes or sampled frames. Each thumbnail has a verdict-colored border (2px). Hovering over a thumbnail shows a larger preview tooltip (120×68px).

**States:**

| State | Visual |
|-------|--------|
| Loaded — All frames scanned | Full colored timeline with verdict colors |
| Processing — Frames pending | Gray sections with animated shimmer |
| Analyzed — Some anomalies | Red/amber segments prominent; clickable |
| Error — Frame analysis failed | Diagonal hash on affected segment |
| Empty — No timeline data | Gray track with "Analysis in progress..." |

#### D. Frame Detail Panel

**Position:** Below timeline scrubber, full width

**When a frame is selected (clicked or scrubbed to):**

| Element | Content |
|---------|---------|
| Frame Header | "Frame {n} | {timestamp} | Verdict: {label} ({confidence}%)" |
| Signal Cards | Mini scorecards (4 per row) showing per-signal verdict for this frame |
| Expand Behavior | Clicking a signal card opens the full Signal Schema for that frame |
| Action Buttons | "Add to Report" (queue this frame's findings for PDF) |
| | "Flag This Frame" (mark for reviewer attention in team workflow) |

**States:**

| State | Visual |
|-------|--------|
| Frame Selected | Full detail panel visible, animated slide-in |
| No Frame Selected | "Click a frame on the timeline to inspect forensic details" |
| Frame With Anomalies | Red/amber highlight on relevant signal cards |
| Frame Data Loading | Skeleton cards with shimmer |
| Frame Error | "Frame analysis incomplete — signal error" with retry |

### 5.4 Interaction Flows

**Flow 1: Basic Scrub**
1. User lands on verdict page for a video scan
2. Verdict banner shows overall classification: "Suspicious"
3. Timeline scrubber shows color-coded frame segments
4. User sees a red segment (frames 12-48) and clicks on it
5. Video canvas jumps to frame 12, Frame Detail Panel loads signal data
6. User can scrub through each frame, observing signal changes
7. User can switch layers (e.g., Spectral) to see frequency-domain anomalies in the affected frames

**Flow 2: Deep Investigative Zoom**
1. User finds an anomalous frame (frame 24)
2. User double-clicks the Video Canvas or clicks zoom (+) button
3. Canvas zooms to 4× magnification centered on the click point
4. User pans to examine a specific region (e.g., a face or text area)
5. User toggles to ELA layer to see compression inconsistencies
6. User clicks "Add to Report" to capture this zoomed view + layer
7. A screenshot is queued for inclusion in the PDF report appendix

**Flow 3: Report Curation**
1. User has flagged 3 key frames during investigation
2. User clicks "View Report Draft" button
3. Report preview shows: overall verdict + frame timeline + 3 flagged frames with annotations
4. User can add notes to each flagged frame
5. User downloads PDF with the curated frame evidence

### 5.5 Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| > 1200px | Full three-row layout: Canvas (top), Layers+Timeline (middle), Detail Panel (bottom) |
| 768–1199px | Detail Panel collapses below timeline; signal cards shown as horizontal scroll |
| < 768px | Timeline thumbnails hidden; scrubber simplified; detail panel as slide-up modal |

### 5.6 Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Keyboard Navigation | Tab through all controls; arrow keys for frame step; number keys for layers |
| Screen Reader | aria-labels on all timeline segments; live region for frame counter |
| Color Independence | Verdict indicators use icons + text labels (not color alone) |
| Focus Indicators | Visible 2px amber outline on all focusable elements |
| Motion Sensitivity | Respect prefers-reduced-motion; disable auto-advance animations |

---

## 6. Methodology Versioning Policy

### 6.1 Purpose

Methodology versioning ensures that every verdict, signal finding, and report artifact is traceable to the exact analysis engine version that produced it. This is critical for:

- **Defensibility**: Reports can be cross-referenced against the methodology in effect at time of analysis
- **Reproducibility**: Given the same input and same methodology version, the system should produce the same output
- **Auditability**: Stakeholders (courts, newsrooms, compliance) can verify which analysis methods were applied
- **Regression Management**: Signal improvements can be tracked without breaking historical comparison

### 6.2 Versioning Scheme

Provance uses **Semantic Versioning (SemVer 2.0)** for methodology releases:

```
MAJOR.MINOR.PATCH[-SUFFIX]

Example: 2.4.1-stable
```

| Component | Bump Condition | Example | Impact |
|-----------|----------------|---------|--------|
| **MAJOR** | Breaking change to verdict classification, signal weights, or schema contract | 1.x.x → 2.0.0 | Historical results are NOT comparable. New threshold model. |
| **MINOR** | Adding new signals, new model support, or non-breaking improvements to existing signals | 1.0.x → 1.1.0 | Historical results remain valid; new signals add capability. |
| **PATCH** | Bug fixes, performance improvements, model fine-tuning without threshold changes | 1.1.0 → 1.1.1 | No change to output schema or classification boundaries. |
| **SUFFIX** | Pre-release labels for testing | `-alpha.1`, `-beta.2`, `-rc.1` | Not for production use; internal validation only. |

### 6.3 Components Versioned

Each methodology release pins the following components:

| Component | Versioned As | Example |
|-----------|-------------|---------|
| System Methodology | `methodology.version` | `2.4.1` |
| Per-Signal Algorithm | `signals[].model_version` | `2026-06-15` (date-based for ML models) |
| Confidence Threshold Table | Referenced in methodology docs | `threshold_table_v2.json` |
| Schema Contract | `$schema` field | `signal-v2.json` |
| Report Generation Engine | Internal build ID | `report-engine-1.2.0` |

### 6.4 Version Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  ALPHA   │────▶│   BETA   │────▶│    RC    │────▶│  STABLE  │
│ Dev-only │     │ Internal  │     │  Release │     │   Prod   │
│          │     │  Testing  │     │ Candidate│     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                        │
                                                        ▼
                                                  ┌──────────┐
                                                  │ DEPRECATED│
                                                  │ No longer │
                                                  │  active   │
                                                  └──────────┘
```

| Stage | Label | Environment | Data Usage |
|-------|-------|-------------|------------|
| Alpha | `-alpha.N` | Dev/Internal | No production scans; test data only |
| Beta | `-beta.N` | Staging | Limited production scans with "Beta" badge on report |
| Release Candidate | `-rc.N` | Staging/Canary | Allowed on non-critical scans; full validation |
| Stable | none | Production | Default for all scans |
| Deprecated | `-deprecated` | Archived | Historical reference only; no new scans |

### 6.5 Communication Policy

**To Users (In-App):**
When a methodology update occurs, users see a subtle notification:

```
┌────────────────────────────────────────────────────┐
│  🔬 Methodology updated to v2.5.0                  │
│  • New: Flux.1 chroma pattern detection            │
│  • Improved: Metadata forensics accuracy (+12%)    │
│  View changelog →                                  │
└────────────────────────────────────────────────────┘
```

**On Reports (PDF):**
Every report footer includes:
```
Methodology: v2.4.1-stable | Generated: 2026-06-25T14:30:00Z
Signal Models: gf-detector-v3 (2026-06-15), px-analyzer-v2 (2026-06-10)...
```

**To API Consumers:**
- `GET /api/v1/methodology` returns current methodology metadata
- Breaking changes are announced via: (1) API changelog, (2) email to API key holders, (3) 14-day deprecation header on old endpoints

**Internal Change Log:**

Every methodology release must include a changelog entry:

```markdown
## v2.5.0 (2026-07-01)

### Added
- New signal: Flux.1 chrominance grid detection (compression category)
- C2PA manifest v2.1 support for hardware-bound credentials

### Changed
- Generative fingerprint confidence threshold lowered from 0.75 to 0.70 (improved recall by 8%, FPR unchanged)
- Metadata forensics model updated to v3 (training data expanded to include 2026 camera models)

### Fixed
- Edge case: False positive on heavily compressed iPhone HEIC files resolved
- Edge case: Video with variable frame rate no longer causes frame alignment errors

### Deprecated
- Signal weight for compression analysis to be increased from 0.10 → 0.15 in v3.0
```

### 6.6 Backward Compatibility

| Change Type | Old Reports Still Accessible? | Old Reports Reproducible? | Notes |
|-------------|-------------------------------|---------------------------|-------|
| PATCH | ✅ Yes | ✅ Yes | No schema change |
| MINOR | ✅ Yes | ✅ Yes (with old methodology pinned) | New signals optional |
| MAJOR | ✅ Yes | ❌ No | Frozen as historical artifact |

**Implementation:**
- Every scan record stores the `methodology_version` in the database
- The report PDF includes the methodology version prominently
- Archived methodology runtimes are preserved in a container registry for reproducibility (Enterprise SLA)

### 6.7 "Verified by Provance" Badge & Versioning

The watermark/QR code on exported PDFs links to:
```
https://provance.io/methodology/v2.4.1
```

That page shows:
- Methodology version and release date
- Complete changelog
- Signal model versions and training data summaries
- Confidence threshold table
- Known limitations for this version

This ensures anyone receiving a Provance report can independently verify the methodology that produced it.

## 8. Appendix: Data Dictionary

### 8.1 Enum Values

| Field | Valid Values | Description |
|-------|-------------|-------------|
| `signal_category` | `generative`, `pixel_frequency`, `metadata`, `compression`, `c2pa` | The 5 signal pillars |
| `status` | `complete`, `inconclusive`, `error`, `skipped` | Signal processing outcome |
| `confidence.level` | `very_high`, `high`, `moderate`, `low`, `insufficient` | Human-readable confidence tier |
| `finding.finding_type` | `anomaly`, `normal`, `signal_absent`, `metadata_present`, `metadata_absent` | Classification of each finding |
| `finding.severity` | `critical`, `high`, `medium`, `low`, `informational` | How significant this finding is |
| `verdict.class` | `authentic`, `likely_authentic`, `inconclusive`, `suspicious`, `likely_synthetic`, `synthetic` | The 6 Veracity Language classes |
| `frame_verdict.verdict_class` | Same 6 classes, plus `unanalyzed` | Per-frame verdict |

### 8.2 Confidence Thresholds

| Level | Score Range | Applicable Verdicts |
|-------|-------------|---------------------|
| `very_high` | 0.90 – 1.00 | Authentic, Synthetic |
| `high` | 0.75 – 0.89 | Likely Authentic, Likely Synthetic |
| `moderate` | 0.55 – 0.74 | Suspicious, Likely Authentic |
| `low` | 0.30 – 0.54 | Inconclusive, Suspicious |
| `insufficient` | 0.00 – 0.29 | Inconclusive |

### 8.3 File Size Limits by Plan

| Plan | Image Max | Video Max | Retention |
|------|-----------|-----------|-----------|
| Trial | 10 MB | N/A | 7 days |
| Pro | 50 MB | 200 MB | 30 days |
| Team | 100 MB | 500 MB | 90 days |
| Enterprise | 250 MB | 2 GB | Custom |

### 8.4 Schema Evolution Guidelines

1. **Never remove fields** — mark as `deprecated` with a `deprecated_at` timestamp
2. **Always add fields** with `optional: true` initially, make required in next MAJOR
3. **Version the schema URL** (`signal-v1.json` → `signal-v2.json`) on breaking changes
4. **Maintain a migration guide** for API consumers when schema changes

---

*This document defines the canonical data contract for all forensic signals. Engineering must reference this spec when building the analysis pipeline. Questions about schema decisions should be raised with the Head of Product.*

*Revision: 1.0 | Owner: Head of Product | Last Updated: 2026-06-25*
