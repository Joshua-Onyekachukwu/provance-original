/**
 * chartGeometryParity.test.js — import-parity guard for the shared chart
 * geometry module (src/components/ui/chartGeometry.js).
 *
 * chartGeometry.js owns the viewBox math for every self-hosted chart
 * (TrendChart, StackedBarChart, HourlyBarChart, DonutChart + the hover cells).
 * Same drift protection as the scanPresentation guard: if a geometry refactor
 * renames or removes an export but misses an importer, this suite fails.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as chartGeometry from '../components/ui/chartGeometry.js'
import { createImportParityGuard } from './importParity.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The module's runtime export surface — the pinned public signature. Adding
// a geometry helper is a deliberate API change: extend this list in the same
// edit (order = declaration order in chartGeometry.js).
const SURFACE = [
  'CHART_W',
  'CHART_H',
  'PAD',
  'buildChartGeometry',
  'pctOfViewBoxY',
  'pctOfViewBoxX',
  'buildStackedBarGeometry',
  'stackedSegmentBounds',
  'stackedOutlineBounds',
  'buildDonutSegments',
  'buildHitAreaCells',
  'buildGroupedHitAreaCells',
  'buildHourlyBarGeometry',
]

const guard = createImportParityGuard({
  moduleFile: 'components/ui/chartGeometry.js',
  specifierRe: /['"][^'"]*chartGeometry(?:\.js)?['"]/,
  // The guard's own test file namespace-imports the module to pin its surface.
  skipPrefixes: ['lib/chartGeometryParity'],
})

describe('chartGeometry export surface', () => {
  it('matches the pinned public signature (no silent rename/remove)', () => {
    expect(Object.keys(chartGeometry)).toEqual(SURFACE)
  })
})

describe('repo-wide import parity', () => {
  it('every imported name exists in the module surface', () => {
    const importers = guard.scanImporters(SRC_DIR)
    expect(importers.length).toBeGreaterThan(8) // sanity: the walk found real importers

    const surface = new Set(Object.keys(chartGeometry))
    const missing = []
    for (const { file, names } of importers) {
      for (const name of names) {
        if (!surface.has(name)) missing.push(`${file} → ${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('no importer uses an unsupported (namespace/default) import shape', () => {
    const unsupported = guard
      .scanImporters(SRC_DIR)
      .filter((entry) => entry.unsupported)
      .map((entry) => entry.file)
    expect(unsupported).toEqual([])
  })
})
