# Changelog

## 2026-08-18

### Frontend VU Switch + Resolution-Weighted Billing
- **Report detail pane**: shows scan depth, size tier, and VU cost on every completed report
- **Billing page**: surfaces carriedOver in usage meter ("100k allowance + 70k carried over")
- **Billing page**: per-scan VU spend breakdown table with depth, size tier, and cost columns
- **Backend**: resolution-weighted VU cost — high-res images (≥2 MP) cost up to 3× more than low-res at the same byte size
- **Mock data**: scan rows now carry vu_units/vu_applied_rate; billing profile includes scanCosts breakdown
- **GridClassGuard parity**: audit-a11y and audit-responsive PUBLIC_ROUTES are now asserted identical
- **Test results:** jest 519/519 · vitest 36/36 (affected) · build clean · lint 0 errors · guard:grid clean

### Pre-Launch System Audit Complete
- **Comprehensive audit report** written at `docs/PRE_LAUNCH_AUDIT.md`
- Full-stack review covering: frontend, backend, database, security, performance, scanning pipeline, PDF reports, admin system, observability, and launch readiness
- **Overall readiness score: 7.9/10** — strong foundation, ready for controlled rollout
- 1,145 tests passing (626 frontend, 519 backend)
- Identified 5 critical, 5 high-priority, and 10 nice-to-have improvements
- Production launch checklist, investor demo checklist, and post-Launch roadmap documented
- **Test results:** vitest 626/626 · jest 519/519 · build clean · lint 0 errors
