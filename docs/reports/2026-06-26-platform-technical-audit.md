# Provance SaaS Platform: Technical Status & Architecture Report
**Date:** 2026-06-26 12:45 UTC  
**Subject:** Comprehensive Technical Audit and Strategy Recommendation  

> Update note. 2026-07-07.
>
> This report is a historical status snapshot from before the current NestJS backend, worker deployment, and authenticated product foundations were completed.
>
> Use it as a dated audit record only. For current implementation truth, use `README.md` and `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`.

---

## 1. Project Status

Provance is currently in **Phase 2: Core Platform Infrastructure**. We have successfully transitioned from a static landing page baseline to a high-fidelity "Trust Infrastructure" organization.

*   **Current Development Progress:** 
    *   The **Landing Page Redesign** is the absolute immediate priority. The `agent-designer-engineer` is currently refactoring `Home.tsx` to integrate premium forensic visualizers and the new "Forensic Authority" brand identity.
    *   **Backend Scaffolding** is in progress. The `agent-cto` has initialized the Hono/Node.js environment and is preparing the API for the "Upload -> Analyze" verification loop.
*   **Features Completed:**
    *   Ratified Business Plan and GTM Strategy.
    *   Defined **Veracity Language** (6-class taxonomy).
    *   **Forensic Signature Catalog** for Sora, Midjourney, Kling, and Flux.
    *   **Signal Schema Specification** for multi-signal data contract.
    *   Initial **Provance-1000 Benchmark** dataset assembly (100 "Gold Standard" assets).
*   **Features in Development:**
    *   Interactive Hero with **Signal Visualizer**.
    *   Forensic Report Preview page.
    *   Backend API scaffolding (Hono/Node.js).
    *   "Trust-Weighted Accuracy" (TWA) evaluation harness.
*   **Features Not Yet Started:**
    *   Authenticated User Dashboard (History/Team Management).
    *   Video analysis pipeline (async job model).
    *   Payment/Entitlement integration (Stripe).
    *   PDF Generation engine.
*   **Current Blockers & Risks:**
    *   **Priority Alignment:** Balancing the need for a polished landing page with the backend development required for the "Verification Loop."
    *   **Stack Reconciliation:** The current implementation (Hono/Node) differs from the architecture recommendation (Python/FastAPI) for ML-heavy workloads.
*   **Overall Project Completion Percentage:** ~25% (Foundations and Strategy are 90% complete; Core Infrastructure and UI are 15% complete).

---

## 2. Technology Stack

### Frontend
*   **Framework:** React 18 (Vite-powered).
*   **UI Library:** Custom components built with **Tailwind CSS**.
*   **Styling System:** Tailwind CSS v3 with custom design tokens for the "Parchment/Charcoal/Amber" palette.
*   **State Management:** **Zustand** (lightweight, reactive, excellent for scanning states).
*   **Animations:** **Framer Motion** (for clinical, dashboard-style reveals and the scanning beam animations).
*   **Forms:** React Hook Form (recommended for the waitlist and auth).
*   **Data Fetching:** TanStack Query (recommended for polling async verification jobs).
*   **Typography:** Instrument Serif (Editorial weight), IBM Plex Sans (Utility), DM Mono (Forensic precision).
*   **Build Tools:** Vite 6.

### Backend
*   **Framework:** **Hono** (High-performance, edge-ready, minimal overhead).
*   **Runtime:** Node.js (current scaffolding); Python/FastAPI (recommended for the Signal Analysis service).
*   **API Architecture:** RESTful with standardized JSON-RPC style payloads for signal data.
*   **Authentication:** JWT-based with short-lived access tokens and 7-day refresh tokens.
*   **Background Jobs:** BullMQ or Inngest (recommended for video processing).
*   **Queue System:** Redis (recommended for orchestration).
*   **File Storage:** Private S3-compatible object storage with signed URL ingestion.
*   **Search Engine:** Meilisearch (recommended for scan history).

### Database
*   **Primary Database:** **Turso (libSQL/SQLite)** for edge-side low-latency metadata; **PostgreSQL** (recommended for production multi-tenant RBAC).
*   **ORM:** Drizzle ORM (recommended for type-safety and performance).
*   **Vector Database:** pgvector or Pinecone (for signature matching and model attribution).
*   **Migration Strategy:** Managed via Drizzle Kit or Atlas.

