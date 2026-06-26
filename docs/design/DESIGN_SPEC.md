# Provance Design Specification: Forensic Authority
**Revision:** 1.0
**Status:** Draft
**Owner:** Creative Director

## 1. Visual Philosophy
Provance is a tool for high-stakes decision-making. The design must project **Defensibility, Transparency, and Precision**. It should feel like a hybrid between a premium editorial publication (e.g., The Economist) and a high-end forensic lab report.

### Core Pillars
- **Evidence-First**: Every visual claim must be backed by a data artifact.
- **Clinical Clarity**: No decorative elements without functional purpose.
- **The "Forensic Grid"**: A persistent visual anchor that represents the underlying matrix of analysis.

---

## 2. Color Palette (Forensic Refinement)
*Extending the base palette for depth and signaling.*

| Name | Hex | Usage |
| :--- | :--- | :--- |
| **Parchment (Base)** | `#FDFCFB` | Primary background, high-trust paper feel. |
| **Charcoal (Primary)** | `#1A1A1A` | Main text, borders, headers. |
| **Amber (Action)** | `#F59E0B` | Active alerts, confidence indicators, interactive highlights. |
| **Ink Blue (Data)** | `#1E3A8A` | Technical metadata, API response values. |
| **Spectral Rose (Alert)**| `#BE123C` | High-confidence AI artifact detection. |
| **Veridian (Safe)** | `#065F46` | Human-verified / Authenticity signals. |

---

## 3. Typography
- **Editorial Headings**: `Instrument Serif`. Large, elegant, authoritative. Use for verdicts and report titles.
- **Body & UI**: `IBM Plex Sans`. Neutral, legible, professional.
- **Forensic Data**: `JetBrains Mono` or `DM Mono`. Used for metadata, hex codes, log timestamps, and coordinate data.

---

## 4. The Evidence Appendix: Visual Language
The Evidence Appendix is the "proof" section of the Forensic Report.

### A. Artifact Callouts
- **Style**: Thin 1px lines connecting a technical label to a specific area of the media.
- **Color**: Amber for "Suspicious", Rose for "Generative", Blue for "Metadata".
- **Interaction**: On hover, the callout expands to show a "Micro-magnification" (200% zoom of the area).

### B. Spectral & Heatmap Overlays
- **Frequency Analysis**: A grayscale version of the image with a neon-amber "ghosting" overlay showing high-frequency noise typical of diffusion models.
- **Error Level Analysis (ELA)**: A high-contrast purple/black map showing compression inconsistencies.

### C. The Audit Trail Table
- **Layout**: Zebra-striped with `#F9F8F6` (subtle parchment variant).
- **Content**: Event, Actor, Timestamp (UTC), SHA-256 Hash.

---

## 5. Signal Visualizer Mockup Concept
*The Interactive Hero component.*

### Visual States
1. **Idle**: High-resolution image on a forensic grid.
2. **Scanning**: A horizontal "laser line" (Amber) moves down the image. As it passes, technical data "streams" from the sides.
3. **Detected**: Hovering over the image reveals "Hotspots". Clicking a hotspot opens a sidebar with the specific signal explanation.

### Key Interactive Elements
- **Zoom Scrubber**: A timeline-like bar to zoom into specific frames (for video) or pixel clusters (for image).
- **Layer Toggle**: Buttons to switch between `Raw`, `Spectral`, `Metadata`, and `C2PA` layers.

---

## 6. Next Steps
1.  **Component Prototype**: Build a React component for the `EvidenceAppendix` with callouts.
2.  **Visualizer Animation**: Use Framer Motion to create the "Scanning" effect for the Hero.
3.  **PDF Template**: Design the exportable PDF layout using these principles.
