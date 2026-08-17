import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import * as exifr from 'exifr';
import { Jimp } from 'jimp';
import { BillingService } from '../billing/billing.service';
import { auditSeverity } from '../common/audit-severity';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';
import { InitiateScanDto } from './dto/initiate-scan.dto';
import { ScanStatus } from './scans.types';

type ScanRow = {
  id: string;
  user_id: string;
  status: ScanStatus;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  result_payload: unknown | null;
  failure_reason: string | null;
  processing_mode: string;
  team_id: string | null;
  completed_at: string | null;
};

type QueueSnapshot = {
  queued: number;
  processing: number;
  failed: number;
  avg_processing_time_ms: number | null;
};

// The mock scan rows the frontend consumes carry verdicts in the display
// dialect ('authentic' / 'suspicious' / 'inconclusive'), while the analysis
// payload emits verdict classes ('likely_authentic' / 'suspicious' /
// 'inconclusive'). Map at the API boundary so list/get shapes match the mock
// exactly.
const VERDICT_CLASS_TO_DISPLAY: Record<string, string> = {
  likely_authentic: 'authentic',
  suspicious: 'suspicious',
  inconclusive: 'inconclusive',
};

type ImageStats = {
  width: number;
  height: number;
  averageLuminance: number;
  luminanceStdDev: number;
  saturationMean: number;
  edgeDensity: number;
  entropy: number;
  blockiness: number;
};

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);
  private readonly scansTable: string;
  private readonly orgMembersTable: string;
  private readonly uploadsBucket: string;
  private readonly maxUploadBytes: number;
  private readonly allowedMimeTypes: Set<string>;
  private readonly auditTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly billingService: BillingService,
  ) {
    this.scansTable = this.configService.get<string>('SUPABASE_SCANS_TABLE', 'scans');
    this.orgMembersTable = this.configService.get<string>(
      'SUPABASE_ORGANIZATION_MEMBERS_TABLE',
      'organization_members',
    );
    this.uploadsBucket = this.configService.get<string>(
      'SUPABASE_UPLOADS_BUCKET',
      'provance-uploads',
    );
    this.maxUploadBytes = this.configService.get<number>(
      'MAX_UPLOAD_BYTES',
      50 * 1024 * 1024,
    );
    const mimeList = this.configService.get<string>(
      'ALLOWED_UPLOAD_MIME_TYPES',
      'image/jpeg,image/png,image/webp,image/gif',
    );
    this.allowedMimeTypes = new Set(
      mimeList
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    this.auditTable = this.configService.get<string>(
      'SUPABASE_AUDIT_LOGS_TABLE',
      'audit_logs',
    );
  }

  async initiateScan(
    userId: string,
    dto: InitiateScanDto,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey && idempotencyKey.length > 128) {
      throw new BadRequestException(
        'Idempotency-Key is too long (max 128 characters).',
      );
    }

    if (dto.mediaType !== 'image') {
      throw new BadRequestException('Only image uploads are supported right now.');
    }

    if (!this.allowedMimeTypes.has(dto.mimeType)) {
      throw new BadRequestException('Unsupported file type.');
    }

    if (dto.fileSizeBytes > this.maxUploadBytes) {
      throw new BadRequestException('File exceeds the maximum allowed size.');
    }

    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    // Idempotency: a retried initiate with the same key returns the original
    // reservation (a fresh upload token for the same storage path) instead of
    // creating a duplicate scan row. The lookup is scoped to awaiting_upload
    // rows — the partial unique index's window — so the same key issued after
    // submission starts a fresh record. Skipping the quota gate here matters:
    // the retry is the same logical operation, not a new scan.
    if (idempotencyKey) {
      const existing = await this.findScanByIdempotencyKey(
        adminClient,
        userId,
        idempotencyKey,
      );
      if (existing) {
        this.logger.log(
          `Initiate retried with idempotency key ${idempotencyKey} — reusing scan ${existing.id}.`,
        );
        return this.buildUploadContract(adminClient, existing);
      }
    }

    // Per-plan scan quota gate: reject with 402 (Retry-After on the response)
    // before any record is created when the current cycle's allowance is spent.
    await this.billingService.assertScanQuota(userId);

    const scanId = randomUUID();
    const storagePath = `${userId}/${scanId}/${sanitizeFilename(dto.originalFilename)}`;
    const now = new Date().toISOString();
    const teamId = await this.resolveUserTeam(adminClient, userId);

    const { error: insertError } = await adminClient.from(this.scansTable).insert({
      id: scanId,
      user_id: userId,
      status: 'awaiting_upload',
      original_filename: dto.originalFilename,
      mime_type: dto.mimeType,
      file_size_bytes: dto.fileSizeBytes,
      storage_bucket: this.uploadsBucket,
      storage_path: storagePath,
      processing_mode: dto.processingMode ?? 'standard',
      team_id: teamId,
      idempotency_key: idempotencyKey ?? null,
      result_payload: null,
      failure_reason: null,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      // Two concurrent initiates with the same key can both miss the lookup
      // above; the partial unique index rejects the second insert with 23505.
      // Fall back to the winner's row instead of failing the retry.
      if (insertError.code === '23505' && idempotencyKey) {
        const winner = await this.findScanByIdempotencyKey(
          adminClient,
          userId,
          idempotencyKey,
        );
        if (winner) {
          this.logger.warn(
            `Concurrent initiate with key ${idempotencyKey} — reusing scan ${winner.id}.`,
          );
          return this.buildUploadContract(adminClient, winner);
        }
      }

      throw new ServiceUnavailableException(
        this.schemaErrorHint(insertError, 'Failed to create scan record.'),
      );
    }

    return this.buildUploadContract(adminClient, {
      id: scanId,
      storage_bucket: this.uploadsBucket,
      storage_path: storagePath,
    });
  }

  /**
   * findScanByIdempotencyKey — the awaiting_upload window lookup backing the
   * Idempotency-Key guarantee on initiateScan. Scoped to the same predicate as
   * the scans_user_idempotency_awaiting_idx partial index.
   */
  private async findScanByIdempotencyKey(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    userId: string,
    idempotencyKey: string,
  ) {
    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('id,status,storage_bucket,storage_path')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'awaiting_upload')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        this.schemaErrorHint(error, 'Failed to check for an existing scan.'),
      );
    }

    return data as {
      id: string;
      status: string;
      storage_bucket: string;
      storage_path: string;
    } | null;
  }

  /**
   * buildUploadContract — mints the signed upload URL for a scan and returns
   * the initiate response shape shared by the fresh-insert and idempotency
   * paths (so a retried initiate returns an identical contract).
   */
  private async buildUploadContract(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: { id: string; storage_bucket: string; storage_path: string },
  ) {
    const { data: signedUploadData, error: signedUploadError } =
      await adminClient.storage
        .from(scan.storage_bucket)
        .createSignedUploadUrl(scan.storage_path);

    if (signedUploadError || !signedUploadData) {
      throw new ServiceUnavailableException('Failed to prepare upload URL.');
    }

    return {
      scanId: scan.id,
      status: 'awaiting_upload' as const,
      bucket: scan.storage_bucket,
      path: scan.storage_path,
      token: signedUploadData.token,
      signedUrl: signedUploadData.signedUrl,
    };
  }

  async submitScan(userId: string, scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanOrThrow(adminClient, userId, scanId);

    if (scan.status !== 'awaiting_upload') {
      throw new BadRequestException('Scan is not ready to be submitted.');
    }

    const assetExists = await this.assetExists(adminClient, scan);

    if (!assetExists) {
      throw new BadRequestException(
        'The file has not been uploaded yet. Upload the asset before submitting the scan.',
      );
    }

    await this.updateScan(adminClient, scanId, {
      status: 'queued',
      updated_at: new Date().toISOString(),
    });

    if (this.queueService.isConfigured()) {
      await this.queueService.enqueueScanProcessing(scanId);
    } else {
      // Inline path (no Redis): runScanProcessing rethrows on failure, so this
      // catch marks the row failed. Best-effort — if persisting the failure
      // itself fails (Supabase down), log and move on; there is no retry tier
      // in inline mode.
      void this.runScanProcessing(adminClient, scan).catch((error) => {
        const reason = error instanceof Error ? error.message : 'Unknown error.';
        void this.markScanFailed(scan.id, reason).catch((markError) => {
          this.logger.error(
            `Failed to persist failed status for scan ${scan.id}: ${markError instanceof Error ? markError.message : 'unknown error'}`,
          );
        });
      });
    }

    return { scanId, status: 'queued' as const };
  }

  async listScans(
    userId: string,
    pagination: { page?: number; pageSize?: number } = {},
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const safePage = Math.max(1, pagination.page ?? 1);
    const safePageSize = Math.min(500, Math.max(1, pagination.pageSize ?? 100));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    const { data, error } = await adminClient
      .from(this.scansTable)
      .select(
        'id,status,original_filename,mime_type,file_size_bytes,processing_mode,team_id,completed_at,created_at,updated_at,failure_reason,result_payload',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scans.');
    }

    const { count } = await adminClient
      .from(this.scansTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const rows = (data ?? []).map(toFrontendScanRow);
    const total = count ?? rows.length;

    // Standard { data, page, pageSize, total, totalPages } envelope (see
    // docs/engineering/API_DESIGN_STANDARDS.md §3.2). The `scans` alias is
    // gone — every frontend consumer reads `.data`.
    return {
      data: rows,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async getScan(userId: string, scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanOrThrow(adminClient, userId, scanId);
    const previewUrl =
      scan.storage_bucket && scan.storage_path
        ? await this.createAssetPreviewUrl(
            adminClient,
            scan.storage_bucket,
            scan.storage_path,
          )
        : null;

    return {
      scan: {
        ...toFrontendScanRow(scan),
        asset_preview_url: previewUrl,
      },
    };
  }

  async processQueuedScan(scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanByIdOrThrow(adminClient, scanId);
    await this.runScanProcessing(adminClient, scan);
  }

  /**
   * Queue posture for the current user's scans: queued/processing/failed
   * counts plus the average processing duration of completed scans (explicit
   * result_payload.metadata.total_processing_time_ms when present, otherwise
   * the created→completed wall-clock difference). Matches the mock
   * { queued, processing, failed, avg_processing_time_ms } contract.
   */
  async getQueueSnapshot(userId: string): Promise<QueueSnapshot> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('status,result_payload,created_at,updated_at')
      .eq('user_id', userId);

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch queue snapshot.');
    }

    const rows = data ?? [];
    const queued = rows.filter((row) => row.status === 'queued').length;
    const processing = rows.filter((row) => row.status === 'processing').length;
    const failed = rows.filter((row) => row.status === 'failed').length;
    const durations: number[] = [];

    for (const row of rows) {
      if (row.status !== 'complete') {
        continue;
      }

      const payload = row.result_payload as
        | { metadata?: { total_processing_time_ms?: number } }
        | null
        | undefined;
      const explicit = Number(payload?.metadata?.total_processing_time_ms);
      const created = new Date(row.created_at).getTime();
      const updated = new Date(row.updated_at).getTime();

      if (Number.isFinite(explicit) && explicit >= 0) {
        durations.push(explicit);
      } else if (
        Number.isFinite(created) &&
        Number.isFinite(updated) &&
        updated >= created
      ) {
        durations.push(updated - created);
      }
    }

    const avg =
      durations.length > 0
        ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
        : null;

    return { queued, processing, failed, avg_processing_time_ms: avg };
  }

  /**
   * Best-effort resolution of the user's default team from an active org
   * membership. Never throws: scan creation must not depend on the org tables
   * existing (fresh databases with only 0002 applied) or on membership data
   * being present.
   */
  private async resolveUserTeam(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    userId: string,
  ): Promise<string | null> {
    try {
      const { data, error } = await adminClient
        .from(this.orgMembersTable)
        .select('team_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .not('team_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.warn(
          `Team resolution failed for user ${userId}: ${error.message}`,
        );
        return null;
      }

      return typeof data?.team_id === 'string' ? data.team_id : null;
    } catch (error) {
      this.logger.warn(
        `Team resolution skipped for user ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  private async getScanOrThrow(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    userId: string,
    scanId: string,
  ): Promise<ScanRow> {
    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scan.');
    }

    if (!data) {
      throw new NotFoundException('Scan not found.');
    }

    return data as ScanRow;
  }

  private async getScanByIdOrThrow(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scanId: string,
  ): Promise<ScanRow> {
    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('*')
      .eq('id', scanId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scan.');
    }

    if (!data) {
      throw new NotFoundException('Scan not found.');
    }

    return data as ScanRow;
  }

  private async updateScan(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scanId: string,
    updates: Record<string, unknown>,
  ) {
    const { error } = await adminClient
      .from(this.scansTable)
      .update(updates)
      .eq('id', scanId);

    if (error) {
      throw new ServiceUnavailableException(
        this.schemaErrorHint(error, 'Failed to update scan.'),
      );
    }
  }

  /**
   * schemaErrorHint — surfaces an actionable message when a Supabase error
   * means the scans table is missing a column the flow reads/writes, instead
   * of a bare "failed to create/update" 503. Postgres reports missing columns
   * as 42703 through PostgREST (or PGRST204 when the schema cache is stale);
   * the offending column is extracted from the message and mapped to the
   * migration that introduces it, so an unapplied migration is diagnosable
   * with one request.
   */
  private schemaErrorHint(error: { code?: string; message?: string }, fallback: string) {
    if (error.code !== '42703' && error.code !== 'PGRST204') {
      return fallback;
    }

    const message = error.message ?? '';
    // 42703: `column scans.idempotency_key does not exist`; PGRST204:
    // `Could not find the 'idempotency_key' column of 'scans' ...`.
    const quoted = /'([a-zA-Z_]+)'\s+column/.exec(message)?.[1];
    const dotted = /column\s+[a-zA-Z0-9_]+\.([a-zA-Z_]+)\s+does not exist/.exec(
      message,
    )?.[1];
    const column = quoted ?? dotted;

    const migrationByColumn: Record<string, string> = {
      processing_mode: '0009_scan_processing.sql',
      completed_at: '0009_scan_processing.sql',
      team_id: '0012_profiles_team.sql',
      file_hash_sha256: '0013_scan_dedup.sql',
      idempotency_key: '0019_scan_idempotency.sql',
    };

    if (column && migrationByColumn[column]) {
      return `${fallback} The scans table is missing the ${column} column (migration ${migrationByColumn[column]} not applied) — apply supabase/migrations/${migrationByColumn[column]}.`;
    }

    return `${fallback} The scans table is missing a column${column ? ` (${column})` : ''} — check supabase/migrations in dependency order (see docs/engineering/MIGRATION_RUNBOOK.md).`;
  }

  private async runScanProcessing(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: ScanRow,
  ) {
    try {
      if (!['queued', 'awaiting_upload', 'processing'].includes(scan.status)) {
        this.logger.warn(`Skipping scan ${scan.id} because it is already ${scan.status}.`);
        return;
      }

      await this.updateScan(adminClient, scan.id, {
        status: 'processing',
        updated_at: new Date().toISOString(),
      });

      const startedAt = Date.now();
      const fileBuffer = await this.downloadScanAsset(adminClient, scan);
      const analysisTimestamp = new Date().toISOString();

      // Deeper pre-processing inspection: reject empty/truncated uploads and
      // files whose magic bytes match no supported image format (renamed
      // PDFs/executables). A supported-image header mismatch is NOT rejected
      // here — that is the forensic signal the pipeline reports as suspicious.
      const inspectionFailure = inspectUploadContent(fileBuffer, scan.mime_type);
      if (inspectionFailure) {
        throw new Error(inspectionFailure);
      }

      // Hash-based dedup (approved feature): an identical file already verified
      // by this user reuses the prior result payload instead of re-running the
      // analysis pipeline. The lookup is best-effort — if the dedup column is
      // missing (migration 0013 not applied), fall back to normal processing.
      const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
      const prior = await this.findCompletedScanByHash(
        adminClient,
        scan.user_id,
        sha256,
        scan.id,
      );

      if (prior) {
        const reusedPayload = this.buildDeduplicatedPayload(
          prior,
          scan,
          sha256,
          analysisTimestamp,
        );
        await this.updateScan(adminClient, scan.id, {
          status: 'complete',
          file_hash_sha256: sha256,
          result_payload: reusedPayload,
          failure_reason: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        this.logger.log(
          `Scan ${scan.id} reuses prior result from scan ${prior.id} (identical SHA-256).`,
        );
        return;
      }

      const resultPayload = await this.buildAnalysisResultPayload(
        scan,
        fileBuffer,
        analysisTimestamp,
        startedAt,
      );

      await this.updateScan(adminClient, scan.id, {
        status: 'complete',
        file_hash_sha256: sha256,
        result_payload: resultPayload,
        failure_reason: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      // Rethrow so BullMQ retries the job (attempts: 3 + exponential backoff
      // configured on enqueue). The row is intentionally left in 'processing'
      // — NOT marked failed — so a retried attempt still passes the status
      // guard above. The terminal 'failed' state is written only when retries
      // are exhausted: the worker's 'failed' event calls markScanFailed (BullMQ
      // path), and the inline path's error handler does the same.
      const reason = error instanceof Error ? error.message : 'Unknown error.';
      this.logger.error(
        `Scan ${scan.id} processing failed (will retry): ${reason}`,
      );
      throw error;
    }
  }

  /**
   * markScanFailed — terminal-state writer invoked when BullMQ retries are
   * exhausted (the worker's 'failed' event) or from the inline path's error
   * handler. Idempotent and race-safe: a scan already 'complete' (e.g. a
   * concurrent dedup hit) is never downgraded to 'failed'.
   */
  async markScanFailed(scanId: string, reason: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanByIdOrThrow(adminClient, scanId);

    if (!['queued', 'awaiting_upload', 'processing'].includes(scan.status)) {
      this.logger.warn(
        `Not marking scan ${scanId} failed — it is already ${scan.status}.`,
      );
      return;
    }

    await this.updateScan(adminClient, scanId, {
      status: 'failed',
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    });
    this.logger.warn(`Scan ${scanId} marked failed after retries: ${reason}`);

    // Best-effort audit trail: a terminal worker-side failure should surface
    // in the Admin Audit Logs page like the admin fail/retry actions do. A
    // missing audit_logs table (migration 0008 not applied) or an unresolved
    // owner email must never break the failure write itself.
    await this.recordScanFailedAudit(adminClient, scan, reason);
  }

  /**
   * recordScanFailedAudit — best-effort scan.failed audit row for worker /
   * inline terminal failures. There is no request actor on this path, so the
   * scan owner's email is the honest attribution when resolvable; otherwise
   * the 'system' actor convention (the same marker the account feed uses for
   * system-originated events).
   */
  private async recordScanFailedAudit(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: ScanRow,
    reason: string,
  ) {
    try {
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('email')
        .eq('id', scan.user_id)
        .maybeSingle();
      const actorEmail = !profileError && profile?.email ? profile.email : 'system';

      const { error } = await adminClient.from(this.auditTable).insert({
        actor_email: actorEmail,
        action: 'scan.failed',
        severity: auditSeverity('scan.failed'),
        entity_type: 'scan',
        entity_id: scan.id,
        details: { failure_reason: reason },
      });

      if (error) {
        this.logger.warn(
          `Best-effort scan.failed audit write skipped for scan ${scan.id}: ${error.message}`,
        );
      }
    } catch (auditError) {
      this.logger.warn(
        `Best-effort scan.failed audit write skipped for scan ${scan.id}: ${
          auditError instanceof Error ? auditError.message : 'unknown error'
        }`,
      );
    }
  }

  /**
   * findCompletedScanByHash — the dedup lookup: a completed scan owned by the
   * same user whose file_hash_sha256 matches (excluding the current scan).
   *
   * Best-effort: when the hash column is missing (migration 0013 not applied),
   * returns null instead of failing the worker so identical files still get
   * processed normally.
   */
  private async findCompletedScanByHash(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    userId: string,
    sha256: string,
    excludeScanId: string,
  ): Promise<{ id: string; result_payload: unknown } | null> {
    try {
      const { data, error } = await adminClient
        .from(this.scansTable)
        .select('id,result_payload')
        .eq('user_id', userId)
        .eq('file_hash_sha256', sha256)
        .eq('status', 'complete')
        .neq('id', excludeScanId)
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === '42703' || error.code === 'PGRST204') {
          this.logger.warn(
            'Dedup lookup skipped — file_hash_sha256 column missing (migration 0013 not applied).',
          );
          return null;
        }
        throw new ServiceUnavailableException('Failed to check for duplicate scans.');
      }

      return data ?? null;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `Dedup lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  /**
   * buildDeduplicatedPayload — reuses a prior completed scan's result payload
   * for an identical file. The verdict/signals/media blocks carry over as-is;
   * the report identity is regenerated for the new scan and a deduplicated_from
   * marker records the source so the report surface can badge the reuse.
   */
  private buildDeduplicatedPayload(
    prior: { id: string; result_payload: unknown },
    scan: ScanRow,
    sha256: string,
    analysisTimestamp: string,
  ): Record<string, unknown> {
    const priorPayload = (prior.result_payload ?? {}) as Record<string, unknown>;
    const priorReport = (priorPayload.report ?? {}) as Record<string, unknown>;
    const reportId = `PRV-${scan.id.slice(0, 8).toUpperCase()}`;

    return {
      ...priorPayload,
      scan_id: scan.id,
      media: {
        ...((priorPayload.media ?? {}) as Record<string, unknown>),
        file_hash_sha256: sha256,
        sha256,
      },
      report: {
        ...priorReport,
        report_id: reportId,
        generated_at: analysisTimestamp,
        report_url:
          typeof priorReport.report_url === 'string'
            ? priorReport.report_url.replace(prior.id, scan.id)
            : null,
      },
      deduplicated_from: {
        source_scan_id: prior.id,
        source_report_id: priorReport.report_id ?? null,
        reused_at: analysisTimestamp,
      },
    };
  }

  private async assetExists(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: ScanRow,
  ) {
    const storage = adminClient.storage.from(scan.storage_bucket);

    if (typeof storage.info !== 'function') {
      // Older supabase-js versions lack storage.info; proceed without the
      // pre-flight check and let the worker surface failures instead.
      this.logger.warn(
        'storage.info is unavailable; skipping upload-exists validation.',
      );
      return true;
    }

    const { data, error } = await storage.info(scan.storage_path);

    if (error || !data) {
      this.logger.warn(
        `Upload existence check failed for ${scan.storage_bucket}/${scan.storage_path}: ${error?.message ?? 'no object returned'}`,
      );
      return false;
    }

    return true;
  }

  private async downloadScanAsset(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: ScanRow,
  ) {
    const { data, error } = await adminClient.storage
      .from(scan.storage_bucket)
      .download(scan.storage_path);

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to download the uploaded asset.');
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async createAssetPreviewUrl(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    bucket: string,
    storagePath: string,
  ) {
    const { data, error } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60);

    if (error || !data?.signedUrl) {
      this.logger.warn(
        `Failed to create asset preview URL for ${bucket}/${storagePath}.`,
      );
      return null;
    }

    return data.signedUrl;
  }

  private async buildAnalysisResultPayload(
    scan: ScanRow,
    fileBuffer: Buffer,
    analysisTimestamp: string,
    startedAt: number,
  ) {
    const metadata = await this.extractMetadata(fileBuffer);
    const imageStats = await this.analyzeImage(fileBuffer);
    const detectedFormat = detectImageFormat(fileBuffer);
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const md5 = createHash('md5').update(fileBuffer).digest('hex');
    const hasHeaderMismatch =
      Boolean(detectedFormat.mimeType) && detectedFormat.mimeType !== scan.mime_type;
    const hasC2paMarker = containsC2paMarker(fileBuffer);
    const metadataSignal = buildMetadataSignal(metadata);
    const imageSignal = buildImageSignal(imageStats);
    const integritySignal = buildIntegritySignal({
      detectedFormatLabel: detectedFormat.label,
      hasHeaderMismatch,
      expectedMimeType: scan.mime_type,
      detectedMimeType: detectedFormat.mimeType,
      sha256,
      md5,
    });
    const provenanceSignal = buildProvenanceSignal(hasC2paMarker);
    const signals = [
      integritySignal,
      metadataSignal,
      imageSignal,
      provenanceSignal,
    ];
    const verdict = buildVerdict({
      metadata,
      imageStats,
      hasHeaderMismatch,
      hasC2paMarker,
      signalCount: signals.length,
    });
    const processingTimeMs = Date.now() - startedAt;
    const primaryOrigin = getPrimaryOrigin(
      this.configService.get<string>('FRONTEND_ORIGIN') ?? '',
    );
    const reportId = `PRV-${scan.id.slice(0, 8).toUpperCase()}`;

    return {
      payload_version: '1.0.0',
      scan_id: scan.id,
      organization_id: null,
      user_id: scan.user_id,
      media: {
        original_filename: scan.original_filename,
        filename: scan.original_filename,
        media_type: 'image',
        mime_type: scan.mime_type,
        file_size_bytes: scan.file_size_bytes,
        file_hash_sha256: sha256,
        file_hash_md5: md5,
        sha256,
        md5,
        width: imageStats?.width ?? null,
        height: imageStats?.height ?? null,
        duration_seconds: null,
        is_ephemeral: false,
      },
      verdict,
      signals: signals.map((signal) => ({
        ...signal,
        analysis_timestamp: analysisTimestamp,
        processing_time_ms: processingTimeMs,
      })),
      methodology: {
        version: '0.2.0-mvp',
        release_date: '2026-07-07',
        analysis_timestamp: analysisTimestamp,
        environment: 'image-first-mvp',
        node_id: null,
      },
      report: {
        report_id: reportId,
        report_url: primaryOrigin ? `${primaryOrigin}/app/reports/${scan.id}/print` : null,
        share_url: null,
        generated_at: analysisTimestamp,
      },
      metadata: {
        capture_timestamp: metadata.captureTimestamp,
        software: metadata.software,
        make: metadata.make,
        model: metadata.model,
        color_space: metadata.colorSpace,
        orientation: metadata.orientation,
        detected_format: detectedFormat.label,
        header_matches_mime: !hasHeaderMismatch,
        c2pa_marker_detected: hasC2paMarker,
        scan_created_at: scan.created_at,
        scan_completed_at: analysisTimestamp,
        total_processing_time_ms: processingTimeMs,
        processing_cost_credits: null,
        recommendations: buildRecommendations(verdict.class, hasC2paMarker),
      },
    };
  }

  private async extractMetadata(fileBuffer: Buffer) {
    try {
      const parsed = await exifr.parse(fileBuffer, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: true,
        icc: true,
      });

      return {
        captureTimestamp: formatMetadataTimestamp(
          parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? null,
        ),
        software: asNullableString(parsed?.Software),
        make: asNullableString(parsed?.Make),
        model: asNullableString(parsed?.Model),
        orientation: asNullableString(parsed?.Orientation),
        colorSpace: asNullableString(parsed?.ColorSpace),
      };
    } catch {
      return {
        captureTimestamp: null,
        software: null,
        make: null,
        model: null,
        orientation: null,
        colorSpace: null,
      };
    }
  }

  private async analyzeImage(fileBuffer: Buffer): Promise<ImageStats | null> {
    try {
      const image = await Jimp.read(fileBuffer);
      const { width, height, data } = image.bitmap;
      const histogram = new Array<number>(256).fill(0);
      const totalPixels = width * height;
      const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / 120_000)));
      let samples = 0;
      let luminanceSum = 0;
      let luminanceSqSum = 0;
      let saturationSum = 0;
      let edgeCount = 0;
      let edgeSamples = 0;
      let blockBoundaryDifference = 0;
      let blockBoundarySamples = 0;
      let interiorDifference = 0;
      let interiorSamples = 0;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const red = data[index] ?? 0;
          const green = data[index + 1] ?? 0;
          const blue = data[index + 2] ?? 0;
          const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
          const histogramIndex = Math.max(0, Math.min(255, Math.round(luminance)));

          histogram[histogramIndex] += 1;
          samples += 1;
          luminanceSum += luminance;
          luminanceSqSum += luminance * luminance;
          saturationSum += calculateSaturation(red, green, blue);

          if (x + step < width) {
            const rightIndex = (y * width + (x + step)) * 4;
            const rightLuminance =
              0.299 * (data[rightIndex] ?? 0) +
              0.587 * (data[rightIndex + 1] ?? 0) +
              0.114 * (data[rightIndex + 2] ?? 0);
            const delta = Math.abs(luminance - rightLuminance);

            edgeSamples += 1;

            if (delta > 42) {
              edgeCount += 1;
            }

            if (((x + step) / step) % 8 === 0) {
              blockBoundaryDifference += delta;
              blockBoundarySamples += 1;
            } else {
              interiorDifference += delta;
              interiorSamples += 1;
            }
          }
        }
      }

      const luminanceMean = samples > 0 ? luminanceSum / samples : 0;
      const luminanceVariance =
        samples > 0 ? luminanceSqSum / samples - luminanceMean * luminanceMean : 0;
      const entropy = histogram.reduce((total, count) => {
        if (!count || samples === 0) {
          return total;
        }

        const probability = count / samples;
        return total - probability * Math.log2(probability);
      }, 0);
      const blockinessBase =
        blockBoundarySamples > 0 ? blockBoundaryDifference / blockBoundarySamples : 0;
      const blockinessInterior =
        interiorSamples > 0 ? interiorDifference / interiorSamples : 0;

      return {
        width,
        height,
        averageLuminance: roundMetric(luminanceMean),
        luminanceStdDev: roundMetric(Math.sqrt(Math.max(luminanceVariance, 0))),
        saturationMean: roundMetric(samples > 0 ? saturationSum / samples : 0),
        edgeDensity: roundMetric(edgeSamples > 0 ? edgeCount / edgeSamples : 0),
        entropy: roundMetric(entropy),
        blockiness: roundMetric(
          clamp(blockinessBase > 0 ? (blockinessBase - blockinessInterior) / 255 : 0, 0, 1),
        ),
      };
    } catch {
      return null;
    }
  }
}

