/**
 * componentReferences.js — dead-code guard for the public component tree.
 *
 * Every component under src/components/ (except src/components/ui/, which is
 * governed by its own barrel-parity contract in uiBarrelParity.test.js) must
 * be *reachable*: transitively imported by a file outside the components
 * directory (a page, route, context, or lib module). A component that only
 * TrustBar-style dead code can slip into the bundle silently, so this scanner
 * powers the repo-wide guard in componentReferences.test.js — the same
 * pattern gridClassGuard.test.js uses for responsive grids.
 *
 * Reachability, not "imported anywhere":
 *   - Roots are every src file outside src/components/.
 *   - A component is live when a root imports it directly, or when another
 *     live component imports it (transitive closure).
 *   - A component imported ONLY by another dead component is still dead —
 *     the BFS surfaces it as part of the dead cluster instead of trusting a
 *     false "1 importer".
 *
 * Matching covers the two real import shapes in this repo:
 *   - path imports:  from './HealthCheckRow.jsx' | from '../components/TrustBar'
 *   - identifier imports (barrels):  import { HealthCheckRow } from './index.js'
 *
 * Comments are stripped before matching so a leftover `// import Footer from ...`
 * hint can never count as a reference to dead code.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Strip line and block comments so hints/comments can't masquerade as imports. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    // `//` not preceded by : ' " (keeps https:// and string literals intact)
    .replace(/(?<![\\:'"])\/\/.*$/gm, '')
    .replace(/[ \t]+$/gm, '') // leftover space before a stripped comment
    .replace(/^\s*$/gm, '');
}

/**
 * Explicit exceptions: components that are intentionally allowed to have no
 * importers (e.g. a demo-only surface kept for screenshots). Values are
 * relative to src/ with forward slashes ('components/admin/Foo.jsx'). The
 * stale-entry check in the test keeps this list from growing moss.
 */
export const REFERENCE_EXCEPTIONS = new Set([
  // (none today — every non-ui component is live)
]);

/** Build the two matchers for a component basename (PascalCase, no regex metachars). */
export function buildImportMatchers(name) {
  return {
    // Specifier ending in /<Name> or /<Name>.jsx (any directory prefix).
    pathRe: new RegExp(`from\\s*['"][^'"]*[/\\\\]${name}(\\.jsx)?['"]`),
    // Default or named identifier import: `import X from` / `import { X } from`.
    identRe: new RegExp(`import\\s*(?:\\{[^}]*\\b${name}\\b[^}]*\\}|${name})\\s*from`),
  };
}

/**
 * Scan src/components/ (excluding ui/ and *.test.jsx) and return the relative
 * paths (forward slashes) of components that are not transitively reachable
 * from any root file (a src file outside src/components/).
 */
export function findUnreferencedComponents(srcDir) {
  const componentsDir = path.join(srcDir, 'components');

  const all = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(entry.name)) all.push(full);
    }
  };
  walk(srcDir);

  const uiSep = path.sep + 'ui' + path.sep;
  const components = all.filter(
    (f) =>
      f.startsWith(componentsDir + path.sep) &&
      f.endsWith('.jsx') &&
      !f.includes(uiSep) &&
      !f.endsWith('.test.jsx'),
  );

  // component file → every src file (except itself) that imports it
  const importersOf = new Map();
  for (const comp of components) {
    const name = path.basename(comp, '.jsx');
    const { pathRe, identRe } = buildImportMatchers(name);
    const importers = all.filter((f) => {
      if (f === comp) return false;
      const text = stripComments(fs.readFileSync(f, 'utf8'));
      return pathRe.test(text) || identRe.test(text);
    });
    importersOf.set(comp, importers);
  }

  // BFS from the roots (files outside src/components/), propagating through
  // live components so clusters stay reachable end-to-end.
  const roots = all.filter((f) => !f.startsWith(componentsDir + path.sep));
  const queue = [...roots];
  const reachable = new Set(roots);
  while (queue.length > 0) {
    const file = queue.shift();
    for (const [comp, importers] of importersOf) {
      if (reachable.has(comp)) continue;
      if (importers.includes(file)) {
        reachable.add(comp);
        queue.push(comp);
      }
    }
  }

  return components
    .filter((c) => !reachable.has(c) && !REFERENCE_EXCEPTIONS.has(toRel(c, srcDir)))
    .map((c) => toRel(c, srcDir))
    .sort();
}

function toRel(file, srcDir) {
  return path.relative(srcDir, file).split(path.sep).join('/');
}
