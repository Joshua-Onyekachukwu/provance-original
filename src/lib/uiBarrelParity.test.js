/**
 * uiBarrelParity.test.js — import-parity guard for the ui-primitives barrel
 * (src/components/ui/index.js).
 *
 * The barrel is the single entry point for the ui kit — 30+ workspace/admin
 * pages import from '../../components/ui' (or '/index.js'). Same drift
 * protection as the scanPresentation/chartGeometry guards: if the barrel
 * renames, removes, or stops re-exporting a primitive but misses an importer,
 * this suite fails instead of shipping a silent missing-export.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as ui from '../components/ui'
import { createImportParityGuard } from './importParity.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The barrel's runtime export surface — the pinned public signature. Adding
// a primitive is a deliberate API change: extend this list in the same edit
// (order = declaration order in index.js).
const SURFACE = [
  'Button',
  'Badge',
  'Card',
  'StatCard',
  'DataTable',
  'Tabs',
  'Drawer',
  'CommandPalette',
  'Popover',
  'computeTransformOrigin',
  'CommandRegistryProvider',
  'CommandRegistryContext',
  'useCommandRegistry',
  'useRegisterCommands',
  'ToastProvider',
  'useToast',
  'EmptyState',
  'Skeleton',
  'Spinner',
  'TrendChart',
  'StackedBarChart',
  'HourlyBarChart',
  'DonutChart',
  'ChartHoverReadout',
  'LivePollIndicator',
  'ChartAxisLabels',
  'CHART_W',
  'CHART_H',
  'PAD',
  'buildChartGeometry',
  'buildStackedBarGeometry',
  'buildHitAreaCells',
  'buildGroupedHitAreaCells',
  'buildHourlyBarGeometry',
  'buildDonutSegments',
  'stackedOutlineBounds',
  'stackedSegmentBounds',
  'pctOfViewBoxY',
  'pctOfViewBoxX',
]

const guard = createImportParityGuard({
  moduleFile: 'components/ui/index.js',
  specifierRe: /['"][^'"]*components\/ui(?:\/index\.js)?['"]/,
  // The guard's own test file namespace-imports the barrel to pin its surface.
  skipPrefixes: ['lib/uiBarrelParity'],
})

describe('ui barrel export surface', () => {
  it('matches the pinned public signature (no silent rename/remove)', () => {
    expect(Object.keys(ui)).toEqual(SURFACE)
  })
})

describe('repo-wide import parity', () => {
  it('every imported name exists in the barrel surface', () => {
    const importers = guard.scanImporters(SRC_DIR)
    expect(importers.length).toBeGreaterThan(20) // sanity: the walk found real importers

    const surface = new Set(Object.keys(ui))
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
