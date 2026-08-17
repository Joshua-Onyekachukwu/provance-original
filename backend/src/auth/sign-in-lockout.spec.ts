import { HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { of, throwError } from 'rxjs';
import { SignInLockoutInterceptor } from './sign-in-lockout.interceptor';

/**
 * SignInLockoutInterceptor — failure-keyed lockout for POST /auth/sign-in,
 * mirroring the refresh lockout's semantics (rejected credentials trip a
 * short lockout; one high-severity signin_lockout audit row per episode).
 *
 * The tracker state machine itself is covered by refresh-lockout.spec.ts —
 * this suite locks the interceptor's HTTP wiring: the 429 on lockout, the
 * 401-only failure signal, success clearing the key, and the audit row shape.
 */

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    ip: '198.51.100.23',
    socket: { remoteAddress: '198.51.100.23' },
    ...overrides,
  } as never;
}

function makeContext(request: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

/** next.handle() that errors with the given exception (a rejected credential). */
function failingNext(status: HttpStatus, message: string) {
  return {
    handle: () =>
      throwError(() => new HttpException(message, status)),
  } as never;
}

function okNext() {
  return { handle: () => of({ ok: true }) } as never;
}

function makeSupabaseService(adminClient: unknown) {
  return { getAdminClient: () => adminClient } as never;
}

function makeConfigService(overrides: Record<string, string> = {}) {
  return { get: (key: string, fallback?: unknown) => overrides[key] ?? fallback } as never;
}

function makeInsertMock() {
  const insert = jest.fn().mockResolvedValue({ error: null });
  return {
    insert,
    from: jest.fn().mockReturnValue({ insert }),
  };
}

describe('SignInLockoutInterceptor', () => {
  const defaultConfig = {
    SIGNIN_LOCKOUT_THRESHOLD: '3',
    SIGNIN_LOCKOUT_WINDOW_MS: '30000',
    SIGNIN_LOCKOUT_DURATION_MS: '60000',
  };

  it('refuses sign-in with 429 once the lockout has tripped', () => {
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(null),
      makeConfigService(defaultConfig),
    );

    // Three rejected credentials trip the lockout.
    for (let i = 0; i < 3; i += 1) {
      interceptor
        .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
        .subscribe({ error: () => undefined });
    }

    // A subsequent attempt — even with valid-looking credentials — is refused
    // before the handler runs.
    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).toThrow(ThrottlerException);
  });

  it('counts only 401 rejected credentials toward the lockout', () => {
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(null),
      makeConfigService(defaultConfig),
    );

    // A 503 (Supabase down) must not count as a stuffing signal.
    interceptor
      .intercept(
        makeContext(makeRequest()),
        failingNext(503, 'Service temporarily unavailable.'),
      )
      .subscribe({ error: () => undefined });
    interceptor
      .intercept(
        makeContext(makeRequest()),
        failingNext(503, 'Service temporarily unavailable.'),
      )
      .subscribe({ error: () => undefined });
    interceptor
      .intercept(
        makeContext(makeRequest()),
        failingNext(503, 'Service temporarily unavailable.'),
      )
      .subscribe({ error: () => undefined });

    // Three 503s later, the key is still not locked out.
    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).not.toThrow();
  });

  it('a successful sign-in clears the key (one stale failure is not a pattern)', () => {
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(null),
      makeConfigService(defaultConfig),
    );

    interceptor
      .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
      .subscribe({ error: () => undefined });
    interceptor
      .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
      .subscribe({ error: () => undefined });

    // A success resets the count.
    interceptor
      .intercept(makeContext(makeRequest()), okNext())
      .subscribe({ next: () => undefined });

    // Two more failures do NOT trip (threshold is 3) — the success cleared.
    interceptor
      .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
      .subscribe({ error: () => undefined });
    interceptor
      .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
      .subscribe({ error: () => undefined });

    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).not.toThrow();
  });

  it('writes ONE high-severity signin_lockout audit row on the trip', () => {
    const admin = makeInsertMock();
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(admin),
      makeConfigService(defaultConfig),
    );

    for (let i = 0; i < 3; i += 1) {
      interceptor
        .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
        .subscribe({ error: () => undefined });
    }

    // Flush the async audit write (best-effort insert).
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(admin.from).toHaveBeenCalledWith('audit_logs');
        expect(admin.insert).toHaveBeenCalledTimes(1);
        const row = admin.insert.mock.calls[0][0];
        expect(row).toMatchObject({
          actor_email: 'system',
          action: 'signin_lockout',
          severity: 'high',
          entity_type: 'auth_user',
          details: {
            reason: 'repeated failed sign-in attempts (credential stuffing)',
            failures: 3,
            threshold: 3,
            lockout_ms: 60000,
          },
        });
        resolve();
      }, 0);
    });
  });

  it('never re-audits while already locked out', () => {
    const admin = makeInsertMock();
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(admin),
      makeConfigService(defaultConfig),
    );

    for (let i = 0; i < 3; i += 1) {
      interceptor
        .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
        .subscribe({ error: () => undefined });
    }
    // Locked out — every attempt is refused with 429 before the handler, so
    // no further failures reach the tracker and no second row is written.
    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).toThrow(ThrottlerException);
    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).toThrow(ThrottlerException);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(admin.insert).toHaveBeenCalledTimes(1);
        resolve();
      }, 0);
    });
  });

  it('gracefully skips the audit when no admin client is configured', () => {
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(null),
      makeConfigService(defaultConfig),
    );

    for (let i = 0; i < 3; i += 1) {
      interceptor
        .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
        .subscribe({ error: () => undefined });
    }

    // The trip still throws 429 on the next attempt even though the audit
    // write was skipped (no admin client → no throw from the interceptor).
    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).toThrow(ThrottlerException);
  });

  it('passes every request through untouched when disabled (hermetic e2e)', () => {
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(null),
      makeConfigService({ ...defaultConfig, SIGNIN_LOCKOUT_ENABLED: 'false' }),
    );

    // Even a burst of rejected credentials must not 429 — the interceptor is
    // a passthrough when disabled.
    for (let i = 0; i < 10; i += 1) {
      interceptor
        .intercept(makeContext(makeRequest()), failingNext(401, 'Invalid email or password.'))
        .subscribe({ error: () => undefined });
    }

    expect(() =>
      interceptor.intercept(makeContext(makeRequest()), okNext()),
    ).not.toThrow();
  });

  it('resolves the lockout key per-IP from x-forwarded-for', () => {
    const admin = makeInsertMock();
    const interceptor = new SignInLockoutInterceptor(
      makeSupabaseService(admin),
      makeConfigService(defaultConfig),
    );

    // The key comes from the left-most x-forwarded-for entry, not the socket.
    for (let i = 0; i < 3; i += 1) {
      interceptor
        .intercept(
          makeContext(
            makeRequest({ headers: { 'x-forwarded-for': '203.0.113.77, 10.0.0.2' } }),
          ),
          failingNext(401, 'Invalid email or password.'),
        )
        .subscribe({ error: () => undefined });
    }

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(admin.insert.mock.calls[0][0].details.ip_address).toBe('203.0.113.77');
        resolve();
      }, 0);
    });
  });
});
