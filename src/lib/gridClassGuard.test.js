/**
 * gridClassGuard.test.js — unit tests for the parser/rule, plus the repo-wide
 * guard that every responsive grid declares a base grid-cols-1.
 */
import { describe, expect, it } from 'vitest'
import {
  INTENTIONAL_MOBILE_GRIDS,
  extractClassNameLiterals,
  findBaseDisplayViolation,
  findGridBaseViolation,
  scanGridBaseViolations,
} from './gridClassGuard.js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('extractClassNameLiterals', () => {
  it('pulls static string literals', () => {
    expect(
      extractClassNameLiterals('<div className="grid grid-cols-1 gap-4 md:grid-cols-2">'),
    ).toEqual(['grid grid-cols-1 gap-4 md:grid-cols-2'])
  })

  it('pulls non-interpolated template literals', () => {
    expect(extractClassNameLiterals('<div className={`grid gap-4 lg:grid-cols-3`}>')).toEqual([
      'grid gap-4 lg:grid-cols-3',
    ])
  })

  it('skips interpolated template literals (dynamic classes)', () => {
    expect(
      extractClassNameLiterals('<div className={`grid ${open ? "gap-2" : "gap-4"} md:grid-cols-2`}>'),
    ).toEqual([])
  })

  it('returns nothing when no className props exist', () => {
    expect(extractClassNameLiterals('<div class="grid"></div>')).toEqual([])
  })
})

describe('findGridBaseViolation', () => {
  it('accepts a responsive grid with an explicit grid-cols-1 base', () => {
    expect(findGridBaseViolation('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4')).toBeNull()
  })

  it('accepts grids with no responsive column classes', () => {
    expect(findGridBaseViolation('grid grid-cols-3 gap-3')).toBeNull()
    expect(findGridBaseViolation('grid gap-4')).toBeNull()
  })

  it('accepts a breakpoint-gated grid (not a grid on mobile)', () => {
    expect(
      findGridBaseViolation('min-h-screen block lg:grid lg:grid-cols-[300px_minmax(0,1fr)]'),
    ).toBeNull()
  })

  it('accepts allowlisted intentional mobile grids', () => {
    expect(findGridBaseViolation('grid grid-cols-2 gap-3 sm:grid-cols-4')).toBeNull()
  })

  it('flags a responsive grid missing its base grid-cols-1', () => {
    expect(findGridBaseViolation('grid gap-4 md:grid-cols-3')).toMatch(/grid-cols-1/)
  })

  it('flags a non-allowlisted multi-column base under a responsive grid', () => {
    expect(findGridBaseViolation('grid grid-cols-2 md:grid-cols-4')).toMatch(/grid-cols-1/)
  })

  it('flags a responsive custom-track grid missing its base', () => {
    expect(findGridBaseViolation('grid gap-6 lg:grid-cols-[1.05fr_0.95fr]')).toMatch(/grid-cols-1/)
  })
})

describe('findBaseDisplayViolation', () => {
  it('accepts the canonical hidden md:flex nav pattern', () => {
    expect(findBaseDisplayViolation('hidden md:flex items-center gap-8')).toBeNull()
  })

  it('accepts a block base under a responsive grid display', () => {
    expect(findBaseDisplayViolation('min-h-screen block lg:grid lg:grid-cols-[280px_minmax(0,1fr)]')).toBeNull()
  })

  it('accepts a flex base under a redundant responsive flex', () => {
    expect(findBaseDisplayViolation('flex items-center gap-2 xl:flex')).toBeNull()
  })

  it('accepts literals with no responsive display utility at all', () => {
    expect(findBaseDisplayViolation('grid grid-cols-1 gap-4 md:grid-cols-2')).toBeNull()
    expect(findBaseDisplayViolation('flex flex-col')).toBeNull()
  })

  it('flags a responsive flex without any base display token', () => {
    expect(findBaseDisplayViolation('items-center gap-2 lg:flex')).toMatch(/base display/)
  })

  it('flags a responsive grid display without any base display token', () => {
    expect(findBaseDisplayViolation('min-h-screen lg:grid lg:grid-cols-2')).toMatch(/base display/)
  })

  it('flags a responsive block without any base display token', () => {
    expect(findBaseDisplayViolation('md:block')).toMatch(/base display/)
  })
})

describe('repo-wide mobile-first grid guard', () => {
  it('every responsive grid in src declares a base grid-cols-1', () => {
    const violations = scanGridBaseViolations(SRC_DIR)
    expect(violations).toEqual([])
  })

  it('every allowlisted literal still exists in src (no stale entries)', () => {
    const allLiterals = new Set()
    const walk = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(jsx|js)$/.test(entry.name) && !/\\.test\\.(jsx|js)$/.test(entry.name)) {
          for (const literal of extractClassNameLiterals(fs.readFileSync(full, 'utf8'))) {
            allLiterals.add(literal)
          }
        }
      }
    }
    walk(SRC_DIR)
    const stale = INTENTIONAL_MOBILE_GRIDS.filter((literal) => !allLiterals.has(literal))
    expect(stale).toEqual([])
  })
})
