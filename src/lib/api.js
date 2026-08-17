// ---------------------------------------------------------------------------
// Mock mode — env-driven gate between the mock and live API paths.
//
//   VITE_USE_MOCK=true   → always mock (explicit opt-in; local demos, or a
//                          demo deployment before the backend schema lands)
//   VITE_USE_MOCK=false  → always real (explicit opt-in; the validated
//                          workflow once the backend is converged)
//   unset                → mock in dev (`npm run dev`, vitest) so local
//                          development works without the backend; REAL in
//                          production builds (`npm run build` → Vercel), so
//                          every deploy validates against the live API
//
// All API functions delegate to mock implementations with realistic data,
// delays, and occasional error injection for state testing when USE_MOCK is
// true, and to the live NestJS backend otherwise.
// ---------------------------------------------------------------------------
export const USE_MOCK = (() => {
  const override = import.meta.env.VITE_USE_MOCK
  if (override === 'true') return true
  if (override === 'false') return false
  return import.meta.env.DEV
})()

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
  mockGetUnreadNotificationCount,
  mockMarkNotificationRead,
  mockMarkAllNotificationsRead,
  mockGetAuditLogs,
  mockGetSupportTickets,
  mockGetActivityLogs,
  mockGetAdminAuditLogs,
  mockGetAdminJobs,
  mockRetryJob,
  mockFailJob,
  mockGetAdminReports,
  mockGetAdminRoles,
  mockUpdateRoleScopes,
  mockReassignMemberRole,
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
  mockGetWebhooks,
  mockCreateWebhook,
  mockUpdateWebhookStatus,
  mockRotateWebhookSecret,
  mockDeleteWebhook,
  mockTestWebhook,
  mockGetWebhookDeliveries,
  mockGetHelpContent,
  mockSubmitCrashReports,
  mockGetOrganization,
  mockInviteMember,
  mockUpdateMemberRole,
  mockUpdateMemberTeam,
  mockRemoveMember,
  mockCancelInvite,
  mockGetMemberSessions,
  mockRevokeMemberSession,
  mockRevokeMemberSessions,
  mockReviewWaitlistApplication,
  mockCreateAccessInvite,
  mockGetUserProfile,
  mockUpdateUserRole,
  mockToggleTeamAccess,
} from './mockApi.js'

import {
  betterChangePassword,
  betterConfirmPasswordReset,
  betterGetCurrentViewer,
  betterGetSecuritySettings,
  betterRequestPasswordReset,
  betterRevokeSession,
  betterSignIn,
  betterSignOut,
  betterUpdateSecuritySetting,
} from './betterAuthClient.js'

// ---------------------------------------------------------------------------
// Better Auth mode — parallel auth provider at /api/auth (backend mounts it
// via better-auth.config.ts). When enabled it takes precedence over mock and
// GoTrue for the auth + security primitives below. Flip on with
// VITE_USE_BETTER_AUTH=true (dev only) — see docs/engineering/BETTER_AUTH_PLUGINS.md.
// ---------------------------------------------------------------------------
export const USE_BETTER_AUTH = import.meta.env.VITE_USE_BETTER_AUTH === 'true'

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

// ---------------------------------------------------------------------------
// Real-path session store — access token in JS memory only.
//
// Migration target for the httpOnly-cookie auth flow: the refresh token lives
// exclusively in the backend-set httpOnly cookie (provance_refresh / the
// __Host- variant on secure deployments), and the access token is held in this
// module-level memory so it never touches localStorage (XSS exposure). The
// mock path keeps the localStorage session so dev demos survive reloads.
// ---------------------------------------------------------------------------
let memorySession = null

export function setMemorySession(session) {
  memorySession = session
    ? {
        accessToken: session.accessToken || null,
        tokenType: session.tokenType || 'bearer',
        // Backend epochs are seconds; normalize to ms (same rule as
        // AuthContext's normalizeSessionPayload).
        expiresAt:
          typeof session.expiresAt === 'number'
            ? session.expiresAt > 9999999999
              ? session.expiresAt
              : session.expiresAt * 1000
            : null,
      }
    : null
}

export function getMemorySession() {
  return memorySession ? { ...memorySession } : null
}

export function clearMemorySession() {
  memorySession = null
}

/**
 * Mock-mode refresh — persists the whole session in localStorage so the
 * upload → queue loop and viewer identity survive dev-server reloads.
 */
