/**
 * roles.constants.ts — the RBAC role matrix, scope catalog, and vocabulary
 * mappings for the Roles & Permissions surface (mirrors mockAdminRoles /
 * mockRoleScopeMeta). These were previously declared inside admin.service.ts;
 * the roles module now owns them so list, scope updates, and reassignment
 * share one source of truth.
 */

/**
 * ADMIN_SCOPES — the static scope catalog for the Roles & Permissions page
 * (mirror of mockRoleScopeMeta). RBAC scope definitions are product config,
 * not user data, so they are declared here rather than derived.
 */
export const ADMIN_SCOPES = [
  { key: 'scans.read', label: 'Read scans', group: 'Verification' },
  { key: 'scans.create', label: 'Submit verifications', group: 'Verification' },
  { key: 'scans.revoke', label: 'Revoke scans', group: 'Verification' },
  { key: 'reports.read', label: 'Read reports', group: 'Reports' },
  { key: 'reports.export', label: 'Export reports', group: 'Reports' },
  { key: 'members.manage', label: 'Manage members', group: 'Organization' },
  { key: 'roles.manage', label: 'Manage roles', group: 'Organization' },
  { key: 'billing.manage', label: 'Manage billing', group: 'Organization' },
  { key: 'flags.manage', label: 'Manage feature flags', group: 'Platform' },
  { key: 'audit.read', label: 'Read audit logs', group: 'Platform' },
] as const;

export type ScopeKey = (typeof ADMIN_SCOPES)[number]['key'];

/**
 * ADMIN_ROLES — the static RBAC role matrix for the Roles & Permissions page
 * (mirror of mockAdminRoles). Scope grants are product config; member_count is
 * computed from real org membership at request time (RolesService.list) and
 * persisted scope overrides are merged on top (DB wins).
 */
export const ADMIN_ROLES = [
  {
    id: 'role_owner',
    name: 'Owner',
    description:
      'Full control — billing, membership, security, and all platform configuration.',
    scope_summary: 'Everything',
    scopes: {
      'scans.read': true,
      'scans.create': true,
      'scans.revoke': true,
      'reports.read': true,
      'reports.export': true,
      'members.manage': true,
      'roles.manage': true,
      'billing.manage': true,
      'flags.manage': true,
      'audit.read': true,
    },
    editable: false,
  },
  {
    id: 'role_admin',
    name: 'Admin',
    description:
      'Operational control — members, feature flags, and verification oversight.',
    scope_summary: 'Ops + members',
    scopes: {
      'scans.read': true,
      'scans.create': true,
      'scans.revoke': true,
      'reports.read': true,
      'reports.export': true,
      'members.manage': true,
      'roles.manage': false,
      'billing.manage': false,
      'flags.manage': true,
      'audit.read': true,
    },
    editable: true,
  },
  {
    id: 'role_analyst',
    name: 'Analyst',
    description:
      'Submit and review verifications — read and export reports, no admin controls.',
    scope_summary: 'Verify + export',
    scopes: {
      'scans.read': true,
      'scans.create': true,
      'scans.revoke': false,
      'reports.read': true,
      'reports.export': true,
      'members.manage': false,
      'roles.manage': false,
      'billing.manage': false,
      'flags.manage': false,
      'audit.read': false,
    },
    editable: true,
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description:
      'Read-only access to scans and reports for compliance and oversight.',
    scope_summary: 'Read-only',
    scopes: {
      'scans.read': true,
      'scans.create': false,
      'scans.revoke': false,
      'reports.read': true,
      'reports.export': false,
      'members.manage': false,
      'roles.manage': false,
      'billing.manage': false,
      'flags.manage': false,
      'audit.read': true,
    },
    editable: true,
  },
] as const;

export type RoleId = (typeof ADMIN_ROLES)[number]['id'];

/** Canonical display order for the Roles page (Owner first). */
export const ROLE_ORDER: RoleId[] = [
  'role_owner',
  'role_admin',
  'role_analyst',
  'role_viewer',
];

/**
 * ORG_ROLE_TO_RBAC — maps the organization_members.role vocabulary
 * (owner/admin/member) onto the RBAC role ids the Roles page renders
 * (role_owner/role_admin/role_analyst). There is no natural source for the
 * read-only Viewer role in the membership table, so it reports 0 members.
 */
export const ORG_ROLE_TO_RBAC: Record<string, RoleId> = {
  owner: 'role_owner',
  admin: 'role_admin',
  member: 'role_analyst',
};

/**
 * RBAC_TO_ORG_ROLE — the reverse mapping for reassignment. The membership
 * table only stores owner/admin/member, so role_analyst and role_viewer both
 * collapse to 'member' at the org level (the audit event keeps the full RBAC
 * move in its details).
 */
export const RBAC_TO_ORG_ROLE: Record<RoleId, string> = {
  role_owner: 'owner',
  role_admin: 'admin',
  role_analyst: 'member',
  role_viewer: 'member',
};
