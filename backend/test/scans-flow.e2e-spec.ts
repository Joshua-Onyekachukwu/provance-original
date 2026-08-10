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
import { ScansService } from '../src/scans/scans.service';
import { SupabaseService } from '../src/supabase/supabase.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = {
  id: 'e2e-user-0000-0000-0000-000000000001',
  email: 'e2e.user@provance.test',
};

const OTHER_USER_ID = 'e2e-user-0000-0000-0000-000000000002';

// The uploads bucket default (SUPABASE_UPLOADS_BUCKET fallback in ScansService).
const UPLOADS_BUCKET = 'provance-uploads';

// A 1×1 transparent PNG so the real inline processing pipeline (Jimp decode +
// exifr metadata parse) produces a genuine result_payload rather than an error
// path. PNG signature: 89 50 4E 47.
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// ---------------------------------------------------------------------------
// Stateful in-memory Supabase mock
//
// Unlike the plan-based mock used in unit specs, the e2e flow spans multiple
// HTTP requests with asynchronous inline processing, so the mock stores rows
// in memory and serves them back as the flow mutates them:
//
//   - from(table).insert(payload)   → stored immediately (thenable resolve)
//   - from(table).update(u).eq(id)  → merged into the stored row (thenable)
//   - from(table).select(...).eq(...).maybeSingle()
//                                   → resolves the row matching id + user_id
//   - from('organization_members')  → fixed active membership for team scoping
//   - storage.from(bucket).*        → fixed signed-URL / info / download stubs
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
      // Team resolution: the org-members table returns the user's active team.
      // The table name mirrors ScansService's SUPABASE_ORGANIZATION_MEMBERS_TABLE
      // default ('organization_members'); if that env override ever changes, the
      // e2e env must match it here too.
      if (state.table === 'organization_members') {
        return { data: { team_id: 'team_legal' }, error: null };
      }

      const row = findScan(state.filters);
      return { data: row ? { ...row } : null, error: null };
    }),
    // Directly-awaited chains (insert / update) resolve through the thenable
    // contract and mutate the in-memory store before resolving.
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
// App scaffolding
// ---------------------------------------------------------------------------

