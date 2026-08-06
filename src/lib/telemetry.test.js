import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCrashRecord,
  captureError,
  clearBufferedErrors,
  flushErrors,
  getBufferedErrors,
} from './telemetry.js'

// Same literal the module reads — mirrors AuthContext's persisted session key.
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

// ---------------------------------------------------------------------------
// telemetry.js — pre-Sentry crash telemetry stub.
// Runs in the node test environment, so browser globals are stubbed on
// globalThis (the module reads them defensively at call time).
// ---------------------------------------------------------------------------

const CRASH_BUFFER_KEY = 'provance.crashReports.v1'

function createFakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
  }
}

function fakeSession(user = {}) {
  return JSON.stringify({ user, profile: {}, permissions: {}, session: {} })
}

function throwingStorage() {
  return {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('QuotaExceededError')
    },
    removeItem: () => undefined,
  }
}

let storage

beforeEach(() => {
  storage = createFakeStorage()
  globalThis.localStorage = storage
  // node's navigator/location are getter-only globals — stub via vi so the
  // module's defensive reads see a browser-like surface.
  vi.stubGlobal('navigator', { userAgent: 'test-agent/1.0' })
  vi.stubGlobal('location', { pathname: '/app/reports' })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  delete globalThis.localStorage
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('buildCrashRecord', () => {
  it('produces the full structured record shape', () => {
    const error = new Error('boom')
    const record = buildCrashRecord(error, { componentStack: '\n  at Row (Row.jsx:12)' })

    expect(record.type).toBe('render_error')
    expect(record.message).toBe('boom')
    expect(record.stack).toContain('Error: boom')
    expect(record.component_stack).toContain('Row.jsx')
    expect(record.route).toBe('/app/reports')
    expect(record.user_agent).toBe('test-agent/1.0')
    expect(record.user_id).toBeNull()
    expect(record.email).toBeNull()
    expect(record.meta).toEqual({})
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(record.id).toMatch(/^cr-/)
  })

  it('stringifies non-Error thrown values', () => {
    expect(buildCrashRecord('plain string').message).toBe('plain string')
    expect(buildCrashRecord(null).message).toBe('null')
  })

  it('truncates stacks longer than the cap', () => {
    const error = new Error('big')
    error.stack = 'x'.repeat(9000)
    const record = buildCrashRecord(error)
    // slice(0, 6000) + '\n' + '… (truncated)' — exact, no off-by-one.
    expect(record.stack.length).toBe(6000 + '\n… (truncated)'.length)
    expect(record.stack.endsWith('… (truncated)')).toBe(true)
  })

  it('carries custom context and meta through', () => {
    const record = buildCrashRecord(new Error('x'), {
      route: '/app/admin',
      meta: { boundary: 'shell' },
    })
    expect(record.route).toBe('/app/admin')
    expect(record.meta).toEqual({ boundary: 'shell' })
  })
})

describe('captureError', () => {
  it('logs to the dev console and buffers the record', () => {
    const record = captureError(new Error('boom'))

    expect(console.error).toHaveBeenCalledWith('[telemetry] crash captured', record)
    expect(getBufferedErrors()).toHaveLength(1)
    expect(getBufferedErrors()[0].message).toBe('boom')
  })

  it('attaches identity from the persisted auth session', () => {
    globalThis.localStorage.setItem(
      AUTH_STORAGE_KEY,
      fakeSession({ id: 'user_1', email: 'ada@provance.dev' }),
    )

    captureError(new Error('boom'))

    const [record] = getBufferedErrors()
    expect(record.user_id).toBe('user_1')
    expect(record.email).toBe('ada@provance.dev')
  })

  it('tolerates a malformed session without breaking the record', () => {
    globalThis.localStorage.setItem(AUTH_STORAGE_KEY, 'not json {')

    const record = captureError(new Error('boom'))

    expect(record.user_id).toBeNull()
    expect(getBufferedErrors()).toHaveLength(1)
  })

  it('caps the buffer at the newest 25 records', () => {
    for (let i = 0; i < 30; i += 1) {
      captureError(new Error(`error ${i}`))
    }

    const records = getBufferedErrors()
    expect(records).toHaveLength(25)
    expect(records[0].message).toBe('error 5')
    expect(records[24].message).toBe('error 29')
  })

  it('never throws when storage is unavailable or quota is exceeded', () => {
    globalThis.localStorage = throwingStorage()

    expect(() => captureError(new Error('boom'))).not.toThrow()
  })

  it('recovers when the buffer holds corrupt data', () => {
    globalThis.localStorage.setItem(CRASH_BUFFER_KEY, 'corrupt{')

    expect(() => captureError(new Error('boom'))).not.toThrow()
    expect(getBufferedErrors()).toHaveLength(1)
  })
})

describe('buffer helpers', () => {
  it('clearBufferedErrors empties the buffer', () => {
    captureError(new Error('boom'))
    expect(getBufferedErrors()).toHaveLength(1)

    clearBufferedErrors()

    expect(getBufferedErrors()).toHaveLength(0)
  })

  it('flushErrors resolves with the buffered records (backend flush seam)', async () => {
    captureError(new Error('one'))
    captureError(new Error('two'))

    const flushed = await flushErrors()

    expect(flushed.map((record) => record.message)).toEqual(['one', 'two'])
  })

  it('getBufferedErrors is safe before anything is captured', () => {
    expect(getBufferedErrors()).toEqual([])
  })
})
