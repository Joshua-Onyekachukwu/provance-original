/**
 * interface.js — the Backend interface manifest (Backend seam design, Phase 1).
 *
 * This is the single source of truth for the api.js operation surface, grouped
 * by domain exactly as docs/engineering/BACKEND_SEAM_DESIGN.md §3 defines it.
 * Every method listed here must exist as an exported function on the api.js
 * facade — enforced by backendParity.test.js — and every adapter extracted in
 * Phases 2–4 must implement every method (the parity guard activates the
 * per-adapter check the moment an adapter file lands in this directory).
 *
 * The interface deliberately EXCLUDES the mode constants (USE_MOCK,
 * USE_BETTER_AUTH): those are adapter-ownership decisions made at boot time,
 * not interface operations (§3).
 *
 * Adding an interface method is a deliberate API change: add it to the
 * domain group here, to api.js, and to the apiParity SURFACE list in the
 * same edit.
 */
export const BACKEND_INTERFACE = {
  session: [
    'ensureSession',
    'setMemorySession',
    'getMemorySession',
    'clearMemorySession',
  ],
  auth: [
    'signInWithPassword',
    'signOut',
    'getCurrentViewer',
    'requestPasswordReset',
    'confirmPasswordReset',
    'acceptInvite',
  ],
  waitlist: [
    'submitWaitlistApplication',
    'reviewWaitlistApplication',
    'createAccessInvite',
  ],
  scans: [
    'initiateScan',
    'submitScan',
    'listScans',
    'getScan',
  ],
  reports: [
    'getReports',
    'getReport',
    'exportReportPdf',
  ],
  'admin-dashboard': [
    'getAdminDashboard',
    'getAdminUsers',
    'getOrganizations',
    'getFeatureFlags',
    'updateFeatureFlag',
  ],
  'admin-analytics': [
    'getAnalytics',
    'getSystemHealth',
    'getMonitoring',
    'getQueueSnapshot',
  ],
  notifications: [
    'getNotifications',
    'getUnreadNotificationCount',
    'markNotificationRead',
    'markAllNotificationsRead',
  ],
  audit: [
    'getAuditLogs',
    'getActivityLogs',
    'getAdminAuditLogs',
  ],
  billing: [
    'getBilling',
    'getInvoices',
  ],
  security: [
    'getSecuritySettings',
    'changePassword',
    'revokeSession',
    'updateSecuritySetting',
  ],
  account: [
    'updateAccountProfile',
    'getUserProfile',
    'updateUserRole',
    'toggleTeamAccess',
  ],
  'admin-roles': [
    'getAdminRoles',
    'updateRoleScopes',
    'reassignMemberRole',
    'getAdminSettings',
  ],
  org: [
    'getOrganization',
    'inviteMember',
    'updateMemberRole',
    'updateMemberTeam',
    'removeMember',
    'cancelInvite',
    'getMemberSessions',
    'revokeMemberSession',
    'revokeMemberSessions',
  ],
  'api-keys': [
    'getApiKeys',
    'createApiKey',
    'revokeApiKey',
    'regenerateApiKey',
  ],
  webhooks: [
    'getWebhooks',
    'createWebhook',
    'updateWebhookStatus',
    'rotateWebhookSecret',
    'deleteWebhook',
    'testWebhook',
    'getWebhookDeliveries',
  ],
  'admin-jobs': [
    'getAdminJobs',
    'retryJob',
    'failJob',
    'getAdminReports',
  ],
  support: [
    'getSupportTickets',
    'getHelpContent',
    'submitCrashReports',
  ],
}

/** Flat, ordered list of every interface method (derived from the domains). */
export const BACKEND_INTERFACE_METHODS = Object.values(BACKEND_INTERFACE).flat()
