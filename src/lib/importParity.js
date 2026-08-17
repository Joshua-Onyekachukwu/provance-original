/**
 * importParity.js — generic import-parity guard core.
 *
 * The repo's consolidation targets (scanPresentation.js, chartGeometry.js, the
 * ui barrel) are single sources of truth imported by many files. When a
 * refactor renames or removes an export but misses an importer, the drift is
 * silent until a page renders. This core powers one guard per target: it
 * walks every importer in src/ and asserts the names it imports still exist
 * in the module's runtime export surface, so a signature change fails the
 * unit suite the moment it lands.
 *
 * Each target configures a guard with:
 *   - moduleFile     — the module's path relative to src/ (self-skip)
 *   - specifierRe    — regex matching the module's specifier inside an
 *                      import-from clause (e.g. /chartGeometry(?:\.js)?/)
 *   - skipPrefixes   — rel-path prefixes to skip (the guard's own test files,
 *                      which legitimately namespace-import the module to pin
 *                      its surface)
 *
 * Import shapes supported:
 *   - named imports, single- or multi-line:  import { a, b } from '…'
 *   - aliases:                                import { a as x } from '…'  (checks `a`)
 * Unsupported (flagged as violations, not silently skipped):
 *   - namespace (import * as m) or default (import m from '…') — the modules
 *     are consumed by named imports everywhere; a new shape deserves a review.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Split one import clause's member list into plain names (alias → original). */
export function parseImportMembers(clause) {
  return clause
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(',')
    .map((member) => member.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean)
}

/**
 * Build a guard for one module. Returns:
 *   - extractImports(sourceText) → { named: string[][], unsupported: boolean }
 *   - scanImporters(dir) → [{ file, names, unsupported }]
 */
export function createImportParityGuard({ moduleFile, specifierRe, skipPrefixes = [] }) {
  // moduleFile may be given with forward slashes on any platform; normalize
  // so the self-skip compares against the walk's forward-slash rel paths.
  const normalizedModuleFile = moduleFile.replace(/\\/g, '/')
  const normalizedSkips = skipPrefixes.map((p) => p.replace(/\\/g, '/'))

  const extractImports = (sourceText) => {
    // A named-import statement whose specifier matches the module. [^}]*
    // spans newlines, so multi-line imports match without an s flag. Fresh
    // regex per call keeps `g`-flag lastIndex stateless across sources.
    const namedImportRe = new RegExp(
      `import\\s*\\{([^}]*)\\}\\s*from\\s*${specifierRe.source}`,
      'g',
    )
    // A namespace/default import of the module — unsupported, flagged loudly.
    // No `g` flag: `.test()` must stay stateless.
    const unsupportedImportRe = new RegExp(
      `import\\s+(?:\\*\\s+as\\s+[A-Za-z_$][\\w$]*|[A-Za-z_$][\\w$]*)\\s+from\\s*${specifierRe.source}`,
    )

    const named = []
    let match
    while ((match = namedImportRe.exec(sourceText)) !== null) {
      named.push(parseImportMembers(match[1]))
    }
    return { named, unsupported: unsupportedImportRe.test(sourceText) }
  }

  const scanImporters = (dir) => {
    const importers = []
    const walk = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(jsx|js)$/.test(entry.name)) {
          // Skip the module itself (it can't import itself) and this guard's
          // own files (they reference the module's surface, not its exports).
          const relative = path.relative(dir, full).replace(/\\/g, '/')
          if (relative === normalizedModuleFile) continue
          if (normalizedSkips.some((prefix) => relative.startsWith(prefix))) continue

          const { named, unsupported } = extractImports(fs.readFileSync(full, 'utf8'))
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

  return { extractImports, scanImporters }
}
