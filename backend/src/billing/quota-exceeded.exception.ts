import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * 402 Payment Required raised when a workspace's plan scan quota for the
 * current billing cycle is exhausted. Carries `retryAfterSeconds` so the
 * global exception filter can emit a `Retry-After` header (RFC 9110), telling
 * clients when the next cycle starts and new scans become available again.
 */
export class QuotaExceededException extends HttpException {
  readonly retryAfterSeconds: number;

  constructor(input: {
    plan: string;
    used: number;
    limit: number;
    periodEnd: string;
    retryAfterSeconds: number;
  }) {
    const { plan, used, limit, periodEnd, retryAfterSeconds } = input;

    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'QUOTA_EXCEEDED',
        message: `Monthly scan quota reached (${used}/${limit} on the ${plan} plan). New scans resume ${periodEnd}.`,
        plan,
        used,
        limit,
        periodEnd,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );

    this.retryAfterSeconds = retryAfterSeconds;
  }
}
