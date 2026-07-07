# Provance — Interactive Dashboard Product Requirements Document (PRD)
*Document Owner: Head of Product*
*Revision: 1.0*
*Status: Mixed state. Partially implemented, partially future-state planning*

> Current-state note. Updated 2026-07-07.
>
> This document mixes shipped dashboard foundations with future dashboard scope. For current implementation truth, use `README.md`, `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`, and `src/App.jsx`.
>
> Current shipped reality:
> - auth entry is `/signin`, not `/auth/login`
> - authenticated routes live under `/app/*`
> - current workflow is image-first
> - scan history, uploads, dashboard metrics, and report detail are live foundations
> - PDF export, share links, billing, API keys, citations, video workflows, and advanced team features are not shipped yet

---

## 1. Executive Summary

The Provance Interactive Dashboard is the authenticated workspace where users upload media, receive forensic verdicts, download reports, and manage their verification history. It is the core product surface — the "cockpit" of the trust verification workflow.

This PRD defines the MVP dashboard (Phase 1) for our initial design partner program and closed beta. It focuses on the **individual user experience** with foundations for future team/enterprise features.

**Key North Star:** Every user action in the dashboard must end with a downloadable Forensic Report. The report is the product's unit of value.

---

## 2. Target Users (Personas)

### Primary: The Investigative Journalist
- **Needs:** Fast, credible verification of user-generated content before publication
- **Pain points:** Current detectors give opaque scores; can't cite "73% likely fake" in a newsroom
- **Critical path:** Upload → Verdict → Download PDF → Cite in article

### Secondary: The Forensic Analyst
- **Needs:** Deep signal-by-signal breakdown, raw metadata access, batch processing
- **Pain points:** Needs more detail than a verdict label; wants to validate each signal
- **Critical path:** Upload → Expand all signals → Review metadata → Save to case file

### Tertiary: The Legal Investigator
- **Needs:** Court-ready reports with chain-of-custody, methodology versioning, audit trail
- **Pain points:** Standard detectors produce no admissible evidence
- **Critical path:** Upload with provenance → Verify → Download full forensic package

---

## 3. User Flow (End-to-End)

```
Landing Page → Auth (Sign Up / Log In)
    → Dashboard Home (History View)
        → Click "New Scan"
            → Upload / Paste / URL
            → Processing View (Progressive Signals)
            → Verdict & Evidence Breakdown
            → Download PDF / Share Link / Copy Citation
        → Back to History
            → View Past Reports
            → Re-download or Share
    → Account Settings
        → Profile, API Keys, Billing, Notifications
```

---

## 4. Pages & Components

### 4.1 Authentication (Auth)

**Pages:**
- `/auth/login` — Login form
- `/auth/signup` — Registration form
- `/auth/forgot-password` — Password reset
- `/auth/callback` — OAuth callback handler

**Requirements:**
- Email + password authentication
- Google OAuth (Phase 1.1)
- SSO/SAML (Enterprise — Phase 2)
- Magic link option (Phase 1.1)
- Post-auth redirect to `/dashboard`

**States:**
- Default: Login form with email/password fields
- Loading: Spinner on submit button; disable form
- Error: Inline validation errors; "Invalid credentials" toast; rate-limit warning
- Success: Redirect to dashboard with welcome toast

**Edge Cases:**
- Session expired → redirect to login with message
- Account suspended → show support contact
- Rate-limited → show cooldown timer

---

### 4.2 Dashboard Home (History)