### Infrastructure & DevOps
*   **Hosting:** Vercel (Frontend) + Fly.io or AWS (Backend/Workers).
*   **CDN:** Cloudflare (Edge caching and protection).
*   **Object Storage:** AWS S3 or R2 (with strict private-by-default buckets).
*   **CI/CD:** GitHub Actions with automated PR previews.

---

## 3. AI Architecture

*   **Architecture:** Multi-Signal Ensemble. We reject the "single score" model.
*   **Model Orchestration:** A Python-based **Scan Orchestrator** fanning out to parallel forensic workers.
*   **Prompt Architecture:** Structured metadata extraction for C2PA and EXIF parsing.
*   **Context Management:** Every scan carries a "Session Context" including user plan limits, methodology version, and hardware node ID.
*   **Evaluation Strategy:** **Trust-Weighted Accuracy (TWA)**. We penalize "Confident Wrong" results (Synthetic marked as Authentic with >90% confidence) more heavily than "Honest Uncertainty."
*   **Model Versioning:** Strict SemVer for the methodology (e.g., v2.4.1), ensuring old reports remain reproducible.

---

## 4. AI Models (Signature Map)

| Model Target | Forensic Task | Strengths | Limitations |
| :--- | :--- | :--- | :--- |
| **Sora (DiT)** | Temporal Discontinuity | Physics-based artifact detection. | High compute cost; needs frame sampling. |
| **Midjourney v6** | Spectral Decoupling | High-frequency band analysis. | Sensitive to heavy JPEG compression. |
| **Flux.1** | Chroma Grid Analysis | Detects 4x4 upscaling checkerboards. | Highly precise; small error margins. |
| **Kling AI** | Motion Jitter | Temporal stability checks. | Susceptible to low-frame-rate false positives. |

---

## 5. Content Scanning & Processing Pipeline

1.  **Ingestion:** Signed upload to private bucket -> API emits `scan.created` event.
2.  **Preprocessing:** Normalization (resizing, colorspace check, SHA-256 hashing).
3.  **Parallel Analysis:** 
    *   **Pillar 1:** Metadata Forensics (EXIF/XMP).
    *   **Pillar 2:** Pixel/Frequency (Fourier Transform).
    *   **Pillar 3:** Generative Fingerprints (DiT/GAN artifacts).
    *   **Pillar 4:** Compression/ELA (Double-quantization).
    *   **Pillar 5:** Provenance (C2PA content credentials).
4.  **Ensemble Logic:** Weighted averaging based on signal confidence and methodology version.
5.  **Artifact Generation:** Final verdict classification -> JSON result -> PDF Report generation.

---

## 6. Authentication & Security

*   **Session Management:** Revocable JWT sessions with device fingerprinting.
*   **Ephemeral Mode:** A core privacy feature where files are processed in-memory and never written to persistent disk (Enterprise tier).
*   **RBAC:** Role-Based Access Control (Admin, Investigator, Viewer) at the Organization level.
*   **API Security:** Scoped API keys with IP whitelisting and rate-limiting (Leaky Bucket algorithm).

---

## 7. Recommendations & Technical Debt

### Strengths
*   **Category Positioning:** The "Trust Infrastructure" shift is defensible and aligns with emerging EU AI Act mandates.
*   **Schema Rigor:** The `SIGNAL_SCHEMA_SPEC.md` is world-class and ensures front-to-back data integrity.

### Risks & Debt
*   **Stack Fragmentation:** Moving forward with Hono/Node for the *API* is excellent for speed, but the *Analysis Engine* must remain Python-native. I recommend a microservice split: Hono for the user-facing API/Auth and FastAPI for the ML analysis workers.
*   **Database Reconciliation:** While Turso is great for the MVP, the "Forensic Case File" requirement (long history, complex queries) will eventually favor PostgreSQL. I recommend using **Drizzle ORM** now so we can pivot between the two with minimal code change.

### Next Steps for Engineering
1.  **Finalize Landing Page:** Complete the `Home.tsx` refactor with the Signal Visualizer.
2.  **Verify the Loop:** Build a minimal "Internal-only" upload path that returns the `SIGNAL_SCHEMA_SPEC` JSON before the Dashboard is built.
3.  **Benchmark V0.1:** Execute the AI Researcher's benchmark against the Provance-1000 dataset to publish our first performance transparency report.

**Report Prepared by:** Team Lead, Provance
