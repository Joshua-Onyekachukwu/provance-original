import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockGetScan, mockInitiateScan, mockSubmitScan } from './mockApi.js'

/**
 * Mock worker lifecycle parity — the simulated pipeline (queued → processing →
 * completed with a full report payload) that makes the report detail page's
 * 5s polling demonstrable in mock mode. Mirrors the real BullMQ worker
 * round-trip: a submitted scan must visibly advance and land a completed
 * result_payload, never sit in a static queued state.
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

function payload(overrides = {}) {
  return {
    originalFilename: 'lifecycle_test.png',
    mimeType: 'image/png',
    fileSizeBytes: 8192,
    mediaType: 'image',
    processingMode: 'standard',
    ...overrides,
  }
}

/** Await a mock call while advancing fake timers past its random delay. */
async function settle(promise, ms = 1000) {
  vi.advanceTimersByTime(ms)
  return promise
}

describe('mock scan lifecycle (simulated worker)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('advances a submitted scan queued → processing → completed with a report payload', async () => {
    vi.useFakeTimers()
    stubWindow()

    // mockSubmitScan returns the live record reference — the worker mutates
    // it in place, so asserting on it needs no further mock delays (which
    // would overshoot the worker timer windows).
    const init = await settle(mockInitiateScan(payload()))
    const { scan: submitted } = await settle(mockSubmitScan(init.scanId))

    // Just submitted — still queued (the detail page's pending state).
    expect(submitted.status).toBe('queued')
    expect(submitted.result_payload).toBeNull()

    // Worker step 1: queued → processing (2s later).
    vi.advanceTimersByTime(2000)
    expect(submitted.status).toBe('processing')
    expect(submitted.result_payload).toBeNull()

    // Worker step 2: processing → completed with the full report payload.
    vi.advanceTimersByTime(2000)
    expect(submitted.status).toBe('completed')
    expect(submitted.completed_at).toBeTruthy()
    expect(submitted.verdict).toBe(submitted.result_payload.verdict.class)
    expect(submitted.result_payload.payload_version).toBe('1.0.0')
    expect(submitted.result_payload.report.report_id).toMatch(/^PRV-/)
    expect(submitted.result_payload.signals).toHaveLength(4)
    expect(submitted.result_payload.signals[0]).toMatchObject({
      signal_id: expect.any(String),
      signal_display_name: expect.any(String),
      status: expect.any(String),
      status_reason: expect.any(String),
    })
    expect(submitted.result_payload.verdict.display_label).toMatch(
      /Authentic|Suspicious|Inconclusive/,
    )
    expect(submitted.result_payload.verdict.signal_count_total).toBe(4)
    expect(submitted.result_payload.verdict.signal_count_completed).toBe(4)

    // The API surface (what the report detail page polls) reflects it too.
    const viaApi = await settle(mockGetScan(submitted.id))
    expect(viaApi.status).toBe('completed')
    expect(viaApi.result_payload.report.report_id).toBe(submitted.result_payload.report.report_id)
  })

  it('leaves the scan pending until the worker steps have elapsed', async () => {
    vi.useFakeTimers()
    stubWindow()

    // Distinct filename + size so the byte-identical dedup path (which would
    // complete the scan instantly) can't steal this test from the worker.
    const { scanId } = await settle(
      mockInitiateScan(payload({ originalFilename: 'lifecycle_pending.png', fileSizeBytes: 4096 })),
    )
    const { scan } = await settle(mockSubmitScan(scanId))

    // Only 1s of worker time elapsed — still queued, no payload yet.
    vi.advanceTimersByTime(1000)
    expect(scan.status).toBe('queued')
    expect(scan.result_payload).toBeNull()
  })
})