async function createTestApp(queueConfigured = false) {
  const mocked = createStatefulAdminClient();

  const queueOverride = {
    // queueConfigured=false → no Redis, force the inline processing path.
    // queueConfigured=true  → BullMQ enqueue path; the worker is simulated by
    // calling ScansService.processQueuedScan directly (see the BullMQ block).
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

async function waitForScanStatus(
  http: ReturnType<typeof request>,
  scanId: string,
  expectedStatus: string,
  timeoutMs = 5000,
) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus: string | undefined;

  while (Date.now() < deadline) {
    const response = await http
      .get(`/v1/scans/${scanId}`)
      .expect(200);
    lastStatus = response.body.scan?.status as string | undefined;

    if (lastStatus === expectedStatus) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    `Scan ${scanId} did not reach ${expectedStatus} within ${timeoutMs}ms (last status: ${lastStatus ?? 'none'}).`,
  );
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('Scan flow (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let scans: Map<string, ScanRow>;
  let storage: ReturnType<typeof createStatefulAdminClient>['storage'];

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
    http = request(app.getHttpServer());
    scans = setup.scans;
    storage = setup.storage;
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs the full lifecycle: initiate → signed URL → submit → inline processing → report payload', async () => {
    // 1. Initiate — creates an awaiting_upload scan row and a signed upload URL.
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);

    expect(initiate.body).toMatchObject({
      status: 'awaiting_upload',
      bucket: UPLOADS_BUCKET,
    });
    expect(initiate.body.scanId).toEqual(expect.any(String));
    expect(initiate.body.path).toContain('evidence.png');
    expect(initiate.body.token).toBe('e2e-signed-upload-token');
    expect(initiate.body.signedUrl).toContain('http');

    const scanId = initiate.body.scanId as string;
    const stored = scans.get(scanId);
    expect(stored).toMatchObject({
      user_id: USER.id,
      status: 'awaiting_upload',
      processing_mode: 'standard',
      team_id: 'team_legal',
      original_filename: 'evidence.png',
      mime_type: 'image/png',
    });
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringContaining(`/${scanId}/evidence.png`),
    );

    // 2. Submit — the upload-exists pre-flight passes and the scan is queued,
    //    then inline processing runs (no Redis) and completes asynchronously.
    const submit = await http.post(`/v1/scans/${scanId}/submit`).expect(202);
    expect(submit.body).toEqual({ scanId, status: 'queued' });
    expect(storage.info).toHaveBeenCalledWith(expect.stringContaining('evidence.png'));

    // 3. Wait for the inline pipeline: queued → processing → completed.
    const completed = await waitForScanStatus(http, scanId, 'completed');
    const scan = completed.body.scan;

    expect(scan.status).toBe('completed');
    expect(scan.verdict).toBeDefined();
    expect(scan.asset_preview_url).toBe('https://storage.e2e/preview');

    const payload = scan.result_payload;
    expect(payload).toBeDefined();
    expect(payload.verdict.class).toBeDefined();
    expect(payload.signals).toHaveLength(4);
    expect(payload.media).toMatchObject({
      original_filename: 'evidence.png',
      mime_type: 'image/png',
      sha256: expect.any(String),
    });
    expect(payload.media.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.metadata.total_processing_time_ms).toEqual(
      expect.any(Number),
    );
    expect(payload.report.report_id).toMatch(/^PRV-/);

    // 4. Report payload — the stored result_payload is served as a document.
    const report = await http.get(`/v1/reports/${scanId}`).expect(200);
    expect(report.body.report.scan_id).toBe(scanId);
    expect(report.body.report.result_payload.verdict.class).toBe(
      payload.verdict.class,
    );
    expect(report.body.report.document).toBeDefined();
    expect(report.body.report.document.cover).toBeDefined();
    expect(report.body.report.document.aiDetectionResults).toBeDefined();
    expect(report.body.report.document.metrics).toHaveLength(6);
  });

  it('serves a server-generated PDF artifact for the completed scan', async () => {
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
    const scanId = initiate.body.scanId as string;

    await http.post(`/v1/scans/${scanId}/submit`).expect(202);
    await waitForScanStatus(http, scanId, 'completed');

    const pdf = await http.get(`/v1/reports/${scanId}/pdf`).expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.headers['content-disposition']).toContain(
      `provance-report-${scanId}.pdf`,
    );
    const pdfHead = pdf.body.toString('latin1', 0, 5);
    expect(pdfHead).toBe('%PDF-');
  });

  it('rejects invalid DTOs and disallowed mime types with 400', async () => {
    // DTO layer: mediaType is constrained to 'image' by the ValidationPipe.
    await http
      .post('/v1/scans')
      .send(initiateBody({ mediaType: 'video' }))
      .expect(400);

    // Service layer: video/mp4 passes DTO validation but fails the service
    // allow-list (ALLOWED_UPLOAD_MIME_TYPES), which the pipe cannot see.
    await http
      .post('/v1/scans')
      .send(initiateBody({ mimeType: 'video/mp4' }))
      .expect(400);
  });

  it('rejects submit with 400 when the uploaded asset does not exist', async () => {
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
    const scanId = initiate.body.scanId as string;

    storage.info.mockResolvedValueOnce({
      data: null,
      error: { message: 'The resource was not found.' },
    });

    const response = await http.post(`/v1/scans/${scanId}/submit`).expect(400);
    expect(response.body.message).toContain('has not been uploaded yet');

    // The scan stays awaiting_upload — nothing was queued.
    expect(scans.get(scanId)?.status).toBe('awaiting_upload');
  });

  it('rejects submit with 400 when the scan is not awaiting upload', async () => {
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
    const scanId = initiate.body.scanId as string;

    await http.post(`/v1/scans/${scanId}/submit`).expect(202);
    await waitForScanStatus(http, scanId, 'completed');

    // A second submit targets a completed scan → 400.
    const response = await http.post(`/v1/scans/${scanId}/submit`).expect(400);
    expect(response.body.message).toContain('not ready to be submitted');
  });

  it('returns 404 for a report that is not ready yet', async () => {
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
    const scanId = initiate.body.scanId as string;

    const response = await http.get(`/v1/reports/${scanId}`).expect(404);
    expect(response.body.message).toContain('not ready yet');
  });

  it('scopes scans and reports to the owning user (404 for foreign rows)', async () => {
    // Seed a scan owned by a different user directly in the mock store.
    scans.set('foreign-scan-1', {
      id: 'foreign-scan-1',
      user_id: OTHER_USER_ID,
      status: 'complete',
      original_filename: 'other-user.png',
      mime_type: 'image/png',
      file_size_bytes: 2048,
      storage_bucket: UPLOADS_BUCKET,
      storage_path: `${OTHER_USER_ID}/foreign-scan-1/other-user.png`,
      processing_mode: 'standard',
      team_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      result_payload: { verdict: { class: 'suspicious' } },
      failure_reason: null,
      completed_at: '2026-01-01T00:00:01.000Z',
    });

    await http.get('/v1/scans/foreign-scan-1').expect(404);
    await http.get('/v1/reports/foreign-scan-1').expect(404);
  });
});

