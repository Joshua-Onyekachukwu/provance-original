// ---------------------------------------------------------------------------
// auth.e2e-spec.ts — the httpOnly refresh-cookie session lifecycle at the HTTP
// layer: sign-in sets the cookie + strips the body token, refresh reads the
// cookie and ROTATES it, and the rotated-out token no longer works (the
// replay signature of token theft) — all through the real module graph
// (real AuthService, real guards, real pipes/filters) with a mocked Supabase
// service, following the security.e2e-spec.ts convention.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Env pinning (must run BEFORE the AppModule import below)
//
// ConfigModule.forRoot reads the env when app.module.ts is first imported,
// and a real backend/.env.local can exist on a dev machine. Pin the SUPABASE
// trio AND the cookie options to fake values before the first import
// (CommonJS emit preserves statement order) so this suite stays hermetic and
// the plain cookie name (AUTH_COOKIE_SECURE=false) is what the tests assert.
// ---------------------------------------------------------------------------
Object.assign(process.env, {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  AUTH_COOKIE_ENABLED: 'true',
  AUTH_COOKIE_SAME_SITE: 'lax',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_MAX_AGE_DAYS: '30',
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { MigrationHealthService } from '../src/health/migration-health.service';
import { QueueService } from '../src/queue/queue.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { AppModule } from '../src/app.module';
import {
  HOST_PREFIXED_REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../src/auth/cookie-session.util';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = {
  id: 'e2e-user-0000-0000-0000-000000000001',
  email: 'user@provance.test',
};

const PASSWORD = 'password123';

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 2_592_000

type Row = Record<string, unknown>;

/**
 * Rotation-aware public auth client. Mirrors GoTrue rotation semantics:
 * signInWithPassword issues token #1; every refreshSession CONSUMES the
 * presented token and issues the next one; replaying a consumed token is
 * rejected with the "Already Used" error the real provider returns for a
 * replayed rotated token (the theft signature the backend flags).
 */
function createRotationAuthClient() {
  const issued = new Map<string, 'valid' | 'consumed'>();
  let seq = 1;

  const issue = () => {
    const n = seq++;
    return {
      access_token: `access-token-${String(n).padStart(4, '0')}`,
      refresh_token: `refresh-token-${String(n).padStart(6, '0')}`,
      expires_at: 1_800_000_000 + n,
      token_type: 'bearer',
    };
  };

  const first = issue();
  issued.set(first.refresh_token, 'valid');

  return {
    auth: {
      signInWithPassword: jest.fn(async () => ({
        data: { user: { id: USER.id, email: USER.email }, session: first },
        error: null,
      })),
      refreshSession: jest.fn(async (input: { refresh_token: string }) => {
        if (issued.get(input.refresh_token) !== 'valid') {
          return {
            data: null,
            error: { message: 'Invalid Refresh Token: Already Used', status: 400 },
          };
        }
        issued.set(input.refresh_token, 'consumed');
        const next = issue();
        issued.set(next.refresh_token, 'valid');
        return {
          data: { user: { id: USER.id, email: USER.email }, session: next },
          error: null,
        };
      }),
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Stateful in-memory Supabase admin client (the security.e2e-spec.ts
// convention) — tables the auth flow touches: profiles (ensureProfile),
// user_sessions (ledger), auth_audit_events (sign-in/refresh trail),
// audit_logs (refresh-token rejection trail).
// ---------------------------------------------------------------------------

type ResolvedResult = {
  data?: unknown;
  count?: number;
  error?: unknown;
};

function createStatefulAdminClient() {
  const profiles = new Map<string, Row>();
  const sessions = new Map<string, Row>();
  const auditEvents = new Map<string, Row>();
  const auditLogs = new Map<string, Row>();
  let seq = 0;

  const tableMap = (table: string): Map<string, Row> | null => {
    if (table === 'profiles') return profiles;
    if (table === 'user_sessions') return sessions;
    if (table === 'auth_audit_events') return auditEvents;
    if (table === 'audit_logs') return auditLogs;
    return null;
  };

  const matches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([column, value]) => row[column] === value);

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

  return {
    client: createChain(),
    profiles,
    sessions,
    auditEvents,
    auditLogs,
  };
}

function clearSupabaseEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.AUTH_COOKIE_ENABLED;
  delete process.env.AUTH_COOKIE_SAME_SITE;
  delete process.env.AUTH_COOKIE_SECURE;
  delete process.env.AUTH_COOKIE_MAX_AGE_DAYS;
}

// ---------------------------------------------------------------------------
// App scaffolding — real AppModule, mocked SupabaseService/QueueService
// (MigrationHealthService stubbed so boot never probes the live DB).
// ---------------------------------------------------------------------------

async function createTestApp() {
  const admin = createStatefulAdminClient();
  const publicClient = createRotationAuthClient();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue({
      getAdminClient: jest.fn(() => admin.client),
      createPublicClient: jest.fn(() => publicClient),
    })
    .overrideProvider(QueueService)
    .useValue({
      // No Redis in tests — the scans module must not attempt a real queue.
      isConfigured: jest.fn(() => false),
      enqueueScanProcessing: jest.fn(),
    })
    .overrideProvider(MigrationHealthService)
    .useValue({ check: jest.fn() })
    .compile();

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

  return { app, admin, publicClient };
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('Auth cookie session lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let admin: ReturnType<typeof createStatefulAdminClient>;
  let publicClient: ReturnType<typeof createRotationAuthClient>;

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
    http = request(app.getHttpServer());
    admin = setup.admin;
    publicClient = setup.publicClient;
  });

  afterEach(async () => {
    await app.close();
    clearSupabaseEnv();
  });

  function cookieHeader(value: string): string[] {
    return [`${REFRESH_COOKIE_NAME}=${value}`];
  }

  describe('POST /v1/auth/sign-in', () => {
    it('sets an httpOnly refresh cookie, strips the body refresh token, and audits the sign-in', async () => {
      const response = await http
        .post('/v1/auth/sign-in')
        .send({ email: USER.email, password: PASSWORD })
        .expect(200);

      // The refresh token crosses the cookie boundary only.
      expect(response.body.status).toBe('authenticated');
      expect(response.body.session).toMatchObject({
        accessToken: 'access-token-0001',
        tokenType: 'bearer',
      });
      expect(response.body.session.refreshToken).toBeUndefined();

      // Cookie flags: httpOnly, scoped, expiring — no refresh token in JS.
      const setCookie = response.headers['set-cookie'] as string[];
      expect(setCookie).toBeDefined();
      const refresh = setCookie.find((entry) =>
        entry.startsWith(`${REFRESH_COOKIE_NAME}=`),
      );
      expect(refresh).toBeDefined();
      expect(refresh).toContain(`${REFRESH_COOKIE_NAME}=refresh-token-000001`);
      expect(refresh).toContain('HttpOnly');
      expect(refresh).toContain('SameSite=Lax');
      expect(refresh).toContain('Path=/');
      expect(refresh).toContain(`Max-Age=${MAX_AGE_SECONDS}`);
      expect(refresh).not.toContain('Secure');

      // The trail records the successful sign-in with the actor attributed.
      const audit = [...admin.auditEvents.values()].find(
        (row) => row.action === 'sign_in_succeeded',
      );
      expect(audit).toMatchObject({
        actor_email: USER.email,
        entity_type: 'auth_user',
        entity_id: USER.id,
      });
    });

    it('rejects invalid credentials with 401 and records sign_in_failed', async () => {
      // Make the mock reject this call — the real provider's error shape.
      publicClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid login credentials', status: 400 },
      });

      await http
        .post('/v1/auth/sign-in')
        .send({ email: USER.email, password: 'wrong-password' })
        .expect(401);

      const audit = [...admin.auditEvents.values()].find(
        (row) => row.action === 'sign_in_failed',
      );
      expect(audit).toMatchObject({
        actor_email: USER.email,
        details: { reason: 'invalid_credentials' },
      });
    });
  });

  describe('POST /v1/auth/refresh (cookie rotation)', () => {
    it('refreshes from the cookie and rotates it to a new value', async () => {
      // Sign in first — establishes refresh-token-000001 in the cookie.
      await http
        .post('/v1/auth/sign-in')
        .send({ email: USER.email, password: PASSWORD })
        .expect(200);

      const response = await http
        .post('/v1/auth/refresh')
        .set('Cookie', cookieHeader('refresh-token-000001'))
        .send({})
        .expect(200);

      expect(response.body.status).toBe('authenticated');
      expect(response.body.session.accessToken).toBe('access-token-0002');
      expect(response.body.session.refreshToken).toBeUndefined();

      // Rotation: the cookie now carries the FRESH token, not the old one.
      const setCookie = response.headers['set-cookie'] as string[];
      const refresh = setCookie.find((entry) =>
        entry.startsWith(`${REFRESH_COOKIE_NAME}=`),
      );
      expect(refresh).toContain(`${REFRESH_COOKIE_NAME}=refresh-token-000002`);
      expect(refresh).toContain('HttpOnly');
    });

    it('rejects a replayed rotated-out cookie (token theft) and audits the rejection', async () => {
      // Sign in (issues #1), refresh once (rotates to #2, consumes #1).
      await http
        .post('/v1/auth/sign-in')
        .send({ email: USER.email, password: PASSWORD })
        .expect(200);
      await http
        .post('/v1/auth/refresh')
        .set('Cookie', cookieHeader('refresh-token-000001'))
        .send({})
        .expect(200);

      // Replaying the OLD cookie must fail — the rotated token is dead.
      const replay = await http
        .post('/v1/auth/refresh')
        .set('Cookie', cookieHeader('refresh-token-000001'))
        .send({})
        .expect(401);
      expect(replay.body.message).toBe('Invalid or expired session.');

      // The rejection lands in the admin trail as a high-severity theft
      // signature, sourced from the cookie (not a body token).
      const rejection = [...admin.auditLogs.values()].find(
        (row) => row.action === 'refresh_token_rejected',
      );
      expect(rejection).toMatchObject({
        actor_email: 'system',
        severity: 'high',
        entity_type: 'auth_session',
        details: expect.objectContaining({
          reuse_suspected: true,
          token_source: 'cookie',
        }),
      });
    });

    it('refreshes from a body token when no cookie is present and promotes it to the cookie', async () => {
      const response = await http
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'refresh-token-000001' })
        .expect(200);

      expect(response.body.status).toBe('authenticated');
      expect(response.body.session.refreshToken).toBeUndefined();

      // Body credential → cookie promotion: the new rotated token lands in
      // the Set-Cookie header.
      const setCookie = response.headers['set-cookie'] as string[];
      const refresh = setCookie.find((entry) =>
        entry.startsWith(`${REFRESH_COOKIE_NAME}=`),
      );
      expect(refresh).toContain(`${REFRESH_COOKIE_NAME}=refresh-token-000002`);
    });

    it('401s when no credential is presented at all', async () => {
      const response = await http
        .post('/v1/auth/refresh')
        .send({})
        .expect(401);
      expect(response.body.message).toBe('No session credential was provided.');
    });
  });

  describe('POST /v1/auth/sign-out', () => {
    it('clears the refresh cookie (plain + __Host-) and burns the token', async () => {
      await http
        .post('/v1/auth/sign-in')
        .send({ email: USER.email, password: PASSWORD })
        .expect(200);

      const response = await http
        .post('/v1/auth/sign-out')
        .set('Cookie', cookieHeader('refresh-token-000001'))
        .send({})
        .expect(200);

      expect(response.body.status).toBe('signed_out');

      // Both cookie names are expired so a stale name-transition cookie dies.
      const setCookie = response.headers['set-cookie'] as string[];
      expect(setCookie.length).toBeGreaterThanOrEqual(2);
      for (const name of [REFRESH_COOKIE_NAME, HOST_PREFIXED_REFRESH_COOKIE_NAME]) {
        const cleared = setCookie.find((entry) => entry.startsWith(`${name}=`));
        expect(cleared).toContain('Max-Age=0');
        expect(cleared).toContain('HttpOnly');
      }

      // The presented refresh token was consumed by the burn rotation — the
      // next refresh with it fails.
      await http
        .post('/v1/auth/refresh')
        .set('Cookie', cookieHeader('refresh-token-000001'))
        .send({})
        .expect(401);
    });
  });
});
