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
  mockMonitoring,
  mockQueueSnapshot,
  mockAnalytics,
  mockSupportTickets,
  mockBillingProfile,
  mockInvoices,
  mockSecuritySettings,
  mockApiKeys,
  API_KEY_SCOPES,
  mockApiKeyLimits,
  mockDocsContent,
  mockHelpContent,
  mockOrgTeams,
  mockOrgWorkspace,
  mockUserTeamById,
  buildIncidentActivityEvents,
  mockAdminJobs,
  mockAdminRoles,
  mockRoleScopeMeta,
  mockAdminSettings,
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



export async function mockGetUserProfile(userId) {
  await delay()
  maybeError()
  const user = findById(mockUsers, userId)
  if (!user) throw new Error('User not found.')
  return user
}

export async function mockUpdateUserRole(userId, role) {
  await delay(300, 500)
  maybeError()
  const user = findById(mockUsers, userId)
  if (!user) throw new Error('User not found.')
  return { ...user, role, updated_at: new Date().toISOString() }
}

export async function mockToggleTeamAccess(userId, enabled) {
  await delay(200, 400)
  maybeError()
  const user = findById(mockUsers, userId)
  if (!user) throw new Error('User not found.')
  return { ...user, team_enabled: enabled, updated_at: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Auth / Sign-In (mock-first, ADR 004)
//
// The real path validates credentials against Supabase through the backend.
// In mock mode these known test accounts drive the same frontend flow:
//
//   founder.admin@provance.local  -> admin access (dashboard + admin panel)
//   founder.test@provance.local   -> member access (dashboard only)
//
// Any password of 8+ characters is accepted for a known account, so reviewers
// never need to remember a credential. See
// docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md for the test-account doc.
// ---------------------------------------------------------------------------

const MOCK_TEST_ACCOUNTS = {
  'founder.admin@provance.local': {
    user: mockUsers[0], // super_admin
    permissions: { individual: true, team: true, admin: true },
  },
  'founder.test@provance.local': {
    user: mockUsers[10], // member, team disabled
    permissions: { individual: true, team: false, admin: false },
  },
}

const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

function displayNameForEmail(email) {
  const localPart = (email || '').split('@')[0]
  const name = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return name || 'Provance User'
}

function buildAuthResponse(account, loginEmail) {
  const { user, permissions } = account
  return {
    status: 'authenticated',
    user: { id: user.id, email: loginEmail },
    profile: {
      displayName: displayNameForEmail(loginEmail),
      organization: 'Provance Internal',
      roleTitle: user.role,
      defaultWorkspace: 'individual',
      emailNotifications: true,
      accountRole: user.role,
      teamAccess: user.team_enabled,
    },
    permissions,
    session: {
      accessToken: `mock_access_token_${user.id}`,
      refreshToken: 'mock_refresh_token',
      tokenType: 'bearer',
      expiresAt: Date.now() + 3600000,
    },
  }
}

export async function mockSignInWithPassword({ email, password } = {}) {
  await delay()
  const key = (email || '').trim().toLowerCase()
  const account = MOCK_TEST_ACCOUNTS[key]
  if (!account || !password || password.length < 8) {
    throw new Error('Invalid login credentials. Check your email and password.')
  }
  return buildAuthResponse(account, email.trim())
}

/**
 * mockGetCurrentViewer returns the account that is actually signed in (read
 * from the persisted session), so a full page reload keeps the same identity
 * and permission set. Mirrors the real /auth/me 401 when no session exists.
 */
export async function mockGetCurrentViewer() {
  await delay()
  let stored = null
  try {
    stored = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
  } catch {
    stored = null
  }
  const email = stored?.user?.email
  const account = MOCK_TEST_ACCOUNTS[(email || '').trim().toLowerCase()]
  if (!account) throw new Error('No active session.')
  return buildAuthResponse(account, email)
}

export async function mockRequestPasswordReset({ email } = {}) {
  await delay()
  // Mirror the real API: always resolve so the UI does not leak which emails
  // have accounts.
  return { ok: true, email }
}

export async function mockConfirmPasswordReset({ password } = {}) {
  await delay()
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  return { ok: true }
}

export async function mockAcceptInvite({ token, fullName, password } = {}) {
  await delay()
  if (!token) throw new Error('A valid invite token is required.')
  if (!fullName) throw new Error('Full name is required.')
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  return { ok: true }
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

/**
 * In-memory scan store. Seeded from the static mock dataset and extended by
 * mockInitiateScan, so newly submitted uploads appear in list/queue/get views
 * for the duration of the session — the upload -> queue loop is fully live
 * without a backend.
 *
 * Persisted to localStorage (like the auth session) so the loop survives
 * dev-server reloads during demos; capped at the 50 most recent records.
 */
const SCAN_STORE_KEY = 'provance.mock.scanStore.v1'

function loadScanStore() {
  try {
    const raw = window.localStorage.getItem(SCAN_STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // Corrupt or unavailable storage — fall through to the seed data.
  }
  return null
}

function persistScanStore() {
  try {
    window.localStorage.setItem(SCAN_STORE_KEY, JSON.stringify(mockScanStore.slice(0, 50)))
  } catch {
    // Storage unavailable — keep working with the in-memory copy.
  }
}

let mockScanStore = loadScanStore() || [...mockScans]

function newestScanId() {
  const max = mockScanStore.reduce((acc, scan) => {
    const n = Number(scan.id.replace(/\D/g, '')) || 0
    return n > acc ? n : acc
  }, 0)
  return `scan_${String(max + 1).padStart(3, '0')}`
}

export async function mockListScans({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockScanStore, { page, pageSize })
}

export async function mockGetScan(id) {
  await delay()
  maybeError()
  const scan = findById(mockScanStore, id)
  if (!scan) throw new Error('Scan not found.')
  return scan
}

/**
 * mockInitiateScan — reserves a verification record and returns the signed
 * upload contract (bucket/path/token). Mirrors POST /scans.
 */
export async function mockInitiateScan(payload = {}) {
  await delay(350, 700)
  const scanId = newestScanId()
  const creatorId = mockUsers[0]?.id || 'usr_001'
  const record = {
    id: scanId,
    user_id: creatorId,
    team_id: mockUserTeamById[creatorId] || 'team_legal',
    original_filename: payload.originalFilename || 'upload.jpg',
    file_size_bytes: payload.fileSizeBytes || 0,
    mime_type: payload.mimeType || 'image/jpeg',
    media_type: payload.mediaType || 'image',
    processing_mode: payload.processingMode || 'standard',
    status: 'queued',
    verdict: null,
    result_payload: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  }
  mockScanStore = [record, ...mockScanStore]
  persistScanStore()
  return {
    scanId,
    bucket: 'mock-private-uploads',
    path: `scans/${scanId}/original`,
    token: 'mock_signed_upload_token',
  }
}

/**
 * mockSubmitScan — marks the reserved record as submitted (still queued for a
 * worker). Mirrors POST /scans/:id/submit.
 */
export async function mockSubmitScan(scanId) {
  await delay(250, 500)
  const scan = findById(mockScanStore, scanId)
  if (!scan) throw new Error('Scan not found.')
  scan.status = 'queued'
  scan.submitted_at = new Date().toISOString()
  persistScanStore()
  return { scan }
}

/**
 * mockGetQueueSnapshot — derived from the live in-memory store so a freshly
 * uploaded scan is immediately visible in the Verification Queue.
 */
export async function mockGetQueueSnapshot() {
  await delay(100, 300)
  const statuses = mockScanStore.reduce(
    (acc, scan) => {
      acc[scan.status] = (acc[scan.status] || 0) + 1
      return acc
    },
    { queued: 0, processing: 0, failed: 0 },
  )
  return {
    queued: statuses.queued || 0,
    processing: statuses.processing || 0,
    failed: statuses.failed || 0,
    avg_processing_time_ms: mockQueueSnapshot.avg_processing_time_ms,
  }
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
// Monitoring
// ---------------------------------------------------------------------------

export async function mockGetMonitoring() {
  await delay()
  maybeError()
  return mockMonitoring
}

// ---------------------------------------------------------------------------
// Queue Snapshot
// ---------------------------------------------------------------------------

// NOTE: mockGetQueueSnapshot lives in the Scans section — it is derived from
// the live in-memory scan store so freshly uploaded scans appear immediately.

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function mockGetNotifications({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockNotifications, { page, pageSize })
}

export async function mockGetBilling() {
  await delay()
  maybeError()
  return {
    profile: mockBillingProfile,
    invoices: mockInvoices,
  }
}

export async function mockGetInvoices({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockInvoices, { page, pageSize })
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
  // Resolved incidents surface as system events (post-mortem summaries). The
  // feed is sorted newest-first by timestamp so incident events interleave
  // correctly with the audit trail regardless of when each resolved.
  // Note: incidents are mock-mode-only for now — the real /v1/account/activity
  // reads auth_audit_events and does not emit incident rows yet.
  const merged = [...buildIncidentActivityEvents(), ...mockAuditEvents].sort(
    (left, right) => new Date(right.created_at) - new Date(left.created_at),
  )
  return paginate(merged, { page, pageSize })
}

// Admin audit trail — the full event list (the page filters client-side and
// exports the filtered view). Real path: GET /admin/audit-logs.
export async function mockGetAdminAuditLogs() {
  await delay()
  maybeError()
  return { data: mockAuditEvents, total: mockAuditEvents.length }
}

// ---------------------------------------------------------------------------
// Admin jobs / reports / roles / settings
// ---------------------------------------------------------------------------

export async function mockGetAdminJobs() {
  await delay()
  maybeError()
  return { data: mockAdminJobs, total: mockAdminJobs.length }
}

export async function mockGetAdminReports({ page = 1, pageSize = 20 } = {}) {
  await delay()
  maybeError()
  return paginate(mockReports, { page, pageSize })
}

export async function mockGetAdminRoles() {
  await delay()
  maybeError()
  return { roles: mockAdminRoles, scopes: mockRoleScopeMeta }
}

export async function mockGetAdminSettings() {
  await delay()
  maybeError()
  return mockAdminSettings
}

// ---------------------------------------------------------------------------
// Security settings
// ---------------------------------------------------------------------------

export async function mockGetSecuritySettings() {
  await delay()
  maybeError()
  return mockSecuritySettings
}

export async function mockChangePassword({ currentPassword, newPassword } = {}) {
  await delay()
  maybeError()
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.')
  }
  if (currentPassword === newPassword) {
    throw new Error('New password must be different from the current password.')
  }
  return { ok: true }
}

export async function mockRevokeSession(sessionId) {
  await delay()
  maybeError()
  const current = mockSecuritySettings.activeSessions.find((s) => s.id === sessionId)
  if (!current) throw new Error('Session not found.')
  if (current.isCurrent) throw new Error('You cannot revoke the current session.')
  // Persist the revocation in the module-level mock so it survives navigation
  // away and back, matching how 2FA/setting toggles persist.
  mockSecuritySettings.activeSessions = mockSecuritySettings.activeSessions.filter(
    (s) => s.id !== sessionId,
  )
  return { ok: true, sessionId }
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

function generateMockKeyToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let raw = ''
  for (let i = 0; i < 40; i += 1) {
    raw += chars[Math.floor(Math.random() * chars.length)]
  }
  return `pv_live_${raw}`
}

function makeKeyId() {
  const maxNumeric = mockApiKeys.reduce((max, k) => {
    const num = Number((k.id || '').replace(/^key_/, '')) || 0
    return Math.max(max, num)
  }, 0)
  return `key_${String(maxNumeric + 1).padStart(3, '0')}`
}

export async function mockGetApiKeys() {
  await delay()
  maybeError()
  return {
    keys: mockApiKeys,
    scopes: API_KEY_SCOPES,
    limits: mockApiKeyLimits,
  }
}

export async function mockCreateApiKey({ name, scopes = ['scan:create'] } = {}) {
  await delay()
  maybeError()
  if (!name || !name.trim()) throw new Error('A key name is required.')
  if (mockApiKeys.filter((k) => k.status === 'active').length >= mockApiKeyLimits.keysPerWorkspace) {
    throw new Error('Workspace key limit reached.')
  }
  const now = new Date()
  const created = {
    id: makeKeyId(),
    name: name.trim(),
    prefix: 'pv_live',
    createdAt: now.toISOString(),
    lastUsedAt: null,
    status: 'active',
    scopes,
    requestsLast30d: 0,
    rateLimitRpm: mockApiKeyLimits.defaultRateLimitRpm,
    expiresAt: new Date(now.getTime() + mockApiKeyLimits.tokenLifetimeDays * 86400000).toISOString(),
  }
  mockApiKeys.unshift(created)
  // The full token is returned exactly once, on creation — the store keeps
  // only the prefix so it cannot be re-shown later.
  return { key: created, token: generateMockKeyToken() }
}

export async function mockRevokeApiKey(keyId) {
  await delay()
  maybeError()
  const key = mockApiKeys.find((k) => k.id === keyId)
  if (!key) throw new Error('API key not found.')
  if (key.status === 'revoked') throw new Error('This API key is already revoked.')
  key.status = 'revoked'
  return { ok: true, keyId }
}

export async function mockRegenerateApiKey(keyId) {
  await delay()
  maybeError()
  const key = mockApiKeys.find((k) => k.id === keyId)
  if (!key) throw new Error('API key not found.')
  return { ok: true, keyId, token: generateMockKeyToken() }
}

// ---------------------------------------------------------------------------
// Help & documentation
// ---------------------------------------------------------------------------

export async function mockGetHelpContent({ module = 'help' } = {}) {
  await delay()
  maybeError()
  return module === 'docs' ? mockDocsContent : mockHelpContent
}

// ---------------------------------------------------------------------------
// Organization workspace
// ---------------------------------------------------------------------------

export async function mockGetOrganization() {
  await delay()
  maybeError()
  return { ...mockOrgWorkspace, teams: mockOrgTeams }
}

export async function mockInviteMember({ email, role = 'member', team } = {}) {
  await delay()
  maybeError()
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error('Enter a valid email address.')
  }
  if (mockOrgWorkspace.members.some((m) => m.email === normalized)) {
    throw new Error('That person is already a member of this workspace.')
  }
  if (mockOrgWorkspace.pendingInvites.some((i) => i.email === normalized)) {
    throw new Error('An invite is already pending for that email.')
  }
  if (mockOrgWorkspace.members.length >= (mockOrgWorkspace.profile?.seats || 99)) {
    throw new Error('This workspace has no seats left on its current plan.')
  }
  const resolvedTeam =
    team && mockOrgTeams.some((t) => t.id === team) ? team : (mockOrgTeams[0]?.id || null)
  const maxNumeric = mockOrgWorkspace.pendingInvites.reduce((max, i) => {
    const num = Number((i.id || '').replace(/^inv_/, '')) || 0
    return Math.max(max, num)
  }, 0)
  const invite = {
    id: `inv_${String(maxNumeric + 1).padStart(3, '0')}`,
    email: normalized,
    role,
    team: resolvedTeam,
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  }
  mockOrgWorkspace.pendingInvites.unshift(invite)
  return { ok: true, invite }
}

export async function mockUpdateMemberTeam(memberId, teamId) {
  await delay()
  maybeError()
  const member = mockOrgWorkspace.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (member.role === 'owner') throw new Error('The owner cannot be reassigned.')
  if (!mockOrgTeams.some((t) => t.id === teamId)) throw new Error('That team does not exist.')
  member.team = teamId
  return { ok: true, memberId, teamId }
}

export async function mockUpdateMemberRole(memberId, role) {
  await delay()
  maybeError()
  const member = mockOrgWorkspace.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (member.role === 'owner') throw new Error('The owner role cannot be changed.')
  member.role = role
  return { ok: true, memberId, role }
}

export async function mockRemoveMember(memberId) {
  await delay()
  maybeError()
  const member = mockOrgWorkspace.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (member.role === 'owner') throw new Error('The owner cannot be removed.')
  mockOrgWorkspace.members = mockOrgWorkspace.members.filter((m) => m.id !== memberId)
  return { ok: true, memberId }
}

export async function mockCancelInvite(inviteId) {
  await delay()
  maybeError()
  mockOrgWorkspace.pendingInvites = mockOrgWorkspace.pendingInvites.filter(
    (invite) => invite.id !== inviteId,
  )
  return { ok: true, inviteId }
}

export async function mockUpdateSecuritySetting(key, value) {
  await delay()
  maybeError()
  if (key === 'twoFactorAuth') {
    mockSecuritySettings.signInControls.twoFactorAuth.enabled = Boolean(value)
    mockSecuritySettings.signInControls.twoFactorAuth.updatedAt = new Date().toISOString()
  } else if (key === 'sessionTimeoutMinutes') {
    mockSecuritySettings.signInControls.sessionTimeoutMinutes = value
  } else if (key === 'notifyOnNewDevice') {
    mockSecuritySettings.signInControls.notifyOnNewDevice = Boolean(value)
  } else if (key === 'notifyOnPasswordChange') {
    mockSecuritySettings.signInControls.notifyOnPasswordChange = Boolean(value)
  }
  return { ok: true, key, value }
}
