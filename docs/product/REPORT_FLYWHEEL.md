# Provance — The Report Flywheel
*Defining how users go from upload to shareable forensic report*
*Document Owner: Head of Product*
*Revision: 1.0*

> Current-state note. Updated 2026-07-07.
>
> This is a future-state product model, not a literal description of everything that ships today.
>
> Current shipped reality:
> - upload is image-first and file-based
> - remote URL ingestion, clipboard paste, batch processing, video workflows, share links, and citation tools are still future scope
> - the live app already supports queue-backed scan submission, scan history, and report detail views
> - PDF export remains a planned next step rather than a shipped capability

## Overview

The **Report Flywheel** is Provance's core growth and value loop. Every user journey — from first-time visitor to enterprise admin — revolves around the creation, consumption, and sharing of Forensic Reports. The flywheel describes how each completed cycle generates trust, engagement, and organic growth.

Unlike a linear funnel, the flywheel compounds: every report exported is a "seed" that can bring new users into the system.

---

## The Flywheel Stages

```
     ┌──────────────────────────────────────────────────┐
     │                                                   │
     ▼                                                   │
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  1.      │───▶│  2.      │───▶│  3.      │───▶│  4.      │
  │ ACQUIRE  │    │ ANALYZE  │    │ VERDICT  │    │ EXPORT   │
  │ Media    │    │ Signals  │    │ & Review │    │ & Share  │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
       │                                               │
       └───────────────────────────────────────────────┘
                    (External Discovery)
```

### Stage 1: ACQUIRE — Media Ingestion
**Goal:** Get the suspect media into the Provance system with minimal friction.

**User Actions:**
- **Upload:** Drag-and-drop or file picker for images (JPEG, PNG, WebP, GIF) and videos (MP4, MOV, AVI, WebM)
- **Paste URL:** Paste a direct media URL for remote ingestion
- **Paste Clipboard:** Paste an image from the clipboard (desktop)
- **Browser Extension (Future):** Right-click → "Verify with Provance"

**UX Requirements:**
- Instant upload confirmation (<500ms perceived)
- File size and format validation with clear error messages
- Optional: Chain-of-custody metadata (source, collector, timestamp, location)
- Visible privacy pledge: "Files processed in-memory; auto-deleted after report generation"

**Success Metric:** Upload-to-processing conversion > 95%

### Stage 2: ANALYZE — Multi-Signal Processing
**Goal:** Run the media through Provance's forensic analysis pipeline and surface results progressively.

**User Actions:**
- View real-time processing status (progress bar / spinning states)
- See signals light up as they complete (progressive disclosure)
- Optionally cancel or re-process

**UX Requirements:**
- **Images:** Near-instant (<5s for standard resolution) with progressive signal results
- **Videos:** Async job model with clear ETA estimate; notify when complete
- Signal categories displayed as they resolve:
  - ✅ Metadata Analysis
  - ✅ Pixel/Frequency Analysis
  - ✅ Generative Fingerprint Detection
  - ✅ Compression/Artifact Analysis
  - ⏳ C2PA / Content Credential Verification
- Abort button visible for long-running video jobs

**Success Metric:** Image processing < 8s P95; Video async reliability > 99%

### Stage 3: VERDICT — The Trust Interface
**Goal:** Present a clear, defensible verdict with evidence breakdown — never just a score.

**User Actions:**
- Read the primary verdict (one of 6 Veracity classifications — see Veracity Language doc)
- Expand/collapse each signal's evidence breakdown
- Review raw metadata table
- Toggle between "Executive Summary" and "Forensic Detail" views

**UX Requirements:**
- **Verdict banner** at top: color-coded (Green / Amber / Red / Gray) with icon and confidence statement
- **Signal Cards:** Each signal gets its own expandable card showing:
  - Signal name and icon
  - Confidence bar (low/medium/high)
  - Key findings in bullet points
  - "Why this matters" plain-language explanation
- **Uncertainty handling:** When confidence is low, explicitly call it out with suggested next steps
- **Export trigger:** "Download Report" CTA always visible

**Success Metric:** Verdict-to-download conversion > 40%

### Stage 4: EXPORT & SHARE — The Forensic Report Artifact
**Goal:** Generate a shareable, credible PDF artifact that drives the flywheel's external loop.

**User Actions:**
- Preview the report in-browser before download
- Download as PDF
- Share via link (authenticated share URL)
- Copy citation snippet for embedding in articles/legal filings

**UX Requirements:**
- **PDF Report** includes:
  - Cover page with Provance branding, report ID, timestamp, and methodology version
  - Executive summary with plain-language verdict
  - Signal-by-signal evidence appendix
  - Metadata audit table (EXIF, file hash, size, etc.)
  - Methodology appendix (which signals ran, version info)
  - Chain-of-custody log (if provenance data provided)
  - "Verified by Provance" watermark with QR code linking to methodology page
- **Share Link** generates a unique, time-limited URL for stakeholders
- **Citation Snippet** in formats: APA, MLA, Chicago, Bluebook

**Success Metric:** Report download rate > 60% of completed scans; share link creation rate > 15%

---

## Growth Loops (The Flywheel Effect)

### External Loop: Report → Discovery
Every PDF exported is a potential growth vehicle:
1. Journalist downloads a report for an article
2. The "Verified by Provance" watermark and methodology link are embedded
3. Reader sees the watermark, visits Provance website
4. New visitor starts their own scan → Cycle repeats

### Internal Loop: History → Repeat Scans
1. User completes a scan, downloads report
2. Report is saved in their history
3. User returns to dashboard → sees past reports
4. Triggered to run a new scan → Cycle repeats

### Enterprise Loop: Batch → Team Adoption
1. Security team runs batch scan on 500 images
2. Generates team-wide audit report
3. Shares results with compliance team
4. Compliance team requires ongoing verification → Enterprise subscription → Cycle repeats

---

## Key UX States Per Stage

| Stage | Loading | Empty | Error | Success |
|-------|---------|-------|-------|---------|
| ACQUIRE | Upload progress bar | Dropzone with example | Invalid file toast | Green check + processing starts |
| ANALYZE | Skeleton signals lighting up | N/A (can't be empty) | Signal failure badge + partial results | All signals complete with checkmarks |
| VERDICT | N/A (loaded after analysis) | N/A | "Inconclusive" verdict with explanation | Clear verdict + evidence expandable |
| EXPORT | PDF generation spinner | N/A | Download retry button | Download complete + share options |

---

## Success Criteria

1. **Time-to-First-Verdict:** Under 10 seconds for images (P95)
2. **Flywheel Velocity:** 20% of report downloads lead to a new scan within 7 days
3. **Share Rate:** 15% of users generate at least one share link per session
4. **Report Engagement:** Average time spent on verdict page > 45 seconds (indicating meaningful consumption of evidence)
5. **Repeat Usage:** 40% of users who complete a scan run another within 30 days

---

*This document defines the product's core interaction model. All UI/UX and engineering work should reference this flywheel to ensure consistency across the user journey.*
