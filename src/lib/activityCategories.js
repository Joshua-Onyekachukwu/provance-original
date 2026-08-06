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
    match: (event) =>
      [
        'user.invited',
        'user.activated',
        'settings.updated',
        'api_key.created',
        'api_key.revoked',
        'invite.accepted',
        'invite_created',
      ].includes(event.action),
  },
  team: {
    label: 'Team',
    match: (event) =>
      [
        'team.member_added',
        'team.member_removed',
        'role.changed',
        'org.created',
      ].includes(event.action),
  },
  system: {
    label: 'System',
    match: (event) =>
      [
        'waitlist.reviewed',
        'waitlist_reviewed',
        'waitlist.approved',
        'waitlist.rejected',
        'waitlist.deferred',
        'feature_flag.toggled',
        'incident.resolved',
      ].includes(event.action),
  },
}

/**
 * Resolve a category key to its definition, falling back to 'all' for
 * unknown or missing values (mirrors how the page treats a bad tab value).
 */
export function getActivityCategory(value) {
  return ACTIVITY_CATEGORIES[value] || ACTIVITY_CATEGORIES.all
}
