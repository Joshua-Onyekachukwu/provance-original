# Decision Record: Revenue Model & Pricing Tier Ratification

**Status:** Ratified
**Date:** 2026-06-25
**Author:** Business Strategy Lead
**Reviewers:** Lead, Head of Product, CMO

## Context

Provance needed a defensible, scalable revenue model that:
- Supports the "evidence-first" positioning (not commodity detection)
- Offers a clear upgrade path from free trial to enterprise
- Reflects competitive reality (Hive at $0.0015/img, Sensity at $50K+/yr)
- Generates sufficient ARR to attract seed investment ($2M-$5M)

## Decision

Ratify the following 4-tier + API pricing structure:

| Tier | Price | Verifications | Users | Key Features |
|------|-------|---------------|-------|-------------|
| Trial | $0 (14d) | 10 total | 1 | Watermarked reports, no API |
| Pro | $49/mo ($39 annual) | 100/mo | 1 | Unwatermarked, 1K API req |
| Team | $249/mo ($199 annual) | 1K/mo | 5 + $30/ea | SSO, RBAC, batch, white-label |
| Enterprise | $2K-$10K+/mo | Unlimited | Unlimited | On-premise, SLA, dedicated engineer |
| API Lite | $0.05/req | PAYG | — | Pay-as-you-go |
| API Pro | $199/mo | 5K req | — | Overage at $0.03/req |

## Rationale

1. **Trial at 10 verifications** — enough for genuine evaluation, not enough for production abuse
2. **Pro at $49/mo** — priced as "one fact-check subscription" (easy for newsrooms)
3. **Team at $249/mo** — priced at "one hour of attorney time" (trivial for law firms)
4. **Enterprise at $2K-$10K+** — captures compliance value (SOC 2, audit logs, private cloud)
5. **API separate** — avoids confusing dashboard users with per-request pricing

## Financial Target

Y1 ARR: ~$628K → Y2: $2.5M → Y3: $8M+
Seed ask: $2M-$5M

## Alternatives Considered

1. **Flat per-request pricing only** — commoditizes the product
2. **Enterprise-only ($50K min)** — leaves SMB/professional segment unserved
