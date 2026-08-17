/**
 * apiParity.test.js — import-parity guard for the API surface
 * (src/lib/api.js).
 *
 * api.js is the single mock/real dispatch layer every workspace + admin page
 * talks to (40+ importers). If a consolidation renames or removes an exported
 * API function but misses an importer, the drift is silent until a page
 * renders. Same protection as the ui-barrel / chartGeometry / scanPresentation
 * guards: the runtime export surface is pinned here, and every importer's
 * names are checked against it.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as api from '../lib/api.js'
import { createImportParityGuard } from './importParity.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// api.js's runtime export surface — the pinned public signature. Adding an
// API function is a deliberate API change: extend this list in the same edit
// (order = declaration order in api.js).
const SURFACE = [
  'USE_MOCK',
  'USE_BETTER_AUTH',
  'setMemorySession',
  'getMemorySession',
  'clearMemorySession',
  'ensureSession',
  'submitWaitlistApplication',
  'signInWithPassword',
  'requestPasswordReset',
  'confirmPasswordReset',
  'acceptInvite',
  'signOut',
  'getCurrentViewer',
  'updateAccountProfile',
  'initiateScan',
  'submitScan',
  'listScans',
  'getScan',
  'getAdminDashboard',
  'reviewWaitlistApplication',
  'createAccessInvite',
  'getAdminUsers',
  'getOrganizations',
  'getFeatureFlags',
  'updateFeatureFlag',
  'getReports',
  'getReport',
  'exportReportPdf',
  'getAnalytics',
  'getSystemHealth',
  'getMonitoring',
  'getQueueSnapshot',
  'getNotifications',
  'getUnreadNotificationCount',
  'markNotificationRead',
  'markAllNotificationsRead',
  'getAuditLogs',
  'getBilling',
  'getInvoices',
  'getSecuritySettings',
  'changePassword',
  'revokeSession',
  'updateSecuritySetting',
  'getApiKeys',
  'createApiKey',
  'revokeApiKey',
  'regenerateApiKey',
  'getWebhooks',
  'createWebhook',
  'updateWebhookStatus',
  'rotateWebhookSecret',
  'deleteWebhook',
  'testWebhook',
  'getWebhookDeliveries',
  'submitCrashReports',
  'getHelpContent',
  'getOrganization',
  'inviteMember',
  'updateMemberRole',
  'updateMemberTeam',
  'removeMember',
  'cancelInvite',
  'getMemberSessions',
  'revokeMemberSession',
  'revokeMemberSessions',
  'getSupportTickets',
  'getActivityLogs',
  'getAdminAuditLogs',
  'getAdminJobs',
  'retryJob',
  'failJob',
  'getAdminReports',
  'getAdminRoles',
  'updateRoleScopes',
  'reassignMemberRole',
  'getAdminSettings',
  'getUserProfile',
  'updateUserRole',
  'toggleTeamAccess',
]

const guard = createImportParityGuard({
  moduleFile: 'lib/api.js',
  specifierRe: /['"][^'"]*lib\/api(?:\.js)?['"]/,
  // The guard's own test file namespace-imports the module to pin its surface.
  skipPrefixes: ['lib/apiParity'],
})

describe('api.js export surface', () => {
  it('matches the pinned public signature (no silent rename/remove)', () => {
    expect(Object.keys(api)).toEqual(SURFACE)
  })
})

describe('repo-wide import parity', () => {
  it('every imported name exists in the api surface', () => {
    const importers = guard.scanImporters(SRC_DIR)
    expect(importers.length).toBeGreaterThan(25) // sanity: the walk found real importers

    const surface = new Set(Object.keys(api))
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
