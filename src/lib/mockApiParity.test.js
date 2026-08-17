/**
 * mockApiParity.test.js — import-parity guard for the mock API layer
 * (src/lib/mockApi.js).
 *
 * mockApi.js implements every API function's mock twin (69 exports), consumed
 * by api.js's USE_MOCK branches and by the mock-behavior test suites. If a
 * mock rename/removal misses an importer, mock mode silently breaks while
 * real mode stays green. Same drift protection as the other parity guards.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as mockApi from '../lib/mockApi.js'
import { createImportParityGuard } from './importParity.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// mockApi.js's runtime export surface — the pinned public signature. Adding a
// mock function is a deliberate API change: extend this list in the same edit
// (order = declaration order in mockApi.js).
const SURFACE = [
  'mockGetUserProfile',
  'mockUpdateUserRole',
  'mockToggleTeamAccess',
  'mockSignInWithPassword',
  'mockRecordNewDeviceSignIn',
  'mockGetCurrentViewer',
  'mockRequestPasswordReset',
  'mockConfirmPasswordReset',
  'mockAcceptInvite',
  'mockGetAdminDashboard',
  'mockGetAdminUsers',
  'mockGetOrganizations',
  'mockGetFeatureFlags',
  'mockUpdateFeatureFlag',
  'mockReviewWaitlistApplication',
  'mockCreateAccessInvite',
  'mockListScans',
  'mockGetScan',
  'mockInitiateScan',
  'mockSubmitScan',
  'mockGetQueueSnapshot',
  'mockGetReports',
  'mockGetAnalytics',
  'mockGetSystemHealth',
  'mockGetMonitoring',
  'mockGetNotifications',
  'mockMarkNotificationRead',
  'mockGetUnreadNotificationCount',
  'mockMarkAllNotificationsRead',
  'mockGetBilling',
  'mockGetInvoices',
  'mockGetAuditLogs',
  'mockGetSupportTickets',
  'mockGetActivityLogs',
  'mockGetAdminAuditLogs',
  'mockGetAdminJobs',
  'mockRetryJob',
  'mockFailJob',
  'mockGetAdminReports',
  'mockGetAdminRoles',
  'mockUpdateRoleScopes',
  'mockReassignMemberRole',
  'mockGetAdminSettings',
  'mockGetSecuritySettings',
  'mockChangePassword',
  'mockRevokeSession',
  'mockGetApiKeys',
  'mockCreateApiKey',
  'mockRevokeApiKey',
  'mockRegenerateApiKey',
  'mockGetWebhooks',
  'mockCreateWebhook',
  'mockUpdateWebhookStatus',
  'mockRotateWebhookSecret',
  'mockDeleteWebhook',
  'mockTestWebhook',
  'mockGetWebhookDeliveries',
  'mockSubmitCrashReports',
  'mockGetHelpContent',
  'mockGetOrganization',
  'mockInviteMember',
  'mockUpdateMemberTeam',
  'mockUpdateMemberRole',
  'mockRemoveMember',
  'mockCancelInvite',
  'mockGetMemberSessions',
  'mockRevokeMemberSession',
  'mockRevokeMemberSessions',
  'mockUpdateSecuritySetting',
]

const guard = createImportParityGuard({
  moduleFile: 'lib/mockApi.js',
  specifierRe: /['"][^'"]*mockApi(?:\.js)?['"]/,
  // The guard's own test file namespace-imports the module to pin its surface.
  skipPrefixes: ['lib/mockApiParity'],
})

describe('mockApi.js export surface', () => {
  it('matches the pinned public signature (no silent rename/remove)', () => {
    expect(Object.keys(mockApi)).toEqual(SURFACE)
  })
})

describe('repo-wide import parity', () => {
  it('every imported name exists in the mockApi surface', () => {
    const importers = guard.scanImporters(SRC_DIR)
    expect(importers.length).toBeGreaterThan(5) // sanity: the walk found real importers

    const surface = new Set(Object.keys(mockApi))
    const missing = []
    for (const { file, names } of importers) {
      for (const name of names) {
        if (!surface.has(name)) missing.push(`${file} → ${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('no importer uses an unsupported (namespace/default) import shape', () => {
    const unsupported = guard
      .scanImporters(SRC_DIR)
      .filter((entry) => entry.unsupported)
      .map((entry) => entry.file)
    expect(unsupported).toEqual([])
  })
})
