import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ADMIN_ROLES,
  ADMIN_SCOPES,
  ORG_ROLE_TO_RBAC,
  RBAC_TO_ORG_ROLE,
  type RoleId,
  type ScopeKey,
} from './roles.constants';

type MembershipRow = {
  organization_id: string;
  user_id: string;
  role: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  email: string;
};

type RoleScopeRow = {
  role_id: string;
  scope_key: string;
  enabled: boolean;
};

type RoleAuditRow = {
  id: string;
  actor_email: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  created_at: string;
};

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function readDetailsDescription(details: unknown): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }
  const description = (details as { description?: unknown }).description;
  return typeof description === 'string' ? description : null;
}

const SCOPE_KEYS: ScopeKey[] = ADMIN_SCOPES.map((scope) => scope.key);

/**
 * RolesService — the admin Roles & Permissions surface.
 *
 * list()  — the RBAC matrix (roles + scope catalog + members + audit trail),
 *           merging persisted role_scopes overrides over the ADMIN_ROLES
 *           defaults (DB wins) so new scope keys work without a migration.
 * updateRoleScopes() — persists a full scope map for one role, guarded so the
 *           Owner role (editable: false) can never be edited, then records a
 *           role.scope_updated audit event.
 * reassignMember() — moves a member between RBAC roles through the
 *           organization_members table, guarding the owner seat and the
 *           Owner role, and records a role.member_assigned audit event.
 *
 * The service-role admin client writes everything (RLS bypassed); reads fall
 * back to defaults when the role_scopes table is absent (migration 0016 not
 * applied yet), matching the monitoring/incidents degradation precedent.
 */
