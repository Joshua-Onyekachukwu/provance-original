import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { hashRefreshToken, SecurityService } from './security.service';
import { describeDevice, requestSessionMeta } from './session-meta.util';

const USER_ID = 'user-1';

function createConfigService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createNotificationsMock() {
  return {
    create: jest.fn().mockResolvedValue(undefined),
  };
}

function createService(
  adminClient: unknown,
  publicClient?: unknown,
  config?: ConfigService,
  notifications?: ReturnType<typeof createNotificationsMock>,
) {
  return new SecurityService(
    {
      getAdminClient: jest.fn(() => adminClient),
      createPublicClient: jest.fn(() => publicClient ?? null),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
    (notifications ?? createNotificationsMock()) as never,
  );
}

/**
 * A chainable supabase-js-style query builder.
 *
 * - `.maybeSingle()` returns a real Promise (the service awaits it directly).
 * - The builder itself is thenable (PostgrestBuilder contract) for queries
 *   the service awaits as the final value of the chain.
 */
function chain(final: () => Promise<unknown>) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(final())),
    then(resolve: (value: unknown) => void) {
      Promise.resolve(final()).then(resolve);
      return undefined;
    },
  };
  return builder;
}

function deleteChain(final: () => Promise<unknown>) {
  return {
    delete: jest.fn().mockReturnValue({
      eq: jest.fn(() => Promise.resolve(final())),
    }),
  };
}

/**
 * A builder whose maybeSingle resolves a team lookup (resolveUserTeam's
 * profiles / organization_members probes) — its thenable resolves the same
 * value, which those paths never await.
 */
function teamLookupChain(teamId: string | null = null) {
  return chain(() => ({
    data: teamId ? { team_id: teamId } : null,
    error: null,
  }));
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Session meta util
// ---------------------------------------------------------------------------

describe('session-meta util', () => {
  it('classifies common user agents into "<Browser> on <OS>" labels', () => {
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/126.0')).toBe(
      'Chrome on Windows',
    );
    expect(describeDevice('Mozilla/5.0 (Macintosh) Version/17.5 Safari/605.1.15')).toBe(
      'Safari on macOS',
    );
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Mobile Safari/604.1')).toBe(
      'Safari on iPhone',
    );
    expect(describeDevice('Mozilla/5.0 (X11; Linux x86_64) Firefox/127.0')).toBe(
      'Firefox on Linux',
    );
    expect(describeDevice('')).toBe('Unknown device');
  });

  it('derives ip/location from proxy headers with graceful fallbacks', () => {
    const meta = requestSessionMeta({
      headers: {
        'user-agent': 'Chrome/126.0',
        'x-forwarded-for': '203.0.113.9, 10.0.0.1',
        'x-vercel-ip-country': 'DE',
      },
      socket: { remoteAddress: '127.0.0.1' },
    } as never);

    expect(meta.device).toBe('Chrome on device');
    expect(meta.ipAddress).toBe('203.0.113.9');
    expect(meta.location).toBe('DE');

    const bare = requestSessionMeta({ headers: {} } as never);
    expect(bare.device).toBe('Unknown device');
    expect(bare.ipAddress).toBeUndefined();
    expect(bare.location).toBeUndefined();

    // A comma-joined proxy chain keeps only the left-most (client) address.
    const chained = requestSessionMeta({
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    } as never);
    expect(chained.ipAddress).toBe('203.0.113.9');
  });
});

// ---------------------------------------------------------------------------
// SecurityService — session ledger
// ---------------------------------------------------------------------------

