/**
 * mockApi.js — Mock API layer for Provance frontend-first MVP.
 *
 * Every function mirrors the signature of the real API functions. They return
 * promises resolved after a realistic delay so loading and error states can be
 * tested end-to-end without a backend.
 *
 * 5–10% of calls randomly error out to exercise error-state rendering.
 */

import {
  mockUsers,
  mockOrganizations,
  mockWaitlist,
  mockScans,
  mockReports,
  mockAuditEvents,
  mockFeatureFlags,
  mockNotifications,
  mockSystemHealth,
  mockQueueSnapshot,
  mockAnalytics,
  mockSupportTickets,
  buildAdminDashboard,
} from './mockData.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(min = 200, max = 600) {
  const ms = Math.floor(Math.random() * (max - min) + min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function maybeError(rate = 0.08) {
  if (Math.random() < rate) {
    throw new Error('Mock API: simulated transient error. Please try again.')
  }
}

function findById(collection, id) {
  return collection.find((item) => item.id === id) || null
}

function paginate(items, { page = 1, pageSize = 20 } = {}) {
  const start = (page - 1) * pageSize
  return {
    data: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  }
}

// ---------------------------------------------------------------------------
// Auth / Viewer
// ---------------------------------------------------------------------------

export async function mockGetCurrentViewer() {
  await delay()
  const user = mockUsers[0]
  return {
    status: 'authenticated',
    user: { id: user.id, email: user.email },
    profile: {
      displayName: user.displayName,
      organization: 'Provance Internal',
      roleTitle: 'Platform Administrator',
      defaultWorkspace: 'individual',
      emailNotifications: true,
      accountRole: user.role,
      teamAccess: user.team_enabled,
    },
    permissions: { individual: true, team: true, admin: true },
    session: {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      tokenType: 'bearer',
      expiresAt: Date.now() + 3600000,
    },
  }
}

export async function mockGetUserProfile() {
  await delay()
  return mockUsers[0]
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function mockGetAdminDashboard() {
  await delay()
  maybeError()
  return buildAdminDashboard()
}

export async function mockGetAdminUsers({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockUsers, { page, pageSize })
}

export async function mockGetOrganizations() {
  await delay()
  maybeError()
  return mockOrganizations
}

export async function mockGetFeatureFlags() {
  await delay()
  maybeError()
  return mockFeatureFlags
}

export async function mockUpdateFeatureFlag(key, enabled) {
  await delay(300, 500)
  maybeError()
  return { key, enabled, updated_at: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export async function mockReviewWaitlistApplication(id, { status, notes }) {
  await delay(400, 600)
  maybeError()
  return {
    id,
    status,
    notes,
    reviewed_at: new Date().toISOString(),
  }
}

export async function mockCreateAccessInvite(id, { expiresInDays = 7 } = {}) {
  await delay(500, 800)
  maybeError()
  const inviteToken = 'mock_invite_' + Math.random().toString(36).slice(2, 12)
  return {
    invite: {
      inviteToken,
      expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      applicationId: id,
    },
  }
}

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------

export async function mockListScans({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockScans, { page, pageSize })
}

export async function mockGetScan(id) {
  await delay()
  maybeError()
  const scan = findById(mockScans, id)
  if (!scan) throw new Error('Scan not found.')
  return scan
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function mockGetReports({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockReports, { page, pageSize })
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function mockGetAnalytics() {
  await delay()
  maybeError()
  return mockAnalytics
}

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

export async function mockGetSystemHealth() {
  await delay(100, 300)
  return mockSystemHealth
}

// ---------------------------------------------------------------------------
// Queue Snapshot
// ---------------------------------------------------------------------------

export async function mockGetQueueSnapshot() {
  await delay(100, 300)
  return mockQueueSnapshot
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function mockGetNotifications({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockNotifications, { page, pageSize })
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export async function mockGetAuditLogs({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockAuditEvents, { page, pageSize })
}

// ---------------------------------------------------------------------------
// Support Tickets
// ---------------------------------------------------------------------------

export async function mockGetSupportTickets({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockSupportTickets, { page, pageSize })
}

// ---------------------------------------------------------------------------
// Activity Logs (alias for audit logs with user-facing shape)
// ---------------------------------------------------------------------------

export async function mockGetActivityLogs({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockAuditEvents, { page, pageSize })
}
