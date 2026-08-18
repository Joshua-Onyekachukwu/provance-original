// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../../components/ui'
import { getReport } from '../../lib/api.js'
import AppReportPrintPage from './AppReportPrintPage.jsx'

// Deterministic API: getReport resolves immediately with a completed scan so
// the print surface renders its full report shape. The other api.js calls
// (downloadReportPdf is only invoked on button click) stay as the real mocks.
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getReport: vi.fn().mockResolvedValue({
      scan: {
        id: 'scan_001',
        original_filename: 'example.png',
        mime_type: 'image/png',
        file_size_bytes: 1024,
        created_at: '2026-01-01T00:00:00Z',
        result_payload: {
          verdict: {
            class: 'likely_authentic',
            display_label: 'Likely authentic',
            confidence_score: 0.9,
            confidence_level: 'High',
            plain_language_summary: 'Test summary for the printable report.',
          },
          media: { filename: 'example.png', mime_type: 'image/png', sha256: 'abc123' },
          metadata: {},
          methodology: { version: 'V2.4.1-STABLE' },
          signals: [],
        },
      },
    }),
  }
})

function renderPrintPage() {
  return render(
    <MemoryRouter initialEntries={['/app/reports/scan_001/print']}>
      <ToastProvider>
        <Routes>
          <Route
            path="/app/reports/:scanId/print"
            element={<AppReportPrintPage />}
          />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('AppReportPrintPage brand stamp', () => {
  it('mounts the shared Verified with Provance seal on the ink brand band', async () => {
    renderPrintPage()

    // The circular brand stamp — the same component the marketing document
    // (/sample-report) and the pdfkit export render — not the old forensic seal.
    expect(
      await screen.findByRole('img', { name: 'Verified with Provance' }),
    ).toBeInTheDocument()

    // The ink band mirrors the pdfkit cover: PROVANCE wordmark + label.
    expect(screen.getAllByText('Provance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Verification report').length).toBeGreaterThan(0)

    // The report still renders below the band.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Provance report scan_001' }),
    ).toBeInTheDocument()
    expect(vi.mocked(getReport)).toHaveBeenCalledWith('scan_001')
  })
})
