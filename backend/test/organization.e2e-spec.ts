import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { QueueService } from '../src/queue/queue.service';
import { SupabaseService } from '../src/supabase/supabase.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = 'org-1';

// DTO team ids are validated with @IsUUID, so the seeded teams must be real
// UUID-shaped strings (the org tables use uuid columns in production).
const TEAM_PRODUCT = '00000000-0000-4000-8000-000000000001';
const TEAM_LEGAL = '00000000-0000-4000-8000-000000000002';
const TEAM_MISSING = '00000000-0000-4000-8000-0000000000ff';

const OWNER_USER = {
  id: 'e2e-owner-0000-0000-0000-000000000001',
  email: 'owner@provance.test',
};

const BASE_MEMBER = {
  organization_id: ORG_ID,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stateful in-memory Supabase mock
//
// The org module spans several HTTP requests that mutate rows (invite created
// → cancelled, member role flipped, member removed), so — like the scans-flow
// e2e — the mock stores rows in memory and serves them back as the flow
// mutates them instead of using the plan-based unit-spec mock:
//
//   - from(table).insert({...}).select().single()
//                                   → stored immediately, id + status defaulted
//   - from(table).update(u).eq(...) → merged into the matching stored row
//   - from(table).delete().eq(...)  → removes the matching stored row
//   - from(table).select(...).eq(...).maybeSingle()
//                                   → resolves the matching row (or null)
//   - directly-awaited chains       → resolve the matching row list
//   - select(..., { count, head })  → resolves { count } of the matching rows
//
// One quirk the mock reproduces faithfully: resolveTeam() reuses its base
// chain for the first-team fallback after a strict id miss. In the real
// supabase-js client, `base.eq('id', teamId)` returns a new chain and never
// mutates `base`, so the fallback query carries only the organization filter;
// the mock shares one builder object, so a strict teams miss flags the stale
// id and order() (the fallback marker) drops it — and only then. Any other
// teams query pairing id + order would silently lose the id, so the flag is
// cleared on every from() reset.
// ---------------------------------------------------------------------------

type ResolvedResult = {
  data?: unknown;
  count?: number;
  error?: unknown;
};

function createStatefulOrgClient() {
  const members = new Map<string, Row>();
  const orgs = new Map<string, Row>();
  const teams = new Map<string, Row>();
  const invites = new Map<string, Row>();
  const sessions = new Map<string, Row>();
  let inviteSeq = 0;

  const state = {
    table: '',
    filters: {} as Record<string, unknown>,
    pendingUpdate: null as Row | null,
    pendingInsert: null as Row | null,
    pendingDelete: false,
    headCount: false,
    // Set by maybeSingle when a strict teams id lookup misses; order() (the
    // resolveTeam fallback marker) uses it to drop the stale id filter.
    teamsStrictMiss: false,
  };

  const tableMap = (table: string): Map<string, Row> | null => {
    switch (table) {
      case 'organization_members':
        return members;
      case 'organizations':
        return orgs;
      case 'teams':
        return teams;
      case 'organization_invites':
        return invites;
      case 'user_sessions':
        return sessions;
      default:
        return null;
    }
  };

  const matches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([column, value]) => row[column] === value);

  const listRows = (): Row[] => {
    const map = tableMap(state.table);
    if (!map) return [];
    return [...map.values()].filter((row) => matches(row, state.filters));
  };

  const keyOf = (row: Row): string =>
    String(row.id ?? row.user_id ?? '');

  const builder = {
    from: jest.fn((table: string) => {
      state.table = table;
      state.filters = {};
      state.pendingUpdate = null;
      state.pendingInsert = null;
      state.pendingDelete = false;
      state.headCount = false;
      state.teamsStrictMiss = false;
      return builder;
    }),
    select: jest.fn((_columns: unknown, options?: { head?: boolean }) => {
      if (options?.head) state.headCount = true;
      return builder;
    }),
    eq: jest.fn((column: string, value: unknown) => {
      state.filters[column] = value;
      return builder;
    }),
    order: jest.fn(() => {
      // resolveTeam's first-team fallback reuses the base chain after a strict
      // id miss; drop the stale id so the fallback resolves the org's first
      // team. Guarded by teamsStrictMiss so a real teams id+order query would
      // keep its filter (and the flag resets on every from()).
      if (state.table === 'teams' && state.teamsStrictMiss) {
        delete state.filters.id;
      }
      return builder;
    }),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
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
      const rows = listRows();
      const row = rows[0] ?? null;
      // Flag a strict teams id miss so the fallback order() can drop the stale
      // id (see the header note) — but not a hit, so a successful strict
      // lookup short-circuits before any order() runs anyway.
      if (state.table === 'teams' && state.filters.id !== undefined && !row) {
        state.teamsStrictMiss = true;
      }
      return { data: row ? { ...row } : null, error: null };
    }),
    // Invite inserts are committed through .select().single(). The DB defaults
    // (id, status 'pending', created_at) are reproduced here so follow-up reads
    // behave like the live schema.
    single: jest.fn(async () => {
      if (state.pendingInsert) {
        const row: Row = {
          ...state.pendingInsert,
          id: `inv-${++inviteSeq}`,
          status: 'pending',
          created_at: '2026-01-03T00:00:00.000Z',
        };
        invites.set(String(row.id), row);
        return { data: { ...row }, error: null };
      }
      return { data: null, error: null };
    }),
    // Directly-awaited chains (lists, count, update, delete) resolve through
    // the thenable contract and mutate the in-memory store before resolving.
    then(resolve: (value: ResolvedResult) => void) {
      if (state.headCount) {
        resolve({ count: listRows().length, error: null });
        return undefined;
      }

      const map = tableMap(state.table);

      if (state.pendingDelete) {
        for (const row of listRows()) {
          const key = keyOf(row);
          if (map?.has(key)) map.delete(key);
        }
        resolve({ data: null, error: null });
        return undefined;
      }

      if (state.pendingUpdate) {
        for (const row of listRows()) {
          const key = keyOf(row);
          if (map?.has(key)) map.set(key, { ...row, ...state.pendingUpdate });
        }
        resolve({ data: null, error: null });
        return undefined;
      }

      resolve({ data: listRows(), error: null });
      return undefined;
    },
  } as const;

  const seed = {
    org(overrides: Record<string, unknown> = {}) {
      orgs.set(ORG_ID, {
        id: ORG_ID,
        name: 'Provance',
        plan: 'pro',
        seats: 5,
        storage_limit_gb: 50,
        storage_used_gb: 0,
        scan_count: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        ...overrides,
      });
    },
    team(id: string, name: string, description: string | null = null) {
      teams.set(id, {
        id,
        organization_id: ORG_ID,
        name,
        description,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
    },
    member(
      id: string,
      email: string,
      overrides: Record<string, unknown> = {},
    ) {
      members.set(id, {
        ...BASE_MEMBER,
        user_id: id,
        role: 'member',
        team_id: null,
        status: 'active',
        profiles: [{ display_name: email.split('@')[0], email }],
        ...overrides,
      });
    },
    invite(id: string, email: string, overrides: Record<string, unknown> = {}) {
      invites.set(id, {
        id,
        organization_id: ORG_ID,
        email,
        role: 'member',
        team_id: null,
        status: 'pending',
        invited_by: OWNER_USER.id,
        created_at: '2026-01-02T00:00:00.000Z',
        expires_at: '2026-01-10T00:00:00.000Z',
        ...overrides,
      });
    },
    session(id: string, userId: string, overrides: Record<string, unknown> = {}) {
      sessions.set(id, {
        id,
        user_id: userId,
        auth_session_id: `sid-${id}`,
        device: 'Chrome on Windows',
        ip_address: '1.2.3.4',
        location: 'AB, NG',
        created_at: '2026-01-01T00:00:00.000Z',
        last_active_at: '2026-01-05T00:00:00.000Z',
        ...overrides,
      });
    },
  };

  return {
    client: builder as unknown as NonNullable<
      ReturnType<SupabaseService['getAdminClient']>
    >,
    seed,
    members,
    orgs,
    teams,
    invites,
    sessions,
  };
}

// ---------------------------------------------------------------------------
// App scaffolding
// ---------------------------------------------------------------------------

async function createTestApp() {
  const mocked = createStatefulOrgClient();

  const moduleFixture: TestingModule = await Test.createTestingModule({
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
    })
    .overrideProvider(ConfigService)
    .useValue({
      // Lazy passthrough: read process.env at call time so tests can set
      // SUPABASE_URL for the GoTrue admin revocation without seeding a real
      // .env — and every other lookup falls back to the module defaults,
      // keeping the e2e runnable with no credentials (CI).
      get: jest.fn((key: string, fallback?: unknown) => {
        const value = process.env[key];
        return value !== undefined && value !== '' ? value : fallback;
      }),
    })
    .overrideGuard(SupabaseAuthGuard)
    .useValue({
      // The identity is constant; authorization (owner/admin vs member) comes
      // from the seeded membership row the service resolves for this user id,
      // which is why the 403 tests seed OWNER_USER's row with role 'member'.
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        request.user = { ...OWNER_USER };
        return true;
      },
    })
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

  return { app, ...mocked };
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('Organization flow (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let seed: ReturnType<typeof createStatefulOrgClient>['seed'];
  let invites: Map<string, Row>;
  let members: Map<string, Row>;
  let sessions: Map<string, Row>;

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
    http = request(app.getHttpServer());
    seed = setup.seed;
    invites = setup.invites;
    members = setup.members;
    sessions = setup.sessions;
  });

  afterEach(async () => {
    await app.close();
    // ConfigModule.forRoot loads backend/.env.local into process.env when the
    // app boots — clear the Supabase creds so this spec cannot un-skip the
    // live invite-accept e2e (which gates on their presence at module load)
    // when jest shares a worker process across spec files.
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_AUTH_REDIRECT_URL;
  });

  describe('GET /v1/organization', () => {
    it('maps the org profile, teams, members, and pending invites', async () => {
      seed.org();
      seed.team(TEAM_PRODUCT, 'Product');
      seed.team(TEAM_LEGAL, 'Legal', 'Compliance');
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test', {
        role: 'admin',
        team_id: TEAM_PRODUCT,
      });
      seed.member('member-b-0000-0000-0000-000000000002', 'b@provance.test');
      seed.invite('inv-1', 'pending@provance.test', {
        role: 'admin',
        team_id: TEAM_LEGAL,
      });

      const response = await http.get('/v1/organization').expect(200);

      expect(response.body.profile).toMatchObject({
        id: ORG_ID,
        name: 'Provance',
        plan: 'pro',
        seats: 5,
        seatsUsed: 3,
        storageUsedGb: 0,
        storageLimitGb: 50,
        scanCount: 0,
      });

      expect(response.body.teams).toHaveLength(2);
      expect(response.body.teams[1]).toMatchObject({
        id: TEAM_LEGAL,
        name: 'Legal',
        description: 'Compliance',
      });

      expect(response.body.members).toHaveLength(3);
      expect(response.body.members[0]).toMatchObject({
        id: OWNER_USER.id,
        email: OWNER_USER.email,
        role: 'owner',
        status: 'active',
      });
      expect(response.body.members[1].team).toBe(TEAM_PRODUCT);

      expect(response.body.pendingInvites).toHaveLength(1);
      expect(response.body.pendingInvites[0]).toMatchObject({
        id: 'inv-1',
        email: 'pending@provance.test',
        role: 'admin',
        team: TEAM_LEGAL,
      });
    });

    it('returns 404 when the caller has no membership', async () => {
      const response = await http.get('/v1/organization').expect(404);
      expect(response.body.message).toContain(
        'You are not a member of any organization.',
      );
    });
  });

  describe('POST /v1/organization/invites — creation', () => {
    it('creates the invite with the requested team and persists it', async () => {
      seed.org();
      seed.team(TEAM_PRODUCT, 'Product');
      seed.team(TEAM_LEGAL, 'Legal');
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .post('/v1/organization/invites')
        .send({
          email: 'new@provance.test',
          role: 'member',
          team: TEAM_LEGAL,
        })
        .expect(201);

      expect(response.body.invite).toMatchObject({
        email: 'new@provance.test',
        role: 'member',
        team: TEAM_LEGAL,
      });
      expect(response.body.invite.id).toEqual(expect.any(String));
      expect(response.body.invite.expiresAt).toEqual(expect.any(String));

      // The stored row reflects the insert payload + DB defaults, and the
      // follow-up GET surfaces it as a pending invite.
      const stored = [...invites.values()].find(
        (row) => row.email === 'new@provance.test',
      );
      expect(stored).toBeDefined();
      expect(stored).toMatchObject({
        organization_id: ORG_ID,
        email: 'new@provance.test',
        role: 'member',
        team_id: TEAM_LEGAL,
        invited_by: OWNER_USER.id,
        status: 'pending',
      });

      const list = await http.get('/v1/organization').expect(200);
      expect(list.body.pendingInvites).toHaveLength(1);
      expect(list.body.pendingInvites[0].email).toBe('new@provance.test');
    });

    it('defaults to the org first team when no team is provided', async () => {
      seed.org();
      seed.team(TEAM_PRODUCT, 'Product');
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .post('/v1/organization/invites')
        .send({ email: 'new@provance.test', role: 'member' })
        .expect(201);

      expect(response.body.invite.team).toBe(TEAM_PRODUCT);
    });

    it('rejects with 400 when the workspace is at its seat limit', async () => {
      seed.org({ seats: 2 });
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test');

      const response = await http
        .post('/v1/organization/invites')
        .send({ email: 'new@provance.test', role: 'member' })
        .expect(400);

      expect(response.body.message).toContain(
        'This workspace has no seats left on its current plan.',
      );
    });

    it('rejects with 400 when the email is already a member', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test');

      const response = await http
        .post('/v1/organization/invites')
        .send({ email: 'A@Provance.Test', role: 'member' })
        .expect(400);

      expect(response.body.message).toContain(
        'That person is already a member of this workspace.',
      );
    });

    it('rejects with 400 when an invite is already pending for the email', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.invite('inv-1', 'new@provance.test');

      const response = await http
        .post('/v1/organization/invites')
        .send({ email: 'new@provance.test', role: 'member' })
        .expect(400);

      expect(response.body.message).toContain(
        'An invite is already pending for that email.',
      );
    });

    it('rejects with 403 when the caller is a plain member', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'member' });

      const response = await http
        .post('/v1/organization/invites')
        .send({ email: 'new@provance.test', role: 'member' })
        .expect(403);

      expect(response.body.message).toContain(
        'Only organization owners and admins can manage the workspace.',
      );
    });

    it('rejects invalid DTOs with 400 before touching the service', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      // Invalid email shape.
      await http
        .post('/v1/organization/invites')
        .send({ email: 'not-an-email', role: 'member' })
        .expect(400);

      // Role constrained to admin/member (owner is granted, not invited).
      await http
        .post('/v1/organization/invites')
        .send({ email: 'new@provance.test', role: 'owner' })
        .expect(400);

      // team must be a UUID.
      await http
        .post('/v1/organization/invites')
        .send({ email: 'new@provance.test', role: 'member', team: 'team-1' })
        .expect(400);

      // No pending invite was ever created by the rejected calls.
      expect(invites.size).toBe(0);
    });
  });

  describe('PATCH /v1/organization/members/:memberId/role', () => {
    it('promotes a member to admin', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test');

      const response = await http
        .patch('/v1/organization/members/member-a-0000-0000-0000-000000000001/role')
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        memberId: 'member-a-0000-0000-0000-000000000001',
        role: 'admin',
      });
      expect(
        members.get('member-a-0000-0000-0000-000000000001')?.role,
      ).toBe('admin');
    });

    it('rejects with 400 when the target is the owner', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .patch('/v1/organization/members/' + OWNER_USER.id + '/role')
        .send({ role: 'member' })
        .expect(400);

      expect(response.body.message).toContain('The owner cannot be modified.');
    });

    it('rejects with 404 when the target member does not exist', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .patch('/v1/organization/members/missing-member/role')
        .send({ role: 'admin' })
        .expect(404);

      expect(response.body.message).toContain('Member not found.');
    });
  });

  describe('PATCH /v1/organization/members/:memberId/team', () => {
    it('reassigns the member to a team', async () => {
      seed.org();
      seed.team(TEAM_PRODUCT, 'Product');
      seed.team(TEAM_LEGAL, 'Legal');
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test', {
        team_id: TEAM_PRODUCT,
      });

      const response = await http
        .patch('/v1/organization/members/member-a-0000-0000-0000-000000000001/team')
        .send({ teamId: TEAM_LEGAL })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        memberId: 'member-a-0000-0000-0000-000000000001',
        teamId: TEAM_LEGAL,
      });
      expect(
        members.get('member-a-0000-0000-0000-000000000001')?.team_id,
      ).toBe(TEAM_LEGAL);
    });

    it('rejects with 400 when the team does not exist in the org', async () => {
      seed.org();
      seed.team(TEAM_PRODUCT, 'Product');
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test');

      const response = await http
        .patch('/v1/organization/members/member-a-0000-0000-0000-000000000001/team')
        .send({ teamId: TEAM_MISSING })
        .expect(400);

      expect(response.body.message).toContain('That team does not exist.');
    });

    it('rejects with 400 when the target is the owner', async () => {
      seed.org();
      seed.team(TEAM_PRODUCT, 'Product');
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .patch('/v1/organization/members/' + OWNER_USER.id + '/team')
        .send({ teamId: TEAM_PRODUCT })
        .expect(400);

      expect(response.body.message).toContain('The owner cannot be modified.');
    });

    it('rejects a non-UUID teamId with 400', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      await http
        .patch('/v1/organization/members/member-a/team')
        .send({ teamId: 'not-a-uuid' })
        .expect(400);
    });
  });

  describe('DELETE /v1/organization/members/:memberId', () => {
    it('removes the member from the roster', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test');

      const response = await http
        .delete('/v1/organization/members/member-a-0000-0000-0000-000000000001')
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        memberId: 'member-a-0000-0000-0000-000000000001',
      });
      expect(members.has('member-a-0000-0000-0000-000000000001')).toBe(false);

      // The roster no longer lists the removed member.
      const list = await http.get('/v1/organization').expect(200);
      expect(list.body.members).toHaveLength(1);
    });

    it('rejects with 400 when the target is the owner', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .delete('/v1/organization/members/' + OWNER_USER.id)
        .expect(400);

      expect(response.body.message).toContain('The owner cannot be modified.');
    });
  });

  describe('DELETE /v1/organization/invites/:inviteId', () => {
    it('cancels the invite and removes it from the pending list', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.invite('inv-1', 'pending@provance.test');

      const response = await http
        .delete('/v1/organization/invites/inv-1')
        .expect(200);

      expect(response.body).toEqual({ ok: true, inviteId: 'inv-1' });
      expect(invites.get('inv-1')?.status).toBe('cancelled');

      // Cancelled invites no longer surface as pending.
      const list = await http.get('/v1/organization').expect(200);
      expect(list.body.pendingInvites).toHaveLength(0);
    });

    it('rejects with 404 when the invite is not in the workspace', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });

      const response = await http
        .delete('/v1/organization/invites/inv-missing')
        .expect(404);

      expect(response.body.message).toContain('Invite not found.');
    });

    it('rejects with 403 when the caller is a plain member', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'member' });
      seed.invite('inv-1', 'pending@provance.test');

      const response = await http
        .delete('/v1/organization/invites/inv-1')
        .expect(403);

      expect(response.body.message).toContain(
        'Only organization owners and admins can manage the workspace.',
      );
    });
  });

  describe('member sessions (org-admin revocation)', () => {
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      // The ConfigService override reads process.env lazily, so the GoTrue
      // admin revocation URL resolves without a real .env (CI-safe).
      process.env.SUPABASE_URL = 'https://project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
      fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, status: 200 } as Response);
    });

    afterEach(() => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      fetchMock.mockRestore();
    });

    it('lists a member\'s sessions with the team tag', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test', {
        role: 'member',
        team_id: TEAM_LEGAL,
      });
      seed.session('sess-a1', 'member-a-0000-0000-0000-000000000001', {
        auth_session_id: 'sid-a1',
        device: 'Chrome on Windows',
      });
      seed.session('sess-a2', 'member-a-0000-0000-0000-000000000001', {
        auth_session_id: 'sid-a2',
        device: 'Safari on iPhone',
      });

      const response = await http
        .get('/v1/organization/members/member-a-0000-0000-0000-000000000001/sessions')
        .expect(200);

      expect(response.body).toMatchObject({
        memberId: 'member-a-0000-0000-0000-000000000001',
        teamId: TEAM_LEGAL,
      });
      expect(response.body.sessions).toHaveLength(2);
      expect(response.body.sessions[0]).toMatchObject({
        id: 'sess-a1',
        device: 'Chrome on Windows',
        teamId: TEAM_LEGAL,
      });
    });

    it('403s for a non-manager caller', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'member' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test');

      const response = await http
        .get('/v1/organization/members/member-a-0000-0000-0000-000000000001/sessions')
        .expect(403);

      expect(response.body.message).toContain(
        'Only organization owners and admins can manage the workspace.',
      );
    });

    it('revokes a single member session server-side', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test', {
        role: 'member',
        team_id: TEAM_LEGAL,
      });
      seed.session('sess-a1', 'member-a-0000-0000-0000-000000000001', {
        auth_session_id: 'sid-a1',
      });
      seed.session('sess-a2', 'member-a-0000-0000-0000-000000000001', {
        auth_session_id: 'sid-a2',
      });

      const response = await http
        .delete(
          '/v1/organization/members/member-a-0000-0000-0000-000000000001/sessions/sess-a1',
        )
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        memberId: 'member-a-0000-0000-0000-000000000001',
        sessionId: 'sess-a1',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://project.supabase.co/auth/v1/admin/users/member-a-0000-0000-0000-000000000001/sessions/sid-a1',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(sessions.has('sess-a1')).toBe(false);
      expect(sessions.has('sess-a2')).toBe(true);
    });

    it('revokes all non-current sessions and reports the count', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'owner' });
      seed.member('member-a-0000-0000-0000-000000000001', 'a@provance.test', {
        role: 'member',
        team_id: TEAM_LEGAL,
      });
      seed.session('sess-a1', 'member-a-0000-0000-0000-000000000001', {
        auth_session_id: 'sid-a1',
      });
      seed.session('sess-a2', 'member-a-0000-0000-0000-000000000001', {
        auth_session_id: 'sid-a2',
      });

      const response = await http
        .delete('/v1/organization/members/member-a-0000-0000-0000-000000000001/sessions')
        .expect(200);

      expect(response.body).toMatchObject({ ok: true, revoked: 2 });
      expect(sessions.size).toBe(0);
    });

    it('400s when revoking the owner\'s sessions', async () => {
      seed.org();
      seed.member(OWNER_USER.id, OWNER_USER.email, { role: 'admin' });
      seed.member('owner-2-0000-0000-0000-000000000099', 'owner2@provance.test', {
        role: 'owner',
      });
      seed.session('sess-o1', 'owner-2-0000-0000-0000-000000000099', {
        auth_session_id: 'sid-o1',
      });

      await http
        .delete('/v1/organization/members/owner-2-0000-0000-0000-000000000099/sessions')
        .expect(400);
    });
  });
});
