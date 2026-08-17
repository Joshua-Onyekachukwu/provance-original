import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mockChangePassword } from './mockApi.js'
import { mockSecuritySettings, mockAuditEvents } from './mockData.js'

/**
 * mockChangePassword contract — the mock must mirror the real backend's
 * SecurityService.changePassword: verify the current password, then revoke
 * EVERY OTHER tracked session (current stays signed in) with one
 * session.revoked admin-trail row per revoked device and a password_changed
 * feed event written last (newest-first on top). The mock verifies the
 * current password only at format level (mock auth accepts any 8+ char
 * password for a known account), so the revoke/audit behavior is what this
 * suite pins.
 */
const seededSessions = () => mockSecuritySettings.activeSessions
const currentSession = () => seededSessions().find((s) => s.isCurrent)

let originalSessions
let originalAuditCount

beforeEach(() => {
  vi.stubGlobal('window', {
    location: { search: '?noisy=0' }, // silence random error injection
    localStorage: { getItem: () => null },
  })
  originalSessions = [...seededSessions()]
  originalAuditCount = mockAuditEvents.length
})

afterEach(() => {
  mockSecuritySettings.activeSessions = originalSessions
  // New rows are unshifted to the FRONT — remove exactly what was added so
  // the seeded feed survives intact across tests.
  const added = mockAuditEvents.length - originalAuditCount
  if (added > 0) mockAuditEvents.splice(0, added)
  vi.unstubAllGlobals()
})

describe('mockChangePassword revoke-everything-else', () => {
  it('revokes every other session and keeps only the current one', async () => {
    expect(seededSessions().filter((s) => !s.isCurrent).length).toBeGreaterThan(0)

    await mockChangePassword({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' })

    expect(seededSessions()).toHaveLength(1)
    expect(currentSession().id).toBe('sess_001')
    expect(currentSession().isCurrent).toBe(true)

    // Persisted on the module store like single revokes — a second call is a
    // no-op on sessions (nothing left to revoke).
    await mockChangePassword({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' })
    expect(seededSessions()).toHaveLength(1)
  })

  it('writes a session.revoked row per revoked session and password_changed on top', async () => {
    const revokedBefore = seededSessions().filter((s) => !s.isCurrent).length

    await mockChangePassword({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' })

    // Feed is newest-first (unshift), so the rows this call added are at the
    // FRONT — take the first `added` rows, not the tail.
    const added = mockAuditEvents.length - originalAuditCount
    const newRows = mockAuditEvents.slice(0, added)
    expect(newRows).toHaveLength(revokedBefore + 1)
    // Newest-first: the change event (written last) lands at the top, the
    // per-session revokes beneath it — matching the real write order.
    expect(newRows.map((r) => r.action)).toEqual([
      'password_changed',
      ...Array(revokedBefore).fill('session.revoked'),
    ])

    const changeRow = newRows[0]
    expect(changeRow.severity).toBe('low')
    expect(changeRow.resource_type).toBe('auth_user')
    expect(changeRow.actor_email).toBeTruthy()
    expect(changeRow.details).toEqual({})

    const revokedIds = newRows.slice(1).map((r) => r.details.session_id).sort()
    expect(revokedIds).toEqual(['sess_002', 'sess_003', 'sess_004'])
    expect(newRows.every((r) => r.actor_email)).toBe(true)
  })

  it('keeps the current session when it is the only one and writes only the change event', async () => {
    mockSecuritySettings.activeSessions = [currentSession()]

    await mockChangePassword({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' })

    expect(seededSessions()).toHaveLength(1)
    const added = mockAuditEvents.length - originalAuditCount
    const newRows = mockAuditEvents.slice(0, added)
    expect(newRows.map((r) => r.action)).toEqual(['password_changed'])
  })

  it('still rejects short and identical passwords before any revocation', async () => {
    await expect(
      mockChangePassword({ currentPassword: 'OldPass123!', newPassword: 'short' }),
    ).rejects.toThrow('at least 8 characters')
    await expect(
      mockChangePassword({ currentPassword: 'OldPass123!', newPassword: 'OldPass123!' }),
    ).rejects.toThrow('different from the current')

    // Nothing revoked, nothing written on a rejected change.
    expect(seededSessions()).toHaveLength(originalSessions.length)
    expect(mockAuditEvents.length).toBe(originalAuditCount)
  })
})
