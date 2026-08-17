import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { RolesService } from './roles.service';

const ADMIN_USER: CurrentUserPayload = {
  id: 'user-admin',
  email: 'founder.admin@provance.io',
};

/**
 * Chainable supabase-js-style query builder for the roles chains (the
 * notifications.service.spec.ts convention): every awaited chain consumes one
 * entry from the plan in call order, and the thenable resolves through the
 * plan. `maybeSingle()` resolves directly (Promise), matching supabase-js.
 */
function createAdminClient(plan: Array<Record<string, unknown>>) {
  let step = 0;
  const next = () => {
    const result = plan[step++];
    if (result === undefined) {
      throw new Error('Mock query plan exhausted — plan/sequence mismatch');
    }
    return result;
  };

  const builder = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    ilike: jest.fn(() => builder),
    in: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(next())),
    then(resolve: (value: Record<string, unknown>) => void) {
      resolve(next());
      return undefined;
    },
  } as const;

  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createConfigService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    SUPABASE_ROLE_SCOPES_TABLE: 'role_scopes',
    SUPABASE_ORGANIZATION_MEMBERS_TABLE: 'organization_members',
    SUPABASE_PROFILES_TABLE: 'profiles',
    SUPABASE_AUDIT_LOGS_TABLE: 'audit_logs',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createService(client: unknown, config?: ConfigService) {
  return new RolesService(
    {
      getAdminClient: jest.fn(() => client),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const memberRows = [
  { organization_id: 'org-1', user_id: 'user-1', role: 'owner' },
  { organization_id: 'org-1', user_id: 'user-2', role: 'admin' },
  { organization_id: 'org-1', user_id: 'user-3', role: 'member' },
];

const profileRows = [
  {
    user_id: 'user-1',
    display_name: 'Joshua Onyekachukwu',
    email: 'joshua@provance.io',
  },
  { user_id: 'user-2', display_name: 'Amina Sow', email: 'amina@provance.io' },
  {
    user_id: 'user-3',
    display_name: 'David Okafor',
    email: 'david@trustedmedia.ng',
  },
];

const roleAuditRows = [
  {
    id: 'ra-1',
    actor_email: 'amina@provance.io',
    action: 'role.scope_updated',
    entity_type: 'role',
    entity_id: 'role_admin',
    details: { description: 'Admin role — enabled reports.export.' },
    created_at: '2026-08-04T09:00:00.000Z',
  },
];

// Persisted overrides (migration 0016): flip two defaults so the merge is
// observable — Admin loses reports.export, Analyst gains scans.revoke.
const roleScopeRows = [
  { role_id: 'role_admin', scope_key: 'reports.export', enabled: false },
  { role_id: 'role_analyst', scope_key: 'scans.revoke', enabled: true },
];

describe('RolesService', () => {
  describe('list', () => {
    it('builds the RBAC matrix with real counts, scope overrides, and audit events', async () => {
      const client = createAdminClient([
        { data: memberRows, error: null },
        { data: roleAuditRows, error: null },
        { data: roleScopeRows, error: null },
        { data: profileRows, error: null },
      ]);
      const service = createService(client);

      const result = await service.list();

      expect(client.from).toHaveBeenCalledWith('role_scopes');

      expect(result.roles).toHaveLength(4);
      const owner = result.roles.find((role) => role.id === 'role_owner');
      const admin = result.roles.find((role) => role.id === 'role_admin');
      const analyst = result.roles.find((role) => role.id === 'role_analyst');
      const viewer = result.roles.find((role) => role.id === 'role_viewer');
      expect(owner?.member_count).toBe(1);
      expect(admin?.member_count).toBe(1);
      expect(analyst?.member_count).toBe(1);
      expect(viewer?.member_count).toBe(0);

      // Persisted overrides win over the defaults (DB wins).
      expect(admin?.scopes['reports.export']).toBe(false);
      expect(analyst?.scopes['scans.revoke']).toBe(true);
      // Untouched defaults still apply.
      expect(analyst?.scopes['roles.manage']).toBe(false);

      expect(result.scopes).toHaveLength(10);
      expect(result.members).toEqual([
        {
          id: 'user-1',
          name: 'Joshua Onyekachukwu',
          email: 'joshua@provance.io',
          role_id: 'role_owner',
          avatar: 'JO',
        },
        {
          id: 'user-2',
          name: 'Amina Sow',
          email: 'amina@provance.io',
          role_id: 'role_admin',
          avatar: 'AS',
        },
        {
          id: 'user-3',
          name: 'David Okafor',
          email: 'david@trustedmedia.ng',
          role_id: 'role_analyst',
          avatar: 'DO',
        },
      ]);
      expect(result.auditEvents).toEqual([
        {
          id: 'ra-1',
          action: 'role.scope_updated',
          actor_email: 'amina@provance.io',
          description: 'Admin role — enabled reports.export.',
          created_at: '2026-08-04T09:00:00.000Z',
        },
      ]);
    });

    it('falls back to defaults when the role_scopes query fails (migration 0016 missing)', async () => {
      const client = createAdminClient([
        { data: memberRows, error: null },
        { data: [], error: null },
        { data: null, error: { message: 'relation "role_scopes" does not exist' } },
        { data: profileRows, error: null },
      ]);
      const service = createService(client);

      const result = await service.list();

      // No 503 — the page degrades to the ADMIN_ROLES defaults.
      const admin = result.roles.find((role) => role.id === 'role_admin');
      const analyst = result.roles.find((role) => role.id === 'role_analyst');
      expect(admin?.scopes['reports.export']).toBe(true);
      expect(analyst?.scopes['scans.revoke']).toBe(false);
    });

    it('skips the profiles query when there are no members', async () => {
      const client = createAdminClient([
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]);
      const service = createService(client);

      const result = await service.list();

      expect(client.in).not.toHaveBeenCalled();
      expect(result.members).toEqual([]);
      expect(result.roles.every((role) => role.member_count === 0)).toBe(true);
    });

    it('throws 503 when the membership query fails', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'boom' } },
        { data: [], error: null },
        { data: [], error: null },
      ]);
      const service = createService(client);

      await expect(service.list()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('throws 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(service.list()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('updateRoleScopes', () => {
    it('persists the full scope map and records a role.scope_updated audit event', async () => {
      const client = createAdminClient([
        { error: null },
        { error: null },
        { error: null },
      ]);
      const service = createService(client);

      const scopes = {
        'scans.read': true,
        'scans.create': true,
        'scans.revoke': false,
        'reports.read': true,
        'reports.export': false,
        'members.manage': false,
        'roles.manage': false,
        'billing.manage': false,
        'flags.manage': false,
        'audit.read': true,
      };

      const result = await service.updateRoleScopes(
        ADMIN_USER,
        'role_analyst',
        scopes,
      );

      expect(client.delete).toHaveBeenCalledWith();
      expect(client.eq).toHaveBeenCalledWith('role_id', 'role_analyst');
      expect(client.insert).toHaveBeenCalledTimes(2);
      expect(client.insert).toHaveBeenNthCalledWith(
        1,
        Object.entries(scopes).map(([scope_key, enabled]) => ({
          role_id: 'role_analyst',
          scope_key,
          enabled,
        })),
      );
      expect(client.insert).toHaveBeenNthCalledWith(2, {
        actor_email: 'founder.admin@provance.io',
        action: 'role.scope_updated',
        severity: 'medium',
        entity_type: 'role',
        entity_id: 'role_analyst',
        details: { role_id: 'role_analyst', scopes },
      });
      expect(result).toEqual({ ok: true, roleId: 'role_analyst', scopes });
    });

    it('rejects with 403 when editing the Owner role — no DB calls', async () => {
      const client = createAdminClient([]);
      const service = createService(client);

      const promise = service.updateRoleScopes(
        ADMIN_USER,
        'role_owner',
        {},
      );

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      await expect(promise).rejects.toThrow(
        'The Owner role is fixed by design and cannot be edited.',
      );
      expect(client.from).not.toHaveBeenCalled();
    });

    it('rejects with 404 for an unknown role', async () => {
      const service = createService(createAdminClient([]));

      await expect(
        service.updateRoleScopes(ADMIN_USER, 'role_unknown', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects with 400 naming an unknown scope key', async () => {
      const service = createService(createAdminClient([]));

      const promise = service.updateRoleScopes(
        ADMIN_USER,
        'role_admin',
        { 'billing.fake': true },
      );

      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
      await expect(promise).rejects.toThrow('Unknown scope "billing.fake".');
    });

    it('rejects with 400 on a non-boolean scope value', async () => {
      const service = createService(createAdminClient([]));

      const promise = service.updateRoleScopes(
        ADMIN_USER,
        'role_admin',
        { 'scans.read': 'yes' as unknown as boolean },
      );

      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
      await expect(promise).rejects.toThrow(
        'Scope "scans.read" must be a boolean.',
      );
    });

    it('throws 503 when the delete fails', async () => {
      const client = createAdminClient([
        { error: { message: 'boom' } },
      ]);
      const service = createService(client);

      await expect(
        service.updateRoleScopes(ADMIN_USER, 'role_admin', {}),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws 400 when the actor has no email', async () => {
      const service = createService(createAdminClient([]));

      await expect(
        service.updateRoleScopes({ id: 'user-1', email: '' }, 'role_admin', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(
        service.updateRoleScopes(ADMIN_USER, 'role_admin', {}),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('honors a custom role_scopes table name from config', async () => {
      const config = createConfigService({
        SUPABASE_ROLE_SCOPES_TABLE: 'custom_scopes',
      });
      const client = createAdminClient([
        { error: null },
        { error: null },
        { error: null },
      ]);
      const service = createService(client, config);

      await service.updateRoleScopes(ADMIN_USER, 'role_admin', {
        'scans.read': true,
      });

      expect(client.from).toHaveBeenCalledWith('custom_scopes');
    });
  });

  describe('reassignMember', () => {
    it('reassigns a member and records role.member_assigned with both vocabularies', async () => {
      const client = createAdminClient([
        {
          data: { organization_id: 'org-1', user_id: 'user-2', role: 'admin' },
          error: null,
        },
        { error: null },
        { error: null },
      ]);
      const service = createService(client);

      const result = await service.reassignMember(
        ADMIN_USER,
        'user-2',
        'role_analyst',
      );

      // Member lookup scoped to the user + active status.
      expect(client.eq).toHaveBeenCalledWith('user_id', 'user-2');
      expect(client.eq).toHaveBeenCalledWith('status', 'active');

      // Org role mapped: role_analyst → 'member' (org vocabulary).
      expect(client.update).toHaveBeenCalledWith({ role: 'member' });
      expect(client.eq).toHaveBeenCalledWith('organization_id', 'org-1');

      // Audit event carries the full RBAC move.
      expect(client.insert).toHaveBeenCalledTimes(1);
      expect(client.insert).toHaveBeenCalledWith({
        actor_email: 'founder.admin@provance.io',
        action: 'role.member_assigned',
        severity: 'medium',
        entity_type: 'role',
        entity_id: 'role_analyst',
        details: {
          member_id: 'user-2',
          from_role_id: 'role_admin',
          to_role_id: 'role_analyst',
          from_role: 'admin',
          to_role: 'member',
        },
      });
      expect(result).toEqual({
        ok: true,
        memberId: 'user-2',
        roleId: 'role_analyst',
      });
    });

    it('rejects with 403 when assigning the Owner role', async () => {
      const client = createAdminClient([]);
      const service = createService(client);

      const promise = service.reassignMember(
        ADMIN_USER,
        'user-2',
        'role_owner',
      );

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      await expect(promise).rejects.toThrow(
        'The Owner role cannot be assigned through the roster.',
      );
      expect(client.from).not.toHaveBeenCalled();
    });

    it('rejects with 403 when the member holds the owner seat', async () => {
      const client = createAdminClient([
        {
          data: { organization_id: 'org-1', user_id: 'user-1', role: 'owner' },
          error: null,
        },
      ]);
      const service = createService(client);

      const promise = service.reassignMember(
        ADMIN_USER,
        'user-1',
        'role_analyst',
      );

      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      await expect(promise).rejects.toThrow(
        'The owner seat is fixed by design and cannot be reassigned.',
      );
      expect(client.update).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the member does not exist', async () => {
      const client = createAdminClient([{ data: null, error: null }]);
      const service = createService(client);

      await expect(
        service.reassignMember(ADMIN_USER, 'user-404', 'role_analyst'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns changed:false with no writes when the RBAC role is unchanged', async () => {
      const client = createAdminClient([
        {
          data: { organization_id: 'org-1', user_id: 'user-3', role: 'member' },
          error: null,
        },
      ]);
      const service = createService(client);

      const result = await service.reassignMember(
        ADMIN_USER,
        'user-3',
        'role_analyst',
      );

      expect(result).toEqual({
        ok: true,
        memberId: 'user-3',
        roleId: 'role_analyst',
        changed: false,
      });
      expect(client.update).not.toHaveBeenCalled();
      expect(client.insert).not.toHaveBeenCalled();
    });

    it('throws 503 when the update fails', async () => {
      const client = createAdminClient([
        {
          data: { organization_id: 'org-1', user_id: 'user-2', role: 'admin' },
          error: null,
        },
        { error: { message: 'boom' } },
      ]);
      const service = createService(client);

      await expect(
        service.reassignMember(ADMIN_USER, 'user-2', 'role_analyst'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rejects with 404 for an unknown role', async () => {
      const service = createService(createAdminClient([]));

      await expect(
        service.reassignMember(ADMIN_USER, 'user-2', 'role_unknown'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 400 when the actor has no email', async () => {
      const service = createService(createAdminClient([]));

      await expect(
        service.reassignMember(
          { id: 'user-1', email: '' },
          'user-2',
          'role_analyst',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(
        service.reassignMember(ADMIN_USER, 'user-2', 'role_analyst'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
