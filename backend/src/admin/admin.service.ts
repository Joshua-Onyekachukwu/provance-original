import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { auditSeverity } from '../common/audit-severity';
import { SupabaseService } from '../supabase/supabase.service';

type WaitlistRow = {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  role_title: string | null;
  use_case: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
};

type AdminClient = NonNullable<ReturnType<SupabaseService['getAdminClient']>>;

type OrganizationRow = {
  id: string;
  name: string;
  storage_used_gb: number;
  scan_count: number;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  email: string;
  display_name: string;
  account_role: string;
  team_access: boolean;
  team_id: string | null;
  created_at: string;
  updated_at: string;
};

type FeatureFlagRow = {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  exposure: string;
  owner: string | null;
  updated_at: string;
};

type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  severity: string | null;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type ScanAnalyticsRow = {
  user_id: string;
  status: string;
  mime_type: string;
  result_payload: unknown | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
};

type OrgMemberRow = {
  organization_id: string;
  user_id: string;
  role: string;
};

type ScanJobRow = {
  id: string;
  status: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  processing_mode: string | null;
  team_id: string | null;
  completed_at: string | null;
  result_payload: unknown | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

// Columns the jobs ledger reads from the scans table (shared by listJobs and
// the retry/fail transitions so the row dialect can't drift between them).
const JOB_COLUMNS =
  'id,status,original_filename,mime_type,file_size_bytes,processing_mode,team_id,completed_at,result_payload,failure_reason,created_at,updated_at';

// Display-dialect job status → DB scan_status values. The ?status= filter
// accepts the same dialect the page's chips use (toJobView maps
// 'complete'→'completed' and 'awaiting_upload'→'queued' at the boundary, so a
// 'queued' filter spans both pre-submit and queued rows).
const JOB_STATUS_DB: Record<string, string[]> = {
  queued: ['awaiting_upload', 'queued'],
  processing: ['processing'],
  completed: ['complete'],
  failed: ['failed'],
};

type ReportPayload = {
  verdict?: {
    class?: string | null;
    confidence?: number | null;
    confidence_score?: number | null;
  } | null;
  report?: { report_id?: string } | null;
  report_id?: string | null;
  signals?: unknown[] | null;
};

@Injectable()
export class AdminService {
  private readonly waitlistTable: string;
  private readonly profilesTable: string;
  private readonly orgsTable: string;
  private readonly membersTable: string;
  private readonly flagsTable: string;
  private readonly auditTable: string;
  private readonly scansTable: string;
  private readonly incidentsTable: string;
  private readonly uploadsBucket: string;
  private readonly storageCapacityGb: number;
  private readonly dbMaxConnections: number;
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.waitlistTable =
      this.configService.get<string>('SUPABASE_WAITLIST_TABLE') ||
      'waitlist_applications';
    this.profilesTable =
      this.configService.get<string>('SUPABASE_PROFILES_TABLE') || 'profiles';
    this.orgsTable =
      this.configService.get<string>('SUPABASE_ORGANIZATIONS_TABLE') ||
      'organizations';
    this.membersTable =
      this.configService.get<string>('SUPABASE_ORGANIZATION_MEMBERS_TABLE') ||
      'organization_members';
    this.flagsTable =
      this.configService.get<string>('SUPABASE_FEATURE_FLAGS_TABLE') ||
      'feature_flags';
    this.auditTable =
      this.configService.get<string>('SUPABASE_AUDIT_LOGS_TABLE') ||
      'audit_logs';
    this.scansTable =
      this.configService.get<string>('SUPABASE_SCANS_TABLE') || 'scans';
    this.incidentsTable =
      this.configService.get<string>('SUPABASE_INCIDENTS_TABLE') ||
      'admin_incidents';
    this.uploadsBucket =
      this.configService.get<string>('SUPABASE_UPLOADS_BUCKET') ||
      'provance-uploads';
    this.storageCapacityGb = this.configService.get<number>(
      'STORAGE_CAPACITY_GB',
      500,
    );
    this.dbMaxConnections = this.configService.get<number>(
      'DB_MAX_CONNECTIONS',
      100,
    );
  }

  async getDashboard() {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const [
      { data: waitlistRows, error: waitlistError },
      { data: inviteRows, error: inviteError },
      { data: auditRows, error: auditError },
    ] = await Promise.all([
      adminClient
        .from(this.waitlistTable)
        .select(
          'id,email,full_name,company,role_title,use_case,status,reviewed_by,reviewed_at,approved_at,created_at,updated_at,notes',
        )
        .order('created_at', { ascending: false }),
      adminClient
        .from('access_invites')
        .select(
          'id,email,status,expires_at,accepted_at,created_at,waitlist_application_id',
        )
        .order('created_at', { ascending: false }),
      adminClient
        .from(this.auditTable)
        .select(
          'id,actor_email,action,entity_type,entity_id,details,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (waitlistError || inviteError || auditError) {
      throw new ServiceUnavailableException('Failed to load admin dashboard.');
    }

    const waitlist = (waitlistRows ?? []) as WaitlistRow[];
    const invites = inviteRows ?? [];
    const recentAuditEvents = auditRows ?? [];

    const dailySignUps = buildDailySignUps(waitlist);

    return {
      summary: {
        totalRegistrations: waitlist.length,
        pendingReview: waitlist.filter((row) =>
          ['waitlist_submitted', 'under_review', 'deferred'].includes(
            row.status,
          ),
        ).length,
        approved: waitlist.filter((row) => row.status === 'approved').length,
        rejected: waitlist.filter((row) => row.status === 'rejected').length,
        invitesPending: invites.filter((invite) => invite.status === 'pending')
          .length,
        invitesAccepted: invites.filter(
          (invite) => invite.status === 'accepted',
        ).length,
      },
      dailySignUps,
      waitlist,
      invites,
      recentAuditEvents,
    };
  }

  async reviewWaitlistApplication(
    applicationId: string,
    reviewer: { id: string; email?: string },
    input: {
      status: 'under_review' | 'approved' | 'rejected' | 'deferred';
      notes?: string;
    },
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const record = await this.getWaitlistApplicationOrThrow(applicationId);
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: input.status,
      reviewed_by: reviewer.id,
      reviewed_at: now,
      notes: input.notes?.trim() || record.notes || null,
    };

    if (input.status === 'approved') {
      updates.approved_at = now;
    }

    const { error } = await adminClient
      .from(this.waitlistTable)
      .update(updates)
      .eq('id', applicationId);

    if (error) {
      throw new ServiceUnavailableException(
        'Failed to update waitlist application.',
      );
    }

    await this.insertAdminAuditEvent(
      reviewer,
      'waitlist_reviewed',
      applicationId,
      {
        email: record.email,
        status: input.status,
        notes: input.notes?.trim() || null,
      },
    );

    return {
      status: 'updated',
      applicationId,
      reviewStatus: input.status,
    };
  }

  async createInvite(
    applicationId: string,
    reviewer: { id: string; email?: string },
    input: { expiresInDays?: number },
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const application = await this.getWaitlistApplicationOrThrow(applicationId);
    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    const expiresInDays = input.expiresInDays ?? 7;
    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await adminClient
      .from('access_invites')
      .insert({
        email: application.email,
        waitlist_application_id: application.id,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select(
        'id,email,status,expires_at,accepted_at,created_at,waitlist_application_id',
      )
      .single();

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to create access invite.');
    }

    await adminClient
      .from(this.waitlistTable)
      .update({
        status: 'approved',
        reviewed_by: reviewer.id,
        reviewed_at: now.toISOString(),
        approved_at: now.toISOString(),
      })
      .eq('id', application.id);

    await this.insertAdminAuditEvent(reviewer, 'invite_created', data.id, {
      email: application.email,
      waitlist_application_id: application.id,
      expires_at: expiresAt,
    });

    return {
      status: 'created',
      invite: {
        ...data,
        inviteToken: rawToken,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Users / Organizations / Feature flags / Audit logs
  // -------------------------------------------------------------------------

  async listUsers(
    pagination: {
      page: number;
      pageSize: number;
      team?: string;
    } = { page: 1, pageSize: 20 },
  ) {
    const adminClient = this.requireClient();
    const safePage = Math.max(1, pagination.page);
    const safePageSize = Math.min(200, Math.max(1, pagination.pageSize));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    // Optional team filter (profiles.team_id, 0012_profiles_team.sql) — applied
    // to both the data and count chains so the envelope stays consistent. The
    // frontend also filters client-side; the server filter is additive so API
    // clients can scope without pulling the whole roster.
    const teamFilter =
      pagination.team && pagination.team !== 'all' ? pagination.team : null;

    let profilesQuery = adminClient
      .from(this.profilesTable)
      .select(
        'user_id,email,display_name,account_role,team_access,team_id,created_at,updated_at',
      )
      .order('created_at', { ascending: false })
      .range(from, to);
    let countQuery = adminClient
      .from(this.profilesTable)
      .select('user_id', { count: 'exact', head: true });

    if (teamFilter) {
      profilesQuery = profilesQuery.eq('team_id', teamFilter);
      countQuery = countQuery.eq('team_id', teamFilter);
    }

    const { data: profileRows, error } = await profilesQuery;

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch users.');
    }

    const profiles = (profileRows ?? []) as ProfileRow[];
    const userIds = profiles.map((profile) => profile.user_id);

    // Resolve each user's org and team (single-org assumption: first
    // membership wins). profiles.team_id is the flat source after the 0012
    // backfill; the membership row is the fallback for legacy users where the
    // profile column is still null.
    const orgByUser = new Map<string, string>();
    const teamByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: memberRows, error: memberError } = await adminClient
        .from(this.membersTable)
        .select('user_id, organization_id, team_id')
        .in('user_id', userIds);
      if (!memberError) {
        for (const row of memberRows ?? []) {
          if (!orgByUser.has(row.user_id)) {
            orgByUser.set(row.user_id, row.organization_id);
          }
          if (!teamByUser.has(row.user_id) && row.team_id) {
            teamByUser.set(row.user_id, row.team_id);
          }
        }
      }
    }

    const { count } = await countQuery;

    const data = profiles.map((profile) => ({
      id: profile.user_id,
      email: profile.email,
      displayName: profile.display_name,
      role: profile.account_role,
      team_enabled: profile.team_access,
      team_id: profile.team_id ?? teamByUser.get(profile.user_id) ?? null,
      created_at: profile.created_at,
      // profiles has no separate last_sign_in column; updated_at is the proxy.
      last_sign_in: profile.updated_at,
      avatar_url: null,
      org_id: orgByUser.get(profile.user_id) ?? null,
    }));
    const total = count ?? data.length;

    return {
      data,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async listOrganizations() {
    const adminClient = this.requireClient();

    const { data: orgRows, error } = await adminClient
      .from(this.orgsTable)
      .select('id,name,storage_used_gb,scan_count,created_at')
      .order('created_at', { ascending: true });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch organizations.');
    }

    const orgs = (orgRows ?? []) as OrganizationRow[];
    const data = await Promise.all(
      orgs.map(async (org) => {
        const [memberCount, adminCount] = await Promise.all([
          this.countMembers(adminClient, org.id, null),
          this.countMembers(adminClient, org.id, 'admin'),
        ]);
        return {
          id: org.id,
          name: org.name,
          member_count: memberCount,
          // "Admins" counts everyone who can manage (owner + admin).
          admin_count: adminCount,
          storage_used_gb: org.storage_used_gb,
          scan_count: org.scan_count,
          created_at: org.created_at,
        };
      }),
    );

    return data;
  }

  async listFeatureFlags() {
    const adminClient = this.requireClient();

    const { data, error } = await adminClient
      .from(this.flagsTable)
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch feature flags.');
    }

    return (data ?? []) as FeatureFlagRow[];
  }

  async updateFeatureFlag(key: string, enabled: boolean) {
    const adminClient = this.requireClient();
    const updatedAt = new Date().toISOString();

    const { data, error } = await adminClient
      .from(this.flagsTable)
      .update({ enabled, updated_at: updatedAt })
      .eq('key', key)
      .select('key')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'Failed to update the feature flag.',
      );
    }
    if (!data) {
      throw new NotFoundException('Feature flag not found.');
    }

    return { key, enabled, updated_at: updatedAt };
  }

  /**
   * listAuditLogs — the admin audit trail, filtered and paginated.
   *
   * Mirrors the account-activity pattern (AccountService.getActivity): the
   * optional filters are applied to both the data and count queries so the
   * total reflects the filtered universe, and the response uses the same
   * { data, page, pageSize, total, totalPages } envelope the frontend pages
   * already consume. The page also filters client-side, so the server-side
   * filters are additive — sending them back keeps the real path honest and
   * lets API clients filter without pulling the whole trail.
   *
   * Filters: severity / actor (actor_email) / action / resourceType
   * (entity_type) / search (ilike across actor, action, resource id).
   */
  async listAuditLogs(
    input: {
      page?: number;
      pageSize?: number;
      severity?: string;
      actor?: string;
      action?: string;
      resourceType?: string;
      search?: string;
    } = {},
  ) {
    const adminClient = this.requireClient();
    const safePage = Math.max(1, input.page ?? 1);
    const safePageSize = Math.min(500, Math.max(1, input.pageSize ?? 100));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    // ── Optional filters (applied to both data + count) ────────────────────
    // Resolved once, then applied to both builders — mirrors the conditional
    // chaining pattern in getActivity / countMembers.
    const filterClauses: Array<{
      type: 'eq' | 'search';
      column: string;
      value: string;
    }> = [];

    if (input.severity && input.severity !== 'all') {
      filterClauses.push({ type: 'eq', column: 'severity', value: input.severity });
    }
    if (input.actor && input.actor !== 'all') {
      filterClauses.push({ type: 'eq', column: 'actor_email', value: input.actor });
    }
    if (input.action && input.action !== 'all') {
      filterClauses.push({ type: 'eq', column: 'action', value: input.action });
    }
    if (input.resourceType && input.resourceType !== 'all') {
      filterClauses.push({ type: 'eq', column: 'entity_type', value: input.resourceType });
    }
    if (input.search?.trim()) {
      filterClauses.push({
        type: 'search',
        column: 'search',
        value: input.search.trim(),
      });
    }

    let dataQuery = adminClient
      .from(this.auditTable)
      .select('id,actor_email,action,severity,entity_type,entity_id,created_at')
      .order('created_at', { ascending: false })
      .range(from, to);

    let countQuery = adminClient
      .from(this.auditTable)
      .select('id', { count: 'exact', head: true });

    for (const clause of filterClauses) {
      if (clause.type === 'eq') {
        dataQuery = dataQuery.eq(clause.column, clause.value);
        countQuery = countQuery.eq(clause.column, clause.value);
      } else {
        // Free-text search across the same fields the frontend page matches
        // (actor, action, resource) — PostgREST or() filter so a single clause
        // covers all four columns on both the data and count chains.
        const needle = clause.value;
        const orFilter =
          `actor_email.ilike.%${needle}%,action.ilike.%${needle}%,` +
          `entity_type.ilike.%${needle}%,entity_id.ilike.%${needle}%`;
        dataQuery = dataQuery.or(orFilter);
        countQuery = countQuery.or(orFilter);
      }
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error || countError) {
      throw new ServiceUnavailableException('Failed to fetch audit logs.');
    }

    const rows = (data ?? []) as AuditRow[];
    const total = count ?? rows.length;

    return {
      data: rows.map((row) => ({
        id: row.id,
        actor_email: row.actor_email || 'system',
        action: row.action,
        // Prefer the severity stored with the row; fall back to the shared
        // action map so legacy rows written before severity existed badge
        // identically to the frontend mock.
        severity: row.severity || auditSeverity(row.action),
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

  /**
   * getAnalytics — aggregates scan volume, outcome rates, media mix, queue
   * throughput, and top-org usage from the scans table.
   *
   * Matches the mockAnalytics shape the admin Analytics page consumes
   * (src/pages/admin/AnalyticsPage.jsx): trends are daily buckets over the
   * last 14 days, media distribution covers the last 7 days (mirroring the
   * mock where media totals equal scans_7d), queue throughput is derived from
   * the live scans table (queue_depth/in_flight are whole-table head counts).
   */
  async getAnalytics(input: { team?: string } = {}) {
    const adminClient = this.requireClient();

    const now = Date.now();
    const DAY_MS = 86_400_000;
    const HOUR_MS = 3_600_000;
    const since = new Date(now - 30 * DAY_MS).toISOString();
    // Optional team scope (scans.team_id): when set (and not the 'all'
    // sentinel), the top-org usage split is computed from only that team's
    // scans — the same scope the admin Analytics page's TeamFilter drives via
    // ?team= instead of a client-side mock join. KPI/trend/media/queue
    // aggregates stay platform-wide (the page labels only the top-orgs panel
    // as scoped, and the mock matches).
    const teamFilter = input.team && input.team !== 'all' ? input.team : null;

    const [
      { data: scanRows, error: scanError },
      { data: orgRows, error: orgError },
      { data: memberRows, error: memberError },
      { count: queuedCount, error: queuedError },
      { count: inFlightCount, error: inFlightError },
    ] = await Promise.all([
      adminClient
        .from(this.scansTable)
        .select(
          'user_id,status,mime_type,result_payload,team_id,created_at,updated_at',
        )
        .gte('created_at', since),
      adminClient
        .from(this.orgsTable)
        .select('id,name,storage_used_gb,scan_count'),
      adminClient
        .from(this.membersTable)
        .select('organization_id,user_id,role'),
      adminClient
        .from(this.scansTable)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'queued'),
      adminClient
        .from(this.scansTable)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing'),
    ]);

    if (scanError || orgError || memberError || queuedError || inFlightError) {
      throw new ServiceUnavailableException('Failed to load analytics.');
    }

    const allScans = (scanRows ?? []) as ScanAnalyticsRow[];
    const scans = allScans;
    // The top-org usage split is scoped to the team when one is active;
    // everything else aggregates over the full window.
    const orgScopeScans = teamFilter
      ? allScans.filter((scan) => scan.team_id === teamFilter)
      : allScans;
    const orgs = (orgRows ?? []) as OrganizationRow[];
    const members = (memberRows ?? []) as OrgMemberRow[];

    // user_id → organization_id for per-org scan accounting (single-org
    // assumption: first membership wins, matching listUsers).
    const orgByUser = new Map<string, string>();
    for (const member of members) {
      if (!orgByUser.has(member.user_id)) {
        orgByUser.set(member.user_id, member.organization_id);
      }
    }

    // ── Daily buckets (last 14 days, oldest → newest) ──────────────────────
    const dayKeys: string[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      dayKeys.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
    }
    const dayIndex = new Map(dayKeys.map((key, i) => [key, i]));
    const volumeTrend = dayKeys.map(() => ({
      date: '',
      scans: 0,
      completed: 0,
      failed: 0,
      suspicious: 0,
    }));
    const verdictTrend = dayKeys.map(() => ({
      date: '',
      authentic: 0,
      suspicious: 0,
      inconclusive: 0,
    }));

    // ── Hourly buckets (last 12 hours for the queue chart) ─────────────────
    const hourKeys: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      hourKeys.push(new Date(now - i * HOUR_MS).toISOString().slice(0, 13));
    }
    const hourIndex = new Map(hourKeys.map((key, i) => [key, i]));
    const processedPerHour = hourKeys.map(() => 0);

    const mediaCounts = new Map<string, number>();
    const orgScans = new Map<string, { total: number; completed: number }>();

    let scansToday = 0;
    let scans7d = 0;
    let processedLastHour = 0;
    let processed24h = 0;
    let latencySumMs = 0;
    let latencySamples = 0;

    for (const scan of scans) {
      const createdMs = new Date(scan.created_at).getTime();
      const ageMs = now - createdMs;
      const verdictClass = getVerdictClass(scan.result_payload);
      const completed = scan.status === 'complete';
      const failed = scan.status === 'failed';

      if (ageMs <= DAY_MS) scansToday += 1;
      if (ageMs <= 7 * DAY_MS) {
        scans7d += 1;
        mediaCounts.set(
          scan.mime_type,
          (mediaCounts.get(scan.mime_type) || 0) + 1,
        );
      }

      const dayKey = scan.created_at?.slice(0, 10);
      const dayIdx = dayIndex.get(dayKey);
      if (dayIdx !== undefined) {
        volumeTrend[dayIdx].scans += 1;
        if (completed) volumeTrend[dayIdx].completed += 1;
        if (failed) volumeTrend[dayIdx].failed += 1;
        if (completed && verdictClass === 'suspicious') {
          volumeTrend[dayIdx].suspicious += 1;
        }

        if (completed) {
          if (verdictClass === 'likely_authentic')
            verdictTrend[dayIdx].authentic += 1;
          else if (verdictClass === 'suspicious')
            verdictTrend[dayIdx].suspicious += 1;
          else if (verdictClass === 'inconclusive')
            verdictTrend[dayIdx].inconclusive += 1;
        }
      }

      if (completed) {
        if (ageMs <= HOUR_MS) processedLastHour += 1;
        if (ageMs <= 24 * HOUR_MS) processed24h += 1;
        const hourKey = scan.created_at?.slice(0, 13);
        const hourIdx = hourIndex.get(hourKey);
        if (hourIdx !== undefined) processedPerHour[hourIdx] += 1;

        // Proxy processing time: completed_at − created_at (the scans table
        // has no dedicated processing-time column).
        const updatedMs = new Date(scan.updated_at).getTime();
        if (Number.isFinite(updatedMs) && updatedMs >= createdMs) {
          latencySumMs += updatedMs - createdMs;
          latencySamples += 1;
        }
      }
    }

    // Org accounting shares the 14-day trend window so the page's top-org
    // scan counts reconcile with the KPI/trend numbers — scoped to the active
    // team when one is selected (matches the mock + the page's "X scoped"
    // label on the top-orgs panel).
    for (const scan of orgScopeScans) {
      const completed = scan.status === 'complete';
      const dayIdx = dayIndex.get(scan.created_at?.slice(0, 10));
      if (dayIdx === undefined) continue;
      const orgId = orgByUser.get(scan.user_id);
      if (orgId) {
        const acc = orgScans.get(orgId) || { total: 0, completed: 0 };
        acc.total += 1;
        if (completed) acc.completed += 1;
        orgScans.set(orgId, acc);
      }
    }

    // ── Outcome rates over the 14-day trend window ─────────────────────────
    const windowScans = volumeTrend.reduce((sum, day) => sum + day.scans, 0);
    const windowCompleted = volumeTrend.reduce(
      (sum, day) => sum + day.completed,
      0,
    );
    const windowFailed = volumeTrend.reduce((sum, day) => sum + day.failed, 0);
    const windowSuspicious = volumeTrend.reduce(
      (sum, day) => sum + day.suspicious,
      0,
    );

    const completionRate = windowScans > 0 ? windowCompleted / windowScans : 0;
    const failureRate = windowScans > 0 ? windowFailed / windowScans : 0;
    const suspiciousRate = windowScans > 0 ? windowSuspicious / windowScans : 0;

    // ── Media-type distribution (7-day window, mirroring mock parity) ───────
    const mediaTypeDistribution = Object.fromEntries(
      [...mediaCounts.entries()].sort(([left], [right]) =>
        left < right ? -1 : 1,
      ),
    );

    // ── Top organizations (real scan counts + member counts) ───────────────
    const memberCountByOrg = new Map<string, number>();
    for (const member of members) {
      memberCountByOrg.set(
        member.organization_id,
        (memberCountByOrg.get(member.organization_id) || 0) + 1,
      );
    }

    const topOrganizations = orgs
      .map((org) => {
        const usage = orgScans.get(org.id) || { total: 0, completed: 0 };
        return {
          id: org.id,
          name: org.name,
          member_count: memberCountByOrg.get(org.id) ?? 0,
          scan_count: usage.total,
          storage_used_gb: org.storage_used_gb ?? 0,
          completion_rate: usage.total > 0 ? usage.completed / usage.total : 0,
        };
      })
      .sort((left, right) => right.scan_count - left.scan_count)
      .slice(0, 6);

    // ── Trends: stamp the day/hour labels ──────────────────────────────────
    const volumeTrendOut = volumeTrend.map((day, i) => ({
      ...day,
      date: `${dayKeys[i]}T12:00:00.000Z`,
    }));
    const verdictTrendOut = verdictTrend.map((day, i) => ({
      ...day,
      date: `${dayKeys[i]}T12:00:00.000Z`,
    }));
    const hourlySeries = hourKeys.map((key, i) => ({
      hour: `${key}:00:00.000Z`,
      processed: processedPerHour[i],
    }));

    // ── Per-team scan counts (30-day window, unscoped) ─────────────────────
    // Drives the admin Analytics page's TeamFilter chips so each team's live
    // volume comes from the scans table instead of the mock dataset. Computed
    // from the full window (allScans) so the chip counts stay correct even
    // when a team is actively scoping the rest of the page.
    const teamBreakdown = new Map<string, number>();
    for (const scan of allScans) {
      if (scan.team_id) {
        teamBreakdown.set(scan.team_id, (teamBreakdown.get(scan.team_id) || 0) + 1);
      }
    }

    return {
      scans_today: scansToday,
      scans_7d: scans7d,
      completion_rate: completionRate,
      failure_rate: failureRate,
      suspicious_rate: suspiciousRate,
      media_type_distribution: mediaTypeDistribution,
      volume_trend: volumeTrendOut,
      verdict_trend: verdictTrendOut,
      queue_throughput: {
        processed_last_hour: processedLastHour,
        processed_24h: processed24h,
        avg_processing_time_ms:
          latencySamples > 0 ? Math.round(latencySumMs / latencySamples) : null,
        queue_depth: queuedCount ?? 0,
        in_flight: inFlightCount ?? 0,
        failure_rate: failureRate,
        hourly_series: hourlySeries,
      },
      top_organizations: topOrganizations,
      team_breakdown: [...teamBreakdown.entries()]
        .map(([team_id, scans]) => ({ team_id, scans }))
        .sort((left, right) => right.scans - left.scans),
    };
  }

  /**
   * getMonitoring — real-time platform health: per-service probes, queue
   * health derived from the scans table, storage utilization from recorded
   * scan byte counts, measured database latency, and incident history from
   * the admin_incidents table (0007_incidents.sql).
   *
   * Matches the mockMonitoring shape the Admin Monitoring page consumes
   * (src/pages/admin/MonitoringPage.jsx). Panels the platform cannot measure
   * honestly (cache hit rate, table dead tuples) are returned as null — the
   * page renders '—' and hides those gauges gracefully.
   */
  async getMonitoring() {
    const adminClient = this.requireClient();

    const now = Date.now();
    const DAY_MS = 86_400_000;
    const HOUR_MS = 3_600_000;
    const MIN_MS = 60_000;

    // ── Real timed probes (latency is genuinely measured) ──────────────────
    const probeQueryMs: number[] = [];
    const probe = async (
      fn: () => Promise<unknown>,
    ): Promise<{ ok: boolean; ms: number }> => {
      const start = Date.now();
      try {
        await fn();
        probeQueryMs.push(Date.now() - start);
        return { ok: true, ms: Date.now() - start };
      } catch {
        return { ok: false, ms: Date.now() - start };
      }
    };

    const dbProbe = await probe(async () => {
      const { error } = await adminClient
        .from(this.scansTable)
        .select('id', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
    });

    const storageProbe = await probe(async () => {
      const { error } = await adminClient.storage
        .from(this.uploadsBucket)
        .list('', {
          limit: 1,
        });
      if (error) throw new Error(error.message);
    });

    const redisConfigured = Boolean(
      (this.configService.get<string>('REDIS_URL') || '').trim(),
    );
    const smtpConfigured = Boolean(
      this.configService.get<string>('SMTP_HOST') ||
      this.configService.get<string>('RESEND_API_KEY') ||
      this.configService.get<string>('POSTMARK_API_KEY'),
    );

    // ── Scan aggregates (queue health, throughput, rates) ──────────────────
    // The scan rows feed both the 12h/24h/30d buckets (bounded by age in the
    // loop below) and the storage total, which intentionally spans ALL scans
    // so "media uploads used" reflects full usage, not just the last 30 days.
    const [
      { data: scanRows, error: scanError },
      { data: incidentRows, error: incidentError },
      { count: queuedCount, error: queuedError },
      { count: inFlightCount, error: inFlightError },
      { count: tableScans, error: tableScansError },
      { count: tableProfiles, error: tableProfilesError },
      { count: tableWaitlist, error: tableWaitlistError },
      { count: tableAudit, error: tableAuditError },
    ] = await Promise.all([
      adminClient
        .from(this.scansTable)
        .select('status,file_size_bytes,created_at,updated_at'),
      adminClient
        .from(this.incidentsTable)
        .select('*')
        .order('started_at', { ascending: false }),
      adminClient
        .from(this.scansTable)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'queued'),
      adminClient
        .from(this.scansTable)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing'),
      adminClient
        .from(this.scansTable)
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from(this.profilesTable)
        .select('user_id', { count: 'exact', head: true }),
      adminClient
        .from(this.waitlistTable)
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from(this.auditTable)
        .select('id', { count: 'exact', head: true }),
    ]);

    if (
      scanError ||
      queuedError ||
      inFlightError ||
      tableScansError ||
      tableProfilesError ||
      tableWaitlistError ||
      tableAuditError
    ) {
      throw new ServiceUnavailableException('Failed to load monitoring data.');
    }

    // The incidents table is a display-only peripheral: a missing or errored
    // table (e.g. migration 0007 not applied live) degrades the incidents
    // section instead of 503-ing the entire monitoring surface. The overall
    // status is forced to degraded so the data gap stays visible on the page.
    const incidentsUnavailable = Boolean(incidentError);

    const scans = (scanRows ?? []) as Array<{
      status: string;
      file_size_bytes: number;
      created_at: string;
      updated_at: string;
    }>;

    // ── Hourly buckets (last 12 hours, oldest → newest) ────────────────────
    const hourKeys: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      hourKeys.push(new Date(now - i * HOUR_MS).toISOString().slice(0, 13));
    }
    const hourIndex = new Map(hourKeys.map((key, i) => [key, i]));
    const processedPerHour = hourKeys.map(() => 0);

    // ── Daily buckets (last 14 days, oldest → newest) for the queue-health
    // daily throughput trend. Keyed on the scan's completion date so the
    // TrendChart series (processed / completed / failed per day) stays
    // consistent with the hourly cadence.
    const dayKeys: string[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      dayKeys.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
    }
    const dayIndex = new Map(dayKeys.map((key, i) => [key, i]));
    const processedPerDay = dayKeys.map(() => 0);
    const completedPerDay = dayKeys.map(() => 0);
    const failedPerDay = dayKeys.map(() => 0);

    let completed30d = 0;
    let failed30d = 0;
    let completed24h = 0;
    let failed24h = 0;
    let completed1h = 0;
    let lastWorkerActivityMs = 0;
    let usedBytes = 0;
    let latencySumMs = 0;
    let latencySamples = 0;

    for (const scan of scans) {
      const createdMs = new Date(scan.created_at).getTime();
      const updatedMs = new Date(scan.updated_at).getTime();
      const ageMs = now - createdMs;
      const completed = scan.status === 'complete';
      const failed = scan.status === 'failed';

      usedBytes += Number(scan.file_size_bytes) || 0;

      if (completed) {
        if (ageMs <= 30 * DAY_MS) completed30d += 1;
        if (ageMs <= 24 * HOUR_MS) {
          completed24h += 1;
          if (ageMs <= HOUR_MS) completed1h += 1;
          if (updatedMs > lastWorkerActivityMs)
            lastWorkerActivityMs = updatedMs;
          const hourKey = scan.created_at?.slice(0, 13);
          const hourIdx = hourIndex.get(hourKey);
          if (hourIdx !== undefined) processedPerHour[hourIdx] += 1;
          if (Number.isFinite(updatedMs) && updatedMs >= createdMs) {
            latencySumMs += updatedMs - createdMs;
            latencySamples += 1;
          }
        }

        // Daily trend buckets: processed = completed + failed per completion day.
        const completedDayKey = scan.updated_at?.slice(0, 10);
        const completedDayIdx = dayIndex.get(completedDayKey);
        if (completedDayIdx !== undefined) {
          processedPerDay[completedDayIdx] += 1;
          completedPerDay[completedDayIdx] += 1;
        }
      } else if (failed) {
        if (ageMs <= 30 * DAY_MS) failed30d += 1;
        if (ageMs <= 24 * HOUR_MS) failed24h += 1;

        // Daily trend buckets: failed scans bucket on their failure date.
        const failedDayKey = scan.updated_at?.slice(0, 10);
        const failedDayIdx = dayIndex.get(failedDayKey);
        if (failedDayIdx !== undefined) {
          processedPerDay[failedDayIdx] += 1;
          failedPerDay[failedDayIdx] += 1;
        }
      }
    }

    // ── Service probes ──────────────────────────────────────────────────────
    // A configured worker with no backlog is idle, not degraded — only a
    // backlog with no recent completions counts as degraded.
    const hasBacklog = (queuedCount ?? 0) + (inFlightCount ?? 0) > 0;
    const workerActiveRecently =
      redisConfigured && now - lastWorkerActivityMs <= 10 * MIN_MS;
    const workerStatus = !redisConfigured
      ? 'not_configured'
      : !hasBacklog || workerActiveRecently
        ? 'operational'
        : 'degraded';

    const uptimeFromScans =
      completed30d + failed30d > 0
        ? completed30d / (completed30d + failed30d)
        : null;
    const lastCheckedAt = new Date().toISOString();

    const services = [
      {
        id: 'api',
        name: 'API Gateway',
        status: dbProbe.ok ? 'operational' : 'unreachable',
        latency_ms: dbProbe.ok ? dbProbe.ms : null,
        region: 'fly-iad',
        uptime_30d: uptimeFromScans,
        last_checked_at: lastCheckedAt,
      },
      {
        id: 'database',
        name: 'Postgres (Neon)',
        status: dbProbe.ok ? 'operational' : 'unreachable',
        latency_ms: dbProbe.ok ? dbProbe.ms : null,
        region: 'us-east-1',
        uptime_30d: uptimeFromScans,
        last_checked_at: lastCheckedAt,
      },
      {
        id: 'storage',
        name: 'Object Storage (R2)',
        status: storageProbe.ok ? 'operational' : 'degraded',
        latency_ms: storageProbe.ok ? storageProbe.ms : null,
        region: 'us-east-1',
        uptime_30d: uptimeFromScans,
        last_checked_at: lastCheckedAt,
      },
      {
        id: 'queue',
        name: 'Job Queue (Redis)',
        status: redisConfigured ? 'operational' : 'not_configured',
        latency_ms: null,
        region: 'us-east-1',
        uptime_30d: null,
        last_checked_at: lastCheckedAt,
      },
      {
        id: 'worker',
        name: 'Scan Worker',
        status: workerStatus,
        latency_ms: null,
        region: 'fly-iad',
        uptime_30d: redisConfigured ? uptimeFromScans : null,
        last_checked_at: lastCheckedAt,
      },
      {
        id: 'email',
        name: 'Email Service',
        status: smtpConfigured ? 'operational' : 'not_configured',
        latency_ms: null,
        region: '—',
        uptime_30d: null,
        last_checked_at: lastCheckedAt,
      },
    ];

    const incidents = (incidentsUnavailable ? [] : (incidentRows ?? [])) as Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      started_at: string;
      resolved_at: string | null;
      duration_hours: number | null;
      services: string[];
      summary: string;
    }>;
    const openIncidents = incidents.filter(
      (incident) => incident.status !== 'resolved',
    ).length;

    const reached = dbProbe.ok && storageProbe.ok;
    const hasDegraded = services.some((service) =>
      ['degraded', 'not_configured'].includes(service.status),
    );
    const overallStatus = !reached
      ? 'unreachable'
      : hasDegraded || openIncidents > 0 || incidentsUnavailable
        ? 'degraded'
        : 'operational';

    const measuredLatencies = services
      .map((service) => service.latency_ms)
      .filter((value): value is number => value !== null);
    const avgResponseMs =
      measuredLatencies.length > 0
        ? Math.round(
            measuredLatencies.reduce((sum, value) => sum + value, 0) /
              measuredLatencies.length,
          )
        : null;

    const completionIn24h = completed24h + failed24h;
    const failureRate = completionIn24h > 0 ? failed24h / completionIn24h : 0;
    const avgProcessingTimeMs =
      latencySamples > 0 ? Math.round(latencySumMs / latencySamples) : null;
    // Proxy "automated probes run": 24h scan completions/failures plus
    // current backlog head counts (backlog counts are whole-table, not
    // time-bounded — acceptable skew for an activity proxy).
    const checks24h =
      completionIn24h + (queuedCount ?? 0) + (inFlightCount ?? 0);

    const hourlySeries = hourKeys.map((key, i) => ({
      hour: `${key}:00:00.000Z`,
      processed: processedPerHour[i],
    }));

    const usedGb = usedBytes / 1_000_000_000;
    const storageUtilization =
      usedBytes > 0
        ? {
            total_used_gb: round2(usedGb),
            total_capacity_gb: this.storageCapacityGb,
            buckets: [
              {
                id: 'uploads',
                label: 'Media uploads',
                used_gb: round2(usedGb),
                capacity_gb: this.storageCapacityGb,
                growth_30d: null,
              },
            ],
          }
        : null;

    // ── Measured DB latency (p50/p95 from the probes actually run) ─────────
    // Note: n is small (db + storage probes), so the percentiles are coarse;
    // they still reflect genuinely measured round-trips, not constants.
    const sortedProbeMs = [...probeQueryMs].sort((a, b) => a - b);
    const avgQueryMs =
      sortedProbeMs.length > 0
        ? Math.round(
            sortedProbeMs.reduce((sum, value) => sum + value, 0) /
              sortedProbeMs.length,
          )
        : null;
    const p95QueryMs =
      sortedProbeMs.length > 0
        ? sortedProbeMs[
            Math.min(
              sortedProbeMs.length - 1,
              Math.floor(sortedProbeMs.length * 0.95),
            )
          ]
        : null;

    const dbPerformance = {
      avg_query_ms: avgQueryMs,
      p95_query_ms: p95QueryMs,
      connections: {
        active: inFlightCount ?? 0,
        max: this.dbMaxConnections,
      },
      cache_hit_rate: null,
      slow_queries_24h: failed24h,
      tables: [
        {
          name: 'scans',
          rows: tableScans ?? 0,
          size_mb: 0,
          dead_tuples_pct: null,
        },
        {
          name: 'profiles',
          rows: tableProfiles ?? 0,
          size_mb: 0,
          dead_tuples_pct: null,
        },
        {
          name: 'waitlist_applications',
          rows: tableWaitlist ?? 0,
          size_mb: 0,
          dead_tuples_pct: null,
        },
        {
          name: 'audit_logs',
          rows: tableAudit ?? 0,
          size_mb: 0,
          dead_tuples_pct: null,
        },
      ],
    };

    return {
      overall: {
        status: overallStatus,
        // null when there is no completion data yet — the frontend renders '—'
        // consistently with the per-service uptime values.
        uptime_30d: uptimeFromScans,
        avg_response_ms: avgResponseMs,
        open_incidents: openIncidents,
        checks_24h: checks24h,
      },
      services,
      queue_health: {
        queued: queuedCount ?? 0,
        in_flight: inFlightCount ?? 0,
        failed_24h: failed24h,
        throughput_per_hour: completed1h,
        avg_processing_time_ms: avgProcessingTimeMs,
        failure_rate: failureRate,
        hourly_series: hourlySeries,
        daily_series: dayKeys.map((key, i) => ({
          date: `${key}T12:00:00.000Z`,
          processed: processedPerDay[i],
          completed: completedPerDay[i],
          failed: failedPerDay[i],
        })),
      },
      storage_utilization: storageUtilization,
      db_performance: dbPerformance,
      incidents: incidents.map((incident) => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        started_at: incident.started_at,
        resolved_at: incident.resolved_at,
        duration_hours: incident.duration_hours,
        services: incident.services,
        summary: incident.summary,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Jobs / Reports / Roles / Settings
  //
  // There are no dedicated jobs/reports/roles/settings tables — these surfaces
  // derive honestly from the tables that do exist (scans, profiles, org
  // membership, feature flags, audit logs), matching the getAnalytics /
  // getMonitoring precedent. Columns the schema cannot answer (priority,
  // worker, progress) default to neutral values the frontend renders as '—'.
  // -------------------------------------------------------------------------

  async listJobs(
    query: {
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const adminClient = this.requireClient();
    const { status, page = 1, pageSize = 500 } = query;
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(500, Math.max(1, pageSize));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    let queryBuilder = adminClient
      .from(this.scansTable)
      .select(JOB_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // ?status= accepts the page's display dialect ('completed', not the DB
    // 'complete') and maps to the underlying scan_status values. Default
    // pageSize 500 preserves the no-params frontend contract (the Jobs page
    // computes its own counts + pagination client-side).
    if (status && status !== 'all') {
      const dbStatuses = JOB_STATUS_DB[status];
      if (!dbStatuses) {
        throw new BadRequestException(`Unknown job status filter: ${status}`);
      }
      queryBuilder = queryBuilder.in('status', dbStatuses);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch jobs.');
    }

    const rows = (data ?? []) as ScanJobRow[];
    const jobs = rows.map(toJobView);
    const total = count ?? jobs.length;
    return {
      data: jobs,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async retryJob(
    jobId: string,
    actor?: { id?: string; email?: string },
  ) {
    const adminClient = this.requireClient();

    const { data: existing, error: findError } = await adminClient
      .from(this.scansTable)
      .select('id,status')
      .eq('id', jobId)
      .maybeSingle();

    if (findError) {
      throw new ServiceUnavailableException('Failed to fetch the job.');
    }
    if (!existing) {
      throw new NotFoundException('Job not found.');
    }
    if (existing.status !== 'failed') {
      throw new BadRequestException('Only failed jobs can be re-queued.');
    }

    const { data, error } = await adminClient
      .from(this.scansTable)
      .update({
        status: 'queued',
        failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select(JOB_COLUMNS)
      .single();

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to re-queue the job.');
    }

    // Audit trail (best-effort — a missing audit_logs table must never block
    // the admin action; severity derives from the shared action map).
    await this.insertAdminAuditEvent(
      { id: actor?.id ?? '', email: actor?.email },
      'scan.retried',
      jobId,
      { from: 'failed', to: 'queued' },
      'scan',
    );

    return { ok: true, job: toJobView(data) };
  }

  async failJob(
    jobId: string,
    reason?: string,
    actor?: { id?: string; email?: string },
  ) {
    const adminClient = this.requireClient();

    const { data: existing, error: findError } = await adminClient
      .from(this.scansTable)
      .select('id,status')
      .eq('id', jobId)
      .maybeSingle();

    if (findError) {
      throw new ServiceUnavailableException('Failed to fetch the job.');
    }
    if (!existing) {
      throw new NotFoundException('Job not found.');
    }
    if (existing.status === 'complete') {
      throw new BadRequestException('Completed jobs cannot be failed.');
    }
    if (existing.status === 'failed') {
      throw new BadRequestException('This job is already failed.');
    }

    const { data, error } = await adminClient
      .from(this.scansTable)
      .update({
        status: 'failed',
        failure_reason:
          reason || 'Manually failed by an administrator.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select(JOB_COLUMNS)
      .single();

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to fail the job.');
    }

    // Audit trail (best-effort) — records who killed the job and why.
    await this.insertAdminAuditEvent(
      { id: actor?.id ?? '', email: actor?.email },
      'scan.failed',
      jobId,
      { from: existing.status, to: 'failed', reason: reason ?? null },
      'scan',
    );

    return { ok: true, job: toJobView(data) };
  }

  async listAdminReports(
    pagination: {
      page: number;
      pageSize: number;
      team?: string;
    } = { page: 1, pageSize: 20 },
  ) {
    const adminClient = this.requireClient();
    const safePage = Math.max(1, pagination.page);
    const safePageSize = Math.min(200, Math.max(1, pagination.pageSize));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    // Optional team filter (scans.team_id, 0009_scan_processing.sql) — applied
    // to the data + count query so API clients can scope the ledger without
    // pulling the whole report set, mirroring listUsers' ?team= handling.
    const teamFilter =
      pagination.team && pagination.team !== 'all' ? pagination.team : null;

    let query = adminClient
      .from(this.scansTable)
      .select('id,status,user_id,team_id,result_payload,created_at', {
        count: 'exact',
      })
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (teamFilter) {
      query = query.eq('team_id', teamFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch reports.');
    }

    const rows = (data ?? []) as Array<
      ScanJobRow & { user_id: string | null }
    >;
    const userIds = rows
      .map((row) => row.user_id)
      .filter((value): value is string => Boolean(value));

    // Resolve each report's org (single-org assumption: first membership
    // wins, matching listUsers / getAnalytics).
    const orgByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: memberRows, error: memberError } = await adminClient
        .from(this.membersTable)
        .select('user_id, organization_id')
        .in('user_id', userIds);
      if (!memberError) {
        for (const row of memberRows ?? []) {
          if (!orgByUser.has(row.user_id)) {
            orgByUser.set(row.user_id, row.organization_id);
          }
        }
      }
    }

    // Resolve org names for the page's org ids so the Organization column
    // renders real names in both mock and real modes (getAnalytics precedent).
    const orgIds = [...new Set(orgByUser.values())];
    const orgNameById = new Map<string, string>();
    if (orgIds.length > 0) {
      const { data: orgRows, error: orgError } = await adminClient
        .from(this.orgsTable)
        .select('id,name')
        .in('id', orgIds);
      if (!orgError) {
        for (const org of orgRows ?? []) {
          orgNameById.set(org.id, org.name);
        }
      }
    }

    const reports = rows.map((row) => {
      const orgId = orgByUser.get(row.user_id ?? '') ?? null;
      return toReportView(
        row,
        orgId,
        orgId ? (orgNameById.get(orgId) ?? null) : null,
      );
    });
    const total = count ?? reports.length;
    return {
      data: reports,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async getSettings() {
    const adminClient = this.requireClient();

    const { data: flagRows, error } = await adminClient
      .from(this.flagsTable)
      .select('key,enabled');

    if (error) {
      throw new ServiceUnavailableException('Failed to load settings.');
    }

    const flagRowsTyped = (flagRows ?? []) as Array<{
      key: string;
      enabled: boolean;
    }>;
    const flags = new Map(flagRowsTyped.map((row) => [row.key, row.enabled]));

    return {
      environment: {
        name:
          this.configService.get<string>('NODE_ENV') === 'production'
            ? 'Production'
            : 'Development',
        region: this.configService.get<string>('REGION') ?? null,
        api_version: this.configService.get<string>('API_VERSION') ?? null,
        worker_version:
          this.configService.get<string>('WORKER_VERSION') ?? null,
        app_commit: this.configService.get<string>('GIT_SHA') ?? null,
        deployed_at: this.configService.get<string>('DEPLOYED_AT') ?? null,
      },
      operational: [
        {
          key: 'maintenance_mode',
          label: 'Maintenance mode',
          description:
            'Blocks new uploads and shows a maintenance banner across the workspace.',
          enabled: flags.get('maintenance_mode') ?? false,
          kind: 'toggle',
        },
        {
          key: 'open_signups',
          label: 'Open sign-ups',
          description:
            'Allow waitlist applications and new account creation without an invite.',
          enabled: flags.get('open_signups') ?? false,
          kind: 'toggle',
        },
        {
          key: 'deep_processing',
          label: 'Deep processing mode',
          description:
            'Enables the full signal ensemble (fingerprint, frequency, metadata, continuity).',
          enabled: flags.get('deep_scan_mode') ?? true,
          kind: 'toggle',
        },
        {
          key: 'max_upload_mb',
          label: 'Max upload size',
          description: 'Largest accepted media file size in megabytes.',
          value: String(this.configService.get<number>('MAX_UPLOAD_MB', 50)),
          kind: 'input',
        },
        {
          key: 'report_retention_days',
          label: 'Report retention',
          description:
            'How long completed reports are retained before archival.',
          value: String(
            this.configService.get<number>('REPORT_RETENTION_DAYS', 365),
          ),
          kind: 'input',
        },
      ],
      security: {
        session_timeout_minutes: this.configService.get<number>(
          'SESSION_TIMEOUT_MINUTES',
          120,
        ),
        mfa_enforced: this.configService.get<boolean>('MFA_ENFORCED', false),
        audit_retention_days: this.configService.get<number>(
          'AUDIT_RETENTION_DAYS',
          730,
        ),
        allowlist_only_signins: this.configService.get<boolean>(
          'ALLOWLIST_ONLY_SIGNINS',
          true,
        ),
      },
    };
  }

  private requireClient() {
    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }
    return adminClient;
  }

  private async countMembers(
    client: AdminClient,
    organizationId: string,
    role: string | null,
  ): Promise<number> {
    let query = client
      .from(this.membersTable)
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (role === 'admin') {
      query = query.in('role', ['owner', 'admin']);
    } else if (role !== null) {
      query = query.eq('role', role);
    }

    const { count, error } = await query;
    if (error) {
      throw new ServiceUnavailableException('Failed to count members.');
    }
    return count ?? 0;
  }

  private async getWaitlistApplicationOrThrow(applicationId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from(this.waitlistTable)
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'Failed to fetch waitlist application.',
      );
    }

    if (!data) {
      throw new NotFoundException('Waitlist application not found.');
    }

    return data as WaitlistRow;
  }

  private async insertAdminAuditEvent(
    reviewer: { id: string; email?: string },
    action: string,
    entityId: string,
    details: Record<string, unknown>,
    entityType = 'admin_operation',
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const { error } = await adminClient.from(this.auditTable).insert({
      actor_email: reviewer.email ?? null,
      action,
      severity: auditSeverity(action),
      entity_type: entityType,
      entity_id: entityId,
      details: {
        reviewer_id: reviewer.id,
        ...details,
      },
    });

    if (error) {
      // Best-effort trail: a missing audit_logs table (migration 0008 not
      // applied) must never fail the admin operation itself.
      this.logger.warn(
        `Audit log write failed (${action}): ${error.message}`,
      );
    }
  }
}

/**
 * VERDICT_CLASS_TO_DISPLAY — maps the analysis pipeline's verdict classes to
 * the flat display vocabulary the admin reports page consumes (mirror of the
 * frontend VERDICT_CLASS_TO_DISPLAY map in the scans service).
 */
const VERDICT_CLASS_TO_DISPLAY: Record<string, string> = {
  likely_authentic: 'authentic',
  suspicious: 'suspicious',
  inconclusive: 'inconclusive',
};

/**
 * getVerdictClass — reads the verdict class out of a scan's result_payload
 * (real payloads store it at result_payload.verdict.class: 'likely_authentic'
 * | 'inconclusive' | 'suspicious'). Returns null for missing/malformed data.
 */
function getVerdictClass(resultPayload: unknown): string | null {
  if (!resultPayload || typeof resultPayload !== 'object') {
    return null;
  }
  const payload = resultPayload as { verdict?: { class?: unknown } };
  const verdictClass = payload.verdict?.class;
  return typeof verdictClass === 'string' ? verdictClass : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * toJobView — shape a scans-table row into the admin jobs ledger dialect the
 * frontend consumes (mirror of mockAdminJobs in mockData.js):
 *
 *  - status: the DB enum says 'complete'; the frontend mock dialect says
 *    'completed' — emit the display dialect at the API boundary. Jobs never
 *    surface 'awaiting_upload' (a job is work that has been submitted).
 *  - priority / attempts / progress / worker: the scans table has no such
 *    columns — neutral defaults the page renders as '—' or a sane fallback
 *    (progress: completed=100, else 0).
 *  - processing_mode / completed_at: real columns (0009_scan_processing.sql)
 *    surfaced directly, matching the scans service's toFrontendScanRow.
 *  - error: the real failure_reason column when present.
 */
function toJobView(scan: ScanJobRow) {
  const status =
    scan.status === 'complete'
      ? 'completed'
      : scan.status === 'awaiting_upload'
        ? 'queued'
        : scan.status;
  return {
    id: scan.id,
    scan_id: scan.id,
    original_filename: scan.original_filename,
    mime_type: scan.mime_type,
    file_size_bytes: scan.file_size_bytes,
    status,
    priority: 'medium',
    attempts: 1,
    progress: status === 'completed' ? 100 : 0,
    worker: null,
    processing_mode: scan.processing_mode ?? 'standard',
    created_at: scan.created_at,
    started_at: null,
    completed_at: scan.completed_at ?? null,
    error: status === 'failed' ? scan.failure_reason : null,
    result_payload: status === 'completed' ? scan.result_payload : null,
  };
}

/**
 * toReportView — shape a completed scans row into the admin reports ledger
 * dialect (mirror of mockReports in mockData.js). Reads the flat verdict
 * display value from result_payload.verdict.class, the report id from
 * result_payload (flat mirror or nested report.report_id), confidence from
 * verdict.confidence / confidence_score, and the signals array directly.
 * team_id rides through from the scans row (0009) so the page's Team column
 * and TeamFilter have real data; orgId is resolved by listAdminReports via
 * the membership table (single-org assumption).
 */
function toReportView(
  scan: ScanJobRow & { user_id?: string | null },
  orgId: string | null = null,
  orgName: string | null = null,
) {
  const payload = readReportPayload(scan.result_payload);
  const verdictClass = payload?.verdict?.class ?? null;
  const confidence =
    payload?.verdict?.confidence_score ?? payload?.verdict?.confidence ?? null;
  const reportId =
    payload?.report?.report_id ??
    payload?.report_id ??
    `PRV-${scan.created_at.slice(0, 10).replace(/-/g, '')}-${scan.id.slice(0, 4).toUpperCase()}`;

  return {
    id: scan.id,
    scan_id: scan.id,
    status: 'completed',
    user_id: scan.user_id ?? null,
    team_id: scan.team_id ?? null,
    org_id: orgId,
    org_name: orgName,
    report_id: reportId,
    verdict: verdictClass
      ? (VERDICT_CLASS_TO_DISPLAY[verdictClass] ?? verdictClass)
      : null,
    confidence_score: confidence,
    signals: payload?.signals ?? [],
    created_at: scan.created_at,
  };
}

function readReportPayload(resultPayload: unknown): ReportPayload | null {
  if (!resultPayload || typeof resultPayload !== 'object') {
    return null;
  }
  // Narrowed to a non-null object; the fields are read defensively (?? / ?.)
  // so the loose structural cast is safe at this boundary.
  return resultPayload as ReportPayload;
}

function buildDailySignUps(waitlist: WaitlistRow[]) {
  const bucket = new Map<string, number>();

  for (const row of waitlist) {
    const day = row.created_at.slice(0, 10);
    bucket.set(day, (bucket.get(day) || 0) + 1);
  }

  return Array.from(bucket.entries())
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([date, count]) => ({ date, count }));
}
