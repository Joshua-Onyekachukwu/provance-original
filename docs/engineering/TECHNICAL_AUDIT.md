# Provance — Technical Audit & Founding Redesign Architecture

**Author:** CTO  
**Date:** 2026-06-25  
**Status:** Historical audit before the backend and authenticated app buildout  

> Update note. 2026-07-07.
>
> This audit was accurate when the repo was frontend-only. It is no longer a current description of the codebase.
>
> Since then, the repo has added:
> - a NestJS backend in `backend/`
> - Supabase-backed auth and scan persistence
> - protected `/app/*` routes
> - queue-backed scan processing with a Fly worker
> - live dashboard, uploads, and report detail foundations

---

## 1. Executive Summary

The current provance.ai repository (`Joshua-Onyekachukwu/provance`) is a fully frontend-only marketing site — a static React SPA built with Vite + TypeScript + Tailwind CSS. It has **no backend, no auth, no API, no media processing pipeline, no PDF generation, and no database**. The extensive `docs/` directory and `Provance_Complete_Development_Guide.md` contain the *architectural vision* (FastAPI + Supabase + Celery/Redis + Next.js) but this is **not implemented in code**.

The "Founding Redesign" must bridge this gap: evolve the polished marketing surface into a **working verification platform** with a real backend, while keeping the frontend as the single public surface on port 3000.

---

## 2. Current Codebase Audit

### 2.1 Stack Snapshot

| Layer | Technology | Status |
|-------|-----------|--------|
| Build tool | Vite 6.3 | ✅ Working |
| Framework | React 18 + TypeScript | ✅ Working |
| Routing | React Router DOM v7 | ✅ Working |
| Styling | Tailwind CSS v3 + Custom CSS | ✅ Working |
| State | Zustand 5 (installed, unused) | ⚠️ Not wired |
| Tests | Vitest + jsdom | ✅ 3 smoke tests pass |
| Backend | None | ❌ Missing |
| Database | None | ❌ Missing |
| Auth | None (cosmetic forms only) | ❌ Missing |
| Media processing | None | ❌ Missing |
| PDF generation | None | ❌ Missing |
| API layer | None | ❌ Missing |

### 2.2 Frontend Architecture

```
src/
├── App.tsx                    # Router: 11 routes
├── main.tsx                   # Entry point
├── index.css                  # Tailwind + custom theme tokens
├── lib/utils.ts               # cn() helper (clsx + tailwind-merge)
├── hooks/useTheme.ts          # Dark/light toggle (unused in components)
├── data/siteContent.ts        # All static content, pricing, nav, FAQs
├── components/
│   ├── layout/
│   │   ├── PublicLayout.tsx   # Grid background + header/outlet/footer
│   │   ├── SiteHeader.tsx     # Sticky nav with mobile hamburger
│   │   └── SiteFooter.tsx     # Footer with CTA + link groups
│   └── marketing/
│       ├── InfoPage.tsx       # Reusable page template (eyebrow + title + highlights + CTA)
│       ├── ReportPreview.tsx  # Mock forensic report UI card
│       └── SectionHeading.tsx # Eyebrow + title + description
└── pages/
    ├── Home.tsx               # Hero + trust pills + how-it-works + report preview + FAQ
    ├── ProductPage.tsx        # InfoPage with product highlights
    ├── SolutionsPage.tsx      # Grid of use-case cards
    ├── SolutionDetailPage.tsx # Dynamic slug-based detail page
    ├── PricingPage.tsx        # 4-tier pricing grid
    ├── MethodologyPage.tsx    # InfoPage with methodology data
    ├── SampleReportPage.tsx   # Report preview + CTA
    ├── DocsPage.tsx           # InfoPage placeholder
    ├── SecurityPage.tsx       # InfoPage placeholder
    ├── SignInPage.tsx         # Cosmetic form (no auth)
    └── SignUpPage.tsx         # Cosmetic form with intent routing (no auth)
```

### 2.3 Strengths

1. **Clean component architecture** — reusable `InfoPage`, `SectionHeading`, `ReportPreview` patterns
2. **Professional visual design** — warm parchment palette, Fraunces display + JetBrains Mono + Manrope font stack, forensic grid background, subtle animations
3. **Good test coverage** for the UI surface — routing smoke tests, form submission tests
4. **Extensive documentation** — `docs/` directory has full product requirements, system design, architecture docs, and business strategy
5. **Well-structured data** — all site content centralized in `siteContent.ts`
6. **TypeScript throughout** — full type coverage with path aliases (`@/`)

### 2.4 Critical Gaps