async function refreshMockSession(force = false) {
  const storedSession = readStoredSession()
  const accessToken = storedSession?.session?.accessToken
  const refreshToken = storedSession?.session?.refreshToken
  const expiresAt = storedSession?.session?.expiresAt
  const refreshThresholdMs = 60 * 1000

  const hasSessionSignal = Boolean(
    storedSession?.session || storedSession?.user || storedSession?.permissions,
  )

  if (!hasSessionSignal) {
    return accessToken || null
  }

  const canAttemptRefresh = Boolean(refreshToken)

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
    body: JSON.stringify({ refreshToken }),
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

/**
 * Real-mode refresh — the refresh token arrives in the httpOnly cookie, so
 * the body stays empty. The new access token is cached in memory only, and
 * rotation is handled server-side (each refresh mints a fresh refresh token
 * and the cookie carries the new value).
 *
 * Single-flight: Supabase refresh tokens are single-use, so concurrent 401s
 * must not each POST /auth/refresh with the same cookie — the losers would
 * consume the freshly minted token and log the user out. All callers share
 * one in-flight refresh promise.
 */
let realRefreshInFlight = null

async function refreshRealSession(force = false) {
  const accessToken = memorySession?.accessToken || null
  const expiresAt = memorySession?.expiresAt || null
  const refreshThresholdMs = 60 * 1000

  if (
    !force &&
    accessToken &&
    typeof expiresAt === 'number' &&
    expiresAt - Date.now() > refreshThresholdMs
  ) {
    return accessToken
  }

  if (realRefreshInFlight) {
    return realRefreshInFlight
  }

  realRefreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        clearMemorySession()
        return null
      }

      const body = await response.json()

      if (body?.status === 'authenticated' && body?.session?.accessToken) {
        setMemorySession(body.session)
        return body.session.accessToken
      }

      clearMemorySession()
      return null
    } finally {
      realRefreshInFlight = null
    }
  })()

  return realRefreshInFlight
}

async function refreshStoredSessionIfNeeded(force = false) {
  return USE_MOCK ? refreshMockSession(force) : refreshRealSession(force)
}

/**
 * Public boot seam for AuthContext: returns a usable access token (mock:
 * restored from localStorage; real: refreshed from the httpOnly cookie) or
 * null when there is no live session.
 */
export function ensureSession(force = false) {
  return refreshStoredSessionIfNeeded(force)
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

    // Attach the HTTP status and Retry-After hint (seconds) so callers can
    // distinguish entitlement rejections (402) from generic failures and
    // surface the reset time on the upload/billing surfaces.
    const error = new Error(message)
    error.status = response.status
    const retryAfter = response.headers.get('retry-after')
    error.retryAfterSeconds = retryAfter ? Number(retryAfter) : null
    throw error
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
  if (USE_BETTER_AUTH) return betterSignIn(credentials)
  if (USE_MOCK) return mockSignInWithPassword(credentials)
  return request('/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify(credentials),
    skipAuthRefresh: true,
  })
}

