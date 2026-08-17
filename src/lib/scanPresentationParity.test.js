/**
 * scanPresentationParity.test.js — import-parity smoke test.
 *
 * The repo-wide guard is the point: every file importing from
 * scanPresentation.js must import names that still exist in the module's
 * runtime export surface. If formatter consolidation renames or removes an
 * export but misses an importer, this suite fails instead of drifting.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as scanPresentation from '../components/app/scanPresentation.js'
import {
  extractScanPresentationImports,
  parseImportMembers,
  scanScanPresentationImporters,
} from './scanPresentationParity.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The module's runtime export surface — the pinned public signature. Adding
// a formatter is a deliberate API change: extend this list in the same edit.
const SURFACE = [
  'SCAN_STATUS_META',
  'getScanStatusMeta',
  'hasActiveScanWork',
  'scanNeedsPolling',
  'queueNeedsPolling',
  'formatRelativeTime',
  'formatCount',
  'formatDate',
  'formatPct',
  'percentOf',
  'formatDateTime',
  'formatScanTimestamp',
  'formatShortDate',
  'formatDateLong',
  'formatTimeShort',
  'formatHourShort',
  'formatCurrency',
  'formatDurationMs',
  'formatStorageGb',
  'formatFileSize',
  'getVerdictLabel',
  'VERDICT_PALETTE',
  'VERDICT_CHART_SEGMENTS',
  'VERDICT_META',
  'TONE_CSS_VARS',
  'applyVerdictPalette',
  'getVerdictMeta',
  'TEAM_META',
  'TEAM_IDS',
  'getTeamMeta',
]

describe('parseImportMembers', () => {
  it('splits a comma list and trims whitespace', () => {
    expect(parseImportMembers(' formatCount,  formatDate,\n  formatPct ')).toEqual([
      'formatCount',
      'formatDate',
      'formatPct',
    ])
  })

  it('keeps the original name behind an alias', () => {
    expect(parseImportMembers('formatCount as fc, formatDate')).toEqual([
      'formatCount',
      'formatDate',
    ])
  })

  it('drops comments from the clause', () => {
    expect(parseImportMembers('formatCount, // legacy\n formatDate /* x */')).toEqual([
      'formatCount',
      'formatDate',
    ])
  })
})

describe('extractScanPresentationImports', () => {
  it('matches a single-line named import', () => {
    const { named, unsupported } = extractScanPresentationImports(
      "import { formatCount, formatDate } from '../../components/app/scanPresentation.js'",
    )
    expect(named).toEqual([['formatCount', 'formatDate']])
    expect(unsupported).toBe(false)
  })

  it('matches a multi-line named import', () => {
    const { named } = extractScanPresentationImports(
      "import {\n  formatDateTime,\n  getTeamMeta,\n} from './scanPresentation.js'",
    )
    expect(named).toEqual([['formatDateTime', 'getTeamMeta']])
  })

  it('collects multiple import statements from one file', () => {
    const { named } = extractScanPresentationImports(
      "import { formatCount } from './scanPresentation.js'\nimport { TEAM_IDS } from '../components/app/scanPresentation.js'",
    )
    expect(named).toEqual([['formatCount'], ['TEAM_IDS']])
  })

  it('ignores imports of other modules', () => {
    const { named, unsupported } = extractScanPresentationImports(
      "import { formatCount } from './otherPresentation.js'\nimport Button from './Button.jsx'",
    )
    expect(named).toEqual([])
    expect(unsupported).toBe(false)
  })

  it('flags namespace and default imports as unsupported shapes', () => {
    expect(
      extractScanPresentationImports(
        "import * as sp from './components/app/scanPresentation.js'",
      ).unsupported,
    ).toBe(true)
    expect(
      extractScanPresentationImports(
        "import sp from './components/app/scanPresentation.js'",
      ).unsupported,
    ).toBe(true)
  })
})

describe('scanPresentation export surface', () => {
  it('matches the pinned public signature (no silent rename/remove)', () => {
    expect(Object.keys(scanPresentation)).toEqual(SURFACE)
  })
})

describe('repo-wide import parity', () => {
  it('every imported name exists in the module surface', () => {
    const importers = scanScanPresentationImporters(SRC_DIR)
    expect(importers.length).toBeGreaterThan(20) // sanity: the walk found real importers

    const surface = new Set(Object.keys(scanPresentation))
    const missing = []
    for (const { file, names } of importers) {
      for (const name of names) {
        if (!surface.has(name)) missing.push(`${file} → ${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('no importer uses an unsupported (namespace/default) import shape', () => {
    const unsupported = scanScanPresentationImporters(SRC_DIR)
      .filter((entry) => entry.unsupported)
      .map((entry) => entry.file)
    expect(unsupported).toEqual([])
  })
})