// ---------------------------------------------------------------------------
// BullMQ enqueue path — QueueService.isConfigured() returns true, so submit
// enqueues a BullMQ job instead of inline-processing. The worker itself is
// simulated by calling ScansService.processQueuedScan(scanId) directly — the
// exact entry point the real worker (backend/src/worker.ts) invokes from the
// 'process-scan' job handler.
// ---------------------------------------------------------------------------

describe('Scan flow with BullMQ enqueue (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let scans: Map<string, ScanRow>;
  let queueOverride: {
    isConfigured: jest.Mock<boolean>;
    enqueueScanProcessing: jest.Mock;
  };
  let scansService: ScansService;

  beforeEach(async () => {
    const setup = await createTestApp(true);
    app = setup.app;
    http = request(app.getHttpServer());
    scans = setup.scans;
    queueOverride = setup.queueOverride;
    scansService = app.get(ScansService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('enqueues the BullMQ job on submit and does not inline-process', async () => {
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
    const scanId = initiate.body.scanId as string;

    const submit = await http.post(`/v1/scans/${scanId}/submit`).expect(202);
    expect(submit.body).toEqual({ scanId, status: 'queued' });

    // The enqueue call carries the scan id, and the row is left queued.
    expect(queueOverride.enqueueScanProcessing).toHaveBeenCalledWith(scanId);
    expect(scans.get(scanId)?.status).toBe('queued');

    // Give any (wrongly-started) inline processing a chance to complete —
    // the scan must stay queued with no payload while Redis owns the pipeline.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(scans.get(scanId)?.status).toBe('queued');
    expect(scans.get(scanId)?.result_payload).toBeFalsy();
  });

  it('processQueuedScan (worker entry point) drives queued → processing → completed with the full payload', async () => {
    const initiate = await http.post('/v1/scans').send(initiateBody()).expect(201);
    const scanId = initiate.body.scanId as string;

    await http.post(`/v1/scans/${scanId}/submit`).expect(202);
    expect(scans.get(scanId)?.status).toBe('queued');

    // Simulate the BullMQ worker consuming the 'process-scan' job.
    await scansService.processQueuedScan(scanId);

    const completed = await waitForScanStatus(http, scanId, 'completed');
    const scan = completed.body.scan;

    expect(scan.status).toBe('completed');
    expect(scan.verdict).toBeDefined();
    expect(scan.asset_preview_url).toBe('https://storage.e2e/preview');

    const payload = scan.result_payload;
    expect(payload).toBeDefined();
    expect(payload.verdict.class).toBeDefined();
    expect(payload.signals).toHaveLength(4);
    expect(payload.media).toMatchObject({
      original_filename: 'evidence.png',
      mime_type: 'image/png',
      sha256: expect.any(String),
    });
    expect(payload.media.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.metadata.total_processing_time_ms).toEqual(
      expect.any(Number),
    );
    expect(payload.report.report_id).toMatch(/^PRV-/);
  });
});
