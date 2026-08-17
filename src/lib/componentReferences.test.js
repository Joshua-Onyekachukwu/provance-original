/**
 * componentReferences.test.js — unit tests for the import matchers plus the
 * repo-wide guard that every component under src/components/ (except ui/) is
 * reachable from the app, so TrustBar-style unreferenced dead code can never
 * accumulate silently again.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import {
  REFERENCE_EXCEPTIONS,
  buildImportMatchers,
  findUnreferencedComponents,
  stripComments,
} from './componentReferences.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('buildImportMatchers', () => {
  it('matches path imports with and without the .jsx extension', () => {
    const { pathRe } = buildImportMatchers('HealthCheckRow')
    expect(pathRe.test("from './HealthCheckRow.jsx'")).toBe(true)
    expect(pathRe.test("from './HealthCheckRow'")).toBe(true)
    expect(buildImportMatchers('TrustBar').pathRe.test("from '../components/TrustBar'")).toBe(true)
    expect(
      buildImportMatchers('TeamBadge').pathRe.test("from '../../components/app/TeamBadge.jsx'"),
    ).toBe(true)
  })

  it('requires a directory prefix — bare specifiers are not component imports', () => {
    const { pathRe } = buildImportMatchers('TrustBar')
    expect(pathRe.test("from 'TrustBar'")).toBe(false)
    expect(pathRe.test("from './index.js'")).toBe(false)
  })

  it('matches default and named identifier imports (barrel surface)', () => {
    const { identRe } = buildImportMatchers('HealthCheckRow')
    expect(identRe.test("import HealthCheckRow from './HealthCheckRow.jsx'")).toBe(true)
    expect(identRe.test("import { HealthCheckRow } from './index.js'")).toBe(true)
    expect(identRe.test('import { a, HealthCheckRow, b } from "../components/admin"')).toBe(true)
  })

  it('does not match identifiers used outside an import statement', () => {
    const { identRe } = buildImportMatchers('Footer')
    expect(identRe.test('const Footer = <footer />')).toBe(false)
    expect(identRe.test('export default function Footer() {}')).toBe(false)
    expect(identRe.test('Footer.render()')).toBe(false)
  })

  it('strips comments so hints cannot masquerade as imports', () => {
    expect(stripComments('import A from \'./A.jsx\' // import Footer from \'./Footer.jsx\'')).toBe(
      "import A from './A.jsx'",
    )
    expect(stripComments('// import Footer from \'../components/Footer\'')).toBe('')
    expect(stripComments('/* import Footer from \'./Footer.jsx\' */ const x = 1')).toBe(' const x = 1')
    // A bare // inside a quoted string (URLs, https://…) survives.
    expect(stripComments("const url = 'https://x.test/a' // note")).toBe("const url = 'https://x.test/a'")
  })
})

describe('repo-wide component reachability guard', () => {
  // The repo-wide scan reads every src file; under parallel suite load it can
  // exceed the 5s default — same treatment the slow guards already get.
  it(
    'every component under src/components (except ui/) is reachable from the app',
    () => {
      const unreferenced = findUnreferencedComponents(SRC_DIR)
      expect(unreferenced).toEqual([])
      if (unreferenced.length > 0) {
        // Vitest prints the diff; keep a readable hint next to it.
        console.error(
          'Unreferenced components detected — wire each into a page, delete it, or move it to src/archive/ ' +
            `(and add it to REFERENCE_EXCEPTIONS if intentionally unreferenced):\n${unreferenced.join('\n')}`,
        )
      }
    },
    30_000,
  )

  it(
    'every REFERENCE_EXCEPTIONS entry still names an existing component (no stale entries)',
    () => {
      const componentsDir = path.join(SRC_DIR, 'components')
      const stale = [...REFERENCE_EXCEPTIONS].filter((rel) => {
        const file = path.join(SRC_DIR, rel.split('/').join(path.sep))
        return !fs.existsSync(file) || !file.startsWith(componentsDir + path.sep)
      })
      expect(stale).toEqual([])
    },
    10_000,
  )
})
