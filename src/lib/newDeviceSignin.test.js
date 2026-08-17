import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRecordNewDeviceSignIn } from './mockApi.js'
import {
  mockAuditEvents,
  mockNotifications,
  mockSecuritySettings,
} from './mockData.js'

/**
 * Mock new-device sign-in parity — the mock half of the backend's
 * SecurityService new-device detection:
 *
 * - A first-time (user, device, ip) combo writes a high-severity
 *   `new_device_signin` audit event unconditionally.
 * - When `notifyOnNewDevice` is enabled it also prepends a security
 *   notification (bell) and emits a `[mock-email]` console line.
 * - The same combo never re-triggers (refresh / repeated sign-in).
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
    audit: mockAuditEvents.map((e) => ({ ...e })),
    notifications: mockNotifications.map((n) => ({ ...n })),
    notifyOnNewDevice: mockSecuritySettings.signInControls.notifyOnNewDevice,
  }
}

function restoreStores(snapshot) {
  mockAuditEvents.splice(0, mockAuditEvents.length, ...snapshot.audit)
  mockNotifications.splice(0, mockNotifications.length, ...snapshot.notifications)
  mockSecuritySettings.signInControls.notifyOnNewDevice = snapshot.notifyOnNewDevice
}

describe('mock new-device sign-in detection', () => {
  const snapshot = snapshotStores()

  afterEach(() => {
    restoreStores(snapshot)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('writes a high-severity new_device_signin audit event on a first-time combo', async () => {
    stubWindow({ email: 'founder.admin@provance.local' })
    const before = mockAuditEvents.length

    const result = await mockRecordNewDeviceSignIn({
      userId: 'usr_001',
      email: 'founder.admin@provance.local',
      meta: { device: 'Safari on macOS', ipAddress: '203.0.113.9', location: 'DE' },
    })

    expect(result.isNewDevice).toBe(true)
    expect(mockAuditEvents).toHaveLength(before + 1)
    const event = mockAuditEvents[0]
    expect(event.action).toBe('new_device_signin')
    expect(event.severity).toBe('high')
    expect(event.details).toMatchObject({
      device: 'Safari on macOS',
      ip_address: '203.0.113.9',
      location: 'DE',
    })
  })

  it('prepends a security notification and mock email when notifyOnNewDevice is on', async () => {
    stubWindow()
    mockSecuritySettings.signInControls.notifyOnNewDevice = true
    const emailSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const notificationsBefore = mockNotifications.length

    const result = await mockRecordNewDeviceSignIn({
      userId: 'usr_002',
      email: 'member@provance.local',
      meta: { device: 'Firefox on Linux', ipAddress: '198.51.100.7', location: 'US' },
    })

    expect(result.isNewDevice).toBe(true)
    expect(mockNotifications).toHaveLength(notificationsBefore + 1)
    expect(mockNotifications[0]).toMatchObject({
      category: 'security',
      title: 'New device sign-in detected',
      read: false,
      link: '/app/security',
    })
    expect(mockNotifications[0].description).toContain('Firefox on Linux')
    expect(mockNotifications[0].description).toContain('198.51.100.7')
    // Mock email contract mirrors the backend's [mock-email] log line.
    expect(emailSpy).toHaveBeenCalledWith(expect.stringContaining('[mock-email]'))
    expect(emailSpy).toHaveBeenCalledWith(
      expect.stringContaining('New device sign-in detected'),
    )
  })

  it('skips the notification when notifyOnNewDevice is off (audit still written)', async () => {
    stubWindow()
    mockSecuritySettings.signInControls.notifyOnNewDevice = false
    const emailSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const auditBefore = mockAuditEvents.length
    const notificationsBefore = mockNotifications.length

    const result = await mockRecordNewDeviceSignIn({
      userId: 'usr_003',
      email: 'ops@provance.local',
      meta: { device: 'Chrome on Windows', ipAddress: '192.0.2.55', location: null },
    })

    expect(result.isNewDevice).toBe(true)
    expect(mockAuditEvents).toHaveLength(auditBefore + 1)
    expect(mockNotifications).toHaveLength(notificationsBefore)
    expect(emailSpy).not.toHaveBeenCalled()
  })

  it('never re-triggers for the same combo (refresh / repeated sign-in)', async () => {
    stubWindow()
    const combo = {
      userId: 'usr_004',
      email: 'legal@provance.local',
      meta: { device: 'Edge on Windows', ipAddress: '203.0.113.77', location: 'GB' },
    }

    const first = await mockRecordNewDeviceSignIn(combo)
    const auditAfterFirst = mockAuditEvents.length
    const notificationsAfterFirst = mockNotifications.length

    const second = await mockRecordNewDeviceSignIn(combo)

    expect(first.isNewDevice).toBe(true)
    expect(second.isNewDevice).toBe(false)
    expect(mockAuditEvents).toHaveLength(auditAfterFirst)
    expect(mockNotifications).toHaveLength(notificationsAfterFirst)
  })

  it('defaults the combo when no meta is provided', async () => {
    stubWindow()
    const result = await mockRecordNewDeviceSignIn({
      userId: 'usr_005',
      email: 'default@provance.local',
    })

    expect(result.isNewDevice).toBe(true)
    expect(mockAuditEvents[0].details).toMatchObject({
      device: 'Chrome on Windows',
      ip_address: '127.0.0.1',
    })
  })
})
