import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import {
  buildReportDocument,
  type ReportDocument,
  type ReportScanRow,
} from './report-document';
import { generateReportPdf } from './report-pdf';

type AdminClient = NonNullable<ReturnType<SupabaseService['getAdminClient']>>;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly scansTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    this.scansTable = configService.get<string>('SUPABASE_SCANS_TABLE', 'scans');
  }

  async listReports(
    userId: string,
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 },
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const safePage = Math.max(1, pagination.page);
    const safePageSize = Math.min(100, Math.max(1, pagination.pageSize));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    const { data, error } = await adminClient
      .from(this.scansTable)
      .select(
        'id,status,original_filename,mime_type,file_size_bytes,created_at,updated_at,failure_reason',
      )
      .eq('user_id', userId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch reports.');
    }

    const { count } = await adminClient
      .from(this.scansTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'complete');

    const total = count ?? data?.length ?? 0;
    return {
      data: data ?? [],
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async getReport(userId: string, reportId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getReportScanOrThrow(adminClient, userId, reportId);

    if (!scan.result_payload) {
      throw new NotFoundException('Report is not ready yet.');
    }

    const previewUrl =
      scan.storage_bucket && scan.storage_path
        ? await this.createAssetPreviewUrl(
            adminClient,
            scan.storage_bucket,
            scan.storage_path,
          )
        : null;

    return {
      report: {
        scan_id: scan.id,
        status: scan.status,
        original_filename: scan.original_filename,
        mime_type: scan.mime_type,
        file_size_bytes: scan.file_size_bytes,
        created_at: scan.created_at,
        updated_at: scan.updated_at,
        asset_preview_url: previewUrl,
        result_payload: scan.result_payload,
        // Document-oriented evidence payload in the sampleReportContent shape,
        // derived from the stored result_payload (cover, metrics, per-signal
        // evidence, findings, next steps, custody chain).
        document: buildReportDocument(scan),
      },
    };
  }

  /**
   * Fetch a ready report's document model only (used by the PDF export path).
   */
  async getReportDocument(userId: string, reportId: string): Promise<ReportDocument> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getReportScanOrThrow(adminClient, userId, reportId);

    if (!scan.result_payload) {
      throw new NotFoundException('Report is not ready yet.');
    }

    return buildReportDocument(scan);
  }

  /**
   * Generate the server-side PDF artifact for a ready report.
   */
  async getReportPdf(userId: string, reportId: string): Promise<Buffer> {
    const document = await this.getReportDocument(userId, reportId);
    return generateReportPdf(document);
  }

  private async getReportScanOrThrow(
    adminClient: AdminClient,
    userId: string,
    reportId: string,
  ): Promise<ReportScanRow> {
    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch report.');
    }

    if (!data) {
      throw new NotFoundException('Report not found.');
    }

    return data as ReportScanRow;
  }

  private async createAssetPreviewUrl(
    adminClient: AdminClient,
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
}
