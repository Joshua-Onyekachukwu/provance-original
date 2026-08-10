import { describe, expect, it, afterEach, vi } from 'vitest'
import { mockInviteMember } from './mockApi.js'
import { mockOrgWorkspace } from './mockData.js'

/**
 * mockInviteMember token parity — the mock must mirror the hardened real
 * path (migration 0015): the raw token is issued once in the response so the
 * share/email link can be built from it; the backend persists only its hash.
 */
describe('mockInviteMember token parity', () => {
  const originalSeats = mockOrgWorkspace.profile?.seats

  afterEach(() => {
    // Restore the seeded seat count so other suites see the pristine mock.
    if (originalSeats !== undefined) mockOrgWorkspace.profile.seats = originalSeats
    vi.unstubAllGlobals()
  })

  it('issues a one-time token + invite link alongside the invite', async () => {
    // Silence the mock's random error injection (the node env has no real
    // window, so stub one with the ?noisy=0 URL flag) — the invite creation
    // must be deterministic here.
    vi.stubGlobal('window', { location: { search: '?noisy=0' } })

    // The seeded workspace runs at full capacity (4/4) — free a seat for the
    // test, exactly like the real seat rule allows after a member leaves.
    mockOrgWorkspace.profile.seats = 99

    const result = await mockInviteMember({ email: 'parity@test.dev', role: 'member' })

    expect(result.invite.email).toBe('parity@test.dev')
    expect(result.token).toMatch(/^tok_/)
    expect(result.inviteLink).toBe(`/accept-invite?token=${result.token}`)
  })
})
