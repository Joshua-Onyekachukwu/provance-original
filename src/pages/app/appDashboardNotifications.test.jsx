// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'
import {
  getActivityLogs,
  getAnalytics,
  getBilling,
  getNotifications,
  getQueueSnapshot,
  getReports,
  getSystemHealth,
  listScans,
  markNotificationRead,
} from '../../lib/api.js'
import AppDashboardPage from './AppDashboardPage.jsx'

// Deterministic API: every dashboard call resolves immediately with stable
// shapes (completed-only scans so the 5s poll stays idle, zeroed counters)
// and the notifications feed carries the first 8 seed rows (all unread).
// The shared module-level mock store is never mutated, so counts can't drift
// between tests in this file.
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  const { mockNotifications, mockReports, mockScans } = await import('../../lib/mockData.js')
  return {
    ...actual,
    listScans: vi
      .fn()
      .mockResolvedValue({
        data: mockScans.filter(
          (s) => s.status !== 'queued' && s.status !== 'processing',
        ),
      }),
    getReports: vi.fn().mockResolvedValue({ data: mockReports }),
    getNotifications: vi
      .fn()
      .mockResolvedValue({ data: mockNotifications.slice(0, 8) }),
    getQueueSnapshot: vi
      .fn()
      .mockResolvedValue({ queued: 0, processing: 0, failed: 0, avg_processing_time_ms: null }),
    getSystemHealth: vi
      .fn()
      .mockResolvedValue({ api: true, database: true, storage: true, queue: true, worker: true, email: true }),
    getBilling: vi
      .fn()
      .mockResolvedValue({ profile: { usage: { unitsUsed: 0, unitsLimit: 0 } } }),
    getAnalytics: vi
      .fn()
      .mockResolvedValue({ scans_today: 0, scans_7d: 0, completion_rate: 0, suspicious_rate: 0 }),
    getActivityLogs: vi.fn().mockResolvedValue({ data: [] }),
    markNotificationRead: vi.fn().mockResolvedValue({ ok: true }),
  }
})

function ReportMarker() {
  const { scanId } = useParams()
  return <div>REPORT_MARKER:{scanId}</div>
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/app" element={<AppDashboardPage />} />
            <Route path="/app/reports/:scanId" element={<ReportMarker />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('dashboard notification feed deep links', () => {
  beforeEach(() => {
    // Suppress the mock API's random error injection (AuthProvider's own
    // calls go through the real mocks via the spread above).
    window.localStorage.setItem(NOISE_STORAGE_KEY, '0')
    vi.mocked(getNotifications).mockClear()
    vi.mocked(markNotificationRead).mockClear()
  })

  it('navigates to the linked report and marks it read on click (shared bell contract)', async () => {
    renderDashboard()

    // The feed lives on the Notifications tab (default tab is Activity).
    fireEvent.click(await screen.findByRole('tab', { name: /Notifications/ }))

    // notif_001 ("Scan completed successfully") carries a deep link to the
    // completed scan scan_007.
    fireEvent.click(
      await screen.findByRole('button', { name: /Scan completed successfully/ }),
    )

    // Navigated to the linked report route (route param is the scan id).
    expect(await screen.findByText('REPORT_MARKER:scan_007')).toBeInTheDocument()
    expect(vi.mocked(markNotificationRead)).toHaveBeenCalledWith('notif_001')
  })

  it('marks a link-less notification read without navigating, and the row leaves the preview', async () => {
    renderDashboard()

    fireEvent.click(await screen.findByRole('tab', { name: /Notifications/ }))

    // notif_002 ("Verification report ready") has no link — the fallback is
    // mark-read, staying on the dashboard (same as the bell's fallback).
    fireEvent.click(
      await screen.findByRole('button', { name: /Verification report ready/ }),
    )

    expect(screen.queryByText(/REPORT_MARKER/)).not.toBeInTheDocument()
    expect(vi.mocked(markNotificationRead)).toHaveBeenCalledWith('notif_002')

    // Optimistic read: the clicked row drops out of the unread preview
    // immediately (readIds filter), mirroring the bell's local state.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Verification report ready/ }),
      ).not.toBeInTheDocument(),
    )
  })
})
