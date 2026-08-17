import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ACTIVITY_CATEGORY_ACTIONS,
  ACTIVITY_CATEGORY_LIKE_PATTERNS,
  type ActivityCategory,
} from './activity-categories';
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

type IncidentRow = {
  id: string;
  severity: string;
  started_at: string;
  resolved_at: string | null;
  summary: string;
};

type AdminClient = NonNullable<ReturnType<SupabaseService['getAdminClient']>>;

type ActivityEvent = {
  id: string;
  actor_email: string;
  action: string;
  severity: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  summary?: string;
};

/**
 * isMissingRelationError — true when a PostgREST error means the queried table
 * does not exist yet (migration not applied). These errors degrade to empty
 * feeds/defaults rather than surfacing 503s, matching the security/scans
 * best-effort pattern so fresh DBs never break auth or activity flows.
 */
function isMissingRelationError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  return (
    message.includes('Could not find the table') ||
    message.includes('relation') ||
    message.includes('PGRST205') ||
    message.includes('does not exist')
  );
}

// Category → action matching lives in ./activity-categories (a pure module
// the frontend's parity test imports directly) — mirroring the frontend
// Activity page tabs so real-mode filtering behaves identically to the
// client-side tabs.

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly auditTable: string;
  private readonly incidentsTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.auditTable =
      this.configService.get<string>('SUPABASE_AUDIT_EVENTS_TABLE') || 'auth_audit_events';
    this.incidentsTable =
      this.configService.get<string>('SUPABASE_ADMIN_INCIDENTS_TABLE') || 'admin_incidents';
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
   * Resolved incidents from admin_incidents are merged in as system events
   * (the same incident.resolved rows the mock feed emits), and the combined
   * feed is sorted newest-first and paginated in memory — mirroring
   * mockGetActivityLogs exactly so real and mock pages line up.
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

    // Incidents are system-wide (no owner), so they only join the feed where
    // the frontend tabs surface them: 'all' and 'system'.
    const includeIncidents = category === 'all' || category === 'system';

    // ── Scoped audit query (email + category filter) ────────────────────────
    // All matching rows are fetched — a single user's trail is bounded — and
    // pagination happens over the merged feed below.
    const categoryFilter = (() => {
      if (category === 'scans') {
        return {
          type: 'like' as const,
          column: 'action' as const,
          value: ACTIVITY_CATEGORY_LIKE_PATTERNS.scans,
        };
      }
      if (category === 'exports') {
        return {
          type: 'like' as const,
          column: 'action' as const,
          value: ACTIVITY_CATEGORY_LIKE_PATTERNS.exports,
        };
      }
      const actions = category === 'all' ? undefined : ACTIVITY_CATEGORY_ACTIONS[category];
      return actions
        ? { type: 'in' as const, column: 'action' as const, values: actions }
        : null;
    })();

    let auditQuery = adminClient
      .from(this.auditTable)
      .select('id,actor_email,action,entity_type,entity_id,created_at')
      .eq('actor_email', email)
      .order('created_at', { ascending: false });

    if (categoryFilter?.type === 'like') {
      auditQuery = auditQuery.like(categoryFilter.column, categoryFilter.value);
    } else if (categoryFilter?.type === 'in') {
      auditQuery = auditQuery.in(categoryFilter.column, categoryFilter.values);
    }

    const { data, error } = await auditQuery;

    if (error) {
      throw new ServiceUnavailableException('Failed to load account activity.');
    }

    const auditEvents = ((data ?? []) as ActivityRow[]).map((row) => ({
      id: row.id,
      actor_email: row.actor_email || 'system',
      action: row.action,
      severity: auditSeverity(row.action),
      resource_type: row.entity_type,
      resource_id: row.entity_id,
      created_at: row.created_at,
    }));

    const incidentEvents = includeIncidents
      ? await this.fetchResolvedIncidentEvents(adminClient)
      : [];

    // Merge + sort newest-first + slice in memory (mirrors mockGetActivityLogs).
    const merged = [...incidentEvents, ...auditEvents].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
    const total = merged.length;

    return {
      data: merged.slice(from, to + 1),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  /**
   * fetchResolvedIncidentEvents — maps resolved admin_incidents rows to the
   * incident.resolved system events the Activity feed surfaces, carrying the
   * same severity + post-mortem summary the Monitoring page shows.
   *
   * Best-effort: when the table is missing (migration 0007 not applied), the
   * feed degrades to the audit trail alone instead of failing.
   */
  private async fetchResolvedIncidentEvents(
    adminClient: AdminClient,
  ): Promise<ActivityEvent[]> {
    const { data, error } = await adminClient
      .from(this.incidentsTable)
      .select('id,severity,started_at,resolved_at,summary')
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        this.logger.warn(
          'Activity feed skipped incidents — admin_incidents table missing (migration 0007 not applied).',
        );
        return [];
      }
      throw new ServiceUnavailableException('Failed to load account activity.');
    }

    return ((data ?? []) as IncidentRow[]).map((incident) => ({
      id: `incident_${incident.id}`,
      action: 'incident.resolved',
      actor_email: 'system',
      severity: incident.severity,
      resource_type: 'incident',
      resource_id: incident.id,
      created_at: incident.resolved_at || incident.started_at,
      summary: incident.summary,
    }));
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
