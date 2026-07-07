import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
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
};

@Injectable()
export class ScansService {
  private readonly scansTable: string;
  private readonly uploadsBucket: string;
  private readonly maxUploadBytes: number;
  private readonly allowedMimeTypes: Set<string>;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.scansTable = this.configService.get<string>('SUPABASE_SCANS_TABLE', 'scans');
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
  }

  async initiateScan(userId: string, dto: InitiateScanDto) {
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

    const scanId = randomUUID();
    const storagePath = `${userId}/${scanId}/${sanitizeFilename(dto.originalFilename)}`;
    const now = new Date().toISOString();

    const { error: insertError } = await adminClient.from(this.scansTable).insert({
      id: scanId,
      user_id: userId,
      status: 'awaiting_upload',
      original_filename: dto.originalFilename,
      mime_type: dto.mimeType,
      file_size_bytes: dto.fileSizeBytes,
      storage_bucket: this.uploadsBucket,
      storage_path: storagePath,
      result_payload: null,
      failure_reason: null,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw new ServiceUnavailableException('Failed to create scan record.');
    }

    const { data: signedUploadData, error: signedUploadError } = await adminClient.storage
      .from(this.uploadsBucket)
      .createSignedUploadUrl(storagePath);

    if (signedUploadError || !signedUploadData) {
      throw new ServiceUnavailableException('Failed to prepare upload URL.');
    }

    return {
      scanId,
      status: 'awaiting_upload' as const,
      bucket: this.uploadsBucket,
      path: storagePath,
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

    await this.updateScan(adminClient, scanId, {
      status: 'queued',
      updated_at: new Date().toISOString(),
    });

    void this.runStubProcessing(adminClient, scanId, scan.user_id, scan);

    return { scanId, status: 'queued' as const };
  }

  async listScans(userId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from(this.scansTable)
      .select(
        'id,status,original_filename,mime_type,file_size_bytes,created_at,updated_at,failure_reason',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scans.');
    }

    return { scans: data ?? [] };
  }

  async getScan(userId: string, scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanOrThrow(adminClient, userId, scanId);

    return { scan };
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
      throw new ServiceUnavailableException('Failed to update scan.');
    }
  }

  private async runStubProcessing(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scanId: string,
    userId: string,
    scan: ScanRow,
  ) {
    try {
      await this.updateScan(adminClient, scanId, {
        status: 'processing',
        updated_at: new Date().toISOString(),
      });

      const startedAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 750));
      const completedAt = Date.now();

      const analysisTimestamp = new Date().toISOString();

      const resultPayload = {
        scan_id: scanId,
        organization_id: null,
        user_id: userId,
        media: {
          original_filename: scan.original_filename,
          media_type: 'image',
          mime_type: scan.mime_type,
          file_size_bytes: scan.file_size_bytes,
          file_hash_sha256: null,
          media_hash_md5: null,
          width: null,
          height: null,
          duration_seconds: null,
          is_ephemeral: false,
        },
        verdict: {
          class: 'inconclusive',
          display_label: 'Inconclusive',
          display_color: '#6b6b6b',
          confidence_score: 0.5,
          confidence_level: 'insufficient',
          signal_count_total: 0,
          signal_count_completed: 0,
          primary_contributing_signals: [],
          plain_language_summary:
            'Processing pipeline is initializing. This result is a placeholder while signal engines are brought online.',
        },
        signals: [
          {
            signal_id: randomUUID(),
            signal_name: 'generator_attribution',
            signal_display_name: 'Generator Attribution (Preview)',
            signal_category: 'generative',
            methodology_version: '0.1.0',
            model_id: 'attribution-stub',
            model_version: '2026-07-07',
            analysis_timestamp: analysisTimestamp,
            status: 'inconclusive',
            status_reason: 'Generator likelihood estimation is not enabled yet.',
            confidence: {
              score: null,
              level: 'insufficient',
              threshold_applied: 0.7,
            },
            findings: [
              {
                finding_id: randomUUID(),
                finding_type: 'signal_absent',
                severity: 'informational',
                label: 'Generator likelihood pending',
                description:
                  'Model-likelihood attribution will appear here once generator fingerprints are enabled.',
                technical_detail: null,
                raw_value: null,
                reference_range: null,
              },
            ],
            supplementary_data: null,
            processing_time_ms: completedAt - startedAt,
            signal_weight: 0.0,
          },
        ],
        methodology: {
          version: '0.1.0',
          release_date: '2026-07-07',
          analysis_timestamp: analysisTimestamp,
          environment: null,
          node_id: null,
        },
        report: {
          report_id: null,
          report_url: null,
          share_url: null,
          generated_at: null,
        },
        metadata: {
          scan_created_at: scan.created_at,
          scan_completed_at: analysisTimestamp,
          total_processing_time_ms: completedAt - startedAt,
          processing_cost_credits: null,
        },
      };

      await this.updateScan(adminClient, scanId, {
        status: 'complete',
        result_payload: resultPayload,
        failure_reason: null,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error.';
      await this.updateScan(adminClient, scanId, {
        status: 'failed',
        failure_reason: reason,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

function sanitizeFilename(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return 'upload';

  const normalized = trimmed.replace(/[^\w.\-]+/g, '-').slice(0, 80);

  return normalized || 'upload';
}

