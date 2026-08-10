import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
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

const USER = {
  id: 'e2e-user-0000-0000-0000-000000000001',
  email: 'e2e.user@provance.test',
};

const UPLOADS_BUCKET = 'provance-uploads';

// The service default (MAX_UPLOAD_BYTES fallback in ScansService): 50 MiB.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// A 1×1 PNG so inline processing (when exercised) produces a real payload.
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// ---------------------------------------------------------------------------
// Stateful in-memory Supabase mock — mirrors scans-flow.e2e-spec.ts, with a
// per-test switch for whether the scan row is visible to the scans table
// queries (so validation-rejection tests can prove nothing was persisted).
// ---------------------------------------------------------------------------

type ScanRow = Record<string, unknown>;

function createStatefulAdminClient() {
  const scans = new Map<string, ScanRow>();

  const storage = {
    createSignedUploadUrl: jest.fn(async () => ({
      data: {
        token: 'e2e-signed-upload-token',
        signedUrl: 'https://storage.e2e/upload',
      },
      error: null,
    })),
    info: jest.fn(async () => ({ data: { name: 'object' }, error: null })),
    download: jest.fn(async () => ({
      data: new Blob([ONE_PX_PNG]),
      error: null,
    })),
    createSignedUrl: jest.fn(async () => ({
      data: { signedUrl: 'https://storage.e2e/preview' },
      error: null,
    })),
  };

  const state = {
    table: '',
    filters: {} as Record<string, unknown>,
    pendingUpdate: null as Record<string, unknown> | null,
    pendingInsert: null as ScanRow | null,
  };

  const findScan = (filters: Record<string, unknown>): ScanRow | null => {
    for (const row of scans.values()) {
      const matches = Object.entries(filters).every(
        ([column, value]) => row[column] === value,
      );
      if (matches) return row;
    }
    return null;
  };

  const builder = {
    from: jest.fn((table: string) => {
      state.table = table;
      state.filters = {};
      state.pendingUpdate = null;
      state.pendingInsert = null;
      return builder;
    }),
    select: jest.fn(() => builder),
    eq: jest.fn((column: string, value: unknown) => {
      state.filters[column] = value;
      return builder;
    }),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
    not: jest.fn(() => builder),
    in: jest.fn(() => builder),
    like: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    insert: jest.fn((payload: ScanRow) => {
      state.pendingInsert = payload;
      return builder;
    }),
    update: jest.fn((updates: Record<string, unknown>) => {
      state.pendingUpdate = updates;
      return builder;
    }),
    maybeSingle: jest.fn(async () => {
      if (state.table === 'organization_members') {
        return { data: { team_id: 'team_legal' }, error: null };
      }
      const row = findScan(state.filters);
      return { data: row ? { ...row } : null, error: null };
    }),
    then(resolve: (value: { data: unknown; error: unknown }) => void) {
      if (state.pendingInsert) {
        scans.set(String(state.pendingInsert.id), { ...state.pendingInsert });
        resolve({ data: null, error: null });
        return undefined;
      }
      if (state.pendingUpdate) {
        const id = String(state.filters.id);
        const current = scans.get(id);
        if (current) scans.set(id, { ...current, ...state.pendingUpdate });
        resolve({ data: null, error: null });
        return undefined;
      }
      resolve({ data: null, error: null });
      return undefined;
    },
    storage: {
      from: jest.fn(() => storage),
    },
  } as const;

  return {
    client: builder as unknown as NonNullable<
      ReturnType<SupabaseService['getAdminClient']>
    >,
    scans,
    storage,
  };
}

// ---------------------------------------------------------------------------
// App scaffolding — queue behavior is a per-test switch:
//   queueConfigured=true  → Redis present; submit enqueues and stops there
//   queueConfigured=false → no Redis; submit falls back to inline processing
// ---------------------------------------------------------------------------

type QueueOverride = {
  isConfigured: jest.Mock<boolean>;
  enqueueScanProcessing: jest.Mock;
};

