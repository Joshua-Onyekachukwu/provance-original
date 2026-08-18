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
  PLAN_VU_ALLOWANCES,
  VU_COST_BY_DEPTH,
  VU_OVERAGE_PRICE_USD,
  apiCallLimitForPlan,
  projectScanUsage,
  vuAllowanceForPlan,
  vuCostForDepth,
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
    insert: jest.fn(() => Promise.resolve({ error: null })),
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

  describe('vu policy', () => {
    it('maps each plan to its monthly VU allowance', () => {
      expect(PLAN_VU_ALLOWANCES).toMatchObject({
        starter: 10_000,
        pro: 100_000,
        team: 300_000,
      });
    });

    it('maps depth to its VU cost (quick 1 · standard 10 · deep 100)', () => {
      expect(VU_COST_BY_DEPTH).toMatchObject({
        quick: 1,
        standard: 10,
        deep: 100,
      });
    });

    it('falls back to the pro allowance for unknown or missing plans', () => {
      expect(vuAllowanceForPlan('pro')).toBe(PLAN_VU_ALLOWANCES.pro);
      expect(vuAllowanceForPlan('unknown-plan')).toBe(PLAN_VU_ALLOWANCES.pro);
      expect(vuAllowanceForPlan(null)).toBe(PLAN_VU_ALLOWANCES.pro);
      expect(vuAllowanceForPlan(undefined)).toBe(PLAN_VU_ALLOWANCES.pro);
    });

    it('falls back to the standard cost for unknown depths', () => {
      expect(vuCostForDepth('quick')).toBe(1);
      expect(vuCostForDepth('standard')).toBe(10);
      expect(vuCostForDepth('deep')).toBe(100);
      expect(vuCostForDepth('unknown-depth')).toBe(VU_COST_BY_DEPTH.standard);
      expect(vuCostForDepth(null)).toBe(VU_COST_BY_DEPTH.standard);
    });
  });

  describe('projectScanUsage', () => {
    const cycle = {
      periodStart: '2026-07-01T00:00:00.000Z',
      periodEnd: '2026-08-01T00:00:00.000Z',
    };

    it('projects end-of-cycle usage from the current pace', () => {
      // 10 days elapsed, 250 used → pace 25/day → 31-day July → 775 projected.
      const now = new Date('2026-07-11T00:00:00.000Z');
      const projection = projectScanUsage({
        used: 250,
        limit: 500,
        ...cycle,
        now,
      });

      expect(projection.daysElapsed).toBe(10);
      expect(projection.daysInCycle).toBe(31);
      expect(projection.pacePerDay).toBe(25);
      expect(projection.projectedUnits).toBe(775);
      expect(projection.overageUnits).toBe(275);
      // Rounded to 2dp in the projection (the raw float product has binary
      // noise at the 0.0006 price — assert the rounded wire value).
      expect(projection.overageCostUsd).toBe(
        Math.round(275 * VU_OVERAGE_PRICE_USD * 100) / 100,
      );
    });

    it('reports zero overage when the projection stays under the limit', () => {
      const now = new Date('2026-07-11T00:00:00.000Z');
      const projection = projectScanUsage({
        used: 60,
        limit: 500,
        ...cycle,
        now,
      });

      expect(projection.projectedUnits).toBe(186);
      expect(projection.overageUnits).toBe(0);
      expect(projection.overageCostUsd).toBe(0);
    });

    it('clamps days-elapsed to 1 so a first-day burst never divides by zero', () => {
      const now = new Date('2026-07-01T06:00:00.000Z');
      const projection = projectScanUsage({
        used: 30,
        limit: 100,
        ...cycle,
        now,
      });

      expect(projection.daysElapsed).toBe(1);
      expect(projection.projectedUnits).toBe(930); // 30/day × 31
      expect(projection.overageUnits).toBe(830);
    });

    it('handles zero usage without crashing', () => {
      const now = new Date('2026-07-20T00:00:00.000Z');
      const projection = projectScanUsage({
        used: 0,
        limit: 500,
        ...cycle,
        now,
      });

      expect(projection.projectedUnits).toBe(0);
      expect(projection.overageUnits).toBe(0);
      expect(projection.overageCostUsd).toBe(0);
    });

    it('respects a custom overage price', () => {
      const now = new Date('2026-07-11T00:00:00.000Z');
      const projection = projectScanUsage({
        used: 250,
        limit: 500,
        ...cycle,
        overagePriceUsd: 0.1,
        now,
      });

      expect(projection.overageCostUsd).toBe(27.5);
    });
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

  describe('countCycleUnits', () => {
    it('sums the ledger rows for the cycle window', async () => {
      const client = createAdminClient([
        { data: [{ units: 10 }, { units: 100 }, { units: 10 }] },
      ]);
      const service = createService(client);

      await expect(
        service.countCycleUnits(USER_ID, '2026-07-01T00:00:00.000Z'),
      ).resolves.toBe(120);
    });

    it('returns zero when the ledger has no rows for the cycle', async () => {
      const client = createAdminClient([{ data: [] }]);
      const service = createService(client);

      await expect(
        service.countCycleUnits(USER_ID, '2026-07-01T00:00:00.000Z'),
      ).resolves.toBe(0);
    });

    it('rejects with 503 when supabase is not configured', async () => {
      const service = createService(null);
      await expect(
        service.countCycleUnits(USER_ID, '2026-07-01T00:00:00.000Z'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('recordScanUsage', () => {
    it('writes a ledger row at the depth cost with the cycle month', async () => {
      const client = createAdminClient([]);
      const service = createService(client);
      const admin = client as unknown as {
        from: jest.Mock;
      };

      await service.recordScanUsage({
        scanId: 'scan-1',
        userId: USER_ID,
        depth: 'standard',
        completedAt: '2026-07-16T14:32:00.000Z',
      });

      expect(admin.from).toHaveBeenCalledWith('vu_ledger');
      const insertArg = (admin.from.mock.results[0].value as { insert: jest.Mock }).insert.mock
        .calls[0][0];
      expect(insertArg).toMatchObject({
        user_id: USER_ID,
        scan_id: 'scan-1',
        depth: 'standard',
        units: 10,
        source: 'package',
        cycle_month: '2026-07',
        applied_rate: 10,
      });
    });

    it('writes the deep cost for deep scans', async () => {
      const client = createAdminClient([]);
      const service = createService(client);
      const admin = client as unknown as {
        from: jest.Mock;
      };

      await service.recordScanUsage({
        scanId: 'scan-2',
        userId: USER_ID,
        depth: 'deep',
        completedAt: '2026-07-16T14:32:00.000Z',
      });

      const insertArg = (admin.from.mock.results[0].value as { insert: jest.Mock }).insert.mock
        .calls[0][0];
      expect(insertArg.units).toBe(100);
    });

    it('is best-effort: a ledger write error never throws', async () => {
      const builder = {
        from: jest.fn(() => builder),
        insert: jest.fn(() =>
          Promise.resolve({ error: { message: 'relation does not exist' } }),
        ),
      } as const;
      const service = createService(builder);

      await expect(
        service.recordScanUsage({
          scanId: 'scan-3',
          userId: USER_ID,
          depth: 'quick',
          completedAt: '2026-07-16T14:32:00.000Z',
        }),
      ).resolves.toBeUndefined();
    });

    it('skips the write entirely when supabase is not configured', async () => {
      const service = createService(null);
      await expect(
        service.recordScanUsage({
          scanId: 'scan-4',
          userId: USER_ID,
          depth: 'standard',
          completedAt: '2026-07-16T14:32:00.000Z',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertScanQuota', () => {
    it('passes when the VU meter is under the plan allowance', async () => {
      // 1: membership → org · 2: org plan · 3: scan count · 4: VU ledger sum.
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'pro' } },
        { count: 400 },
        { data: [{ units: 40000 }] },
      ]);
      const service = createService(client);

      await expect(service.assertScanQuota(USER_ID)).resolves.toBeUndefined();
    });

    it('throws 402 QuotaExceededException with retry-after when the VU meter is exhausted', async () => {
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'pro' } },
        { data: [{ units: 100000 }] },
      ]);
      const service = createService(client);

      const error = await service.assertScanQuota(USER_ID).catch((e) => e);

      expect(error).toBeInstanceOf(QuotaExceededException);
      expect(error).toMatchObject({ status: 402 });
      expect((error as QuotaExceededException).retryAfterSeconds).toBeGreaterThan(0);
      expect((error as QuotaExceededException).message).toContain('100000/100000');
    });

    it('uses the VU allowance matching the resolved plan', async () => {
      const client = createAdminClient([
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'starter' } },
        { data: [{ units: 10000 }] },
      ]);
      const service = createService(client);

      await expect(service.assertScanQuota(USER_ID)).rejects.toMatchObject({
        status: 402,
      });
    });
  });

  describe('getBilling', () => {
    it('returns the mock-contract payload with real usage', async () => {
      // Query order: resolveUsage (membership, org plan, ledger sum), then the
      // Promise.all pair — storage's membership probe, then the api_usage
      // lookup, then storage's org read (the concurrent branches interleave).
      const client = createAdminClient([
        // resolveUsage → resolveUserPlan: membership + org plan
        { data: { organization_id: 'org-1' } },
        { data: { plan: 'pro' } },
        // countCycleUnits: ledger sum
        { data: [{ units: 3120 }] },
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
        // VU meter
        unitsUsed: 3120,
        unitsLimit: PLAN_VU_ALLOWANCES.pro,
        storageUsedGb: 18.4,
        storageLimitGb: 50,
        apiCallsUsed: 4120,
        apiCallsLimit: PLAN_API_CALL_QUOTAS.pro,
      });
      expect(result.profile.usage.periodStart).toMatch(/T00:00:00.000Z$/);
      // Projection is computed from the same unitsUsed/limit/cycle fields.
      expect(result.profile.usage.projection).toMatchObject({
        projectedUnits: expect.any(Number),
        overageUnits: expect.any(Number),
        overageCostUsd: expect.any(Number),
      });
      expect(result.profile.paymentMethods).toEqual([]);
      expect(result.invoices).toEqual([]);
    });

    it('degrades storage/api usage to nulls when the org tables are absent', async () => {
      const client = createAdminClient([
        // resolveUsage → resolveUserPlan: no membership → default plan
        { data: null },
        // countCycleUnits: ledger sum
        { data: [{ units: 120 }] },
        // resolveStorageUsage: no membership → nulls (short-circuits)
        { data: null },
        // resolveApiUsage: missing table error → 0 used, plan limit
        { data: null, error: { message: 'Could not find the table public.api_usage' } },
      ]);
      const service = createService(client);

      const result = await service.getBilling(USER_ID);

      expect(result.profile.usage).toMatchObject({
        unitsUsed: 120,
        unitsLimit: PLAN_VU_ALLOWANCES[DEFAULT_PLAN],
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
        // countCycleUnits: ledger sum
        { data: [] },
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
        unitsUsed: 0,
        unitsLimit: PLAN_VU_ALLOWANCES.team,
        apiCallsUsed: 0,
        apiCallsLimit: PLAN_API_CALL_QUOTAS.team,
        storageUsedGb: 1.2,
        storageLimitGb: 200,
      });
    });
  });
});