export function requestPasswordReset(payload) {
  if (USE_BETTER_AUTH) return betterRequestPasswordReset(payload)
  if (USE_MOCK) return mockRequestPasswordReset(payload)
  return request('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  })
}

export function confirmPasswordReset(payload) {
  if (USE_BETTER_AUTH) return betterConfirmPasswordReset(payload)
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
  if (USE_BETTER_AUTH) {
    try {
      await betterSignOut()
    } catch {
      // Best-effort: always clear local state even if the server call fails.
    }
  } else if (!USE_MOCK) {
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
  if (USE_BETTER_AUTH) return betterGetCurrentViewer()
  if (USE_MOCK) return mockGetCurrentViewer()
  return request('/auth/me')
}

export function updateAccountProfile(payload) {
  return request('/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function initiateScan(payload, idempotencyKey) {
  if (USE_MOCK) return mockInitiateScan(payload, idempotencyKey)
  return request('/scans', {
    method: 'POST',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
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
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      ).toString()
    : ''
  return request(`/scans${query ? `?${query}` : ''}`)
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
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      ).toString()
    : ''
  return request(`/admin/users${query ? `?${query}` : ''}`)
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

/**
 * Server-generated PDF artifact for a ready report (GET /reports/:id/pdf).
 * The print page owns the client-side print flow; this is the API-level blob
 * download, gated by USE_MOCK like every other endpoint.
 */
export async function exportReportPdf(reportId) {
  if (USE_MOCK) {
    return {
      mock: true,
      printPath: `/app/reports/${reportId}/print`,
    }
  }

  const accessToken = await refreshStoredSessionIfNeeded()
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/pdf`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('PDF export failed.') // keep the body out of the error for binary responses
  }

  const blob = await response.blob()
  return {
    url: URL.createObjectURL(blob),
    filename: `provance-report-${reportId}.pdf`,
  }
}

export function getAnalytics(params) {
  if (USE_MOCK) return mockGetAnalytics(params)
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      ).toString()
    : ''
  return request(`/admin/analytics${query ? `?${query}` : ''}`)
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
  // User-scoped: the queue posture for the signed-in user's scans. The mock
  // snapshot is also consumed by the admin Overview (via useMockData), which
  // stays mock-only for now.
  return request('/scans/queue-snapshot')
}

export function getNotifications(params) {
  if (USE_MOCK) return mockGetNotifications(params)
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
      ).toString()
    : ''
  return request(`/notifications${query ? `?${query}` : ''}`)
}

/**
 * getUnreadNotificationCount — a single number for the shell's badge, so the
 * bell can poll without refetching the whole feed. Returns { unread }.
 */
export function getUnreadNotificationCount() {
  if (USE_MOCK) return mockGetUnreadNotificationCount()
  return request('/notifications/unread-count')
}

/**
 * Mark a single notification read (PATCH /notifications/:id/read). Scoped
 * to the signed-in user server-side; returns the updated notification row.
 */
export function markNotificationRead(notificationId) {
  if (USE_MOCK) return mockMarkNotificationRead(notificationId)
  return request(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}

/** Mark every notification for the signed-in user read (PATCH /read-all). */
export function markAllNotificationsRead() {
  if (USE_MOCK) return mockMarkAllNotificationsRead()
  return request('/notifications/read-all', {
    method: 'PATCH',
  })
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
  if (USE_BETTER_AUTH) return betterGetSecuritySettings()
  if (USE_MOCK) return mockGetSecuritySettings()
  return request('/security/settings')
}

export function changePassword(payload) {
  if (USE_BETTER_AUTH) return betterChangePassword(payload)
  if (USE_MOCK) return mockChangePassword(payload)
  return request('/security/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function revokeSession(sessionId) {
  if (USE_BETTER_AUTH) return betterRevokeSession(sessionId)
  if (USE_MOCK) return mockRevokeSession(sessionId)
  return request(`/security/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export function updateSecuritySetting(key, value) {
  if (USE_BETTER_AUTH) return betterUpdateSecuritySetting(key, value)
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

// ---------------------------------------------------------------------------
// Webhooks (approved feature, 2026-08-04) — REST paths follow the /api-keys
// convention; the backend slice implements them behind the same USE_MOCK gate.
// ---------------------------------------------------------------------------

export function getWebhooks() {
  if (USE_MOCK) return mockGetWebhooks()
  return request('/webhooks')
}

export function createWebhook(payload) {
  if (USE_MOCK) return mockCreateWebhook(payload)
  return request('/webhooks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateWebhookStatus(webhookId, status) {
  if (USE_MOCK) return mockUpdateWebhookStatus(webhookId, status)
  return request(`/webhooks/${webhookId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function rotateWebhookSecret(webhookId) {
  if (USE_MOCK) return mockRotateWebhookSecret(webhookId)
  return request(`/webhooks/${webhookId}/secret`, {
    method: 'POST',
  })
}

export function deleteWebhook(webhookId) {
  if (USE_MOCK) return mockDeleteWebhook(webhookId)
  return request(`/webhooks/${webhookId}`, {
    method: 'DELETE',
  })
}

export function testWebhook(webhookId) {
  if (USE_MOCK) return mockTestWebhook(webhookId)
  return request(`/webhooks/${webhookId}/test`, {
    method: 'POST',
  })
}

export function getWebhookDeliveries(webhookId) {
  if (USE_MOCK) return mockGetWebhookDeliveries(webhookId)
  return request(`/webhooks/${webhookId}/deliveries`)
}

/**
 * Ship buffered crash records to the backend (POST /telemetry/errors). The
 * endpoint is public + throttled so errors from unauthenticated surfaces can
 * still be reported; the bearer token is attached when a session exists. The
 * upsert is idempotent on client_id, so a retried flush never duplicates.
 */
export function submitCrashReports(records) {
  if (USE_MOCK) return mockSubmitCrashReports(records)
  return request('/telemetry/errors', {
    method: 'POST',
    body: JSON.stringify({ errors: records }),
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

export function getMemberSessions(memberId) {
  if (USE_MOCK) return mockGetMemberSessions(memberId)
  return request(`/organization/members/${memberId}/sessions`)
}

export function revokeMemberSession(memberId, sessionId) {
  if (USE_MOCK) return mockRevokeMemberSession(memberId, sessionId)
  return request(`/organization/members/${memberId}/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export function revokeMemberSessions(memberId) {
  if (USE_MOCK) return mockRevokeMemberSessions(memberId)
  return request(`/organization/members/${memberId}/sessions`, {
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

export function getAdminAuditLogs(params) {
  if (USE_MOCK) return mockGetAdminAuditLogs(params)
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
      ).toString()
    : ''
  return request(`/admin/audit-logs${query ? `?${query}` : ''}`)
}

export function getAdminJobs(params = {}) {
  if (USE_MOCK) return mockGetAdminJobs(params)
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ).toString()
  return request(`/admin/jobs${query ? `?${query}` : ''}`)
}

export function retryJob(jobId) {
  if (USE_MOCK) return mockRetryJob(jobId)
  return request(`/admin/jobs/${jobId}/retry`, {
    method: 'POST',
  })
}

export function failJob(jobId, reason) {
  if (USE_MOCK) return mockFailJob(jobId, reason)
  // reason is optional — omit it entirely (not as undefined) so the future
  // backend DTO can treat it as absent rather than empty.
  return request(`/admin/jobs/${jobId}/fail`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })
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

export function updateRoleScopes(roleId, scopes) {
  if (USE_MOCK) return mockUpdateRoleScopes(roleId, scopes)
  return request(`/admin/roles/${roleId}/scopes`, {
    method: 'PATCH',
    body: JSON.stringify({ scopes }),
  })
}

export function reassignMemberRole(memberId, roleId) {
  if (USE_MOCK) return mockReassignMemberRole(memberId, roleId)
  // Matches the backend RolesController route (PATCH /admin/roles/members/:memberId).
  return request(`/admin/roles/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ roleId }),
  })
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