**Route:** `/dashboard`
**Purpose:** User's command center — shows scan history, quick actions, and account status.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Header: Logo | "New Scan" CTA | Credits | Avatar   │
├──────────────────────────────────────────────────────┤
│  Welcome back, [Name]                                │
│  You have [N] remaining scans this month             │
├──────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Recent Scan  │  │ Recent Scan  │  ...             │
│  │ Image        │  │ Video        │                  │
│  │ Verdict: ✓   │  │ Verdict: ⚠  │                  │
│  │ [View] [DL]  │  │ [View] [DL]  │                  │
│  └──────────────┘  └──────────────┘                 │
├──────────────────────────────────────────────────────┤
│  [Show more history...]                              │
└──────────────────────────────────────────────────────┘
```

**Components:**

| Component | Description | States |
|-----------|-------------|--------|
| ScanCard | Thumbnail + verdict badge + date + actions | Default / Hover (elevate shadow + show actions) / Selected |
| EmptyState | Illustration + "Upload your first media" CTA | Shown when history is empty |
| CreditBadge | "14 scans remaining" with upgrade link | Normal / Warning (<5) / Exhausted |
| SearchBar | Search by filename, verdict, date range | Default / Active with results / No results |

**Empty State (First Visit):**
- Large illustration (forensic scientist examining media)
- Headline: "No scans yet"
- Subtext: "Upload your first image or video to see what Provance can uncover."
- CTA: "Start Your First Scan"

**Error State:**
- Cannot load history: Retry button + "Unable to load scan history" message
- Network offline: Banner with "Working offline — results will sync when reconnected"

---

### 4.3 New Scan (Upload)

**Route:** `/dashboard/scan` or modal overlay on dashboard
**Purpose:** Media acquisition interface.

**Layout (Full-width modal or page):**
```
┌──────────────────────────────────────────────────────┐
│  New Scan                                  [Cancel]  │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐            │
│  │                                      │            │
│  │     Drop files here or click to      │            │
│  │     upload                            │            │
│  │                                      │            │
│  │     Supports: PNG, JPEG, WebP, GIF   │            │
│  │     Max: 50MB per file               │            │
│  │                                      │            │
│  └──────────────────────────────────────┘            │
│                                                       │
│  Or paste a URL: [________________________] [Submit] │
│                                                       │
│  ┌────────────────── Privacy Notice ────────────────┐│
│  │  🔒 Your media is processed securely. In         ││
│  │  Ephemeral Mode, files are never written to      ││
│  │  disk — processed entirely in memory and         ││
│  │  automatically deleted after report generation.  ││
│  └──────────────────────────────────────────────────┘│
│                                                       │
│  [Proceed to Analysis →]                              │
└──────────────────────────────────────────────────────┘
```

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Dashed border dropzone + example icon | Drag events hover-activated |
| Drag Over | Solid border, green highlight, "Drop to upload" | Prevent default browser behavior |
| File Selected | Thumbnail preview + filename + size | Show file info card; URL field hidden |
| Uploading | Progress bar with percentage | Show estimated time remaining |
| Upload Error | Red border + error message | Specific error (size, format, network) |
| URL Invalid | Red underline + "Invalid URL" | Validate on blur |
| Success | Green check + processing transition | Auto-navigate to processing view |

**Constraints & Validation:**
- File size limit: 50MB (Pro); 500MB (Enterprise); 10MB (Trial)
- Supported formats: PNG, JPEG, WebP, GIF (images); MP4, MOV, WebM (video)
- URL validation: Must end in image/video extension OR return image/* or video/* content-type
- Simultaneous uploads: 1 (Trial); 5 (Pro); unlimited async (Enterprise)

---

### 4.4 Processing View

**Route:** `/dashboard/scan/{id}/processing`
**Purpose:** Show real-time analysis progress with progressive signal disclosure.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Scanning...                              [Cancel]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────────────────────────┐           │
│  │        Media Preview (Thumbnail)        │           │
│  └────────────────────────────────────────┘           │
│                                                       │
│  Analysis Progress — 3/5 signals complete             │
│                                                       │
│  ┌── Signal Pipeline ──────────────────────────────┐  │
│  │  ✅  Metadata Forensics            0.4s          │  │
│  │  ✅  Pixel/Frequency Analysis      1.2s          │  │
│  │  ⏳  Generative Fingerprint         63%   ...     │  │
│  │  ⏳  Compression Artifacts          Pending       │  │
│  │  ⏳  C2PA Verification              Pending       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                       │
│  [View Results →] (enabled when all complete)         │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Key UX Principles:**
- Signals light up progressively — don't keep user waiting for all signals to finish
- Fast signals (metadata) show results immediately
- Slow signals (generative fingerprint) show ETA 

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Queued | "In queue — position 3" with estimated wait | Show for video jobs under load |
| Processing | Animated pipeline with checkmarks appearing | Progressive signal completion |
| Image Near-Complete | 4/5 done, final signal loading | "View Partial Results" available |
| Video Processing | "Analyzing frame 47/120" + progress bar | Shows frame-level progress |
| Error | Signal fails → badge "Signal unavailable" | Partial results still shown; error noted in report |
| Complete | All green checks + pulse animation | Auto-navigate to verdict after 1.5s delay |

**Edge Cases:**
- User navigates away → processing continues; notification when done
- All signals fail → "Unable to analyze" with suggested actions
- Browser tab closed → email notification when complete (requires async job model)

---

### 4.5 Verdict & Evidence Breakdown

**Route:** `/dashboard/scan/{id}/result`
**Purpose:** The primary output page — where users consume the verdict and initiate report export.

**Layout (Two-panel — Narrative + Technical):**

```
┌──────────────────────────────────────────────────────┐
│  [← Back to Dashboard]    Scan #{id}    [Download]  │
├──────────────────────────────────────────────────────┤
│  ┌──── Verdict Banner ─────────────────────────────┐ │
│  │  🛡️  Authenticity Confirmed                      │ │
│  │  Strong forensic evidence supports authenticity │ │
│  │  Confidence: High                    [Download]  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [Executive Summary] | [Forensic Detail] | [Timeline] │
│                                                       │
│  ┌── Signal: Metadata Forensics ───────────────────┐  │
│  │  ✅  Clear                                      │  │
│  │  • EXIF data is consistent with iPhone 15 Pro   │  │
│  │  • Capture timestamp matches timezone claims     │  │
│  │  • No editing history found in metadata chain    │  │
│  │  [▶ Show raw metadata]                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                       │
│  ┌── Signal: Generative Fingerprint ────────────────┐ │
│  │  ✅  No synthetic fingerprints detected            │ │
│  │  • No GAN artifacts in frequency domain           │ │
│  │  • No diffusion watermark patterns found          │ │
│  │  • Pixel distribution matches camera sensor       │ │
│  └──────────────────────────────────────────────────┘  │
│                                                       │
│  ──── (continued for all signals) ────               │
│                                                       │
│  ┌── Methodology ──────────────────────────────────┐  │
│  │  Analysis v1.4.2 | Generated: 2026-06-25 14:30  │  │
│  │  Report UUID: abc-123-def-456                   │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Verdict Banner States (6 variants, color-coded):**

