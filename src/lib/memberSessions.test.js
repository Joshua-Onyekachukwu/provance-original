import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mockGetMemberSessions,
  mockRevokeMemberSession,
  mockRevokeMemberSessions,
} from './mockApi.js'
import { mockMemberSessionsByUserId, mockOrgWorkspace } from './mockData.js'

/**
 * Mock member-sessions parity — the org-admin revocation surface must mirror
 * GET/DELETE /v1/organization/members/:memberId/sessions (:sessionId):
 * every session row carries the member's team (teamId), isCurrent is derived
 * from the signed-in actor (never static), the owner seat is protected, and
 * the actor's own current session cannot be revoked through this surface.
 */
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

function stubWindow({ email } = {}) {
  vi.stubGlobal('window', {
    location: { search: '?noisy=0' }, // silence random error injection
    localStorage: {
      getItem: (key) =>
        key === AUTH_STORAGE_KEY && email ? JSON.stringify({ user: { email } }) : null,
    },
  })
}

function snapshotStores() {
  return {
    members: mockOrgWorkspace.members.map((m) => ({ ...m })),
    sessions: Object.fromEntries(
      Object.entries(mockMemberSessionsByUserId).map(([userId, rows]) => [
        userId,
        rows.map((row) => ({ ...row })),
      ]),
    ),
  }
}

function restoreStores(snapshot) {
  mockOrgWorkspace.members = snapshot.members
  for (const [userId, rows] of Object.entries(snapshot.sessions)) {
    mockMemberSessionsByUserId[userId] = rows
  }
}

describe('mock member sessions (org-admin revocation)', () => {
  const snapshot = snapshotStores()

  afterEach(() => {
    restoreStores(snapshot)
    vi.unstubAllGlobals()
  })

  it('lists a member\'s sessions tagged with their team (no actor → owner fallback)', async () => {
    stubWindow() // no stored session → actor falls back to mockUsers[0] (usr_001)

    const result = await mockGetMemberSessions('usr_012')

    expect(result.memberId).toBe('usr_012')
    expect(result.teamId).toBe('team_growth')
    expect(result.sessions).toHaveLength(3)
    expect(result.sessions[0]).toMatchObject({
      id: 'sess_301',
      teamId: 'team_growth',
      isCurrent: false, // memberId !== actorId → nothing is current
    })
  })

  it('marks the signed-in actor\'s own first session as current', async () => {
    stubWindow({ email: 'amina.sow@provance.io' }) // usr_002

    const result = await mockGetMemberSessions('usr_002')

    expect(result.sessions[0]).toMatchObject({ id: 'sess_101', isCurrent: true })
    expect(result.sessions[1]).toMatchObject({ id: 'sess_102', isCurrent: false })
  })

  it('tags sessions on recently-seen devices as New device (trust signal parity)', async () => {
    stubWindow()

    // Every tracked session of usr_012 sits inside the 7-day window, so all
    // three rows badge — mirroring SecurityService.listSessions.
    const result = await mockGetMemberSessions('usr_012')
    expect(result.sessions.every((session) => session.isNewDevice)).toBe(true)
    expect(result.sessions.map((session) => session.isNewDevice)).toEqual([
      true,
      true,
      true,
    ])

    // The Security page's own ledger (usr_001) demonstrates the known state:
    // Edge on Windows was first seen 9 days ago → NOT new.
    const { mockGetSecuritySettings } = await import('./mockApi.js')
    const settings = await mockGetSecuritySettings()
    const byId = Object.fromEntries(
      settings.activeSessions.map((session) => [session.id, session]),
    )
    expect(byId.sess_004.isNewDevice).toBe(false) // Edge on Windows, 9d ago
    expect(byId.sess_001.isNewDevice).toBe(true) // Chrome on Windows, 1h ago
  })

  it('revokes a single member session and persists the removal', async () => {
    stubWindow()

    const result = await mockRevokeMemberSession('usr_012', 'sess_301')

    expect(result).toEqual({ ok: true, memberId: 'usr_012', sessionId: 'sess_301' })
    expect(mockMemberSessionsByUserId.usr_012.map((s) => s.id)).toEqual(['sess_302', 'sess_303'])
  })

  it('rejects the owner seat (both single and revoke-all)', async () => {
    stubWindow()

    await expect(mockRevokeMemberSession('usr_001', 'sess_001')).rejects.toThrow(
      'The owner cannot be modified.',
    )
    await expect(mockRevokeMemberSessions('usr_001')).rejects.toThrow(
      'The owner cannot be modified.',
    )
  })

  it('blocks an admin revoking their own current session', async () => {
    stubWindow({ email: 'amina.sow@provance.io' }) // usr_002's first session is current

    await expect(mockRevokeMemberSession('usr_002', 'sess_101')).rejects.toThrow(
      'You cannot revoke the current session.',
    )
  })

  it('revokes every non-current session and reports the count', async () => {
    stubWindow()

    const result = await mockRevokeMemberSessions('usr_012')

    expect(result).toEqual({ ok: true, memberId: 'usr_012', revoked: 3 })
    expect(mockMemberSessionsByUserId.usr_012).toHaveLength(0)
  })

  it('404s for an unknown member or session', async () => {
    stubWindow()

    await expect(mockGetMemberSessions('usr_missing')).rejects.toThrow('Member not found.')
    await expect(mockRevokeMemberSession('usr_012', 'sess_missing')).rejects.toThrow(
      'Session not found.',
    )
  })
})
