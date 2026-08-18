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
 * ledger names) for tests and tooling; the global exception filter emits only
 * the API-standard envelope (statusCode / message / path / requestId /
 * timestamp) on the wire, so the contract surface is the message.
 */
export class QuotaExceededException extends HttpException {
  readonly retryAfterSeconds: number;

  constructor(input: {
    plan: string;
    unitsUsed: number;
    unitsLimit: number;
    periodEnd: string;
    retryAfterSeconds: number;
  }) {
    const { plan, unitsUsed, unitsLimit, periodEnd, retryAfterSeconds } = input;

    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'QUOTA_EXCEEDED',
        message: `Monthly verification-unit allowance reached (${unitsUsed}/${unitsLimit} on the ${plan} plan). New scans resume ${periodEnd}.`,
        plan,
        unitsUsed,
        unitsLimit,
        periodEnd,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );

    this.retryAfterSeconds = retryAfterSeconds;
  }
}
