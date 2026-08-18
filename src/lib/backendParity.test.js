/**
 * backendParity.test.js — Backend interface drift guard (seam design Phase 1).
 *
 * Phase 1 of the Backend seam design (docs/engineering/BACKEND_SEAM_DESIGN.md)
 * is guard-only: the interface manifest is the single source of truth for the
 * api.js operation surface, and this suite keeps the two in lockstep so the
 * later adapter extraction can never silently drift.
 *
 * The checks:
 *   1. Manifest integrity — no duplicate method names across domain groups.
 *   2. Manifest ↔ facade alignment — every manifest method is an exported
 *      function on api.js, and every api.js operation (minus the adapter-owned
 *      mode constants) is declared in the manifest. Rename/remove on either
 *      side fails here, the same turn it lands.
 *   3. Adapter surface (auto-activating) — the moment an adapter file
 *      (MockBackend / HttpBackend / BetterAuthBackend) appears in
 *      src/lib/backend/, each is instantiated and asserted to implement every
 *      interface method. Phases 2–4 therefore extend this guard with zero
 *      edits.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import * as api from './api.js'
import { BACKEND_INTERFACE_METHODS } from './backend/index.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND_DIR = path.join(SRC_DIR, 'lib', 'backend')

// Mode constants are adapter-owned (design §3) — they are deliberately NOT
// interface operations, so the alignment checks exclude them.
const MODE_CONSTANTS = ['USE_MOCK', 'USE_BETTER_AUTH']
const facadeOps = Object.keys(api).filter((name) => !MODE_CONSTANTS.includes(name))

describe('Backend interface manifest integrity', () => {
  it('declares no duplicate method names across domains', () => {
    expect(new Set(BACKEND_INTERFACE_METHODS).size).toBe(
      BACKEND_INTERFACE_METHODS.length,
    )
  })

  it('declares a non-empty domain set covering the whole surface', () => {
    expect(BACKEND_INTERFACE_METHODS.length).toBeGreaterThan(70)
  })
})

describe('Backend interface ↔ api.js facade alignment', () => {
  it('every interface method is a function on the api.js facade', () => {
    const missing = BACKEND_INTERFACE_METHODS.filter(
      (method) => typeof api[method] !== 'function',
    )
    expect(missing).toEqual([])
  })

  it('every api.js operation is declared in the interface manifest', () => {
    const undeclared = facadeOps.filter(
      (op) => !BACKEND_INTERFACE_METHODS.includes(op),
    )
    expect(undeclared).toEqual([])
  })

  it('interface and facade method sets are identical', () => {
    expect([...BACKEND_INTERFACE_METHODS].sort()).toEqual(facadeOps.sort())
  })
})

// Adapter surface checks — inactive until the extraction phases land. Each
// adapter must implement every interface method; the decorator (BetterAuth)
// satisfies this via forwarding, which Phase 4 asserts at identity level.
describe('Backend adapters implement the interface (activates in later phases)', () => {
  const ADAPTER_FILES = ['MockBackend.js', 'HttpBackend.js', 'BetterAuthBackend.js']

  for (const file of ADAPTER_FILES) {
    it(`${file.replace('.js', '')} implements every interface method`, async () => {
      if (!fs.existsSync(path.join(BACKEND_DIR, file))) {
        return // Phase 1: adapter not extracted yet — check activates on landing
      }
      const mod = await import(`./backend/${file}`)
      const Adapter = mod[file.replace('.js', '')]
      const adapter = new Adapter({ fetch: () => Promise.resolve({}) })
      const missing = BACKEND_INTERFACE_METHODS.filter(
        (method) => typeof adapter[method] !== 'function',
      )
      expect(missing).toEqual([])
    })
  }
})
