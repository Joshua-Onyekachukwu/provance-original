# Public Pages Copy Audit — Pre-MVP Overclaims

**Date:** 2026-08-17 · **Scope:** `/docs`, `/resources`, `/benchmark`, `/security`,
`/waitlist`, `/signin`, `/reset-password` (+ `/reset-password/confirm`)

Every flagged line below was classified against the **actual shipped backend**
(`backend/src`) — not against the landing page or the mocks. The rule: a public
page may describe *direction* ("planned", "will", "expected") but must not
present roadmap-only capability as **live, verifiable functionality**.

## Ground truth used for classification

| Capability | Real today? | Evidence |
| --- | --- | --- |
| `POST /v1/verify` public API | ❌ **No** | No `verify` route in any controller; scan flow is `POST /v1/scans` (internal, `@Controller('scans')`), image-only |
| Heatmaps (`include_heatmaps`, `heatmap_url`) | ❌ **No** | Zero `heatmap` references in `backend/src` |
| Webhooks (`verification.queued/…`, callback delivery) | ❌ **No** | Zero `webhook` references in `backend/src` |
| SDKs (TypeScript / Python) | ❌ **No** | None shipped |
| SAML login | ❌ **No** | Auth is GoTrue email/password (+ better-auth behind a flag); zero `saml` refs |
| Retention-window configuration | ❌ **No** | `security.service.ts` has no retention config |
| Audit-log **export/integration** controls | ❌ **No** | Audit trail exists (`audit_logs` + admin endpoint); export/integration do not |
| Email verification | ✅ **Yes** | `auth.service.ts` sets `email_confirm: true` |
| Invite-based access / waitlist review | ✅ **Yes** | waitlist + org invite flow exist |
| Benchmark V0.1 numbers (TWA 1.00, FPR 0.0, ES 1.0) | ✅ **Yes** | Grounded in shipped `public/benchmark/gold/BENCHMARK_REPORT_V0.1.md` |
| Real verdict vocabulary | `authentic` / `likely_authentic` / `inconclusive` / `likely_synthetic` / `synthetic` | `report-document.ts:210-226` |

---

## `/docs` — **critical** (fabricates a live API)

This page is presented as an "API Reference" with a real endpoint, real curl,
and a real response — but none of it exists yet. It is the single highest-risk
page for a pre-MVP overclaim.

### 1. Hero — "Verify media in **three lines**."
- **Overclaim:** Implies a working, public verification API. There is none.
- **Rewrite:** "The verification API we're building, in three lines." (or
  "A preview of the verification API's shape — access opens in cohorts.")

### 2. `POST /v1/verify` endpoint + curl block (`https://api.provance.io/v1/verify`)
- **Overclaim:** Presents a live endpoint + bearer key + `callback_url` +
  `include_heatmaps` as usable today. No `v1/verify`, no heatmaps, no callbacks.
  The domain `api.provance.io` is not a shipped public API surface.
- **Rewrite:** Label the section **"API direction (draft contract)"** with a
  banner: *"This contract is a draft for design partners — the endpoint and
  fields will change before public access. Today's scan API is
  `POST /v1/scans`, available to approved workspaces."* Keep the example but
  replace `include_heatmaps`/`callback_url` with the real scan request shape
  (`media_url`/`media_type`) or mark them "planned".

### 3. Response example — `"verdict": "ai_generated"`, `"model_match": "Stable Diffusion v3.5"`, `"evidences": [{"type":"gan_artifact"}]`, `heatmap_url`
- **Overclaim:** `ai_generated` is **not** the product's verdict vocabulary
  (real: `authentic / likely_authentic / inconclusive / likely_synthetic /
  synthetic`), and no heatmap URLs exist. A fabricated response trains
  evaluators on a contract that won't hold.
- **Rewrite:** Use the real verdict enum and real report fields; drop
  `heatmap_url` (or mark "planned"); replace `model_match` with the actual
  signal summary shape the report payload emits.

### 4. Webhooks section — "Async verification via **webhooks**." + "Configurable Callbacks" / "Event Types" cards (`verification.queued`, `verification.processing`, `verification.completed`, `verification.failed`)
- **Overclaim:** Whole section reads as shipped functionality. No webhook
  delivery exists, and the event names don't match the real scan status
  vocabulary (`awaiting_upload/submitted/processing/complete/failed`).
- **Rewrite:** Retitle "Webhooks (planned)" and the paragraph to "Webhooks
  will support asynchronous verification…"; rename events to the real scan
  statuses so the draft is at least internally consistent.

### 5. "Rate Limits & Quotas" card — "Rate limits, quota models, and API access tiers keep integrations predictable"
- **Overclaim:** No public API tiers exist (billing quota chip exists inside
  the workspace only).
- **Rewrite:** "Planned rate limits and access tiers will keep integrations
  predictable as the public API opens."

