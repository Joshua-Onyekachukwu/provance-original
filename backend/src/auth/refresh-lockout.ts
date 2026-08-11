import type { Request } from 'express';

/**
 * refresh-lockout.ts — failure-triggered lockout for POST /auth/refresh.
 *
 * The auth controller's class-level @Throttle caps raw request VOLUME, but a
 * replayed rotated token (token theft) produces a burst of REJECTED refresh
 * attempts that each write a refresh_token_rejected audit row — noise the
 * trail shouldn't absorb. This tracker adds a failure-keyed lockout: N
 * consecutive 401s within a window trip a short lockout during which refresh
 * is refused outright (no handler, no new rejection rows), and the trip
 * emits ONE high-severity refresh_lockout audit event per episode.
 *
 * Pure and clock-injectable so the semantics are unit-testable without any
 * Nest or HTTP machinery (see refresh-lockout.spec.ts).
 */

export type RefreshLockoutOptions = {
  /** Consecutive rejected refresh attempts (within windowMs) before lockout. */
  threshold: number;
  /** Sliding window for counting failures, ms. */
  windowMs: number;
  /** How long the key stays locked out after tripping, ms. */
  lockoutMs: number;
};

export type RefreshLockoutState = {
  failures: number;
  windowStart: number;
  lockoutUntil: number | null;
};

export class RefreshLockoutTracker {
  private readonly states = new Map<string, RefreshLockoutState>();

  constructor(private readonly options: RefreshLockoutOptions) {}

  /** True while the key is locked out (before the lockout window expires). */
  isLockedOut(key: string, now: number = Date.now()): boolean {
    const state = this.states.get(key);
    if (!state || state.lockoutUntil === null) {
      return false;
    }
    if (now >= state.lockoutUntil) {
      // Lockout expired — drop the state so the next failure starts fresh.
      this.states.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Record a rejected refresh attempt.
   *
   * @returns true exactly when this failure TRIPS the lockout — the caller
   *          writes the high-severity audit event once at that point.
   */
  recordFailure(key: string, now: number = Date.now()): boolean {
    if (this.isLockedOut(key, now)) {
      // Already locked out — blocked requests never reach the handler, so
      // this is defensive only; never re-trips, never double-audits.
      return false;
    }

    const state = this.states.get(key) ?? {
      failures: 0,
      windowStart: now,
      lockoutUntil: null,
    };

    if (now - state.windowStart > this.options.windowMs) {
      // The window rolled over — a stale failure must not count toward the
      // current burst.
      state.failures = 0;
      state.windowStart = now;
    }

    state.failures += 1;

    if (state.failures >= this.options.threshold) {
      state.lockoutUntil = now + this.options.lockoutMs;
      this.states.set(key, state);
      return true;
    }

    this.states.set(key, state);
    return false;
  }

  /** A successful refresh clears the key — one stale token is not a pattern. */
  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  /** Test/diagnostic hook: the current state for a key (or undefined). */
  peek(key: string): RefreshLockoutState | undefined {
    const state = this.states.get(key);
    return state ? { ...state } : undefined;
  }
}

/**
 * Tracker key for a request — mirrors ApiThrottlerGuard.getTracker so the
 * lockout and the volume throttle share one identity model (x-forwarded-for
 * first, then the socket address). The key is per-IP: a replay flood from
 * one client can't hide behind per-token keys, and a fresh IP isn't punished
 * for another's attacks.
 */
export function resolveRefreshLockoutKey(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (typeof forwardedValue === 'string' && forwardedValue.trim().length > 0) {
    return forwardedValue.split(',')[0].trim();
  }

  return (
    request.ip ||
    (request.socket && request.socket.remoteAddress) ||
    'unknown'
  );
}
