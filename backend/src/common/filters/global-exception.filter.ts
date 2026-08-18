import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url: string; requestId?: string }>();
    const response = ctx.getResponse<{
      status: (code: number) => any;
      setHeader?: (name: string, value: string) => void;
    }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const { message, details } = this.normalizeError(status, exceptionResponse);

    // 402 quota responses carry a Retry-After hint (RFC 9110) telling the
    // client when the next billing cycle makes scans available again.
    const retryAfterSeconds = (exception as { retryAfterSeconds?: number } | null)
      ?.retryAfterSeconds;
    if (retryAfterSeconds && response.setHeader) {
      response.setHeader('Retry-After', String(retryAfterSeconds));
    }

    // Forward server errors (500+) to Sentry for tracking. Client errors
    // (4xx) are expected behavior and not forwarded.
    if (status >= 500 && exception instanceof Error) {
      Sentry.withScope((scope) => {
        scope.setTag('requestId', request.requestId ?? 'unknown');
        scope.setTag('url', request.url);
        scope.setExtra('statusCode', status);
        Sentry.captureException(exception);
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(details ? { details } : {}),
      path: request.url,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Normalize any exception payload to a string `message` (API standard:
   * message is ALWAYS a string) with a separate `details` array for structured
   * error lists (e.g. class-validator failures). See
   * docs/engineering/API_DESIGN_STANDARDS.md §3.1.
   */
  private normalizeError(
    status: number,
    response: unknown,
  ): { message: string; details?: string[] } {
    if (response && typeof response === 'object' && 'message' in response) {
      const raw = (response as { message: string | string[] }).message;

      if (Array.isArray(raw)) {
        const strings = raw.map((item) =>
          typeof item === 'string' ? item : String(item),
        );

        return {
          message:
            strings.length === 1
              ? strings[0]
              : `Validation failed: ${strings.join('; ')}`,
          details: strings,
        };
      }

      return { message: typeof raw === 'string' ? raw : String(raw) };
    }

    if (typeof response === 'string') {
      return { message: response };
    }

    if (status >= 500) {
      return { message: 'Internal server error.' };
    }

    return { message: 'Request failed.' };
  }
}
