import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * betterChangePasswordContract.test.js — the better-auth leg of the
 * change-password contract. All three auth backends must behave identically
 * on password change (changePasswordContract.test.js pins the mock):
 *
 *   1. Format-validate before touching the backend (same messages as the
 *      mock), so a short or identical password never reaches the server.
 *   2. Revoke EVERY OTHER session while the current device stays signed in —
 *      better-auth's native `revokeOtherSessions: true` (deletes all
 *      sessions, mints a fresh one for the current device).
 *   3. Resolve `{ ok: true }`; client errors propagate as thrown Errors
 *      (the api.js contract the Security page's catch block reads).
 *
 * The authClient is stubbed at the module boundary so the wrapper's
 * contract is pinned without a live better-auth server.
 */

// vi.hoisted: the mock factory runs at import time (before this file's const
// initializers), so the shared spy must be created in the hoisted scope.
const { changePasswordMock } = vi.hoisted(() => ({ changePasswordMock: vi.fn() }))

vi.mock('better-auth/client', () => ({
  createAuthClient: () => ({
    changePassword: (...args) => changePasswordMock(...args),
  }),
}))

import { betterChangePassword } from './betterAuthClient.js'

const payload = { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' }

beforeEach(() => {
  changePasswordMock.mockReset()
})

describe('betterChangePassword — revoke-everything-else parity (mock = GoTrue = better-auth)', () => {
  it('calls changePassword with revokeOtherSessions: true and resolves { ok: true }', async () => {
    changePasswordMock.mockResolvedValue({
      data: { token: 'rotated-session-token', user: { id: 'usr_ba_001' } },
      error: null,
    })

    const result = await betterChangePassword(payload)

    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
      revokeOtherSessions: true,
    })
    // The rotated token is better-auth's internal cookie detail — the API
    // contract (mock + GoTrue) resolves plain { ok: true }.
    expect(result).toEqual({ ok: true })
  })

  it('rejects a too-short new password before touching the client (mock message parity)', async () => {
    await expect(
      betterChangePassword({ currentPassword: 'OldPass123!', newPassword: 'short' }),
    ).rejects.toThrow('New password must be at least 8 characters.')
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('rejects reusing the current password (mock message parity)', async () => {
    await expect(
      betterChangePassword({ currentPassword: 'SamePass123!', newPassword: 'SamePass123!' }),
    ).rejects.toThrow('New password must be different from the current password.')
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('propagates the client error as a thrown Error (api.js contract)', async () => {
    changePasswordMock.mockResolvedValue({
      data: null,
      error: { message: 'Invalid password', statusText: 'Bad Request' },
    })

    await expect(betterChangePassword(payload)).rejects.toThrow('Invalid password')
    expect(changePasswordMock).toHaveBeenCalledTimes(1)
  })
})
