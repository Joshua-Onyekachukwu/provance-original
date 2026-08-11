import {
  DefaultValuePipe,
  HttpStatus,
  INestApplication,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
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
import { ParseIntStrictPipe } from '../common/pipes/parse-int-strict.pipe';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

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

function createServiceMock() {
  return {
    listJobs: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 500,
      totalPages: 1,
    }),
    retryJob: jest
      .fn()
      .mockResolvedValue({ ok: true, job: { id: 'job-1', status: 'queued' } }),
    failJob: jest
      .fn()
      .mockResolvedValue({ ok: true, job: { id: 'job-1', status: 'failed' } }),
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
    controllers: [AdminController],
    imports: [
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ],
    providers: [
      { provide: AdminService, useValue: service },
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

describe('AdminController jobs routes (HTTP layer)', () => {
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

  it('declares the jobs routes in order with the right paths, verbs, and status codes', () => {
    const methods = Object.getOwnPropertyNames(
      AdminController.prototype,
    ).filter((name) => name !== 'constructor');

    // The jobs trio opens the controller; anything after is out of scope here.
    expect(methods.slice(0, 3)).toEqual(['listJobs', 'retryJob', 'failJob']);

    const paths = methods.slice(0, 3).map((method) =>
      Reflect.getMetadata(PATH_METADATA, AdminController.prototype[method]),
    );
    const verbs = methods.slice(0, 3).map((method) =>
      Reflect.getMetadata(METHOD_METADATA, AdminController.prototype[method]),
    );
    const httpCodes = methods.slice(0, 3).map((method) =>
      Reflect.getMetadata(HTTP_CODE_METADATA, AdminController.prototype[method]),
    );

    expect(paths).toEqual(['jobs', 'jobs/:id/retry', 'jobs/:id/fail']);
    expect(verbs).toEqual([
      RequestMethod.GET,
      RequestMethod.POST,
      RequestMethod.POST,
    ]);
    // GET default 200; retry/fail explicitly @HttpCode(HttpStatus.OK).
    expect(httpCodes).toEqual([undefined, HttpStatus.OK, HttpStatus.OK]);
  });

  it('guards the controller with SupabaseAuthGuard then AdminGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminController) ?? [];
    expect(guards).toEqual([SupabaseAuthGuard, AdminGuard]);
  });

  // ── Query parsing (DefaultValuePipe + ParseIntPipe) ──────────────────────

  it('attaches strict → DefaultValuePipe(1|500) → ParseIntPipe to page/pageSize and leaves status raw', () => {
    // Route-args metadata lives on the CLASS, keyed by the method name, with
    // keys `${paramtype}:${paramIndex}`. listJobs has no @CurrentUser, so
    // status is index 0, page 1, pageSize 2.
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, AdminController, 'listJobs') ??
      {};

    const status = args[`${RouteParamtypes.QUERY}:0`];
    const page = args[`${RouteParamtypes.QUERY}:1`];
    const pageSize = args[`${RouteParamtypes.QUERY}:2`];

    expect(status.data).toBe('status');
    // status is a plain string passthrough — the service validates the
    // display dialect, so no pipes are attached (Nest normalizes the empty
    // list to [] rather than undefined).
    expect(status.pipes).toEqual([]);

    expect(page.data).toBe('page');
    expect(pageSize.data).toBe('pageSize');
    // Strict validation runs FIRST (rejects NaN/non-integers before the
    // default can swallow them), then DefaultValuePipe, then ParseIntPipe.
    expect(page.pipes[0]).toBeInstanceOf(ParseIntStrictPipe);
    expect(page.pipes[1]).toBeInstanceOf(DefaultValuePipe);
    expect(page.pipes[2]).toBe(ParseIntPipe);
    expect(pageSize.pipes[0]).toBeInstanceOf(ParseIntStrictPipe);
    expect(pageSize.pipes[1]).toBeInstanceOf(DefaultValuePipe);
    expect(pageSize.pipes[2]).toBe(ParseIntPipe);
    expect(
      (page.pipes[1] as unknown as { defaultValue: number }).defaultValue,
    ).toBe(1);
    expect(
      (pageSize.pipes[1] as unknown as { defaultValue: number }).defaultValue,
    ).toBe(500);
  });

  it('parses status/page/pageSize query params and forwards them to listJobs', async () => {
    const res = await request(server)
      .get('/v1/admin/jobs?status=failed&page=2&pageSize=5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.listJobs).toHaveBeenCalledWith({
      status: 'failed',
      page: 2,
      pageSize: 5,
    });
    // The service envelope passes through untouched.
    expect(res.body).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 500,
      totalPages: 1,
    });
  });

  it('defaults page to 1 and pageSize to 500 when omitted (status stays undefined)', async () => {
    const res = await request(server)
      .get('/v1/admin/jobs')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.listJobs).toHaveBeenCalledWith({
      status: undefined,
      page: 1,
      pageSize: 500,
    });
  });

  it('rejects a malformed number string (page=2.5) with 400 and never calls the service', async () => {
    const res = await request(server)
      .get('/v1/admin/jobs?page=2.5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(service.listJobs).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric page (page=abc) with 400 instead of silently defaulting', async () => {
    const res = await request(server)
      .get('/v1/admin/jobs?page=abc')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(service.listJobs).not.toHaveBeenCalled();
  });

  // ── CurrentUser → actor wiring ───────────────────────────────────────────

  it('wires the authenticated admin as the actor on retry', async () => {
    const res = await request(server)
      .post('/v1/admin/jobs/job-1/retry')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.retryJob).toHaveBeenCalledTimes(1);
    expect(service.retryJob).toHaveBeenCalledWith('job-1', {
      id: ADMIN_USER.id,
      email: ADMIN_USER.email,
    });
  });

  it('wires the authenticated admin as the actor on fail, with the body reason', async () => {
    const res = await request(server)
      .post('/v1/admin/jobs/job-1/fail')
      .set('Authorization', 'Bearer valid-token')
      .send({ reason: 'manual fail' });

    expect(res.status).toBe(200);
    expect(service.failJob).toHaveBeenCalledTimes(1);
    expect(service.failJob).toHaveBeenCalledWith(
      'job-1',
      'manual fail',
      { id: ADMIN_USER.id, email: ADMIN_USER.email },
    );
  });

  it('passes an empty body through as an undefined reason (FailJobDto is optional)', async () => {
    const res = await request(server)
      .post('/v1/admin/jobs/job-1/fail')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(200);
    expect(service.failJob).toHaveBeenCalledWith(
      'job-1',
      undefined,
      expect.objectContaining({ id: ADMIN_USER.id }),
    );
  });

  it('rejects an unknown body property on fail (ValidationPipe forbidNonWhitelisted)', async () => {
    const res = await request(server)
      .post('/v1/admin/jobs/job-1/fail')
      .set('Authorization', 'Bearer valid-token')
      .send({ reason: 'x', extra: 1 });

    expect(res.status).toBe(400);
    expect(service.failJob).not.toHaveBeenCalled();
  });

  // ── Guard presence (real SupabaseAuthGuard + AdminGuard) ─────────────────

  it('401s without an Authorization header', async () => {
    const res = await request(server).get('/v1/admin/jobs');

    expect(res.status).toBe(401);
    expect(service.listJobs).not.toHaveBeenCalled();
  });

  it('401s when the bearer token is invalid (getUser fails)', async () => {
    const res = await request(server)
      .get('/v1/admin/jobs')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(service.listJobs).not.toHaveBeenCalled();
  });

  it('403s when the authenticated account is not an admin (AdminGuard allowlist)', async () => {
    const res = await request(server)
      .get('/v1/admin/jobs')
      .set('Authorization', 'Bearer non-admin-token');

    expect(res.status).toBe(403);
    expect(service.listJobs).not.toHaveBeenCalled();
  });

  it('403s on the mutating routes too — the AdminGuard gates retry and fail', async () => {
    const res = await request(server)
      .post('/v1/admin/jobs/job-1/retry')
      .set('Authorization', 'Bearer non-admin-token');

    expect(res.status).toBe(403);
    expect(service.retryJob).not.toHaveBeenCalled();
  });

  // ── Throttle presence (30 / 60s @Throttle on the controller) ─────────────

  it('429s past the controller throttle (30 requests per 60s)', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await request(server)
        .get('/v1/admin/jobs')
        .set('Authorization', 'Bearer valid-token');
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
    // The first 30 were allowed through to the service.
    expect(service.listJobs).toHaveBeenCalledTimes(30);
  });
});
