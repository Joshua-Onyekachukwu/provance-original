// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { ToastProvider } from '../../components/ui'
import { NOISE_STORAGE_KEY } from '../../lib/mockNoise.js'
import {
  getNotifications,
  getUnreadNotificationCount,
} from '../../lib/api.js'
import AppShellLayout from './AppShellLayout.jsx'

// Deterministic notifications API: resolve the fetch immediately with the
// first 8 seed rows (all unread → exactly 8 unread in every test) and never
// mutate the shared module-level mock store, so counts can't drift between
// tests in the same file.
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  const { mockNotifications } = await import('../../lib/mockData.js')
  return {
    ...actual,
    getNotifications: vi
      .fn()
      .mockResolvedValue({ data: mockNotifications.slice(0, 8) }),
    getUnreadNotificationCount: vi.fn().mockResolvedValue({ unread: 8 }),
    markNotificationRead: vi.fn().mockResolvedValue({ ok: true }),
    markAllNotificationsRead: vi.fn().mockResolvedValue({ ok: true }),
  }
})

function ReportMarker() {
  const { scanId } = useParams()
  return <div>REPORT_MARKER:{scanId}</div>
}

function renderShell(initialPath = '/app') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/app" element={<AppShellLayout />}>
              <Route index element={<div>DASHBOARD_MARKER</div>} />
              <Route path="reports/:scanId" element={<ReportMarker />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

const UNREAD_LABEL = /Notifications, (\d+) unread/

function unreadCount(button) {
  const match = button.getAttribute('aria-label')?.match(UNREAD_LABEL)
  return match ? Number(match[1]) : null
}

describe('notification bell deep links', () => {
  beforeEach(() => {
    // Suppress the mock API's random error injection for AuthProvider's own
    // calls (the notifications surface itself is mocked above).
    window.localStorage.setItem(NOISE_STORAGE_KEY, '0')
    // The mocked API fns are module-level — reset call history so per-test
    // call-count assertions don't accumulate across tests (implementations
    // survive mockClear).
    vi.mocked(getNotifications).mockClear()
    vi.mocked(getUnreadNotificationCount).mockClear()
  })

  it('navigates to the linked report, marks it read, and closes the popover on click', async () => {
    renderShell('/app')

    // Wait for the fetch to settle (8 seed rows, all unread) before clicking.
    const bell = await waitFor(() => {
      const button = screen.getByRole('button', { name: UNREAD_LABEL })
      expect(unreadCount(button)).toBe(8)
      return button
    })
    fireEvent.click(bell)

    // notif_001 ("Scan completed successfully") carries a deep link to the
    // completed scan scan_007.
    fireEvent.click(
      screen.getByRole('button', { name: /Scan completed successfully/ }),
    )

    // Navigated to the linked report route (route param is the scan id).
    expect(await screen.findByText('REPORT_MARKER:scan_007')).toBeInTheDocument()

    // Marked read: the bell (still mounted — reports is a nested route) shows
    // exactly one fewer unread.
    const afterBell = screen.getByRole('button', { name: UNREAD_LABEL })
    expect(unreadCount(afterBell)).toBe(7)

    // Popover closed: the feed rows unmount after the short exit animation.
    await waitFor(() =>
      expect(screen.queryAllByText(/tap to view details/)).toHaveLength(0),
    )
  })

  it('drives the badge from the unread-count endpoint without refetching the feed', async () => {
    // The count endpoint reports 3 unread while the feed still carries 8
    // unread seed rows — the badge must follow the count endpoint.
    vi.mocked(getUnreadNotificationCount).mockResolvedValueOnce({ unread: 3 })
    renderShell('/app')

    const bell = await waitFor(() => {
      const button = screen.getByRole('button', { name: UNREAD_LABEL })
      expect(unreadCount(button)).toBe(3)
      return button
    })

    // The feed was fetched exactly once on mount; the badge poll never
    // refetched it.
    expect(vi.mocked(getNotifications)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(getUnreadNotificationCount)).toHaveBeenCalled()
    expect(unreadCount(bell)).toBe(3)
  })

  it('marks a link-less notification read and closes the popover without navigating', async () => {
    renderShell('/app')

    const bell = await waitFor(() => {
      const button = screen.getByRole('button', { name: UNREAD_LABEL })
      expect(unreadCount(button)).toBe(8)
      return button
    })
    fireEvent.click(bell)

    // notif_002 ("Verification report ready") has no link — the fallback is
    // mark-read + close, staying on the current page.
    fireEvent.click(
      screen.getByRole('button', { name: /Verification report ready/ }),
    )

    // Still on the dashboard (no navigation happened).
    expect(screen.getByText('DASHBOARD_MARKER')).toBeInTheDocument()
    expect(screen.queryByText(/REPORT_MARKER/)).not.toBeInTheDocument()

    // Marked read + popover closed (feed rows unmount after the exit animation).
    const afterBell = screen.getByRole('button', { name: UNREAD_LABEL })
    expect(unreadCount(afterBell)).toBe(7)
    await waitFor(() =>
      expect(screen.queryAllByText(/tap to view details/)).toHaveLength(0),
    )
  })
})