| Class | Banner Color | Icon | Example Label |
|-------|-------------|------|---------------|
| Authentic | Green | Shield-check | "Authenticity Confirmed" |
| Likely Authentic | Teal | Shield | "Authenticity Probable" |
| Inconclusive | Gray | Magnifying-glass | "Evidence Insufficient" |
| Suspicious | Amber | Alert-triangle | "Artifacts Detected" |
| Likely Synthetic | Orange | Alert-octagon | "Synthetic Generation Probable" |
| Synthetic | Red | X-octagon | "Synthetic Generation Confirmed" |

**Tab View Options:**
- **Executive Summary:** Plain-language verdict + "What This Means" paragraph + signal summary cards (collapsed)
- **Forensic Detail:** All signals expanded with raw data, thresholds, methodology notes
- **Timeline:** (For video) Frame-by-frame timeline showing which frames triggered signals

**Signal Card States (per card):**

| State | Visual | Detail |
|-------|--------|--------|
| Clear | Green check + "No anomalies found" | Happy path |
| Flagged | Amber alert + "Anomalies detected" | Shows specific findings |
| Inconclusive | Gray question + "Insufficient data" | Explains why |
| Error | Red X + "Analysis unavailable" | Explains error |
| Loading | Skeleton spinner | Rare (only for progressive results) |

**Actions Footer:**
- 📄 **Download PDF** (primary CTA)
- 🔗 **Create Share Link** (time-limited, revocable)
- 📋 **Copy Citation** (APA / MLA / Chicago / Bluebook dropdown)
- 📧 **Email Report** (send to colleague)
- 🗑️ **Delete Scan** (with confirmation)

---

### 4.6 Report Preview (Pre-Download)