1. **No backend whatsoever** — the reference `Provance_Complete_Development_Guide.md` describes FastAPI + Supabase but zero backend code exists
2. **Placeholder auth** — SignIn/SignUp forms are client-side only with fake "submitted" states, no backend connection
3. **No media upload infrastructure** — no upload endpoint, no file handling, no processing
4. **No PDF generation** — `ReportPreview.tsx` is a static CSS mock, not an actual PDF
5. **No async job model** — no queue, no worker, no status tracking for video processing
6. **No database** — no SQLite/Turso tables for scans, signals, users, audits
7. **Index.html title** — still says "My Trae Project"
8. **Tailwind config is vanilla** — custom theme tokens (ink, surface, sand, accent) are defined only in CSS, not in the Tailwind config
9. **Zustand installed but unused** — no state management wired anywhere
10. **Theme hook unwired** — `useTheme.ts` exists but no toggle button in the UI

---

## 3. Founding Redesign: Technical Architecture Proposal

### 3.1 Architecture Philosophy

The system must serve two audiences simultaneously:
- **Marketing site** (public, unauthenticated) — the current 11-route SPA
- **Verification platform** (authenticated) — upload → process → report → history

Both live on a **single origin** (port 3000) as required. The marketing site is served by Vite dev/static build; the verification API runs behind a proxy on the same port.

### 3.2 Proposed Stack

