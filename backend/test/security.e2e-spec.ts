// ---------------------------------------------------------------------------
// Env pinning (must run BEFORE the AppModule import below)
//
// ConfigModule.forRoot reads the env when app.module.ts is first imported,
// and a real backend/.env.local can exist on a dev machine. Pin the SUPABASE
// trio to fake values before the first import (CommonJS emit preserves
// statement order) so this suite stays hermetic regardless of dotenv state.
// ---------------------------------------------------------------------------
const SUPABASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};
Object.assign(process.env, SUPABASE_ENV);

import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { QueueService } from '../src/queue/queue.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { AppModule } from '../src/app.module';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// The guard override pins the identity; `sid` is what marks the current
// session (the controller passes user.sid through to listSessions/revoke).
const USER = {
  id: 'e2e-user-0000-0000-0000-000000000001',
  email: 'user@provance.test',
  sid: 'sid-current',
};

// The revoke path calls the GoTrue admin API, which needs the Supabase trio
// configured — the tests also stub global.fetch so no real network call ever
// happens. The env-validation rule is that the three must be set together and
// SUPABASE_URL must parse as a URL.

type Row = Record<string, unknown>;

/**
 * Fake access token for the sign-in path. decodeJwtPayloadSid only splits
 * the token and reads the `sid` claim from the base64url payload — no
 * signature verification — so a well-formed fake with the right payload is
 * all the sign-in ledger path needs.
 */
