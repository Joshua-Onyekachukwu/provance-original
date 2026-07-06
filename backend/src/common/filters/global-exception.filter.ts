import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const message = this.getMessage(status, exceptionResponse);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private getMessage(status: number, response: unknown) {
    if (response && typeof response === 'object' && 'message' in response) {
      return (response as { message: string | string[] }).message;
    }

    if (typeof response === 'string') {
      return response;
    }

    if (status >= 500) {
      return 'Internal server error.';
    }

    return 'Request failed.';
  }
}
