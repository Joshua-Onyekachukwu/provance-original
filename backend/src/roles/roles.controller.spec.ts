import {
  ForbiddenException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { AdminGuard } from '../common/guards/admin.guard';
import { ApiThrottlerGuard } from '../common/guards/api-throttler.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_USER = { id: 'admin-user-1', email: 'admin@provance.test' };
const NON_ADMIN_USER = { id: 'user-1', email: 'user@provance.test' };
const ADMIN_EMAILS = 'admin@provance.test';

// The controller guards every route with the REAL SupabaseAuthGuard AND the
// REAL AdminGuard. The SupabaseService is mocked so `getUser()` succeeds for
// any non-empty bearer token except the sentinel 'invalid-token' — with a
// second token ('non-admin-token') resolving to a non-allowlisted account so
// the AdminGuard's 403 path is exercised at the HTTP layer too.
function createSupabaseServiceMock() {
  return {
    createPublicClient: jest.fn((token: string | null) => ({
      auth: {
        getUser: jest.fn(async () => {
          if (!token || token === 'invalid-token') {
            return { data: { user: null }, error: { message: 'Invalid session.' } };
          }
          if (token === 'non-admin-token') {
            return { data: { user: NON_ADMIN_USER }, error: null };
          }
          return { data: { user: ADMIN_USER }, error: null };
        }),
      },
    })),
  };
}

// AdminGuard reads ADMIN_EMAILS from ConfigService — the mock returns the
// allowlist only for that key.
function createConfigMock() {
  return {
    get: jest.fn((key: string) => (key === 'ADMIN_EMAILS' ? ADMIN_EMAILS : undefined)),
  };
}

// The RBAC matrix envelope list() returns, plus the two mutating contracts.
// The Owner-guard lives in the service (editable:false / owner-seat rules) —
// the mock re-throws the exact ForbiddenExceptions so the HTTP layer proves
// they surface as 403s through the GlobalExceptionFilter.
function createServiceMock() {
  return {
    list: jest.fn().mockResolvedValue({
      roles: [
        {
          id: 'role_admin',
          name: 'Admin',
          description: 'Full workspace admin',
          editable: true,
          scopes: { 'scans.read': true, 'reports.export': true },
          member_count: 1,
        },
      ],
      scopes: [{ key: 'scans.read', label: 'Read scans' }],
      members: [{ id: 'user-2', name: 'Amina Sow', email: 'amina@provance.test' }],
      auditEvents: [],
    }),
    updateRoleScopes: jest.fn(async (_user, roleId: string, scopes: Record<string, boolean>) => {
      if (roleId === 'role_owner') {
        throw new ForbiddenException(
          'The Owner role is fixed by design and cannot be edited.',
        );
      }
      return { ok: true, roleId, scopes };
    }),
    reassignMember: jest.fn(async (_user, memberId: string, roleId: string) => {
      if (roleId === 'role_owner') {
        throw new ForbiddenException(
          'The Owner role cannot be assigned through the roster.',
        );
      }
      return { ok: true, memberId, roleId };
    }),
  };
}

// ---------------------------------------------------------------------------
// Minimal HTTP app (same wiring as main.ts: v1 prefix, ValidationPipe,
// GlobalExceptionFilter; ThrottlerModule + ApiThrottlerGuard so @Throttle
// metadata actually enforces). AdminGuard is instantiated from the
// controller's @UseGuards — it needs ConfigService injected.
// ---------------------------------------------------------------------------

async function createTestApp() {
  const service = createServiceMock();
  const supabaseService = createSupabaseServiceMock();
  const configService = createConfigMock();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [RolesController],
    imports: [
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ],
    providers: [
      { provide: RolesService, useValue: service },
      { provide: SupabaseService, useValue: supabaseService },
      { provide: ConfigService, useValue: configService },
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
  return { app, service };
}

describe('RolesController (HTTP layer)', () => {
  let app: INestApplication;
  let server: App;
  let service: ReturnType<typeof createServiceMock>;

  beforeEach(async () => {
    ({ app, service } = await createTestApp());
    server = app.getHttpServer() as unknown as App;
  });

  afterEach(async () => {
    await app.close();
  });

  // ── Route metadata ───────────────────────────────────────────────────────

  it('declares list → :roleId/scopes → members/:memberId with the right verbs and status codes', () => {
    const methods = Object.getOwnPropertyNames(
      RolesController.prototype,
    ).filter((name) => name !== 'constructor');

    expect(methods).toEqual(['list', 'updateRoleScopes', 'reassignMember']);

    const paths = methods.map((method) =>
      Reflect.getMetadata(PATH_METADATA, RolesController.prototype[method]),
    );
    const verbs = methods.map((method) =>
      Reflect.getMetadata(METHOD_METADATA, RolesController.prototype[method]),
    );
    const httpCodes = methods.map((method) =>
      Reflect.getMetadata(HTTP_CODE_METADATA, RolesController.prototype[method]),
    );

    // @Get() with no path registers '/' (Nest v11); METHOD_METADATA is the
    // numeric RequestMethod enum (GET = 0, PATCH = 4).
    expect(paths).toEqual(['/', ':roleId/scopes', 'members/:memberId']);
    expect(verbs).toEqual([
      RequestMethod.GET,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
    ]);
    // GET default 200; both PATCHes explicitly @HttpCode(HttpStatus.OK).
    expect(httpCodes).toEqual([undefined, HttpStatus.OK, HttpStatus.OK]);
  });

  it('guards the controller with SupabaseAuthGuard then AdminGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RolesController) ?? [];
    expect(guards).toEqual([SupabaseAuthGuard, AdminGuard]);
  });

  // ── List ─────────────────────────────────────────────────────────────────

  it('serves the RBAC matrix on GET /admin/roles', async () => {
    const res = await request(server)
      .get('/v1/admin/roles')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledTimes(1);
    // The service envelope passes through untouched.
    expect(res.body.roles).toHaveLength(1);
    expect(res.body.roles[0].id).toBe('role_admin');
    expect(res.body.scopes).toHaveLength(1);
    expect(res.body.auditEvents).toEqual([]);
  });

  // ── PATCH :roleId/scopes ─────────────────────────────────────────────────

  it('forwards the roleId + full scope map to updateRoleScopes with the admin as actor', async () => {
    const scopes = { 'scans.read': true, 'reports.export': false };
    const res = await request(server)
      .patch('/v1/admin/roles/role_admin/scopes')
      .set('Authorization', 'Bearer valid-token')
      .send({ scopes });

    expect(res.status).toBe(200);
    expect(service.updateRoleScopes).toHaveBeenCalledTimes(1);
    expect(service.updateRoleScopes).toHaveBeenCalledWith(
      { id: ADMIN_USER.id, email: ADMIN_USER.email },
      'role_admin',
      scopes,
    );
    expect(res.body).toEqual({ ok: true, roleId: 'role_admin', scopes });
  });

  it('403s when the service rejects an Owner-role edit (Owner-guard at the HTTP layer)', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/role_owner/scopes')
      .set('Authorization', 'Bearer valid-token')
      .send({ scopes: { 'scans.read': false } });

    expect(res.status).toBe(403);
    expect(res.body.statusCode).toBe(403);
    expect(res.body.message).toBe(
      'The Owner role is fixed by design and cannot be edited.',
    );
  });

  it('400s on a non-object scopes body (UpdateRoleScopesDto @IsObject)', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/role_admin/scopes')
      .set('Authorization', 'Bearer valid-token')
      .send({ scopes: 'not-an-object' });

    expect(res.status).toBe(400);
    expect(service.updateRoleScopes).not.toHaveBeenCalled();
  });

  it('400s on a missing scopes body property', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/role_admin/scopes')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(400);
    expect(service.updateRoleScopes).not.toHaveBeenCalled();
  });

  it('400s on an unknown body property (ValidationPipe forbidNonWhitelisted)', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/role_admin/scopes')
      .set('Authorization', 'Bearer valid-token')
      .send({ scopes: {}, extra: 1 });

    expect(res.status).toBe(400);
    expect(service.updateRoleScopes).not.toHaveBeenCalled();
  });

  // ── PATCH members/:memberId ──────────────────────────────────────────────

  it('routes PATCH /admin/roles/members/:memberId to reassignMember — not :roleId/scopes', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/members/user-2')
      .set('Authorization', 'Bearer valid-token')
      .send({ roleId: 'role_analyst' });

    expect(res.status).toBe(200);
    expect(service.reassignMember).toHaveBeenCalledTimes(1);
    expect(service.reassignMember).toHaveBeenCalledWith(
      { id: ADMIN_USER.id, email: ADMIN_USER.email },
      'user-2',
      'role_analyst',
    );
    // The members route must NOT be swallowed by :roleId/scopes.
    expect(service.updateRoleScopes).not.toHaveBeenCalled();
    expect(res.body).toEqual({ ok: true, memberId: 'user-2', roleId: 'role_analyst' });
  });

  it('403s when reassigning a member to the Owner role (Owner-guard at the HTTP layer)', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/members/user-2')
      .set('Authorization', 'Bearer valid-token')
      .send({ roleId: 'role_owner' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe(
      'The Owner role cannot be assigned through the roster.',
    );
  });

  it('400s on a missing roleId (ReassignMemberDto @IsString)', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/members/user-2')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(400);
    expect(service.reassignMember).not.toHaveBeenCalled();
  });

  // ── Guard presence (real SupabaseAuthGuard + AdminGuard) ─────────────────

  it('401s without an Authorization header', async () => {
    const res = await request(server).get('/v1/admin/roles');

    expect(res.status).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('401s when the bearer token is invalid (getUser fails)', async () => {
    const res = await request(server)
      .get('/v1/admin/roles')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('403s when the authenticated account is not an admin (AdminGuard allowlist)', async () => {
    const res = await request(server)
      .get('/v1/admin/roles')
      .set('Authorization', 'Bearer non-admin-token');

    expect(res.status).toBe(403);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('403s on the mutating routes too — the AdminGuard gates scope edits and reassignments', async () => {
    const res = await request(server)
      .patch('/v1/admin/roles/role_admin/scopes')
      .set('Authorization', 'Bearer non-admin-token')
      .send({ scopes: {} });

    expect(res.status).toBe(403);
    expect(service.updateRoleScopes).not.toHaveBeenCalled();
  });

  // ── Throttle presence (30 / 60s @Throttle on the controller) ─────────────

  it('429s past the controller throttle (30 requests per 60s)', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await request(server)
        .get('/v1/admin/roles')
        .set('Authorization', 'Bearer valid-token');
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
    // The first 30 were allowed through to the service.
    expect(service.list).toHaveBeenCalledTimes(30);
  });
});
