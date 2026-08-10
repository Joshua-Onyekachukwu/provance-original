import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { QuotaExceededException } from './quota-exceeded.exception';

// ---------------------------------------------------------------------------
// Plan catalog — single source of truth for scan entitlements.
//
// The organizations table carries a `plan` text column (default 'pro'); these
// monthly scan allowances map each plan to its included scan quota. Mirrors
// the mockBillingProfile usage limits the Billing page already renders.
// ---------------------------------------------------------------------------

export const PLAN_SCAN_QUOTAS: Record<string, number> = {
  starter: 100,
  pro: 500,
  team: 2500,
  enterprise: 10000,
};

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

/**
 * Per-scan overage price (USD) applied to projected usage above the plan's
 * monthly scan quota. Configurable via SCAN_OVERAGE_PRICE_USD; the estimate is
 * informational (the Billing page's projected-usage StatCard) until a payment
 * processor lands.
 */
export const OVERAGE_PRICE_PER_SCAN_USD = 0.05;

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
  const price = input.overagePriceUsd ?? OVERAGE_PRICE_PER_SCAN_USD;
  const now = input.now ?? new Date();

  const startMs = new Date(periodStart).getTime();
  const endMs = new Date(periodEnd).getTime();
  const nowMs = now.getTime();

  const daysElapsed = Math.max(1, Math.floor((nowMs - startMs) / DAY_MS));
  const daysInCycle = Math.max(1, Math.round((endMs - startMs) / DAY_MS));

  const pacePerDay = used / daysElapsed;
  const projectedScans = Math.round(pacePerDay * daysInCycle);
  const overageScans = Math.max(0, projectedScans - limit);
  const overageCostUsd =
    Math.round(overageScans * price * 100) / 100;

  return {
    daysElapsed,
    daysInCycle,
    pacePerDay: Math.round(pacePerDay * 100) / 100,
    projectedScans,
    overageScans,
    overageCostUsd,
  };
}

const PLAN_DISPLAY: Record<string, { name: string; priceUsd: number; seats: number }> = {
  starter: { name: 'Starter', priceUsd: 0, seats: 1 },
  pro: { name: 'Pro', priceUsd: 49, seats: 3 },
  team: { name: 'Team', priceUsd: 199, seats: 10 },
  enterprise: { name: 'Enterprise', priceUsd: 999, seats: 25 },
};

export function scanLimitForPlan(plan: string | null | undefined): number {
  return PLAN_SCAN_QUOTAS[plan ?? ''] ?? PLAN_SCAN_QUOTAS[DEFAULT_PLAN];
}

export function apiCallLimitForPlan(plan: string | null | undefined): number {
  return PLAN_API_CALL_QUOTAS[plan ?? ''] ?? PLAN_API_CALL_QUOTAS[DEFAULT_PLAN];
}

export function planDisplay(plan: string) {
  return PLAN_DISPLAY[plan] ?? PLAN_DISPLAY[DEFAULT_PLAN];
}

/**
 * Current monthly billing cycle as an ISO interval. The cycle is the calendar
 * month in UTC — matches the mock's `period: 'current-month'` contract.
 */
export function currentBillingCycle(now = new Date()) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const retryAfterSeconds = Math.max(
    60,
    Math.ceil((periodEnd.getTime() - now.getTime()) / 1000),
  );

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    retryAfterSeconds,
  };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly orgMembersTable: string;
  private readonly orgsTable: string;
  private readonly scansTable: string;
  private readonly apiUsageTable: string;
  private readonly overagePriceUsd: number;

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
    this.scansTable = configService.get<string>('SUPABASE_SCANS_TABLE', 'scans');
    this.apiUsageTable =
      configService.get<string>('SUPABASE_API_USAGE_TABLE') || 'api_usage';
    this.overagePriceUsd =
      Number(configService.get<number>('SCAN_OVERAGE_PRICE_USD')) > 0
        ? Number(configService.get<number>('SCAN_OVERAGE_PRICE_USD'))
        : OVERAGE_PRICE_PER_SCAN_USD;
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
   * Count scans initiated by the user since the current cycle started. This is
   * the metered value the Billing page renders and the enforcement gate uses.
   */
  async countCycleScans(userId: string, periodStartIso: string): Promise<number> {
    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { count, error } = await adminClient
      .from(this.scansTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', periodStartIso);

    if (error) {
      throw new ServiceUnavailableException('Failed to resolve scan usage.');
    }

    return count ?? 0;
  }

  /**
   * Resolve the user's plan + metered usage for the current cycle — the shape
   * the Billing page consumes (mirrors mockGetBilling's profile.usage).
   */
  async resolveUsage(userId: string) {
    const plan = await this.resolveUserPlan(userId);
    const cycle = currentBillingCycle();
    const scansUsed = await this.countCycleScans(userId, cycle.periodStart);
    const scansLimit = scanLimitForPlan(plan);

    return {
      plan,
      scansUsed,
      scansLimit,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      retryAfterSeconds: cycle.retryAfterSeconds,
    };
  }

  /**
   * Entitlement gate for initiateScan. Throws 402 with a Retry-After hint when
   * the current cycle's scan quota is exhausted.
   */
  async assertScanQuota(userId: string) {
    const usage = await this.resolveUsage(userId);

    if (usage.scansUsed >= usage.scansLimit) {
      throw new QuotaExceededException({
        plan: usage.plan,
        used: usage.scansUsed,
        limit: usage.scansLimit,
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
          scansUsed: usage.scansUsed,
          scansLimit: usage.scansLimit,
          storageUsedGb: storage.usedGb,
          storageLimitGb: storage.limitGb,
          apiCallsUsed: apiUsage.used,
          apiCallsLimit: apiUsage.limit,
          // End-of-cycle projection from the current pace — powers the
          // Billing page's projected-usage StatCard.
          projection: projectScanUsage({
            used: usage.scansUsed,
            limit: usage.scansLimit,
            periodStart: usage.periodStart,
            periodEnd: usage.periodEnd,
            overagePriceUsd: this.overagePriceUsd,
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
