// ---------------------------------------------------------------------------
// Mock mode — set to true while building the frontend-first MVP.
// All API functions delegate to mock implementations with realistic data,
// delays, and occasional error injection for state testing.
// ---------------------------------------------------------------------------
export const USE_MOCK = true

import {
  mockGetCurrentViewer,
  mockSignInWithPassword,
  mockRequestPasswordReset,
  mockConfirmPasswordReset,
  mockAcceptInvite,
  mockGetAdminDashboard,
  mockGetAdminUsers,
  mockGetOrganizations,
  mockGetFeatureFlags,
  mockUpdateFeatureFlag,
  mockListScans,
  mockGetScan,
  mockInitiateScan,
  mockSubmitScan,
  mockGetReports,
  mockGetAnalytics,
  mockGetSystemHealth,
  mockGetMonitoring,
  mockGetQueueSnapshot,
  mockGetNotifications,
  mockGetAuditLogs,
  mockGetSupportTickets,
  mockGetActivityLogs,
  mockGetAdminAuditLogs,
  mockGetAdminJobs,
  mockGetAdminReports,
  mockGetAdminRoles,
  mockGetAdminSettings,
  mockGetBilling,
  mockGetInvoices,
  mockGetSecuritySettings,
  mockChangePassword,
  mockRevokeSession,
  mockUpdateSecuritySetting,
  mockGetApiKeys,
  mockCreateApiKey,
  mockRevokeApiKey,
  mockRegenerateApiKey,
  mockGetHelpContent,
  mockGetOrganization,
  mockInviteMember,
  mockUpdateMemberRole,
  mockUpdateMemberTeam,
  mockRemoveMember,
  mockCancelInvite,
  mockReviewWaitlistApplication,
  mockCreateAccessInvite,
  mockGetUserProfile,
  mockUpdateUserRole,
  mockToggleTeamAccess,
} from './mockApi.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/v1'
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage write failures and let the current request continue.
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}

async function refreshStoredSessionIfNeeded(force = false) {
  const storedSession = readStoredSession()
  const accessToken = storedSession?.session?.accessToken
  const refreshToken = storedSession?.session?.refreshToken
  const expiresAt = storedSession?.session?.expiresAt
  const refreshThresholdMs = 60 * 1000

  // With hardened cookies the server stops returning the refresh token in the
  // response body — it lives only in an httpOnly cookie. When there is a
  // stored session but no refresh token, still attempt the refresh so the
  // cookie can rotate the access token.
  const hasSessionSignal = Boolean(
    storedSession?.session || storedSession?.user || storedSession?.permissions,
  )

  if (!hasSessionSignal) {
    return accessToken || null
  }

  const canAttemptRefresh = Boolean(refreshToken) || !USE_MOCK

  if (!canAttemptRefresh) {
    return accessToken || null
  }

  if (
    !force &&
    !(refreshToken && !accessToken) &&
    typeof expiresAt === 'number' &&
    expiresAt - Date.now() > refreshThresholdMs
  ) {
    return accessToken || null
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(
      refreshToken ? { refreshToken } : {},
    ),
  })

  if (!response.ok) {
    clearStoredSession()
    return null
  }

  const body = await response.json()
  const nextSession = {
    ...storedSession,
    user: body.user || storedSession?.user || null,
    permissions: body.permissions || storedSession?.permissions || null,
    session: {
      accessToken: body?.session?.accessToken || accessToken,
      refreshToken: body?.session?.refreshToken || refreshToken,
      tokenType: body?.session?.tokenType || storedSession?.session?.tokenType || 'bearer',
      expiresAt:
        typeof body?.session?.expiresAt === 'number'
          ? body.session.expiresAt * 1000
          : storedSession?.session?.expiresAt || null,
    },
  }

  writeStoredSession(nextSession)
  return nextSession.session.accessToken || null
}

async function request(path, options = {}) {
  const {
    skipAuthRefresh = false,
    retryOnUnauthorized = true,
    ...fetchOptions
  } = options
  const headers = {
    ...(fetchOptions.headers || {}),
  }
  const shouldSetJson =
    !(fetchOptions.body instanceof FormData) && !('Content-Type' in headers)

  if (shouldSetJson) {
    headers['Content-Type'] = 'application/json'
  }

  const accessToken =
    skipAuthRefresh === true
      ? readStoredSession()?.session?.accessToken || null
      : await refreshStoredSessionIfNeeded()

  if (accessToken && !('Authorization' in headers)) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    credentials: 'include',
    ...fetchOptions,
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? body.message
        : 'Request failed.'

    if (response.status === 401 && retryOnUnauthorized !== false) {
      const refreshedAccessToken = await refreshStoredSessionIfNeeded(true)

      if (refreshedAccessToken && refreshedAccessToken !== accessToken) {
        return request(path, {
          ...options,
          retryOnUnauthorized: false,
        })
      }
    }

    throw new Error(message)
  }

  return body
}