@Injectable()
export class RolesService {
  private readonly scopesTable: string;
  private readonly membersTable: string;
  private readonly profilesTable: string;
  private readonly auditTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    this.scopesTable =
      configService.get<string>('SUPABASE_ROLE_SCOPES_TABLE') || 'role_scopes';
    this.membersTable =
      configService.get<string>('SUPABASE_ORGANIZATION_MEMBERS_TABLE') ||
      'organization_members';
    this.profilesTable =
      configService.get<string>('SUPABASE_PROFILES_TABLE') || 'profiles';
    this.auditTable =
      configService.get<string>('SUPABASE_AUDIT_LOGS_TABLE') || 'audit_logs';
  }

  // -------------------------------------------------------------------------
  // GET /admin/roles
  // -------------------------------------------------------------------------

  async list() {
    const adminClient = this.requireClient();

    const [memberResult, auditResult, scopeResult] = await Promise.all([
      adminClient
        .from(this.membersTable)
        .select('organization_id,user_id,role')
        .eq('status', 'active'),
      adminClient
        .from(this.auditTable)
        .select('id,actor_email,action,entity_type,entity_id,details,created_at')
        .ilike('action', 'role.%')
        .order('created_at', { ascending: false })
        .limit(50),
      adminClient
        .from(this.scopesTable)
        .select('role_id,scope_key,enabled'),
    ]);

    if (memberResult.error || auditResult.error) {
      throw new ServiceUnavailableException('Failed to load roles.');
    }

    // Best-effort: without migration 0016 the role_scopes query errors, so
    // fall back to the ADMIN_ROLES defaults rather than 503ing the whole page.
    const scopeRows = (scopeResult.error
      ? []
      : scopeResult.data ?? []) as RoleScopeRow[];

    const members = (memberResult.data ?? []) as MembershipRow[];
    const userIds = members.map((member) => member.user_id);

    let profiles: ProfileRow[] = [];
    if (userIds.length > 0) {
      const { data, error } = await adminClient
        .from(this.profilesTable)
        .select('user_id,display_name,email')
        .in('user_id', userIds);
      if (error) {
        throw new ServiceUnavailableException('Failed to load role members.');
      }
      profiles = (data ?? []) as ProfileRow[];
    }

    const profileById = new Map(
      profiles.map((profile) => [profile.user_id, profile]),
    );
    const roleMembers = members
      .filter((member) => profileById.has(member.user_id))
      .map((member) => {
        const profile = profileById.get(member.user_id)!;
        return {
          id: member.user_id,
          name: profile.display_name,
          email: profile.email,
          role_id: ORG_ROLE_TO_RBAC[member.role] ?? 'role_analyst',
          avatar: initials(profile.display_name),
        };
      });

    const memberCounts = roleMembers.reduce<Record<string, number>>(
      (acc, member) => {
        acc[member.role_id] = (acc[member.role_id] || 0) + 1;
        return acc;
      },
      {},
    );

    // Persisted overrides win over the defaults (DB wins, key by key).
    const overrides = new Map<string, Record<string, boolean>>();
    for (const row of scopeRows) {
      const map = overrides.get(row.role_id) ?? {};
      map[row.scope_key] = row.enabled;
      overrides.set(row.role_id, map);
    }

    const roles = ADMIN_ROLES.map((role) => ({
      ...role,
      scopes: { ...role.scopes, ...(overrides.get(role.id) ?? {}) },
      member_count: memberCounts[role.id] ?? 0,
    }));

    const auditRows = (auditResult.data ?? []) as RoleAuditRow[];
    const auditEvents = auditRows.map((row) => ({
      id: row.id,
      action: row.action,
      actor_email: row.actor_email,
      description: readDetailsDescription(row.details),
      created_at: row.created_at,
    }));

    return {
      roles,
      scopes: ADMIN_SCOPES,
      members: roleMembers,
      auditEvents,
    };
  }

  // -------------------------------------------------------------------------
  // PATCH /admin/roles/:roleId/scopes
  // -------------------------------------------------------------------------

  async updateRoleScopes(
    user: CurrentUserPayload,
    roleId: string,
    scopes: Record<string, boolean>,
  ) {
    const adminClient = this.requireClient();

    const actorEmail = this.requireActor(user);
    const role = ADMIN_ROLES.find((candidate) => candidate.id === roleId);
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    if (!role.editable) {
      throw new ForbiddenException(
        'The Owner role is fixed by design and cannot be edited.',
      );
    }

    for (const key of Object.keys(scopes)) {
      if (!SCOPE_KEYS.includes(key as ScopeKey)) {
        throw new BadRequestException(`Unknown scope "${key}".`);
      }
      if (typeof scopes[key] !== 'boolean') {
        throw new BadRequestException(`Scope "${key}" must be a boolean.`);
      }
    }

    const deleteResult = await adminClient
      .from(this.scopesTable)
      .delete()
      .eq('role_id', roleId);
    if (deleteResult.error) {
      throw new ServiceUnavailableException('Failed to save role scopes.');
    }

    const scopeKeys = Object.keys(scopes);
    if (scopeKeys.length > 0) {
      const rows = scopeKeys.map((key) => ({
        role_id: roleId,
        scope_key: key,
        enabled: scopes[key],
      }));
      const insertResult = await adminClient
        .from(this.scopesTable)
        .insert(rows);
      if (insertResult.error) {
        throw new ServiceUnavailableException('Failed to save role scopes.');
      }
    }

    const auditResult = await adminClient.from(this.auditTable).insert({
      actor_email: actorEmail,
      action: 'role.scope_updated',
      severity: 'medium',
      entity_type: 'role',
      entity_id: roleId,
      details: { role_id: roleId, scopes },
    });
    if (auditResult.error) {
      throw new ServiceUnavailableException('Failed to record the audit event.');
    }

    return { ok: true, roleId, scopes };
  }

  // -------------------------------------------------------------------------
  // PATCH /admin/roles/members/:memberId
  // -------------------------------------------------------------------------

  async reassignMember(
    user: CurrentUserPayload,
    memberId: string,
    roleId: string,
  ) {
    const adminClient = this.requireClient();

    const actorEmail = this.requireActor(user);
    const role = ADMIN_ROLES.find((candidate) => candidate.id === roleId);
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    if (roleId === 'role_owner') {
      throw new ForbiddenException(
        'The Owner role cannot be assigned through the roster.',
      );
    }

    const { data: member, error: memberError } = await adminClient
      .from(this.membersTable)
      .select('organization_id,user_id,role')
      .eq('user_id', memberId)
      .eq('status', 'active')
      .maybeSingle();

    if (memberError) {
      throw new ServiceUnavailableException('Failed to load the member.');
    }
    if (!member) {
      throw new NotFoundException('Member not found.');
    }
    if (member.role === 'owner') {
      throw new ForbiddenException(
        'The owner seat is fixed by design and cannot be reassigned.',
      );
    }

    const fromRoleId: RoleId =
      ORG_ROLE_TO_RBAC[member.role] ?? 'role_analyst';
    if (fromRoleId === roleId) {
      // No-op move (e.g. analyst → viewer both collapse to org 'member').
      return { ok: true, memberId, roleId, changed: false };
    }

    // roleId was validated against ADMIN_ROLES above, so the cast is safe.
    const orgRole = RBAC_TO_ORG_ROLE[roleId as RoleId];

    const updateResult = await adminClient
      .from(this.membersTable)
      .update({ role: orgRole })
      .eq('organization_id', member.organization_id)
      .eq('user_id', memberId);
    if (updateResult.error) {
      throw new ServiceUnavailableException('Failed to reassign the member.');
    }

    const auditResult = await adminClient.from(this.auditTable).insert({
      actor_email: actorEmail,
      action: 'role.member_assigned',
      severity: 'medium',
      entity_type: 'role',
      entity_id: roleId,
      details: {
        member_id: memberId,
        from_role_id: fromRoleId,
        to_role_id: roleId,
        from_role: member.role,
        to_role: orgRole,
      },
    });
    if (auditResult.error) {
      throw new ServiceUnavailableException(
        'Failed to record the audit event.',
      );
    }

    return { ok: true, memberId, roleId };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private requireClient() {
    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }
    return adminClient;
  }

  private requireActor(user: CurrentUserPayload): string {
    const actorEmail = user.email?.trim();
    if (!actorEmail) {
      throw new BadRequestException(
        'An authenticated user is required to change roles.',
      );
    }
    return actorEmail;
  }
}
