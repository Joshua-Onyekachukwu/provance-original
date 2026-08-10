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
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = { id: 'notif-user-1', email: 'user@provance.test' };

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
    list: jest
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 }),
    getUnreadCount: jest.fn().mockResolvedValue({ unread: 3 }),
    markAllRead: jest.fn().mockResolvedValue({ ok: true }),
    markRead: jest.fn().mockResolvedValue({ ok: true, id: 'n-1' }),
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
    controllers: [NotificationsController],
    imports: [
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ],
    providers: [
      { provide: NotificationsService, useValue: service },
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

describe('NotificationsController (HTTP layer)', () => {
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

  it('declares list → unread-count → read-all → :id/read so no route is shadowed', () => {
    const methods = Object.getOwnPropertyNames(
      NotificationsController.prototype,
    ).filter((name) => name !== 'constructor');

    expect(methods).toEqual(['list', 'getUnreadCount', 'markAllRead', 'markRead']);

    const paths = methods.map((method) =>
      Reflect.getMetadata(
        PATH_METADATA,
        NotificationsController.prototype[method],
      ),
    );
    const verbs = methods.map((method) =>
      Reflect.getMetadata(
        METHOD_METADATA,
        NotificationsController.prototype[method],
      ),
    );

    // @Get() with no path registers '/' (Nest v11), not ''; METHOD_METADATA
    // is the numeric RequestMethod enum (GET = 0, PATCH = 4).
    expect(paths).toEqual(['/', 'unread-count', 'read-all', ':id/read']);
    expect(verbs).toEqual([
      RequestMethod.GET,
      RequestMethod.GET,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
    ]);
  });

  it('routes PATCH /notifications/read-all to markAllRead — not :id/read', async () => {
    const res = await request(server)
      .patch('/v1/notifications/read-all')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.markAllRead).toHaveBeenCalledTimes(1);
    expect(service.markAllRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id, email: USER.email }),
    );
    expect(service.markRead).not.toHaveBeenCalled();
  });

  it('routes PATCH /notifications/:id/read to markRead with the raw id', async () => {
    const res = await request(server)
      .patch('/v1/notifications/notif-42/read')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.markRead).toHaveBeenCalledTimes(1);
    expect(service.markRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      'notif-42',
    );
    expect(service.markAllRead).not.toHaveBeenCalled();
  });

  // ── Query parsing (DefaultValuePipe + ParseIntPipe) ──────────────────────

  it('attaches DefaultValuePipe(1|20) + ParseIntPipe to the page/pageSize query params', () => {
    // Route-args metadata lives on the CLASS, keyed by the method name
    // (create-route-param-metadata.decorator: defineMetadata(..., target.constructor,
    // key)), with keys `${paramtype}:${paramIndex}` — @CurrentUser is index 0,
    // so page/pageSize are 1 and 2.
    const args =
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        NotificationsController,
        'list',
      ) ?? {};

    const page = args[`${RouteParamtypes.QUERY}:1`];
    const pageSize = args[`${RouteParamtypes.QUERY}:2`];

    expect(page.data).toBe('page');
    expect(pageSize.data).toBe('pageSize');
    expect(page.pipes[0]).toBeInstanceOf(DefaultValuePipe);
    // ParseIntPipe is passed as a bare class reference in @Query(...), so the
    // metadata stores the constructor itself, not an instance.
    expect(page.pipes[1]).toBe(ParseIntPipe);
    expect(
      (page.pipes[0] as unknown as { defaultValue: number }).defaultValue,
    ).toBe(1);
    expect(
      (pageSize.pipes[0] as unknown as { defaultValue: number }).defaultValue,
    ).toBe(20);
  });

  it('parses page/pageSize query params as integers', async () => {
    const res = await request(server)
      .get('/v1/notifications?page=2&pageSize=5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      { page: 2, pageSize: 5 },
    );
  });

  it('serves the unread count for the badge without a feed refetch', async () => {
    const res = await request(server)
      .get('/v1/notifications/unread-count')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ unread: 3 });
    expect(service.getUnreadCount).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
    );
    expect(service.list).not.toHaveBeenCalled();
  });

  it('defaults page to 1 and pageSize to 20 when omitted', async () => {
    const res = await request(server)
      .get('/v1/notifications')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      { page: 1, pageSize: 20 },
    );
  });

  it('rejects a malformed number string (page=2.5) with 400 and never calls the service', async () => {
    const res = await request(server)
      .get('/v1/notifications?page=2.5')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('silently defaults a non-numeric page (page=abc) to 1 — the global ValidationPipe converts it to NaN and DefaultValuePipe treats NaN as nil', async () => {
    // Locking the ACTUAL production contract (main.ts ValidationPipe has
    // enableImplicitConversion): 'abc' → NaN via +'abc', then DefaultValuePipe
    // replaces NaN with its default BEFORE ParseIntPipe runs, so a garbage
    // page value degrades to page=1 instead of 400. Malformed *numbers*
    // (page=2.5) are the case ParseIntPipe actually rejects.
    const res = await request(server)
      .get('/v1/notifications?page=abc')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id }),
      { page: 1, pageSize: 20 },
    );
  });

  // ── Guard presence (real SupabaseAuthGuard) ──────────────────────────────

  it('401s without an Authorization header', async () => {
    const res = await request(server).get('/v1/notifications');

    expect(res.status).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('401s when the bearer token is invalid (getUser fails)', async () => {
    const res = await request(server)
      .get('/v1/notifications')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  // ── Throttle presence (60 / 60s @Throttle on the controller) ─────────────

  it('429s past the controller throttle (60 requests per 60s)', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 61; i += 1) {
      const res = await request(server)
        .get('/v1/notifications')
        .set('Authorization', 'Bearer valid-token');
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
    // The first 60 were allowed through to the service.
    expect(service.list).toHaveBeenCalledTimes(60);
  });
});
