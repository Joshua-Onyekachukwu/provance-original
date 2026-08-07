import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { OrganizationService } from './organization.service';

// ---------------------------------------------------------------------------
// Test scaffolding — plain instantiation with a plan-based mock Supabase
// client, following the auth.controller.spec.ts precedent (no TestingModule).
// The mock client is a thenable query builder: each awaited chain consumes one
// entry from the plan, in the exact order the service issues its DB calls.
// ---------------------------------------------------------------------------

type PlannedResult = {
  data?: unknown;
  error?: unknown;
  count?: number;
};

function createConfigService() {
  return {
    // Return the fallback for every key so the constructor's schema-matching
    // defaults are exercised.
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  } as unknown as ConfigService;
}

function createAdminClient(plan: PlannedResult[]) {
  let step = 0;
  const next = (): PlannedResult => {
    const result = plan[step++];
    if (result === undefined) {
      // Fail loudly instead of silently resolving a short plan (an empty
      // array is truthy, so a missing entry would surface as a confusing
      // 403-from-undefined-role rather than a clear test failure).
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
    range: jest.fn(() => builder),
    in: jest.fn(() => builder),
    like: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(next())),
    single: jest.fn(() => Promise.resolve(next())),
    // Directly-awaited chains (listMembers, findMemberByEmail, counts, updates)
    // resolve through the thenable contract.
    then(resolve: (value: PlannedResult) => void) {
      resolve(next());
      return undefined;
    },
  } as const;

  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createSupabaseService(client: unknown) {
  return {
    getAdminClient: jest.fn(() => client),
  } as unknown as SupabaseService;
}

function createService(client: unknown, config?: ConfigService) {
  return new OrganizationService(
    createSupabaseService(client),
    config ?? createConfigService(),
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_USER: CurrentUserPayload = {
  id: 'user-owner',
  email: 'owner@example.com',
};

const ADMIN_USER: CurrentUserPayload = {
  id: 'user-admin',
  email: 'admin@example.com',
};

const MEMBER_USER: CurrentUserPayload = {
  id: 'user-member',
  email: 'member@example.com',
};

function membershipRow(overrides: Record<string, unknown> = {}) {
  return {
    organization_id: 'org-1',
    user_id: 'user-owner',
    role: 'owner',
    team_id: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function orgRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    name: 'Provance',
    plan: 'pro',
    seats: 5,
    storage_limit_gb: 50,
    storage_used_gb: 0,
    scan_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function memberWithProfile(
  userId: string,
  email: string,
  role = 'member',
  overrides: Record<string, unknown> = {},
) {
  return {
    organization_id: 'org-1',
    user_id: userId,
    role,
    team_id: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    profiles: [{ display_name: email.split('@')[0], email }],
    ...overrides,
  };
}

function inviteMemberDto(overrides: Partial<InviteMemberDto> = {}): InviteMemberDto {
  return {
    email: 'new@example.com',
    role: 'member',
    ...overrides,
  } as InviteMemberDto;
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('OrganizationService', () => {
  describe('getOrganization', () => {
    it('maps org, teams, members, and pending invites for a member', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow() },
        {
          data: [
            { id: 'team-1', name: 'Product', description: null },
            { id: 'team-2', name: 'Legal', description: 'Compliance' },
          ],
        },
        {
          data: [
            memberWithProfile('user-a', 'a@example.com', 'owner'),
            memberWithProfile('user-b', 'b@example.com'),
          ],
        },
        {
          data: [
            {
              id: 'inv-1',
              email: 'pending@example.com',
              role: 'member',
              team_id: null,
              status: 'pending',
              expires_at: '2026-01-10T00:00:00.000Z',
              created_at: '2026-01-03T00:00:00.000Z',
            },
          ],
        },
      ]);
      const service = createService(client);

      const result = await service.getOrganization(OWNER_USER);

      expect(result.profile.name).toBe('Provance');
      expect(result.profile.seatsUsed).toBe(2);
      expect(result.teams).toHaveLength(2);
      expect(result.teams[1].name).toBe('Legal');
      expect(result.members[0]).toMatchObject({
        email: 'a@example.com',
        role: 'owner',
        status: 'active',
      });
      expect(result.pendingInvites[0].email).toBe('pending@example.com');
    });

    it('rejects with 404 when the caller has no membership', async () => {
      const client = createAdminClient([{ data: null }]);
      const service = createService(client);

      const promise = service.getOrganization(OWNER_USER);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(
        'You are not a member of any organization.',
      );
    });

    it('rejects with 503 when the membership query fails', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'db down' } },
      ]);
      const service = createService(client);

      const promise = service.getOrganization(OWNER_USER);

      await expect(promise).rejects.toThrow(ServiceUnavailableException);
      await expect(promise).rejects.toThrow(
        'Failed to resolve the organization membership.',
      );
    });
  });

  describe('inviteMember — authorization', () => {
    it('rejects with 403 when the caller is a plain member', async () => {
      const client = createAdminClient([{ data: membershipRow({ role: 'member' }) }]);
      const service = createService(client);

      const promise = service.inviteMember(MEMBER_USER, inviteMemberDto());

      await expect(promise).rejects.toThrow(ForbiddenException);
      await expect(promise).rejects.toThrow(
        'Only organization owners and admins can manage the workspace.',
      );
    });
  });

  describe('inviteMember — duplicate and seat rules', () => {
    it('rejects with 400 when the email is already a member', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow() },
        { data: [memberWithProfile('user-x', 'new@example.com')] },
      ]);
      const service = createService(client);

      const promise = service.inviteMember(OWNER_USER, inviteMemberDto());

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'That person is already a member of this workspace.',
      );
    });

    it('rejects with 400 when an invite is already pending for the email', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow() },
        { data: [] },
        { data: { id: 'inv-1' } },
      ]);
      const service = createService(client);

      const promise = service.inviteMember(OWNER_USER, inviteMemberDto());

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'An invite is already pending for that email.',
      );
    });

    it('rejects with 400 when the workspace is at its seat limit', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow({ seats: 2 }) },
        { data: [] },
        { data: null },
        { count: 2 },
      ]);
      const service = createService(client);

      const promise = service.inviteMember(OWNER_USER, inviteMemberDto());

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(
        'This workspace has no seats left on its current plan.',
      );
    });

    it('normalizes the email to lowercase before duplicate checks', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow() },
        { data: [memberWithProfile('user-x', 'NEW@EXAMPLE.COM')] },
      ]);
      const service = createService(client);

      await expect(
        service.inviteMember(OWNER_USER, inviteMemberDto({ email: 'New@Example.COM' })),
      ).rejects.toThrow('That person is already a member of this workspace.');
    });
  });

  describe('inviteMember — creation', () => {
    it('creates the invite with the requested team when it exists', async () => {
      const client = createAdminClient([
        { data: membershipRow({ role: 'admin' }) },
        { data: orgRow() },
        { data: [] },
        { data: null },
        { count: 1 },
        { data: { id: 'team-2', name: 'Legal', description: null } },
        {
          data: {
            id: 'inv-9',
            email: 'new@example.com',
            role: 'member',
            team_id: 'team-2',
            status: 'pending',
            expires_at: '2026-01-10T00:00:00.000Z',
            created_at: '2026-01-03T00:00:00.000Z',
          },
        },
      ]);
      const service = createService(client);

      const result = await service.inviteMember(
        ADMIN_USER,
        inviteMemberDto({ role: 'member', team: 'team-2' }),
      );

      expect(result.invite).toMatchObject({
        email: 'new@example.com',
        role: 'member',
        team: 'team-2',
      });

      const insertPayload = (client as any).insert.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(insertPayload).toMatchObject({
        organization_id: 'org-1',
        email: 'new@example.com',
        role: 'member',
        team_id: 'team-2',
        invited_by: 'user-admin',
      });
      expect(typeof insertPayload.expires_at).toBe('string');
    });

    it('falls back to the first team when no team is specified', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow() },
        { data: [] },
        { data: null },
        { count: 1 },
        { data: { id: 'team-1', name: 'Product', description: null } },
        {
          data: {
            id: 'inv-10',
            email: 'new@example.com',
            role: 'member',
            team_id: 'team-1',
            status: 'pending',
            expires_at: '2026-01-10T00:00:00.000Z',
            created_at: '2026-01-03T00:00:00.000Z',
          },
        },
      ]);
      const service = createService(client);

      const result = await service.inviteMember(OWNER_USER, inviteMemberDto());

      expect(result.invite.team).toBe('team-1');
    });

    it('falls back to the first team when the requested team does not exist', async () => {
      // resolveTeam tries the strict id first (data: null) then falls back to
      // the org's first team — two maybeSingle steps before the insert.
      const client = createAdminClient([
        { data: membershipRow() },
        { data: orgRow() },
        { data: [] },
        { data: null },
        { count: 1 },
        { data: null },
        { data: { id: 'team-1', name: 'Product', description: null } },
        {
          data: {
            id: 'inv-11',
            email: 'new@example.com',
            role: 'member',
            team_id: 'team-1',
            status: 'pending',
            expires_at: '2026-01-10T00:00:00.000Z',
            created_at: '2026-01-03T00:00:00.000Z',
          },
        },
      ]);
      const service = createService(client);

      const result = await service.inviteMember(
        OWNER_USER,
        inviteMemberDto({ team: 'team-missing' }),
      );

      expect(result.invite.team).toBe('team-1');
    });
  });

  describe('updateMemberRole', () => {
    it('rejects with 403 for a non-manager caller', async () => {
      const client = createAdminClient([{ data: membershipRow({ role: 'member' }) }]);
      const service = createService(client);

      await expect(
        service.updateMemberRole(MEMBER_USER, 'user-a', 'admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects with 400 when the target is the owner', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: membershipRow({ user_id: 'user-owner' }) },
      ]);
      const service = createService(client);

      const promise = service.updateMemberRole(OWNER_USER, 'user-owner', 'member');

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('The owner cannot be modified.');
    });

    it('rejects with 404 when the target member does not exist', async () => {
      const client = createAdminClient([
        { data: membershipRow({ role: 'admin' }) },
        { data: null },
      ]);
      const service = createService(client);

      await expect(
        service.updateMemberRole(ADMIN_USER, 'missing', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates the role', async () => {
      const client = createAdminClient([
        { data: membershipRow({ role: 'admin' }) },
        { data: membershipRow({ role: 'member', user_id: 'user-a' }) },
        { data: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.updateMemberRole(ADMIN_USER, 'user-a', 'admin');

      expect(result).toEqual({ ok: true, memberId: 'user-a', role: 'admin' });
    });
  });

  describe('updateMemberTeam — strict team lookup', () => {
    it('rejects with 400 when the team does not exist', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: membershipRow({ role: 'member', user_id: 'user-a' }) },
        { data: null },
      ]);
      const service = createService(client);

      const promise = service.updateMemberTeam(OWNER_USER, 'user-a', 'team-missing');

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('That team does not exist.');
    });

    it('rejects with 400 when the target is the owner', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: membershipRow({ user_id: 'user-owner' }) },
      ]);
      const service = createService(client);

      await expect(
        service.updateMemberTeam(OWNER_USER, 'user-owner', 'team-1'),
      ).rejects.toThrow('The owner cannot be modified.');
    });

    it('reassigns the member to a team that exists', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: membershipRow({ role: 'member', user_id: 'user-a' }) },
        { data: { id: 'team-3', name: 'Legal', description: null } },
        { data: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.updateMemberTeam(OWNER_USER, 'user-a', 'team-3');

      expect(result).toEqual({ ok: true, memberId: 'user-a', teamId: 'team-3' });

      const updatePayload = (client as any).update.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(updatePayload.team_id).toBe('team-3');
    });
  });

  describe('removeMember', () => {
    it('rejects with 403 for a non-manager caller', async () => {
      const client = createAdminClient([{ data: membershipRow({ role: 'member' }) }]);
      const service = createService(client);

      await expect(
        service.removeMember(MEMBER_USER, 'user-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects with 400 when the target is the owner', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: membershipRow({ user_id: 'user-owner' }) },
      ]);
      const service = createService(client);

      await expect(
        service.removeMember(OWNER_USER, 'user-owner'),
      ).rejects.toThrow('The owner cannot be modified.');
    });

    it('removes the member', async () => {
      const client = createAdminClient([
        { data: membershipRow({ role: 'admin' }) },
        { data: membershipRow({ role: 'member', user_id: 'user-a' }) },
        { data: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.removeMember(ADMIN_USER, 'user-a');

      expect(result).toEqual({ ok: true, memberId: 'user-a' });
    });
  });

  describe('cancelInvite', () => {
    it('rejects with 403 for a non-manager caller', async () => {
      const client = createAdminClient([{ data: membershipRow({ role: 'member' }) }]);
      const service = createService(client);

      await expect(
        service.cancelInvite(MEMBER_USER, 'inv-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects with 404 when the invite is not in the workspace', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: null },
      ]);
      const service = createService(client);

      const promise = service.cancelInvite(OWNER_USER, 'inv-missing');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow('Invite not found.');
    });

    it('cancels the invite', async () => {
      const client = createAdminClient([
        { data: membershipRow() },
        { data: { id: 'inv-1' } },
        { data: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.cancelInvite(OWNER_USER, 'inv-1');

      expect(result).toEqual({ ok: true, inviteId: 'inv-1' });
    });
  });

  describe('unconfigured Supabase', () => {
    it('rejects with 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(service.getOrganization(OWNER_USER)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.getOrganization(OWNER_USER)).rejects.toThrow(
        'Supabase is not configured.',
      );
    });
  });
});
