// ---------------------------------------------------------------------------
// activityCategories.js — pure category → match predicates for the Activity
// page's tabs.
//
// Extracted from AppActivityPage.jsx so the filtering logic can be unit-tested
// in isolation. The same category semantics are mirrored server-side by
// GET /v1/account/activity (backend/src/account/account.service.ts), so this
// module is the single source of truth for what counts toward each tab on the
// frontend.
// ---------------------------------------------------------------------------

/**
 * Category tabs — action → category mapping, kept in one place.
 *
 * Each entry provides the tab label and a match predicate over an event row
 * ({ action, ... }). 'all' matches everything.
 *
 * The account/system lists intentionally include BOTH the dotted forms the
 * mock seeds (e.g. 'waitlist.reviewed', 'invite.accepted') and the underscore
 * forms real backend services write ('waitlist_reviewed', 'invite_created'),
 * so real-mode events badge and count identically to mock-mode events.
 */
// Literal action lists for the filtered categories — hoisted so the parity
// test can compare them EXACTLY against the backend's
// ACTIVITY_CATEGORY_ACTIONS (backend/src/account/activity-categories.ts).
export const ACTIVITY_CATEGORY_ACTION_LISTS = {
  account: [
    'user.invited',
    'user.activated',
    'settings.updated',
    'api_key.created',
    'api_key.revoked',
    'invite.accepted',
    'invite_created',
    // Session revocation — self-service (Security page) and org-admin paths.
    'session_revoked',
    'member_session_revoked',
  ],
  team: ['team.member_added', 'team.member_removed', 'role.changed', 'org.created'],
  system: [
    'waitlist.reviewed',
    'waitlist_reviewed',
    'waitlist.approved',
    'waitlist.rejected',
    'waitlist.deferred',
    'feature_flag.toggled',
    'incident.resolved',
  ],
}

export const ACTIVITY_CATEGORIES = {
  all: { label: 'All', match: () => true },
  scans: {
    label: 'Scans',
    match: (event) => event.action.startsWith('scan.'),
  },
  exports: {
    label: 'Exports',
    match: (event) => event.action.startsWith('report.'),
  },
  account: {
    label: 'Account',
    match: (event) => ACTIVITY_CATEGORY_ACTION_LISTS.account.includes(event.action),
  },
  team: {
    label: 'Team',
    match: (event) => ACTIVITY_CATEGORY_ACTION_LISTS.team.includes(event.action),
  },
  system: {
    label: 'System',
    match: (event) => ACTIVITY_CATEGORY_ACTION_LISTS.system.includes(event.action),
  },
}

/**
 * Resolve a category key to its definition, falling back to 'all' for
 * unknown or missing values (mirrors how the page treats a bad tab value).
 */
export function getActivityCategory(value) {
  return ACTIVITY_CATEGORIES[value] || ACTIVITY_CATEGORIES.all
}
