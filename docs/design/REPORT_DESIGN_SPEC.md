# Provance: Forensic Report & Transparency Design Specification
**Revision:** 1.2
**Status:** Approved for Implementation
**Owner:** Creative Director

## 1. Visual Philosophy: The "Defensible Document"
The Provance Forensic Report is a legal-grade artifact. It must feel heavy, official, and undeniable. 
- **Style:** "Modern Forensic" — high-end editorial meets clinical laboratory results.
- **Typography:** `Instrument Serif` (Authority); `JetBrains Mono` (Data); `IBM Plex Sans` (Readability).
- **Materiality:** High-trust "Parchment" texture to simulate physical paper integrity.

---

## 2. Forensic Report PDF Structure

### A. Cover Page (Forensic Identity)
- **Primary Verdict:** Large, high-contrast stamp (e.g., `[ VERDICT: SYNTHETIC ]`).
- **Veracity Seal:** An animated SVG seal (`VeracitySeal.jsx`) with report-specific QR code.
- **Media Fingerprint:** Centered media thumbnail with 1px charcoal bounding box and coordinate markers.
- **Core Metrics:** Report ID, SHA-256 Hash, File Type, Processing Time.

### B. Executive Summary (Veracity Language)
- **Classification:** Mapping results to one of the 6 Veracity levels (Confirmed, Likely, Suspicious, etc.).
- **Signal Weighting:** Visual breakdown of the 5 key pillars based on the Confidence Model:
  - Generative Fingerprints (35%)
  - Pixel/Frequency Analysis (25%)
  - Metadata Forensics (20%)
  - Compression/Splicing (10%)
  - Cryptographic Provenance (10%)
- **Plain-Language Summary:** Narrative explanation citing at least two convergent signals.

### C. Signature Catalog (Model Hand-writing)
Visualizing the abstract mathematical traces of specific models:
- **Sora:** Spatial-temporal patch misalignments and periodic spectral spikes.
- **Midjourney v6:** High-frequency statistical noise decoupling and optical bokeh errors.
- **Kling AI:** Temporal jello-effect jitter and shadow-lag anomalies.
- **Flux.1:** Chrominance grid patterns (U/V) and flow-trajectory statistical shifts.

---

## 3. Dashboard Transparency UI

### A. The Transparency Footer (Audit Trail)
A persistent, charcoal-background footer (`TransparencyFooter.jsx`) for the dashboard.
- `[METHODOLOGY: V2.4.1-STABLE]`
- `[ANALYSIS_ID: PRV-882-X9]`
- `[HASH_SHA256: 7f83b1...2a4e]`
- `[NODE: US-EAST-FORENSIC-04]`

### B. The Signature Cards
In-UI representation of detected models (`SignatureCatalog.jsx`).
- **Visual:** 48x48px canvas with model-specific noise/flow pattern.
- **Data:** Match Confidence %, Model Version, specific artifact detected.

---

## 4. Visual Asset Specification
- **Security Seal:** Animated SVG featuring Provance "P" and circular "Verified" text.
- **Heatmap Layer:** Neon-Amber (`#F59E0B`) overlays on charcoal base.
- **Spectral Noise Map:** Grayscale with Spectral Rose (`#BE123C`) highlights for spikes.
- **Veracity Gauge:** Radial SVG indicator showing probability score.
