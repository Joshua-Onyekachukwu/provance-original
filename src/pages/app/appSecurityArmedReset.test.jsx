// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { ToastProvider } from '../../components/ui'
import { getSecuritySettings, revokeSession } from '../../lib/api.js'
import AppSecurityPage from './AppSecurityPage.jsx'

// Deterministic API: settings resolve immediately with a fixed session
// ledger (one current + two revocable rows) and no random mock noise.
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSecuritySettings: vi.fn().mockResolvedValue({
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
      },
      activeSessions: [
        {
          id: 'sess_001',
          device: 'Chrome on Windows',
          location: 'Lagos, NG',
          ipAddress: '105.112.28.41',
          lastActiveAt: new Date(Date.now() - 60_000).toISOString(),
          isCurrent: true,
        },
        {
          id: 'sess_002',
          device: 'Safari on iPhone',
          location: 'Lagos, NG',
          ipAddress: '105.112.30.12',
          lastActiveAt: new Date(Date.now() - 3_600_000).toISOString(),
          isCurrent: false,
        },
        {
          id: 'sess_003',
          device: 'Firefox on macOS',
          location: 'Abuja, NG',
          ipAddress: '102.89.44.7',
          lastActiveAt: new Date(Date.now() - 86_400_000).toISOString(),
          isCurrent: false,
        },
      ],
      signInControls: {
        twoFactorAuth: { enabled: false, method: null, updatedAt: null },
        emailVerification: { verified: true, verifiedAt: null },
        sessionTimeoutMinutes: 60,
        notifyOnNewDevice: true,
        notifyOnPasswordChange: true,
      },
    }),
    revokeSession: vi.fn().mockResolvedValue({ ok: true }),
  }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/security']}>
      <AuthProvider>
        <ToastProvider>
          <AppSecurityPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

// Row 0 (sess_001) is the current device — its Revoke button is disabled but
// still present, so the revocable rows start at index 1 (sess_002) and 2
// (sess_003).
const revokeButtons = () => screen.getAllByRole('button', { name: 'Revoke' })
const confirmButton = () => screen.queryByRole('button', { name: 'Confirm revoke?' })
const cancelButton = () => screen.queryByRole('button', { name: 'Cancel' })

// jsdom does not implement the PointerEvent constructor, so fireEvent.
// pointerDown throws — dispatch a plain bubbling pointerdown instead; the
// page's handler only reads event.target.closest, which works either way.
const pointerDownAt = (element) =>
  element.dispatchEvent(new Event('pointerdown', { bubbles: true }))

async function armRow(user, index) {
  await user.click(revokeButtons()[index])
  await waitFor(() => expect(confirmButton()).toBeTruthy())
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('armed revoke reset', () => {
  it('Escape disarms a half-armed revoke', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(revokeButtons().length).toBe(3))
    await armRow(user, 1)
    expect(confirmButton()).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(confirmButton()).toBeNull())
    expect(cancelButton()).toBeNull()
  })

  it('a pointer-down outside the armed row disarms it', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(revokeButtons().length).toBe(3))
    await armRow(user, 1)
    expect(confirmButton()).toBeTruthy()

    pointerDownAt(document.body)

    await waitFor(() => expect(confirmButton()).toBeNull())
    expect(cancelButton()).toBeNull()
  })

  it('a pointer-down inside the armed row keeps it armed', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(revokeButtons().length).toBe(3))
    await armRow(user, 1)
    expect(confirmButton()).toBeTruthy()

    pointerDownAt(confirmButton())

    expect(confirmButton()).toBeTruthy()
    expect(cancelButton()).toBeTruthy()
  })

  it("pointer-down on another row's Revoke disarms this row, and the click re-arms the other", async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(revokeButtons().length).toBe(3))
    await armRow(user, 1)
    expect(confirmButton()).toBeTruthy()

    // Pointer-down lands on sess_003's Revoke — outside sess_002's armed row.
    // Arming sess_002 relabels its button to "Confirm revoke?", so the
    // "Revoke" list is now [sess_001, sess_003] → sess_003 sits at index 1.
    pointerDownAt(revokeButtons()[1])
    await waitFor(() => expect(confirmButton()).toBeNull())

    // Wait for the disarm re-render to fully land — all three rows show
    // "Revoke" again — before clicking, so the click can never race a
    // pending state update. sess_003 is the last row (index 2).
    await waitFor(() => expect(revokeButtons().length).toBe(3))
    await user.click(revokeButtons()[2])
    await waitFor(() => expect(confirmButton()).toBeTruthy())
  })

  it('still revokes on the armed confirm click (no behavior regression)', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(revokeButtons().length).toBe(3))
    await armRow(user, 1)

    await user.click(confirmButton())

    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith('sess_002'))
    await waitFor(() => expect(screen.queryByText('Safari on iPhone')).toBeNull())
  })
})
