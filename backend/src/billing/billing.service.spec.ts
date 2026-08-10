import {
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { QuotaExceededException } from './quota-exceeded.exception';
import {
  BillingService,
  DEFAULT_PLAN,
  PLAN_API_CALL_QUOTAS,
  PLAN_SCAN_QUOTAS,
  apiCallLimitForPlan,
  scanLimitForPlan,
  currentBillingCycle,
} from './billing.service';

// ---------------------------------------------------------------------------
// Plan-based mock (same convention as scans.service.spec.ts) — each awaited
// query consumes one entry from the plan in call order.
// ---------------------------------------------------------------------------

type PlannedResult = {
  data?: unknown;
  error?: unknown;
  count?: number;
};

function createConfigService() {
  return {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  } as unknown as ConfigService;
}

function createAdminClient(plan: PlannedResult[]) {
  let step = 0;
  const next = (): PlannedResult => {
    const result = plan[step++];
    if (result === undefined) {
      throw new Error('Mock query plan exhausted — plan/sequence mismatch');
    }
    return result;
  };

  const builder = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(next())),
    // Directly-awaited head/count chains resolve through the thenable contract.
    then(resolve: (value: PlannedResult) => void) {
      resolve(next());
      return undefined;
    },
  } as const;

  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createService(client: unknown, config?: ConfigService) {
  return new BillingService(
    {
      getAdminClient: jest.fn(() => client),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
  );
}

const USER_ID = 'user-1';

// ---------------------------------------------------------------------------
// Pure policy
// ---------------------------------------------------------------------------

describe('billing policy', () => {
  it('maps known plans to their monthly scan quotas', () => {
    expect(PLAN_SCAN_QUOTAS).toMatchObject({
      starter: 100,
      pro: 500,
      team: 2500,
      enterprise: 10000,
    });
  });

  it('falls back to the pro quota for unknown or missing plans', () => {
    expect(scanLimitForPlan('pro')).toBe(PLAN_SCAN_QUOTAS.pro);
    expect(scanLimitForPlan('unknown-plan')).toBe(PLAN_SCAN_QUOTAS.pro);
    expect(scanLimitForPlan(null)).toBe(PLAN_SCAN_QUOTAS.pro);
    expect(scanLimitForPlan(undefined)).toBe(PLAN_SCAN_QUOTAS.pro);
  });

  it('computes the calendar-month cycle in UTC with a retry-after hint', () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    const cycle = currentBillingCycle(now);

    expect(cycle.periodStart).toBe('2026-07-01T00:00:00.000Z');
    expect(cycle.periodEnd).toBe('2026-08-01T00:00:00.000Z');
    // 16.5 days ≈ 1,425,600s; clamped to a 60s floor.
    expect(cycle.retryAfterSeconds).toBe(1425600);
  });

  it('never reports a retry-after below 60s', () => {
    const now = new Date('2026-07-31T23:59:59.000Z');
    expect(currentBillingCycle(now).retryAfterSeconds).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// BillingService
// ---------------------------------------------------------------------------

describe('BillingService', () => {
  describe('resolveUserPlan', () => {
    it('resolves the plan from an active org membership', async () => {
      // 1: membership lookup → org id · 2: organization plan.
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'team' } },
      ]);
      const service = createService(client);

      await expect(service.resolveUserPlan(USER_ID)).resolves.toBe('team');
    });

    it('falls back to the default plan when the user has no membership', async () => {
      const client = createAdminClient([
        { data: null, error: null },
      ]);
      const service = createService(client);

      await expect(service.resolveUserPlan(USER_ID)).resolves.toBe(DEFAULT_PLAN);
    });

    it('falls back to the default plan when the org tables are absent', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'relation does not exist' } },
      ]);
      const service = createService(client);

      await expect(service.resolveUserPlan(USER_ID)).resolves.toBe(DEFAULT_PLAN);
    });

    it('falls back when supabase is not configured', async () => {
      const service = createService(null);
      await expect(service.resolveUserPlan(USER_ID)).resolves.toBe(DEFAULT_PLAN);
    });
  });

  describe('countCycleScans', () => {
    it('returns the exact scan count for the current cycle', async () => {
      const client = createAdminClient([{ count: 42 }]);
      const service = createService(client);

      await expect(
        service.countCycleScans(USER_ID, '2026-07-01T00:00:00.000Z'),
      ).resolves.toBe(42);
    });

    it('rejects with 503 when supabase is not configured', async () => {
      const service = createService(null);
      await expect(
        service.countCycleScans(USER_ID, '2026-07-01T00:00:00.000Z'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('assertScanQuota', () => {
    it('passes when usage is under the plan limit', async () => {
      // 1: membership → org · 2: org plan · 3: scan count (thenable).
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'pro' } },
        { count: 400 },
      ]);
      const service = createService(client);

      await expect(service.assertScanQuota(USER_ID)).resolves.toBeUndefined();
    });

    it('throws 402 QuotaExceededException with retry-after when exhausted', async () => {
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'pro' } },
        { count: 500 },
      ]);
      const service = createService(client);

      const error = await service.assertScanQuota(USER_ID).catch((e) => e);

      expect(error).toBeInstanceOf(QuotaExceededException);
      expect(error).toMatchObject({ status: 402 });
      expect((error as QuotaExceededException).retryAfterSeconds).toBeGreaterThan(0);
      expect((error as QuotaExceededException).message).toContain('500/500');
    });

    it('uses the plan limit matching the resolved plan', async () => {
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'starter' } },
        { count: 100 },
      ]);
      const service = createService(client);

      await expect(service.assertScanQuota(USER_ID)).rejects.toMatchObject({
        status: 402,
      });
    });
  });

  describe('getBilling', () => {
    it('returns the mock-contract payload with real usage', async () => {
      // Query order: resolveUsage (membership, org plan, scan count), then the
      // Promise.all pair — storage's membership probe, then the api_usage
      // lookup, then storage's org read (the concurrent branches interleave).
      const client = createAdminClient([
        // resolveUsage → resolveUserPlan: membership + org plan
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'pro' } },
        // countCycleScans
        { count: 312 },
        // resolveStorageUsage: membership probe
        { data: { organization_id: 'org-1' } },
        // resolveApiUsage: api_usage row
        { data: { calls: 4120 } },
        // resolveStorageUsage: storage columns
        { data: { storage_used_gb: 18.4, storage_limit_gb: 50 } },
      ]);
      const service = createService(client);

      const result = await service.getBilling(USER_ID);

      expect(result.profile.plan).toMatchObject({
        id: 'pro_monthly',
        name: 'Pro',
        priceUsd: 49,
        status: 'active',
      });
      expect(result.profile.usage).toMatchObject({
        period: 'current-month',
        scansUsed: 312,
        scansLimit: 500,
        storageUsedGb: 18.4,
        storageLimitGb: 50,
        apiCallsUsed: 4120,
        apiCallsLimit: PLAN_API_CALL_QUOTAS.pro,
      });
      expect(result.profile.usage.periodStart).toMatch(/T00:00:00.000Z$/);
      expect(result.profile.paymentMethods).toEqual([]);
      expect(result.invoices).toEqual([]);
    });

    it('degrades storage/api usage to nulls when the org tables are absent', async () => {
      const client = createAdminClient([
        // resolveUsage → resolveUserPlan: no membership → default plan
        { data: null },
        // countCycleScans
        { count: 5 },
        // resolveStorageUsage: no membership → nulls (short-circuits)
        { data: null },
        // resolveApiUsage: missing table error → 0 used, plan limit
        { data: null, error: { message: 'Could not find the table public.api_usage' } },
      ]);
      const service = createService(client);

      const result = await service.getBilling(USER_ID);

      expect(result.profile.usage).toMatchObject({
        scansUsed: 5,
        scansLimit: PLAN_SCAN_QUOTAS[DEFAULT_PLAN],
        storageUsedGb: null,
        storageLimitGb: null,
        apiCallsUsed: 0,
        apiCallsLimit: apiCallLimitForPlan(DEFAULT_PLAN),
      });
    });

    it('reports zero api calls when no api_usage row exists for the month', async () => {
      const client = createAdminClient([
        // resolveUsage → resolveUserPlan: membership + org plan
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'team' } },
        // countCycleScans
        { count: 0 },
        // resolveStorageUsage: membership probe
        { data: { organization_id: 'org-1' } },
        // resolveApiUsage: no row → zero used, plan limit
        { data: null },
        // resolveStorageUsage: storage columns
        { data: { storage_used_gb: 1.2, storage_limit_gb: 200 } },
      ]);
      const service = createService(client);

      const result = await service.getBilling(USER_ID);

      expect(result.profile.usage).toMatchObject({
        apiCallsUsed: 0,
        apiCallsLimit: PLAN_API_CALL_QUOTAS.team,
        storageUsedGb: 1.2,
        storageLimitGb: 200,
      });
    });
  });
});
