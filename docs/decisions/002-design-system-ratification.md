# Decision Record: Unified Design System & UI Primitives Ratification

**Status:** Ratified
**Date:** 2026-08-04
**Author:** CTO (orchestrator)
**Reviewers:** Founder (approval), Frontend Engineering Lead, UX/UI Specialist
**Related:** `docs/design-specs/UNIFIED-DESIGN-SYSTEM.md`

## Context

The dashboard and admin surfaces grew with overlapping ad-hoc components (multiple
stat cards, tables, buttons, popovers) that drifted visually and behaviorally. The
Founder approved a unified design system direction (Phase 2), and the first reusable
primitive kit was built in `src/components/ui/` (Button, Badge, Card, StatCard,
DataTable, Tabs, Drawer, Toast, EmptyState, Skeleton, Spinner, Popover,
CommandPalette, command registry).

## Decision

Ratify the UNIFIED design system (`docs/design-specs/UNIFIED-DESIGN-SYSTEM.md`) and
the `src/components/ui/` primitive kit as the single source of visual and interaction
truth for the authenticated workspace and admin surfaces. New pages and features must
compose from these primitives rather than hand-roll equivalents.

## Rationale

1. One component API means state handling (loading/empty/error) is owned once.
2. The "Kowalski" motion treatment (sub-300ms, transform/opacity, origin-aware,
   reduced-motion safe) is embedded in primitives instead of re-implemented per page.
3. Migration of admin pages onto the primitives proved they hold up at real scale.

## Alternatives Considered

1. Keep per-page components and standardize by refactor later. Rejected: duplication
   cost compounds and inconsistency was already visible.
2. Adopt a third-party component library (MUI, Radix, shadcn). Rejected: the brand
   language (charcoal/parchment/amber, serif headings, forensic aesthetic) is custom
   and self-hosted; a library would fight it and add dependency weight.

## Consequences

- All new workspace/admin UI composes from `src/components/ui`.
- Legacy per-page stat/table/button implementations are retired as pages are touched
  (see migration in `MASTER_DOCUMENTATION_INDEX.md` shared-components table).
- `ENGINEERING_STANDARDS.md` now encodes the component and motion conventions.

## Documentation Updates Required

- `docs/design-specs/UNIFIED-DESIGN-SYSTEM.md` (canonical spec)
- `docs/MASTER_DOCUMENTATION_INDEX.md` (shared-components + ui kit tables)
- `docs/engineering/ENGINEERING_STANDARDS.md` (component conventions)
