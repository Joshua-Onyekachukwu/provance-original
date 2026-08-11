import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { auditSeverity } from '../common/audit-severity';
import { SupabaseService } from '../supabase/supabase.service';
import {
  RefreshLockoutTracker,
  resolveRefreshLockoutKey,
} from './refresh-lockout';

/**
 * RefreshLockoutInterceptor — failure-triggered lockout for POST /auth/refresh.
 *
 * Unlike the count-based @Throttle (raw request volume), this tracks REJECTED
 * refreshes (the replay-attack signal): N consecutive 401s within a window
 * trip a short lockout during which refresh is refused with 429 BEFORE the
 * handler runs — so no new refresh_token_rejected rows are written while
 * locked out, and one high-severity refresh_lockout audit row marks the
 * episode. A successful refresh clears the key.
 *
 * The audit write is best-effort (a missing audit_logs table must never break
 * the lockout itself) and happens exactly once per episode — the tracker only
 * reports `tripped` on the failure that crosses the threshold.
 */
@Injectable()
export class RefreshLockoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RefreshLockoutInterceptor.name);
  private readonly tracker: RefreshLockoutTracker;
  private readonly auditTable: string;
  private readonly threshold: number;
  private readonly lockoutMs: number;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    // Env values arrive as strings — coerce so the tracker math and the
    // audit row carry numbers, not '3'-style strings.
    this.threshold = Number(configService.get('REFRESH_LOCKOUT_THRESHOLD', 3));
    this.lockoutMs = Number(configService.get('REFRESH_LOCKOUT_DURATION_MS', 60_000));
    this.tracker = new RefreshLockoutTracker({
      threshold: this.threshold,
      windowMs: Number(configService.get('REFRESH_LOCKOUT_WINDOW_MS', 30_000)),
      lockoutMs: this.lockoutMs,
    });
    this.auditTable = configService.get<string>(
      'SUPABASE_AUDIT_LOGS_TABLE',
      'audit_logs',
    );
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = resolveRefreshLockoutKey(request);

    if (this.tracker.isLockedOut(key)) {
      throw new ThrottlerException(
        'Too many failed refresh attempts. Try again later.',
      );
    }

    return next.handle().pipe(
      tap({
        next: () => this.tracker.recordSuccess(key),
        error: (error: unknown) => {
          // Only a rejected credential (401) is a replay signal — a 5xx or a
          // volume-throttle 429 must not count toward the lockout.
          if (error instanceof HttpException && error.getStatus() === 401) {
            const tripped = this.tracker.recordFailure(key);
            if (tripped) {
              void this.recordLockoutAudit(request, key);
            }
          }
        },
      }),
    );
  }

  private async recordLockoutAudit(
    request: Request,
    key: string,
  ): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const state = this.tracker.peek(key);
    const now = Date.now();

    try {
      const { error } = await adminClient.from(this.auditTable).insert({
        actor_email: 'system',
        action: 'refresh_lockout',
        severity: auditSeverity('refresh_lockout'),
        entity_type: 'auth_session',
        entity_id: null,
        details: {
          ip_address: key,
          reason: 'repeated rejected refresh tokens (replay attack)',
          failures: state?.failures ?? 0,
          threshold: this.threshold,
          lockout_ms: this.lockoutMs,
          lockout_until: new Date(now).toISOString(),
        },
      });

      if (error) {
        this.logger.warn(`Refresh-lockout audit write failed: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `Refresh-lockout audit write failed: ${(error as Error).message}`,
      );
    }
  }
}
