/**
 * activity-categories.ts — the server-side activity category contract.
 *
 * Kept free of any NestJS imports so the frontend's vitest parity test can
 * import it directly (no DI graph) and lock the mock/real category semantics
 * against this file. Mirrors the frontend's ACTIVITY_CATEGORIES in
 * src/lib/activityCategories.js — the parity test enforces that they can't
 * drift.
 *
 * The account/system lists intentionally include BOTH the dotted forms the
 * mock seeds (e.g. 'waitlist.reviewed', 'invite.accepted') and the underscore
 * forms real backend services write ('waitlist_reviewed', 'invite_created'),
 * so real-mode events badge and count identically to mock-mode events.
 */

export type ActivityCategory =
  | 'all'
  | 'scans'
  | 'exports'
  | 'account'
  | 'team'
  | 'system';

export const ACTIVITY_CATEGORY_ACTIONS: Record<
  Exclude<ActivityCategory, 'all' | 'scans' | 'exports'>,
  string[]
> = {
  account: [
    'user.invited',
    'user.activated',
    'settings.updated',
    'api_key.created',
    'api_key.revoked',
    'invite.accepted',
    // Real services write the underscore form (see audit-severity.ts).
    'invite_created',
  ],
  team: ['team.member_added', 'team.member_removed', 'role.changed', 'org.created'],
  system: [
    'waitlist.reviewed',
    'waitlist.approved',
    'waitlist.rejected',
    'waitlist.deferred',
    'feature_flag.toggled',
    // Incident events live in admin_incidents, not the audit table, but they
    // count as system on the Activity tabs (see the frontend category match).
    'incident.resolved',
    // Real services write the underscore form (see audit-severity.ts).
    'waitlist_reviewed',
  ],
};

/**
 * The scans/exports categories are LIKE patterns over the action column
 * instead of explicit lists — the frontend mirrors them with
 * action.startsWith(prefix).
 */
export const ACTIVITY_CATEGORY_LIKE_PATTERNS: Record<
  'scans' | 'exports',
  string
> = {
  scans: 'scan.%',
  exports: 'report.%',
};
