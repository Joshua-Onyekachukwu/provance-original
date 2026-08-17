/**
 * scanPresentationParity.js — import-parity guard for the shared presentation
 * module (src/components/app/scanPresentation.js).
 *
 * scanPresentation.js is the single source of truth for formatters, verdict
 * meta, status meta, and team meta — 50+ files import from it. When formatter
 * consolidation renames or removes an export, the drift is silent until a
 * page renders (or the build catches it much later). This guard walks every
 * importer in src/ and asserts the names it imports still exist in the
 * module's runtime export surface, so a signature change fails the unit
 * suite the moment it lands.
 *
 * The walk/parse machinery is the shared core in importParity.js; this file
 * is the scanPresentation-specific configuration.
 */
import { createImportParityGuard, parseImportMembers } from './importParity.js'

/** Canonical module path (relative to src/) that every importer resolves to. */
export const SCAN_PRESENTATION_MODULE = 'components/app/scanPresentation.js'

const guard = createImportParityGuard({
  moduleFile: SCAN_PRESENTATION_MODULE,
  specifierRe: /['"][^'"]*scanPresentation(?:\.js)?['"]/,
  // The guard's own test file namespace-imports the module to pin its
  // surface — that is the point of the file, not a drift violation.
  skipPrefixes: ['lib/scanPresentationParity'],
})

export const extractScanPresentationImports = guard.extractImports
export const scanScanPresentationImporters = guard.scanImporters
export { parseImportMembers }
