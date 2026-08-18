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

  it('branches the completed payload by depth — quick 2 signals, standard 4, deep 5 + deep_analysis + credits', async () => {
    vi.useFakeTimers()
    stubWindow()

    // Distinct filename + size per depth so the byte-identical dedup path
    // can't short-circuit any of them.
    async function runDepth(mode, name, size) {
      const init = await settle(
        mockInitiateScan(payload({ processingMode: mode, originalFilename: name, fileSizeBytes: size })),
      )
      const { scan } = await settle(mockSubmitScan(init.scanId))
      vi.advanceTimersByTime(4000)
      expect(scan.status).toBe('completed')
      return scan.result_payload
    }

    // Quick: reduced signal set, 1 credit, no deep_analysis.
    const quick = await runDepth('quick', 'depth_quick.png', 1111)
    expect(quick.signals).toHaveLength(2)
    expect(quick.verdict.signal_count_total).toBe(2)
    expect(quick.metadata.processing_cost_credits).toBe(1)
    expect(quick.metadata.deep_analysis).toBeUndefined()

    // Standard: the full baseline set, 10 credits.
    const standard = await runDepth('standard', 'depth_standard.png', 2222)
    expect(standard.signals).toHaveLength(4)
    expect(standard.verdict.signal_count_total).toBe(4)
    expect(standard.metadata.processing_cost_credits).toBe(10)
    expect(standard.metadata.deep_analysis).toBeUndefined()

    // Deep: adds region_consistency (5 total) + deep_analysis block, 100 credits.
    const deep = await runDepth('deep', 'depth_deep.png', 3333)
    expect(deep.signals).toHaveLength(5)
    expect(deep.signals.map((s) => s.signal_id)).toContain('region_consistency')
    expect(deep.verdict.signal_count_total).toBe(5)
    expect(deep.metadata.processing_cost_credits).toBe(100)
    expect(deep.metadata.deep_analysis).toBeDefined()
    expect(deep.metadata.deep_analysis.grid_size).toBe(4)
    expect(deep.metadata.deep_analysis.region_count).toBe(16)
  })

  it('scales the credit cost by file size — a 50 MiB standard scan ≠ a 200 KB one', async () => {
    vi.useFakeTimers()
    stubWindow()

    // Same depth (standard), different size tiers — the mock worker's
    // processing_cost_credits must mirror the real size-aware dial.
    async function runSize(name, size) {
      const init = await settle(
        mockInitiateScan(payload({ processingMode: 'standard', originalFilename: name, fileSizeBytes: size })),
      )
      const { scan } = await settle(mockSubmitScan(init.scanId))
      vi.advanceTimersByTime(4000)
      expect(scan.status).toBe('completed')
      return scan.result_payload.metadata.processing_cost_credits
    }

    expect(await runSize('size_tiny.png', 200 * 1024)).toBe(10) // 200 KB → 1×
    expect(await runSize('size_heavy.png', 50 * 1024 * 1024)).toBe(40) // 50 MiB → 4×
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
