import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { QuotaExceededException } from './quota-exceeded.exception';

// ---------------------------------------------------------------------------
// Plan catalog — single source of truth for VU entitlements.
//
// The organizations table carries a `plan` text column (default 'pro'); these
// monthly VU (Verification Unit) allowances map each plan to its included
// usage. Mirrors the mockBillingProfile usage limits the Billing page
// renders. Ratified in docs/engineering/USAGE_CREDITS_PROPOSAL.md
// (VUs, 100k at Pro, hard-stop overage, free failed scans).
// ---------------------------------------------------------------------------

/**
 * Monthly VU allowances per plan. Enterprise is a placeholder for committed
 * blocks negotiated per contract (rollout step 4); the workspace meter needs
 * a number to render.
 */
export const PLAN_VU_ALLOWANCES: Record<string, number> = {
  starter: 10_000,
  pro: 100_000,
  team: 300_000,
  enterprise: 250_000, // placeholder — committed blocks negotiated per contract
};

/**
 * Depth → VU cost base (the dial that converts scans into units). Applied when
 * a scan COMPLETES at the depth it ran; failed scans consume 0. Changing
 * these values is the "tighten the dial" lever — the ledger's `applied_rate`
 * keeps history auditable across changes.
 *
 * The base is multiplied by the size-tier factor (`vuSizeMultiplier`) so a
 * 50 MB forensic pass costs meaningfully more than a 200 KB triage — the
 * effective per-scan rate is `ceil(base × sizeFactor)`.
 */
export const VU_COST_BY_DEPTH: Record<string, number> = {
  quick: 1,
  standard: 10,
  deep: 100,
};

/**
 * Size → VU multiplier tiers. The multiplier scales the depth base so heavier
 * files (more pixels, more metadata, more decode work) pay for the extra
 * processing instead of costing the same as a tiny file. Boundaries are
 * MiB-based; a missing/zero size defaults to the 1× tier (e.g. tests or
 * legacy rows). Ceil at the end keeps a charge from ever rounding down to
 * the base cost.
 */
export const VU_SIZE_MULTIPLIERS: ReadonlyArray<{
  minBytes: number;
  label: string;
  multiplier: number;
}> = [
  { minBytes: 100 * 1024 * 1024, label: 'xlarge', multiplier: 6.0 }, // ≥ 100 MiB
  { minBytes: 20 * 1024 * 1024, label: 'large', multiplier: 4.0 }, // 20–100 MiB
  { minBytes: 5 * 1024 * 1024, label: 'medium', multiplier: 2.5 }, // 5–20 MiB
  { minBytes: 1 * 1024 * 1024, label: 'small', multiplier: 1.5 }, // 1–5 MiB
  { minBytes: 0, label: 'micro', multiplier: 1.0 }, // < 1 MiB
];

/**
 * vuSizeMultiplier — the size tier for a file's byte count. Returns 1.0 for
 * missing/zero sizes so callers without a size (tests, legacy rows) always
 * get the flat depth base.
 */
export function vuSizeMultiplier(sizeBytes: number | null | undefined): number {
  const bytes = Number(sizeBytes) || 0;
  const tier = VU_SIZE_MULTIPLIERS.find((entry) => bytes >= entry.minBytes);
  return tier?.multiplier ?? 1.0;
}

/**
 * Per-plan monthly API-call allowances — the apiCallsLimit side of the
 * Billing usage meter. Read from the plan catalog (not the api_usage table,
 * which only stores the used count), so limits stay code-configurable.
 */
export const PLAN_API_CALL_QUOTAS: Record<string, number> = {
  starter: 1000,
  pro: 10000,
  team: 50000,
  enterprise: 250000,
};

export const DEFAULT_PLAN = 'pro';

export function vuAllowanceForPlan(plan: string | null | undefined): number {
  return (
    PLAN_VU_ALLOWANCES[plan ?? ''] ?? PLAN_VU_ALLOWANCES[DEFAULT_PLAN]
  );
}

