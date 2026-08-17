// @vitest-environment jsdom
/**
 * reportPdfDownload.test.js — unit coverage for the shared Export PDF action.
 *
 * The mock/download branches are the whole point of the helper: mock mode must
 * surface the print path untouched, and real mode must fire the anchor download
 * exactly once and release the object URL. The api.exportReportPdf boundary is
 * mocked so the fetch path itself stays out of scope here (api.js owns it).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api.js', () => ({
  exportReportPdf: vi.fn(),
}))

import { exportReportPdf } from './api.js'
import { downloadReportPdf, triggerObjectUrlDownload } from './reportPdfDownload.js'

const mockedExport = vi.mocked(exportReportPdf)

describe('downloadReportPdf', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'URL',
      class {
        static revokeObjectURL = vi.fn()
        static createObjectURL = vi.fn(() => 'blob:mock')
      },
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    mockedExport.mockReset()
  })

  it('passes the mock branch through as { kind: "mock", printPath } without touching the DOM', async () => {
    mockedExport.mockResolvedValue({ mock: true, printPath: '/app/reports/scan_1/print' })
    const appendChild = vi.spyOn(document.body, 'appendChild')

    const result = await downloadReportPdf('scan_1')

    expect(result).toEqual({ kind: 'mock', printPath: '/app/reports/scan_1/print' })
    expect(appendChild).not.toHaveBeenCalled()
    expect(mockedExport).toHaveBeenCalledWith('scan_1')
  })

  it('fires exactly one anchor download for a real blob result and returns the filename', async () => {
    mockedExport.mockResolvedValue({
      url: 'blob:provance-report',
      filename: 'provance-report-scan_1.pdf',
    })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const result = await downloadReportPdf('scan_1')

    expect(result).toEqual({ kind: 'download', filename: 'provance-report-scan_1.pdf' })

    // Exactly one anchor was created with the right href/filename and clicked,
    // then removed — no leftover download anchor stays in the DOM.
    expect(clickSpy).toHaveBeenCalledTimes(1)
    const anchor = clickSpy.mock.instances[0]
    expect(anchor).toBeInstanceOf(HTMLAnchorElement)
    expect(anchor.href).toBe('blob:provance-report')
    expect(anchor.download).toBe('provance-report-scan_1.pdf')
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
    clickSpy.mockRestore()
  })

  it('revokes the object URL after the download starts', async () => {
    mockedExport.mockResolvedValue({
      url: 'blob:provance-report',
      filename: 'provance-report-scan_1.pdf',
    })

    await downloadReportPdf('scan_1')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:provance-report')
  })

  it('propagates export failures so the caller can toast the error', async () => {
    mockedExport.mockRejectedValue(new Error('PDF export failed.'))

    await expect(downloadReportPdf('scan_1')).rejects.toThrow('PDF export failed.')
  })
})

describe('triggerObjectUrlDownload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'URL',
      class {
        static revokeObjectURL = vi.fn()
      },
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('appends, clicks, and removes a temporary download anchor', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')

    triggerObjectUrlDownload('blob:asset', 'provance-report-scan_1.pdf')

    const anchor = clickSpy.mock.instances[0]
    expect(anchor).toBeInstanceOf(HTMLAnchorElement)
    expect(anchor.href).toBe('blob:asset')
    expect(anchor.download).toBe('provance-report-scan_1.pdf')
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)

    clickSpy.mockRestore()
  })
})
