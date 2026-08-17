# Usage-Unit Billing Proposal — "VUs" (Verification Units)

**Status:** Proposal for Founder review · **Date:** 2026-08-17
**Builds on:** `docs/engineering/BILLING_AND_ENTITLEMENTS_CONTRACT.md` (ratified baseline)
**Problem it solves:** today a package = a flat monthly *scan count* (pro = 500 scans).
That can't meter depth, can't sell API usage to fintechs, and gives no way to
"buy more when it runs out." This proposal swaps the flat count for a **metered
usage-unit ledger** — one unit system across workspace packages and the API.

---

## 1. The unit — what we call it (not "token")

The unit is *one unit of verification work*. We deliberately don't call it a
token (crypto baggage, and it reads wrong for banks). Options:

| Name | Feel | Verdict |
| --- | --- | --- |
| **VUs — Verification Units** | Descriptive, brandable, fintech-credible | **Recommended** |
| Credits | Generic, every SaaS uses it | Weak fallback |
| Scans | Honest but only fits the workspace, not API callers | OK for packages only |
| Checks | Finance-friendly ("run a check") | Confusing with bank checks |
| Evidence units | On-brand (evidence-first) | Good but long |

**Recommendation: VUs (Verification Units).** 1 VU = the base unit of
verification work; a media asset *consumes* VUs depending on how deep you scan
it. API contracts read naturally: "metered at $0.0006 per VU."

## 2. Why units instead of a flat scan count

A 3-second quick triage and a deep forensic investigation are not the same
amount of work, so they shouldn't cost the same. The report-depth system
already in the product maps straight onto unit costs:

| Depth | Processing mode (API) | Unit cost |
| --- | --- | --- |
| Quick | `quick` | **1 VU** |
| Standard | `standard` | **10 VU** |
| Deep | `deep` | **100 VU** |

This is the key mechanic: **units are deducted when a scan completes, at the
depth it ran.** Failed scans consume 0 (the unit is only charged for a usable
result — fair, and it removes any incentive to spam broken uploads). A user
can't "use the system over and over again" for free, but a normal workflow
never feels metered: 100,000 VUs/month ≈ 10,000 standard scans or ≈ 1,000 deep
investigations.

## 3. Package tiers (workspace) — what a user can actually do

Rates (current dial, §2): **Quick 1 VU · Standard 10 VU · Deep 100 VU**.
Read the table as *how many scans each package buys per month* at each depth:

| Package | Price | VUs / mo | ≈ Quick scans | ≈ Standard scans | ≈ Deep scans |
| --- | --- | --- | --- | --- | --- |
| Starter (free) | $0 | 10,000 | 10,000 | 1,000 | 100 |
| **Pro** | $49 | **100,000** | 100,000 | 10,000 | 1,000 |
| Team | $199 | 300,000 | 300,000 | 30,000 | 3,000 |
| Enterprise | custom | committed block | — | — | — |

Per-VU implied price at Pro: $49 / 100,000 = **$0.00049/VU** — cheap enough to
feel abundant for normal review, expensive enough to stop abuse at scale.

**Realistic burn feel (why this hooks users):** a busy reviewer running
~30 standard scans/day ≈ 900/mo ≈ 9,000 VU — under 10% of Pro's allowance.
Normal workflows essentially never hit the cap at these rates; the allowance
feels generous, which is the point during the growth phase (see §9).

## 4. Mechanics