```
┌─────────────────────────────────────────────────────┐
│                   Port 3000                          │
│  ┌──────────────────┐   ┌─────────────────────────┐  │
│  │  Vite Dev Server  │   │  API Proxy / Backend    │  │
│  │  (React SPA)      │   │  (FastAPI / Node.js)     │  │
│  │  / → Public site  │   │  /api/v1/*              │  │
│  │  /app/* → Dashboard│   │  /api/v1/scan           │  │
│  └──────────────────┘   └─────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Shared: Auth session, Scan state via API calls │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### Phase 1 — Immediate (keep + extend)
| Layer | Technology | Rationale |
|-------|-----------|----------|
| Frontend framework | React 18 + Vite 6 | Already in place, works well |
| Styling | Tailwind CSS v3 + Custom CSS | Already in place |
| Animation | Framer Motion | Add for scroll-driven + interactive animations |
| Routing | React Router v7 | Already in place; add `/app/*` for dashboard |
| State management | Zustand 5 | Already installed; wire for scan state, auth state |
| HTTP client | fetch or ky | For API calls to backend |

#### Phase 1 — Backend (new, co-located on port 3000)
| Layer | Technology | Rationale |
|-------|-----------|----------|
| API framework | **Node.js (Hono)** or **Python (FastAPI)** | Hono: same JS ecosystem, lighter memory, fast dev. FastAPI: better for ML pipeline. **Recommendation: Hono for Phase 1 workflow layer; FastAPI for Phase 2 ML engine** |
| Database | SQLite via Turso | Already tooled (`team-db`), perfect for MVP metadata |
| Media storage | Local filesystem (dev) → S3 (prod) | Encrypted at rest |
| Auth | JWT + session tokens → Supabase Auth later | Lightweight, no external dep for MVP |
| PDF generation | **Puppeteer** (HTML→PDF) or **jsPDF** | Puppeteer gives pixel-perfect report rendering from React components |
| Async job queue | In-process thread pool (Phase 1) → **BullMQ + Redis** (Phase 2) | Avoid Redis dependency in MVP |

### 3.3 Data Architecture (SQLite/Turso)

#### Core Tables

```sql
-- Users & Organizations
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  org_id      TEXT REFERENCES organizations(id),
  role        TEXT DEFAULT 'member',  -- 'admin', 'member', 'viewer'
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE organizations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tier        TEXT DEFAULT 'trial',  -- 'trial', 'pro', 'team', 'enterprise'
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Scans (core forensic record)
CREATE TABLE scans (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  org_id          TEXT REFERENCES organizations(id),
  media_hash      TEXT NOT NULL,         -- SHA-256 of original file
  media_type      TEXT NOT NULL,         -- 'image' | 'video'
  filename        TEXT,
  file_size       INTEGER,               -- bytes
  duration_sec    INTEGER,               -- video only
  status          TEXT DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'failed'
  verdict         TEXT,                   -- 'authentic', 'synthetic', 'uncertain'
  confidence      REAL,                   -- 0.0 to 1.0
  methodology_ver TEXT,                   -- semver of analysis pipeline
  started_at      TEXT,
  completed_at    TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Individual forensic signals per scan
CREATE TABLE signals (
  id          TEXT PRIMARY KEY,
  scan_id     TEXT NOT NULL REFERENCES scans(id),
  signal_name TEXT NOT NULL,              -- 'frequency_anomaly', 'metadata_inconsistency', etc.
  category    TEXT NOT NULL,              -- 'pixel', 'metadata', 'temporal', 'generative_fingerprint'
  confidence  REAL,                       -- 0.0 to 1.0
  details     TEXT,                       -- JSON blob of evidence
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Generated forensic reports
CREATE TABLE reports (
  id              TEXT PRIMARY KEY,
  scan_id         TEXT NOT NULL REFERENCES scans(id),
  pdf_path        TEXT,                   -- path or S3 key to PDF
  methodology_ver TEXT,
  generated_at    TEXT DEFAULT (datetime('now'))
);

-- Immutable audit trail
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,              -- 'scan.created', 'report.downloaded', etc.
  details     TEXT,                       -- JSON
  ip_address  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### 3.4 Forensic Analysis Pipeline Architecture

```
Upload → Hash (SHA-256) → Store → Enqueue
                                      ↓
                            ┌─────────────────┐
                            │ Scan Orchestrator │
                            └─────────────────┘
                                      │
               ┌──────────────────────┼──────────────────────┐
               ▼                      ▼                      ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │ Pixel Signal  │    │  Metadata     │    │  Generative   │
        │  Analysis     │    │  Forensics    │    │  Fingerprint  │
        └──────────────┘    └──────────────┘    └──────────────┘
               │                      │                      │
               └──────────────────────┼──────────────────────┘
                                      ▼
                            ┌─────────────────┐
                            │  Ensemble Engine  │
                            │  (weighted merge)  │
                            └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Verdict + Report │
                            │  Generation       │
                            └─────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                   ┌──────────┐           ┌──────────────┐
                   │ DB Write  │           │ PDF Render   │
                   │ (scans +  │           │ (Puppeteer)  │
                   │  signals) │           └──────────────┘
                   └──────────┘
```

**Signal categories (Phase 1 MVP):**
1. **Pixel-level analysis** — DCT frequency domain anomalies, noise pattern inconsistency
2. **Metadata forensics** — EXIF stripping, editing software signatures, camera model mismatches
3. **Generative fingerprint** — Known generator signatures (diffusion models, GANs)
4. **Temporal consistency** (video only) — Frame-to-frame anomaly detection

**Verdict language (per owner vision):**
- `authentic` — strong evidence of organic capture; all signal categories align
- `synthetic` — strong evidence of AI generation; multiple signals agree
- `uncertain` — signals conflicting or insufficient; explicit limitations stated

### 3.5 Async Video Processing Model

For video scans (which can be long):

```
1. Upload → Client sends file, gets back scan_id immediately
2. Orchestrator:
   a. Validates file (format, size, duration limits)
   b. Samples key frames (intelligent: scene-change detection)
   c. Enqueues frame-by-frame analysis jobs
3. Worker pool:
   a. Each worker processes one frame through signal pipeline
   b. Results stream back to aggregator
4. Aggregator:
   a. Waits for all frame results (or timeout)
   b. Produces temporal consistency score
   c. Generates video-level verdict
5. Client polling:
   a. GET /api/v1/scans/:id — returns status + progress (0-100%)
   b. On complete: result payload with all signals
```

**Frame sampling strategy:**
- Short clips (< 30s): sample every 0.5s
- Medium clips (30s–5min): sample at scene changes + regular intervals
- Long clips (> 5min): adaptive sampling based on motion vectors

**Job queuing:**
- Phase 1: In-process worker pool (max 2 concurrent video jobs)
- Phase 2: BullMQ + Redis for distributed processing
- Phase 3: GPU-accelerated batch processing on dedicated workers

### 3.6 API Surface (Phase 1)

```
POST   /api/v1/auth/signup          # Create account
POST   /api/v1/auth/signin          # Sign in
POST   /api/v1/auth/signout         # Sign out
GET    /api/v1/auth/me              # Current user
GET    /api/v1/scans                # List user's scans (history)
POST   /api/v1/scans                # Upload & initiate scan
GET    /api/v1/scans/:id            # Scan detail + signals
GET    /api/v1/scans/:id/status     # Poll scan progress
GET    /api/v1/scans/:id/report     # Download PDF report
DELETE /api/v1/scans/:id            # Delete scan & media
```

### 3.7 Implementation Sequence

#### M1 — Backend Foundation (Week 1)
- [ ] Scaffold Hono/FastAPI server on port 3000 alongside Vite
- [ ] Set up SQLite/Turso schema (users, scans, signals, reports, audit_logs)
- [ ] Implement JWT auth endpoint (signup/signin/signout)
- [ ] Vite proxy: `/api/*` → backend on port 3000
- [ ] Serve built SPA from backend for non-API routes

#### M2 — Scan Pipeline MVP (Week 2)
- [ ] Implement `POST /api/v1/scans` — file upload + SHA-256 hashing
- [ ] Build pixel-level + metadata signal analyzers (Python or JS)
- [ ] Ensemble engine — merge signals into verdict
- [ ] Write results to `scans` + `signals` tables
- [ ] `GET /api/v1/scans/:id/status` with progress tracking

#### M3 — Report Generation (Week 3)
- [ ] Build forensic report React component (for PDF rendering)
- [ ] Puppeteer PDF generation — HTML → PDF with evidence appendix
- [ ] `GET /api/v1/scans/:id/report` — return PDF
- [ ] Wire "Download PDF" in frontend dashboard

#### M4 — Dashboard Frontend (Week 4)
- [ ] `/app/dashboard` — authenticated route
- [ ] `/app/upload` — drag-and-drop media upload with progress
- [ ] `/app/scan/:id` — result view with signal breakdown
- [ ] `/app/history` — scan history table
- [ ] Wire `useTheme.ts` + add theme toggle

#### M5 — Async Video (Week 5)
- [ ] Frame extraction pipeline (ffmpeg or similar)
- [ ] Frame-based signal analysis
- [ ] Temporal consistency scoring
- [ ] Progress tracking for long jobs
- [ ] Video sample rate + scene detection

#### M6 — Team & Enterprise (Week 6+)
- [ ] Organization management
- [ ] RBAC (admin/member/viewer)
- [ ] API key management
- [ ] Batch processing
- [ ] Audit log UI

---

## 4. Security & Trust Posture

### 4.1 Media Handling
- **Ephemeral mode** — media processed in-memory, never written to disk
- **Encrypted storage** — AES-256-GCM for media at rest
- **Automatic cleanup** — TTL-based deletion configurable per org
- **Content hash** — SHA-256 of every upload; duplicate detection prevents redundant processing

### 4.2 Audit Compliance
- Every scan, download, and report generation logged to `audit_logs`
- Methodology version pinned in every scan record for reproducibility
- Signal-level evidence preserved — consumer can re-verify independently

### 4.3 Verdict Integrity
- **No fake certainty** — confidence < 0.6 triggers "uncertain" verdict
- **Confidence language** — numeric score + qualitative label ("High", "Medium", "Low", "Insufficient")
- **Methodology versioning** — every scan ties to a specific pipeline version

---

## 5. Performance Targets

| Metric | Phase 1 Target | Phase 2 Target |
|--------|---------------|---------------|
| Image scan (pipeline) | < 5s (synchronous) | < 2s (warm cache) |
| Video scan (30s clip) | < 60s (async, 2 concurrent) | < 20s (GPU) |
| PDF generation | < 5s | < 2s (cached templates) |
| Upload confirmation | < 500ms | < 200ms |
| Dashboard page load | < 2s (SSR) | < 1s (with SWR) |

---

## 6. Key Architectural Decisions

1. **Single origin on port 3000** — Vite dev server for frontend, Hono/FastAPI backend proxied under `/api`. In production, serve built SPA from backend.
2. **SQLite/Turso as primary DB** — `team-db` infrastructure already in place; perfect for MVP metadata. Migrate to PostgreSQL when scale demands it.
3. **Zustand for frontend state** — already installed. Wire for auth, scan, and app state.
4. **Puppeteer for PDF** — renders React components to PDF for pixel-perfect reports that match the UI. Report templates live in React.
5. **Phase 1: in-process workers** — avoid Redis dependency until video processing at scale justifies it.
6. **Phase 1: Hono as API layer** — JS ecosystem match, lighter than FastAPI for the workflow layer. FastAPI reserved for ML pipeline in Phase 2.

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Rapid AI evolution makes detectors obsolete | Focus on *provenance* and *consistency* signals, not just model-specific fingerprints |
| High compute costs for video | Usage-based pricing + intelligent frame-sampling |
| False confidence erodes trust | "Uncertain" verdict as default for low-confidence cases; clear limitations in every report |
| ML model drift | Methodology version pinning; periodic re-evaluation against benchmark datasets |
| Sensitive media exposure | Ephemeral processing mode; encrypted storage; TTL-based auto-deletion |

---

## 8. Immediate Action Items

1. **Update `index.html` title** — from "My Trae Project" to "Provance | Trust Infrastructure for Synthetic Media"
2. **Wire Tailwind config** — move custom theme tokens (ink, accent, sand) from CSS vars into `tailwind.config.js` extend
3. **Scaffold backend** — Hono/FastAPI on port 3000 with `/api` prefix
4. **Initialize Turso schema** — create the tables defined in §3.3
5. **Implement JWT auth** — signup/signin endpoints with hashed passwords
6. **Build scan pipeline** — phased per §3.7 M1-M6

---

*This document serves as the CTO's technical roadmap for the Founding Redesign. The architecture prioritizes credibility, defensibility, and workflow-readiness over raw detection performance — in direct alignment with the owner's vision.*
