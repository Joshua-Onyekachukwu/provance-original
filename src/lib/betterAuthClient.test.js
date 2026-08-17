import { describe, expect, it } from 'vitest'
import { buildViewer } from './betterAuthClient.js'

/**
 * buildViewer parity — the better-auth adapter must produce the exact
 * `buildAuthResponse`-shaped payload AuthContext's normalizeAuthState consumes:
 * { status: 'authenticated', user: {id, email}, profile, permissions,
 * session: {accessToken, refreshToken, tokenType, expiresAt} }.
 */
describe('buildViewer (better-auth → AuthContext contract)', () => {
  const user = {
    id: 'usr_ba_001',
    email: 'founder.admin@provance.local',
    name: 'Founder Admin',
    emailVerified: true,
    image: null,
    createdAt: new Date('2026-08-09T10:00:00Z'),
    updatedAt: new Date('2026-08-09T10:00:00Z'),
  }

  it('normalizes user + session into the viewer shape', () => {
    const session = {
      id: 'sess_ba_001',
      token: 'ba-token-123',
      expiresAt: new Date('2026-08-16T10:00:00Z'),
    }

    const viewer = buildViewer(user, session)

    expect(viewer.status).toBe('authenticated')
    expect(viewer.user).toEqual({ id: 'usr_ba_001', email: 'founder.admin@provance.local' })
    // accessToken is synthesized from the session token so normalizeSessionPayload works
    expect(viewer.session.accessToken).toBe('ba-token-123')
    expect(viewer.session.refreshToken).toBeNull()
    expect(viewer.session.tokenType).toBe('bearer')
    expect(viewer.session.expiresAt).toBe(new Date('2026-08-16T10:00:00Z').getTime())
    expect(viewer.profile.displayName).toBe('Founder Admin')
  })

  it('maps admin emails to admin permissions (mirrors backend ADMIN_EMAILS)', () => {
    const admin = buildViewer(user, null)
    expect(admin.permissions).toEqual({ individual: true, team: false, admin: true })

    const member = buildViewer(
      { ...user, email: 'someone@example.com', name: null },
      null,
    )
    expect(member.permissions.admin).toBe(false)
    // displayName falls back to the email local-part when the user has no name
    expect(member.profile.displayName).toBe('Someone')
  })

  it('synthesizes a short-lived access token when the session has no token', () => {
    const viewer = buildViewer(user, { id: 'sess_ba_002' })
    expect(viewer.session.accessToken).toBe('ba_sess_ba_002')
    expect(viewer.session.expiresAt).toBeGreaterThan(Date.now())
  })
})
