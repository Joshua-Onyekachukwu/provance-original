// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * securityMutationsPersistence.test.js — the mock security mutations (revoked
 * sessions, password-change audit rows) persist to localStorage as a delta so
 * a full page reload restores the revoke-everything-else demo state — the same
 * survival guarantee the auth session and the scan store get.
 *
 * Reloads are simulated with vi.resetModules() + a fresh dynamic import: the
 * new module instance replays the persisted delta over the freshly-seeded
 * (time-relative) mock, exactly like a browser page reload.
 */

const SECURITY_MUTATIONS_KEY = 'provance.mock.securityMutations.v1'
const NOISE_STORAGE_KEY = 'provance.mock.noisy.v1'

async function freshMock() {
  vi.resetModules()
  return {
    data: await import('./mockData.js'),
    api: await import('./mockApi.js'),
  }
}

let mock

beforeEach(async () => {
  window.localStorage.clear()
  // Deterministic — silence the mock's random error injection for these
  // mutation walks (the same sticky flag ?noisy=0 sets).
  window.localStorage.setItem(NOISE_STORAGE_KEY, '0')
  mock = await freshMock()
})

describe('mock security mutation persistence', () => {
  it('records a revocation and its audit row into localStorage', async () => {
    await mock.api.mockRevokeSession('sess_002')

    const stored = JSON.parse(window.localStorage.getItem(SECURITY_MUTATIONS_KEY))
    expect(stored.revokedSessionIds).toEqual(['sess_002'])
    expect(stored.auditEvents).toHaveLength(1)
    expect(stored.auditEvents[0]).toMatchObject({
      action: 'session.revoked',
      resource_id: 'sess_002',
    })
  })

  it('restores the revoked-session state on a fresh load (reload simulation)', async () => {
    await mock.api.mockRevokeSession('sess_002')

    const reloaded = await freshMock()

    const ids = reloaded.data.mockSecuritySettings.activeSessions.map((s) => s.id)
    expect(ids).not.toContain('sess_002')
    expect(ids).toHaveLength(3)
    // The owner's org-drawer ledger shares the Security page's rows, so it
    // reflects the same revocation after reload.
    const ownerLedger = reloaded.data.mockMemberSessionsByUserId.usr_001.map((s) => s.id)
    expect(ownerLedger).not.toContain('sess_002')
    // The persisted audit row re-appears at the top of the feed.
    expect(reloaded.data.mockAuditEvents[0]).toMatchObject({
      action: 'session.revoked',
      resource_id: 'sess_002',
    })
  })

  it('keeps the revoke-everything-else result across a reload', async () => {
    await mock.api.mockChangePassword({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
    })

    const reloaded = await freshMock()

    const remaining = reloaded.data.mockSecuritySettings.activeSessions
    expect(remaining).toHaveLength(1)
    expect(remaining[0].isCurrent).toBe(true)

    const actions = reloaded.data.mockAuditEvents.map((e) => e.action)
    expect(actions[0]).toBe('password_changed')
    expect(actions.filter((a) => a === 'session.revoked')).toHaveLength(3)
  })

  it('records member-session revocations and replays them into the org drawer', async () => {
    await mock.api.mockRevokeMemberSession('usr_002', 'sess_101')

    const stored = JSON.parse(window.localStorage.getItem(SECURITY_MUTATIONS_KEY))
    expect(stored.revokedSessionIds).toContain('sess_101')
    expect(stored.auditEvents[0].action).toBe('member_session_revoked')

    const reloaded = await freshMock()
    expect(
      reloaded.data.mockMemberSessionsByUserId.usr_002.map((s) => s.id),
    ).not.toContain('sess_101')
  })

  it('falls back to the pristine seed on corrupt storage', async () => {
    window.localStorage.setItem(SECURITY_MUTATIONS_KEY, 'not json {')

    const reloaded = await freshMock()
    expect(reloaded.data.mockSecuritySettings.activeSessions).toHaveLength(4)
  })
})
