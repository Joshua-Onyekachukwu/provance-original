import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminService } from './admin.service';

/**
 * Chainable supabase-js-style query builder for the admin service methods
 * (the account/billing/security spec convention): every awaited chain
 * consumes one entry from the plan in call order. All builder methods return
 * the same builder; the thenable resolves through the plan.
 *
 * Supported terminal shapes: { data, error }, { data, error, count },
 * { count, error } (head counts).
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
    gte: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(() => builder),
    like: jest.fn(() => builder),
    ilike: jest.fn(() => builder),
    or: jest.fn(() => builder),
    in: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(() => builder),
    single: jest.fn(() => builder),
    update: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    // Storage namespace for the monitoring storage probe
    // (adminClient.storage.from(bucket).list(...) is awaited like a query).
    storage: {
      from: jest.fn(() => ({
        list: jest.fn(() => builder),
      })),
    },
    // Directly-awaited chains resolve through the thenable contract.
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
    SUPABASE_SCANS_TABLE: 'scans',
    SUPABASE_PROFILES_TABLE: 'profiles',
    SUPABASE_ORGANIZATION_MEMBERS_TABLE: 'organization_members',
    SUPABASE_FEATURE_FLAGS_TABLE: 'feature_flags',
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
  return new AdminService(
    {
      getAdminClient: jest.fn(() => client),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const scanRows = [
  {
    id: 'scan-1',
    status: 'complete',
    original_filename: 'press_briefing.mp4',
    mime_type: 'video/mp4',
    file_size_bytes: 2_048_000,
    processing_mode: 'deep',
    team_id: 'team-1',
    completed_at: '2026-08-06T10:02:00.000Z',
    result_payload: {
      verdict: { class: 'likely_authentic', confidence: 91 },
      report: { report_id: 'PRV-20260806-0001' },
      signals: [{ model: 'generative-fingerprint-v2', confidence: 88 }],
    },
    failure_reason: null,
    created_at: '2026-08-06T10:00:00.000Z',
    updated_at: '2026-08-06T10:02:00.000Z',
  },
  {
    id: 'scan-2',
    status: 'failed',
    original_filename: 'cctv_clip.mp4',
    mime_type: 'video/mp4',
    file_size_bytes: 512_000,
    processing_mode: 'standard',
    team_id: null,
    completed_at: null,
    result_payload: null,
    failure_reason: 'Model signature endpoint returned 502 after 3 retries.',
    created_at: '2026-08-05T09:00:00.000Z',
    updated_at: '2026-08-05T09:01:00.000Z',
  },
  {
    id: 'scan-3',
    status: 'queued',
    original_filename: 'photo_evidence.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: 1_024_000,
    processing_mode: 'quick',
    team_id: null,
    completed_at: null,
    result_payload: null,
    failure_reason: null,
    created_at: '2026-08-04T08:00:00.000Z',
    updated_at: '2026-08-04T08:00:00.000Z',
  },
];

describe('AdminService.listJobs', () => {
  it('derives jobs from scans with the display status dialect', async () => {
    const client = createAdminClient([{ data: scanRows, error: null }]);
    const service = createService(client);

    const result = await service.listJobs();

    expect(client.from).toHaveBeenCalledWith('scans');
    expect(result.total).toBe(3);
    // DB 'complete' → display 'completed' at the boundary.
    expect(result.data[0].status).toBe('completed');
    expect(result.data[0].id).toBe('scan-1');
    expect(result.data[1].status).toBe('failed');
    expect(result.data[1].error).toBe(
      'Model signature endpoint returned 502 after 3 retries.',
    );
    expect(result.data[2].status).toBe('queued');
    // Real processing columns surface directly (0009_scan_processing.sql).
    expect(result.data[0].processing_mode).toBe('deep');
    expect(result.data[0].completed_at).toBe('2026-08-06T10:02:00.000Z');
    // Neutral defaults where the schema has no column.
    expect(result.data[0].priority).toBe('medium');
    expect(result.data[0].progress).toBe(100);
    expect(result.data[0].worker).toBeNull();
  });

  it('throws ServiceUnavailable on a query error', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(service.listJobs()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps a completed filter to the DB complete status', async () => {
    const client = createAdminClient([
      { data: scanRows, error: null, count: 3 },
    ]);
    const service = createService(client);

    await service.listJobs({ status: 'completed' });

    expect(client.in).toHaveBeenCalledWith('status', ['complete']);
  });

  it('maps a queued filter across awaiting_upload + queued', async () => {
    const client = createAdminClient([{ data: [], error: null, count: 0 }]);
    const service = createService(client);

    await service.listJobs({ status: 'queued' });

    expect(client.in).toHaveBeenCalledWith('status', ['awaiting_upload', 'queued']);
  });

  it('treats all/undefined as no filter', async () => {
    const client = createAdminClient([
      { data: scanRows, error: null, count: 3 },
    ]);
    const service = createService(client);

    await service.listJobs({ status: 'all' });

    expect(client.in).not.toHaveBeenCalled();
  });

  it('paginates with range and reports the filtered total', async () => {
    const client = createAdminClient([
      { data: [scanRows[0]], error: null, count: 3 },
    ]);
    const service = createService(client);

    const result = await service.listJobs({ page: 2, pageSize: 2 });

    expect(client.range).toHaveBeenCalledWith(2, 3);
    expect(result.total).toBe(3); // count reflects the filter, not the page
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(2);
    expect(result.data).toHaveLength(1);
  });

  it('clamps page and pageSize', async () => {
    const client = createAdminClient([{ data: [], error: null, count: 0 }]);
    const service = createService(client);

    await service.listJobs({ page: 0, pageSize: 9999 });

    expect(client.range).toHaveBeenCalledWith(0, 499);
  });

  it('rejects an unknown status filter', async () => {
    const client = createAdminClient([]);
    const service = createService(client);

    await expect(service.listJobs({ status: 'bogus' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('AdminService.retryJob', () => {
  it('re-queues a failed job and clears its error', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-2', status: 'failed' }, error: null },
      {
        data: {
          id: 'scan-2',
          status: 'queued',
          original_filename: 'cctv_clip.mp4',
          mime_type: 'video/mp4',
          file_size_bytes: 512_000,
          processing_mode: 'standard',
          team_id: null,
          completed_at: null,
          result_payload: null,
          failure_reason: null,
          created_at: '2026-08-05T09:00:00.000Z',
          updated_at: '2026-08-06T11:00:00.000Z',
        },
        error: null,
      },
      // Best-effort audit write resolves without error.
      { data: null, error: null },
    ]);
    const service = createService(client);

    const result = await service.retryJob('scan-2', {
      id: 'admin-1',
      email: 'ops@provance.local',
    });

    expect(result.ok).toBe(true);
    expect(result.job.status).toBe('queued');
    expect(result.job.error).toBeNull();
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'queued', failure_reason: null }),
    );
    // Audit trail: who retried it + the transition, severity from the map.
    expect(client.from).toHaveBeenCalledWith('audit_logs');
    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_email: 'ops@provance.local',
        action: 'scan.retried',
        severity: 'medium',
        entity_type: 'scan',
        entity_id: 'scan-2',
        details: expect.objectContaining({
          reviewer_id: 'admin-1',
          from: 'failed',
          to: 'queued',
        }),
      }),
    );
  });

  it('re-queues even when the audit write fails (best-effort trail)', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-2', status: 'failed' }, error: null },
      {
        data: {
          id: 'scan-2',
          status: 'queued',
          original_filename: 'cctv_clip.mp4',
          mime_type: 'video/mp4',
          file_size_bytes: 512_000,
          processing_mode: 'standard',
          team_id: null,
          completed_at: null,
          result_payload: null,
          failure_reason: null,
          created_at: '2026-08-05T09:00:00.000Z',
          updated_at: '2026-08-06T11:00:00.000Z',
        },
        error: null,
      },
      // audit_logs table missing (migration 0008 not applied)
      { error: { message: 'relation "audit_logs" does not exist' } },
    ]);
    const service = createService(client);

    const result = await service.retryJob('scan-2', {
      id: 'admin-1',
      email: 'ops@provance.local',
    });

    expect(result.ok).toBe(true);
    expect(result.job.status).toBe('queued');
  });

  it('rejects non-failed jobs', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-3', status: 'queued' }, error: null },
    ]);
    const service = createService(client);

    await expect(service.retryJob('scan-3')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown jobs with NotFound', async () => {
    const client = createAdminClient([{ data: null, error: null }]);
    const service = createService(client);

    await expect(service.retryJob('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AdminService.failJob', () => {
  it('fails a non-terminal job with the given reason', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-3', status: 'queued' }, error: null },
      {
        data: {
          id: 'scan-3',
          status: 'failed',
          original_filename: 'photo_evidence.jpg',
          mime_type: 'image/jpeg',
          file_size_bytes: 1_024_000,
          processing_mode: 'quick',
          team_id: null,
          completed_at: null,
          result_payload: null,
          failure_reason: 'Admin override',
          created_at: '2026-08-04T08:00:00.000Z',
          updated_at: '2026-08-06T11:30:00.000Z',
        },
        error: null,
      },
      // Best-effort audit write.
      { data: null, error: null },
    ]);
    const service = createService(client);

    const result = await service.failJob(
      'scan-3',
      'Admin override',
      { id: 'admin-1', email: 'ops@provance.local' },
    );

    expect(result.ok).toBe(true);
    expect(result.job.status).toBe('failed');
    expect(result.job.error).toBe('Admin override');
    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_email: 'ops@provance.local',
        action: 'scan.failed',
        severity: 'high',
        entity_type: 'scan',
        entity_id: 'scan-3',
        details: expect.objectContaining({
          from: 'queued',
          to: 'failed',
          reason: 'Admin override',
        }),
      }),
    );
  });

  it('fails the job even when the audit write fails (best-effort trail)', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-3', status: 'queued' }, error: null },
      {
        data: {
          id: 'scan-3',
          status: 'failed',
          original_filename: 'photo_evidence.jpg',
          mime_type: 'image/jpeg',
          file_size_bytes: 1_024_000,
          processing_mode: 'quick',
          team_id: null,
          completed_at: null,
          result_payload: null,
          failure_reason: 'Admin override',
          created_at: '2026-08-04T08:00:00.000Z',
          updated_at: '2026-08-06T11:30:00.000Z',
        },
        error: null,
      },
      { error: { message: 'relation "audit_logs" does not exist' } },
    ]);
    const service = createService(client);

    const result = await service.failJob('scan-3', 'Admin override', {
      id: 'admin-1',
      email: 'ops@provance.local',
    });

    expect(result.ok).toBe(true);
    expect(result.job.status).toBe('failed');
  });

  it('rejects completed jobs', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-1', status: 'complete' }, error: null },
    ]);
    const service = createService(client);

    await expect(service.failJob('scan-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects already-failed jobs', async () => {
    const client = createAdminClient([
      { data: { id: 'scan-2', status: 'failed' }, error: null },
    ]);
    const service = createService(client);

    await expect(service.failJob('scan-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('AdminService.listAdminReports', () => {
  it('paginates completed scans with the report dialect', async () => {
    const completed = scanRows.filter((row) => row.status === 'complete');
    const client = createAdminClient([
      { data: completed, error: null, count: 1 },
    ]);
    const service = createService(client);

    const result = await service.listAdminReports({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.data[0]).toMatchObject({
      id: 'scan-1',
      scan_id: 'scan-1',
      status: 'completed',
      report_id: 'PRV-20260806-0001',
      verdict: 'authentic',
      confidence_score: 91,
      created_at: '2026-08-06T10:00:00.000Z',
    });
    expect(result.data[0].signals).toHaveLength(1);
  });

  it('clamps page and pageSize', async () => {
    const client = createAdminClient([{ data: [], error: null, count: 0 }]);
    const service = createService(client);

    await service.listAdminReports({ page: 0, pageSize: 999 });

    // page 0 → 1 (from = 0); pageSize 999 → 200 (to = 199).
    expect(client.range).toHaveBeenCalledWith(0, 199);
  });

  it('derives a report id when the payload has none', async () => {
    const bare = [
      {
        id: 'scan-9',
        status: 'complete',
        result_payload: { verdict: { class: 'suspicious' } },
        created_at: '2026-07-30T05:00:00.000Z',
      },
    ];
    const client = createAdminClient([{ data: bare, error: null, count: 1 }]);
    const service = createService(client);

    const result = await service.listAdminReports({ page: 1, pageSize: 20 });

    expect(result.data[0].report_id).toBe('PRV-20260730-SCAN');
    expect(result.data[0].verdict).toBe('suspicious');
    expect(result.data[0].confidence_score).toBeNull();
  });

  it('resolves team + org attribution per report via membership', async () => {
    const completed = scanRows
      .filter((row) => row.status === 'complete')
      .map((row) => ({ ...row, user_id: 'user-1' }));
    const client = createAdminClient([
      { data: completed, error: null, count: 1 },
      {
        data: [{ user_id: 'user-1', organization_id: 'org-1' }],
        error: null,
      },
      { data: [{ id: 'org-1', name: 'Provance Internal' }], error: null },
    ]);
    const service = createService(client);

    const result = await service.listAdminReports({ page: 1, pageSize: 20 });

    // team_id rides through from the scans row (0009); org_id is resolved via
    // the membership table (single-org assumption, like listUsers), and the
    // org name comes from the organizations table so the Organization column
    // renders honestly in real mode.
    expect(result.data[0]).toMatchObject({
      team_id: 'team-1',
      org_id: 'org-1',
      org_name: 'Provance Internal',
      user_id: 'user-1',
    });
    // The team_id/user_id columns are part of the reports select (the select
    // carries the count option as its second arg).
    expect(client.select).toHaveBeenCalledWith(
      expect.stringContaining('team_id'),
      expect.anything(),
    );
    expect(client.select).toHaveBeenCalledWith(
      expect.stringContaining('user_id'),
      expect.anything(),
    );
  });

  it('applies an optional team filter to the reports query', async () => {
    const completed = scanRows.filter((row) => row.status === 'complete');
    const client = createAdminClient([
      { data: completed, error: null, count: 1 },
    ]);
    const service = createService(client);

    const result = await service.listAdminReports({
      page: 1,
      pageSize: 20,
      team: 'team-1',
    });

    expect(result.total).toBe(1);
    // The status filter (always) plus the team filter (opt-in) — the mock
    // has no user_id on these rows, so the members lookup is skipped.
    expect(client.eq).toHaveBeenCalledWith('status', 'complete');
    expect(client.eq).toHaveBeenCalledWith('team_id', 'team-1');
  });

  it('ignores the "all" team sentinel on reports', async () => {
    const client = createAdminClient([{ data: [], error: null, count: 0 }]);
    const service = createService(client);

    await service.listAdminReports({ page: 1, pageSize: 20, team: 'all' });

    // Only the status eq — no team_id clause for the 'all' sentinel.
    expect(client.eq).toHaveBeenCalledWith('status', 'complete');
    expect(client.eq).not.toHaveBeenCalledWith('team_id', expect.anything());
  });
});

describe('AdminService.getSettings', () => {
  it('drives operational toggles from feature flags and defaults from config', async () => {
    const flagRows = [{ key: 'deep_scan_mode', enabled: true }];
    const client = createAdminClient([{ data: flagRows, error: null }]);
    const config = createConfigService({
      NODE_ENV: 'production',
      MAX_UPLOAD_MB: 100,
      REPORT_RETENTION_DAYS: 90,
    });
    const service = createService(client, config);

    const result = await service.getSettings();

    expect(result.environment.name).toBe('Production');
    const byKey = Object.fromEntries(
      result.operational.map((item) => [item.key, item]),
    );
    expect(byKey.deep_processing.enabled).toBe(true);
    expect(byKey.maintenance_mode.enabled).toBe(false);
    expect(byKey.max_upload_mb.value).toBe('100');
    expect(byKey.report_retention_days.value).toBe('90');
    expect(result.security.session_timeout_minutes).toBe(120);
    expect(result.security.audit_retention_days).toBe(730);
    expect(result.security.allowlist_only_signins).toBe(true);
  });

  it('throws ServiceUnavailable when feature flags fail', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(service.getSettings()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

// ---------------------------------------------------------------------------
// AdminService.listUsers
// ---------------------------------------------------------------------------

describe('AdminService.listUsers', () => {
  const profileRowsWithTeam = [
    {
      user_id: 'user-1',
      email: 'joshua@provance.io',
      display_name: 'Joshua Onyekachukwu',
      account_role: 'super_admin',
      team_access: true,
      team_id: 'team-1',
      created_at: '2026-07-20T10:00:00.000Z',
      updated_at: '2026-08-06T10:00:00.000Z',
    },
    {
      user_id: 'user-2',
      email: 'amina@provance.io',
      display_name: 'Amina Sow',
      account_role: 'admin',
      team_access: true,
      team_id: null,
      created_at: '2026-07-21T10:00:00.000Z',
      updated_at: '2026-08-05T10:00:00.000Z',
    },
  ];

  it('returns team_id per user, falling back to the membership team', async () => {
    const client = createAdminClient([
      { data: profileRowsWithTeam, error: null },
      {
        data: [
          { user_id: 'user-1', organization_id: 'org-1', team_id: 'team-1' },
          { user_id: 'user-2', organization_id: 'org-1', team_id: 'team-2' },
        ],
        error: null,
      },
      { count: 2, error: null },
    ]);
    const service = createService(client);

    const result = await service.listUsers({ page: 1, pageSize: 20 });

    // profiles.team_id wins where present; membership team fills the null.
    expect(result.data[0].team_id).toBe('team-1');
    expect(result.data[1].team_id).toBe('team-2');
    expect(result.data[0].org_id).toBe('org-1');
    expect(result.total).toBe(2);
    // The team_id column is part of the profiles select.
    expect(client.select).toHaveBeenCalledWith(
      expect.stringContaining('team_id'),
    );
  });

  it('applies a team filter to both the data and count queries', async () => {
    const client = createAdminClient([
      { data: [profileRowsWithTeam[0]], error: null },
      { data: [], error: null },
      { count: 1, error: null },
    ]);
    const service = createService(client);

    const result = await service.listUsers({
      page: 1,
      pageSize: 20,
      team: 'team-1',
    });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    // One eq per chain (data + count).
    expect(client.eq).toHaveBeenCalledTimes(2);
    expect(client.eq).toHaveBeenCalledWith('team_id', 'team-1');
  });

  it('ignores the "all" team sentinel', async () => {
    const client = createAdminClient([
      { data: profileRowsWithTeam, error: null },
      { data: [], error: null },
      { count: 2, error: null },
    ]);
    const service = createService(client);

    await service.listUsers({ page: 1, pageSize: 20, team: 'all' });

    expect(client.eq).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AdminService.getAnalytics
// ---------------------------------------------------------------------------

describe('AdminService.getAnalytics', () => {
  it('scopes the aggregation to a team and reports team_breakdown', async () => {
    const scanRows = [
      {
        user_id: 'user-1',
        status: 'complete',
        mime_type: 'video/mp4',
        result_payload: { verdict: { class: 'likely_authentic' } },
        team_id: 'team-1',
        created_at: '2026-08-06T10:00:00.000Z',
        updated_at: '2026-08-06T10:02:00.000Z',
      },
      {
        user_id: 'user-1',
        status: 'complete',
        mime_type: 'image/jpeg',
        result_payload: { verdict: { class: 'suspicious' } },
        team_id: 'team-1',
        created_at: '2026-08-05T10:00:00.000Z',
        updated_at: '2026-08-05T10:02:00.000Z',
      },
      {
        user_id: 'user-2',
        status: 'failed',
        mime_type: 'video/mp4',
        result_payload: null,
        team_id: 'team-2',
        created_at: '2026-08-04T10:00:00.000Z',
        updated_at: '2026-08-04T10:01:00.000Z',
      },
    ];
    const orgs = [{ id: 'org-1', name: 'Provance Internal', storage_used_gb: 10, scan_count: 2 }];
    const members = [
      { organization_id: 'org-1', user_id: 'user-1', role: 'owner' },
      { organization_id: 'org-1', user_id: 'user-2', role: 'admin' },
    ];
    const client = createAdminClient([
      { data: scanRows, error: null },
      { data: orgs, error: null },
      { data: members, error: null },
      { count: 1, error: null },
      { count: 0, error: null },
    ]);
    const service = createService(client);

    const result = await service.getAnalytics({ team: 'team-1' });

    // Only team-1's two scans count toward the top-org usage split (the
    // panel the page labels "X scoped"). KPIs/trends stay platform-wide.
    expect(result.top_organizations).toHaveLength(1);
    expect(result.top_organizations[0]).toMatchObject({
      id: 'org-1',
      name: 'Provance Internal',
      scan_count: 2,
      completion_rate: 1,
    });
    // Breakdown covers every team in the window (unscoped), newest volume first.
    expect(result.team_breakdown).toEqual([
      { team_id: 'team-1', scans: 2 },
      { team_id: 'team-2', scans: 1 },
    ]);
  });

  it('returns the unscoped payload when no team is requested', async () => {
    const client = createAdminClient([
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    ]);
    const service = createService(client);

    const result = await service.getAnalytics();

    expect(result.team_breakdown).toEqual([]);
    expect(result.top_organizations).toEqual([]);
    // No team filter is applied (the eq calls that DO happen are the queue
    // status head counts — status=queued / status=processing).
    expect(client.eq).not.toHaveBeenCalledWith('team_id', expect.anything());
  });

  it('keeps KPIs platform-wide while scoping only the top-org split', async () => {
    const scanRows = [
      {
        user_id: 'user-1',
        status: 'complete',
        mime_type: 'video/mp4',
        result_payload: { verdict: { class: 'likely_authentic' } },
        team_id: 'team-1',
        created_at: '2026-08-06T10:00:00.000Z',
        updated_at: '2026-08-06T10:02:00.000Z',
      },
      {
        user_id: 'user-2',
        status: 'complete',
        mime_type: 'video/mp4',
        result_payload: { verdict: { class: 'likely_authentic' } },
        team_id: 'team-2',
        created_at: '2026-08-06T11:00:00.000Z',
        updated_at: '2026-08-06T11:02:00.000Z',
      },
    ];
    const orgs = [{ id: 'org-1', name: 'Provance Internal', storage_used_gb: 10, scan_count: 2 }];
    const members = [
      { organization_id: 'org-1', user_id: 'user-1', role: 'owner' },
      { organization_id: 'org-1', user_id: 'user-2', role: 'member' },
    ];
    const client = createAdminClient([
      { data: scanRows, error: null },
      { data: orgs, error: null },
      { data: members, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    ]);
    const service = createService(client);

    const result = await service.getAnalytics({ team: 'team-1' });

    // Volume trend reflects BOTH scans (platform-wide aggregation)…
    const volumeTotal = result.volume_trend.reduce((sum, day) => sum + day.scans, 0);
    expect(volumeTotal).toBe(2);
    // …while the org split counts only team-1's scan.
    expect(result.top_organizations[0].scan_count).toBe(1);
    expect(result.top_organizations[0].completion_rate).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Frozen-clock bucket precision tests. The aggregation windows are all
  // relative to Date.now(), so a spy pins 'now' and the expected arrays are
  // rebuilt from the same day/hour-key math the service uses — the buckets
  // must match exactly, not approximately.
  // -----------------------------------------------------------------------

  const NOW_MS = Date.UTC(2026, 7, 7, 12, 0, 0); // 2026-08-07T12:00:00.000Z
  const DAY_MS = 86_400_000;
  const HOUR_MS = 3_600_000;

  function dayKeys(nowMs: number) {
    const keys: string[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      keys.push(new Date(nowMs - i * DAY_MS).toISOString().slice(0, 10));
    }
    return keys;
  }

  function hourKeys(nowMs: number) {
    const keys: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      keys.push(new Date(nowMs - i * HOUR_MS).toISOString().slice(0, 13));
    }
    return keys;
  }

  function seededScan(overrides: Record<string, unknown>) {
    return {
      user_id: 'user-1',
      status: 'complete',
      mime_type: 'image/jpeg',
      result_payload: { verdict: { class: 'likely_authentic' } },
      team_id: null,
      created_at: '2026-08-07T11:30:00.000Z',
      updated_at: '2026-08-07T11:32:00.000Z',
      ...overrides,
    };
  }

  it('buckets verdict_trend exactly from seeded completed scans (frozen clock)', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    try {
      const scanRows = [
        seededScan({
          status: 'complete',
          result_payload: { verdict: { class: 'likely_authentic' } },
          created_at: '2026-08-07T11:30:00.000Z',
          updated_at: '2026-08-07T11:32:00.000Z',
        }),
        seededScan({
          status: 'complete',
          result_payload: { verdict: { class: 'suspicious' } },
          created_at: '2026-08-07T08:00:00.000Z',
          updated_at: '2026-08-07T08:02:00.000Z',
        }),
        seededScan({
          status: 'complete',
          result_payload: { verdict: { class: 'inconclusive' } },
          created_at: '2026-08-06T22:00:00.000Z',
          updated_at: '2026-08-06T22:03:00.000Z',
        }),
        seededScan({
          status: 'complete',
          result_payload: { verdict: { class: 'likely_authentic' } },
          created_at: '2026-08-05T10:00:00.000Z',
          updated_at: '2026-08-05T10:01:00.000Z',
        }),
        seededScan({
          status: 'failed',
          result_payload: null,
          created_at: '2026-08-06T20:00:00.000Z',
          updated_at: '2026-08-06T20:01:00.000Z',
        }),
        seededScan({
          status: 'queued',
          result_payload: null,
          created_at: '2026-08-07T09:00:00.000Z',
          updated_at: '2026-08-07T09:00:00.000Z',
        }),
        seededScan({
          status: 'processing',
          result_payload: null,
          created_at: '2026-08-07T10:00:00.000Z',
          updated_at: '2026-08-07T10:00:00.000Z',
        }),
      ];
      const client = createAdminClient([
        { data: scanRows, error: null },
        { data: [{ id: 'org-1', name: 'Provance Internal', storage_used_gb: 10, scan_count: 2 }], error: null },
        { data: [{ organization_id: 'org-1', user_id: 'user-1', role: 'owner' }], error: null },
        { count: 2, error: null },
        { count: 3, error: null },
      ]);
      const service = createService(client);

      const result = await service.getAnalytics();
      const keys = dayKeys(NOW_MS);
      const today = keys.length - 1; // '2026-08-07'
      const yesterday = keys.length - 2; // '2026-08-06'
      const twoDaysAgo = keys.length - 3; // '2026-08-05'

      // 14 daily entries, labels stamped at noon UTC, only the seeded days non-zero.
      const expectedVerdict = keys.map((date, index) => ({
        date: `${date}T12:00:00.000Z`,
        authentic: 0,
        suspicious: 0,
        inconclusive: 0,
      }));
      expectedVerdict[today] = {
        date: `${keys[today]}T12:00:00.000Z`,
        authentic: 1,
        suspicious: 1,
        inconclusive: 0,
      };
      expectedVerdict[yesterday] = {
        date: `${keys[yesterday]}T12:00:00.000Z`,
        authentic: 0,
        suspicious: 0,
        inconclusive: 1,
      };
      expectedVerdict[twoDaysAgo] = {
        date: `${keys[twoDaysAgo]}T12:00:00.000Z`,
        authentic: 1,
        suspicious: 0,
        inconclusive: 0,
      };
      expect(result.verdict_trend).toEqual(expectedVerdict);
      // Pin the label format independently of the shared key math.
      expect(result.verdict_trend[today].date).toBe('2026-08-07T12:00:00.000Z');
      expect(result.volume_trend[twoDaysAgo].date).toBe('2026-08-05T12:00:00.000Z');

      // Volume trend: today 4 scans (2 complete), yesterday 2 (1 complete + 1
      // failed), two days ago 1 complete; suspicious flags only the completed
      // suspicious scan.
      const expectedVolume = keys.map((date, index) => ({
        date: `${date}T12:00:00.000Z`,
        scans: 0,
        completed: 0,
        failed: 0,
        suspicious: 0,
      }));
      expectedVolume[today] = {
        date: `${keys[today]}T12:00:00.000Z`,
        scans: 4,
        completed: 2,
        failed: 0,
        suspicious: 1,
      };
      expectedVolume[yesterday] = {
        date: `${keys[yesterday]}T12:00:00.000Z`,
        scans: 2,
        completed: 1,
        failed: 1,
        suspicious: 0,
      };
      expectedVolume[twoDaysAgo] = {
        date: `${keys[twoDaysAgo]}T12:00:00.000Z`,
        scans: 1,
        completed: 1,
        failed: 0,
        suspicious: 0,
      };
      expect(result.volume_trend).toEqual(expectedVolume);

      // KPIs from the same seed: 6 scans within 24h, 7 within 7 days, and the
      // 4/7 completion rate over the 14-day window.
      expect(result.scans_today).toBe(6);
      expect(result.scans_7d).toBe(7);
      expect(result.completion_rate).toBeCloseTo(4 / 7, 10);
      expect(result.failure_rate).toBeCloseTo(1 / 7, 10);
      expect(result.suspicious_rate).toBeCloseTo(1 / 7, 10);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('buckets queue_throughput exactly (hourly series, 24h/1h counts, depth, in-flight, latency)', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    try {
      const scanRows = [
        // Exactly 1h old → processed_last_hour + processed_24h + hour T11.
        seededScan({
          created_at: '2026-08-07T11:00:00.000Z',
          updated_at: '2026-08-07T11:01:00.000Z',
        }),
        // 6.5h old → processed_24h + hour T05, not last_hour.
        seededScan({
          result_payload: { verdict: { class: 'suspicious' } },
          created_at: '2026-08-07T05:30:00.000Z',
          updated_at: '2026-08-07T05:32:00.000Z',
        }),
        // Exactly 24h old → processed_24h only; hour key falls outside the
        // 12-hour window.
        seededScan({
          result_payload: { verdict: { class: 'inconclusive' } },
          created_at: '2026-08-06T12:00:00.000Z',
          updated_at: '2026-08-06T12:01:00.000Z',
        }),
        // 25h old → excluded from both processed counters.
        seededScan({
          created_at: '2026-08-06T11:00:00.000Z',
          updated_at: '2026-08-06T11:01:00.000Z',
        }),
        // Non-completed rows contribute to volume/failure but never to the
        // processed counters.
        seededScan({
          status: 'failed',
          result_payload: null,
          created_at: '2026-08-07T09:00:00.000Z',
          updated_at: '2026-08-07T09:01:00.000Z',
        }),
        seededScan({
          status: 'queued',
          result_payload: null,
          created_at: '2026-08-07T10:00:00.000Z',
          updated_at: '2026-08-07T10:00:00.000Z',
        }),
        seededScan({
          status: 'processing',
          result_payload: null,
          created_at: '2026-08-07T03:00:00.000Z',
          updated_at: '2026-08-07T03:00:00.000Z',
        }),
      ];
      const client = createAdminClient([
        { data: scanRows, error: null },
        { data: [{ id: 'org-1', name: 'Provance Internal', storage_used_gb: 10, scan_count: 2 }], error: null },
        { data: [{ organization_id: 'org-1', user_id: 'user-1', role: 'owner' }], error: null },
        { count: 2, error: null },
        { count: 3, error: null },
      ]);
      const service = createService(client);

      const result = await service.getAnalytics();
      const throughput = result.queue_throughput;

      expect(throughput.processed_last_hour).toBe(1);
      expect(throughput.processed_24h).toBe(3);
      expect(throughput.queue_depth).toBe(2);
      expect(throughput.in_flight).toBe(3);

      // Latency proxy: (updated − created) for the four completed rows,
      // averaged — 60s, 120s, 60s, 60s → 75,000ms.
      expect(throughput.avg_processing_time_ms).toBe(75_000);

      // 12 hourly buckets, oldest → newest; only T11 (1h-ago scan) and T05
      // (6.5h-ago scan) are non-zero.
      const keys = hourKeys(NOW_MS);
      const expectedHourly = keys.map((key, index) => ({
        hour: `${key}:00:00.000Z`,
        processed: 0,
      }));
      const hourIndex = new Map(keys.map((key, index) => [key, index]));
      const elevenIdx = hourIndex.get('2026-08-07T11');
      const fiveIdx = hourIndex.get('2026-08-07T05');
      expect(elevenIdx).toBeDefined();
      expect(fiveIdx).toBeDefined();
      expectedHourly[elevenIdx as number].processed = 1;
      expectedHourly[fiveIdx as number].processed = 1;
      expect(throughput.hourly_series).toEqual(expectedHourly);
    } finally {
      nowSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// AdminService.listAuditLogs
// ---------------------------------------------------------------------------

const auditRows = [
  {
    id: 'audit-1',
    actor_email: 'founder@provance.local',
    action: 'role.changed',
    severity: 'high',
    entity_type: 'role',
    entity_id: 'role_analyst',
    created_at: '2026-08-07T10:00:00.000Z',
  },
  {
    id: 'audit-2',
    actor_email: 'aisha@provance.local',
    action: 'scan.completed',
    severity: 'low',
    entity_type: 'scan',
    entity_id: 'scan_0042',
    created_at: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 'audit-3',
    actor_email: 'system',
    action: 'scan.failed',
    severity: null, // legacy row — severity derived from the shared action map
    entity_type: 'scan',
    entity_id: 'scan_0041',
    created_at: '2026-08-05T10:00:00.000Z',
  },
];

describe('AdminService.listAuditLogs', () => {
  it('returns the pagination envelope with severity fallback for legacy rows', async () => {
    const client = createAdminClient([
      { data: auditRows, error: null },
      { count: 3, error: null },
    ]);
    const service = createService(client);

    const result = await service.listAuditLogs({ page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
    // Row severity preserved when present; scan.failed derives 'high' from the
    // shared action map (audit-severity.ts) like the account activity path.
    expect(result.data[0].severity).toBe('high');
    expect(result.data[2].severity).toBe('high');
    expect(result.data[2].resource_type).toBe('scan');
  });

  it('applies each optional filter to both the data and count queries', async () => {
    const client = createAdminClient([
      { data: [auditRows[0]], error: null },
      { count: 1, error: null },
    ]);
    const service = createService(client);

    const result = await service.listAuditLogs({
      page: 1,
      pageSize: 100,
      severity: 'high',
      actor: 'founder@provance.local',
      action: 'role.changed',
      resourceType: 'role',
    });

    // Two chains (data + count) — four eq filters each.
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(client.from).toHaveBeenCalledWith('audit_logs');
    expect(client.eq).toHaveBeenCalledTimes(8);
    expect(client.eq).toHaveBeenCalledWith('severity', 'high');
    expect(client.eq).toHaveBeenCalledWith('actor_email', 'founder@provance.local');
    expect(client.eq).toHaveBeenCalledWith('action', 'role.changed');
    expect(client.eq).toHaveBeenCalledWith('entity_type', 'role');
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('applies a multi-column search to both queries and clamps page/pageSize', async () => {
    const client = createAdminClient([
      { data: [auditRows[2]], error: null },
      { count: 1, error: null },
    ]);
    const service = createService(client);

    const result = await service.listAuditLogs({
      page: 0,
      pageSize: 5000,
      search: '  system  ',
    });

    // or() applied once per chain, covering the same fields the frontend
    // page matches (actor, action, resource) — actor_email, action,
    // entity_type, entity_id with the trimmed needle.
    expect(client.or).toHaveBeenCalledTimes(2);
    expect(client.or).toHaveBeenCalledWith(
      'actor_email.ilike.%system%,action.ilike.%system%,entity_type.ilike.%system%,entity_id.ilike.%system%',
    );
    // page clamped up to 1, pageSize clamped down to 500.
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(500);
    expect(result.total).toBe(1);
  });

  it('ignores "all" filter values (treats them as unset)', async () => {
    const client = createAdminClient([
      { data: auditRows, error: null },
      { count: 3, error: null },
    ]);
    const service = createService(client);

    await service.listAuditLogs({
      severity: 'all',
      actor: 'all',
      action: 'all',
      resourceType: 'all',
    });

    // No eq calls — the "all" sentinels produce no filter clauses.
    expect(client.eq).not.toHaveBeenCalled();
  });

  it('throws ServiceUnavailable when either query fails', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'boom' } },
      { count: 3, error: null },
    ]);
    const service = createService(client);

    await expect(service.listAuditLogs({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

// ---------------------------------------------------------------------------
// AdminService.getMonitoring
//
// Queue-health buckets, hourly/daily series, storage totals, worker
// idle-vs-backlog status, and overall status derivation. The aggregation
// windows are relative to Date.now(), so a frozen clock pins every bucket;
// expected arrays are rebuilt from the same key math the service uses.
//
// Query plan (in await order):
//   1. db probe       — scans select head count (throws on error)
//   2. storage probe  — storage list (throws on error)
//   3. scans rows     — status/file_size_bytes/created_at/updated_at
//   4. incidents      — select * ordered by started_at
//   5. queued count   — status=queued head count
//   6. in-flight      — status=processing head count
//   7..10. table rows — scans/profiles/waitlist/audit head counts
// ---------------------------------------------------------------------------

describe('AdminService.getMonitoring', () => {
  const NOW_MS = Date.UTC(2026, 7, 7, 12, 0, 0); // 2026-08-07T12:00:00.000Z
  const DAY_MS = 86_400_000;
  const HOUR_MS = 3_600_000;

  function monitoringHourKeys(nowMs: number) {
    const keys: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      keys.push(new Date(nowMs - i * HOUR_MS).toISOString().slice(0, 13));
    }
    return keys;
  }

  function monitoringDayKeys(nowMs: number) {
    const keys: string[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      keys.push(new Date(nowMs - i * DAY_MS).toISOString().slice(0, 10));
    }
    return keys;
  }

  function monitoringScan(overrides: Record<string, unknown>) {
    return {
      status: 'complete',
      file_size_bytes: 1_000_000_000,
      created_at: '2026-08-07T08:00:00.000Z',
      updated_at: '2026-08-07T08:02:00.000Z',
      ...overrides,
    };
  }

  function monitoringConfig(overrides: Record<string, unknown> = {}) {
    return createConfigService({
      REDIS_URL: 'redis://localhost:6379',
      SMTP_HOST: 'smtp.provance.io',
      ...overrides,
    });
  }

  it('buckets queue_health + hourly/daily series + storage exactly (frozen clock)', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    try {
      const scanRows = [
        // 1h ago, completed: counts in 24h + 1h buckets; latency 60s.
        monitoringScan({
          status: 'complete',
          file_size_bytes: 2_000_000_000,
          created_at: '2026-08-07T11:00:00.000Z',
          updated_at: '2026-08-07T11:01:00.000Z',
        }),
        // 4h ago, completed: 24h bucket only; latency 120s.
        monitoringScan({
          status: 'complete',
          file_size_bytes: 1_000_000_000,
          created_at: '2026-08-07T08:00:00.000Z',
          updated_at: '2026-08-07T08:02:00.000Z',
        }),
        // 6h ago, failed: failed_24h only.
        monitoringScan({
          status: 'failed',
          file_size_bytes: 1_000_000_000,
          created_at: '2026-08-07T06:00:00.000Z',
          updated_at: '2026-08-07T06:01:00.000Z',
        }),
        // Backlog rows: storage only (no completion buckets).
        monitoringScan({ status: 'queued', file_size_bytes: 500_000_000, created_at: '2026-08-07T10:00:00.000Z' }),
        monitoringScan({ status: 'processing', file_size_bytes: 500_000_000, created_at: '2026-08-06T12:00:00.000Z' }),
      ];
      const incidentRows = [
        {
          id: 'inc-1',
          title: 'Worker latency spike',
          severity: 'medium',
          status: 'active',
          started_at: '2026-08-07T09:00:00.000Z',
          resolved_at: null,
          duration_hours: null,
          services: ['worker'],
          summary: 'Queue backlog rising.',
        },
        {
          id: 'inc-2',
          title: 'Storage degraded',
          severity: 'low',
          status: 'resolved',
          started_at: '2026-08-05T09:00:00.000Z',
          resolved_at: '2026-08-05T12:00:00.000Z',
          duration_hours: 3,
          services: ['storage'],
          summary: 'Transient R2 latency.',
        },
      ];
      const client = createAdminClient([
        { data: null, error: null }, // db probe
        { error: null }, // storage probe
        { data: scanRows, error: null },
        { data: incidentRows, error: null },
        { count: 2, error: null }, // queued
        { count: 1, error: null }, // in-flight
        { count: 5, error: null }, // table scans
        { count: 4, error: null }, // table profiles
        { count: 3, error: null }, // table waitlist
        { count: 20, error: null }, // table audit
      ]);
      const service = createService(client, monitoringConfig());

      const result = await service.getMonitoring();

      // ── Queue health ──────────────────────────────────────────────────────
      expect(result.queue_health).toMatchObject({
        queued: 2,
        in_flight: 1,
        failed_24h: 1,
        // completed1h: exactly-1h-old row counts (≤ HOUR_MS inclusive).
        throughput_per_hour: 1,
        // (60000 + 120000) / 2
        avg_processing_time_ms: 90_000,
        // failed_24h / (completed_24h + failed_24h) = 1 / 3
        failure_rate: 1 / 3,
      });

      // Hourly series: only the T08 (4h-ago) and T11 (1h-ago) buckets.
      const hourKeys = monitoringHourKeys(NOW_MS);
      const hourIndex = new Map(hourKeys.map((key, index) => [key, index]));
      const eightIdx = hourIndex.get('2026-08-07T08');
      const elevenIdx = hourIndex.get('2026-08-07T11');
      expect(eightIdx).toBeDefined();
      expect(elevenIdx).toBeDefined();
      expect(result.queue_health.hourly_series).toHaveLength(12);
      result.queue_health.hourly_series.forEach((entry, i) => {
        expect(entry.hour).toBe(`${hourKeys[i]}:00:00.000Z`);
        const expected = i === eightIdx || i === elevenIdx ? 1 : 0;
        expect(entry.processed).toBe(expected);
      });

      // Daily series: only the final day (2026-08-07) has processed=3
      // (2 completed + 1 failed); completed=2, failed=1.
      const dayKeys = monitoringDayKeys(NOW_MS);
      const dayIndex = new Map(dayKeys.map((key, index) => [key, index]));
      const todayIdx = dayIndex.get('2026-08-07');
      expect(todayIdx).toBeDefined();
      expect(result.queue_health.daily_series).toHaveLength(14);
      result.queue_health.daily_series.forEach((entry, i) => {
        expect(entry.date).toBe(`${dayKeys[i]}T12:00:00.000Z`);
        if (i === todayIdx) {
          expect(entry.processed).toBe(3);
          expect(entry.completed).toBe(2);
          expect(entry.failed).toBe(1);
        } else {
          expect(entry.processed).toBe(0);
          expect(entry.completed).toBe(0);
          expect(entry.failed).toBe(0);
        }
      });

      // ── Storage ──────────────────────────────────────────────────────────
      // 2 + 1 + 1 + 0.5 + 0.5 = 5 GB, capacity default 500.
      expect(result.storage_utilization).toEqual({
        total_used_gb: 5,
        total_capacity_gb: 500,
        buckets: [
          {
            id: 'uploads',
            label: 'Media uploads',
            used_gb: 5,
            capacity_gb: 500,
            growth_30d: null,
          },
        ],
      });

      // ── Overall / uptime / services ──────────────────────────────────────
      // completed30d=2, failed30d=1 → 2/3.
      expect(result.overall.uptime_30d).toBeCloseTo(2 / 3, 6);
      // checks_24h = 3 completions/failures + 2 queued + 1 in-flight.
      expect(result.overall.checks_24h).toBe(6);
      // One open incident rides through.
      expect(result.overall.open_incidents).toBe(1);
      // Backlog with no recent worker activity → degraded worker → degraded.
      expect(result.overall.status).toBe('degraded');
      const worker = result.services.find((s) => s.id === 'worker');
      expect(worker?.status).toBe('degraded');
      const queue = result.services.find((s) => s.id === 'queue');
      expect(queue?.status).toBe('operational');
      // Incidents pass through with the resolved one intact.
      expect(result.incidents).toHaveLength(2);
      expect(result.incidents[0]).toMatchObject({ id: 'inc-1', status: 'active' });
      expect(result.incidents[1]).toMatchObject({ id: 'inc-2', status: 'resolved' });
      // DB performance: p50/p95 measured from the (frozen) probes.
      expect(result.db_performance.avg_query_ms).toBe(0);
      expect(result.db_performance.p95_query_ms).toBe(0);
      expect(result.db_performance.connections).toEqual({ active: 1, max: 100 });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('idles gracefully with no backlog (worker + overall operational)', async () => {
    const client = createAdminClient([
      { data: null, error: null }, // db probe
      { error: null }, // storage probe
      { data: [], error: null }, // scans rows
      { data: [], error: null }, // incidents
      { count: 0, error: null }, // queued
      { count: 0, error: null }, // in-flight
      { count: 0, error: null }, // table scans
      { count: 0, error: null }, // table profiles
      { count: 0, error: null }, // table waitlist
      { count: 0, error: null }, // table audit
    ]);
    const service = createService(client, monitoringConfig());

    const result = await service.getMonitoring();

    // A configured worker with no backlog is idle, not degraded.
    const worker = result.services.find((s) => s.id === 'worker');
    expect(worker?.status).toBe('operational');
    // Nothing degraded and no open incidents → overall operational.
    expect(result.overall.status).toBe('operational');
    // Zero rows → no completion-based uptime and no activity proxy.
    expect(result.overall.uptime_30d).toBeNull();
    expect(result.overall.checks_24h).toBe(0);
    // No completions/failures in 24h → failure_rate stays 0 (no div-by-zero).
    expect(result.queue_health.failure_rate).toBe(0);
  });

  it('treats a backlog with recent worker activity as healthy', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    try {
      const scanRows = [
        // Completed 5 minutes before the frozen clock → worker active recently.
        monitoringScan({
          status: 'complete',
          created_at: '2026-08-07T11:50:00.000Z',
          updated_at: '2026-08-07T11:55:00.000Z',
        }),
        monitoringScan({ status: 'queued', created_at: '2026-08-07T11:00:00.000Z' }),
      ];
      const client = createAdminClient([
        { data: null, error: null }, // db probe
        { error: null }, // storage probe
        { data: scanRows, error: null },
        { data: [], error: null }, // incidents
        { count: 1, error: null }, // queued
        { count: 0, error: null }, // in-flight
        { count: 1, error: null }, // table scans
        { count: 0, error: null }, // table profiles
        { count: 0, error: null }, // table waitlist
        { count: 0, error: null }, // table audit
      ]);
      const service = createService(client, monitoringConfig());

      const result = await service.getMonitoring();

      // Backlog exists (1 queued) but a completion landed 5 min ago → healthy.
      const worker = result.services.find((s) => s.id === 'worker');
      expect(worker?.status).toBe('operational');
      expect(result.queue_health).toMatchObject({
        queued: 1,
        in_flight: 0,
        throughput_per_hour: 1,
        avg_processing_time_ms: 300_000,
      });
      // No degraded services and no open incidents.
      expect(result.overall.status).toBe('operational');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('degrades storage and goes unreachable when the storage probe fails', async () => {
    const client = createAdminClient([
      { data: null, error: null }, // db probe ok
      { error: { message: 'R2 timeout' } }, // storage probe fails
      { data: [], error: null },
      { data: [], error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    ]);
    const service = createService(client, monitoringConfig());

    const result = await service.getMonitoring();

    const storage = result.services.find((s) => s.id === 'storage');
    expect(storage?.status).toBe('degraded');
    expect(storage?.latency_ms).toBeNull();
    // A failed probe makes the platform unreachable regardless of service mix.
    expect(result.overall.status).toBe('unreachable');
  });

  it('marks api/database unreachable when the db probe fails', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'connection refused' } }, // db probe fails
      { error: null }, // storage probe ok
      { data: [], error: null },
      { data: [], error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    ]);
    const service = createService(client, monitoringConfig());

    const result = await service.getMonitoring();

    const api = result.services.find((s) => s.id === 'api');
    const database = result.services.find((s) => s.id === 'database');
    expect(api?.status).toBe('unreachable');
    expect(database?.status).toBe('unreachable');
    expect(result.overall.status).toBe('unreachable');
  });

  it('returns null storage utilization when no bytes are recorded', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    try {
      const client = createAdminClient([
        { data: null, error: null }, // db probe
        { error: null }, // storage probe
        {
          // All scans carry zero/absent byte counts → usedBytes stays 0.
          data: [
            monitoringScan({
              status: 'complete',
              file_size_bytes: 0,
              created_at: '2026-08-07T11:00:00.000Z',
              updated_at: '2026-08-07T11:01:00.000Z',
            }),
            monitoringScan({
              status: 'queued',
              file_size_bytes: null,
              created_at: '2026-08-07T10:00:00.000Z',
            }),
          ],
          error: null,
        },
        { data: [], error: null }, // incidents
        { count: 1, error: null }, // queued
        { count: 0, error: null }, // in-flight
        { count: 2, error: null }, // table scans
        { count: 0, error: null }, // table profiles
        { count: 0, error: null }, // table waitlist
        { count: 0, error: null }, // table audit
      ]);
      const service = createService(client, monitoringConfig());

      const result = await service.getMonitoring();

      // Zero recorded bytes → the utilization panel is null (page renders '—').
      expect(result.storage_utilization).toBeNull();
      // The queue-health buckets still flow from the same rows.
      expect(result.queue_health.queued).toBe(1);
      expect(result.queue_health.throughput_per_hour).toBe(1);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('degrades the incidents section (not a 503) when the incidents table is missing', async () => {
    // Live-project scenario: migration 0007 (admin_incidents) not applied —
    // the incidents query errors while every core query succeeds. The whole
    // monitoring surface must not 503 over a display-only peripheral table.
    const client = createAdminClient([
      { data: null, error: null }, // db probe
      { error: null }, // storage probe
      { data: [], error: null }, // scans rows
      {
        data: null,
        error: {
          message:
            "Could not find the table 'public.admin_incidents' in the schema cache",
        },
      }, // incidents → unavailable
      { count: 0, error: null }, // queued
      { count: 0, error: null }, // in-flight
      { count: 0, error: null }, // table scans
      { count: 0, error: null }, // table profiles
      { count: 0, error: null }, // table waitlist
      { count: 0, error: null }, // table audit
    ]);
    const service = createService(client, monitoringConfig());

    const result = await service.getMonitoring();

    // Incidents degrade to an empty list; no throw.
    expect(result.incidents).toEqual([]);
    expect(result.overall.open_incidents).toBe(0);
    // The data gap stays visible: overall must be degraded, never operational.
    expect(result.overall.status).toBe('degraded');
    // Core surfaces still flow normally.
    expect(result.queue_health).toBeDefined();
    expect(result.storage_utilization).toBeNull();
  });
});