export function submitWaitlistApplication(form) {
  return request('/waitlist/applications', {
    method: 'POST',
    body: JSON.stringify({
      fullName: form.name,
      email: form.email,
      company: form.company,
      roleTitle: form.role,
      useCase: form.useCase,
    }),
  })
}

export function signInWithPassword(credentials) {
  if (USE_MOCK) return mockSignInWithPassword(credentials)
  return request('/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify(credentials),
    skipAuthRefresh: true,
  })
}

export function requestPasswordReset(payload) {
  if (USE_MOCK) return mockRequestPasswordReset(payload)
  return request('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export function confirmPasswordReset(payload) {
  if (USE_MOCK) return mockConfirmPasswordReset(payload)
  return request('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export function acceptInvite(payload) {
  if (USE_MOCK) return mockAcceptInvite(payload)
  return request('/auth/invites/accept', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export async function signOut() {
  if (!USE_MOCK) {
    try {
      await request('/auth/sign-out', {
        method: 'POST',
        skipAuthRefresh: true,
        retryOnUnauthorized: false,
      })
    } catch {
      // Best-effort: always clear local state even if the server call fails.
    }
  }

  clearStoredSession()
  return { status: 'signed_out' }
}

export function getCurrentViewer() {
  if (USE_MOCK) return mockGetCurrentViewer()
  return request('/auth/me')
}

export function updateAccountProfile(payload) {
  return request('/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function initiateScan(payload) {
  if (USE_MOCK) return mockInitiateScan(payload)
  return request('/scans', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitScan(scanId) {
  if (USE_MOCK) return mockSubmitScan(scanId)
  return request(`/scans/${scanId}/submit`, {
    method: 'POST',
  })
}

export function listScans(params) {
  if (USE_MOCK) return mockListScans(params)
  return request('/scans')
}

export function getScan(scanId) {
  if (USE_MOCK) return mockGetScan(scanId)
  return request(`/scans/${scanId}`)
}

export function getAdminDashboard() {
  if (USE_MOCK) return mockGetAdminDashboard()
  return request('/admin/dashboard')
}

export function reviewWaitlistApplication(applicationId, payload) {
  if (USE_MOCK) return mockReviewWaitlistApplication(applicationId, payload)
  return request(`/admin/waitlist/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function createAccessInvite(applicationId, payload = {}) {
  if (USE_MOCK) return mockCreateAccessInvite(applicationId, payload)
  return request(`/admin/waitlist/${applicationId}/invite`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ---------------------------------------------------------------------------
// Additional endpoints (mock-only during frontend-first phase)
// ---------------------------------------------------------------------------

export function getAdminUsers(params) {
  if (USE_MOCK) return mockGetAdminUsers(params)
  return request('/admin/users')
}

export function getOrganizations() {
  if (USE_MOCK) return mockGetOrganizations()
  return request('/admin/organizations')
}

export function getFeatureFlags() {
  if (USE_MOCK) return mockGetFeatureFlags()
  return request('/admin/feature-flags')
}

export function updateFeatureFlag(key, enabled) {
  if (USE_MOCK) return mockUpdateFeatureFlag(key, enabled)
  return request(`/admin/feature-flags/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

export function getReports(params) {
  if (USE_MOCK) return mockGetReports(params)
  return request('/reports')
}

export function getReport(reportId) {
  if (USE_MOCK) return mockGetScan(reportId)
  return request(`/reports/${reportId}`)
}

export function getAnalytics() {
  if (USE_MOCK) return mockGetAnalytics()
  return request('/admin/analytics')
}

export function getSystemHealth() {
  if (USE_MOCK) return mockGetSystemHealth()
  return request('/admin/system-health')
}

export function getMonitoring() {
  if (USE_MOCK) return mockGetMonitoring()
  return request('/admin/monitoring')
}

export function getQueueSnapshot() {
  if (USE_MOCK) return mockGetQueueSnapshot()
  return request('/admin/queue-snapshot')
}

export function getNotifications(params) {
  if (USE_MOCK) return mockGetNotifications(params)
  return request('/notifications')
}

export function getAuditLogs(params) {
  if (USE_MOCK) return mockGetAuditLogs(params)
  return request('/admin/audit-logs')
}

export function getBilling() {
  if (USE_MOCK) return mockGetBilling()
  return request('/billing')
}

export function getInvoices(params) {
  if (USE_MOCK) return mockGetInvoices(params)
  return request('/billing/invoices')
}

export function getSecuritySettings() {
  if (USE_MOCK) return mockGetSecuritySettings()
  return request('/security/settings')
}

export function changePassword(payload) {
  if (USE_MOCK) return mockChangePassword(payload)
  return request('/security/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function revokeSession(sessionId) {
  if (USE_MOCK) return mockRevokeSession(sessionId)
  return request(`/security/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export function updateSecuritySetting(key, value) {
  if (USE_MOCK) return mockUpdateSecuritySetting(key, value)
  return request('/security/settings', {
    method: 'PATCH',
    body: JSON.stringify({ key, value }),
  })
}

export function getApiKeys() {
  if (USE_MOCK) return mockGetApiKeys()
  return request('/api-keys')
}

export function createApiKey(payload) {
  if (USE_MOCK) return mockCreateApiKey(payload)
  return request('/api-keys', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function revokeApiKey(keyId) {
  if (USE_MOCK) return mockRevokeApiKey(keyId)
  return request(`/api-keys/${keyId}`, {
    method: 'DELETE',
  })
}

export function regenerateApiKey(keyId) {
  if (USE_MOCK) return mockRegenerateApiKey(keyId)
  return request(`/api-keys/${keyId}/regenerate`, {
    method: 'POST',
  })
}

export function getHelpContent(params) {
  if (USE_MOCK) return mockGetHelpContent(params)
  return request('/help/content')
}

export function getOrganization() {
  if (USE_MOCK) return mockGetOrganization()
  return request('/organization')
}

export function inviteMember(payload) {
  if (USE_MOCK) return mockInviteMember(payload)
  return request('/organization/invites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateMemberRole(memberId, role) {
  if (USE_MOCK) return mockUpdateMemberRole(memberId, role)
  return request(`/organization/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export function updateMemberTeam(memberId, teamId) {
  if (USE_MOCK) return mockUpdateMemberTeam(memberId, teamId)
  return request(`/organization/members/${memberId}/team`, {
    method: 'PATCH',
    body: JSON.stringify({ teamId }),
  })
}

export function removeMember(memberId) {
  if (USE_MOCK) return mockRemoveMember(memberId)
  return request(`/organization/members/${memberId}`, {
    method: 'DELETE',
  })
}

export function cancelInvite(inviteId) {
  if (USE_MOCK) return mockCancelInvite(inviteId)
  return request(`/organization/invites/${inviteId}`, {
    method: 'DELETE',
  })
}

export function getSupportTickets(params) {
  if (USE_MOCK) return mockGetSupportTickets(params)
  return request('/admin/support-tickets')
}

export function getActivityLogs(params) {
  if (USE_MOCK) return mockGetActivityLogs(params)
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
      ).toString()
    : ''
  return request(`/account/activity${query ? `?${query}` : ''}`)
}

export function getAdminAuditLogs() {
  if (USE_MOCK) return mockGetAdminAuditLogs()
  return request('/admin/audit-logs')
}

export function getAdminJobs() {
  if (USE_MOCK) return mockGetAdminJobs()
  return request('/admin/jobs')
}

export function getAdminReports(params) {
  if (USE_MOCK) return mockGetAdminReports(params)
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
      ).toString()
    : ''
  return request(`/admin/reports${query ? `?${query}` : ''}`)
}

export function getAdminRoles() {
  if (USE_MOCK) return mockGetAdminRoles()
  return request('/admin/roles')
}

export function getAdminSettings() {
  if (USE_MOCK) return mockGetAdminSettings()
  return request('/admin/settings')
}

export function getUserProfile(userId) {
  if (USE_MOCK) return mockGetUserProfile(userId)
  return request(`/admin/users/${userId}`)
}

export function updateUserRole(userId, role) {
  if (USE_MOCK) return mockUpdateUserRole(userId, role)
  return request(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export function toggleTeamAccess(userId, enabled) {
  if (USE_MOCK) return mockToggleTeamAccess(userId, enabled)
  return request(`/admin/users/${userId}/team-access`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}
