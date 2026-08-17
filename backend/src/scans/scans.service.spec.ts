import {
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { InitiateScanDto } from './dto/initiate-scan.dto';
import { ScansService } from './scans.service';

// ---------------------------------------------------------------------------
// Test scaffolding — plain instantiation with a plan-based mock Supabase
// client, following the organization.service.spec.ts precedent. Each awaited
// query chain consumes one entry from the plan in call order; storage calls
// resolve through a fixed stub.
// ---------------------------------------------------------------------------

type PlannedResult = {
  data?: unknown;
  error?: unknown;
  count?: number;
};

function createConfigService() {
  return {
    // Return the fallback for every key so constructor defaults resolve.
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  } as unknown as ConfigService;
}

function createAdminClient(plan: PlannedResult[]) {
  let step = 0;
  const next = (): PlannedResult => {
    const result = plan[step++];
    if (result === undefined) {
      throw new Error('Mock query plan exhausted — plan/sequence mismatch');
    }
    return result;
  };

  const storageFrom = {
    createSignedUploadUrl: jest.fn(async () => ({
      data: {
        token: 'signed-upload-token',
        signedUrl: 'https://storage.example/upload',
      },
      error: null,
    })),
  };

  const builder = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
    not: jest.fn(() => builder),
    in: jest.fn(() => builder),
    like: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(next())),
    single: jest.fn(() => Promise.resolve(next())),
    // Directly-awaited chains resolve through the thenable contract.
    then(resolve: (value: PlannedResult) => void) {
      resolve(next());
      return undefined;
    },
    storage: {
      from: jest.fn(() => storageFrom),
    },
  } as const;

  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createSupabaseService(client: unknown) {
  return {
    getAdminClient: jest.fn(() => client),
  } as unknown as SupabaseService;
}

function createBillingService() {
  return {
    assertScanQuota: jest.fn(async () => undefined),
  };
}