function makeAccessToken(sid: string) {
  const payload = Buffer.from(
    JSON.stringify({ sid, sub: USER.id, email: USER.email }),
  ).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${payload}.fake-signature`;
}

// ---------------------------------------------------------------------------
// Stateful in-memory Supabase mock (the organization.e2e-spec.ts convention)
//
// The security module spans reads + a delete + an audit insert, so the mock
// stores rows in memory and serves them back as the flow mutates them:
//
//   - from(table).select(...).eq(...).maybeSingle() → matching row (or null)
//   - directly-awaited chains (lists, delete, insert) → resolve + mutate
//   - order() sorts list results like supabase-js
// ---------------------------------------------------------------------------

type ResolvedResult = {
  data?: unknown;
  count?: number;
  error?: unknown;
};

function createStatefulSecurityClient() {
  const sessions = new Map<string, Row>();
  const auditEvents = new Map<string, Row>();
  const adminAuditLogs = new Map<string, Row>();
  const settings = new Map<string, Row>();
  const profiles = new Map<string, Row>();
  let seq = 0;

  const state = {
    table: '',
    filters: {} as Record<string, unknown>,
    pendingUpdate: null as Row | null,
    pendingInsert: null as Row | null,
    pendingUpsert: null as Row | null,
    pendingDelete: false,
    order: null as { column: string; ascending: boolean } | null,
  };

  const tableMap = (table: string): Map<string, Row> | null => {
    if (table === 'user_sessions') return sessions;
    if (table === 'auth_audit_events') return auditEvents;
    if (table === 'audit_logs') return adminAuditLogs;
    if (table === 'user_security_settings') return settings;
    if (table === 'profiles') return profiles;
    return null;
  };

  const matches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([column, value]) => row[column] === value);

  /**
   * Each top-level `.from(table)` call must start a FRESH chain with its own
   * state — the real supabase-js semantics. This matters because getSettings
   * runs listSessions + loadSecurityControls under Promise.all: the two
   * queries are interleaved on the same tick, and a single shared state
   * object would let the second query's from/select/eq clobber the first's
   * before it resolves (the settings row leaking into the sessions list).
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
      // Top-level from(): spawn a brand-new chain primed with the table, so
      // concurrent queries never share mutable state. (Chained methods below
      // mutate only this chain's own state.)
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
      // updateSetting uses upsert({...}, { onConflict: 'user_id' }) — store or
      // replace the row keyed by user_id (settings rows carry no id column).
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

    // Terminal execution shared by the thenable (list) and single() paths
    // — applies the pending mutation to the backing map and returns the
    // resolved result. Must stay a closure over this chain's own state.
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

    // The thenable + single() terminal methods are attached after the literal
    // so runQuery is in scope.
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
    client: {
      ...(builder as unknown as Record<string, unknown>),
      // The changePassword flow drives the GoTrue admin surface directly:
      // burn the verification session, then update the user's password.
      auth: {
        admin: {
          signOut: jest.fn(async () => ({ data: null, error: null })),
          updateUserById: jest.fn(async () => ({ data: null, error: null })),
        },
      },
    } as unknown as NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    seed,
    sessions,
    auditEvents,
    adminAuditLogs,
    settings,
    profiles,
  };
}

// ---------------------------------------------------------------------------
// Env hygiene
//
// A real backend/.env.local can exist on a dev machine; the e2e must stay
// hermetic, so the SUPABASE trio is pinned (empty by default, fake for the
// revoke happy path) so dotenv never leaks real credentials into these tests.
// ---------------------------------------------------------------------------

function clearSupabaseEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// ---------------------------------------------------------------------------
// App scaffolding
// ---------------------------------------------------------------------------

async function createTestApp(
  options: { overrideGuard?: boolean; publicClient?: unknown } = {},
) {
  const { overrideGuard = true, publicClient = null } = options;
  const mocked = createStatefulSecurityClient();

  const builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue({
      getAdminClient: jest.fn(() => mocked.client),
      createPublicClient: jest.fn(() => publicClient),
    })
    .overrideProvider(QueueService)
    .useValue({
      // No Redis in tests — the scans module must not attempt a real queue.
      isConfigured: jest.fn(() => false),
      enqueueScanProcessing: jest.fn(),
    });

  if (overrideGuard) {
    builder.overrideGuard(SupabaseAuthGuard).useValue({
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        request.user = { ...USER };
        return true;
      },
    });
  }

  const moduleFixture: TestingModule = await builder.compile();

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

  return { app, ...mocked };
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('Security flow (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let seed: ReturnType<typeof createStatefulSecurityClient>['seed'];
  let sessions: Map<string, Row>;
  let auditEvents: Map<string, Row>;
  let adminAuditLogs: Map<string, Row>;
  let settings: Map<string, Row>;
  const extraApps: INestApplication[] = [];
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
    http = request(app.getHttpServer());
    seed = setup.seed;
    sessions = setup.sessions;
    auditEvents = setup.auditEvents;
    adminAuditLogs = setup.adminAuditLogs;
    settings = setup.settings;
  });

  afterEach(async () => {
    await app.close();
    for (const extra of extraApps.splice(0)) {
      await extra.close();
    }
    global.fetch = originalFetch;
    clearSupabaseEnv();
  });

  describe('GET /v1/security/sessions', () => {
    it('lists the user sessions newest-first with isCurrent from the sid', async () => {
      seed.session('s-1', {
        auth_session_id: 'sid-other',
        device: 'MacBook Pro',
        location: 'Lagos, NG',
        ip_address: '203.0.113.10',
        last_active_at: '2026-08-07T10:00:00.000Z',
      });
      seed.session('s-2', {
        auth_session_id: USER.sid,
        device: 'Pixel 9',
        location: 'Accra, GH',
        ip_address: '198.51.100.20',
        last_active_at: '2026-08-08T09:00:00.000Z',
      });

      const response = await http.get('/v1/security/sessions').expect(200);

      expect(response.body).toHaveLength(2);
      // Newest last_active_at first, and only the sid-matching row is current.
      expect(response.body[0]).toMatchObject({
        id: 's-2',
        device: 'Pixel 9',
        location: 'Accra, GH',
        ipAddress: '198.51.100.20',
        lastActiveAt: '2026-08-08T09:00:00.000Z',
        isCurrent: true,
      });
      expect(response.body[1]).toMatchObject({
        id: 's-1',
        isCurrent: false,
      });
    });

    it('returns an empty list when the ledger is empty', async () => {
      const response = await http.get('/v1/security/sessions').expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('DELETE /v1/security/sessions/:sessionId', () => {
    it('revokes another session server-side, drops the ledger row, and audits it', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock;
      seed.session('s-1', { auth_session_id: 'sid-other' });

      const response = await http.delete('/v1/security/sessions/s-1').expect(200);

      expect(response.body).toEqual({ ok: true, sessionId: 's-1' });

      // The GoTrue admin revocation hit the right endpoint for this user's
      // auth session (the actual auth-session id, not the ledger row id).
      expect(fetchMock).toHaveBeenCalledWith(
        `https://example.supabase.co/auth/v1/admin/users/${USER.id}/sessions/sid-other`,
        expect.objectContaining({ method: 'DELETE' }),
      );

      // The ledger row is gone and the trail records the revocation.
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

      // The ADMIN trail (audit_logs) reflects the revocation too — the
      // dotted high-severity row the Admin Audit Logs page reads.
      const adminAudit = [...adminAuditLogs.values()].find(
        (row) => row.action === 'session.revoked',
      );
      expect(adminAudit).toMatchObject({
        actor_email: USER.email,
        action: 'session.revoked',
        severity: 'high',
        entity_type: 'auth_session',
        entity_id: 's-1',
      });
    });

    it('rejects with 400 when revoking the current session', async () => {
      seed.session('s-current', { auth_session_id: USER.sid });

      const response = await http
        .delete('/v1/security/sessions/s-current')
        .expect(400);

      expect(response.body.message).toContain(
        'You cannot revoke the current session.',
      );
      expect(sessions.has('s-current')).toBe(true);
    });

    it('rejects with 404 for an unknown session id', async () => {
      const response = await http
        .delete('/v1/security/sessions/s-missing')
        .expect(404);

      expect(response.body.message).toContain('Session not found.');
    });

    it('rejects with 503 when the GoTrue revocation call fails', async () => {
      // Network failure → the revoke aborts before touching the ledger.
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      seed.session('s-1', { auth_session_id: 'sid-other' });

      const response = await http.delete('/v1/security/sessions/s-1').expect(503);

      expect(response.body.message).toContain('Session revocation failed.');
      expect(sessions.has('s-1')).toBe(true);
    });
  });

  describe('GET /v1/security/settings', () => {
    it('returns password policy, the session ledger, and persisted controls', async () => {
      seed.session('s-1', { auth_session_id: 'sid-other' });
      seed.settingsRow({
        two_factor_enabled: true,
        session_timeout_minutes: 30,
        notify_on_new_device: true,
        notify_on_password_change: false,
      });

      const response = await http.get('/v1/security/settings').expect(200);

      expect(response.body.passwordPolicy).toEqual({
        minLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
      });
      expect(response.body.activeSessions).toHaveLength(1);
      expect(response.body.activeSessions[0]).toMatchObject({
        id: 's-1',
        isCurrent: false,
      });
      expect(response.body.signInControls).toMatchObject({
        twoFactorAuth: { enabled: true, method: 'app' },
        sessionTimeoutMinutes: 30,
        notifyOnNewDevice: true,
        notifyOnPasswordChange: false,
      });
    });

    it('falls back to defaults when no settings row exists', async () => {
      const response = await http.get('/v1/security/settings').expect(200);

      expect(response.body.activeSessions).toEqual([]);
      expect(response.body.signInControls).toMatchObject({
        twoFactorAuth: { enabled: false, method: null },
        sessionTimeoutMinutes: 60,
        notifyOnNewDevice: false,
        notifyOnPasswordChange: false,
      });
    });
  });

  describe('PATCH /v1/security/settings', () => {
    it('persists a flag toggle and audits it', async () => {
      seed.settingsRow();

      const response = await http
        .patch('/v1/security/settings')
        .send({ key: 'notifyOnNewDevice', value: true })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        key: 'notifyOnNewDevice',
        value: true,
      });

      // The row is persisted and a follow-up GET reflects the new control.
      expect(settings.get(USER.id)).toMatchObject({
        user_id: USER.id,
        notify_on_new_device: true,
      });
      const readback = await http.get('/v1/security/settings').expect(200);
      expect(readback.body.signInControls.notifyOnNewDevice).toBe(true);

      const audit = [...auditEvents.values()].find(
        (row) => row.action === 'security_setting_updated',
      );
      expect(audit).toMatchObject({
        actor_email: USER.email,
        action: 'security_setting_updated',
        entity_type: 'auth_user',
        entity_id: USER.id,
        details: { key: 'notifyOnNewDevice' },
      });
    });

    it('writes the twoFactorAuth object shape and maps it back to enabled + app method', async () => {
      seed.settingsRow();

      await http
        .patch('/v1/security/settings')
        .send({ key: 'twoFactorAuth', value: { enabled: true } })
        .expect(200);

      expect(settings.get(USER.id)).toMatchObject({ two_factor_enabled: true });
      const readback = await http.get('/v1/security/settings').expect(200);
      expect(readback.body.signInControls.twoFactorAuth).toEqual({
        enabled: true,
        method: 'app',
        // loadSecurityControls reads the persisted flag but not the updatedAt
        // column — null is the service's current contract, not a test gap.
        updatedAt: null,
      });
    });

    it('rejects a non-positive session timeout with 400', async () => {
      const response = await http
        .patch('/v1/security/settings')
        .send({ key: 'sessionTimeoutMinutes', value: 0 })
        .expect(400);

      expect(response.body.message).toContain(
        'Session timeout must be a positive number of minutes.',
      );
    });
  });

  describe('PATCH /v1/security/password — revoke-everything-else flow', () => {
    const publicClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { session: { refresh_token: 'burn-me-refresh' } },
          error: null,
        }),
      },
    };

    it('verifies the current password, updates it, revokes every other session, and audits', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock;

      const passwordApp = await createTestApp({ publicClient });
      const passwordHttp = request(passwordApp.app.getHttpServer());
      extraApps.push(passwordApp.app);

      // Current session + two others — only the others must be revoked. Seeded
      // on the password app's own mock (its client is a fresh stateful store).
      passwordApp.seed.session('s-current', { auth_session_id: USER.sid });
      passwordApp.seed.session('s-other-1', { auth_session_id: 'sid-other-1' });
      passwordApp.seed.session('s-other-2', {
        auth_session_id: 'sid-other-2',
        device: 'Pixel 9',
      });

      const response = await passwordHttp
        .patch('/v1/security/password')
        .send({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' })
        .expect(200);

      expect(response.body).toEqual({ ok: true });

      // 1. Current password verified with the real email.
      expect(publicClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: USER.email,
        password: 'OldPass123!',
      });

      // 2. The verification session was burned and the password updated via
      //    the GoTrue admin surface.
      expect(
        (passwordApp.client.auth.admin.signOut as jest.Mock),
      ).toHaveBeenCalledWith('burn-me-refresh');
      expect(
        (passwordApp.client.auth.admin.updateUserById as jest.Mock),
      ).toHaveBeenCalledWith(USER.id, { password: 'NewPass456!' });

      // 3. Every OTHER session was revoked through the GoTrue admin API — the
      //    current session is untouched.
      const revokedUrls = fetchMock.mock.calls.map(([url]) => url);
      expect(revokedUrls).toHaveLength(2);
      expect(revokedUrls).toContain(
        `https://example.supabase.co/auth/v1/admin/users/${USER.id}/sessions/sid-other-1`,
      );
      expect(revokedUrls).toContain(
        `https://example.supabase.co/auth/v1/admin/users/${USER.id}/sessions/sid-other-2`,
      );
      expect(revokedUrls).not.toContain(
        `https://example.supabase.co/auth/v1/admin/users/${USER.id}/sessions/${USER.sid}`,
      );

      // 4. Ledger: others dropped, current stays; the change is audited.
      expect(passwordApp.sessions.has('s-other-1')).toBe(false);
      expect(passwordApp.sessions.has('s-other-2')).toBe(false);
      expect(passwordApp.sessions.has('s-current')).toBe(true);
      const audit = [...passwordApp.auditEvents.values()].find(
        (row) => row.action === 'password_changed',
      );
      expect(audit).toMatchObject({
        actor_email: USER.email,
        action: 'password_changed',
        entity_type: 'auth_user',
        entity_id: USER.id,
      });
    });

    it('rejects with 400 when the current password is wrong and revokes nothing', async () => {
      global.fetch = jest.fn();

      const failingPublicClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      };
      const passwordApp = await createTestApp({
        publicClient: failingPublicClient,
      });
      const passwordHttp = request(passwordApp.app.getHttpServer());
      extraApps.push(passwordApp.app);
      passwordApp.seed.session('s-current', { auth_session_id: USER.sid });
      passwordApp.seed.session('s-other-1', { auth_session_id: 'sid-other-1' });

      const response = await passwordHttp
        .patch('/v1/security/password')
        .send({ currentPassword: 'WrongPass!', newPassword: 'NewPass456!' })
        .expect(400);

      expect(response.body.message).toContain('Current password is incorrect.');
      // No password update, no revocation, no audit.
      expect(
        (passwordApp.client.auth.admin.updateUserById as jest.Mock),
      ).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(passwordApp.sessions.has('s-other-1')).toBe(true);
      expect(
        [...passwordApp.auditEvents.values()].some(
          (r) => r.action === 'password_changed',
        ),
      ).toBe(false);
    });

    it('rejects a too-short new password at the DTO layer (400)', async () => {
      const response = await http
        .patch('/v1/security/password')
        .send({ currentPassword: 'OldPass123!', newPassword: 'short' })
        .expect(400);

      expect(response.body.message).toContain(
        'New password must be at least 8 characters.',
      );
    });
  });

  describe('session-ledger round-trip — sign in → list → revoke', () => {
    const signInPublicClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: makeAccessToken(USER.sid),
              refresh_token: 'refresh-fresh-123',
              expires_at: 1893456000,
              token_type: 'bearer',
            },
            user: { id: USER.id, email: USER.email },
          },
          error: null,
        }),
      },
    };

    it('records a ledger row on sign-in, lists it as isCurrent, and leaves the old session revocable', async () => {
      // The revoke leg drives the GoTrue admin API via global.fetch (the
      // same stub the standalone DELETE tests use) — sign-in itself uses the
      // mocked public client, not fetch.
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const roundTripApp = await createTestApp({
        publicClient: signInPublicClient,
      });
      const roundTripHttp = request(roundTripApp.app.getHttpServer());
      extraApps.push(roundTripApp.app);

      // A pre-existing session on another device — the one the user is NOT
      // currently signing in from.
      roundTripApp.seed.session('s-old', {
        auth_session_id: 'sid-old',
        device: 'Firefox on macOS',
      });

      // 1. Sign in — the fresh session is ledgered (cookie mode strips the
      //    refresh token from the body).
      const signIn = await roundTripHttp
        .post('/v1/auth/sign-in')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36')
        .send({ email: USER.email, password: 'Pass123!' })
        .expect(200);

      expect(signIn.body.status).toBe('authenticated');
      expect(signIn.body.user.id).toBe(USER.id);
      expect(signIn.body.session.accessToken).toBeTruthy();
      expect(signIn.body.session.refreshToken).toBeUndefined();

      // The ledger now holds the fresh row (keyed by the decoded sid claim)
      // with the device derived from the User-Agent.
      const freshRow = [...roundTripApp.sessions.values()].find(
        (row) => row.auth_session_id === USER.sid,
      );
      expect(freshRow).toMatchObject({
        user_id: USER.id,
        auth_session_id: USER.sid,
        device: 'Chrome on Windows',
      });
      expect(typeof freshRow.refresh_token_hash).toBe('string');
      expect(freshRow.refresh_token_hash.length).toBeGreaterThanOrEqual(32);

      // 2. List sessions — the fresh session is current, the old one is not.
      const list = await roundTripHttp.get('/v1/security/sessions').expect(200);
      expect(list.body).toHaveLength(2);

      const fresh = list.body.find(
        (session: Record<string, unknown>) => session.isCurrent === true,
      );
      const old = list.body.find(
        (session: Record<string, unknown>) => session.id === 's-old',
      );
      expect(fresh).toMatchObject({
        device: 'Chrome on Windows',
        isCurrent: true,
      });
      expect(old).toMatchObject({
        id: 's-old',
        device: 'Firefox on macOS',
        isCurrent: false,
      });

      // 3. The old session is revocable — deleting it leaves the fresh one
      //    signed in and still current.
      const revoke = await roundTripHttp
        .delete('/v1/security/sessions/s-old')
        .expect(200);
      expect(revoke.body).toEqual({ ok: true, sessionId: 's-old' });

      const after = await roundTripHttp.get('/v1/security/sessions').expect(200);
      expect(after.body).toHaveLength(1);
      expect(after.body[0]).toMatchObject({
        device: 'Chrome on Windows',
        isCurrent: true,
      });
      expect(roundTripApp.sessions.has('s-old')).toBe(false);
    });
  });

  describe('controller wiring — guard and throttle', () => {
    it('requires SupabaseAuthGuard (401 without an Authorization header)', async () => {
      const unguarded = await createTestApp({ overrideGuard: false });
      extraApps.push(unguarded.app);

      const response = await request(unguarded.app.getHttpServer())
        .get('/v1/security/sessions')
        .expect(401);

      expect(response.body.message).toContain('Missing Authorization header.');
    });

    it('enforces the controller throttle (429 past 30 requests in 60s)', async () => {
      let lastStatus = 0;
      for (let i = 0; i < 31; i += 1) {
        const response = await http.get('/v1/security/sessions');
        lastStatus = response.status;
      }

      expect(lastStatus).toBe(429);
    });
  });
});
