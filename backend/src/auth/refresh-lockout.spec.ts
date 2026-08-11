import {
  RefreshLockoutTracker,
  resolveRefreshLockoutKey,
} from './refresh-lockout';

describe('RefreshLockoutTracker', () => {
  const options = {
    threshold: 3,
    windowMs: 30_000,
    lockoutMs: 60_000,
  };
  let tracker: RefreshLockoutTracker;
  let now: number;

  beforeEach(() => {
    tracker = new RefreshLockoutTracker(options);
    now = 1_000_000;
  });

  it('is not locked out before any failures', () => {
    expect(tracker.isLockedOut('1.2.3.4', now)).toBe(false);
  });

  it('trips only when the failure count crosses the threshold', () => {
    expect(tracker.recordFailure('1.2.3.4', now)).toBe(false);
    expect(tracker.recordFailure('1.2.3.4', now + 1_000)).toBe(false);
    // Third failure within the window trips the lockout.
    expect(tracker.recordFailure('1.2.3.4', now + 2_000)).toBe(true);
    expect(tracker.isLockedOut('1.2.3.4', now + 2_001)).toBe(true);
  });

  it('locks out for the configured duration and self-heals after it', () => {
    tracker.recordFailure('1.2.3.4', now);
    tracker.recordFailure('1.2.3.4', now + 1_000);
    tracker.recordFailure('1.2.3.4', now + 2_000); // trip → until now + 62_000

    expect(tracker.isLockedOut('1.2.3.4', now + 61_999)).toBe(true);
    expect(tracker.isLockedOut('1.2.3.4', now + 62_000)).toBe(false);
    // The expired state is dropped — the next failure starts a fresh count.
    expect(tracker.recordFailure('1.2.3.4', now + 63_000)).toBe(false);
  });

  it('does not re-trip or re-audit while already locked out', () => {
    tracker.recordFailure('1.2.3.4', now);
    tracker.recordFailure('1.2.3.4', now + 1_000);
    expect(tracker.recordFailure('1.2.3.4', now + 2_000)).toBe(true);

    // Defensive calls during lockout never report a second trip.
    expect(tracker.recordFailure('1.2.3.4', now + 3_000)).toBe(false);
    expect(tracker.recordFailure('1.2.3.4', now + 4_000)).toBe(false);
    expect(tracker.isLockedOut('1.2.3.4', now + 5_000)).toBe(true);
  });

  it('resets the failure window after it rolls over (stale failures do not count)', () => {
    tracker.recordFailure('1.2.3.4', now);
    tracker.recordFailure('1.2.3.4', now + 1_000);

    // Window (30s) expires before the next failure — the count restarts.
    expect(tracker.recordFailure('1.2.3.4', now + 31_000)).toBe(false);
    expect(tracker.peek('1.2.3.4')?.failures).toBe(1);
  });

  it('clears the key on a successful refresh', () => {
    tracker.recordFailure('1.2.3.4', now);
    tracker.recordFailure('1.2.3.4', now + 1_000);

    tracker.recordSuccess('1.2.3.4');

    expect(tracker.peek('1.2.3.4')).toBeUndefined();
    expect(tracker.recordFailure('1.2.3.4', now + 2_000)).toBe(false);
  });

  it('tracks keys independently', () => {
    tracker.recordFailure('1.2.3.4', now);
    tracker.recordFailure('1.2.3.4', now + 1_000);
    tracker.recordFailure('1.2.3.4', now + 2_000); // trips for this IP only

    expect(tracker.isLockedOut('5.6.7.8', now + 2_001)).toBe(false);
    expect(tracker.recordFailure('5.6.7.8', now + 2_001)).toBe(false);
  });
});

describe('resolveRefreshLockoutKey', () => {
  function request(headers: Record<string, unknown> = {}, ip?: string) {
    return {
      headers,
      ip,
      socket: { remoteAddress: '203.0.113.9' },
    } as never;
  }

  it('uses the left-most x-forwarded-for entry when present', () => {
    const key = resolveRefreshLockoutKey(
      request({ 'x-forwarded-for': '198.51.100.7, 10.0.0.2' }),
    );
    expect(key).toBe('198.51.100.7');
  });

  it('falls back to req.ip, then the socket address', () => {
    expect(resolveRefreshLockoutKey(request({}, '192.0.2.44'))).toBe('192.0.2.44');
    expect(resolveRefreshLockoutKey(request())).toBe('203.0.113.9');
  });
});
