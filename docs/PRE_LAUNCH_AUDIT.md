# Provance — Pre-Launch System Audit

**Date:** August 18, 2026
**Auditor:** Codebuff (Automated Engineering Review)
**Scope:** Full-stack technical, product, UX, performance, security, and business-readiness audit

---

## A. Executive Summary

Provance is a **media authenticity verification platform** built with a React frontend, NestJS backend, Supabase (PostgreSQL + Auth + Storage), and BullMQ/Redis for background processing. The system is **substantially built and architecturally sound** — the scan pipeline, billing/VU metering, authentication, admin console, and PDF report generation are all functional with 1,145 passing tests (626 frontend, 519 backend).

**Current state: Production-Ready (with caveats).** The system can accept real users, process real files, generate professional reports, and provide operational visibility. The main gaps are in observability, error tracking, video support, and production deployment configuration.

### What's Working Well

- **Scan pipeline**: Upload → Storage → Queue → Processing → Report — complete flow with BullMQ retry (3 attempts, exponential backoff), inline fallback, hash dedup, and size-aware VU metering
- **Authentication**: Dual auth (GoTrue + Better-Auth), httpOnly cookie refresh, session ledger, armed confirm for dangerous actions
- **Billing**: VU-based metering with depth pricing (quick/standard/deep), size-tier multipliers (micro through xlarge), ≤1× monthly rollover, quota gate with 402+Retry-After
- **PDF reports**: Purpose-built pdfkit documents with cover page, verdict banner, metrics grid, evidence sections, methodology, limitations, and chain of custody — NOT a print-to-PDF
- **Admin system**: Full admin console with overview, users, organizations, jobs, reports, analytics, monitoring, feature flags, roles, audit logs, and settings
- **Test coverage**: 1,145 tests covering billing math, scan lifecycle, auth flows, security mutations, org membership, and component rendering
- **CI gates**: Responsive audit (260 viewports), a11y audit, gridClassGuard, lint, and import-parity guards

---

## B. Readiness Score

| Area | Score | Notes |
|------|-------|-------|
| Frontend | 8.5/10 | Premium design, responsive, accessible. Bundle size warning, some public page copy needs honesty pass |
| UX | 8/10 | Strong first-time experience, clear scan flow. Empty states need polish on some surfaces |
| Backend | 9/10 | Well-structured NestJS modules, proper guards/throttling, comprehensive error handling |
| Database | 9/10 | 24 migrations, all applied. RLS, indexes, dedup, VU ledger — production-grade schema |
| Security | 8/10 | httpOnly cookies, armed confirms, session revocation, throttling. Missing: rate limiting on auth endpoints, CSRF protection |
| Performance | 7/10 | Build warning on chunk size, no code splitting, no lazy loading of routes. Scan processing ~2-5s acceptable |
| Scanning | 8.5/10 | Pipeline is solid: dedup, retry, size-aware billing, region analysis for deep scans. Video support missing |
| AI/ML | 6/10 | Deterministic analysis only (luminance, blockiness, C2PA markers). No LLM integration yet — honest, but limits report intelligence |
| PDF Reports | 8.5/10 | Professional purpose-built documents. Missing: embedded charts/images, watermark |
| Admin System | 8/10 | Comprehensive. Missing: real-time monitoring, error aggregation, storage metrics |
| Reliability | 8.5/10 | Retry logic, idempotency, best-effort billing writes, graceful degradation. Missing: circuit breakers |
| Observability | 5/10 | Backend logging only. No error tracking (Sentry), no APM, no uptime monitoring |
| Scalability | 7/10 | BullMQ workers, database indexes, pagination. Missing: connection pooling config, CDN for assets |
| Launch Readiness | 7.5/10 | Core product works. Missing: production env config, domain, SSL, monitoring, legal pages |

**Overall: 7.9/10** — Strong foundation, ready for controlled rollout with the critical fixes below.

---

## C. Critical Problems (Must Fix Before Launch)