async function createTestApp(queueConfigured: boolean) {
  const mocked = createStatefulAdminClient();

  const queueOverride: QueueOverride = {
    isConfigured: jest.fn(() => queueConfigured),
    enqueueScanProcessing: jest.fn(async () => undefined),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue({
      getAdminClient: jest.fn(() => mocked.client),
      createPublicClient: jest.fn(() => null),
    })
    .overrideProvider(QueueService)
    .useValue(queueOverride)
    .overrideGuard(SupabaseAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        request.user = { ...USER };
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

  return { app, ...mocked, queueOverride };
}

function initiateBody(overrides: Record<string, unknown> = {}) {
  return {
    originalFilename: 'evidence.png',
    mimeType: 'image/png',
    fileSizeBytes: 1024,
    mediaType: 'image',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('Scans API (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let scans: Map<string, ScanRow>;
  let storage: ReturnType<typeof createStatefulAdminClient>['storage'];
  let queueOverride: QueueOverride;

  async function boot(queueConfigured: boolean) {
    const setup = await createTestApp(queueConfigured);
    app = setup.app;
    http = request(app.getHttpServer());
    scans = setup.scans;
    storage = setup.storage;
    queueOverride = setup.queueOverride;
  }

  afterEach(async () => {
    await app.close();
  });

  describe('POST /scans — validation', () => {
    beforeEach(async () => {
      await boot(false);
    });

    it('rejects a non-image media type (DTO IsIn)', async () => {
      await http
        .post('/v1/scans')
        .send(initiateBody({ mediaType: 'video' }))
        .expect(400);

      expect(scans.size).toBe(0);
      expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('rejects a disallowed mime type at the service allow-list', async () => {
      await http
        .post('/v1/scans')
        .send(initiateBody({ mimeType: 'video/mp4' }))
        .expect(400);

      expect(scans.size).toBe(0);
    });

    it('rejects an oversize file (service MAX_UPLOAD_BYTES gate)', async () => {
      await http
        .post('/v1/scans')
        .send(initiateBody({ fileSizeBytes: MAX_UPLOAD_BYTES + 1 }))
        .expect(400);

      expect(scans.size).toBe(0);
    });

    it('rejects a zero/negative file size (DTO Min(1))', async () => {
      await http
        .post('/v1/scans')
        .send(initiateBody({ fileSizeBytes: 0 }))
        .expect(400);

      expect(scans.size).toBe(0);
    });

    it('rejects an unknown processing mode (DTO IsIn)', async () => {
      await http
        .post('/v1/scans')
        .send(initiateBody({ processingMode: 'turbo' }))
        .expect(400);

      expect(scans.size).toBe(0);
    });

    it('rejects missing fields and unknown body keys (whitelist + forbidNonWhitelisted)', async () => {
      await http.post('/v1/scans').send({ mediaType: 'image' }).expect(400);
      await http
        .post('/v1/scans')
        .send(initiateBody({ surprise: 'value' }))
        .expect(400);

      expect(scans.size).toBe(0);
    });
  });

  describe('POST /scans — signed-upload contract shape', () => {
    beforeEach(async () => {
      await boot(false);
    });

    it('returns the full initiate contract and persists the row with team scoping', async () => {
      const response = await http
        .post('/v1/scans')
        .send(initiateBody({ processingMode: 'deep' }))
        .expect(201);

      const body = response.body as Record<string, unknown>;

      expect(body.status).toBe('awaiting_upload');
      expect(body.bucket).toBe(UPLOADS_BUCKET);
      expect(typeof body.scanId).toBe('string');
      expect(body.path).toContain('evidence.png');
      expect(body.token).toBe('e2e-signed-upload-token');
      expect(body.signedUrl).toContain('http');

      const scanId = body.scanId as string;
      expect(body.path).toBe(`${USER.id}/${scanId}/evidence.png`);

      const stored = scans.get(scanId);
      expect(stored).toMatchObject({
        user_id: USER.id,
        status: 'awaiting_upload',
        processing_mode: 'deep',
        team_id: 'team_legal',
        original_filename: 'evidence.png',
        mime_type: 'image/png',
        file_size_bytes: 1024,
        storage_bucket: UPLOADS_BUCKET,
        storage_path: `${USER.id}/${scanId}/evidence.png`,
      });

      expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
        `${USER.id}/${scanId}/evidence.png`,
      );
    });

    it('defaults processing_mode to standard when omitted', async () => {
      const response = await http
        .post('/v1/scans')
        .send(initiateBody())
        .expect(201);

      const scanId = response.body.scanId as string;
      expect(scans.get(scanId)?.processing_mode).toBe('standard');
    });
  });

  describe('POST /scans/:scanId/submit — upload pre-flight', () => {
    beforeEach(async () => {
      await boot(false);
    });

    it('rejects with 400 when the asset has not been uploaded yet', async () => {
      const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
      const scanId = initiate.body.scanId as string;

      storage.info.mockResolvedValueOnce({
        data: null,
        error: { message: 'The resource was not found.' },
      });

      const response = await http.post(`/v1/scans/${scanId}/submit`).expect(400);
      expect(response.body.message).toContain('has not been uploaded yet');

      // The row stays awaiting_upload and nothing was enqueued.
      expect(scans.get(scanId)?.status).toBe('awaiting_upload');
      expect(queueOverride.enqueueScanProcessing).not.toHaveBeenCalled();
    });

    it('rejects with 404 for an unknown scan id', async () => {
      await http.post('/v1/scans/does-not-exist/submit').expect(404);
    });
  });

  describe('queue enqueue path (Redis configured)', () => {
    beforeEach(async () => {
      await boot(true);
    });

    it('enqueues the BullMQ job and leaves the scan queued (no inline fallback)', async () => {
      const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
      const scanId = initiate.body.scanId as string;

      const submit = await http.post(`/v1/scans/${scanId}/submit`).expect(202);
      expect(submit.body).toEqual({ scanId, status: 'queued' });

      expect(queueOverride.enqueueScanProcessing).toHaveBeenCalledWith(scanId);
      expect(scans.get(scanId)?.status).toBe('queued');

      // The upload-exists pre-flight still runs in the configured path.
      expect(storage.info).toHaveBeenCalled();

      // Give any (wrongly-started) inline processing a chance to complete —
      // the scan must stay queued when Redis owns the pipeline.
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(scans.get(scanId)?.status).toBe('queued');
    });

    it('does not enqueue when Redis is absent (inline fallback completes the scan)', async () => {
      // Boot an inline app for this test — the sibling suite above owns the
      // configured-mode app.
      await boot(false);

      const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
      const scanId = initiate.body.scanId as string;

      await http.post(`/v1/scans/${scanId}/submit`).expect(202);
      expect(queueOverride.enqueueScanProcessing).not.toHaveBeenCalled();

      const deadline = Date.now() + 4000;
      let status: string | undefined;
      while (Date.now() < deadline) {
        const response = await http.get(`/v1/scans/${scanId}`).expect(200);
        status = response.body.scan?.status as string | undefined;
        if (status === 'completed') break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(status).toBe('completed');
    });
  });
});
