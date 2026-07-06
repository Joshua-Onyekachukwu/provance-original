# Provance — Changelog

## [2026-07-06] - Waitlist Auth Backend Scaffold And Legal Page Expansion

### Added
- `backend/` - New NestJS backend scaffold for the long-term Provance API
- `backend/src/health/*` - Health module and endpoint
- `backend/src/waitlist/*` - Waitlist module, DTO, controller, and service
- `backend/src/auth/*` - Auth module, DTOs, controller, and service scaffold
- `backend/src/supabase/*` - Supabase-ready service layer
- `backend/supabase/migrations/0001_waitlist_auth.sql` - Starter waitlist and auth-adjacent schema
- `backend/.env.example` - Backend environment template
- `.env.example` - Frontend API base URL template
- `src/lib/api.js` - Shared frontend API helper for waitlist and sign-in calls
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` - Current system status, completed work, and handoff notes

### Updated
- `src/pages/WaitlistPage.jsx` - Waitlist form now targets the new API shape and supports loading, success, and error states
- `src/pages/SignInPage.jsx` - Sign-in form now targets the new API shape and supports loading, success, and error states
- `src/pages/PrivacyPage.jsx` - Expanded into fuller privacy-policy style content
- `src/pages/TermsPage.jsx` - Expanded into fuller terms-of-service style content
- `src/pages/CookiesPage.jsx` - Expanded into fuller cookies-policy style content
- `src/pages/ContactPage.jsx` - Support and pilot copy refined for production tone
- `src/pages/SecurityPage.jsx` - Security copy refined to remove roadmap phrasing
- `src/components/WhyProvance.jsx` - Redesigned to use a four-card two-by-two layout aligned with the Use Cases section
- `package.json` - Added root scripts for backend dev, build, and start

### Validated
- Frontend production build completed successfully
- Backend NestJS build completed successfully
- Backend e2e health test passed

### Notes
- Backend dependency installation hit an npm resolver issue in this environment
- Validation completed successfully using `pnpm` installation followed by backend build and e2e checks

## [2026-06-26] — Investor Data Room & Seed Round Outreach Strategy

### Added
- `docs/fundraising/data-room/DATA_ROOM_INDEX.md` — Master data room index linking to 30+ documents across all categories with quick-reference metrics table.

- `docs/fundraising/seed-round-outreach-strategy.md` — Comprehensive outreach strategy including:
  - 15 targeted VC firms across 3 tiers (Costanoa, Bessemer, Felicis, a16z, Lightspeed, Accel, Sequoia, GV, Greylock, Madrona, Harpoon, Decibel, Susa, AI Fund, SignalFire)
  - 4 target angel investors (Elad Gil, Nat Friedman, Lachy Groom, Sarah Guo)
  - 3-phase outreach sequence (prep → first wave → diligence & close)
  - Meeting agenda structures and data room sharing protocol

- `docs/fundraising/investor-update-template.md` — Structured investor update template with metrics table, highlights, challenges, asks, forward look, and cadence guidelines

### Updated
- Changelog updated to reflect all recent additions

## [2026-06-25] — Business Strategy & Investor Readiness

### Added
- `docs/finance/BUSINESS_STRATEGY.md` — Comprehensive strategy document
- `docs/finance/3-year-financial-model.md` — Detailed financial projections
- `docs/fundraising/investor-pitch-deck.md` — 16-slide investor deck
- `docs/decisions/001-revenue-model-ratification.md` — Decision record
- `docs/sales/sales-enablement-courtroom-test.md` — Sales enablement

### Updated
- `docs/business/investor-pitch-deck-outline.md` — Refined for $2M-$5M seed round
