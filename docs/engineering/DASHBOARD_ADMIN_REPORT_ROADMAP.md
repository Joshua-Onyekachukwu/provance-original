# Dashboard · Admin · Report · Video/API Roadmap (Founder review draft)

Status: **pending founder approval** — nothing here is built yet.
Review the phases, mark what you want, and I start with the approved slice.

---

## 0. What already exists (so we build, not rebuild)

| Surface | Current state |
|---|---|
| Dashboard | Hero w/ system reading, scan-quota chip (≥85% → Billing), 4 KPIs, 14-day volume trend + verdict-mix stacked chart, Triage/History tabs (risk watch, queue posture, system status, ledger), Activity/Reports/Notifications tabs, ⌘K commands, `?team=` URL scoping, 5s live polling with indicators, `?state=` demo forcing, empty/error states everywhere |
| Uploads | Image-only (JPG/PNG/WEBP/GIF ≤50MB), processing-mode selector (quick/standard/deep), idempotency keys, signed-URL upload, quota gate (402), dedup detection, live status tracking |
| Queue | Real BullMQ round-trip (Upstash Redis), retries/backoff (attempts 3), queue posture + ledger, live indicators |
| Reports | Rich report document model (cover, exec summary, metrics, per-signal evidence, findings, next steps, custody chain, evidence appendix), printable view, and a **server-generated branded A4 PDF (pdfkit)** in real mode |
| Admin (12 pages) | Overview, Jobs (+ worker panel, retry/fail, deep links), Users, Organizations, Reports, Roles (scope matrix + live audit), Analytics, Monitoring, Audit Logs (+ CSV), Waitlist, Feature Flags, Settings — all with backend parity + mock fallback |
| API | Scans CRUD + idempotency, admin surface, org/invites, security sessions + cookies, notifications, billing, api-keys, webhooks, analytics, monitoring, audit logs |

**The gap you felt on the report is real:** in **mock/dev mode** (USE_MOCK on, the default) "Export PDF" opens the **browser print dialog** of the web page. The mature branded server PDF only exists in real mode. That flips first (Phase 1).

---

## Phase 1 — The branded report PDF (your #1 pain)

**Goal: every report download is a real, branded, professional PDF file. No print dialog, ever.**

1. **One export path, both modes** — mock/dev mode generates the PDF client-side from the *same* report-document model the server uses (pdf-lib or a shared renderer), so mock and real produce byte-equivalent branded PDFs. Delete the print-dialog fallback.
2. **Upgrade the server generator (pdfkit)** to production branding:
   - Provance wordmark/logo + brand palette + typography (serif headings / sans body) instead of plain Helvetica.
   - **Cover page**: case title, report ID, media thumbnail, generated-for/by, date, classification line.
   - **Verdict banner** with risk level + confidence (colored), executive summary box.
   - Per-signal cards with tone chips, metadata tables, timeline, findings with severity, custody chain, **evidence appendix** (already in the document model).
   - **Footer**: page numbers, confidentiality line; **signature block** (analyst + date); **verification QR/link** so a printed report can be re-checked against the record.
3. **Print-quality HTML fallback** for the browser print case (A4 pagination, no mid-card splits) — kept only as a secondary path.

## Phase 2 — Video + audio verification (the big build)

**Goal: verify video and audio, not just images.** Today the backend rejects everything but images (`mediaType !== 'image'` → 400, image-only MIME allowlist, image-only analysis).

1. **Pipeline**: allowlist `video/mp4`, `video/webm`, `audio/mpeg`, `audio/wav`, `audio/ogg`; size/duration caps; media_type on scans (already a column).
2. **Frame extraction (ffmpeg in the worker)**: pull N frames (opening / midpoint / closing + scene-change keyframes), run the existing image pipeline per frame, **aggregate per-signal across frames** (consensus + per-frame variance).
3. **Video-native signals**: container integrity, codec/metadata audit, frame-continuity (duplicate-frame / FPS anomalies), scene-edit detection, compression-artifact (blockiness) analysis, audio-track spectral/artifact checks.
4. **Report**: video section with frame timeline + per-frame verdict thumbnails, audio panel; PDF embeds frame stills.
5. **UI**: media-type selector on Uploads, video preview, per-frame evidence viewer in the report.

## Phase 3 — API product surface

1. **Public verification API**: `POST /v1/verify` (upload → verify), keyed + rate-limited, returns report webhook on completion. Webhooks already exist — add HMAC signatures, retries with backoff, delivery logs, replay.
2. **Report retrieval**: `GET /v1/reports/:id` (JSON) + `:id/pdf` (exists) + **share tokens** (unsigned report links with expiry).
3. **Batch verification** (multi-file) + **usage metering** per key/plan (`api_usage` table already migrated).
4. Node + Python SDKs (later).

## Phase 4 — Dashboard value features

1. **Media-type donut** (image vs video share) — the DonutChart primitive already exists unused on the dashboard.
2. **Week-over-week deltas** on KPIs (▲/▼ badges), **saved views**, verdict + date filters on the dashboard ledger (already on History).
3. **Queue controls**: pause queue, prioritize a scan (P0/P1 bump).
4. **Share/copy link + open-report actions** inline in the ledger; **report access audit** (who viewed when).
5. **Onboarding checklist** (first upload → first report → invite a teammate → set up a webhook).
6. Storage + API-call usage meters (not just scan quota) — Billing already has the data.

## Phase 5 — Admin depth

1. **Overview**: plan/seat mix, top orgs by volume, uptime/incident timeline, revenue signals.
2. **Jobs**: per-job logs, requeue-all failed, worker concurrency controls, retention/cleanup.
3. **Monitoring**: alert thresholds, incident create/resolve from the UI, public status page (`/status`), pager/webhook alerting.
4. **Organizations**: seat utilization, plan upgrade flows. **Users**: bulk actions, admin-initiated session revoke.
5. **Audit Logs**: retention policy, diff view. **Settings**: SMTP + branding config (logo used by the PDF), AI threshold tuning.
6. **Waitlist**: bulk import, email templates.

---

## Suggested order (my recommendation)

1. **Phase 1 (report PDF)** — smallest, highest visibility, directly fixes what you flagged.
2. **Phase 2 (video)** — the differentiator for the product; biggest lift, start with ffmpeg frame pipeline + one video signal, then expand.
3. **Phase 4 (dashboard features)** — cheap wins alongside Phase 2.
4. **Phase 5 (admin depth)** — fill the detail you asked for.
5. **Phase 3 (public API)** — after the pipeline is stable.

Tell me which phases to approve (or reorder), and I'll start with Phase 1 unless you say otherwise.