- **Monthly allowance** — resets on the existing calendar-month cycle (UTC,
  already in the billing contract). Unused VUs **roll over up to 1× the monthly
  allowance** (bounded, so it can't accumulate forever) — kills "use it or
  lose it" churn and rewards consistency.
- **Top-ups** — when the ledger runs low, buy VU packs mid-cycle without
  changing plans:
  - 10,000 VUs — $5 · 50,000 VUs — $20 · 150,000 VUs — $50
  - Top-ups never expire (they're pre-paid usage), and they're consumed *after*
    the monthly allowance each cycle.
- **Overage behavior — three modes, pick one:**
  1. **Hard stop (default)** — the existing `402 + Retry-After` gate fires at
     0 VUs; the workspace shows a "Add VUs" CTA. Predictable, no surprise bills.
  2. **Auto top-up** — user opts in with a monthly spend cap (e.g. "auto-buy the
     50k pack, max $40/mo"). For teams that never want a hard stop.
  3. **Soft degrade** — fall back to Quick-only once standard/deep VUs are gone.
- **Warning layer already exists** — the ≥85% scan-quota chip on the dashboard
  extends to VUs ("85% of monthly VUs used → view Billing"), with danger at 100%.
- **Ledger + audit** — every deduction is a row: `(scan_id, depth, units,
  cycle, user, source: package|topup|api)`. Public audit trail philosophy
  applies — usage is as reviewable as scans.

## 5. The API / fintech / dating-site market

The same VU ledger meters API usage. API customers buy access via an API key
(`api_usage` table already exists, migration 0020); each verified call deducts
VUs at the depth requested.

**Volume pricing (per-VU price declines with commitment):**

| Monthly volume | Per VU | ≈ per standard scan |
| --- | --- | --- |
| < 100k VUs | $0.0008 | $0.008 |
| 100k – 1M VUs | $0.0006 | $0.006 |
| 1M+ VUs (committed) | custom | negotiated |

**Enterprise contracts (banks, fintechs, dating platforms, newsrooms):**
- Committed VU blocks — buy 5M VUs up front on a 12-month term; unused VUs
  roll within the term (classic data/vendor economics — the buyer books budget,
  we book revenue).
- Per-key **rate limits + burst limits** and a hard **monthly spend cap per key**
  (the #1 trust requirement for fintech: no runaway bills).
- SLA, SSO, DPA, private-data handling commitments — the enterprise tier
  already exists at $999/mo; this turns it into a real contract vehicle.

**What folds into the ledger:** the plan's existing API-call limits
(`PLAN_API_CALL_QUOTAS`) are replaced by VU metering for keyed calls; workspace
usage and API usage share the same unit vocabulary so a sales conversation is
one story: "VUs are VUs — the dashboard and the API drink from the same meter."

## 6. What already exists and what's new

| Piece | Today | Change |
| --- | --- | --- |
| Calendar-month cycle math | ✅ `currentBillingCycle` | unchanged |
| 402 + Retry-After quota gate | ✅ `assertScanQuota` | re-point at the VU ledger |
| ≥85% warning chip | ✅ `ScanQuotaWarningChip` | reads units instead of/in addition to scans |
| End-of-cycle projection card | ✅ `projectScanUsage` | projects VU burn + top-up cost |
| Mock parity rules | ✅ contract §5 | extend to the ledger |
| Per-depth unit cost | ❌ | **new** — cost table keyed on `processing_mode` |
| Deduct-on-complete metering | ❌ | **new** — worker writes a ledger row at completion |
| VU top-up packs | ❌ | **new** — purchase flow (needs a payment processor; Stripe is already deferred) |
| Rollover (≤1× monthly) | ❌ | **new** |
| API key spend caps + rate limits | ❌ | **new** — fintech requirement |
| Enterprise committed blocks | ❌ | **new** — sales vehicle |

## 7. Suggested rollout order

1. **Ledger + metering** (backend slice): VU cost table by depth, deduction on
   completion, failed scans = 0, `GET /v1/billing` gains `unitsUsed/unitsLimit`,
   dashboard chip + projection switch to VUs. No payment code needed.
2. **Top-up packs** — with the payment processor (Stripe) once it lands;
   until then the 402 gate + "add VUs (coming soon)" CTA.
3. **API metering + spend caps** — keyed calls deduct VUs; per-key caps/limits.
4. **Rollover + enterprise committed blocks** — billing-engine work, last.

## 9. Monetization strategy — hook now, tighten later (founder direction)

The growth play is deliberate: **give users a lot now to build authority and
lock usage habits; make money later by tightening the dial.** The current
rates/allowances (§2–3) stay as-is for the growth phase. The dial that turns
revenue lives in the per-scan VU cost — the plan is to *raise* VU per scan
over time (and/or cut allowances), not the price tag.

**The tightening dial (illustrative, not scheduled):**

| Depth | Today (hook) | Tightened (monetize, e.g. 10×) |
| --- | --- | --- |
| Quick | 1 VU | 10 VU |
| Standard | 10 VU | 100 VU |
| Deep | 100 VU | 1,000 VU |

Same Pro allowance (100,000 VU) under the tightened dial: 10,000 quick / 1,000
standard / 100 deep — a heavy user finishes the month and buys top-ups or waits
for the next cycle. **Pacing principle:** the allowance should feel abundant
early in the cycle and *burnable* — "finish, but not too fast" — so top-ups
and cycle resets become the natural rhythm instead of a hard wall.

**When to tighten (triggers):** (a) authority/trust milestones are reached
(case studies, live API customers), (b) the ledger + metering slice is live and
top-ups exist (Stripe), (c) per-seat/per-key spend data shows abuse patterns.
Each tighten is a config change (cost table), not a migration — the ledger
records the rate applied per scan, so historical usage stays auditable.

## 8. Open decisions for the founder

1. **Unit name** — VUs (recommended), Credits, Scans, or something else?
2. **Pro allowance** — **kept at 100,000 VUs for now (founder-confirmed)**;
   recalibration (e.g. 50,000 ≈ $0.001/VU) is a later tighten, not this release
3. **Overage default** — hard stop (recommended), auto top-up, or soft degrade?
4. **Rollover** — roll unused VUs up to 1× monthly, or no rollover (strict use-it-or-lose-it)?
5. **Failed scans** — 0 VU charge on failure (recommended) vs charge-on-submit with refund?
6. **Tighten cadence** — no date set; triggers in §9. Confirm when growth
   milestones hit so the dial moves deliberately, never silently

## Related

- `docs/engineering/BILLING_AND_ENTITLEMENTS_CONTRACT.md` — the ratified baseline this evolves
- `backend/src/billing/billing.service.ts` — plan catalog, cycle math, quota gate
- `src/lib/scanQuota.js` — the ≥85% warning + projection math
- `supabase/migrations/0005_organization.sql`, `0020_api_usage.sql`
