/**
 * gridClassGuard.js — static guard for the mobile-first grid convention.
 *
 * Every responsive grid in the codebase must declare an explicit base
 * `grid-cols-1` (single column on mobile) before expanding at breakpoints
 * (`sm:`/`md:`/`lg:`/`xl:`/`2xl:`). A grid that only declares breakpoint
 * columns silently relies on the implicit single-column default, which is
 * exactly the regression the grid-cols-1 sweep eliminated — and easy to
 * reintroduce by copy-pasting a desktop-only className.
 *
 * Exceptions (allowed by design):
 *   1. The grid itself is breakpoint-gated (`lg:grid` + `lg:grid-cols-[…]`,
 *      the app/admin shells) — it is not a grid at mobile, so no base column
 *      declaration is needed.
 *   2. Literals listed in INTENTIONAL_MOBILE_GRIDS — deliberately two-up (or
 *      more) on mobile (compact label/value chips, media-audit tiles). These
 *      are reviewed exceptions, not oversights.
 */
import fs from 'node:fs'
import path from 'node:path'

const RESPONSIVE_GRID_COLS_RE = /^(sm|md|lg|xl|2xl):grid-cols-/
const GATED_GRID_RE = /^(sm|md|lg|xl|2xl):grid$/

// Responsive display-ON utilities — the element *becomes* this display from
// the breakpoint up (`lg:flex`, `md:grid`, …). Mobile-first intent is only
// explicit when the base (pre-breakpoint) display is declared alongside it:
// `hidden lg:flex` (nav), `block md:grid`, `flex xl:flex`, … Without it the
// element silently relies on the UA default (usually inline for spans, block
// for divs), which is the same implicit-mobile trap the grid-cols-1 sweep
// closed for grids.
const RESPONSIVE_DISPLAY_ON_RE = /^(sm|md|lg|xl|2xl):(flex|grid|inline-flex|inline-grid|block|inline-block)$/
const BASE_DISPLAY_TOKENS = new Set([
  'flex',
  'grid',
  'inline-flex',
  'inline-grid',
  'block',
  'inline-block',
  'hidden', // hidden md:flex is the canonical mobile-first pattern
  'contents',
])

/**
 * Deliberate multi-column-on-mobile grids. Each entry is the exact className
 * literal, kept here so the guard stays strict everywhere else. If a literal
 * here is ever removed from the source, the guard fails (stale allowlist) so
 * the list cannot silently grow stale.
 */
export const INTENTIONAL_MOBILE_GRIDS = [
  // Admin monitoring metric tiles: 2×2 on mobile, 4-up from sm+.
  'grid grid-cols-2 gap-3 sm:grid-cols-4',
  // Service status rows: label left, values right on mobile; single row from sm+.
  'grid grid-cols-2 items-center gap-x-4 gap-y-1 border-b border-stone-light/50 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]',
  'grid grid-cols-2 items-center gap-x-4 gap-y-1 border-b border-stone-light/50 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]',
  // Archived forensic media-audit tiles: 2-up on mobile.
  'grid grid-cols-2 md:grid-cols-4 gap-8',
  'grid grid-cols-2 md:grid-cols-4 gap-6',
  // Landing Sample Report includes grid: compact label-only chips two-up on
  // mobile (details hidden below sm), expanding to the full 3-up grid at lg.
  'mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3',
]

/** Pull the className literal out of a className="…" or className={`…`} prop. */
export function extractClassNameLiterals(sourceText) {
  const literals = []
  // Static strings (className="…") and non-interpolated JSX template
  // literals (className={`…`}). Anything else (dynamic expressions) is
  // skipped below.
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g
  let match
  while ((match = re.exec(sourceText)) !== null) {
    // Prefer the static-string group; template literals with ${} interpolate
    // dynamic classes and are skipped (undefined → not a pure literal).
    const literal = match[1] ?? match[2]
    if (literal !== undefined && !literal.includes('${')) {
      literals.push(literal)
    }
  }
  return literals
}

