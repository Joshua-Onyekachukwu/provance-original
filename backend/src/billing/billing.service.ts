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

export const DEFAULT_PLAN = 'pro';

const PLAN_DISPLAY: Record<string, { name: string; priceUsd: number; seats: number }> = {
  starter: { name: 'Starter', priceUsd: 0, seats: 1 },
  pro: { name: 'Pro', priceUsd: 49, seats: 3 },
  team: { name: 'Team', priceUsd: 199, seats: 10 },
  enterprise: { name: 'Enterprise', priceUsd: 999, seats: 25 },
};

export function scanLimitForPlan(plan: string | null | undefined): number {
  return PLAN_SCAN_QUOTAS[plan ?? ''] ?? PLAN_SCAN_QUOTAS[DEFAULT_PLAN];
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
   * is wired; usage reflects the real scans table.
   */
  async getBilling(userId: string) {
    const usage = await this.resolveUsage(userId);
    const display = planDisplay(usage.plan);

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
          storageUsedGb: null,
          storageLimitGb: null,
          apiCallsUsed: null,
          apiCallsLimit: null,
        },
        paymentMethods: [],
      },
      invoices: [],
    };
  }
}