/**
 * Content-weight resolution factor — high-resolution images (more pixels to
 * decode, analyze, and grid-split) cost proportionally more than low-res
 * equivalents of the same byte size. A 1×1 thumbnail and a 50MP RAW file
 * that happen to be the same compressed size should not cost the same.
 *
 * The factor scales from 1.0× (≤2 MP, the baseline) up to 3.0× (≥50 MP).
 * Pixel count = width × height; a missing dimension defaults to 1×.
 */
export function resolutionFactor(width: number | null | undefined, height: number | null | undefined): number {
  const pixels = (Number(width) || 0) * (Number(height) || 0);
  if (pixels <= 0) return 1.0;
  // 2 MP = 1×, 8 MP = 1.5×, 20 MP = 2×, 50 MP = 3×
  const megapixels = pixels / 1_000_000;
  if (megapixels <= 2) return 1.0;
  if (megapixels >= 50) return 3.0;
  return 1.0 + ((megapixels - 2) / 48) * 2.0;
}

/**
 * vuCostForDepth — the effective per-scan VU cost: depth base × size-tier
 * multiplier × resolution factor, ceiled to an integer (the ledger stores
 * whole units). Without a size the multiplier is 1×, so existing callers/tests
 * keep the flat depth base.
 */
export function vuCostForDepth(
  depth: string | null | undefined,
  sizeBytes?: number | null,
  width?: number | null,
  height?: number | null,
): number {
  const base = VU_COST_BY_DEPTH[depth ?? ''] ?? VU_COST_BY_DEPTH.standard;
  return Math.ceil(base * vuSizeMultiplier(sizeBytes) * resolutionFactor(width, height));
}

/**
 * Per-unit overage price (USD) applied to projected usage above the plan's
 * monthly VU allowance. Configurable via VU_OVERAGE_PRICE_USD; the estimate is
 * informational (the Billing page's projected-usage StatCard) until a payment
 * processor lands. The 0.0006 default aligns with the volume-priced VU bands
 * in USAGE_CREDITS_PROPOSAL.md.
 */
export const VU_OVERAGE_PRICE_USD = 0.0006;

const DAY_MS = 86_400_000;

/**
 * projectScanUsage — end-of-cycle projection from current usage pace.
 *
 * Pure function (no I/O) so the billing spec can lock the math:
 *   pace        = used / max(1, days elapsed in cycle)
 *   projected   = round(pace * days in cycle)
 *   overage     = max(0, projected - limit)
 *   overageCost = overage * price (2dp)
 *
 * Degenerates gracefully: zero used → zero projection, days-elapsed clamped
 * to 1 so a first-day burst never divides by zero.
 */
export function projectScanUsage(input: {
  used: number;
  limit: number;
  periodStart: string;
  periodEnd: string;
  overagePriceUsd?: number;
  now?: Date;
}) {
  const { used, limit, periodStart, periodEnd } = input;
  const price = input.overagePriceUsd ?? VU_OVERAGE_PRICE_USD;
  const now = input.now ?? new Date();

  const startMs = new Date(periodStart).getTime();
  const endMs = new Date(periodEnd).getTime();
  const nowMs = now.getTime();

  const daysElapsed = Math.max(1, Math.floor((nowMs - startMs) / DAY_MS));
  const daysInCycle = Math.max(1, Math.round((endMs - startMs) / DAY_MS));

  const pacePerDay = used / daysElapsed;
  const projectedUnits = Math.round(pacePerDay * daysInCycle);
  const overageUnits = Math.max(0, projectedUnits - limit);
  const overageCostUsd =
    Math.round(overageUnits * price * 100) / 100;

  return {
    daysElapsed,
    daysInCycle,
    pacePerDay: Math.round(pacePerDay * 100) / 100,
    projectedUnits,
    overageUnits,
    overageCostUsd,
  };
}

