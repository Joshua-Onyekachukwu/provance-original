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
 * Import shapes supported:
 *   - named imports, single- or multi-line:  import { a, b } from '…scanPresentation.js'
 *   - aliases:                                import { formatCount as fc } from '…'  (checks `formatCount`)
 * Unsupported (flagged as violations, not silently skipped):
 *   - namespace (import * as sp) or default (import sp from '…') — the module
 *     is consumed by named imports everywhere; a new shape deserves a review.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Canonical module path (relative to src/) that every importer resolves to. */
export const SCAN_PRESENTATION_MODULE = path.join('components', 'app', 'scanPresentation.js')

// A named-import statement whose specifier ends in scanPresentation(.js).
// [^}]* spans newlines, so multi-line imports match without an s flag.
const NAMED_IMPORT_RE =
  /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*scanPresentation(?:\.js)?['"]/g

// A namespace/default import of the module — unsupported, flagged loudly.
// No `g` flag: `.test()` must stay stateless (a `g` regex remembers
// lastIndex, so an earlier assertion would poison later calls).
const UNSUPPORTED_IMPORT_RE =
  /import\s+(?:\*\s+as\s+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)\s+from\s*['"][^'"]*scanPresentation(?:\.js)?['"]/

/** Split one import clause's member list into plain names (alias → original). */
export function parseImportMembers(clause) {
  return clause
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(',')
    .map((member) => {
      const name = member.trim().split(/\s+as\s+/)[0].trim()
      return name
    })
    .filter(Boolean)
}

/**
 * Pull every named import of the module out of a file's source.
 * Returns { named: string[][], unsupported: boolean } — each entry of `named`
 * is the member list of one import statement.
 */
export function extractScanPresentationImports(sourceText) {
  const named = []
  let match
  while ((match = NAMED_IMPORT_RE.exec(sourceText)) !== null) {
    named.push(parseImportMembers(match[1]))
  }
  const unsupported = UNSUPPORTED_IMPORT_RE.test(sourceText)
  return { named, unsupported }
}

/**
 * Walk a directory and collect every file importing the module.
 * Returns [{ file, names }] where `names` is the deduped flat list of
 * imported names; files using an unsupported import shape are reported with
 * `unsupported: true` and no names.
 */
export function scanScanPresentationImporters(dir) {
  const importers = []
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.(jsx|js)$/.test(entry.name)) {
        // Skip the module itself (it can't import itself) and this guard's
        // own files (they reference the module's name, not its exports).
        const relative = path.relative(dir, full).replace(/\\/g, '/')
        if (relative === SCAN_PRESENTATION_MODULE) continue
        if (relative.startsWith('lib/scanPresentationParity')) continue

        const { named, unsupported } = extractScanPresentationImports(
          fs.readFileSync(full, 'utf8'),
        )
        const names = [...new Set(named.flat())]
        if (names.length > 0 || unsupported) {
          importers.push({ file: relative, names, unsupported })
        }
      }
    }
  }
  walk(dir)
  return importers
}
