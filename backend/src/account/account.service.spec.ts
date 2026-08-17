import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountService } from './account.service';

const USER_ID = 'user-1';

/**
 * Chainable supabase-js-style query builder for getActivity.
 *
 * getActivity awaits two chains in call order: (1) the audit query
 * (from → select → eq → order, with an optional like/in filter) and
 * (2) the resolved-incidents query (from → select → eq → order) — the latter
 * only for the 'all' / 'system' categories. Every awaited chain consumes one
 * entry from the plan, so each test's plan length reflects how many queries
 * the category triggers ([audit, incidents] for all/system, [audit] otherwise).
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
    like: jest.fn(() => builder),
    in: jest.fn(() => builder),
    update: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    // Profile chains (ensureProfile/updateProfile) end in maybeSingle/single,
    // which resolve their own plan entry as a promise.
    maybeSingle: jest.fn(() => Promise.resolve(next())),
    single: jest.fn(() => Promise.resolve(next())),
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
    SUPABASE_AUDIT_EVENTS_TABLE: 'auth_audit_events',
    SUPABASE_ADMIN_INCIDENTS_TABLE: 'admin_incidents',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createService(client: unknown, config?: ConfigService) {
  return new AccountService(
    {
      getAdminClient: jest.fn(() => client),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
  );
}

const user = {
  id: USER_ID,
  email: '  User@Example.com ',
};

const activityRows = [
  {
    id: 'evt-3',
    actor_email: 'user@example.com',
    action: 'scan.completed',
    entity_type: 'scan',
    entity_id: 'scan-3',
    created_at: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 'evt-2',
    actor_email: 'user@example.com',
    action: 'report.exported',
    entity_type: 'report',
    entity_id: 'report-2',
    created_at: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'evt-1',
    actor_email: 'user@example.com',
    action: 'settings.updated',
    entity_type: 'profile',
    entity_id: null,
    created_at: '2026-08-04T10:00:00.000Z',
  },
];

// Two resolved incidents with distinct resolved_at values so the merged-feed
// sort is deterministic: inc_001 (08-07) is the newest event overall, inc_002
// (08-03) lands after evt-1 (08-04).
const incidentRows = [
  {
    id: 'inc_001',
    severity: 'major',
    started_at: '2026-08-01T00:00:00.000Z',
    resolved_at: '2026-08-07T08:00:00.000Z',
    summary: 'A memory leak in the fingerprint model worker stalled processing.',
  },
  {
    id: 'inc_002',
    severity: 'minor',
    started_at: '2026-07-28T00:00:00.000Z',
    resolved_at: '2026-08-03T12:00:00.000Z',
    summary: 'Autoscaling lag pushed p95 latency above target.',
  },
];

const expectedIncidentEvents = [
  {
    id: 'incident_inc_001',
    action: 'incident.resolved',
    actor_email: 'system',
    severity: 'major',
    resource_type: 'incident',
    resource_id: 'inc_001',
    created_at: '2026-08-07T08:00:00.000Z',
    summary: 'A memory leak in the fingerprint model worker stalled processing.',
  },
  {
    id: 'incident_inc_002',
    action: 'incident.resolved',
    actor_email: 'system',
    severity: 'minor',
    resource_type: 'incident',
    resource_id: 'inc_002',
    created_at: '2026-08-03T12:00:00.000Z',
    summary: 'Autoscaling lag pushed p95 latency above target.',
  },
];

describe('AccountService.getActivity', () => {
  it('scopes the audit query by the normalized email and incidents by status', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      { data: incidentRows, error: null },
    ]);
    const service = createService(client);

    await service.getActivity(user, {});

    // Two chains: audit events + resolved incidents.
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(client.from).toHaveBeenCalledWith('auth_audit_events');
    expect(client.from).toHaveBeenCalledWith('admin_incidents');
    // Audit: eq on the trimmed/lowercased email; incidents: eq status resolved.
    expect(client.eq).toHaveBeenCalledWith('actor_email', 'user@example.com');
    expect(client.eq).toHaveBeenCalledWith('status', 'resolved');
    expect(client.select).toHaveBeenCalledWith(
      'id,actor_email,action,entity_type,entity_id,created_at',
    );
    expect(client.select).toHaveBeenCalledWith(
      'id,severity,started_at,resolved_at,summary',
    );
  });

  it('merges incident events into the feed, sorted newest-first, with the pagination envelope', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      { data: incidentRows, error: null },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { page: 1, pageSize: 20 });

    // Merged order (newest first): inc_001 (08-07), evt-3 (08-06), evt-2
    // (08-05), evt-1 (08-04), inc_002 (08-03).
    expect(result).toEqual({
      data: [
        ...expectedIncidentEvents.slice(0, 1),
        {
          id: 'evt-3',
          actor_email: 'user@example.com',
          action: 'scan.completed',
          severity: 'low',
          resource_type: 'scan',
          resource_id: 'scan-3',
          created_at: '2026-08-06T10:00:00.000Z',
        },
        {
          id: 'evt-2',
          actor_email: 'user@example.com',
          action: 'report.exported',
          severity: 'low',
          resource_type: 'report',
          resource_id: 'report-2',
          created_at: '2026-08-05T10:00:00.000Z',
        },
        {
          id: 'evt-1',
          actor_email: 'user@example.com',
          action: 'settings.updated',
          severity: 'low',
          resource_type: 'profile',
          resource_id: null,
          created_at: '2026-08-04T10:00:00.000Z',
        },
        ...expectedIncidentEvents.slice(1),
      ],
      page: 1,
      pageSize: 20,
      total: 5,
      totalPages: 1,
    });
  });

  it('slices the merged feed in memory across pages', async () => {
    // Fresh clients per call — the plan-based mock is single-shot.
    const service2 = createService(
      createAdminClient([
        { data: activityRows, error: null },
        { data: incidentRows, error: null },
      ]),
    );
    const service3 = createService(
      createAdminClient([
        { data: activityRows, error: null },
        { data: incidentRows, error: null },
      ]),
    );

    const page2 = await service2.getActivity(user, { page: 2, pageSize: 2 });
    const page3 = await service3.getActivity(user, { page: 3, pageSize: 2 });

    // Page 2 of the merged 5-event feed → evt-2, evt-1; page 3 → inc_002.
    expect(page2.data.map((event: { id: string }) => event.id)).toEqual([
      'evt-2',
      'evt-1',
    ]);
    expect(page3.data.map((event: { id: string }) => event.id)).toEqual([
      'incident_inc_002',
    ]);
    expect(page2.total).toBe(5);
    expect(page3.totalPages).toBe(3);
  });

  it('applies the scans category as a like filter and skips incidents', async () => {
    const client = createAdminClient([{ data: activityRows, error: null }]);
    const service = createService(client);

    const result = await service.getActivity(user, { category: 'scans' });

    expect(client.like).toHaveBeenCalledTimes(1);
    expect(client.like).toHaveBeenCalledWith('action', 'scan.%');
    expect(client.in).not.toHaveBeenCalled();
    // No incidents query for category-scoped views.
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith('auth_audit_events');
    expect(result.total).toBe(3);
  });

  it('applies the exports category as a like filter and skips incidents', async () => {
    const client = createAdminClient([{ data: activityRows, error: null }]);
    const service = createService(client);

    await service.getActivity(user, { category: 'exports' });

    expect(client.like).toHaveBeenCalledTimes(1);
    expect(client.like).toHaveBeenCalledWith('action', 'report.%');
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('applies the account category as an in filter and skips incidents', async () => {
    const client = createAdminClient([{ data: activityRows, error: null }]);
    const service = createService(client);

    await service.getActivity(user, { category: 'account' });

    expect(client.in).toHaveBeenCalledTimes(1);
    expect(client.in).toHaveBeenCalledWith('action', expect.any(Array));
    const values = client.in.mock.calls[0][1] as string[];
    expect(values).toEqual(
      expect.arrayContaining([
        'settings.updated',
        'invite_created',
        'api_key.created',
        'api_key.revoked',
      ]),
    );
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('applies the team category as an in filter and skips incidents', async () => {
    const client = createAdminClient([{ data: activityRows, error: null }]);
    const service = createService(client);

    await service.getActivity(user, { category: 'team' });

    expect(client.in).toHaveBeenCalledTimes(1);
    const values = client.in.mock.calls[0][1] as string[];
    expect(values).toEqual([
      'team.member_added',
      'team.member_removed',
      'role.changed',
      'org.created',
    ]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('applies the system category filter AND loads incidents', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      { data: incidentRows, error: null },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { category: 'system' });

    // The system action set includes incident.resolved for parity with the
    // frontend category match (even though incident rows live in another
    // table, the definition stays consistent).
    const values = client.in.mock.calls[0][1] as string[];
    expect(values).toEqual(
      expect.arrayContaining(['incident.resolved', 'waitlist_reviewed']),
    );
    // Incidents join the system feed.
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(
      result.data.some(
        (event: { action: string }) => event.action === 'incident.resolved',
      ),
    ).toBe(true);
  });

  it('treats an unknown category as "all" (no audit filter, incidents loaded)', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      { data: incidentRows, error: null },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { category: 'bogus-category' });

    expect(client.like).not.toHaveBeenCalled();
    expect(client.in).not.toHaveBeenCalled();
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(5);
  });

  it('degrades gracefully when the incidents table is missing (migration 0007 not applied)', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      {
        data: null,
        error: { code: 'PGRST205', message: 'Could not find the table "public.admin_incidents"' },
      },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, {});

    // Audit-only feed — no 503, no incident events.
    expect(result.total).toBe(3);
    expect(
      result.data.some(
        (event: { action: string }) => event.action === 'incident.resolved',
      ),
    ).toBe(false);
  });

  it('throws 503 when the incidents query fails for a real reason', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(service.getActivity(user, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns an empty envelope for no events of either kind', async () => {
    // data: null (not []) exercises the `data ?? []` fallback in both mappers.
    const client = createAdminClient([
      { data: null, error: null },
      { data: null, error: null },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { page: 1, pageSize: 20 });

    expect(result).toEqual({
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
  });

  it('clamps page 0 up to 1 and negative pageSize up to 1', async () => {
    const pageService = createService(
      createAdminClient([
        { data: activityRows, error: null },
        { data: incidentRows, error: null },
      ]),
    );
    const sizeService = createService(
      createAdminClient([
        { data: activityRows, error: null },
        { data: incidentRows, error: null },
      ]),
    );

    const pageResult = await pageService.getActivity(user, { page: 0, pageSize: 20 });
    expect(pageResult.page).toBe(1);

    const sizeResult = await sizeService.getActivity(user, { page: 1, pageSize: -5 });
    expect(sizeResult.pageSize).toBe(1);
  });

  it('clamps pageSize 300 down to the 200 cap', async () => {
    const client = createAdminClient([
      { data: activityRows, error: null },
      { data: incidentRows, error: null },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { page: 1, pageSize: 300 });

    expect(result.pageSize).toBe(200);
    expect(result.totalPages).toBe(1);
  });

  it('throws 400 when the user has no email', async () => {
    const client = createAdminClient([
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const service = createService(client);

    await expect(
      service.getActivity({ id: USER_ID }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getActivity({ id: USER_ID, email: '   ' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 503 when Supabase is not configured', async () => {
    const service = createService(null);

    await expect(
      service.getActivity(user, {}),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws 503 when the audit query fails', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(
      service.getActivity(user, {}),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('honors custom table names from config for both sources', async () => {
    const config = createConfigService({
      SUPABASE_AUDIT_EVENTS_TABLE: 'custom_audit_events',
      SUPABASE_ADMIN_INCIDENTS_TABLE: 'custom_incidents',
    });
    const client = createAdminClient([
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const service = createService(client, config);

    await service.getActivity(user, {});

    expect(client.from).toHaveBeenCalledWith('custom_audit_events');
    expect(client.from).toHaveBeenCalledWith('custom_incidents');
  });
});

// ---------------------------------------------------------------------------
// Profile surface fixtures — ensureProfile / updateProfile / getCurrentViewer
// ---------------------------------------------------------------------------

const profileUser = { id: USER_ID, email: 'jane.doe@example.com' };

const existingProfile = {
  user_id: USER_ID,
  email: 'jane.doe@example.com',
  display_name: 'Jane Doe',
  organization: 'Acme Corp',
  role_title: 'Analyst',
  default_workspace: 'individual',
  email_notifications: true,
  account_role: 'member',
  team_access: false,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

describe('AccountService.ensureProfile', () => {
  it('initializes a missing profile via insert with a resolved default row', async () => {
    const inserted = { ...existingProfile };
    const client = createAdminClient([
      { data: null, error: null },
      { data: inserted, error: null },
    ]);
    const service = createService(client);

    const result = await service.ensureProfile(profileUser);

    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(client.maybeSingle).toHaveBeenCalled();
    expect(client.insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      email: 'jane.doe@example.com',
      display_name: 'Jane Doe',
      organization: null,
      role_title: null,
      default_workspace: 'individual',
      email_notifications: true,
      account_role: 'member',
      team_access: false,
    });
    expect(result).toEqual(inserted);
  });

  it('falls back to the "Provance User" display name when the user has no email', async () => {
    const client = createAdminClient([
      { data: null, error: null },
      { data: { ...existingProfile, email: '', display_name: 'Provance User' }, error: null },
    ]);
    const service = createService(client);

    await service.ensureProfile({ id: USER_ID });

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: '',
        display_name: 'Provance User',
        account_role: 'member',
      }),
    );
  });

  it('promotes an admin email on insert', async () => {
    const config = createConfigService({ ADMIN_EMAILS: 'Founder@Provance.local' });
    const client = createAdminClient([
      { data: null, error: null },
      { data: { ...existingProfile, email: 'FOUNDER@PROVANCE.LOCAL', account_role: 'admin' }, error: null },
    ]);
    const service = createService(client, config);

    await service.ensureProfile({ id: USER_ID, email: 'FOUNDER@PROVANCE.LOCAL' });

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ account_role: 'admin' }),
    );
  });

  it('returns the existing profile untouched when no repair is needed', async () => {
    const client = createAdminClient([{ data: existingProfile, error: null }]);
    const service = createService(client);

    const result = await service.ensureProfile(profileUser);

    expect(result).toEqual(existingProfile);
    expect(client.insert).not.toHaveBeenCalled();
    expect(client.update).not.toHaveBeenCalled();
  });

  it('repairs a blank display name from the email local part', async () => {
    const stale = { ...existingProfile, display_name: '' };
    const repaired = { ...existingProfile };
    const client = createAdminClient([
      { data: stale, error: null },
      { data: repaired, error: null },
    ]);
    const service = createService(client);

    const result = await service.ensureProfile(profileUser);

    expect(client.update).toHaveBeenCalledWith({
      email: 'jane.doe@example.com',
      display_name: 'Jane Doe',
      account_role: 'member',
    });
    expect(result).toEqual(repaired);
  });

  it('repairs a stale email and an outdated role in one update', async () => {
    const config = createConfigService({ ADMIN_EMAILS: 'admin@provance.local' });
    const stale = {
      ...existingProfile,
      email: 'old@example.com',
      account_role: 'member',
    };
    const repaired = {
      ...stale,
      email: 'ADMIN@PROVANCE.LOCAL',
      account_role: 'admin',
    };
    const client = createAdminClient([
      { data: stale, error: null },
      { data: repaired, error: null },
    ]);
    const service = createService(client, config);

    await service.ensureProfile({ id: USER_ID, email: 'ADMIN@PROVANCE.LOCAL' });

    // The stored email is the raw (un-normalized) value from the JWT; the role
    // is resolved through the case-insensitive ADMIN_EMAILS match.
    expect(client.update).toHaveBeenCalledWith({
      email: 'ADMIN@PROVANCE.LOCAL',
      display_name: 'Jane Doe',
      account_role: 'admin',
    });
  });

  it('repairs a blank display name using the stored email when the JWT has none', async () => {
    const stale = { ...existingProfile, display_name: '' };
    const repaired = { ...existingProfile };
    const client = createAdminClient([
      { data: stale, error: null },
      { data: repaired, error: null },
    ]);
    const service = createService(client);

    await service.ensureProfile({ id: USER_ID });

    // user.email is undefined → the repair keeps the stored profile email,
    // and the blank display name falls back to the generic default.
    expect(client.update).toHaveBeenCalledWith({
      email: 'jane.doe@example.com',
      display_name: 'Provance User',
      account_role: 'member',
    });
  });

  it('throws 503 when the profile select fails', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(service.ensureProfile(profileUser)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 503 when the insert fails', async () => {
    const client = createAdminClient([
      { data: null, error: null },
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(service.ensureProfile(profileUser)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 503 when the repair update fails', async () => {
    const client = createAdminClient([
      { data: { ...existingProfile, display_name: '' }, error: null },
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(service.ensureProfile(profileUser)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 503 when Supabase is not configured', async () => {
    const service = createService(null);

    await expect(service.ensureProfile(profileUser)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('AccountService.updateProfile', () => {
  it('applies dto overrides and returns the updated envelope', async () => {
    const updated = {
      ...existingProfile,
      display_name: 'Jane Roe',
      organization: null,
      role_title: 'Lead Analyst',
      email_notifications: false,
    };
    const client = createAdminClient([
      { data: existingProfile, error: null },
      { data: updated, error: null },
    ]);
    const service = createService(client);

    const result = await service.updateProfile(profileUser, {
      displayName: '  Jane Roe  ',
      organization: '',
      roleTitle: 'Lead Analyst',
      defaultWorkspace: 'individual',
      emailNotifications: false,
    });

    expect(client.update).toHaveBeenCalledWith({
      display_name: 'Jane Roe',
      organization: null,
      role_title: 'Lead Analyst',
      default_workspace: 'individual',
      email_notifications: false,
      account_role: 'member',
      team_access: false,
      email: 'jane.doe@example.com',
    });
    expect(result).toEqual({
      status: 'updated',
      profile: {
        displayName: 'Jane Roe',
        organization: '',
        roleTitle: 'Lead Analyst',
        defaultWorkspace: 'individual',
        emailNotifications: false,
        accountRole: 'member',
        teamAccess: false,
      },
      permissions: { individual: true, team: false, admin: false },
    });
  });

  it('falls back to current values when dto fields are omitted', async () => {
    const client = createAdminClient([
      { data: existingProfile, error: null },
      { data: existingProfile, error: null },
    ]);
    const service = createService(client);

    await service.updateProfile(profileUser, {});

    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Jane Doe',
        organization: 'Acme Corp',
        role_title: 'Analyst',
        default_workspace: 'individual',
        email_notifications: true,
      }),
    );
  });

  it('rejects a team workspace when team access is not enabled', async () => {
    const client = createAdminClient([{ data: existingProfile, error: null }]);
    const service = createService(client);

    await expect(
      service.updateProfile(profileUser, { defaultWorkspace: 'team' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(client.update).not.toHaveBeenCalled();
  });

  it('falls back to current values for blank strings and a missing JWT email', async () => {
    const client = createAdminClient([
      { data: existingProfile, error: null },
      { data: existingProfile, error: null },
    ]);
    const service = createService(client);

    await service.updateProfile(
      { id: USER_ID },
      {
        displayName: '   ',
        organization: '  New Org  ',
        roleTitle: '   ',
      },
    );

    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        // Blank display name → keep the current one; blank role title → null.
        display_name: 'Jane Doe',
        role_title: null,
        // Non-blank organization is trimmed and kept.
        organization: 'New Org',
        // No JWT email → fall back to the profile's stored email.
        email: 'jane.doe@example.com',
      }),
    );
  });

  it('throws 503 when Supabase is not configured', async () => {
    const service = createService(null);

    await expect(service.updateProfile(profileUser, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 503 when the update fails', async () => {
    const client = createAdminClient([
      { data: existingProfile, error: null },
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(
      service.updateProfile(profileUser, { displayName: 'New Name' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('AccountService.getCurrentViewer', () => {
  it('returns the authenticated envelope with permissions and the serialized profile', async () => {
    const adminProfile = {
      ...existingProfile,
      account_role: 'admin',
      team_access: true,
      default_workspace: 'team',
    };
    const client = createAdminClient([{ data: adminProfile, error: null }]);
    const service = createService(client);

    const result = await service.getCurrentViewer(profileUser);

    expect(result).toEqual({
      status: 'authenticated',
      user: { id: USER_ID, email: 'jane.doe@example.com' },
      permissions: { individual: true, team: true, admin: true },
      profile: {
        displayName: 'Jane Doe',
        organization: 'Acme Corp',
        roleTitle: 'Analyst',
        defaultWorkspace: 'team',
        emailNotifications: true,
        accountRole: 'admin',
        teamAccess: true,
      },
    });
  });

  it('defaults the workspace to individual when team access is off', async () => {
    const client = createAdminClient([{ data: existingProfile, error: null }]);
    const service = createService(client);

    const result = await service.getCurrentViewer(profileUser);

    expect(result.profile.defaultWorkspace).toBe('individual');
    expect(result.permissions).toEqual({
      individual: true,
      team: false,
      admin: false,
    });
  });

  it('serializes null organization and role title as empty strings', async () => {
    const sparse = { ...existingProfile, organization: null, role_title: null };
    const client = createAdminClient([{ data: sparse, error: null }]);
    const service = createService(client);

    const result = await service.getCurrentViewer(profileUser);

    expect(result.profile.organization).toBe('');
    expect(result.profile.roleTitle).toBe('');
  });
});

describe('AccountService.getActivity (branch edges)', () => {
  it('defaults the input and the table names when both config keys are absent', async () => {
    const client = createAdminClient([
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const service = createService(
      client,
      createConfigService({
        SUPABASE_AUDIT_EVENTS_TABLE: undefined,
        SUPABASE_ADMIN_INCIDENTS_TABLE: undefined,
      }),
    );

    // No input arg → the `= {}` default fires.
    await service.getActivity({ id: USER_ID, email: 'user@example.com' });

    expect(client.from).toHaveBeenCalledWith('auth_audit_events');
    expect(client.from).toHaveBeenCalledWith('admin_incidents');
  });

  it('defaults a missing actor email to system', async () => {
    const client = createAdminClient([
      {
        data: [
          {
            id: 'evt-9',
            actor_email: null,
            action: 'scan.completed',
            entity_type: 'scan',
            entity_id: 'scan-9',
            created_at: '2026-08-08T00:00:00.000Z',
          },
        ],
        error: null,
      },
      { data: [], error: null },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { category: 'all' });

    expect(result.data[0].actor_email).toBe('system');
  });

  it('falls back to started_at when a resolved incident has no resolved_at', async () => {
    const client = createAdminClient([
      { data: [], error: null },
      {
        data: [
          {
            id: 'inc_9',
            severity: 'minor',
            started_at: '2026-08-01T00:00:00.000Z',
            resolved_at: null,
            summary: 'Degraded performance.',
          },
        ],
        error: null,
      },
    ]);
    const service = createService(client);

    const result = await service.getActivity(user, { category: 'system' });

    expect(result.data[0].created_at).toBe('2026-08-01T00:00:00.000Z');
  });

  it('treats a non-object incidents error as a real failure (503, not missing-table)', async () => {
    const client = createAdminClient([
      { data: [], error: null },
      { data: null, error: 'boom' },
    ]);
    const service = createService(client);

    await expect(
      service.getActivity(user, { category: 'all' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
