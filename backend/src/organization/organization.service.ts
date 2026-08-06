import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { InviteMemberDto } from './dto/invite-member.dto';

type AdminClient = NonNullable<ReturnType<SupabaseService['getAdminClient']>>;

type MembershipRow = {
  organization_id: string;
  user_id: string;
  role: string;
  team_id: string | null;
  status: string;
  updated_at: string;
  created_at: string;
  // Supabase nested selects return the joined row as an array.
  profiles?: Array<{ display_name: string | null; email: string | null }> | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  plan: string;
  seats: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  scan_count: number;
  created_at: string;
};

type TeamRow = { id: string; name: string; description: string | null };

type InviteRow = {
  id: string;
  email: string;
  role: string;
  team_id: string | null;
  status: string;
  expires_at: string;
  created_at: string;
};

/**
 * OrganizationService — workspace management backed by the 0005_organization
 * tables. Every method maps DB rows to the exact contract the frontend
 * consumes (see docs/engineering/ORGANIZATION_API_CONTRACT.md); business
 * rules mirror the mock layer (owner protection, duplicate checks, seats).
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);
  private readonly orgsTable: string;
  private readonly teamsTable: string;
  private readonly membersTable: string;
  private readonly invitesTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    this.orgsTable = configService.get<string>('SUPABASE_ORGANIZATIONS_TABLE', 'organizations');
    this.teamsTable = configService.get<string>('SUPABASE_TEAMS_TABLE', 'teams');
    this.membersTable = configService.get<string>(
      'SUPABASE_ORGANIZATION_MEMBERS_TABLE',
      'organization_members',
    );
    this.invitesTable = configService.get<string>(
      'SUPABASE_ORGANIZATION_INVITES_TABLE',
      'organization_invites',
    );
  }

  // -------------------------------------------------------------------------
  // GET /organization
  // -------------------------------------------------------------------------

  async getOrganization(user: CurrentUserPayload) {
    const client = this.requireClient();
    const membership = await this.getMembershipOrThrow(client, user);

    const organization = await this.getOrganizationOrThrow(client, membership.organization_id);
    const teams = await this.listTeams(client, membership.organization_id);
    const members = await this.listMembers(client, membership.organization_id);
    const invites = await this.listPendingInvites(client, membership.organization_id);

    const activeMembers = members.filter((member) => member.status === 'active');

    return {
      profile: {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        seats: organization.seats,
        seatsUsed: activeMembers.length,
        storageUsedGb: organization.storage_used_gb,
        storageLimitGb: organization.storage_limit_gb,
        scanCount: organization.scan_count,
        created_at: organization.created_at,
      },
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
      })),
      members: members.map((member) => ({
        id: member.user_id,
        displayName: member.profiles?.[0]?.display_name ?? member.user_id,
        email: member.profiles?.[0]?.email ?? '',
        role: member.role,
        team: member.team_id,
        status: member.status,
        last_active_at: member.updated_at,
      })),
      pendingInvites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        team: invite.team_id,
        invitedAt: invite.created_at,
        expiresAt: invite.expires_at,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // POST /organization/invites
  // -------------------------------------------------------------------------

  async inviteMember(user: CurrentUserPayload, dto: InviteMemberDto) {
    const client = this.requireClient();
    const membership = await this.getMembershipOrThrow(client, user);
    this.assertCanManage(membership);
    const organization = await this.getOrganizationOrThrow(client, membership.organization_id);
    const normalized = dto.email.trim().toLowerCase();

    const existingMember = await this.findMemberByEmail(client, membership.organization_id, normalized);
    if (existingMember) {
      throw new BadRequestException('That person is already a member of this workspace.');
    }

    const { data: existingInvite } = await client
      .from(this.invitesTable)
      .select('id')
      .eq('organization_id', membership.organization_id)
      .eq('email', normalized)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingInvite) {
      throw new BadRequestException('An invite is already pending for that email.');
    }

    const activeCount = await this.countActiveMembers(client, membership.organization_id);
    if (activeCount >= organization.seats) {
      throw new BadRequestException('This workspace has no seats left on its current plan.');
    }

    const team = await this.resolveTeam(
      client,
      membership.organization_id,
      dto.team,
    );

    const { data, error } = await client
      .from(this.invitesTable)
      .insert({
        organization_id: membership.organization_id,
        email: normalized,
        role: dto.role,
        team_id: team?.id ?? null,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.warn(`Failed to create invite: ${error.message}`);
      throw new ServiceUnavailableException('Failed to create the invite.');
    }

    const invite = data as InviteRow;
    return {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        team: invite.team_id,
        invitedAt: invite.created_at,
        expiresAt: invite.expires_at,
      },
    };
  }

  // -------------------------------------------------------------------------
  // PATCH /organization/members/:memberId/role
  // -------------------------------------------------------------------------

  async updateMemberRole(user: CurrentUserPayload, memberId: string, role: 'admin' | 'member') {
    const client = this.requireClient();
    const membership = await this.getMembershipOrThrow(client, user);
    this.assertCanManage(membership);
    const member = await this.getMemberOrThrow(client, membership.organization_id, memberId);
    this.assertNotOwner(member);

    const { error } = await client
      .from(this.membersTable)
      .update({ role })
      .eq('organization_id', membership.organization_id)
      .eq('user_id', memberId);

    if (error) {
      throw new ServiceUnavailableException('Failed to update the member role.');
    }

    return { ok: true, memberId, role };
  }

  // -------------------------------------------------------------------------
  // PATCH /organization/members/:memberId/team
  // -------------------------------------------------------------------------

  async updateMemberTeam(user: CurrentUserPayload, memberId: string, teamId: string) {
    const client = this.requireClient();
    const membership = await this.getMembershipOrThrow(client, user);
    this.assertCanManage(membership);
    const member = await this.getMemberOrThrow(client, membership.organization_id, memberId);
    this.assertNotOwner(member);

    // Strict lookup for the reassignment path — unlike invites, an unknown
    // team is a client error, not a fallback (mirrors the mock rejection).
    const team = await this.getTeamOrThrow(client, membership.organization_id, teamId);

    const { error } = await client
      .from(this.membersTable)
      .update({ team_id: team.id })
      .eq('organization_id', membership.organization_id)
      .eq('user_id', memberId);

    if (error) {
      throw new ServiceUnavailableException('Failed to update the member team.');
    }

    return { ok: true, memberId, teamId };
  }

  // -------------------------------------------------------------------------
  // DELETE /organization/members/:memberId
  // -------------------------------------------------------------------------

  async removeMember(user: CurrentUserPayload, memberId: string) {
    const client = this.requireClient();
    const membership = await this.getMembershipOrThrow(client, user);
    this.assertCanManage(membership);
    const member = await this.getMemberOrThrow(client, membership.organization_id, memberId);
    this.assertNotOwner(member);

    const { error } = await client
      .from(this.membersTable)
      .delete()
      .eq('organization_id', membership.organization_id)
      .eq('user_id', memberId);

    if (error) {
      throw new ServiceUnavailableException('Failed to remove the member.');
    }

    return { ok: true, memberId };
  }

  // -------------------------------------------------------------------------
  // DELETE /organization/invites/:inviteId
  // -------------------------------------------------------------------------

  async cancelInvite(user: CurrentUserPayload, inviteId: string) {
    const client = this.requireClient();
    const membership = await this.getMembershipOrThrow(client, user);
    this.assertCanManage(membership);

    const { data: invite, error: fetchError } = await client
      .from(this.invitesTable)
      .select('id')
      .eq('id', inviteId)
      .eq('organization_id', membership.organization_id)
      .maybeSingle();

    if (fetchError) {
      throw new ServiceUnavailableException('Failed to fetch the invite.');
    }
    if (!invite) {
      throw new NotFoundException('Invite not found.');
    }

    const { error } = await client
      .from(this.invitesTable)
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
      .eq('organization_id', membership.organization_id);

    if (error) {
      throw new ServiceUnavailableException('Failed to cancel the invite.');
    }

    return { ok: true, inviteId };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private requireClient(): AdminClient {
    const client = this.supabaseService.getAdminClient();
    if (!client) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }
    return client;
  }

  /**
   * Resolve the caller's organization membership. Assumes single-org-per-user
   * (the PK is (organization_id, user_id), so multi-org users would return
   * multiple rows and hit the error branch below).
   */
  private async getMembershipOrThrow(
    client: AdminClient,
    user: CurrentUserPayload,
  ): Promise<MembershipRow> {
    const { data, error } = await client
      .from(this.membersTable)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to resolve the organization membership.');
    }
    if (!data) {
      throw new NotFoundException('You are not a member of any organization.');
    }
    return data as MembershipRow;
  }

  private async getOrganizationOrThrow(
    client: AdminClient,
    organizationId: string,
  ): Promise<OrganizationRow> {
    const { data, error } = await client
      .from(this.orgsTable)
      .select('*')
      .eq('id', organizationId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch the organization.');
    }
    if (!data) {
      throw new NotFoundException('Organization not found.');
    }
    return data as OrganizationRow;
  }

  private async listTeams(client: AdminClient, organizationId: string): Promise<TeamRow[]> {
    const { data, error } = await client
      .from(this.teamsTable)
      .select('id, name, description')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch teams.');
    }
    return (data ?? []) as TeamRow[];
  }

  private async listMembers(client: AdminClient, organizationId: string): Promise<MembershipRow[]> {
    const { data, error } = await client
      .from(this.membersTable)
      .select('organization_id, user_id, role, team_id, status, created_at, updated_at, profiles(display_name, email)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch members.');
    }
    return (data ?? []) as MembershipRow[];
  }

  private async listPendingInvites(client: AdminClient, organizationId: string): Promise<InviteRow[]> {
    const { data, error } = await client
      .from(this.invitesTable)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch invites.');
    }
    return (data ?? []) as InviteRow[];
  }

  private async getMemberOrThrow(
    client: AdminClient,
    organizationId: string,
    memberId: string,
  ): Promise<MembershipRow> {
    const { data, error } = await client
      .from(this.membersTable)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', memberId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch the member.');
    }
    if (!data) {
      throw new NotFoundException('Member not found.');
    }
    return data as MembershipRow;
  }

  private async findMemberByEmail(
    client: AdminClient,
    organizationId: string,
    email: string,
  ): Promise<MembershipRow | null> {
    const { data, error } = await client
      .from(this.membersTable)
      .select('organization_id, user_id, role, team_id, status, created_at, updated_at, profiles(display_name, email)')
      .eq('organization_id', organizationId);

    if (error) {
      throw new ServiceUnavailableException('Failed to check existing members.');
    }
    const rows = (data ?? []) as MembershipRow[];
    return (
      rows.find((row) => (row.profiles?.[0]?.email ?? '').toLowerCase() === email) ?? null
    );
  }

  private async countActiveMembers(client: AdminClient, organizationId: string): Promise<number> {
    const { count, error } = await client
      .from(this.membersTable)
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      throw new ServiceUnavailableException('Failed to count members.');
    }
    return count ?? 0;
  }

  /** Strict team lookup within the org — used by the reassignment path. */
  private async getTeamOrThrow(
    client: AdminClient,
    organizationId: string,
    teamId: string,
  ): Promise<TeamRow> {
    const { data, error } = await client
      .from(this.teamsTable)
      .select('id, name, description')
      .eq('organization_id', organizationId)
      .eq('id', teamId)
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException('That team does not exist.');
    }
    return data as TeamRow;
  }

  /** Resolve a team by id within the org; falls back to the first team. */
  private async resolveTeam(
    client: AdminClient,
    organizationId: string,
    teamId?: string,
  ): Promise<TeamRow | null> {
    const base = client
      .from(this.teamsTable)
      .select('id, name, description')
      .eq('organization_id', organizationId);

    if (teamId) {
      const { data, error } = await base.eq('id', teamId).maybeSingle();
      if (!error && data) return data as TeamRow;
    }

    const { data, error } = await base.order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (error || !data) return null;
    return data as TeamRow;
  }

  private assertNotOwner(member: MembershipRow) {
    if (member.role === 'owner') {
      throw new BadRequestException('The owner cannot be modified.');
    }
  }

  /** All mutations are owner/admin-only (mirrors the UI's canManage gating). */
  private assertCanManage(membership: MembershipRow) {
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new ForbiddenException(
        'Only organization owners and admins can manage the workspace.',
      );
    }
  }
}
