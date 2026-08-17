import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockInitiateScan, mockListScans, mockSubmitScan } from './mockApi.js'

/**
 * Mock Idempotency-Key parity — the mock mutation layer must mirror the real
 * POST /scans contract (migration 0019 + scans.service.ts initiateScan): a
 * retried initiate with the same key returns the original reservation while
 * the record is still pre-submission, and the same key issued after submit
 * starts a fresh record (the awaiting_upload window is closed).
 */
function stubWindow() {
  const store = {}
  vi.stubGlobal('window', {
    location: { search: '?noisy=0' }, // silence random error injection
    localStorage: {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value
      },
      removeItem: (key) => {
        delete store[key]
      },
    },
  })
}

function scanPayload(overrides = {}) {
  return {
    originalFilename: 'idem_test.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 4096,
    mediaType: 'image',
    processingMode: 'quick',
    ...overrides,
  }
}

describe('mock initiate idempotency', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the same reservation for a retried key without creating a duplicate', async () => {
    stubWindow()
    const before = await mockListScans()

    const first = await mockInitiateScan(scanPayload(), 'idem-retry-001')
    const second = await mockInitiateScan(scanPayload(), 'idem-retry-001')

    expect(second.scanId).toBe(first.scanId)
    const after = await mockListScans()
    expect(after.total).toBe(before.total + 1)
  })

  it('closes the idempotency window once the scan is submitted', async () => {
    stubWindow()
    const before = await mockListScans()

    const first = await mockInitiateScan(scanPayload(), 'idem-submit-001')
    await mockSubmitScan(first.scanId)
    const retryAfterSubmit = await mockInitiateScan(
      scanPayload(),
      'idem-submit-001',
    )

    expect(retryAfterSubmit.scanId).not.toBe(first.scanId)
    const after = await mockListScans()
    expect(after.total).toBe(before.total + 2)
  })

  it('creates separate records for different keys', async () => {
    stubWindow()
    const before = await mockListScans()

    const a = await mockInitiateScan(scanPayload(), 'idem-key-a')
    const b = await mockInitiateScan(scanPayload(), 'idem-key-b')

    expect(a.scanId).not.toBe(b.scanId)
    const after = await mockListScans()
    expect(after.total).toBe(before.total + 2)
  })
})
