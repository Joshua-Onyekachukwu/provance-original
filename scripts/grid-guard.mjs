#!/usr/bin/env node
/**
 * grid-guard.mjs — repo-wide mobile-first grid sweep (CI gate).
 *
 * Mirrors the repo-wide assertions in src/lib/gridClassGuard.test.js as a
 * standalone fail-closed command, so the sweep is an explicit CI step instead
 * of being buried inside the vitest suite:
 *
 *   1. Every responsive grid-cols-* in src/ must declare a base grid-cols-1
 *      (or be a breakpoint-gated grid, or an allowlisted intentional
 *      multi-column-on-mobile grid).
 *   2. Every allowlisted literal must still exist in src/ (no stale entries).
 *
 * Exits non-zero (with the full violation list) on any failure.
 *
 * Usage:
 *   npm run guard:grid              # scan src/
 *   node scripts/grid-guard.mjs     # same
 *   node scripts/grid-guard.mjs backend/src   # any dir (defaults to src/)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  INTENTIONAL_MOBILE_GRIDS,
  extractClassNameLiterals,
  scanGridBaseViolations,
} from '../src/lib/gridClassGuard.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const target = path.resolve(ROOT, process.argv[2] || 'src')

const violations = scanGridBaseViolations(target)

// Stale-allowlist check: every intentional mobile grid literal must still
// appear in the scanned tree, so the allowlist cannot silently grow stale.
const allLiterals = new Set()
const walk = (current) => {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name)
    if (entry.isDirectory()) {
      walk(full)
    } else if (/\.(jsx|js)$/.test(entry.name) && !/\.test\.(jsx|js)$/.test(entry.name)) {
      for (const literal of extractClassNameLiterals(fs.readFileSync(full, 'utf8'))) {
        allLiterals.add(literal)
      }
    }
  }
}
walk(target)

const stale = INTENTIONAL_MOBILE_GRIDS.filter((literal) => !allLiterals.has(literal))

if (violations.length === 0 && stale.length === 0) {
  console.log(`gridClassGuard: ${target} clean — every responsive grid declares a base grid-cols-1.`)
  process.exit(0)
}

console.error('gridClassGuard sweep FAILED:')
for (const violation of violations) {
  console.error(`  ${violation.file}:${violation.line} — ${violation.reason}`)
  console.error(`      className="${violation.literal}"`)
}
for (const literal of stale) {
  console.error(`  stale allowlist entry (no longer in ${path.relative(ROOT, target)}/): ${literal}`)
}
process.exit(1)
