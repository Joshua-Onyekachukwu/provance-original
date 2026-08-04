# Decision Record: Mock-First Frontend Development (USE_MOCK Gate)

**Status:** Ratified
**Date:** 2026-08-04
**Author:** CTO (orchestrator)
**Reviewers:** Founder (approval), Backend Engineering Lead
**Related:** `src/lib/api.js` (USE_MOCK), `src/lib/mockApi.js`, `src/lib/mockData.js`

## Context

The frontend is developed against a live backend and Supabase, but those services are
not always available in every environment (local, preview, demos). Early pages
interleaved real API calls with mock ones inconsistently: `initiateScan` /
`submitScan` were real-only, so the upload flow could not run in mock mode, while
list/queue endpoints were mock-gated. This made frontend-first development and
previews unreliable.

## Decision

Maintain a single `USE_MOCK` flag in `src/lib/api.js` as the authoritative gate:

- `USE_MOCK = true` is the default for the frontend-first MVP phase.
- Every data function in `api.js` routes through the gate: real network call when
  `USE_MOCK = false`, mock implementation when `true`.
- `mockApi.js` functions mirror real API signatures exactly; `mockData.js` is the
  single dataset source.
- Mock state that must survive reloads (auth session, scan store) persists to
  `localStorage` under a `provance.*` key, mirroring how real sessions persist.

## Rationale

1. Frontend work and demos are never blocked by backend/Supabase availability.
2. A single gate is auditable and flips to real data by changing one flag.
3. Mirroring signatures means the swap to the real backend is configuration, not a
   rewrite.

## Alternatives Considered

1. Per-function mock flags. Rejected: drift caused exactly the upload/queue gap seen
   in this codebase.
2. A full mock server (MSW). Deferred: heavier than needed for the current phase;
   revisit when the API surface stabilizes.
3. Always hit the real backend. Rejected: breaks local and preview environments.

## Consequences

- New endpoints must ship both a real path and a signature-matched mock when added
  during the MVP phase.
- Stateful mock data (e.g. the scan store) must persist under `provance.*` localStorage
  keys with try/catch guards and size caps.
- `USE_MOCK` flips to `false` as part of the Phase 3 backend integration, not before.

## Documentation Updates Required

- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` (mock-first data gate)
- `docs/MASTER_DOCUMENTATION_INDEX.md` (mock data infrastructure table)
- `docs/engineering/ENGINEERING_STANDARDS.md` (data layer conventions)
