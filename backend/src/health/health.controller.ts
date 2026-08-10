import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Columns migration 0009 adds to the scans table. The scan flow (initiate →
 * upload → submit → processing) inserts and updates these columns, so their
 * presence is the readiness gate for the real round-trip.
 */
const SCAN_PROCESSING_COLUMNS = ['processing_mode', 'team_id', 'completed_at'];

@Controller('health')
export class HealthController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @SkipThrottle()
  getHealth() {
    return {
      status: 'ok',
      service: 'provance-backend',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Deep readiness probe for the scan pipeline. Reports each dependency's
   * readiness separately (supabase / scans schema / queue) instead of a
   * binary ok/fail, so a partially-migrated database is diagnosable with one
   * request rather than a confusing 503 from the scans endpoints.
   */
  @Get('readiness')
  @SkipThrottle()
  async getReadiness() {
    const checks: Record<string, { ready: boolean; detail: string }> = {};

    // 1. Supabase configuration
    const supabase = this.supabaseService.isConfigured();
    checks.supabase = supabase
      ? { ready: true, detail: 'configured' }
      : { ready: false, detail: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing' };

    // 2. Scans table + 0009 processing columns (read-only probe — selecting a
    //    missing column surfaces a 42703/PGRST204 error without any writes).
    //    Wrapped in try/catch so a health endpoint can never throw: any probe
    //    failure records a degraded check entry instead of a 500.
    const adminClient = this.supabaseService.getAdminClient();
    let scansSchema = false;
    let scansDetail = 'unchecked';

    if (!adminClient) {
      scansDetail = 'Supabase not configured';
    } else {
      try {
        // Same table name resolution as ScansService (SUPABASE_SCANS_TABLE
        // override, 'scans' default) so the probe can't lie about an override.
        const scansTable = this.configService.get<string>(
          'SUPABASE_SCANS_TABLE',
          'scans',
        );
        const { error } = await adminClient
          .from(scansTable)
          .select(SCAN_PROCESSING_COLUMNS.join(','))
          .limit(1);

        if (!error) {
          scansSchema = true;
          scansDetail = 'scans table present with 0009 processing columns';
        } else if (error.code === '42703' || error.code === 'PGRST204') {
          scansDetail =
            'scans table is missing 0009 columns — apply supabase/migrations/0009_scan_processing.sql';
        } else {
          scansDetail = `scans probe failed: ${error.code} ${error.message}`;
        }
      } catch (error) {
        scansDetail = `scans probe threw: ${error instanceof Error ? error.message : 'unknown error'}`;
      }
    }
    checks.scansSchema = { ready: scansSchema, detail: scansDetail };

    // 3. User sessions ledger (migration 0010) — written on every sign-in /
    //    refresh and read by the Security page. Same read-only probe pattern:
    //    selecting from a missing table surfaces a PGRST205/relation error
    //    without any writes, so a deployment that skipped 0010 is flagged
    //    with the exact migration to apply.
    let sessionsSchema = false;
    let sessionsDetail = 'unchecked';

    if (!adminClient) {
      sessionsDetail = 'Supabase not configured';
    } else {
      try {
        // Same table name resolution as SecurityService (SUPABASE_USER_SESSIONS_TABLE
        // override, 'user_sessions' default) so the probe can't lie about an override.
        const sessionsTable = this.configService.get<string>(
          'SUPABASE_USER_SESSIONS_TABLE',
          'user_sessions',
        );
        const { error } = await adminClient
          .from(sessionsTable)
          .select('id')
          .limit(1);

        if (!error) {
          sessionsSchema = true;
          sessionsDetail = 'user_sessions table present (migration 0010 applied)';
        } else {
          const message = error.message || '';
          const missingTable =
            error.code === 'PGRST205' ||
            message.includes('Could not find the table') ||
            message.includes('relation') ||
            message.includes('does not exist');
          if (missingTable) {
            sessionsDetail =
              'user_sessions table missing — apply supabase/migrations/0010_user_sessions.sql';
          } else {
            sessionsDetail = `user_sessions probe failed: ${error.code} ${error.message}`;
          }
        }
      } catch (error) {
        sessionsDetail = `user_sessions probe threw: ${error instanceof Error ? error.message : 'unknown error'}`;
      }
    }
    checks.userSessions = { ready: sessionsSchema, detail: sessionsDetail };

    // 4. Queue: BullMQ requires REDIS_URL; otherwise the flow falls back to
    //    inline processing (safe, just not horizontally scalable).
    const queue = this.queueService.isConfigured();
    checks.queue = queue
      ? { ready: true, detail: 'BullMQ worker queue configured (REDIS_URL set)' }
      : {
          ready: true,
          detail: 'REDIS_URL unset — scans process inline (BullMQ worker not used)',
        };

    const ready = supabase && scansSchema && sessionsSchema;

    return {
      status: ready ? 'ready' : 'degraded',
      service: 'provance-backend',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