### 6. "SDKs & Libraries" card — "Language-specific tooling follows the core API… TypeScript first, Python later"
- **Overclaim:** No SDKs exist.
- **Rewrite:** "SDKs will follow once the contract stabilizes — TypeScript
  first, Python later."

---

## `/security` — **high** (presents planned controls as live product behavior)

The page is mostly *well hedged* ("direction", "will", "should", "assumes") —
but four claims cross the line.

### 1. Audit-log mockup — `method:saml  status:success`
- **Overclaim:** SAML does not exist (GoTrue email/password only).
- **Rewrite:** Use a real auth method from the product's trail — e.g.
  `method:email_password` — or mark the row "SAML (planned)".

### 2. Audit-log mockup — `action:update_retention from:90d to:365d` + "Export & Integration" card ("Export, integration, and retention controls…")
- **Overclaim:** No retention-window config and no audit export/integration
  exist in the backend.
- **Rewrite:** Drop the `update_retention` row (or rename to a real event like
  `settings.updated`), and retitle the card "Export & integration (planned)".

### 3. Data Retention column — "Set retention windows around account, workflow, and review needs" / "Apply deletion rules with clear access and approval boundaries" / "Use explicit retention rules for higher-trust workflows"
- **Overclaim:** Present-tense list of capabilities that don't exist.
- **Rewrite:** Add "planned" framing: "Retention windows and deletion rules
  are on the roadmap — we'll publish the policy before rollout."

### 4. "Compliance Ready" card title + "Enterprise Readiness" hero — "Built for the **enterprise**."
- **Overclaim:** "Compliance Ready" and "Built for the enterprise" assert a
  maturity the product (pre-MVP, no SOC 2 / certification) hasn't earned.
  The card *body* is correctly hedged; the titles aren't.
- **Rewrite:** Card title → "Compliance Direction" (body already says
  "posture start with…"). Hero → "Built for the enterprise, when you're
  ready" or "Enterprise-grade trust, phased in."

**Not flagged (correctly hedged):** "Private Storage Direction" ("will favor"),
"Operational Auditability" ("should be traceable as the product moves from
beta"), "Enterprise Review Support" ("will be handled directly"),
"Deployment Planning" ("assumes real hosted environments"), "Operational
Hardening" ("support a safer authenticated rollout").

---

## `/benchmark` — **low** (grounded in shipped data; two wording nits)

The numbers are genuine — they trace to `public/benchmark/gold/
BENCHMARK_REPORT_V0.1.md` (TWA 1.00 vs 0.79, FPR 0.0 vs 7.5%, Confident Wrong
0 vs 4, ES 1.0 vs 0.0) and the catalog JSON ships with the site. The "Open
Benchmark · Published" eyebrow is accurate for this page. Two nits:

### 1. "Provance's weighted multi-signal algorithm held Trust-Weighted Accuracy at 1.00 on the gold subset."
- **Nit:** "held … at 1.00" can read as a production guarantee. It's a
  **100-asset, curated gold subset, V0.1** benchmark.
- **Rewrite:** "scored Trust-Weighted Accuracy of 1.00 on the V0.1 gold
  subset (100 assets) — a research benchmark, not a live-product guarantee."

### 2. Error-analysis card — "protecting newsrooms from citing false results"
- **Nit:** Causal claim drawn from 100 assets.
- **Rewrite:** "— the design goal for newsroom review workflows."

---

## `/resources` — **clean**

Every roadmap item is already status-labeled ("Planned", "Growing", "Active")
and the copy is consistently hedged ("direction", "future publications",
"as the platform expands"). No changes required. One consistency note: the
Featured card for Documentation says "API direction" — keep it that way (see
`/docs`).

---

## `/waitlist` — **clean**

Hero ("Early access opens first for professionals…") and the "What to expect"
list are accurate and hedged ("Future email verification and approval
routing"). The form hits a real waitlist endpoint. No changes required.

---

## `/signin` — **clean (one optional nit)**

"Email verification and secure session handling" is accurate
(`email_confirm: true`, httpOnly cookie sessions). Optional:
- "Protected access to the verification workspace" → "Protected access to
  the workspace" (it's not only "verification" work anymore).

---

## `/reset-password` + `/reset-password/confirm` — **clean**

No product claims; functional copy only. No changes required.

---

## Priority order

1. **`/docs`** — re-label the whole page as *direction / draft contract*,
   point evaluators at the real `POST /v1/scans`, fix the fabricated
   response (`ai_generated`, heatmaps) and the webhook/SDK/rate-limit cards.
2. **`/security`** — remove SAML + retention + export rows from the audit
   mockup, hedge the retention column and the two titles.
3. **`/benchmark`** — two one-line wording nits (keep the data; it's real).

## How to apply

Each rewrite above is self-contained — the pages are static JSX in
`src/pages/*.jsx`; no backend or test changes are required. Recommended as a
single "copy honesty pass" commit once the founder approves the rewrites.
