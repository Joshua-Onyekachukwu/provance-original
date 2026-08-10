/**
 * mockApi.js — Mock API layer for Provance frontend-first MVP.
 *
 * Every function mirrors the signature of the real API functions. They return
 * promises resolved after a realistic delay so loading and error states can be
 * tested end-to-end without a backend.
 *
 * ~8% of calls randomly error out (maybeError default rate) to exercise
 * error-state rendering.
 *
 * Dev-only kill switch: append `?noisy=0` to the URL (or set
 * localStorage['provance.mock.noisy.v1'] = '0') to disable the random error
 * injection during interactive demos — see mockNoise.js.
 */

import { isNoiseDisabled } from './mockNoise.js'
import { projectScanUsage } from './scanQuota.js'

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
  mockWebhooks,
  WEBHOOK_EVENTS,
  mockWebhookLimits,
  mockWebhookDeliveries,
  mockDocsContent,
  mockHelpContent,
  mockOrgTeams,
  mockOrgWorkspace,
  mockUserTeamById,
  mockMemberSessionsByUserId,
  buildIncidentActivityEvents,
  mockAdminJobs,
  mockAdminRoles,
  mockRoleMembers,
  mockRoleAuditEvents,
  mockRoleScopeMeta,
  mockAdminSettings,
  buildAdminDashboard,
  AUDIT_SEVERITY_BY_ACTION,
} from './mockData.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(min = 200, max = 600) {
  const ms = Math.floor(Math.random() * (max - min) + min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function maybeError(rate = 0.08) {
  if (isNoiseDisabled()) return
  if (Math.random() < rate) {
    throw new Error('Mock API: simulated transient error. Please try again.')
  }
}

/**
 * Dev-only quota forcing — `?quota=exhausted` in the URL makes the mock
 * entitlement layer behave as if the current cycle's scan quota is spent, so
 * the 402 upload surface and the Billing exhausted banner can be reviewed
 * without waiting for 500 mock scans. Inert in production builds.
 */
function mockQuotaExhausted() {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('quota') === 'exhausted'
}

/**
 * Dev-only quota-high forcing — `?quota=high` pushes scansUsed to 90% of the
 * plan limit so the dashboard's ≥85% warning chip renders for review. Inert
 * in production builds — same pattern as `?quota=exhausted`.
 */
function mockQuotaHigh() {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('quota') === 'high'
}

/**
 * Dev-only dedup forcing — `?dedup=1` makes mockSubmitScan treat the next
 * submission as an identical file, completing it instantly with a reused
 * payload copied from the first seeded completed scan. Lets the reuse UX be
 * demoed without uploading the same file twice (mock scans never complete on
 * their own, so an honest lookup would otherwise never hit). Inert in
 * production builds — same pattern as `?quota=exhausted`.
 */
function mockDedupForced() {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('dedup') === '1'
}

/**
 * pseudoSha256 — deterministic stand-in for the worker's SHA-256 fingerprint.
 * Mock mode never uploads real bytes, so the hash is derived from the file's
 * identity (name + size) rather than its content. Stable across reloads, so a
 * second upload of the same file in a session shares a hash — the exact
 * property the real worker-side dedup relies on. FNV-1a expanded to a
 * 64-char hex string so it reads like the real fingerprint.
 */
function pseudoSha256(name, sizeBytes) {
  let hash = 0x811c9dc5
  const input = `${name}|${sizeBytes}`.toLowerCase()
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8)
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

/**
 * Seen (user, device, ip) combos — mock parity for the backend's new-device
 * detection. Mirrors SecurityService.isNewDeviceCombo: a combo with no prior
 * sign-in triggers a new_device_signin audit event, and — when the
 * notifyOnNewDevice control is on — a security notification + mock email.
 */
const mockSeenDeviceCombos = new Set()

export async function mockSignInWithPassword({ email, password, meta } = {}) {
  await delay()
  const key = (email || '').trim().toLowerCase()
  const account = MOCK_TEST_ACCOUNTS[key]
  if (!account || !password || password.length < 8) {
    throw new Error('Invalid login credentials. Check your email and password.')
  }
  await mockRecordNewDeviceSignIn({
    userId: account.user.id,
    email: account.user.email,
    meta,
  })
  return buildAuthResponse(account, email.trim())
}

/**
 * mockRecordNewDeviceSignIn — the mock half of the backend's new-device
 * detection. A first-time (user, device, ip) combo writes a high-severity
 * audit event unconditionally and, when notifyOnNewDevice is enabled, a
 * security notification + a console mock-email line. Exporting it lets the
 * parity test drive combos directly instead of round-tripping a sign-in.
 */
export async function mockRecordNewDeviceSignIn({ userId, email, meta } = {}) {
  const device = meta?.device || 'Chrome on Windows'
  const ipAddress = meta?.ipAddress || '127.0.0.1'
  const location = meta?.location || null
  const combo = `${userId}|${device}|${ipAddress}`

  if (mockSeenDeviceCombos.has(combo)) {
    return { isNewDevice: false }
  }
  mockSeenDeviceCombos.add(combo)

  // Unconditional high-severity audit event (matches the backend trail).
  mockAuditEvents.unshift({
    id: `audit_live_${Date.now()}_${String(++mockAuditLiveSeq).padStart(3, '0')}`,
    actor_email: email || null,
    action: 'new_device_signin',
    severity: AUDIT_SEVERITY_BY_ACTION['new_device_signin'],
    resource_type: 'auth_session',
    resource_id: userId,
    details: { device, ip_address: ipAddress, location },
    created_at: new Date().toISOString(),
  })

  if (!mockSecuritySettings.signInControls.notifyOnNewDevice) {
    return { isNewDevice: true }
  }

  // In-app notification (bell + notification center).
  mockNotifications.unshift({
    id: `notif_live_${Date.now()}_${String(++mockAuditLiveSeq).padStart(3, '0')}`,
    category: 'security',
    title: 'New device sign-in detected',
    description: `${device} signed in from ${ipAddress}${
      location ? ` (${location})` : ''
    }.`,
    read: false,
    link: '/app/security',
    created_at: new Date().toISOString(),
  })

  // Mock email — mirrors the backend's [mock-email] log line contract.
  // eslint-disable-next-line no-console
  console.log(
    `[mock-email] To: ${email || userId} — Subject: "New device sign-in detected" — ` +
      `${device} from ${ipAddress}${location ? ` (${location})` : ''} — secure your account if this wasn't you.`,
  )

  return { isNewDevice: true }
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

export async function mockGetAdminUsers({ page = 1, pageSize = 20, team } = {}) {
  await delay()
  maybeError()
  let rows = mockUsers
  if (team && team !== 'all') {
    rows = mockUsers.filter((user) => user.team_id === team)
  }
  return paginate(rows, { page, pageSize })
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
 *
 * Enforces the mock plan quota: once the billing profile's scansUsed reaches
 * scansLimit, new scans are rejected with a 402-shaped error carrying
 * retryAfterSeconds (matching the real /scans entitlement gate). Dev-only
 * forcing: append ?quota=exhausted to demo the 402 surface without waiting.
 */
export async function mockInitiateScan(payload = {}, idempotencyKey) {
  await delay(350, 700)

  const creatorId = mockUsers[0]?.id || 'usr_001'

  // Idempotency parity with POST /scans: a retried initiate with the same key
  // returns the original reservation while the record is still pre-submission
  // (no submitted_at), checked before the quota gate so the retry never
  // double-consumes the allowance.
  if (idempotencyKey) {
    const existing = mockScanStore.find(
      (scan) =>
        scan.user_id === creatorId &&
        scan.idempotency_key === idempotencyKey &&
        !scan.submitted_at,
    )
    if (existing) {
      return {
        scanId: existing.id,
        bucket: 'mock-private-uploads',
        path: `scans/${existing.id}/original`,
        token: 'mock_signed_upload_token',
      }
    }
  }

  if (mockQuotaExhausted()) {
    const error = new Error(
      'Monthly scan quota reached. Upgrade your plan or wait for the cycle to reset.',
    )
    error.status = 402
    error.retryAfterSeconds = 86400
    throw error
  }

  const scanId = newestScanId()
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
    // Mock parity with the worker's SHA-256: recorded at initiate time so the
    // dedup lookup in mockSubmitScan is an equality match, like the real
    // scans_user_hash_complete_idx path.
    file_hash_sha256: pseudoSha256(
      payload.originalFilename || 'upload.jpg',
      payload.fileSizeBytes || 0,
    ),
    idempotency_key: idempotencyKey || null,
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

  // Hash-based dedup (mock parity with the worker-side real path): when this
  // file already produced a completed scan, the record completes immediately
  // and reuses the prior payload instead of sitting in the queue. `?dedup=1`
  // forces the hit against the first seeded completed scan so the reuse UX
  // can be demoed without uploading twice.
  const source = mockDedupForced()
    ? mockScanStore.find((candidate) => candidate.status === 'completed')
    : mockScanStore.find(
        (candidate) =>
          candidate.status === 'completed' &&
          candidate.id !== scan.id &&
          candidate.file_hash_sha256 &&
          candidate.file_hash_sha256 === scan.file_hash_sha256,
      )

  if (source) {
    const reusedAt = new Date().toISOString()
    const sourceReportId = `PRV-${source.id.slice(0, 8).toUpperCase()}`
    scan.status = 'completed'
    scan.verdict = source.verdict
    scan.result_payload = {
      ...(source.result_payload || {}),
      report: {
        ...(source.result_payload?.report || {}),
        report_id: `PRV-${scan.id.slice(0, 8).toUpperCase()}`,
        generated_at: reusedAt,
      },
      deduplicated_from: {
        source_scan_id: source.id,
        source_report_id: sourceReportId,
        reused_at: reusedAt,
      },
    }
    scan.completed_at = reusedAt
    scan.submitted_at = reusedAt
    persistScanStore()
    return {
      scan,
      deduplicated: true,
      sourceScanId: source.id,
      sourceReportId,
      reusedAt,
    }
  }

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

/**
 * mockGetAnalytics — team-scoped parity with the real GET /admin/analytics.
 *
 * With no team (or 'all') the static mockAnalytics is returned as-is. When a
 * team is active, the top-organizations table is recomputed from the scan
 * ledger — scans carry team_id and each scan's user resolves to an org via
 * the user registry — so the org rows show that team's actual usage split
 * (the same derivation the page used to perform client-side before the
 * backend grew real team scoping). team_breakdown always reflects per-team
 * scan counts from the ledger, matching the real payload.
 */
export async function mockGetAnalytics({ team } = {}) {
  await delay()
  maybeError()

  const teamBreakdown = buildTeamBreakdown()

  if (!team || team === 'all') {
    return { ...mockAnalytics, team_breakdown: teamBreakdown }
  }

  // Org registry lookups — mirrors the backend's orgByUser + org metadata.
  const orgByUser = new Map(mockUsers.map((u) => [u.id, u.org_id]))
  const orgMetaById = new Map(mockOrganizations.map((o) => [o.id, o]))
  const orgNameById = new Map(mockOrganizations.map((o) => [o.id, o.name]))

  const byOrg = {}
  for (const scan of mockScans) {
    if (!scan.team_id || scan.team_id !== team) continue
    const orgId = orgByUser.get(scan.user_id)
    if (!orgId) continue
    const entry = (byOrg[orgId] ||= { scans: 0, completed: 0 })
    entry.scans += 1
    if (scan.status === 'completed') entry.completed += 1
  }

  const topOrganizations = Object.entries(byOrg)
    .map(([orgId, stats]) => {
      const meta = orgMetaById.get(orgId) || { member_count: 0, storage_used_gb: 0 }
      return {
        id: orgId,
        name: orgNameById.get(orgId) || orgId,
        member_count: meta.member_count,
        scan_count: stats.scans,
        storage_used_gb: meta.storage_used_gb,
        completion_rate: stats.scans > 0 ? stats.completed / stats.scans : 0,
      }
    })
    .sort((a, b) => b.scan_count - a.scan_count)

  return { ...mockAnalytics, top_organizations: topOrganizations, team_breakdown: teamBreakdown }
}

/**
 * buildTeamBreakdown — per-team scan counts from the mock ledger, shaped as
 * [{ team_id, scans }] to match the real /admin/analytics payload.
 */
function buildTeamBreakdown() {
  const counts = new Map()
  for (const scan of mockScans) {
    if (scan.team_id) counts.set(scan.team_id, (counts.get(scan.team_id) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([team_id, scans]) => ({ team_id, scans }))
    .sort((a, b) => b.scans - a.scans)
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

export async function mockMarkNotificationRead(notificationId) {
  await delay()
  maybeError()

  const notification = mockNotifications.find((n) => n.id === notificationId)
  if (!notification) throw new Error('Notification not found.')

  notification.read = true
  return { ok: true, notification: { ...notification } }
}

export async function mockGetUnreadNotificationCount() {
  await delay()
  maybeError()

  // Counts against the live module store so it tracks mark-read persistence.
  return { unread: mockNotifications.filter((notification) => !notification.read).length }
}

export async function mockMarkAllNotificationsRead() {
  await delay()
  maybeError()

  let updated = 0
  for (const notification of mockNotifications) {
    if (!notification.read) {
      notification.read = true
      updated += 1
    }
  }
  return { ok: true, updated }
}

export async function mockGetBilling() {
  await delay()
  maybeError()

  const profile = { ...mockBillingProfile }

  // Dev-only forcing: report the plan at its quota limit so the Billing
  // exhausted banner renders for review (see mockQuotaExhausted), or at 90%
  // so the dashboard's ≥85% warning chip renders (see mockQuotaHigh). The
  // projection is recomputed from the effective usage so the forced meters
  // and the projection card always agree.
  let effectiveUsage = profile.usage

  if (mockQuotaExhausted()) {
    effectiveUsage = {
      ...profile.usage,
      scansUsed: profile.usage.scansLimit,
    }
  } else if (mockQuotaHigh()) {
    effectiveUsage = {
      ...profile.usage,
      scansUsed: Math.round(profile.usage.scansLimit * 0.9),
    }
  }

  profile.usage = {
    ...effectiveUsage,
    projection: projectScanUsage({
      used: effectiveUsage.scansUsed,
      limit: effectiveUsage.scansLimit,
      periodStart: effectiveUsage.periodStart,
      periodEnd: effectiveUsage.periodEnd,
    }),
  }

  return {
    profile,
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
  // correctly with the audit trail regardless of when each resolved. The real
  // /v1/account/activity mirrors this exact merge: auth_audit_events + resolved
  // admin_incidents rows, sorted and paginated the same way.
  const merged = [...buildIncidentActivityEvents(), ...mockAuditEvents].sort(
    (left, right) => new Date(right.created_at) - new Date(left.created_at),
  )
  return paginate(merged, { page, pageSize })
}

// Admin audit trail — mirrors GET /admin/audit-logs: the same optional
// filters (severity / actor / action / resourceType / search) are applied
// server-style, then the result is paginated with the same envelope the real
// endpoint returns ({ data, page, pageSize, total, totalPages }). The page
// also filters client-side, so these are additive — keeping mock and real
// paths in exact parity.
export async function mockGetAdminAuditLogs({
  page = 1,
  pageSize = 100,
  severity,
  actor,
  action,
  resourceType,
  search,
} = {}) {
  await delay()
  maybeError()

  let events = mockAuditEvents
  if (severity && severity !== 'all') {
    events = events.filter((event) => event.severity === severity)
  }
  if (actor && actor !== 'all') {
    events = events.filter((event) => event.actor_email === actor)
  }
  if (action && action !== 'all') {
    events = events.filter((event) => event.action === action)
  }
  if (resourceType && resourceType !== 'all') {
    events = events.filter((event) => event.resource_type === resourceType)
  }
  if (search && search.trim()) {
    const needle = search.trim().toLowerCase()
    events = events.filter((event) =>
      [event.actor_email, event.action, event.resource_type, event.resource_id]
        .some((value) => String(value ?? '').toLowerCase().includes(needle)),
    )
  }

  return paginate(events, { page, pageSize })
}

// ---------------------------------------------------------------------------
// Admin jobs / reports / roles / settings
// ---------------------------------------------------------------------------

// Live audit-event ids for retry/fail writes — the seeded mockAuditEvents are
// audit_0001…audit_0030, so session events use a separate prefix to stay
// unique across repeated mutations.
let mockAuditLiveSeq = 0

/**
 * currentMockActorEmail — reads the persisted mock session (same key the auth
 * layer writes) so mutations can attribute audit events to the actual admin.
 * Falls back to the seeded super_admin when no session exists (e.g. tests or
 * a stale page) rather than failing the action.
 */
function currentMockActorEmail() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
    if (stored?.user?.email) return stored.user.email
  } catch {
    // no window / localStorage in node, or malformed JSON — fall through
  }
  return mockUsers[0]?.email || 'system'
}

export async function mockGetAdminJobs() {
  await delay()
  maybeError()
  // Shallow copy: retry/fail mutate the module-level store, and a fresh array
  // reference on each fetch lets downstream useMemo-derived counts recompute
  // (statusCounts keys off the array identity).
  return { data: [...mockAdminJobs], total: mockAdminJobs.length }
}

/**
 * mockRetryJob — moves a failed job back to the queue (attempts bumped, error
 * cleared). Mutates the module-level store so the ledger reflects it for the
 * session, like mockRevokeSession. Mirrors POST /admin/jobs/:id/retry.
 */
export async function mockRetryJob(jobId) {
  await delay(250, 500)
  maybeError()
  const job = mockAdminJobs.find((j) => j.id === jobId)
  if (!job) throw new Error('Job not found.')
  if (job.status !== 'failed') {
    throw new Error('Only failed jobs can be re-queued.')
  }
  job.status = 'queued'
  job.progress = 0
  job.attempts = (job.attempts || 1) + 1
  job.error = null
  job.started_at = null
  job.completed_at = null
  // Surface the mutation in the audit trail (mirrors the real backend, which
  // writes a scan.retried event on POST /admin/jobs/:id/retry). Prepend so
  // the newest event lands first, matching the newest-first feed contract.
  mockAuditEvents.unshift({
    id: `audit_live_${Date.now()}_${String(++mockAuditLiveSeq).padStart(3, '0')}`,
    actor_email: currentMockActorEmail(),
    action: 'scan.retried',
    severity: AUDIT_SEVERITY_BY_ACTION['scan.retried'],
    resource_type: 'scan',
    resource_id: job.scan_id,
    details: { from: 'failed', to: 'queued' },
    created_at: new Date().toISOString(),
  })
  return { ok: true, job }
}

/**
 * mockFailJob — marks a non-terminal (queued/processing) job as failed, the
 * admin's kill-switch for stuck work. Mirrors POST /admin/jobs/:id/fail.
 */
export async function mockFailJob(jobId, reason = 'Manually failed by an administrator.') {
  await delay(250, 500)
  maybeError()
  const job = mockAdminJobs.find((j) => j.id === jobId)
  if (!job) throw new Error('Job not found.')
  if (job.status === 'completed') {
    throw new Error('Completed jobs cannot be failed.')
  }
  if (job.status === 'failed') {
    throw new Error('This job is already failed.')
  }
  const fromStatus = job.status
  job.status = 'failed'
  job.progress = Math.max(job.progress || 0, 40)
  job.error = reason
  job.completed_at = new Date().toISOString()
  // Same audit-trail treatment as retry — mirrors the backend's scan.failed
  // write on POST /admin/jobs/:id/fail, attributed to the acting admin.
  mockAuditEvents.unshift({
    id: `audit_live_${Date.now()}_${String(++mockAuditLiveSeq).padStart(3, '0')}`,
    actor_email: currentMockActorEmail(),
    action: 'scan.failed',
    severity: AUDIT_SEVERITY_BY_ACTION['scan.failed'],
    resource_type: 'scan',
    resource_id: job.scan_id,
    details: { from: fromStatus, to: 'failed', reason },
    created_at: new Date().toISOString(),
  })
  return { ok: true, job }
}

export async function mockGetAdminReports({ page = 1, pageSize = 20, team } = {}) {
  await delay()
  maybeError()
  let rows = mockReports
  if (team && team !== 'all') {
    rows = mockReports.filter((report) => report.team_id === team)
  }
  return paginate(rows, { page, pageSize })
}

export async function mockGetAdminRoles() {
  await delay()
  maybeError()
  return {
    roles: mockAdminRoles,
    scopes: mockRoleScopeMeta,
    members: mockRoleMembers,
    auditEvents: mockRoleAuditEvents,
  }
}

/**
 * mockUpdateRoleScopes — persists a full scope map for one role on the
 * module-level store (session-scoped, like mockRetryJob). Owner edits are
 * rejected with the same guard the real RolesService enforces (403 → Error).
 * Mirrors PATCH /admin/roles/:roleId/scopes.
 */
export async function mockUpdateRoleScopes(roleId, scopes) {
  await delay(300, 500)
  maybeError()
  const role = mockAdminRoles.find((r) => r.id === roleId)
  if (!role) throw new Error('Role not found.')
  if (!role.editable) {
    throw new Error('The Owner role is fixed by design and cannot be edited.')
  }
  for (const key of Object.keys(scopes)) {
    if (!mockRoleScopeMeta.some((scope) => scope.key === key)) {
      throw new Error(`Unknown scope "${key}".`)
    }
    if (typeof scopes[key] !== 'boolean') {
      throw new Error(`Scope "${key}" must be a boolean.`)
    }
  }
  role.scopes = { ...scopes }
  return { ok: true, roleId, scopes }
}

/**
 * mockReassignMemberRole — moves a member between RBAC roles, reconciling the
 * role member counts on the module-level store. Owner seat and Owner role are
 * guarded like the real service; an unchanged RBAC role returns changed:false
 * without mutating. Mirrors PATCH /admin/roles/members/:memberId.
 */
export async function mockReassignMemberRole(memberId, roleId) {
  await delay(300, 500)
  maybeError()
  const member = mockRoleMembers.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (member.role_id === 'role_owner') {
    throw new Error('The owner seat is fixed by design and cannot be reassigned.')
  }
  const role = mockAdminRoles.find((r) => r.id === roleId)
  if (!role) throw new Error('Role not found.')
  if (roleId === 'role_owner') {
    throw new Error('The Owner role cannot be assigned through the roster.')
  }
  if (member.role_id === roleId) {
    return { ok: true, memberId, roleId, changed: false }
  }

  const prevRoleId = member.role_id
  member.role_id = roleId

  const prevRole = mockAdminRoles.find((r) => r.id === prevRoleId)
  if (prevRole) prevRole.member_count = Math.max(0, (prevRole.member_count || 1) - 1)
  role.member_count = (role.member_count || 0) + 1

  return { ok: true, memberId, roleId }
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
// Webhooks (approved feature, 2026-08-04)
// ---------------------------------------------------------------------------

function makeWebhookId() {
  const maxNumeric = mockWebhooks.reduce((acc, wh) => {
    const n = Number(wh.id.replace(/\D/g, '')) || 0
    return n > acc ? n : acc
  }, 0)
  return `whk_${String(maxNumeric + 1).padStart(3, '0')}`
}

function makeDeliveryId(webhookId) {
  const deliveries = mockWebhookDeliveries[webhookId] || []
  const maxNumeric = deliveries.reduce((acc, d) => {
    const n = Number(d.id.replace(/\D/g, '')) || 0
    return n > acc ? n : acc
  }, 0)
  return `dlv_${String(maxNumeric + 1).padStart(3, '0')}`
}

function makeMockWebhookSecret() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let body = ''
  for (let i = 0; i < 40; i += 1) {
    body += chars[Math.floor(Math.random() * chars.length)]
  }
  return `whsec_live_${body}`
}

export async function mockGetWebhooks() {
  await delay()
  maybeError()
  return {
    endpoints: mockWebhooks,
    events: WEBHOOK_EVENTS,
    limits: mockWebhookLimits,
  }
}

export async function mockCreateWebhook({ name, url, events = [] } = {}) {
  await delay()
  maybeError()
  if (!name || !name.trim()) throw new Error('An endpoint name is required.')
  const trimmedUrl = (url || '').trim()
  if (!trimmedUrl) throw new Error('A destination URL is required.')
  if (!/^https?:\/\//.test(trimmedUrl)) {
    throw new Error('The destination URL must start with http:// or https://.')
  }
  if (events.length === 0) throw new Error('Select at least one event.')
  if (mockWebhooks.filter((w) => w.status !== 'deleted').length >= mockWebhookLimits.endpointsPerWorkspace) {
    throw new Error('Workspace endpoint limit reached.')
  }
  const endpoint = {
    id: makeWebhookId(),
    name: name.trim(),
    url: trimmedUrl,
    events,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastDeliveryAt: null,
    deliveryCount: 0,
    failureCount: 0,
    secretPrefix: 'whsec_live_••••',
  }
  mockWebhooks.unshift(endpoint)
  // The full signing secret is returned exactly once, on creation (like API
  // keys) — the store keeps only a prefix so it cannot be re-shown later.
  return { endpoint, secret: makeMockWebhookSecret() }
}

export async function mockUpdateWebhookStatus(webhookId, status) {
  await delay()
  maybeError()
  const endpoint = mockWebhooks.find((w) => w.id === webhookId)
  if (!endpoint) throw new Error('Webhook endpoint not found.')
  if (status !== 'active' && status !== 'paused') {
    throw new Error('Invalid webhook status.')
  }
  endpoint.status = status
  return { ok: true, webhookId, status }
}

export async function mockRotateWebhookSecret(webhookId) {
  await delay()
  maybeError()
  const endpoint = mockWebhooks.find((w) => w.id === webhookId)
  if (!endpoint) throw new Error('Webhook endpoint not found.')
  return { ok: true, webhookId, secret: makeMockWebhookSecret() }
}

export async function mockDeleteWebhook(webhookId) {
  await delay()
  maybeError()
  const index = mockWebhooks.findIndex((w) => w.id === webhookId)
  if (index === -1) throw new Error('Webhook endpoint not found.')
  mockWebhooks.splice(index, 1)
  delete mockWebhookDeliveries[webhookId]
  return { ok: true, webhookId }
}

export async function mockTestWebhook(webhookId) {
  await delay()
  maybeError()
  const endpoint = mockWebhooks.find((w) => w.id === webhookId)
  if (!endpoint) throw new Error('Webhook endpoint not found.')
  if (endpoint.status === 'paused') {
    throw new Error('Paused endpoints cannot be pinged — resume it first.')
  }
  const delivery = {
    id: makeDeliveryId(webhookId),
    event: 'scan.completed',
    status: 200,
    attemptedAt: new Date().toISOString(),
    latencyMs: Math.round(80 + Math.random() * 320),
    response: '{"ok":true,"accepted":true,"test":true}',
  }
  mockWebhookDeliveries[webhookId] = [
    delivery,
    ...(mockWebhookDeliveries[webhookId] || []),
  ]
  endpoint.lastDeliveryAt = delivery.attemptedAt
  endpoint.deliveryCount += 1
  return { ok: true, webhookId, delivery }
}

export async function mockGetWebhookDeliveries(webhookId) {
  await delay()
  maybeError()
  const endpoint = mockWebhooks.find((w) => w.id === webhookId)
  if (!endpoint) throw new Error('Webhook endpoint not found.')
  return { deliveries: mockWebhookDeliveries[webhookId] || [] }
}

// ---------------------------------------------------------------------------
// Telemetry (pre-Sentry crash reports)
// ---------------------------------------------------------------------------

/**
 * mockSubmitCrashReports — accepts the buffered crash records and reports the
 * batch accepted, mirroring POST /telemetry/errors (idempotent upsert on the
 * client id). No window access, so it is safe in node test environments.
 */
export async function mockSubmitCrashReports(records = []) {
  await delay(150, 350)
  if (!Array.isArray(records)) throw new Error('Crash reports must be an array.')
  return { accepted: records.length }
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
  // Parity with the real path: the raw token is issued once here (for the
  // share/email link); the backend persists only its SHA-256 hash.
  const token = `tok_${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 10)}`
  return { ok: true, invite, token, inviteLink: `/accept-invite?token=${token}` }
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

// ---------------------------------------------------------------------------
// Organization — member sessions (org-admin revocation)
// ---------------------------------------------------------------------------

/**
 * mockActorUserId — resolves the signed-in mock user from the persisted auth
 * session so the member-session surface can mark the actor's own current
 * session the way the real /v1/security/sessions path does.
 */
function mockActorUserId() {
  const email = currentMockActorEmail().toLowerCase()
  const user = mockUsers.find((u) => u.email.toLowerCase() === email)
  return user?.id || null
}

/**
 * mockGetMemberSessions — the member's tracked sessions with the team tag,
 * matching GET /v1/organization/members/:memberId/sessions. isCurrent is
 * recomputed from the signed-in actor (their own first session), never from
 * the static data.
 */
export async function mockGetMemberSessions(memberId) {
  await delay()
  maybeError()
  const member = mockOrgWorkspace.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  const actorId = mockActorUserId()
  const sessions = (mockMemberSessionsByUserId[memberId] || []).map((session, index) => ({
    ...session,
    isCurrent: memberId === actorId && index === 0,
  }))
  return { memberId, teamId: member.team || null, sessions }
}

/**
 * mockRevokeMemberSession — revokes one of a member's sessions (owner/admin
 * only; owner seat protected). Mirrors
 * DELETE /v1/organization/members/:memberId/sessions/:sessionId and persists
 * the revocation on the module-level store like mockRevokeSession.
 */
export async function mockRevokeMemberSession(memberId, sessionId) {
  await delay()
  maybeError()
  const member = mockOrgWorkspace.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (member.role === 'owner') throw new Error('The owner cannot be modified.')
  const sessions = mockMemberSessionsByUserId[memberId] || []
  const index = sessions.findIndex((s) => s.id === sessionId)
  if (index === -1) throw new Error('Session not found.')
  const actorId = mockActorUserId()
  if (memberId === actorId && index === 0) {
    throw new Error('You cannot revoke the current session.')
  }
  mockMemberSessionsByUserId[memberId] = sessions.filter((s) => s.id !== sessionId)
  return { ok: true, memberId, sessionId }
}

/**
 * mockRevokeMemberSessions — revokes every tracked session of a member except
 * the actor's own current one, returning the count. Mirrors
 * DELETE /v1/organization/members/:memberId/sessions.
 */
export async function mockRevokeMemberSessions(memberId) {
  await delay()
  maybeError()
  const member = mockOrgWorkspace.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (member.role === 'owner') throw new Error('The owner cannot be modified.')
  const sessions = mockMemberSessionsByUserId[memberId] || []
  const actorId = mockActorUserId()
  const revocable = sessions.filter((session, index) => !(memberId === actorId && index === 0))
  mockMemberSessionsByUserId[memberId] = sessions.filter((session) => !revocable.includes(session))
  return { ok: true, memberId, revoked: revocable.length }
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
