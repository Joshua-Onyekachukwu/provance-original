/**
 * importParity.test.js — unit tests for the generic import-parity core.
 *
 * The scanPresentation/chartGeometry/uiBarrel parity suites exercise the
 * guards end-to-end; this suite locks the shared parsing/extraction
 * primitives themselves against a synthetic guard config.
 */
import { describe, expect, it } from 'vitest'
import { createImportParityGuard, parseImportMembers } from './importParity.js'

const guard = createImportParityGuard({
  moduleFile: 'components/ui/exampleModule.js',
  specifierRe: /['"][^'"]*exampleModule(?:\.js)?['"]/,
  skipPrefixes: ['lib/exampleParity'],
})

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

describe('guard.extractImports', () => {
  it('matches a single-line named import', () => {
    const { named, unsupported } = guard.extractImports(
      "import { formatCount, formatDate } from '../../components/exampleModule.js'",
    )
    expect(named).toEqual([['formatCount', 'formatDate']])
    expect(unsupported).toBe(false)
  })

  it('matches a multi-line named import', () => {
    const { named } = guard.extractImports(
      "import {\n  formatDateTime,\n  getMeta,\n} from './exampleModule'",
    )
    expect(named).toEqual([['formatDateTime', 'getMeta']])
  })

  it('collects multiple import statements from one file', () => {
    const { named } = guard.extractImports(
      "import { formatCount } from './exampleModule.js'\nimport { TEAM_IDS } from '../components/exampleModule.js'",
    )
    expect(named).toEqual([['formatCount'], ['TEAM_IDS']])
  })

  it('ignores imports of other modules', () => {
    const { named, unsupported } = guard.extractImports(
      "import { formatCount } from './otherModule.js'\nimport Button from './Button.jsx'",
    )
    expect(named).toEqual([])
    expect(unsupported).toBe(false)
  })

  it('flags namespace and default imports as unsupported shapes', () => {
    expect(
      guard.extractImports("import * as m from './components/exampleModule.js'").unsupported,
    ).toBe(true)
    expect(guard.extractImports("import m from './components/exampleModule.js'").unsupported).toBe(
      true,
    )
  })

  it('stays stateless across repeated calls on different sources', () => {
    const first = guard.extractImports("import { a } from './exampleModule.js'")
    const second = guard.extractImports("import { b, c } from './exampleModule.js'")
    const third = guard.extractImports("import { a } from './exampleModule.js'")
    expect(first.named).toEqual([['a']])
    expect(second.named).toEqual([['b', 'c']])
    expect(third.named).toEqual([['a']])
  })
})