function createService(client: unknown, config?: ConfigService) {
  return new ScansService(
    createSupabaseService(client),
    config ?? createConfigService(),
    undefined as never,
    createBillingService() as never,
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER: CurrentUserPayload = {
  id: 'user-1',
  email: 'user@example.com',
};

function initiateScanDto(
  overrides: Partial<InitiateScanDto> = {},
): InitiateScanDto {
  return {
    originalFilename: 'IMG_2026.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1024 * 1024,
    mediaType: 'image',
    ...overrides,
  } as InitiateScanDto;
}

function scanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'scan-1',
    user_id: 'user-1',
    status: 'queued',
    original_filename: 'IMG_2026.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: 1024 * 1024,
    storage_bucket: 'provance-uploads',
    storage_path: 'user-1/scan-1/IMG_2026.jpg',
    processing_mode: 'standard',
    team_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    result_payload: null,
    failure_reason: null,
    completed_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('ScansService', () => {
  describe('initiateScan', () => {
    it('rejects with 402 when the billing quota is exhausted', async () => {
      const client = createAdminClient([]);
      const billing = {
        assertScanQuota: jest.fn(async () => {
          throw new HttpException('', 402);
        }),
      };
      const service = new ScansService(
        createSupabaseService(client),
        createConfigService(),
        undefined as never,
        billing as never,
      );

      await expect(
        service.initiateScan(USER.id, initiateScanDto()),
      ).rejects.toMatchObject({ status: 402 });
      expect(client.from).not.toHaveBeenCalled();
      expect(billing.assertScanQuota).toHaveBeenCalledWith(USER.id);
    });

    it('rejects with 400 for unsupported media types', async () => {
      const client = createAdminClient([]);
      const service = createService(client);

      await expect(
        service.initiateScan(USER.id, initiateScanDto({ mediaType: 'video' as never })),
      ).rejects.toThrow(BadRequestException);
      expect(client.from).not.toHaveBeenCalled();
    });

    it('persists processingMode and the user team, and returns the upload contract', async () => {
      // 1: team resolution (maybeSingle) · 2: scan insert (thenable).
      const client = createAdminClient([
        { data: { team_id: 'team_legal' } },
        { data: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.initiateScan(
        USER.id,
        initiateScanDto({ processingMode: 'deep' }),
      );

      expect(result).toMatchObject({
        status: 'awaiting_upload',
        bucket: 'provance-uploads',
        token: 'signed-upload-token',
      });
      expect(typeof result.scanId).toBe('string');

      const insertPayload = (client as any).insert.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(insertPayload).toMatchObject({
        user_id: 'user-1',
        status: 'awaiting_upload',
        processing_mode: 'deep',
        team_id: 'team_legal',
        result_payload: null,
      });
    });

    it('defaults processing_mode to standard', async () => {
      const client = createAdminClient([
        { data: { team_id: 'team_product' } },
        { data: null, error: null },
      ]);
      const service = createService(client);

      await service.initiateScan(USER.id, initiateScanDto());

      const insertPayload = (client as any).insert.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(insertPayload.processing_mode).toBe('standard');
    });

    it('falls back to a null team when membership resolution errors', async () => {
      // 1: team lookup returns an error → resolveUserTeam returns null.
      // 2: scan insert still succeeds.
      const client = createAdminClient([
        { data: null, error: { message: 'relation does not exist' } },
        { data: null, error: null },
      ]);
      const service = createService(client);

      await expect(
        service.initiateScan(USER.id, initiateScanDto()),
      ).resolves.toMatchObject({ status: 'awaiting_upload' });

      const insertPayload = (client as any).insert.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(insertPayload.team_id).toBeNull();
    });

    it('rejects with 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(service.initiateScan(USER.id, initiateScanDto())).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('surfaces the missing-0009-columns hint when the insert fails with 42703', async () => {
      // 1: team resolution · 2: scan insert fails with a missing-column error
      // (the live symptom of an unapplied 0009 migration).
      const client = createAdminClient([
        { data: { team_id: null } },
        {
          data: null,
          error: {
            code: '42703',
            message: 'column scans.processing_mode does not exist',
          },
        },
      ]);
      const service = createService(client);

      await expect(
        service.initiateScan(USER.id, initiateScanDto()),
      ).rejects.toMatchObject({
        status: 503,
        message: expect.stringContaining('0009_scan_processing.sql'),
      });
    });

    it('reuses the existing reservation when the idempotency key matches an awaiting_upload scan', async () => {
      // 1: idempotency lookup (maybeSingle) — no team resolution, no insert.
      const client = createAdminClient([
        {
          data: {
            id: 'scan-1',
            status: 'awaiting_upload',
            storage_bucket: 'provance-uploads',
            storage_path: 'user-1/scan-1/IMG_2026.jpg',
          },
        },
      ]);
      const billing = {
        assertScanQuota: jest.fn(async () => undefined),
      };
      const service = new ScansService(
        createSupabaseService(client),
        createConfigService(),
        undefined as never,
        billing as never,
      );

      const result = await service.initiateScan(
        USER.id,
        initiateScanDto(),
        'idem-retry-001',
      );

      expect(result).toMatchObject({
        scanId: 'scan-1',
        status: 'awaiting_upload',
        bucket: 'provance-uploads',
        path: 'user-1/scan-1/IMG_2026.jpg',
        token: 'signed-upload-token',
      });
      // No insert and no quota consumption for a retried logical operation.
      expect((client as any).insert).not.toHaveBeenCalled();
      expect(billing.assertScanQuota).not.toHaveBeenCalled();
    });

    it('stores the idempotency key on insert', async () => {
      // 1: idempotency lookup misses · 2: team resolution · 3: scan insert.
      const client = createAdminClient([
        { data: null },
        { data: { team_id: 'team_legal' } },
        { data: null, error: null },
      ]);
      const service = createService(client);

      await service.initiateScan(
        USER.id,
        initiateScanDto(),
        'idem-abc-123',
      );

      const insertPayload = (client as any).insert.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(insertPayload.idempotency_key).toBe('idem-abc-123');
    });

    it('falls back to the winning row when a concurrent insert hits the 23505 unique violation', async () => {
      // 1: idempotency lookup misses · 2: team resolution · 3: insert rejected
      // by the partial unique index · 4: refetch by key returns the winner.
      const client = createAdminClient([
        { data: null },
        { data: { team_id: 'team_legal' } },
        {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        },
        {
          data: {
            id: 'scan-1',
            status: 'awaiting_upload',
            storage_bucket: 'provance-uploads',
            storage_path: 'user-1/scan-1/IMG_2026.jpg',
          },
        },
      ]);
      const service = createService(client);

      const result = await service.initiateScan(
        USER.id,
        initiateScanDto(),
        'idem-race-001',
      );

      expect(result.scanId).toBe('scan-1');
    });

    it('rejects an over-long idempotency key before touching the database', async () => {
      const client = createAdminClient([]);
      const service = createService(client);

      await expect(
        service.initiateScan(USER.id, initiateScanDto(), 'x'.repeat(129)),
      ).rejects.toThrow(BadRequestException);
      expect((client as any).from).not.toHaveBeenCalled();
    });

    it('names migration 0019 when the idempotency_key column is missing', async () => {
      // The idempotency lookup itself 42703s when 0019 is not applied — the
      // hint must name the right migration, not blame 0009.
      const client = createAdminClient([
        {
          data: null,
          error: {
            code: '42703',
            message: 'column scans.idempotency_key does not exist',
          },
        },
      ]);
      const service = createService(client);

      await expect(
        service.initiateScan(USER.id, initiateScanDto(), 'idem-missing-col'),
      ).rejects.toMatchObject({
        status: 503,
        message: expect.stringContaining('0019_scan_idempotency.sql'),
      });
    });
  });

  describe('getQueueSnapshot', () => {
    it('counts queued/processing/failed and averages completed durations', async () => {
      const client = createAdminClient([
        {
          data: [
            { status: 'queued', result_payload: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
            { status: 'queued', result_payload: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
            { status: 'processing', result_payload: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
            { status: 'failed', result_payload: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
            // Explicit processing duration wins over wall-clock diff.
            {
              status: 'complete',
              result_payload: { metadata: { total_processing_time_ms: 1200 } },
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:02.000Z',
            },
            // No explicit duration → created→updated wall-clock difference.
            {
              status: 'complete',
              result_payload: { metadata: {} },
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:05.000Z',
            },
          ],
        },
      ]);
      const service = createService(client);

      const result = await service.getQueueSnapshot(USER.id);

      expect(result).toEqual({
        queued: 2,
        processing: 1,
        failed: 1,
        avg_processing_time_ms: 3100,
      });
    });

    it('returns a null average when there are no completed scans', async () => {
      const client = createAdminClient([
        {
          data: [
            { status: 'queued', result_payload: null, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
          ],
        },
      ]);
      const service = createService(client);

      const result = await service.getQueueSnapshot(USER.id);

      expect(result).toEqual({
        queued: 1,
        processing: 0,
        failed: 0,
        avg_processing_time_ms: null,
      });
    });

    it('rejects with 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(service.getQueueSnapshot(USER.id)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('scan deduplication (approved feature)', () => {
    // The dedup helpers are private — drive them through the same cast
    // escape hatch the analysis-pipeline spec uses for buildAnalysisResultPayload.
    function dedupHelpers(service: ScansService) {
      return service as unknown as {
        findCompletedScanByHash: (
          client: unknown,
          userId: string,
          sha256: string,
          excludeScanId: string,
        ) => Promise<{ id: string; result_payload: unknown } | null>;
        buildDeduplicatedPayload: (
          prior: { id: string; result_payload: unknown },
          scan: Record<string, unknown>,
          sha256: string,
          analysisTimestamp: string,
        ) => Record<string, unknown>;
      };
    }

    it('finds a prior completed scan by user + hash, excluding the current scan', async () => {
      const priorRow = {
        id: 'scan-0',
        result_payload: { verdict: { class: 'suspicious' } },
      };
      const client = createAdminClient([
        { data: priorRow, error: null },
      ]);
      const service = createService(client);

      const result = await dedupHelpers(service).findCompletedScanByHash(
        client,
        'user-1',
        'abc123',
        'scan-9',
      );

      expect(result).toEqual(priorRow);
      expect(client.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(client.eq).toHaveBeenCalledWith('file_hash_sha256', 'abc123');
      expect(client.eq).toHaveBeenCalledWith('status', 'complete');
      expect(client.neq).toHaveBeenCalledWith('id', 'scan-9');
    });

    it('returns null when no prior scan matches', async () => {
      const client = createAdminClient([{ data: null, error: null }]);
      const service = createService(client);

      const result = await dedupHelpers(service).findCompletedScanByHash(
        client,
        'user-1',
        'abc123',
        'scan-9',
      );

      expect(result).toBeNull();
    });

    it('degrades to null when the hash column is missing (migration 0013 not applied)', async () => {
      const client = createAdminClient([
        { data: null, error: { code: '42703', message: 'column file_hash_sha256 does not exist' } },
      ]);
      const service = createService(client);

      const result = await dedupHelpers(service).findCompletedScanByHash(
        client,
        'user-1',
        'abc123',
        'scan-9',
      );

      // Best-effort: dedup is skipped, normal processing continues.
      expect(result).toBeNull();
    });

    it('builds a reused payload with a regenerated report id and deduplicated_from marker', () => {
      const service = createService(createAdminClient([]));
      const prior = {
        id: 'scan-0',
        result_payload: {
          verdict: { class: 'likely_authentic', confidence: 91 },
          media: { sha256: 'old-hash', width: 1920 },
          report: {
            report_id: 'PRV-OLDREPORT',
            report_url: 'https://app.example/app/reports/scan-0/print',
          },
          signals: [{ model: 'integrity-v1' }],
        },
      };

      const result = dedupHelpers(service).buildDeduplicatedPayload(
        prior,
        scanRow({ id: 'scan-1' }),
        'new-sha256',
        '2026-08-08T12:00:00.000Z',
      );

      // Verdict and signals carry over untouched.
      expect(result.verdict).toEqual({ class: 'likely_authentic', confidence: 91 });
      expect(result.signals).toEqual([{ model: 'integrity-v1' }]);
      // Report identity regenerated for the new scan.
      expect(result.report.report_id).toBe('PRV-SCAN-1');
      expect(result.report.generated_at).toBe('2026-08-08T12:00:00.000Z');
      // report_url points at the new scan's print page.
      expect(result.report.report_url).toBe(
        'https://app.example/app/reports/scan-1/print',
      );
      // Media hash refreshed; the reuse marker records the source.
      expect(result.media.sha256).toBe('new-sha256');
      expect(result.deduplicated_from).toEqual({
        source_scan_id: 'scan-0',
        source_report_id: 'PRV-OLDREPORT',
        reused_at: '2026-08-08T12:00:00.000Z',
      });
    });
  });

  describe('listScans — row shaping + pagination envelope', () => {
    it('emits the mock row dialect: completed status, flat verdict, flat report_id', async () => {
      const client = createAdminClient([
        {
          data: [
            scanRow({
              status: 'complete',
              processing_mode: 'deep',
              team_id: 'team_legal',
              completed_at: '2026-01-01T00:01:00.000Z',
              result_payload: {
                verdict: { class: 'likely_authentic' },
                report: { report_id: 'PRV-ABC123' },
              },
            }),
            scanRow({ status: 'queued', processing_mode: 'quick' }),
          ],
        },
        { count: 2 },
      ]);
      const service = createService(client);

      const result = await service.listScans(USER.id);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(100);
      expect(result.totalPages).toBe(1);

      const complete = result.data[0] as Record<string, unknown>;
      expect(complete.status).toBe('completed');
      expect(complete.verdict).toBe('authentic');
      expect(complete.processing_mode).toBe('deep');
      expect(complete.team_id).toBe('team_legal');
      expect(complete.completed_at).toBe('2026-01-01T00:01:00.000Z');
      expect((complete.result_payload as { report_id: string }).report_id).toBe(
        'PRV-ABC123',
      );

      const queued = result.data[1] as Record<string, unknown>;
      expect(queued.status).toBe('queued');
      expect(queued.verdict).toBeNull();
      expect(queued.result_payload).toBeNull();
    });

    it('rejects with 503 when the scan query fails', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'db down' } },
      ]);
      const service = createService(client);

      await expect(service.listScans(USER.id)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('clamps page/pageSize and computes totalPages from the exact count', async () => {
      const client = createAdminClient([
        {
          data: [
            scanRow({ status: 'complete' }),
            scanRow({ status: 'queued' }),
          ],
        },
        { count: 5 },
      ]);
      const service = createService(client);

      const result = await service.listScans(USER.id, {
        page: 2,
        pageSize: 2,
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });

    it('clamps degenerate page/pageSize inputs', async () => {
      const client = createAdminClient([{ data: [] }, { count: 0 }]);
      const service = createService(client);

      const result = await service.listScans(USER.id, {
        page: 0,
        pageSize: 9999,
      });

      // page 0 → 1; pageSize 9999 → 500; empty feed → totalPages 1.
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(500);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('markScanFailed — terminal failure audit', () => {
    it('writes a scan.failed audit row attributed to the scan owner', async () => {
      const client = createAdminClient([
        // getScanByIdOrThrow → the row being failed.
        { data: scanRow({ status: 'processing' }), error: null },
        // updateScan → failed write resolves.
        { data: null, error: null },
        // Owner email lookup succeeds.
        { data: { email: 'owner@example.com' }, error: null },
        // Audit insert resolves.
        { data: null, error: null },
      ]);
      const service = createService(client);

      await service.markScanFailed('scan-1', 'download failed');

      // No attempts passed → neutral defaults (1 burned of 3 max) ride through
      // so the admin payload always has a real number.
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          failure_reason: 'download failed',
          attempts_made: 1,
          max_attempts: 3,
        }),
      );
      expect(client.insert).toHaveBeenCalledWith({
        actor_email: 'owner@example.com',
        action: 'scan.failed',
        severity: 'high',
        entity_type: 'scan',
        entity_id: 'scan-1',
        details: {
          failure_reason: 'download failed',
          attempts_made: 1,
          max_attempts: 3,
        },
      });
    });

    it('persists the BullMQ attemptsMade/maxAttempts into the row and audit details', async () => {
      const client = createAdminClient([
        { data: scanRow({ status: 'processing' }), error: null },
        { data: null, error: null },
        { data: { email: 'owner@example.com' }, error: null },
        { data: null, error: null },
      ]);
      const service = createService(client);

      await service.markScanFailed('scan-1', 'Model 502', {
        attemptsMade: 3,
        maxAttempts: 3,
      });

      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          failure_reason: 'Model 502',
          attempts_made: 3,
          max_attempts: 3,
        }),
      );
      expect(client.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            failure_reason: 'Model 502',
            attempts_made: 3,
            max_attempts: 3,
          },
        }),
      );
    });

    it('falls back to the system actor when the owner email is unresolvable', async () => {
      const client = createAdminClient([
        { data: scanRow({ status: 'processing' }), error: null },
        { data: null, error: null },
        // Owner lookup returns no profile (or a profile without an email).
        { data: null, error: null },
        { data: null, error: null },
      ]);
      const service = createService(client);

      await service.markScanFailed('scan-1', 'boom');

      const insertPayload = (client.insert as jest.Mock).mock.calls[0][0];
      expect(insertPayload.actor_email).toBe('system');
      expect(insertPayload.action).toBe('scan.failed');
    });

    it('never breaks the terminal failed write when the audit insert fails', async () => {
      const client = createAdminClient([
        { data: scanRow({ status: 'processing' }), error: null },
        { data: null, error: null },
        { data: { email: 'owner@example.com' }, error: null },
        { error: { message: 'relation "audit_logs" does not exist' } },
      ]);
      const service = createService(client);

      await expect(service.markScanFailed('scan-1', 'boom')).resolves.toBeUndefined();
    });

    it('does not audit when the scan is already terminal (no downgrade)', async () => {
      const client = createAdminClient([
        // The row is already complete — markScanFailed must return early
        // without an update, a profile lookup, or an audit insert.
        { data: scanRow({ status: 'complete' }), error: null },
      ]);
      const service = createService(client);

      await service.markScanFailed('scan-1', 'boom');

      expect(client.insert).not.toHaveBeenCalled();
    });
  });
});
