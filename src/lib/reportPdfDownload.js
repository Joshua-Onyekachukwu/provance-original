/**
 * reportPdfDownload.js — the shared Export PDF action for report surfaces.
 *
 * Wraps api.exportReportPdf (which owns the USE_MOCK branch and the real
 * fetch to GET /reports/:id/pdf) and turns the result into a UI action:
 *
 *   - mock mode → { kind: 'mock', printPath } so the caller keeps the
 *     browser-print flow (navigate to the printable view → print dialog).
 *   - real mode → triggers the blob download through a temporary anchor and
 *     returns { kind: 'download', filename } so the caller can toast the
 *     outcome. The server renders the PDF (pdfkit, A4 branded), so the user
 *     gets a file without ever opening the browser print dialog.
 *
 * The helper is deliberately tiny and side-effect-light so the mock/download
 * contract can be unit-tested in isolation (see reportPdfDownload.test.js).
 */

import { exportReportPdf } from './api.js'

/**
 * Trigger a download of an object URL (blob:) through a temporary anchor.
 * Exported separately so callers can reuse the exact download mechanics.
 */
export function triggerObjectUrlDownload(url, filename) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Release the object URL once the browser has started the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Run the Export PDF action for a report. Resolves with a discriminated
 * result so callers can adapt their toast/navigation copy per mode.
 */
export async function downloadReportPdf(reportId) {
  const result = await exportReportPdf(reportId)

  if (result.mock) {
    return { kind: 'mock', printPath: result.printPath }
  }

  triggerObjectUrlDownload(result.url, result.filename)
  return { kind: 'download', filename: result.filename }
}