/**
 * Apply the base-grid rule to one className literal.
 * Returns the violation reason, or null when the literal is compliant.
 */
export function findGridBaseViolation(literal) {
  const tokens = literal.split(/\s+/).filter(Boolean)
  const hasResponsiveCols = tokens.some((t) => RESPONSIVE_GRID_COLS_RE.test(t))
  if (!hasResponsiveCols) return null
  if (tokens.includes('grid-cols-1')) return null
  // Grid itself gated to a breakpoint → not a grid on mobile.
  if (tokens.some((t) => GATED_GRID_RE.test(t))) return null
  if (INTENTIONAL_MOBILE_GRIDS.includes(literal)) return null
  return 'responsive grid-cols-* declared without a base grid-cols-1'
}

/**
 * Apply the base-display rule to one className literal: a responsive
 * display-ON utility (`lg:flex`, `md:grid`, …) must be paired with an explicit
 * base display token (`flex`, `block`, `grid`, `hidden`, …) so the mobile
 * rendering is stated, not implicit.
 * Returns the violation reason, or null when the literal is compliant.
 */
export function findBaseDisplayViolation(literal) {
  const tokens = literal.split(/\s+/).filter(Boolean)
  if (!tokens.some((t) => RESPONSIVE_DISPLAY_ON_RE.test(t))) return null
  if (tokens.some((t) => BASE_DISPLAY_TOKENS.has(t))) return null
  return 'responsive display utility (flex/grid/block) without an explicit base display token'
}

/** Walk a directory recursively and collect { file, line, literal } violations. */
export function scanGridBaseViolations(dir) {
  const violations = []
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.(jsx|js)$/.test(entry.name) && !/\.test\.(jsx|js)$/.test(entry.name)) {
        // Test files are excluded: their className fixtures are test data,
        // not production markup, and shouldn't be constrained by the rule.
        const lines = fs.readFileSync(full, 'utf8').split('\n')
        lines.forEach((lineText, index) => {
          for (const literal of extractClassNameLiterals(lineText)) {
            const reason = findGridBaseViolation(literal) || findBaseDisplayViolation(literal)
            if (reason) {
              violations.push({
                file: path.relative(dir, full).replace(/\\/g, '/'),
                line: index + 1,
                literal,
                reason,
              })
            }
          }
        })
      }
    }
  }
  walk(dir)
  return violations
}

// ---------------------------------------------------------------------------
// Route-inventory parity — the a11y and responsive audit gates each walk a
// hard-coded PUBLIC_ROUTES list. If one gains a page and the other doesn't, a
// public surface silently slips under one gate while the other audits it.
// These helpers parse the literal array from each script (static regex — the
// scripts themselves are never executed, so this is safe to run in CI) and
// produce the symmetric diff the grid-guard CI step fails on.
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES_BLOCK_RE = /const\s+PUBLIC_ROUTES\s*=\s*\[([^\]]*)\]/s

/**
 * Parse the PUBLIC_ROUTES array literal out of an audit script's source text.
 * Returns the route list, or null when the block isn't present (script
 * changed shape — itself a parity failure worth surfacing).
 */
export function extractRouteInventory(sourceText) {
  const match = PUBLIC_ROUTES_BLOCK_RE.exec(sourceText)
  if (!match) return null

  const body = match[1]
  const routes = []
  const routeRe = /'([^']*)'/g
  let item
  while ((item = routeRe.exec(body)) !== null) {
    routes.push(item[1])
  }
  return routes
}

/**
 * Symmetric diff of two route inventories: which routes are in one but not
 * the other (and vice versa). `equal` is true only when both lists contain
 * exactly the same routes in the same order.
 */
export function routeInventoryDiff(reference, candidate) {
  if (reference === null || candidate === null) {
    return { equal: false, missing: null, extra: null }
  }

  const missing = reference.filter((route) => !candidate.includes(route))
  const extra = candidate.filter((route) => !reference.includes(route))
  return { equal: missing.length === 0 && extra.length === 0, missing, extra }
}