function sanitizeFilename(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return 'upload';

  const normalized = trimmed.replace(/[^\w.-]+/g, '-').slice(0, 80);

  return normalized || 'upload';
}

function buildIntegritySignal(input: {
  detectedFormatLabel: string;
  hasHeaderMismatch: boolean;
  expectedMimeType: string;
  detectedMimeType: string | null;
  sha256: string;
  md5: string;
}) {
  return {
    signal_id: randomUUID(),
    signal_name: 'file_integrity',
    signal_display_name: 'File Integrity',
    signal_category: 'integrity',
    methodology_version: '0.2.0-mvp',
    model_id: 'integrity-heuristics',
    model_version: '2026-07-07',
    status: input.hasHeaderMismatch ? 'warning' : 'clear',
    status_reason: input.hasHeaderMismatch
      ? `Uploaded MIME type ${input.expectedMimeType} does not match detected file header ${input.detectedMimeType ?? input.detectedFormatLabel}.`
      : `File header matches the declared ${input.expectedMimeType} upload type.`,
    score: input.hasHeaderMismatch ? 0.78 : 0.14,
    confidence: {
      score: 0.84,
      level: 'moderate',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'fingerprint',
        severity: input.hasHeaderMismatch ? 'medium' : 'informational',
        label: 'File fingerprints recorded',
        description: `SHA-256 ${input.sha256.slice(0, 16)}… and MD5 ${input.md5.slice(0, 12)}… captured for audit traceability.`,
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.24,
  };
}

function buildMetadataSignal(metadata: {
  captureTimestamp: string | null;
  software: string | null;
  make: string | null;
  model: string | null;
  orientation: string | null;
  colorSpace: string | null;
}) {
  const editorHeavy =
    Boolean(metadata.software) && !metadata.make && !metadata.model;

  return {
    signal_id: randomUUID(),
    signal_name: 'metadata_forensics',
    signal_display_name: 'Metadata Forensics',
    signal_category: 'metadata',
    methodology_version: '0.2.0-mvp',
    model_id: 'metadata-parser',
    model_version: '2026-07-07',
    status: editorHeavy ? 'warning' : metadata.captureTimestamp ? 'clear' : 'limited',
    status_reason: editorHeavy
      ? 'Metadata shows software-edit traces without capture-device details.'
      : metadata.captureTimestamp
        ? 'Capture metadata is present and consistent enough for audit review.'
        : 'Capture metadata is limited or absent. That is common after export or platform reprocessing.',
    score: editorHeavy ? 0.61 : metadata.captureTimestamp ? 0.2 : 0.38,
    confidence: {
      score: 0.74,
      level: 'moderate',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'metadata_summary',
        severity: editorHeavy ? 'medium' : 'informational',
        label: 'Capture metadata review',
        description: metadata.captureTimestamp
          ? `Capture timestamp ${metadata.captureTimestamp}${metadata.software ? `, software ${metadata.software}` : ''}.`
          : metadata.software
            ? `Software tag ${metadata.software} detected, but capture timestamp is unavailable.`
            : 'No strong capture metadata was preserved in the uploaded file.',
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.2,
  };
}

function buildImageSignal(imageStats: ImageStats | null) {
  const lowTexture =
    imageStats !== null && imageStats.edgeDensity < 0.055 && imageStats.entropy < 6;
  const strongBlockiness = imageStats !== null && imageStats.blockiness > 0.16;
  const status = strongBlockiness ? 'warning' : imageStats ? 'clear' : 'limited';

  return {
    signal_id: randomUUID(),
    signal_name: 'visual_statistics',
    signal_display_name: 'Visual Statistics',
    signal_category: 'image_analysis',
    methodology_version: '0.2.0-mvp',
    model_id: 'visual-heuristics',
    model_version: '2026-07-07',
    status,
    status_reason: imageStats
      ? strongBlockiness
        ? 'Compression boundaries are pronounced enough to merit manual review.'
        : lowTexture
          ? 'Visual texture is relatively smooth, so confidence stays conservative.'
          : 'Image dimensions and texture metrics are available for evidence review.'
      : 'The uploaded image could not be decoded for deeper visual statistics.',
    score: strongBlockiness ? 0.64 : lowTexture ? 0.44 : 0.22,
    confidence: {
      score: imageStats ? 0.69 : 0.34,
      level: imageStats ? 'moderate' : 'limited',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'image_summary',
        severity: strongBlockiness ? 'medium' : 'informational',
        label: 'Texture and compression profile',
        description: imageStats
          ? `Entropy ${imageStats.entropy}, edge density ${imageStats.edgeDensity}, blockiness ${imageStats.blockiness}.`
          : 'Image statistics are unavailable for this file.',
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.34,
  };
}

function buildProvenanceSignal(hasC2paMarker: boolean) {
  return {
    signal_id: randomUUID(),
    signal_name: 'provenance_credentials',
    signal_display_name: 'Provenance Credentials',
    signal_category: 'provenance',
    methodology_version: '0.2.0-mvp',
    model_id: 'c2pa-marker-check',
    model_version: '2026-07-07',
    status: hasC2paMarker ? 'clear' : 'limited',
    status_reason: hasC2paMarker
      ? 'A possible C2PA or content-credential marker was detected in the uploaded asset.'
      : 'No C2PA marker was detected. Absence does not imply manipulation.',
    score: hasC2paMarker ? 0.08 : 0.36,
    confidence: {
      score: 0.58,
      level: 'moderate',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'provenance',
        severity: hasC2paMarker ? 'informational' : 'low',
        label: hasC2paMarker
          ? 'Possible provenance marker detected'
          : 'No provenance credential marker detected',
        description: hasC2paMarker
          ? 'The uploaded file contains a marker consistent with embedded provenance metadata.'
          : 'The file does not expose an obvious provenance credential marker in its byte stream.',
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.12,
  };
}

/**
 * Pure verdict classifier — exported as a test seam so the threshold
 * boundaries (0.2 likely_authentic / 0.45 inconclusive) are unit-lockable
 * without driving the full pipeline.
 */
export function buildVerdict(input: {
  metadata: {
    captureTimestamp: string | null;
    software: string | null;
    make: string | null;
    model: string | null;
  };
  imageStats: ImageStats | null;
  hasHeaderMismatch: boolean;
  hasC2paMarker: boolean;
  signalCount: number;
}) {
  let suspicionScore = 0.18;

  if (input.hasHeaderMismatch) {
    suspicionScore += 0.34;
  }

  if (input.metadata.software && !input.metadata.make && !input.metadata.model) {
    suspicionScore += 0.12;
  }

  if (!input.metadata.captureTimestamp) {
    suspicionScore += 0.05;
  }

  if (input.imageStats && input.imageStats.blockiness > 0.16) {
    suspicionScore += 0.12;
  }

  if (
    input.imageStats &&
    input.imageStats.edgeDensity < 0.055 &&
    input.imageStats.entropy < 6
  ) {
    suspicionScore += 0.1;
  }

  if (input.hasC2paMarker) {
    suspicionScore -= 0.08;
  }

  suspicionScore = clamp(suspicionScore, 0.05, 0.9);
  const confidenceScore = clamp(0.52 + input.signalCount * 0.045, 0.52, 0.78);

  if (suspicionScore < 0.2) {
    return {
      class: 'likely_authentic',
      display_label: 'Likely Authentic',
      display_color: '#0f766e',
      confidence_score: confidenceScore,
      confidence_level: 'moderate',
      signal_count_total: input.signalCount,
      signal_count_completed: input.signalCount,
      primary_contributing_signals: ['file_integrity', 'provenance_credentials'],
      plain_language_summary:
        'File integrity checks are stable and no strong anomaly cluster was detected. The result still benefits from human review before any high-stakes decision.',
    };
  }

  if (suspicionScore < 0.45) {
    return {
      class: 'inconclusive',
      display_label: 'Inconclusive',
      display_color: '#6b6b6b',
      confidence_score: confidenceScore,
      confidence_level: 'moderate',
      signal_count_total: input.signalCount,
      signal_count_completed: input.signalCount,
      primary_contributing_signals: ['metadata_forensics', 'visual_statistics'],
      plain_language_summary:
        'The file produced a usable evidence package, but the signal mix is not strong enough to support a confident authenticity or synthetic-media verdict.',
    };
  }

  return {
    class: 'suspicious',
    display_label: 'Suspicious',
    display_color: '#b45309',
    confidence_score: confidenceScore,
    confidence_level: 'moderate',
    signal_count_total: input.signalCount,
    signal_count_completed: input.signalCount,
    primary_contributing_signals: ['file_integrity', 'metadata_forensics', 'visual_statistics'],
    plain_language_summary:
      'The evidence package contains enough anomalous signals to recommend manual review before the media is treated as trustworthy.',
  };
}

function buildRecommendations(verdictClass: string, hasC2paMarker: boolean) {
  const recommendations = [
    'Preserve the original uploaded file and its SHA-256 fingerprint for audit traceability.',
    'Use the printable report view when sharing this case with internal reviewers.',
  ];

  if (!hasC2paMarker) {
    recommendations.push('Request source provenance or original capture files when available.');
  }

  if (verdictClass === 'suspicious') {
    recommendations.push('Escalate to manual review before relying on this media in a trust-critical workflow.');
  }

  return recommendations;
}

function detectImageFormat(fileBuffer: Buffer) {
  if (fileBuffer.length >= 3 && fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8) {
    return { label: 'JPEG', mimeType: 'image/jpeg' };
  }

  if (
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47
  ) {
    return { label: 'PNG', mimeType: 'image/png' };
  }

  if (fileBuffer.length >= 6 && fileBuffer.toString('ascii', 0, 6).startsWith('GIF8')) {
    return { label: 'GIF', mimeType: 'image/gif' };
  }

  if (
    fileBuffer.length >= 12 &&
    fileBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    fileBuffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { label: 'WEBP', mimeType: 'image/webp' };
  }

  return { label: 'Unknown', mimeType: null };
}

/**
 * Pre-processing content gate (deeper file inspection before the analysis
 * pipeline runs). Distinguishes a *rejected* upload from a *forensic signal*:
 *
 * - Empty or truncated buffers (too small to hold any magic header) are
 *   rejected — nothing meaningful can be analyzed.
 * - Files whose magic bytes match **no** supported image format (a renamed
 *   PDF, an executable, an archive) are rejected with an actionable reason —
 *   the declared MIME said image, the content is not an image at all.
 * - A supported image whose format differs from the declared MIME is **not**
 *   rejected: that mismatch is exactly the header-mismatch signal the
 *   pipeline reports as `suspicious`. Only a total format miss fails.
 *
 * Returns `null` when the content is acceptable, otherwise the failure reason
 * (which lands the scan in `failed`).
 */
export function inspectUploadContent(
  fileBuffer: Buffer,
  declaredMimeType: string,
): string | null {
  if (fileBuffer.length === 0) {
    return 'The uploaded file is empty (0 bytes).';
  }

  const detected = detectImageFormat(fileBuffer);

  if (!detected.mimeType) {
    return `The file content does not match any supported image format (declared ${declaredMimeType || 'unknown'}). Upload a JPEG, PNG, WebP, or GIF image.`;
  }

  return null;
}

function containsC2paMarker(fileBuffer: Buffer) {
  const slice = fileBuffer.subarray(0, Math.min(fileBuffer.length, 512_000));
  const haystack = slice.toString('latin1').toLowerCase();
  return haystack.includes('c2pa');
}

function calculateSaturation(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  if (max === 0) {
    return 0;
  }

  return (max - min) / max;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number) {
  return Math.round(value * 1000) / 1000;
}

function asNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue ? stringValue : null;
}

function formatMetadataTimestamp(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toISOString();
  }

  return null;
}

function getPrimaryOrigin(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0] || null;
}

/**
 * Shape a DB scan row into the exact row dialect the frontend consumes
 * (mirror of the mock scan records in mockData.js):
 *
 *  - status: the DB enum says 'complete'; the frontend mock dialect says
 *    'completed' — emit the display dialect at the API boundary.
 *  - verdict: flat display value ('authentic' / 'suspicious' / 'inconclusive')
 *    derived from result_payload.verdict.class, or null when not complete.
 *  - processing_mode / team_id / completed_at: persisted columns surfaced
 *    directly.
 *  - result_payload: unchanged, plus a flat `report_id` mirror (the ledger
 *    surfaces read result_payload?.report_id, while the analysis payload
 *    nests it under report.report_id).
 */
function toFrontendScanRow(scan: ScanRow) {
  const payload = (scan.result_payload ?? null) as
    | {
        verdict?: { class?: string } | null;
        report?: { report_id?: string } | null;
      }
    | null;
  const verdictClass = payload?.verdict?.class ?? null;

  return {
    ...scan,
    status: scan.status === 'complete' ? 'completed' : scan.status,
    verdict: verdictClass
      ? VERDICT_CLASS_TO_DISPLAY[verdictClass] ?? verdictClass
      : null,
    processing_mode: scan.processing_mode ?? 'standard',
    team_id: scan.team_id ?? null,
    completed_at: scan.completed_at ?? null,
    result_payload: payload
      ? {
          ...payload,
          report_id: payload.report?.report_id ?? null,
        }
      : null,
  };
}