describe('SecurityService', () => {
  describe('recordSession', () => {
    it('upserts by (user_id, auth_session_id) with a hashed refresh token', async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      const adminClient = { from: jest.fn().mockReturnValue({ upsert }) };
      const service = createService(adminClient);

      await service.recordSession({
        userId: USER_ID,
        authSessionId: 'sid-1',
        refreshToken: 'super-secret-refresh-token',
        meta: { device: 'Chrome on Windows', ipAddress: '1.2.3.4', location: 'DE' },
      });

      expect(adminClient.from).toHaveBeenCalledWith('user_sessions');
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          auth_session_id: 'sid-1',
          device: 'Chrome on Windows',
          ip_address: '1.2.3.4',
          location: 'DE',
          last_active_at: expect.any(String),
        }),
        { onConflict: 'user_id,auth_session_id' },
      );
      // Only the hash is stored — never the raw refresh token.
      const payload = upsert.mock.calls[0][0];
      expect(payload.refresh_token_hash).toBe(hashRefreshToken('super-secret-refresh-token'));
      expect(payload.refresh_token_hash).not.toContain('super-secret-refresh-token');
    });

    it('never throws when the ledger table is missing (best-effort)', async () => {
      const adminClient = {
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockResolvedValue({
            error: { message: 'Could not find the table public.user_sessions in the schema cache' },
          }),
        }),
      };
      const service = createService(adminClient);

      await expect(
        service.recordSession({ userId: USER_ID, authSessionId: 'sid-1' }),
      ).resolves.toBeUndefined();
    });

    /**
     * sessionLedgerChain — a from() result that answers the detection probe
     * (select/eq/eq/eq/limit, awaited as the final value) and then the upsert.
     * `insert` covers the auth_audit_events + notifications writes so the
     * new-device path runs end to end. Returns the builder object so the test
     * can re-point each call.
     */
    function sessionLedgerChain(
      probeResult: { data: unknown[]; error: unknown },
    ) {
      const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        limit: jest.fn(() => Promise.resolve(probeResult)),
        upsert: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
      return { builder };
    }

    it('detects a first-time (device, ip) combo and writes the audit event', async () => {
      const { builder } = sessionLedgerChain({ data: [], error: null });
      // Settings probe degrades to defaults (no notifyOnNewDevice) so the
      // test asserts only the unconditional audit write.
      const settingsProbe = chain(() => ({ data: null, error: null }));
      const adminClient = {
        from: jest.fn((table: string) =>
          table === 'user_security_settings' ? settingsProbe : builder,
        ),
      };
      const notifications = createNotificationsMock();
      const service = createService(adminClient, undefined, undefined, notifications);

      await service.recordSession({
        userId: USER_ID,
        authSessionId: 'sid-1',
        meta: { device: 'Chrome on Windows', ipAddress: '9.9.9.9', location: 'US' },
      });

      // The probe queried user_sessions for the exact combo before upserting.
      expect(adminClient.from).toHaveBeenCalledWith('user_sessions');
      expect(builder.eq).toHaveBeenCalledWith('user_id', USER_ID);
      expect(builder.eq).toHaveBeenCalledWith('device', 'Chrome on Windows');
      expect(builder.eq).toHaveBeenCalledWith('ip_address', '9.9.9.9');

      // Audit event written with the device/IP details.
      const auditInsert = adminClient.from.mock.calls
        .map((call: [string]) => call[0])
        .filter((table: string) => table === 'auth_audit_events');
      expect(auditInsert).toHaveLength(1);
    });

    it('creates a security notification + mock email only when notifyOnNewDevice is on', async () => {
      const { builder } = sessionLedgerChain({ data: [], error: null });
      // settings table probe → notifyOnNewDevice true.
      const settingsProbe = chain(() => ({
        data: { notify_on_new_device: true },
        error: null,
      }));
      const adminClient = {
        from: jest.fn((table: string) =>
          table === 'user_security_settings' ? settingsProbe : builder,
        ),
      };
      const notifications = createNotificationsMock();
      const service = createService(adminClient, undefined, undefined, notifications);

      await service.recordSession({
        userId: USER_ID,
        authSessionId: 'sid-1',
        meta: { device: 'Safari on macOS', ipAddress: '8.8.8.8', location: 'DE' },
      });

      expect(notifications.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          category: 'security',
          title: 'New device sign-in detected',
          link: '/app/security',
        }),
      );
    });

    it('skips the notification when notifyOnNewDevice is off (audit still written)', async () => {
      const { builder } = sessionLedgerChain({ data: [], error: null });
      const settingsProbe = chain(() => ({
        data: { notify_on_new_device: false },
        error: null,
      }));
      const adminClient = {
        from: jest.fn((table: string) =>
          table === 'user_security_settings' ? settingsProbe : builder,
        ),
      };
      const notifications = createNotificationsMock();
      const service = createService(adminClient, undefined, undefined, notifications);

      await service.recordSession({
        userId: USER_ID,
        authSessionId: 'sid-1',
        meta: { device: 'Firefox on Linux', ipAddress: '7.7.7.7', location: null },
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('does not re-trigger when the same combo already has a ledger row (refresh)', async () => {
      const { builder } = sessionLedgerChain({
        data: [{ id: 'row-1' }],
        error: null,
      });
      const adminClient = { from: jest.fn().mockReturnValue(builder) };
      const notifications = createNotificationsMock();
      const service = createService(adminClient, undefined, undefined, notifications);

      await service.recordSession({
        userId: USER_ID,
        authSessionId: 'sid-1',
        meta: { device: 'Chrome on Windows', ipAddress: '1.2.3.4', location: 'DE' },
      });

      expect(adminClient.from).not.toHaveBeenCalledWith('auth_audit_events');
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteSessionByRefreshHash', () => {
    it('deletes the ledger row matching the hashed refresh token', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      const adminClient = { from: jest.fn().mockReturnValue({ delete: jest.fn().mockReturnValue({ eq }) }) };
      const service = createService(adminClient);

      await service.deleteSessionByRefreshHash('cookie-refresh-token');

      expect(adminClient.from).toHaveBeenCalledWith('user_sessions');
      expect(eq).toHaveBeenCalledWith('refresh_token_hash', hashRefreshToken('cookie-refresh-token'));
    });
  });

  describe('listSessions', () => {
    const rows = [
      {
        id: 'sess-2',
        user_id: USER_ID,
        auth_session_id: 'sid-2',
        refresh_token_hash: 'h2',
        device: 'Firefox on macOS',
        ip_address: '9.9.9.9',
        location: 'AB, NG',
        created_at: '2026-08-01T00:00:00.000Z',
        last_active_at: '2026-08-06T10:00:00.000Z',
      },
      {
        id: 'sess-1',
        user_id: USER_ID,
        auth_session_id: 'sid-1',
        refresh_token_hash: 'h1',
        device: 'Chrome on Windows',
        ip_address: '1.2.3.4',
        location: null,
        created_at: '2026-08-01T00:00:00.000Z',
        last_active_at: '2026-08-05T10:00:00.000Z',
      },
    ];

    it('maps ledger rows and marks the current session by sid', async () => {
      const builder = chain(() => ({ data: rows, error: null }));
      // resolveUserTeam probes profiles then organization_members after the
      // ledger read; both resolve no team here (mockReturnValue reuse).
      const adminClient = { from: jest.fn().mockReturnValue(builder) };
      const service = createService(adminClient);

      const result = await service.listSessions(
        { id: USER_ID, sid: 'sid-1' },
        'sid-1',
      );

      expect(builder.eq).toHaveBeenCalledWith('user_id', USER_ID);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'sess-2',
        device: 'Firefox on macOS',
        location: 'AB, NG',
        ipAddress: '9.9.9.9',
        isCurrent: false,
        teamId: null,
      });
      expect(result[1]).toMatchObject({
        id: 'sess-1',
        device: 'Chrome on Windows',
        location: 'Unknown',
        ipAddress: '1.2.3.4',
        isCurrent: true,
        teamId: null,
      });
    });

    it('badges devices first seen within the window as New device (trust signal)', async () => {
      const day = 86_400_000;
      const iso = (daysBack: number) => new Date(Date.now() - daysBack * day).toISOString();
      const rows = [
        {
          id: 'sess-new',
          user_id: USER_ID,
          auth_session_id: 'sid-new',
          refresh_token_hash: 'h',
          device: 'Chrome on Windows',
          ip_address: '1.2.3.4',
          location: null,
          created_at: iso(2),
          last_active_at: iso(1),
        },
        {
          id: 'sess-known',
          user_id: USER_ID,
          auth_session_id: 'sid-known',
          refresh_token_hash: 'h',
          device: 'Firefox on macOS',
          ip_address: '5.6.7.8',
          location: null,
          created_at: iso(40),
          last_active_at: iso(39),
        },
        {
          id: 'sess-unknown',
          user_id: USER_ID,
          auth_session_id: 'sid-unknown',
          refresh_token_hash: 'h',
          device: 'Unknown device',
          ip_address: '9.9.9.9',
          location: null,
          created_at: iso(0),
          last_active_at: iso(0),
        },
      ];
      const builder = chain(() => ({ data: rows, error: null }));
      const adminClient = { from: jest.fn().mockReturnValue(builder) };
      const service = createService(adminClient);

      const result = await service.listSessions({ id: USER_ID });

      const byId = Object.fromEntries(result.map((session) => [session.id, session]));
      // First appearance 2 days ago → new. First appearance 40 days ago →
      // known, even though last_active is recent. 'Unknown device' never
      // badges regardless of recency.
      expect(byId['sess-new'].isNewDevice).toBe(true);
      expect(byId['sess-known'].isNewDevice).toBe(false);
      expect(byId['sess-unknown'].isNewDevice).toBe(false);
    });

    it('tags every row with the user\'s team (profile-first)', async () => {
      const ledgerBuilder = chain(() => ({ data: rows, error: null }));
      const adminClient = {
        from: jest
          .fn()
          .mockReturnValueOnce(ledgerBuilder)
          .mockReturnValueOnce(teamLookupChain('team_legal')),
      };
      const service = createService(adminClient);

      const result = await service.listSessions({ id: USER_ID });

      // A profile hit short-circuits — the membership fallback is not queried.
      expect(adminClient.from).toHaveBeenCalledWith('profiles');
      expect(adminClient.from).not.toHaveBeenCalledWith('organization_members');
      expect(result.every((session) => session.teamId === 'team_legal')).toBe(true);
    });

    it('falls back to the membership team when the profile has none', async () => {
      const ledgerBuilder = chain(() => ({ data: rows, error: null }));
      const adminClient = {
        from: jest
          .fn()
          .mockReturnValueOnce(ledgerBuilder)
          .mockReturnValueOnce(teamLookupChain())
          .mockReturnValueOnce(teamLookupChain('team_growth')),
      };
      const service = createService(adminClient);

      const result = await service.listSessions({ id: USER_ID });

      expect(adminClient.from).toHaveBeenCalledWith('organization_members');
      expect(result.every((session) => session.teamId === 'team_growth')).toBe(true);
    });

    it('scopes to the target user and uses the passed teamId when provided', async () => {
      const builder = chain(() => ({ data: rows, error: null }));
      const adminClient = { from: jest.fn().mockReturnValue(builder) };
      const service = createService(adminClient);

      const result = await service.listSessions(
        { id: 'actor-1', sid: 'sid-actor' },
        'sid-actor',
        { targetUserId: 'target-9', teamId: 'team_product' },
      );

      expect(builder.eq).toHaveBeenCalledWith('user_id', 'target-9');
      // opts.teamId skips the team lookup entirely — no extra from() calls.
      expect(adminClient.from).toHaveBeenCalledTimes(1);
      expect(result[0].teamId).toBe('team_product');
    });

    it('degrades to an empty list when the table is not applied yet', async () => {
      const builder = chain(() => ({
        data: null,
        error: { message: 'relation "user_sessions" does not exist' },
      }));
      const adminClient = { from: jest.fn().mockReturnValue(builder) };
      const service = createService(adminClient);

      await expect(service.listSessions({ id: USER_ID })).resolves.toEqual([]);
    });

    it('surfaces 503 on genuine query failures', async () => {
      const builder = chain(() => ({ data: null, error: { message: 'boom' } }));
      const adminClient = { from: jest.fn().mockReturnValue(builder) };
      const service = createService(adminClient);

      await expect(service.listSessions({ id: USER_ID })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('revokeSession', () => {
    it('revokes the GoTrue session and drops the ledger row', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, status: 200 } as Response);

      const lookup = chain(() => ({
        data: { id: 'sess-other', user_id: USER_ID, auth_session_id: 'sid-other' },
        error: null,
      }));
      const ledgerDelete = jest.fn().mockResolvedValue({ error: null });
      const auditInsert = jest.fn().mockResolvedValue({ error: null });
      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => lookup)
          .mockImplementationOnce(() => deleteChain(() => ledgerDelete()))
          .mockImplementationOnce(() => ({ insert: auditInsert })),
      };
      const service = createService(adminClient);

      const result = await service.revokeSession(
        { id: USER_ID, sid: 'sid-current' },
        'sess-other',
        'sid-current',
      );

      expect(result).toEqual({ ok: true, sessionId: 'sess-other' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://project.supabase.co/auth/v1/admin/users/user-1/sessions/sid-other',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            apikey: 'service-role-key',
            Authorization: 'Bearer service-role-key',
          }),
        }),
      );
      expect(ledgerDelete).toHaveBeenCalled();
      // Security actions land in the audit trail.
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'session_revoked', entity_type: 'auth_session' }),
      );
    });

    it('404s when the session is not owned by the user', async () => {
      const lookup = chain(() => ({ data: null, error: null }));
      const adminClient = { from: jest.fn().mockReturnValue(lookup) };
      const service = createService(adminClient);

      await expect(
        service.revokeSession({ id: USER_ID }, 'sess-unknown', 'sid-current'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects revoking the current session', async () => {
      const lookup = chain(() => ({
        data: { id: 'sess-current', user_id: USER_ID, auth_session_id: 'sid-current' },
        error: null,
      }));
      const adminClient = { from: jest.fn().mockReturnValue(lookup) };
      const service = createService(adminClient);

      await expect(
        service.revokeSession(
          { id: USER_ID, sid: 'sid-current' },
          'sess-current',
          'sid-current',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('treats an already-dead GoTrue session (404) as revoked', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: false, status: 404 } as Response);

      const lookup = chain(() => ({
        data: { id: 'sess-other', user_id: USER_ID, auth_session_id: 'sid-other' },
        error: null,
      }));
      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => lookup)
          .mockImplementationOnce(() => deleteChain(() => Promise.resolve({ error: null })))
          .mockImplementationOnce(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })),
      };
      const service = createService(adminClient);

      await expect(
        service.revokeSession({ id: USER_ID }, 'sess-other', 'sid-current'),
      ).resolves.toEqual({ ok: true, sessionId: 'sess-other' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeSessionForUser', () => {
    it('revokes a target member\'s session and records the target in the audit', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, status: 200 } as Response);

      const lookup = chain(() => ({
        data: { id: 'sess-target', user_id: 'target-9', auth_session_id: 'sid-target' },
        error: null,
      }));
      const ledgerDelete = jest.fn().mockResolvedValue({ error: null });
      const auditInsert = jest.fn().mockResolvedValue({ error: null });
      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => lookup)
          .mockImplementationOnce(() => deleteChain(() => ledgerDelete()))
          .mockImplementationOnce(() => ({ insert: auditInsert })),
      };
      const service = createService(adminClient);

      const result = await service.revokeSessionForUser(
        { id: 'actor-1', email: 'admin@example.com' },
        'target-9',
        'sess-target',
      );

      expect(result).toEqual({ ok: true, sessionId: 'sess-target' });
      // The row lookup is scoped to the target user, and the GoTrue session
      // killed is the target's.
      expect(lookup.eq).toHaveBeenCalledWith('user_id', 'target-9');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://project.supabase.co/auth/v1/admin/users/target-9/sessions/sid-target',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_revoked',
          actor_email: 'admin@example.com',
          details: { targetUserId: 'target-9' },
        }),
      );
    });

    it('blocks an admin revoking their own current session', async () => {
      const lookup = chain(() => ({
        data: { id: 'sess-current', user_id: 'actor-1', auth_session_id: 'sid-current' },
        error: null,
      }));
      const adminClient = { from: jest.fn().mockReturnValue(lookup) };
      const service = createService(adminClient);

      await expect(
        service.revokeSessionForUser(
          { id: 'actor-1', sid: 'sid-current' },
          'actor-1',
          'sess-current',
          'sid-current',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows an admin revoking another user\'s current-looking session id', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, status: 200 } as Response);

      const lookup = chain(() => ({
        data: { id: 'sess-t', user_id: 'target-9', auth_session_id: 'sid-current' },
        error: null,
      }));
      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => lookup)
          .mockImplementationOnce(() => deleteChain(() => Promise.resolve({ error: null })))
          .mockImplementationOnce(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })),
      };
      const service = createService(adminClient);

      // The sid collides with the actor's current session id, but the row
      // belongs to the target — only the row owner's own current session is
      // protected.
      await expect(
        service.revokeSessionForUser(
          { id: 'actor-1', sid: 'sid-current' },
          'target-9',
          'sess-t',
          'sid-current',
        ),
      ).resolves.toEqual({ ok: true, sessionId: 'sess-t' });
    });

    it('404s for an unknown target session', async () => {
      const lookup = chain(() => ({ data: null, error: null }));
      const adminClient = { from: jest.fn().mockReturnValue(lookup) };
      const service = createService(adminClient);

      await expect(
        service.revokeSessionForUser({ id: 'actor-1' }, 'target-9', 'sess-unknown'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // Settings + password
  // -------------------------------------------------------------------------

  describe('getSettings / updateSetting', () => {
    it('returns policy, sessions, and default controls on a fresh DB', async () => {
      const sessionBuilder = chain(() => ({ data: [], error: null }));
      const settingsBuilder = chain(() => ({ data: null, error: null }));
      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => sessionBuilder)
          // listSessions resolves the caller's team (profiles → membership).
          .mockImplementationOnce(() => teamLookupChain())
          .mockImplementationOnce(() => teamLookupChain())
          .mockImplementationOnce(() => settingsBuilder),
      };
      const service = createService(adminClient);

      const result = await service.getSettings({ id: USER_ID, sid: 'sid-1' }, 'sid-1');

      expect(result.passwordPolicy).toMatchObject({
        minLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
      });
      expect(result.activeSessions).toEqual([]);
      expect(result.signInControls).toMatchObject({
        twoFactorAuth: { enabled: false },
        sessionTimeoutMinutes: 60,
        notifyOnNewDevice: false,
        notifyOnPasswordChange: false,
      });
    });

    it('persists a normalized setting and returns ok', async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      const settingsBuilder = chain(() => ({ data: null, error: null }));
      const auditInsert = jest.fn().mockResolvedValue({ error: null });
      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => settingsBuilder)
          .mockImplementationOnce(() => ({ upsert }))
          .mockImplementationOnce(() => ({ insert: auditInsert })),
      };
      const service = createService(adminClient);

      const result = await service.updateSetting(
        { id: USER_ID },
        'twoFactorAuth',
        { enabled: true },
      );

      expect(result).toEqual({ ok: true, key: 'twoFactorAuth', value: { enabled: true } });
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          two_factor_enabled: true,
          session_timeout_minutes: 60,
        }),
        { onConflict: 'user_id' },
      );
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'security_setting_updated',
          details: { key: 'twoFactorAuth' },
        }),
      );
    });

    it('rejects an invalid session timeout even before config is available', async () => {
      const service = createService(null);
      await expect(
        service.updateSetting({ id: USER_ID }, 'sessionTimeoutMinutes', -5),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('verifies the current password, updates, and revokes other sessions', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, status: 200 } as Response);

      const signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: { refresh_token: 'verification-refresh' } },
        error: null,
      });
      const publicClient = { auth: { signInWithPassword } };
      const adminSignOut = jest.fn().mockResolvedValue({ data: {}, error: null });
      const updateUserById = jest.fn().mockResolvedValue({ data: { id: USER_ID }, error: null });

      const sessionBuilder = chain(() => ({
        data: [
          {
            id: 'sess-other',
            user_id: USER_ID,
            auth_session_id: 'sid-other',
            device: 'Safari on iPhone',
            ip_address: null,
            location: null,
            created_at: '2026-08-01T00:00:00.000Z',
            last_active_at: '2026-08-06T10:00:00.000Z',
          },
          {
            id: 'sess-current',
            user_id: USER_ID,
            auth_session_id: 'sid-current',
            device: 'Chrome on Windows',
            ip_address: null,
            location: null,
            created_at: '2026-08-01T00:00:00.000Z',
            last_active_at: '2026-08-06T11:00:00.000Z',
          },
        ],
        error: null,
      }));

      const adminClient = {
        from: jest
          .fn()
          .mockImplementationOnce(() => sessionBuilder) // listSessions
          .mockImplementationOnce(() => teamLookupChain()) // team: profiles
          .mockImplementationOnce(() => teamLookupChain()) // team: membership
          .mockImplementationOnce(
            () =>
              chain(() => ({
                data: { id: 'sess-other', user_id: USER_ID, auth_session_id: 'sid-other' },
                error: null,
              })),
          ) // revoke: row lookup
          .mockImplementationOnce(() => deleteChain(() => Promise.resolve({ error: null }))) // revoke: ledger delete
          .mockImplementationOnce(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })) // revoke: audit
          .mockImplementationOnce(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })), // password change: audit
        auth: {
          admin: {
            signOut: adminSignOut,
            updateUserById,
          },
        },
      };
      const service = createService(adminClient, publicClient);

      const result = await service.changePassword(
        { id: USER_ID, email: 'user@example.com', sid: 'sid-current' },
        { currentPassword: 'old-password', newPassword: 'new-password-123' },
        'sid-current',
      );

      expect(result).toEqual({ ok: true });
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'old-password',
      });
      // The throwaway verification session is burned immediately.
      expect(adminSignOut).toHaveBeenCalledWith('verification-refresh');
      expect(updateUserById).toHaveBeenCalledWith(USER_ID, { password: 'new-password-123' });
      // Only the non-current session is revoked server-side.
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions/sid-other'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('rejects with 400 when the current password is wrong', async () => {
      const publicClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      };
      const adminClient = {
        auth: { admin: { signOut: jest.fn(), updateUserById: jest.fn() } },
      };
      const service = createService(adminClient, publicClient);

      await expect(
        service.changePassword(
          { id: USER_ID, email: 'user@example.com' },
          { currentPassword: 'wrong', newPassword: 'new-password-123' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('hashRefreshToken', () => {
    it('produces the sha256 hex of the token', () => {
      expect(hashRefreshToken('token-abc')).toBe(
        createHash('sha256').update('token-abc').digest('hex'),
      );
      expect(hashRefreshToken('token-abc')).not.toBe('token-abc');
    });
  });
});