const PLAN_DISPLAY: Record<string, { name: string; priceUsd: number; seats: number }> = {
  starter: { name: 'Starter', priceUsd: 0, seats: 1 },
  pro: { name: 'Pro', priceUsd: 49, seats: 3 },
  team: { name: 'Team', priceUsd: 199, seats: 10 },
  enterprise: { name: 'Enterprise', priceUsd: 999, seats: 25 },
};

export function apiCallLimitForPlan(plan: string | null | undefined): number {
  return PLAN_API_CALL_QUOTAS[plan ?? ''] ?? PLAN_API_CALL_QUOTAS[DEFAULT_PLAN];
}

export function planDisplay(plan: string) {
  return PLAN_DISPLAY[plan] ?? PLAN_DISPLAY[DEFAULT_PLAN];
}

/**
 * One calendar month's billing cycle as an ISO interval (UTC).
 */
export function cycleForMonth(year: number, month: number) {
  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 1));
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

/**
 * The month BEFORE the current one — the window whose unused balance rolls
 * over (≤1×) into the current cycle's limit.
 */
export function previousBillingCycle(now = new Date()) {
  return cycleForMonth(now.getUTCFullYear(), now.getUTCMonth() - 1);
}

/**
 * Current monthly billing cycle as an ISO interval. The cycle is the calendar
 * month in UTC — matches the mock's `period: 'current-month'` contract.
 */
export function currentBillingCycle(now = new Date()) {
  const { periodStart, periodEnd } = cycleForMonth(
    now.getUTCFullYear(),
    now.getUTCMonth(),
  );
  const retryAfterSeconds = Math.max(
    60,
    Math.ceil((new Date(periodEnd).getTime() - now.getTime()) / 1000),
  );

  return {
    periodStart,
    periodEnd,
    retryAfterSeconds,
  };
}

/**
 * ≤1× monthly rollover — unused VUs carry into the next cycle's limit, capped
 * at one full monthly allowance so the balance can never compound across
 * months. The cap falls out of construction: unused can never exceed one
 * allowance (usage ≥ 0), so `min(unused, allowance × multiplier)` is always
 * ≤ 1× — the multiplier exists as the dial if the cap is ever loosened.
 */
export const VU_ROLLOVER_MULTIPLIER = 1;

/**
 * carriedOverUnits — the ≤1× carry from a prior cycle's unused balance.
 * Pure function (no I/O) so the billing spec can lock the math.
 */
