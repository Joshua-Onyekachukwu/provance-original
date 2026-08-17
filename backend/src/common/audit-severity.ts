/**
 * audit-severity.ts — shared action → severity mapping.
 *
 * Mirrors the frontend mock's AUDIT_SEVERITY_BY_ACTION so the admin Audit
 * Logs page and the account Activity page badge events identically across
 * mock and real modes. Destructive/security actions are high; reads and
 * routine updates are low.
 */
export const AUDIT_SEVERITY_BY_ACTION: Record<string, string> = {
  'scan.failed': 'high',
  'waitlist.rejected': 'high',
  'team.member_removed': 'high',
  'api_key.revoked': 'high',
  'role.changed': 'high',
  'feature_flag.toggled': 'high',
  // A sign-in from a device/IP combo the ledger has never seen is a
  // security-relevant event even before the notifyOnNewDevice preference
  // decides whether to email — the audit trail always records it.
  'new_device_signin': 'high',
  // Supabase rejected a refresh token (replayed rotated token, expired, or
  // unknown) — the signature of token theft / replay attempts. Surfaced in
  // the Admin Audit Logs page as a high-severity security event.
  'refresh_token_rejected': 'high',
  // Repeated rejected refresh attempts tripped the refresh lockout — one
  // high-severity row per episode (written by RefreshLockoutInterceptor),
  // which also caps the refresh_token_rejected flood.
  'refresh_lockout': 'high',
  // An owner/admin revoked a member's session(s) — a security action on
  // someone else's devices, written by the org service (audit_logs) and the
  // security service (auth_audit_events feed).
  'member_session_revoked': 'high',
  'member_sessions_revoked': 'high',
  // Self-service device revocation (Security page) — the admin-trail row
  // (dotted form, matching the mock's seeded dialect). High because a
  // revoked device is a security-relevant state change; the feed event below
  // stays medium (the actor's own device, not an admin acting on someone
  // else's).
  'session.revoked': 'high',
  // Self-service device revocation feed event (auth_audit_events) — the
  // actor's own device, so medium rather than high.
  'session_revoked': 'medium',
  // Password change (SecurityService.changePassword → auth_audit_events feed;
  // the admin trail gets per-session session.revoked rows from the same call).
  'password_changed': 'low',
  'user.invited': 'medium',
  'waitlist.approved': 'medium',
  'waitlist.deferred': 'medium',
  'team.member_added': 'medium',
  'api_key.created': 'medium',
  'org.created': 'medium',
  'invite.accepted': 'medium',
  'scan.submitted': 'medium',
  'scan.retried': 'medium',
  // Real actions the services write themselves (underscore form — the mock's
  // dotted equivalents above are kept for parity with seeded/mock rows).
  'waitlist_reviewed': 'medium',
  'invite_created': 'medium',
  'user.activated': 'low',
  'scan.completed': 'low',
  'report.exported': 'low',
  'report.viewed': 'low',
  'settings.updated': 'low',
  'waitlist.reviewed': 'low',
};

export function auditSeverity(action: string): string {
  return AUDIT_SEVERITY_BY_ACTION[action] || 'low';
}
