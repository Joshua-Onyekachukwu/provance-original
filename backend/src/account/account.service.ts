import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auditSeverity } from '../common/audit-severity';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

type ProfileRow = {
  user_id: string;
  email: string;
  display_name: string;
  organization: string | null;
  role_title: string | null;
  default_workspace: 'individual' | 'team';
  email_notifications: boolean;
  account_role: 'member' | 'admin';
  team_access: boolean;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

// Category → action matching, mirroring the frontend Activity page tabs
// (src/pages/app/AppActivityPage.jsx CATEGORIES) so real-mode filtering
// behaves identically to the client-side tabs.
type ActivityCategory = 'all' | 'scans' | 'exports' | 'account' | 'team' | 'system';

const ACTIVITY_CATEGORY_ACTIONS: Record<
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
    // Real services write the underscore form (see audit-severity.ts).
    'waitlist_reviewed',
  ],
};

@Injectable()
export class AccountService {
  private readonly auditTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.auditTable =
      this.configService.get<string>('SUPABASE_AUDIT_EVENTS_TABLE') || 'auth_audit_events';
  }

  async getCurrentViewer(user: CurrentUserPayload) {
    const profile = await this.ensureProfile(user);

    return {
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
      },
      permissions: this.buildPermissions(profile),
      profile: this.serializeProfile(profile),
    };
  }

  async updateProfile(user: CurrentUserPayload, dto: UpdateProfileDto) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const currentProfile = await this.ensureProfile(user);
    const nextDefaultWorkspace =
      dto.defaultWorkspace ?? currentProfile.default_workspace;

    if (nextDefaultWorkspace === 'team' && !currentProfile.team_access) {
      throw new BadRequestException(
        'Team workspace access is not enabled for this account.',
      );
    }

    const updates = {
      display_name:
        typeof dto.displayName === 'string'
          ? dto.displayName.trim() || currentProfile.display_name
          : currentProfile.display_name,
      organization:
        typeof dto.organization === 'string'
          ? dto.organization.trim() || null
          : currentProfile.organization,
      role_title:
        typeof dto.roleTitle === 'string'
          ? dto.roleTitle.trim() || null
          : currentProfile.role_title,
      default_workspace: nextDefaultWorkspace,
      email_notifications:
        typeof dto.emailNotifications === 'boolean'
          ? dto.emailNotifications
          : currentProfile.email_notifications,
      account_role: this.resolveAccountRole(
        user.email,
        currentProfile.account_role,
      ),
      team_access: currentProfile.team_access,
      email: user.email || currentProfile.email,
    };

    const { data, error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to update profile.');
    }

    const profile = data as ProfileRow;

    return {
      status: 'updated',
      profile: this.serializeProfile(profile),
      permissions: this.buildPermissions(profile),
    };
  }

  /**
   * getActivity — the user's account activity feed, scoped by actor email.
   *
   * auth_audit_events has no user_id column, so events are matched by
   * actor_email (the identity the backend writes when the user acts).
   * Supports the same category semantics as the Activity page tabs and a
   * pagination envelope matching mockGetActivityLogs.
   */
  async getActivity(
    user: CurrentUserPayload,
    input: {
      category?: ActivityCategory | string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const email = user.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('An account email is required to load activity.');
    }

    const safePage = Math.max(1, input.page ?? 1);
    const safePageSize = Math.min(200, Math.max(1, input.pageSize ?? 20));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    const category: ActivityCategory = this.isActivityCategory(input.category)
      ? input.category
      : 'all';

    // ── Scoped query (filters applied to both data + count) ─────────────────
    // Resolved once, then applied to both builders below — mirrors the
    // conditional chaining pattern in admin.service.ts countMembers().
    const categoryFilter = (() => {
      if (category === 'scans') {
        return { type: 'like' as const, column: 'action' as const, value: 'scan.%' };
      }
      if (category === 'exports') {
        return { type: 'like' as const, column: 'action' as const, value: 'report.%' };
      }
      const actions = category === 'all' ? undefined : ACTIVITY_CATEGORY_ACTIONS[category];
      return actions
        ? { type: 'in' as const, column: 'action' as const, values: actions }
        : null;
    })();

    let dataQuery = adminClient
      .from(this.auditTable)
      .select('id,actor_email,action,entity_type,entity_id,created_at')
      .eq('actor_email', email)
      .order('created_at', { ascending: false })
      .range(from, to);

    let countQuery = adminClient
      .from(this.auditTable)
      .select('id', { count: 'exact', head: true })
      .eq('actor_email', email);

    if (categoryFilter?.type === 'like') {
      dataQuery = dataQuery.like(categoryFilter.column, categoryFilter.value);
      countQuery = countQuery.like(categoryFilter.column, categoryFilter.value);
    } else if (categoryFilter?.type === 'in') {
      dataQuery = dataQuery.in(categoryFilter.column, categoryFilter.values);
      countQuery = countQuery.in(categoryFilter.column, categoryFilter.values);
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error || countError) {
      throw new ServiceUnavailableException('Failed to load account activity.');
    }

    const rows = (data ?? []) as ActivityRow[];
    const total = count ?? rows.length;

    return {
      data: rows.map((row) => ({
        id: row.id,
        actor_email: row.actor_email || 'system',
        action: row.action,
        severity: auditSeverity(row.action),
        resource_type: row.entity_type,
        resource_id: row.entity_id,
        created_at: row.created_at,
      })),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  private isActivityCategory(value: string | undefined): value is ActivityCategory {
    return (
      value === 'all' ||
      value === 'scans' ||
      value === 'exports' ||
      value === 'account' ||
      value === 'team' ||
      value === 'system'
    );
  }

  async ensureProfile(user: CurrentUserPayload): Promise<ProfileRow> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to load profile.');
    }

    const resolvedRole = this.resolveAccountRole(
      user.email,
      (data as ProfileRow | null)?.account_role ?? null,
    );

    if (!data) {
      const insertPayload = this.buildDefaultProfileRow(user, resolvedRole);
      const inserted = await adminClient
        .from('profiles')
        .insert(insertPayload)
        .select('*')
        .single();

      if (inserted.error || !inserted.data) {
        throw new ServiceUnavailableException('Failed to initialize profile.');
      }

      return inserted.data as ProfileRow;
    }

    const profile = data as ProfileRow;
    const requiresRepair =
      profile.email !== (user.email || profile.email) ||
      profile.account_role !== resolvedRole ||
      !profile.display_name?.trim();

    if (!requiresRepair) {
      return profile;
    }

    const repaired = await adminClient
      .from('profiles')
      .update({
        email: user.email || profile.email,
        display_name: profile.display_name?.trim()
          ? profile.display_name
          : this.buildDefaultDisplayName(user.email),
        account_role: resolvedRole,
      })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (repaired.error || !repaired.data) {
      throw new ServiceUnavailableException('Failed to repair profile.');
    }

    return repaired.data as ProfileRow;
  }

  private buildPermissions(profile: ProfileRow) {
    return {
      individual: true,
      team: profile.team_access,
      admin: profile.account_role === 'admin',
    };
  }

  private serializeProfile(profile: ProfileRow) {
    return {
      displayName: profile.display_name,
      organization: profile.organization || '',
      roleTitle: profile.role_title || '',
      defaultWorkspace:
        profile.default_workspace === 'team' && profile.team_access
          ? 'team'
          : 'individual',
      emailNotifications: profile.email_notifications,
      accountRole: profile.account_role,
      teamAccess: profile.team_access,
    };
  }

  private buildDefaultProfileRow(
    user: CurrentUserPayload,
    accountRole: 'member' | 'admin',
  ) {
    return {
      user_id: user.id,
      email: user.email || '',
      display_name: this.buildDefaultDisplayName(user.email),
      organization: null,
      role_title: null,
      default_workspace: 'individual' as const,
      email_notifications: true,
      account_role: accountRole,
      team_access: false,
    };
  }

  private buildDefaultDisplayName(email?: string) {
    const localPart = typeof email === 'string' ? email.split('@')[0] : '';

    const normalizedName = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return normalizedName || 'Provance User';
  }

  private resolveAccountRole(
    email?: string,
    existingRole?: string | null,
  ): 'member' | 'admin' {
    if (this.isAdminEmail(email)) {
      return 'admin';
    }

    return existingRole === 'admin' ? 'admin' : 'member';
  }

  private isAdminEmail(email?: string) {
    if (!email) {
      return false;
    }

    const configuredEmails =
      this.configService.get<string>('ADMIN_EMAILS')?.split(',') ?? [];

    return configuredEmails
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.trim().toLowerCase());
  }
}
