/**
 * mockDataParity.test.js — import-parity guard for the mock dataset
 * (src/lib/mockData.js).
 *
 * mockData.js is the shared mock fixture source (scans, admin, org, billing,
 * security, audit rows, + the AUDIT_SEVERITY_BY_ACTION map) consumed by the
 * mock API layer, page demos, and behavior tests. If a fixture rename/removal
 * misses an importer, mock mode silently breaks. Same drift protection as the
 * other parity guards.
 */
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as mockData from '../lib/mockData.js'
import { createImportParityGuard } from './importParity.js'

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// mockData.js's runtime export surface — the pinned public signature. Adding
// a fixture is a deliberate API change: extend this list in the same edit
// (order = declaration order in mockData.js).
const SURFACE = [
  'NOW_TS',
  'mockUserTeamById',
  'mockUsers',
  'mockOrganizations',
  'mockWaitlist',
  'mockScans',
  'mockReports',
  'AUDIT_SEVERITY_BY_ACTION',
  'mockAuditEvents',
  'mockFeatureFlags',
  'mockNotifications',
  'mockSystemHealth',
  'mockQueueSnapshot',
  'mockAnalytics',
  'mockSupportTickets',
  'mockMonitoring',
  'buildIncidentActivityEvents',
  'mockBillingProfile',
  'mockInvoices',
  'mockSecuritySettings',
  'mockMemberSessionsByUserId',
  'mockApiKeys',
  'API_KEY_SCOPES',
  'mockApiKeyLimits',
  'WEBHOOK_EVENTS',
  'mockWebhookLimits',
  'mockWebhooks',
  'mockWebhookDeliveries',
  'mockDocsContent',
  'mockHelpContent',
  'mockOrgWorkspace',
  'mockAdminJobs',
  'mockJobStatusCounts',
  'mockAdminRoles',
  'mockRoleScopeMeta',
  'mockRoleMembers',
  'mockRoleAuditEvents',
  'mockAdminSettings',
  'mockOrgTeams',
  'buildAdminDashboard',
]

const guard = createImportParityGuard({
  moduleFile: 'lib/mockData.js',
  specifierRe: /['"][^'"]*mockData(?:\.js)?['"]/,
  // The guard's own test file namespace-imports the module to pin its surface.
  skipPrefixes: ['lib/mockDataParity'],
})

describe('mockData.js export surface', () => {
  it('matches the pinned public signature (no silent rename/remove)', () => {
    expect(Object.keys(mockData)).toEqual(SURFACE)
  })
})

describe('repo-wide import parity', () => {
  it('every imported name exists in the mockData surface', () => {
    const importers = guard.scanImporters(SRC_DIR)
    expect(importers.length).toBeGreaterThan(10) // sanity: the walk found real importers

    const surface = new Set(Object.keys(mockData))
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
