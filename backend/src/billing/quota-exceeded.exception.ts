import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * 402 Payment Required raised when a workspace's monthly VU (Verification
 * Unit) allowance for the current billing cycle is exhausted. Carries
 * `retryAfterSeconds` so the global exception filter can emit a `Retry-After`
 * header (RFC 9110), telling clients when the next cycle starts and new
 * scans become available again.
 *
 * The exception body carries `unitsUsed` / `unitsLimit` (the ratified VU
 * ledger names) and optionally `requestedUnits` (the rejected scan's
 * size-aware projected cost) for tests and tooling; the global exception
 * filter emits only the API-standard envelope (statusCode / message / path /
 * requestId / timestamp) on the wire, so the contract surface is the message.
 */
export class QuotaExceededException extends HttpException {
  readonly retryAfterSeconds: number;

  constructor(input: {
    plan: string;
    unitsUsed: number;
    unitsLimit: number;
    periodEnd: string;
    retryAfterSeconds: number;
    requestedUnits?: number;
  }) {
    const { plan, unitsUsed, unitsLimit, periodEnd, retryAfterSeconds } = input;
    const requestedUnits = input.requestedUnits ?? 0;

    const message =
      requestedUnits > 0 && unitsUsed < unitsLimit
        ? `Monthly verification-unit allowance cannot cover this file: it needs ${requestedUnits} VUs but only ${unitsLimit - unitsUsed} remain (${unitsUsed}/${unitsLimit} on the ${plan} plan). New scans resume ${periodEnd}.`
        : `Monthly verification-unit allowance reached (${unitsUsed}/${unitsLimit} on the ${plan} plan). New scans resume ${periodEnd}.`;

    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'QUOTA_EXCEEDED',
        message,
        plan,
        unitsUsed,
        unitsLimit,
        periodEnd,
        ...(requestedUnits > 0 ? { requestedUnits } : {}),
      },
      HttpStatus.PAYMENT_REQUIRED,
    );

    this.retryAfterSeconds = retryAfterSeconds;
  }
}
