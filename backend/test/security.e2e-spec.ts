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
  let seq = 0;

  const state = {
    table: '',
    filters: {} as Record<string, unknown>,
    pendingUpdate: null as Row | null,
    pendingInsert: null as Row | null,
    pendingDelete: false,
    order: null as { column: string; ascending: boolean } | null,
  };

  const tableMap = (table: string): Map<string, Row> | null => {
    if (table === 'user_sessions') return sessions;
    if (table === 'auth_audit_events') return auditEvents;
    return null;
  };

  const matches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([column, value]) => row[column] === value);

  const listRows = (): Row[] => {
    const map = tableMap(state.table);
    if (!map) return [];
    let rows = [...map.values()].filter((row) => matches(row, state.filters));
    if (state.order) {
      const { column, ascending } = state.order;
      rows = rows.sort((left, right) => {
        const a = String(left[column] ?? '');
        const b = String(right[column] ?? '');
        return ascending ? a.localeCompare(b) : b.localeCompare(a);
      });
    }
    return rows;
  };

  const builder = {
    from: jest.fn((table: string) => {
      state.table = table;
      state.filters = {};
      state.pendingUpdate = null;
      state.pendingInsert = null;
      state.pendingDelete = false;
      state.order = null;
      return builder;
    }),
    select: jest.fn(() => builder),
    eq: jest.fn((column: string, value: unknown) => {
      state.filters[column] = value;
      return builder;
    }),
    order: jest.fn((column: string, options?: { ascending?: boolean }) => {
      state.order = { column, ascending: options?.ascending ?? true };
      return builder;
    }),
    insert: jest.fn((payload: Row) => {
      state.pendingInsert = payload;
      return builder;
    }),
    update: jest.fn((updates: Row) => {
      state.pendingUpdate = updates;
      return builder;
    }),
    delete: jest.fn(() => {
      state.pendingDelete = true;
      return builder;
    }),
    maybeSingle: jest.fn(async () => {
      const row = listRows()[0] ?? null;
      return { data: row ? { ...row } : null, error: null };
    }),
    then(resolve: (value: ResolvedResult) => void) {
      const map = tableMap(state.table);

      if (state.pendingDelete) {
        for (const row of listRows()) {
          const key = String(row.id ?? row.user_id ?? '');
          if (map?.has(key)) map.delete(key);
        }
        resolve({ data: null, error: null });
        return undefined;
      }

      if (state.pendingUpdate) {
        for (const row of listRows()) {
          const key = String(row.id ?? row.user_id ?? '');
          if (map?.has(key)) map.set(key, { ...row, ...state.pendingUpdate });
        }
        resolve({ data: null, error: null });
        return undefined;
      }

      if (state.pendingInsert) {
        const row: Row = {
          ...state.pendingInsert,
          id: state.pendingInsert.id ?? `row-${++seq}`,
        };
        const key = String(row.id);
        map?.set(key, row);
        resolve({ data: [row], error: null });
        return undefined;
      }

      resolve({ data: listRows(), error: null });
      return undefined;
    },
  } as const;

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
  };

  return {
    client: builder as unknown as NonNullable<
      ReturnType<SupabaseService['getAdminClient']>
    >,
    seed,
    sessions,
    auditEvents,
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

async function createTestApp(options: { overrideGuard?: boolean } = {}) {
  const { overrideGuard = true } = options;
  const mocked = createStatefulSecurityClient();

  const builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue({
      getAdminClient: jest.fn(() => mocked.client),
      createPublicClient: jest.fn(() => null),
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
  const extraApps: INestApplication[] = [];
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
    http = request(app.getHttpServer());
    seed = setup.seed;
    sessions = setup.sessions;
    auditEvents = setup.auditEvents;
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
