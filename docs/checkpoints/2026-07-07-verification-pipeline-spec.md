# Provance Verification Pipeline Spec

Last updated: 2026-07-07

## Current MVP Pipeline

1. Frontend creates a scan record.
2. Backend validates the upload request and returns a signed upload URL.
3. Frontend uploads the media directly to private Supabase Storage.
4. Frontend submits the scan.
5. Backend queues the scan through Redis and BullMQ.
6. Worker downloads the uploaded file and performs image-first evidence extraction.
7. Worker writes the structured result payload back to the `scans` table.
8. Frontend polls scan detail until the case is complete.
9. Reports and printable report views render the evidence package.

## MVP Evidence Stages

### File Integrity

- Declared MIME type is compared with the detected file header
- SHA-256 and MD5 fingerprints are created
- This provides chain-of-review traceability

### Metadata Forensics

- Capture timestamp
- software tag
- device make and model
- orientation
- color-space metadata

### Visual Statistics

- image dimensions
- average luminance
- luminance standard deviation
- mean saturation
- edge density
- grayscale entropy
- blockiness heuristic

### Provenance Signal

- byte-level check for possible C2PA markers
- absence is not treated as proof of manipulation

## Verdict Logic

The MVP verdict is based on a conservative heuristic score built from:

- file-integrity mismatches
- metadata anomalies
- strong compression artifacts
- weak texture profile
- provenance-marker presence or absence

The verdict classes currently used for MVP are:

- `likely_authentic`
- `inconclusive`
- `suspicious`

## Later-Phase Upgrades

- generator attribution models
- tamper-localization heatmaps
- frequency-domain model scoring
- video frame extraction and temporal analysis
- audio extraction and audio-deepfake checks
- calibrated ensemble scoring
- stronger provenance validation
