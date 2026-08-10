import {
  DefaultValuePipe,
  INestApplication,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { ApiThrottlerGuard } from '../common/guards/api-throttler.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = { id: 'account-user-1', email: 'user@provance.test' };

// The controller guards every route with the REAL SupabaseAuthGuard; the
// SupabaseService is mocked so `getUser()` succeeds for any non-empty bearer
// token except the sentinel 'invalid-token' — this proves both the happy path
// and the guard's 401 rejection at the HTTP layer.
function createSupabaseServiceMock() {
  return {
    createPublicClient: jest.fn((token: string | null) => ({
      auth: {
        getUser: jest.fn(async () =>
          !token || token === 'invalid-token'
            ? { data: { user: null }, error: { message: 'Invalid session.' } }
            : { data: { user: USER }, error: null },
        ),
      },
    })),
  };
}

function createServiceMock() {
  return {
    getCurrentViewer: jest.fn().mockResolvedValue({
      status: 'authenticated',
      user: { id: USER.id, email: USER.email },
      permissions: { individual: true, team: false, admin: false },
      profile: {
        displayName: 'User',
        organization: '',
        roleTitle: '',
        defaultWorkspace: 'individual',
        emailNotifications: true,
        accountRole: 'member',
        teamAccess: false,
      },
    }),
    updateProfile: jest.fn().mockResolvedValue({
      status: 'updated',
      profile: {
        displayName: 'User',
        organization: '',
        roleTitle: '',
        defaultWorkspace: 'individual',
        emailNotifications: true,
        accountRole: 'member',
        teamAccess: false,
      },
    }),
    getActivity: jest
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
  };
}

// ---------------------------------------------------------------------------
// Minimal HTTP app (same wiring as main.ts: v1 prefix, ValidationPipe,
// GlobalExceptionFilter; ThrottlerModule + ApiThrottlerGuard so @Throttle
// metadata actually enforces).
// ---------------------------------------------------------------------------

async function createTestApp() {
  const service = createServiceMock();
  const supabaseService = createSupabaseServiceMock();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [AccountController],
    imports: [
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ],
    providers: [
      { provide: AccountService, useValue: service },
      { provide: SupabaseService, useValue: supabaseService },
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

describe('AccountController (HTTP layer)', () => {
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

  // ── Route order ──────────────────────────────────────────────────────────

  it('declares profile-get → profile-patch → activity so no route is shadowed', () => {
    const methods = Object.getOwnPropertyNames(
      AccountController.prototype,
    ).filter((name) => name !== 'constructor');

    expect(methods).toEqual(['getProfile', 'updateProfile', 'getActivity']);

    const paths = methods.map((method) =>
      Reflect.getMetadata(PATH_METADATA, AccountController.prototype[method]),
    );
    const verbs = methods.map((method) =>
      Reflect.getMetadata(METHOD_METADATA, AccountController.prototype[method]),
    );

    // METHOD_METADATA is the numeric RequestMethod enum (GET = 0, PATCH = 4).
    expect(paths).toEqual(['profile', 'profile', 'activity']);
    expect(verbs).toEqual([
      RequestMethod.GET,
      RequestMethod.PATCH,
      RequestMethod.GET,
    ]);
  });

  // ── Profile get/patch ────────────────────────────────────────────────────

  it('GET /account/profile returns the viewer and forwards the current user', async () => {
    const res = await request(server)
      .get('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('authenticated');
    expect(service.getCurrentViewer).toHaveBeenCalledTimes(1);
    expect(service.getCurrentViewer).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id, email: USER.email }),
    );
  });

  it('PATCH /account/profile forwards the DTO and returns the updated shape', async () => {
    const res = await request(server)
      .patch('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({
        displayName: 'Founder Admin',
        organization: 'Provance',
        roleTitle: 'Founder',
        defaultWorkspace: 'individual',
        emailNotifications: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('updated');
    expect(service.updateProfile).toHaveBeenCalledTimes(1);
    expect(service.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id, email: USER.email }),
      {
        displayName: 'Founder Admin',
        organization: 'Provance',
        roleTitle: 'Founder',
        defaultWorkspace: 'individual',
        emailNotifications: false,
      },
    );
  });

  it('rejects an invalid defaultWorkspace with 400 and never calls the service', async () => {
    const res = await request(server)
      .patch('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ defaultWorkspace: 'bogus' });

    expect(res.status).toBe(400);
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects an over-long displayName (MaxLength 120) with 400', async () => {
    const res = await request(server)
      .patch('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ displayName: 'x'.repeat(121) });

    expect(res.status).toBe(400);
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('coerces a stringy boolean (emailNotifications: "yes") to true — the implicit-conversion contract', async () => {
    // Locking the ACTUAL production contract (main.ts ValidationPipe has
    // enableImplicitConversion): a string like 'yes' is transformed to a real
    // boolean BEFORE @IsBoolean runs, so it passes and reaches the service as
    // true. This mirrors the 'page=abc → page=1' coercion test: implicit
    // conversion is permissive by design, and @IsBoolean only rejects values
    // that cannot be coerced (see the array case below).
    const res = await request(server)
      .patch('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ emailNotifications: 'yes' });

    expect(res.status).toBe(200);
    expect(service.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      expect.objectContaining({ emailNotifications: true }),
    );
  });

  it('rejects a non-coercible emailNotifications (array) with 400 and never calls the service', async () => {
    const res = await request(server)
      .patch('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ emailNotifications: [1, 2] });

    expect(res.status).toBe(400);
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects unknown DTO keys (forbidNonWhitelisted) with 400', async () => {
    const res = await request(server)
      .patch('/v1/account/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({ displayName: 'User', hackerKey: true });

    expect(res.status).toBe(400);
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  // ── Activity query parsing (DefaultValuePipe + ParseIntPipe) ────────────

  it('attaches DefaultValuePipe + ParseIntPipe to category/page/pageSize', () => {
    // Route-args metadata lives on the CLASS, keyed by the method name, with
    // keys `${paramtype}:${paramIndex}` — @CurrentUser is index 0, so
    // category/page/pageSize are 1, 2, and 3.
    const args =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, AccountController, 'getActivity') ??
      {};

    const category = args[`${RouteParamtypes.QUERY}:1`];
    const page = args[`${RouteParamtypes.QUERY}:2`];
    const pageSize = args[`${RouteParamtypes.QUERY}:3`];

    expect(category.data).toBe('category');
    expect(page.data).toBe('page');
    expect(pageSize.data).toBe('pageSize');

    // category carries only the DefaultValuePipe('all').
    expect(category.pipes).toHaveLength(1);
    expect(category.pipes[0]).toBeInstanceOf(DefaultValuePipe);
    expect(
      (category.pipes[0] as unknown as { defaultValue: string }).defaultValue,
    ).toBe('all');

    // page/pageSize carry DefaultValuePipe(1|20) + ParseIntPipe (bare class
    // reference, so the metadata stores the constructor itself).
    expect(page.pipes[0]).toBeInstanceOf(DefaultValuePipe);
    expect(page.pipes[1]).toBe(ParseIntPipe);
    expect(pageSize.pipes[0]).toBeInstanceOf(DefaultValuePipe);
    expect(pageSize.pipes[1]).toBe(ParseIntPipe);
    expect(
      (page.pipes[0] as unknown as { defaultValue: number }).defaultValue,
    ).toBe(1);
    expect(
      (pageSize.pipes[0] as unknown as { defaultValue: number }).defaultValue,
    ).toBe(20);
  });

  it('parses category/page/pageSize and forwards them to the service', async () => {
    const res = await request(server)
      .get('/v1/account/activity?category=scans&page=2&pageSize=5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.getActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id, email: USER.email }),
      { category: 'scans', page: 2, pageSize: 5 },
    );
  });

  it('defaults category to all, page to 1, pageSize to 20 when omitted', async () => {
    const res = await request(server)
      .get('/v1/account/activity')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.getActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      { category: 'all', page: 1, pageSize: 20 },
    );
  });

  it('passes an unknown category through raw — the service normalizes it to all', async () => {
    // Category validation is a service concern (isActivityCategory → 'all'
    // fallback, mirroring the frontend tab default). The controller must not
    // reject or rewrite it.
    const res = await request(server)
      .get('/v1/account/activity?category=unknown-xyz')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.getActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      { category: 'unknown-xyz', page: 1, pageSize: 20 },
    );
  });

  it('rejects a malformed number string (page=2.5) with 400 and never calls the service', async () => {
    const res = await request(server)
      .get('/v1/account/activity?page=2.5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(service.getActivity).not.toHaveBeenCalled();
  });

  it('silently defaults a non-numeric page (page=abc) to 1 — the global ValidationPipe converts it to NaN and DefaultValuePipe treats NaN as nil', async () => {
    // Locking the ACTUAL production contract (main.ts ValidationPipe has
    // enableImplicitConversion): 'abc' → NaN via +'abc', then DefaultValuePipe
    // replaces NaN with its default BEFORE ParseIntPipe runs, so a garbage
    // page value degrades to page=1 instead of 400. Malformed *numbers*
    // (page=2.5) are the case ParseIntPipe actually rejects.
    const res = await request(server)
      .get('/v1/account/activity?page=abc')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.getActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      { category: 'all', page: 1, pageSize: 20 },
    );
  });

  // ── Guard presence (real SupabaseAuthGuard) ──────────────────────────────

  it('401s without an Authorization header', async () => {
    const res = await request(server).get('/v1/account/profile');

    expect(res.status).toBe(401);
    expect(service.getCurrentViewer).not.toHaveBeenCalled();
  });

  it('401s when the bearer token is invalid (getUser fails)', async () => {
    const res = await request(server)
      .get('/v1/account/activity')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(service.getActivity).not.toHaveBeenCalled();
  });

  // ── Throttle presence (30 / 60s @Throttle on the controller) ─────────────

  it('429s past the controller throttle (30 requests per 60s)', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await request(server)
        .get('/v1/account/activity')
        .set('Authorization', 'Bearer valid-token');
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
    // The first 30 were allowed through to the service.
    expect(service.getActivity).toHaveBeenCalledTimes(30);
  });
});
