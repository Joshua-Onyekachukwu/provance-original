# Engineering Standards

**Last updated:** 2026-08-04
**Status:** Approved (Founder directive: multi-agent operating model)
**Supersedes:** ad-hoc conventions spread across component files
**Companion:** `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` (process), `docs/design-specs/UNIFIED-DESIGN-SYSTEM.md` (design tokens)

## Purpose

Define the standing code conventions for the Provance frontend so every contributor
(AI agents and humans) produces consistent, reviewable, maintainable code. These are
rules, not suggestions. Deviations require a note in the change summary.

## Stack (as of this writing)

- React 19 + Vite 8, JavaScript (JSX), no TypeScript in `src/`
- Tailwind CSS v4 utility styling, custom tokens in `src/index.css`
- `react-router-dom` for routing (public site, `/app/*`, `/app/admin/*`)
- framer-motion used **selectively** (entrance/exit motion, modals, popovers); never
  for layout that can be CSS
- oxlint (eslint config) as the lint gate; `npm run build` as the build gate

## Component Conventions

### UI primitives live in `src/components/ui/`

- Every reusable primitive is a file in `src/components/ui/` and exported from the
  barrel `src/components/ui/index.js`.
- Primitives own their **loading / empty / error states** (see `Card`, `DataTable`,
  `EmptyState`) so pages never hand-roll state panels.
- Fast-refresh rule: a file that exports a component must not also export
  hooks/context (split like `Toast.jsx` + `useToast.js`, `commandRegistry.jsx` +
  `commandRegistryContext.js`). Violations produce `only-export-components` lint
  warnings which must not grow the baseline.

### Navigation is Button's `to` prop

- Never hand-roll a `Link` with Button's class string. Use `<Button to="/route">`.
- `to` gives real `href`/middle-click semantics; `disabled`/`loading` are handled in
  link mode (aria-disabled, tabIndex, pointer-events-none).
- Pass navigation payloads with `state={{ ... }}` when the target page should react
  to arrival (e.g. queue page highlight).

### Motion (the "Kowalski" treatment)

- Durations under 300ms (160ms is the default); animate transform/opacity only.
- Popovers/panels: origin-aware `transform-origin` computed from the trigger
  (`computeTransformOrigin` in `src/components/ui/popoverOrigin.js`).
- Always honor reduced motion: components must not depend on `requestAnimationFrame`
  for open/close when the user prefers reduced motion (see `Popover`).

## Data Layer Conventions

- `src/lib/api.js` is the only import surface for data. Every function gates real vs
  mock via `USE_MOCK` at the top of the file.
- `src/lib/mockApi.js` mirrors real API signatures exactly (same params, same return
  shape) so pages compile against either path.
- `src/lib/mockData.js` is the single mock dataset store. Do not scatter sample data
  into pages.
- Per-slice loaders use `useResource(loader, deps)` from `src/lib/useResource.js`
  (loading/error/ready + `reload()`). No hand-rolled useEffect/useState fetching.
- Dev-only demo-state forcing goes through `useDemoState()` + `withDemoOverride()`
  (`?state=loading|empty|error`), fully inert in production builds.

## Design Tokens & Copy

- Palette: charcoal surfaces, parchment background, amber accents, stone borders
  (see UNIFIED-DESIGN-SYSTEM.md for exact tokens).
- Headings: `font-serif`; eyebrows/kickers: `font-mono` uppercase with wide tracking
  (`text-[11px] uppercase tracking-[0.22em]`); cards: `ui-card` + `ui-eyebrow`.
- Focus states: `ui-focus-ring` on interactive primitives.
- Copy rule: **no em dashes in user-facing site copy** (existing docs and copy avoid
  them; new copy must too). Use commas or parentheses instead.

## Code Quality Gates

- `npm run lint` must stay at 0 errors and must not grow the baseline warning count
  (14 pre-existing warnings as of 2026-08-04; they are being retired file by file).
- `npm run build` must pass before any change is presented for review.
- `npm run backend:build` + `npm run backend:test:e2e` are required when backend code
  changes (`docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`).
- Every non-trivial change gets an independent review (`code-reviewer-deepseek-flash`)
  and a live preview check when UI behavior changed.

## Documentation Sync

A change is not done until:

- `docs/changelogs/CHANGELOG.md` records it
- `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md` reflects it (for user-facing
  features or architecture)
- any ADR, roadmap, or design-spec affected by the change is updated

## Branching & Definition of Done

Follow `docs/engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md`:

- branches: `phase/<id>-<name>` | `feature/<name>` | `chore/docs-<name>` | `fix/<name>`
- no direct merges to `main`; Founder review required; documentation updated before
  merge; nothing committed without explicit approval.