export function carriedOverUnits(input: {
  allowance: number;
  priorCycleUsed: number;
  multiplier?: number;
}): number {
  const { allowance, priorCycleUsed } = input;
  const multiplier = input.multiplier ?? VU_ROLLOVER_MULTIPLIER;
  const unused = Math.max(0, allowance - priorCycleUsed);
  return Math.min(unused, Math.round(allowance * multiplier));
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly orgMembersTable: string;
  private readonly orgsTable: string;
  private readonly apiUsageTable: string;
  private readonly vuLedgerTable: string;
  private readonly vuOveragePriceUsd: number;

  constructor(
    private readonly supabaseService: SupabaseService,
    configService: ConfigService,
  ) {
    this.orgMembersTable = configService.get<string>(
      'SUPABASE_ORGANIZATION_MEMBERS_TABLE',
      'organization_members',
    );
    this.orgsTable = configService.get<string>(
      'SUPABASE_ORGANIZATIONS_TABLE',
      'organizations',
    );
    this.apiUsageTable =
      configService.get<string>('SUPABASE_API_USAGE_TABLE') || 'api_usage';
    this.vuLedgerTable =
      configService.get<string>('SUPABASE_VU_LEDGER_TABLE') || 'vu_ledger';
    this.vuOveragePriceUsd =
      Number(configService.get<number>('VU_OVERAGE_PRICE_USD')) > 0
        ? Number(configService.get<number>('VU_OVERAGE_PRICE_USD'))
        : VU_OVERAGE_PRICE_USD;
  }

  /**
   * Resolve the user's effective plan: active org membership → org plan,
   * falling back to DEFAULT_PLAN when the org tables are absent (fresh
   * databases with only 0002 applied) or the user has no membership. Never
   * throws — entitlement defaults must not block scanning.
   */
  async resolveUserPlan(userId: string): Promise<string> {
    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) return DEFAULT_PLAN;

    try {
      const { data: membership } = await adminClient
        .from(this.orgMembersTable)
        .select('organization_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership?.organization_id) return DEFAULT_PLAN;

      const { data: organization } = await adminClient
        .from(this.orgsTable)
        .select('plan')
        .eq('id', membership.organization_id)
        .maybeSingle();

      return organization?.plan ?? DEFAULT_PLAN;
    } catch (error) {
      this.logger.warn(
        `Plan resolution skipped for user ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return DEFAULT_PLAN;
    }
  }

  /**
   * Sum the user's VU ledger within a cycle window (created_at >= periodStart
   * and, when given, < periodEnd). This is the metered value the Billing page
   * renders and the enforcement gate uses. Rollover rows (source='rollover')
   * are limit-side credits, NOT deductions — they are excluded so the carry
   * never inflates unitsUsed.
   */
  async countCycleUnits(
    userId: string,
    periodStartIso: string,
    periodEndIso?: string,
  ): Promise<number> {
    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    let query = adminClient
      .from(this.vuLedgerTable)
      .select('units')
      .eq('user_id', userId)
      .gte('created_at', periodStartIso)
      .neq('source', 'rollover');

    if (periodEndIso) {
      query = query.lt('created_at', periodEndIso);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServiceUnavailableException('Failed to resolve VU usage.');
    }

    const rows = (data ?? []) as Array<{ units: number | null }>;
    return rows.reduce((sum, row) => sum + (Number(row.units) || 0), 0);
  }

  /**
   * The ≤1× carry into the current cycle: unused from the PRIOR cycle, capped
   * at one full allowance. Queries the prior window [prevStart, currentStart)
   * with the same rollover-excluding meter, so a banked balance can never
   * compound — each cycle's carry is derived from that cycle's unused alone.
   */
  async computeCarriedOver(
    userId: string,
    plan: string,
    now = new Date(),
  ): Promise<number> {
    const allowance = vuAllowanceForPlan(plan);
    const current = currentBillingCycle(now);
    const previous = previousBillingCycle(now);
    const priorUsed = await this.countCycleUnits(
      userId,
      previous.periodStart,
      current.periodStart,
    );
    return carriedOverUnits({ allowance, priorCycleUsed: priorUsed });
  }

  /**
   * Lazy, best-effort materialization of the current cycle's carry: writes ONE
   * source='rollover' ledger row per user per cycle (check-then-insert, with
   * the 0024 partial unique index as the hard backstop). The row is a
   * limit-side credit for auditability — rollover_basis snapshots the
   * allowance it was computed against. Best-effort by design: a missing
   * migration (0024 not applied) only logs a warning; the carry still folds
   * into unitsLimit in-memory.
   */
  private async recordRollover(input: {
    userId: string;
    carried: number;
    allowance: number;
    now?: Date;
  }): Promise<void> {
    const { userId, carried, allowance } = input;
    if (carried <= 0) return;

    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) return;

    const now = input.now ?? new Date();
    const cycleMonth = currentBillingCycle(now).periodStart.slice(0, 7); // 'YYYY-MM'

    try {
      const { data: existing } = await adminClient
        .from(this.vuLedgerTable)
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'rollover')
        .eq('cycle_month', cycleMonth)
        .maybeSingle();

      if (existing) return;

      const { error } = await adminClient.from(this.vuLedgerTable).insert({
        user_id: userId,
        scan_id: null,
        depth: null,
        units: carried,
        source: 'rollover',
        cycle_month: cycleMonth,
        applied_rate: null,
        rollover_basis: allowance,
      });

      if (error) {
        this.logger.warn(
          `Rollover ledger write skipped for user ${userId}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Rollover ledger write skipped for user ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  /**
   * Deduct-on-complete: write a VU ledger row for a completed scan at the
   * size-aware depth cost (quick 1 · standard 10 · deep 100, × size-tier
   * multiplier). Failed scans never call this — they consume 0. Best-effort
   * by design: metering must not block or fail scans, so a missing ledger
   * table (migration 0022 not applied) or a write error only logs a warning
   * and lets the scan proceed.
   */
  async recordScanUsage(input: {
    scanId: string;
    userId: string;
    depth: string;
    sizeBytes?: number | null;
    completedAt: string;
  }): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) return;

    const units = vuCostForDepth(input.depth, input.sizeBytes);
    if (units <= 0) return;

    try {
      const { error } = await adminClient.from(this.vuLedgerTable).insert({
        user_id: input.userId,
        scan_id: input.scanId,
        depth: input.depth,
        units,
        source: 'package',
        cycle_month: input.completedAt.slice(0, 7), // 'YYYY-MM'
        applied_rate: units,
        created_at: input.completedAt,
      });

      if (error) {
        this.logger.warn(
          `VU ledger write skipped for scan ${input.scanId}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `VU ledger write skipped for scan ${input.scanId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  /**
   * Resolve the user's plan + metered usage for the current cycle — the shape
   * the Billing page consumes (mirrors mockGetBilling's profile.usage).
   * `unitsLimit = allowance + carriedOver` (≤1× monthly rollover), so the
   * 402 gate and the meters read the effective limit including any carry.
   */
  async resolveUsage(userId: string, now = new Date()) {
    const plan = await this.resolveUserPlan(userId);
    const cycle = currentBillingCycle(now);
    const unitsUsed = await this.countCycleUnits(userId, cycle.periodStart);
    const allowance = vuAllowanceForPlan(plan);
    const carriedOver = await this.computeCarriedOver(userId, plan, now);
    const unitsLimit = allowance + carriedOver;

    // Best-effort audit row for the carry (skipped when it's 0).
    await this.recordRollover({ userId, carried: carriedOver, allowance, now });

    return {
      plan,
      // VU meter — the ratified ledger names, now with the rollover folded in.
      unitsUsed,
      unitsLimit,
      allowance,
      carriedOver,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      retryAfterSeconds: cycle.retryAfterSeconds,
    };
  }

  /**
   * Entitlement gate for initiateScan. Throws 402 with a Retry-After hint when
   * the current cycle's VU allowance cannot cover the requested scan: either
   * nothing remains, or the scan's size-aware cost (`reserveUnits`) exceeds
   * what's left. `reserveUnits` is the projected cost of the incoming file
   * (`vuCostForDepth(mode, sizeBytes)` computed by the scans service); the
   * gate reserves against it per the contract, so a 50 MB deep scan is
   * rejected before any record is created when the remaining allowance
   * wouldn't cover it.
   */
  async assertScanQuota(userId: string, reserveUnits = 0) {
    const usage = await this.resolveUsage(userId);

    const remaining = usage.unitsLimit - usage.unitsUsed;
    if (remaining <= 0 || reserveUnits > remaining) {
      throw new QuotaExceededException({
        plan: usage.plan,
        unitsUsed: usage.unitsUsed,
        unitsLimit: usage.unitsLimit,
        // The message explains why a non-exhausted meter can still reject:
        // the file's projected cost exceeds the remaining allowance.
        requestedUnits: reserveUnits,
        periodEnd: usage.periodEnd,
        retryAfterSeconds: usage.retryAfterSeconds,
      });
    }
  }

  /**
   * GET /billing payload — mirrors the mockBillingProfile contract the Billing
   * page already renders. Invoices/payment methods are empty until a processor
   * is wired; usage reflects the real scans table, the org's storage columns,
   * and the api_usage table.
   */
  async getBilling(userId: string) {
    const usage = await this.resolveUsage(userId);
    const display = planDisplay(usage.plan);
    const [storage, apiUsage] = await Promise.all([
      this.resolveStorageUsage(userId),
      this.resolveApiUsage(userId, usage.periodStart, usage.plan),
    ]);

    return {
      profile: {
        plan: {
          id: `${usage.plan}_monthly`,
          name: display.name,
          billingCycle: 'monthly',
          priceUsd: display.priceUsd,
          status: 'active',
          seats: display.seats,
          // Reuse the cycle resolved with usage so plan and usage can never
          // straddle a month boundary on the same request.
          startedAt: usage.periodStart,
          renewsAt: usage.periodEnd,
          canChangePlan: true,
        },
        usage: {
          period: 'current-month',
          periodStart: usage.periodStart,
          periodEnd: usage.periodEnd,
          // VU meter — the ratified ledger names, plus the ≤1× rollover
          // component so the UI can render "incl. X carried over" from the
          // same payload the meters read.
          unitsUsed: usage.unitsUsed,
          unitsLimit: usage.unitsLimit,
          allowance: usage.allowance,
          carriedOver: usage.carriedOver,
          storageUsedGb: storage.usedGb,
          storageLimitGb: storage.limitGb,
          apiCallsUsed: apiUsage.used,
          apiCallsLimit: apiUsage.limit,
          // End-of-cycle VU projection from the current pace — powers the
          // Billing page's projected-usage StatCard.
          projection: projectScanUsage({
            used: usage.unitsUsed,
            limit: usage.unitsLimit,
            periodStart: usage.periodStart,
            periodEnd: usage.periodEnd,
            overagePriceUsd: this.vuOveragePriceUsd,
          }),
        },
        paymentMethods: [],
      },
      invoices: [],
    };
  }

  /**
   * resolveStorageUsage — reads the user's org storage columns
   * (storage_used_gb / storage_limit_gb from migration 0005). Best-effort:
   * a missing org table/membership degrades to nulls so a fresh DB never
   * breaks the billing payload.
   */
  private async resolveStorageUsage(userId: string): Promise<{
    usedGb: number | null;
    limitGb: number | null;
  }> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return { usedGb: null, limitGb: null };
    }

    try {
      const { data: membership } = await adminClient
        .from(this.orgMembersTable)
        .select('organization_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership?.organization_id) {
        return { usedGb: null, limitGb: null };
      }

      const { data: organization } = await adminClient
        .from(this.orgsTable)
        .select('storage_used_gb,storage_limit_gb')
        .eq('id', membership.organization_id)
        .maybeSingle();

      if (!organization) {
        return { usedGb: null, limitGb: null };
      }

      return {
        usedGb: Number(organization.storage_used_gb) || null,
        limitGb: Number(organization.storage_limit_gb) || null,
      };
    } catch (error) {
      this.logger.warn(
        `Storage usage skipped for user ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { usedGb: null, limitGb: null };
    }
  }

  /**
   * resolveApiUsage — reads the user's api_usage row for the current month
   * and pairs the used count with the plan's API-call allowance. Best-effort:
   * a missing table (migration 0020 not applied) or missing row degrades to
   * used 0 with the plan limit, so the meter still renders.
   */
  private async resolveApiUsage(
    userId: string,
    periodStartIso: string,
    plan: string,
  ): Promise<{
    used: number | null;
    limit: number | null;
  }> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return { used: null, limit: null };
    }

    const periodMonth = periodStartIso.slice(0, 7); // 'YYYY-MM'

    try {
      const { data, error } = await adminClient
        .from(this.apiUsageTable)
        .select('calls')
        .eq('user_id', userId)
        .eq('period_month', periodMonth)
        .maybeSingle();

      if (error || !data) {
        // Missing migration/row → zero used, plan limit intact.
        return { used: 0, limit: apiCallLimitForPlan(plan) };
      }

      return {
        used: Number(data.calls) || 0,
        limit: apiCallLimitForPlan(plan),
      };
    } catch (error) {
      this.logger.warn(
        `API usage skipped for user ${userId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { used: null, limit: null };
    }
  }
}
