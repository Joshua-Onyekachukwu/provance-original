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
 * SignInLockoutInterceptor — failure-triggered lockout for POST /auth/sign-in.
 *
 * The same credential-stuffing protection the refresh path gets from
 * RefreshLockoutInterceptor, applied to the sign-in path: N consecutive
 * rejected credentials (401) within a window trip a short lockout during
 * which sign-in is refused with 429 BEFORE the handler runs — so a stuffing
 * burst can't keep hammering Supabase auth, and ONE high-severity
 * signin_lockout audit row marks the episode (the refresh path's
 * refresh_lockout analogue). A successful sign-in clears the key.
 *
 * Reuses the shared RefreshLockoutTracker + per-IP key resolver so both
 * lockouts share one identity model and one clock-injectable state machine
 * (unit-tested in refresh-lockout.spec.ts).
 */
@Injectable()
export class SignInLockoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SignInLockoutInterceptor.name);
  private readonly tracker: RefreshLockoutTracker;
  private readonly auditTable: string;
  private readonly threshold: number;
  private readonly lockoutMs: number;
  private readonly enabled: boolean;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    // Test/dev escape hatch: hermetic e2e specs exercise repeated 401s on
    // the same client, so they pin SIGNIN_LOCKOUT_ENABLED=false (see
    // auth.e2e-spec.ts env block). Live behavior defaults to enabled.
    this.enabled = configService.get('SIGNIN_LOCKOUT_ENABLED', 'true') !== 'false';
    // Env values arrive as strings — coerce so the tracker math and the
    // audit row carry numbers, not '5'-style strings.
    this.threshold = Number(configService.get('SIGNIN_LOCKOUT_THRESHOLD', 5));
    this.lockoutMs = Number(
      configService.get('SIGNIN_LOCKOUT_DURATION_MS', 300_000),
    );
    this.tracker = new RefreshLockoutTracker({
      threshold: this.threshold,
      windowMs: Number(configService.get('SIGNIN_LOCKOUT_WINDOW_MS', 60_000)),
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
    if (!this.enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const key = resolveRefreshLockoutKey(request);

    if (this.tracker.isLockedOut(key)) {
      throw new ThrottlerException(
        'Too many failed sign-in attempts. Try again later.',
      );
    }

    return next.handle().pipe(
      tap({
        next: () => this.tracker.recordSuccess(key),
        error: (error: unknown) => {
          // Only a rejected credential (401) is a stuffing signal — a 5xx or
          // a volume-throttle 429 must not count toward the lockout.
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
        action: 'signin_lockout',
        severity: auditSeverity('signin_lockout'),
        entity_type: 'auth_user',
        entity_id: null,
        details: {
          ip_address: key,
          reason: 'repeated failed sign-in attempts (credential stuffing)',
          failures: state?.failures ?? 0,
          threshold: this.threshold,
          lockout_ms: this.lockoutMs,
          lockout_until: new Date(now).toISOString(),
        },
      });

      if (error) {
        this.logger.warn(`Sign-in-lockout audit write failed: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `Sign-in-lockout audit write failed: ${(error as Error).message}`,
      );
    }
  }
}