**Route:** `/dashboard/scan/{id}/report-preview`
**Purpose:** Allow users to see what the PDF will look like before downloading.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Report Preview                    [Download PDF]    │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐│
│  │  ┌─ Cover Page ───────────────────────────────┐  ││
│  │  │  PROVANCE FORENSIC REPORT                    │  ││
│  │  │  Report ID: PR-2026-06-25-001               │  ││
│  │  │  Generated: June 25, 2026                   │  ││
│  │  │  Status: AUTHENTICITY CONFIRMED             │  ││
│  │  └─────────────────────────────────────────────┘  ││
│  │                                                    ││
│  │  ┌─ Executive Summary ─────────────────────────┐  ││
│  │  │  ...                                        │  ││
│  │  └─────────────────────────────────────────────┘  ││
│  │                                                    ││
│  │  ┌─ Evidence Appendix ─────────────────────────┐  ││
│  │  │  ...                                        │  ││
│  │  └─────────────────────────────────────────────┘  ││
│  │                                                    ││
│  │  ┌─ Methodology Appendix ──────────────────────┐  ││
│  │  │  ...                                        │  ││
│  │  └─────────────────────────────────────────────┘  ││
│  └──────────────────────────────────────────────────┘│
│                                                       │
│  [Download as PDF] [Download as Print-Ready]          │
└──────────────────────────────────────────────────────┘
```

---

### 4.7 Account Settings

**Route:** `/dashboard/settings`
**Purpose:** User profile, plan management, API keys, notification preferences.

**Tabs:**
- **Profile:** Name, email, avatar, password change
- **Plan:** Current plan details, usage stats, upgrade/downgrade
- **API Keys:** Generate/revoke API keys, rate limit info
- **Notifications:** Email alerts for scan completion, weekly digests
- **Security:** Session management, 2FA (Phase 1.1), connected apps
- **Billing:** Invoices, payment method, subscription management

---

## 5. Technical Requirements

### 5.1 Routing

| Route | Component | Auth Required | Notes |
|-------|-----------|---------------|-------|
| `/auth/login` | LoginPage | No | Redirect if already authed |
| `/auth/signup` | SignupPage | No | Redirect if already authed |
| `/auth/forgot-password` | ForgotPasswordPage | No | |
| `/dashboard` | DashboardPage (History) | Yes | Default post-auth route |
| `/dashboard/scan` | NewScanPage | Yes | |
| `/dashboard/scan/{id}/processing` | ProcessingPage | Yes | Owns the media |
| `/dashboard/scan/{id}/result` | VerdictPage | Yes | Owns the media |
| `/dashboard/scan/{id}/report-preview` | ReportPreviewPage | Yes | |
| `/dashboard/settings` | SettingsPage | Yes | |
| `/dashboard/settings/*` | Settings tabs | Yes | Sub-routes |

### 5.2 API Integration

The dashboard consumes the Provance API. Key endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/scans` | POST | Create a new scan (upload) |
| `/api/v1/scans/{id}` | GET | Get scan status and results |
| `/api/v1/scans/{id}/signals` | GET | Get individual signal details |
| `/api/v1/scans/{id}/report` | GET | Download PDF report |
| `/api/v1/scans` | GET | List user's scan history |
| `/api/v1/scans/{id}` | DELETE | Delete a scan |
| `/api/v1/users/me` | GET/PUT | User profile |
| `/api/v1/api-keys` | GET/POST/DELETE | API key management |

### 5.3 State Management

| State Slice | Key Data | Persistence |
|-------------|----------|-------------|
| Auth | User object, token, session expiry | localStorage + HTTP-only cookie |
| Scans | List of user scans, selected scan | Cache + API refetch |
| CurrentScan | Upload progress, signal results, verdict | Session + API |
| UI | Theme, sidebar state, active tab | localStorage |

### 5.4 Performance Targets

| Action | Target | Notes |
|--------|--------|-------|
| Dashboard page load (cached) | <1.5s | Skeleton loading state while fetching |
| Image upload confirmation | <500ms | Optimistic UI |
| Image analysis (standard res) | <8s P95 | Progressive signal disclosure |
| Video analysis queue time | <30s before processing | Clear ETA displayed |
| PDF report generation | <3s | Async server-side generation |

---

## 6. Non-Functional Requirements

### 6.1 Security
- **Authentication:** JWT with short expiry (15min) + refresh token (7 days)
- **Authorization:** Users can only access their own scans
- **Data Encryption:** All uploads encrypted at rest (AES-256) and in transit (TLS 1.3)
- **Ephemeral Mode:** Files never persisted; processed in-memory only
- **API Rate Limiting:** 60 req/min (Trial), 300 req/min (Pro), custom (Enterprise)
- **Session Management:** Revocable sessions, device tracking

### 6.2 Accessibility
- WCAG 2.1 AA compliance minimum
- All interactive elements keyboard-navigable
- Verdict banners have proper aria-labels
- Color is not the only indicator of verdict (icon + text label required)
- Focus indicators visible on all interactive elements

### 6.3 Responsiveness
- **Desktop:** Full layout (1200px+) — two-column verdict view
- **Tablet:** Single-column at 768-1199px
- **Mobile:** Simplified card layout at <768px — verdict banner is full-width

### 6.4 Error Handling
| Error | UX Treatment |
|-------|-------------|
| 401 Unauthorized | Redirect to login with "Session expired" toast |
| 403 Forbidden | "You don't have access to this scan" |
| 404 Not Found | "Scan not found — it may have been deleted" |
| 429 Rate Limited | Show cooldown timer + "Too many requests" |
| 500+ Server Error | "Something went wrong" + retry button + ticket reference |
| Network Offline | Persistent banner + queue actions for retry |
| Upload Failed | Specific error message + retry option |

---

## 7. Phase 1 vs. Future

### Phase 1 (MVP — This PRD)
- Individual workspace (no teams yet)
- Image + Video upload and analysis
- Progressive signal processing view
- Full verdict UI with all 6 classes
- Signal-by-signal expandable cards
- PDF report preview and download
- Share link generation
- Scan history view
- Account settings (basic)
- API key management

### Phase 1.1 (Beta)
- Google OAuth / Magic link auth
- 2FA support
- Batch upload (multi-file)
- Email notifications for async jobs
- Team workspaces: shared scan history
- Role-based access (Admin / Editor / Viewer)

### Phase 2 (Enterprise)
- SSO/SAML
- Custom branding on reports (white-label)
- Private cloud deployment option
- Audit logs export (SOC2-ready)
- Custom signal configurations
- Webhook integrations

---

## 8. Success Metrics

| KPI | Target | Measurement |
|-----|--------|-------------|
| Scan Completion Rate | >90% of initiated scans complete | Upload → verdict funnel |
| Time-to-Verdict (Images) | <8s P95 | End-to-end processing time |
| Report Download Rate | >60% of completed scans | Downloads / completed scans |
| Share Link Creation | >15% of users per session | Share links created / sessions |
| Repeat Scan Rate | >40% within 30 days | Users with 2+ scans in 30 days |
| Dashboard Engagement | >3 min average session | Session duration |
| Verdict Understanding | >85% user satisfaction | In-app survey after verdict |

---

## 9. Design Assets & References

- **Design System:** Refer to Creative Director's brand guidelines (typography: Instrument Serif + IBM Plex Sans + JetBrains Mono)
- **Color Palette:** Warm Parchment (#FDFCFB), Deep Charcoal (#1A1A1A), Amber (#F59E0B)
- **Veracity Language:** See `VERACITY_LANGUAGE.md` for exact verdict terms and confidence scales
- **User Flow:** See `REPORT_FLYWHEEL.md` for the end-to-end user journey model
- **Forensic Grid:** 20px grid background on all dashboard surfaces (brand element)

---

## 10. Open Questions / Decisions Needed

1. Should the Processing view auto-navigate to Verdict or require a manual "View Results" click?
   - *Recommendation: Auto-navigate with a 1.5s delay, with an option to cancel*

2. Should we support simultaneous multiple file upload in Phase 1?
   - *Recommendation: No — single file only in Phase 1. Multi-file in Phase 1.1.*

3. Should Trial users see a watermarked report preview or the full report?
   - *Recommendation: Full report preview with "Trial" watermark overlay. Unwatermarked on Pro.*

4. Should we include a "Compare with Original" slider in the verdict view?
   - *Recommendation: Nice-to-have for Phase 1.1 — skip for MVP.*

---

*This PRD is a living document. All team members should reference it for dashboard development. Questions and amendments should be raised with the Head of Product.*
