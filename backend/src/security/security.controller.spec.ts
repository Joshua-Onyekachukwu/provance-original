import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { ApiThrottlerGuard } from '../common/guards/api-throttler.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = { id: 'security-user-1', email: 'user@provance.test' };
const CURRENT_SID = 'sid-current';

// The guard derives `sid` from the access-token JWT payload (decodeJwtPayloadSid
// reads the base64url payload, no signature verification), so a well-formed
// fake token carrying the sid claim marks the current session — exactly like
// the e2e suite's sign-in ledger path.
function makeAccessToken(sid: string) {
  const payload = Buffer.from(
    JSON.stringify({ sid, sub: USER.id, email: USER.email }),
  ).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${payload}.fake-signature`;
}

function createConfigServiceMock() {
  const values: Record<string, unknown> = {
    // Needed by revokeLedgerRow → revokeAuthSessionViaAdmin (GoTrue admin
    // DELETE endpoint construction); global.fetch is stubbed per test.
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  };
  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createNotificationsServiceMock() {
  return { create: jest.fn().mockResolvedValue({ ok: true }) };
}

// ---------------------------------------------------------------------------
// Stateful in-memory Supabase mock (the security e2e convention)
//
// The security module spans reads + a delete + an audit insert, so the mock
// stores rows in memory and serves them back as the flow mutates them:
//   - from(table).select(...).eq(...).maybeSingle() → matching row (or null)
//   - directly-awaited chains (lists, delete, insert) → resolve + mutate
//   - order() sorts list results like supabase-js
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

type ResolvedResult = {
  data?: unknown;
  count?: number;
  error?: unknown;
};

function createStatefulSecurityClient() {
  const sessions = new Map<string, Row>();
  const auditEvents = new Map<string, Row>();
  const settings = new Map<string, Row>();
  const profiles = new Map<string, Row>();
  let seq = 0;

  const tableMap = (table: string): Map<string, Row> | null => {
    if (table === 'user_sessions') return sessions;
    if (table === 'auth_audit_events') return auditEvents;
    if (table === 'user_security_settings') return settings;
    if (table === 'profiles') return profiles;
    return null;
  };

  const matches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([column, value]) => row[column] === value);

  /**
   * Each top-level `.from(table)` call must start a FRESH chain with its own
   * state — the real supabase-js semantics. getSettings runs listSessions +
   * loadSecurityControls under Promise.all, so a single shared state object
   * would let the second query's from/select/eq clobber the first's before it
   * resolves.
   */
  const createChain = (initialTable?: string) => {
    const chainState = {
      table: initialTable ?? '',
      filters: {} as Record<string, unknown>,
      pendingUpdate: null as Row | null,
      pendingInsert: null as Row | null,
      pendingUpsert: null as Row | null,
      pendingDelete: false,
      order: null as { column: string; ascending: boolean } | null,
    };

    const listRows = (): Row[] => {
      const map = tableMap(chainState.table);
      if (!map) return [];
      let rows = [...map.values()].filter((row) =>
        matches(row, chainState.filters),
      );
      if (chainState.order) {
        const { column, ascending } = chainState.order;
        rows = rows.sort((left, right) => {
          const a = String(left[column] ?? '');
          const b = String(right[column] ?? '');
          return ascending ? a.localeCompare(b) : b.localeCompare(a);
        });
      }
      return rows;
    };

    const chain = {
      from: jest.fn((table: string) => createChain(table)),
      select: jest.fn(() => chain),
      eq: jest.fn((column: string, value: unknown) => {
        chainState.filters[column] = value;
        return chain;
      }),
      order: jest.fn((column: string, options?: { ascending?: boolean }) => {
        chainState.order = { column, ascending: options?.ascending ?? true };
        return chain;
      }),
      limit: jest.fn(() => chain),
      insert: jest.fn((payload: Row) => {
        chainState.pendingInsert = payload;
        return chain;
      }),
      upsert: jest.fn((payload: Row) => {
        chainState.pendingUpsert = payload;
        return chain;
      }),
      update: jest.fn((updates: Row) => {
        chainState.pendingUpdate = updates;
        return chain;
      }),
      delete: jest.fn(() => {
        chainState.pendingDelete = true;
        return chain;
      }),
    };

    // Terminal execution shared by the thenable (list) and single() paths.
    const runQuery = (): ResolvedResult => {
      const map = tableMap(chainState.table);

      if (chainState.pendingDelete) {
        for (const row of listRows()) {
          const key = String(row.id ?? row.user_id ?? '');
          if (map?.has(key)) map.delete(key);
        }
        return { data: null, error: null };
      }

      if (chainState.pendingUpsert) {
        const key = String(
          chainState.pendingUpsert.user_id ?? chainState.pendingUpsert.id ?? '',
        );
        if (map && key) map.set(key, { ...chainState.pendingUpsert });
        return { data: null, error: null };
      }

      if (chainState.pendingUpdate) {
        for (const row of listRows()) {
          const key = String(row.id ?? row.user_id ?? '');
          if (map?.has(key)) map.set(key, { ...row, ...chainState.pendingUpdate });
        }
        return { data: null, error: null };
      }

      if (chainState.pendingInsert) {
        const row: Row = {
          ...chainState.pendingInsert,
          id: chainState.pendingInsert.id ?? `row-${++seq}`,
        };
        const key = String(row.id);
        map?.set(key, row);
        return { data: [row], error: null };
      }

      return { data: listRows(), error: null };
    };

    Object.assign(chain, {
      maybeSingle: jest.fn(async () => {
        const row = listRows()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      }),
      single: jest.fn(async () => {
        const result = runQuery();
        const rows = Array.isArray(result.data) ? result.data : [];
        const row = rows[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      }),
      then(resolve: (value: ResolvedResult) => void) {
        resolve(runQuery());
        return undefined;
      },
    });

    return chain;
  };

  const builder = createChain();

  const seed = {
    session(id: string, overrides: Record<string, unknown> = {}) {
      sessions.set(id, {
        id,
        user_id: USER.id,
        auth_session_id: `sid-${id}`,
        device: 'MacBook Pro',
        ip_address: '203.0.113.10',
        location: 'Lagos, NG',
        created_at: '2026-08-01T09:00:00.000Z',
        last_active_at: '2026-08-07T10:00:00.000Z',
        ...overrides,
      });
    },
    settingsRow(overrides: Record<string, unknown> = {}) {
      settings.set(USER.id, {
        user_id: USER.id,
        two_factor_enabled: false,
        session_timeout_minutes: 60,
        notify_on_new_device: false,
        notify_on_password_change: false,
        updated_at: '2026-08-01T09:00:00.000Z',
        ...overrides,
      });
    },
  };

  return {
    client: builder as unknown as NonNullable<
      ReturnType<SupabaseService['getAdminClient']>
    >,
    seed,
    sessions,
    auditEvents,
    settings,
    profiles,
  };
}

// ---------------------------------------------------------------------------
// Minimal HTTP app: real SecurityController + real SecurityService over the
// stateful mock, real SupabaseAuthGuard (sid decoded from the bearer token)
// + ApiThrottlerGuard, and the same ValidationPipe/GlobalExceptionFilter
// wiring as main.ts.
// ---------------------------------------------------------------------------

async function createTestApp() {
  const mocked = createStatefulSecurityClient();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [SecurityController],
    imports: [
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ],
    providers: [
      SecurityService,
      { provide: ConfigService, useValue: createConfigServiceMock() },
      {
        provide: NotificationsService,
        useValue: createNotificationsServiceMock(),
      },
      {
        provide: SupabaseService,
        useValue: {
          getAdminClient: jest.fn(() => mocked.client),
          // The REAL SupabaseAuthGuard calls createPublicClient(token).auth
          // .getUser(); the sid claim is decoded from the token string, so a
          // well-formed fake token carries the current-session id.
          createPublicClient: jest.fn((token: string | null) => ({
            auth: {
              getUser: jest.fn(async () =>
                !token || token === 'invalid-token'
                  ? { data: { user: null }, error: { message: 'Invalid session.' } }
                  : { data: { user: { id: USER.id, email: USER.email } }, error: null },
              ),
            },
          })),
        },
      },
      { provide: APP_GUARD, useClass: ApiThrottlerGuard },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const service = moduleFixture.get(SecurityService);
  return { app, service, ...mocked };
}

describe('SecurityController (HTTP layer)', () => {
  let app: INestApplication;
  let server: App;
  let service: SecurityService;
  let seed: ReturnType<typeof createStatefulSecurityClient>['seed'];
  let sessions: Map<string, Row>;
  let auditEvents: Map<string, Row>;
  const originalFetch = global.fetch;
  const AUTH = { Authorization: `Bearer ${makeAccessToken(CURRENT_SID)}` };

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
    server = app.getHttpServer() as unknown as App;
    service = setup.service;
    seed = setup.seed;
    sessions = setup.sessions;
    auditEvents = setup.auditEvents;
  });

  afterEach(async () => {
    await app.close();
    global.fetch = originalFetch;
  });

  // ── Route order ──────────────────────────────────────────────────────────

  it('declares settings → sessions → sessions/:id → settings → password with the right verbs', () => {
    const methods = Object.getOwnPropertyNames(
      SecurityController.prototype,
    ).filter((name) => name !== 'constructor');

    expect(methods).toEqual([
      'getSettings',
      'listSessions',
      'revokeSession',
      'updateSetting',
      'changePassword',
    ]);

    const paths = methods.map((method) =>
      Reflect.getMetadata(PATH_METADATA, SecurityController.prototype[method]),
    );
    const verbs = methods.map((method) =>
      Reflect.getMetadata(METHOD_METADATA, SecurityController.prototype[method]),
    );

    expect(paths).toEqual([
      'settings',
      'sessions',
      'sessions/:sessionId',
      'settings',
      'password',
    ]);
    expect(verbs).toEqual([
      RequestMethod.GET,
      RequestMethod.GET,
      RequestMethod.DELETE,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
    ]);
  });

  // ── GET /security/sessions ───────────────────────────────────────────────

  it('lists sessions newest-first with isCurrent from the token sid', async () => {
    seed.session('s-1', { auth_session_id: 'sid-other', last_active_at: '2026-08-07T10:00:00.000Z' });
    seed.session('s-2', { auth_session_id: CURRENT_SID, last_active_at: '2026-08-08T09:00:00.000Z' });

    const res = await request(server).get('/v1/security/sessions').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Newest last_active_at first; only the sid-matching row is current.
    expect(res.body[0]).toMatchObject({
      id: 's-2',
      device: 'MacBook Pro',
      ipAddress: '203.0.113.10',
      location: 'Lagos, NG',
      isCurrent: true,
    });
    expect(res.body[1]).toMatchObject({ id: 's-1', isCurrent: false });
  });

  it('returns an empty list when the ledger is empty', async () => {
    const res = await request(server).get('/v1/security/sessions').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ── DELETE /security/sessions/:sessionId ─────────────────────────────────

  it('revokes another session server-side, drops the ledger row, and audits it', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;
    seed.session('s-1', { auth_session_id: 'sid-other' });

    const res = await request(server)
      .delete('/v1/security/sessions/s-1')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, sessionId: 's-1' });

    // The GoTrue admin revocation hit the right endpoint for this user's
    // auth session (the actual auth-session id, not the ledger row id).
    expect(fetchMock).toHaveBeenCalledWith(
      `https://example.supabase.co/auth/v1/admin/users/${USER.id}/sessions/sid-other`,
      expect.objectContaining({ method: 'DELETE' }),
    );

    expect(sessions.has('s-1')).toBe(false);
    const audit = [...auditEvents.values()].find(
      (row) => row.action === 'session_revoked',
    );
    expect(audit).toMatchObject({
      actor_email: USER.email,
      action: 'session_revoked',
      entity_type: 'auth_session',
      entity_id: 's-1',
    });
  });

  it('rejects with 400 when revoking the current session', async () => {
    seed.session('s-current', { auth_session_id: CURRENT_SID });

    const res = await request(server)
      .delete('/v1/security/sessions/s-current')
      .set(AUTH);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('You cannot revoke the current session.');
    expect(sessions.has('s-current')).toBe(true);
  });

  it('rejects with 404 for an unknown session id', async () => {
    const res = await request(server)
      .delete('/v1/security/sessions/s-missing')
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Session not found.');
  });

  it('rejects with 503 when the GoTrue revocation call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    seed.session('s-1', { auth_session_id: 'sid-other' });

    const res = await request(server)
      .delete('/v1/security/sessions/s-1')
      .set(AUTH);

    expect(res.status).toBe(503);
    expect(res.body.message).toContain('Session revocation failed.');
    expect(sessions.has('s-1')).toBe(true);
  });

  // ── GET /security/settings ───────────────────────────────────────────────

  it('returns password policy, the session ledger, and persisted controls', async () => {
    seed.session('s-1', { auth_session_id: 'sid-other' });
    seed.settingsRow({
      two_factor_enabled: true,
      session_timeout_minutes: 30,
      notify_on_new_device: true,
      notify_on_password_change: false,
    });

    const res = await request(server).get('/v1/security/settings').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.passwordPolicy).toEqual({
      minLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSymbol: true,
    });
    expect(res.body.activeSessions).toHaveLength(1);
    expect(res.body.activeSessions[0]).toMatchObject({
      id: 's-1',
      isCurrent: false,
    });
    expect(res.body.signInControls).toMatchObject({
      twoFactorAuth: { enabled: true, method: 'app' },
      sessionTimeoutMinutes: 30,
      notifyOnNewDevice: true,
      notifyOnPasswordChange: false,
    });
  });

  it('falls back to defaults when no settings row exists', async () => {
    const res = await request(server).get('/v1/security/settings').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.activeSessions).toEqual([]);
    expect(res.body.signInControls).toMatchObject({
      twoFactorAuth: { enabled: false, method: null },
      sessionTimeoutMinutes: 60,
      notifyOnNewDevice: false,
      notifyOnPasswordChange: false,
    });
  });

  // ── PATCH /security/settings ─────────────────────────────────────────────

  it('persists a flag toggle and audits it', async () => {
    seed.settingsRow();

    const res = await request(server)
      .patch('/v1/security/settings')
      .set(AUTH)
      .send({ key: 'notifyOnNewDevice', value: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, key: 'notifyOnNewDevice', value: true });

    const audit = [...auditEvents.values()].find(
      (row) => row.action === 'security_setting_updated',
    );
    expect(audit).toMatchObject({
      actor_email: USER.email,
      action: 'security_setting_updated',
    });
  });

  it('accepts an unknown setting key as a no-op (value validation only — the service does not reject unknown keys)', async () => {
    // Locking the ACTUAL production contract: updateSetting validates the
    // VALUE shape per known key but does not reject unknown keys — they fall
    // through with controls unchanged and still return ok. (Candidate follow-up:
    // reject unknown keys with 400 so client typos surface.)
    seed.settingsRow();

    const res = await request(server)
      .patch('/v1/security/settings')
      .set(AUTH)
      .send({ key: 'hackerKey', value: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, key: 'hackerKey', value: true });

    // Controls unchanged — read back through the real service path.
    const readback = await request(server)
      .get('/v1/security/settings')
      .set(AUTH);
    expect(readback.body.signInControls.notifyOnNewDevice).toBe(false);
  });

  // ── Guard presence (real SupabaseAuthGuard) ──────────────────────────────

  it('401s without an Authorization header', async () => {
    const res = await request(server).get('/v1/security/sessions');

    expect(res.status).toBe(401);
  });

  it('401s when the bearer token is invalid (getUser fails)', async () => {
    const res = await request(server)
      .get('/v1/security/sessions')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  // ── Throttle presence (30 / 60s @Throttle on the controller) ─────────────

  it('429s past the controller throttle (30 requests per 60s)', async () => {
    const listSpy = jest.spyOn(service, 'listSessions');
    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await request(server)
        .get('/v1/security/sessions')
        .set(AUTH);
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
    // The first 30 were allowed through to the real service.
    expect(listSpy).toHaveBeenCalledTimes(30);
    listSpy.mockRestore();
  });
});
