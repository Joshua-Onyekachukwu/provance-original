import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateCrashReportsDto,
  CrashReportDto,
} from './dto/create-crash-reports.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly table: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    this.table =
      configService.get<string>('SUPABASE_CRASH_REPORTS_TABLE') ||
      'crash_reports';
  }

  /**
   * recordErrors — persists a batch of buffered crash records.
   *
   * Upserts on client_id (the primary key, migration 0014) so a retried flush
   * is idempotent — re-sending the same records never duplicates a crash.
   * Failure semantics: the endpoint throws on ANY insert error (missing table
   * included) so the client keeps its buffer and retries later rather than
   * silently dropping crash reports.
   */
  async recordErrors(dto: CreateCrashReportsDto) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    if (!dto.errors.length) {
      return { accepted: 0 };
    }

    const rows = dto.errors.map((record) => this.toRow(record));

    const { error } = await adminClient
      .from(this.table)
      .upsert(rows, { onConflict: 'client_id' });

    if (error) {
      this.logger.warn(
        `Crash report flush failed (${dto.errors.length} records): ${error.message}`,
      );
      throw new ServiceUnavailableException('Failed to record crash reports.');
    }

    return { accepted: rows.length };
  }

  private toRow(record: CrashReportDto) {
    return {
      client_id: record.client_id,
      type: record.type || 'render_error',
      message: record.message || '',
      stack: record.stack ?? null,
      component_stack: record.component_stack ?? null,
      route: record.route ?? null,
      user_agent: record.user_agent ?? null,
      user_id: record.user_id ?? null,
      email: record.email ?? null,
      meta: record.meta ?? {},
      reported_at: record.timestamp ?? null,
    };
  }
}