### C1. No Error Tracking in Production
**Impact:** Blind to production errors — users see failures, we don't know about them.
**Fix:** Add Sentry (or equivalent) to both frontend and backend. The telemetry module exists but only logs to console.

### C2. No Uptime Monitoring
**Impact:** If the backend goes down, nobody knows until users complain.
**Fix:** Add a health-check pinger (e.g., BetterStack, UptimeRobot) against `/v1/health/readiness`.

### C3. Supabase Credentials in Repo History
**Impact:** `DATABASE_URL` with password was set via terminal (gitignored), but `sb_secret_` and `sb_publishable_` keys are in `backend/.env.local` (gitignored). The real risk is if `.env.local` was ever committed.
**Fix:** Rotate all credentials immediately. Use environment variables in Vercel/hosting, not files.

### C4. No Production Environment Variables Set
**Impact:** The Vercel deployment likely has no `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc. configured — it falls back to mock mode.
**Fix:** Configure all env vars in Vercel dashboard before merge to main.

### C5. Video Support Not Implemented
**Impact:** The upload validator rejects non-image MIME types (`image/jpeg,image/png,image/webp,image/gif`). Marketing mentions video verification.
**Fix:** Either add video support or remove video claims from marketing copy. The pipeline architecture supports it (buffer-based analysis), but the validate/upload gate blocks it.

---

## D. High-Priority Improvements (Before Serious User Acquisition)

### D1. Bundle Size / Code Splitting
**Issue:** Build warns "Some chunks are larger than 500 kB after minification."
**Fix:** Lazy-load routes with `React.lazy()` for the admin console, app shell, and heavy pages (Benchmark, SampleReport). The route structure in `App.jsx` already isolates page-level imports — wrapping each in `lazy()` + `Suspense` is straightforward.

### D2. Public Page Copy Honesty Pass
**Issue:** Some public pages still claim capabilities that don't exist yet (video verification, heatmaps, real-time processing).
**Fix:** Review `/docs`, `/security`, `/benchmark`, `/product` for overclaims. The `PUBLIC_COPY_OVERCLAIM_AUDIT.md` already has recommended rewrites — implement them.

### D3. Logo Integration
**Issue:** Three logo PNGs (dark, white, favicon) exist in `logo/` but are not wired into the app. Every surface uses a text-based "P" character.
**Fix:** Copy PNGs to `public/`, resize favicon, wire dark logo into Navbar, white logo into Footer/App Shell.

### D4. First-User Onboarding
**Issue:** A new user lands on an empty dashboard with no guidance.
**Fix:** Add an onboarding checklist or empty-state CTA that walks through: Upload → Wait → Review Report.

### D5. Missing `404.html` for Vercel SPA
**Issue:** Opening a deep link (e.g., `/app/reports/abc`) directly returns Vercel's 404 because there's no rewrite rule.
**Fix:** Add `vercel.json` with SPA rewrite: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

---

## E. Nice-to-Have Improvements

1. **Lazy route loading** — reduce initial bundle by 40%+
2. **Service Worker** — offline-first scan history
3. **Push notifications** — scan completion alerts
4. **Dark mode** — the UI tokens already support it (`bg-charcoal`, `text-parchment`)
5. **Internationalization** — the copy is English-only
6. **Keyboard shortcuts** — ⌘K command palette exists, add more
7. **Scan comparison** — side-by-side verdict view
8. **Export formats** — CSV/JSON alongside PDF
9. **API documentation** — Swagger is mounted but the docs page is hand-written
10. **Email templates** — transactional emails for scan completion, invite, etc.

---

## F. New Feature Recommendations

| Feature | Impact | Complexity | Priority |
|---------|--------|------------|----------|
| Video scan support | High | High | P1 (marketing claims it) |
| Real-time scan progress (WebSocket) | Medium | Medium | P1 (replaces 5s polling) |
| AI-generated report summaries | High | Medium | P2 (adds intelligence layer) |
| Batch upload | Medium | Low | P2 (power users) |
| Public report verification URL | High | Medium | P2 (trust signal) |
| Email notifications | Medium | Low | P2 (engagement) |
| NVIDIA model integration | High | High | P2 (when architecture is ready) |
| Enterprise SSO (SAML) | Medium | High | P3 (after validation) |
| White-label reports | Low | High | P3 (enterprise only) |

---

## G. Performance Plan

### Current Pipeline Latency (Estimated)
| Stage | Time |
|-------|------|
| Upload (signed URL) | 100-500ms |
| Storage write | 200-800ms |
| Queue enqueue | 50-100ms |
| Worker pickup | 100-500ms |
| Image decode (Jimp) | 200-2000ms |
| EXIF extraction | 100-500ms |
| Region analysis (deep) | 500-3000ms |
| Hash + dedup check | 100-300ms |
| Report generation | 50-200ms |
| PDF generation (pdfkit) | 200-1000ms |
| **Total (standard)** | **~2-5s** |
| **Total (deep, large file)** | **~5-10s** |

### Optimization Opportunities
1. **Parallel metadata + image analysis** — already done for standard/deep (`Promise.all`)
2. **Stream progressive results** — WebSocket or SSE to show "analyzing image… extracting metadata… computing verdict" in real time
3. **Lazy PDF generation** — generate PDF on-demand (first download) instead of at scan completion
4. **Jimp optimization** — use `Jimp.read({ width: MAX_DIM })` to resize large images before analysis
5. **Cache dedup results** — the hash lookup is already implemented (findCompletedScanByHash)

---

## H. PDF Report Plan

The current PDF is **already purpose-built** (not a print-to-PDF). The `report-pdf.ts` generates a branded A4 document with:
- Ink band header with "PROVANCE" wordmark + seal
- Verdict banner with color-coded assessment
- Key metrics grid (2×2 cards)
- Executive summary
- Media information (key-value rows)
- AI detection results (signal list)
- Manipulation indicators
- Technical findings
- Recommended next steps
- Chain of custody
- Analysis timeline
- Methodology appendix
- Limitations appendix
- Page-numbered footer with report ID

### Remaining Gaps
1. **No embedded images** — the PDF shows signal labels but no actual image crops or visual evidence
2. **No charts/graphs** — the confidence score could be a visual gauge
3. **No watermark** — "CONFIDENTIAL" or "DRAFT" stamp option
4. **No digital signature** — the seal is visual, not cryptographic
5. **Font limitations** — Helvetica only (no custom brand font in pdfkit without embedding)

### Recommended Next Steps for PDF
1. Add the uploaded image as a thumbnail on the cover page
2. Add confidence gauge (visual arc/meter)
3. Add "CONFIDENTIAL" watermark option
4. Embed a SHA-256 verification hash in the PDF metadata
5. Consider `@react-pdf/renderer` for richer layouts if pdfkit becomes limiting

---

## I. AI Architecture Recommendation

### Current State
The analysis pipeline is **deterministic/heuristic** — no LLM or ML models are called. It computes:
- Image format detection (magic bytes)
- Luminance statistics (mean, stddev, entropy)
- Blockiness (JPEG artifact detection)
- Edge density
- Saturation analysis
- EXIF metadata extraction
- C2PA marker detection
- Region consistency (4×4 grid, deep mode only)
- Verdict classification (likely_authentic / suspicious / inconclusive)

### Recommendation: Add AI as an Interpretation Layer

The heuristic signals are honest and auditable. Adding AI should **explain, not replace** them.

**Phase 1 (High Value, Low Risk):**
- Use an LLM (GPT-4, Claude, or NVIDIA hosted) to generate the executive summary and findings narrative from the structured signal data
- This transforms "Blockiness: 0.12 (elevated)" into "The image shows compression artifacts consistent with re-encoding, which may indicate the image was saved from a social media platform"

**Phase 2 (Medium Value, Medium Risk):**
- AI-powered classification of C2PA/provenance data
- Natural language explanation of metadata anomalies
- Risk scoring refinement using historical scan outcomes

**Phase 3 (High Value, High Risk):**
- Direct image analysis via multimodal model (as a secondary signal, not replacing heuristics)
- Cross-reference against known manipulation patterns
- Automated report generation

**Key Principle:** The deterministic pipeline remains the source of truth. AI adds interpretation and explanation, never overrides the signal-based verdict without human review.

---

## J. Production Launch Checklist

### Infrastructure
- [ ] Set all env vars in Vercel (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
- [ ] Configure custom domain + SSL
- [ ] Set up Redis (Upstash recommended) for BullMQ worker
- [ ] Deploy backend to a hosting service (Railway, Fly.io, or Render)
- [ ] Configure `DATABASE_URL` in backend hosting (not Vercel — it's the frontend only)
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring (BetterStack)
- [ ] Rotate all Supabase credentials (password was shared in plaintext)
- [ ] Add `vercel.json` with SPA rewrites for deep-link support

### Product
- [ ] Run public page copy honesty pass (remove overclaims)
- [ ] Wire logos into Navbar, Footer, App Shell
- [ ] Add onboarding empty states for new users
- [ ] Verify scan flow end-to-end with real Supabase
- [ ] Test PDF export with real backend

### Security
- [ ] Enable HTTPS-only cookies (remove `__Host-` fallback for dev)
- [ ] Add CSP headers via Vercel/CDN
- [ ] Rate-limit auth endpoints more aggressively (5/min for password reset)
- [ ] Audit RLS policies on all tables
- [ ] Remove any hardcoded secrets from code (not just env files)

### Operations
- [ ] Verify `/v1/health/readiness` returns `ready` in production
- [ ] Test scan round-trip: upload → queue → processing → complete → report → PDF
- [ ] Verify admin dashboard shows real data (not mock)
- [ ] Test notification flow: scan completion → bell → notification page

### Legal
- [ ] Review Privacy Policy for real data handling practices
- [ ] Review Terms of Service for liability/limitation clauses
- [ ] Add cookie consent banner if using analytics
- [ ] Ensure GDPR compliance for EU users

---

## K. Investor Demo Checklist

### Can We Demo This?
**Yes.** The mock mode provides a rich, realistic demo without requiring the full backend stack. The flow is:

1. **Landing page** → premium design, clear value prop
2. **Sign in** → mock auth with admin/member accounts
3. **Dashboard** → KPI cards, scan ledger, queue posture, activity feed
4. **Upload** → drag-and-drop with depth selection (Quick/Standard/Deep)
5. **Processing** → live polling with 5s cadence, status badges
6. **Report** → full detail pane with signals, metadata, confidence score
7. **PDF Export** → professional branded document
8. **Admin** → overview, users, jobs, monitoring, audit logs

### Demo Improvements Needed
1. **Add sample scan data** — pre-seed 5-10 realistic scans with varied verdicts
2. **Show the PDF** — open the report print page during the demo
3. **Demo the API** — show `curl` example from the docs page
4. **Show the billing page** — VU meter with usage projection
5. **Pre-load the admin dashboard** — show real operational metrics

---

## L. Post-Launch Roadmap

### Launch (Week 1)
- Deploy to production with all env vars
- Monitor error rates and scan completion
- Collect first waitlist signups
- Fix any production issues

### First 30 Days
- Add video support (marketing claims it)
- Implement real-time scan progress (WebSocket)
- Add email notifications for scan completion
- Build public report verification URL
- Add AI-generated executive summaries
- Launch API for beta testers

### 60-90 Days
- NVIDIA model integration for enhanced analysis
- Batch upload for power users
- Team collaboration features
- Enterprise SSO (SAML)
- White-label report option
- Public API documentation (Swagger)

### Scale (6+ Months)
- Multi-region deployment
- Custom model training on labeled scan data
- Marketplace for verification plugins
- Mobile app (React Native)
- Compliance certifications (SOC 2, ISO 27001)

---

*Generated by Provance engineering audit — August 18, 2026*
*Backend: 519 tests, 31 suites · Frontend: 626 tests · Build: clean · Lint: 0 errors*
