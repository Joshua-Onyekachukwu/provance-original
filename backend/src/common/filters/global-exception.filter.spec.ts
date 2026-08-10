import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

// ---------------------------------------------------------------------------
// Unit tests for the normalized error envelope (API_DESIGN_STANDARDS.md §3.1):
// `message` is ALWAYS a string, structured validator failures live in a
// separate `details` array, and 402 quota responses carry Retry-After.
// ---------------------------------------------------------------------------

type JsonBody = Record<string, unknown>;

function createHost(
  overrides: {
    url?: string;
    requestId?: string;
    setHeader?: (name: string, value: string) => void;
  } = {},
) {
  const json = jest.fn();
  const setHeader = overrides.setHeader ?? jest.fn();

  const response = {
    status: jest.fn(() => ({ json })),
    setHeader,
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        url: overrides.url ?? '/v1/test',
        requestId: overrides.requestId,
      }),
      getResponse: () => response,
    }),
  };

  return {
    host: host as unknown as Parameters<
      GlobalExceptionFilter['catch']
    >[1],
    json,
    setHeader,
    status: response.status,
  };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('normalizes a class-validator array message into message + details', () => {
    const { host, json, status } = createHost();
    const exception = new BadRequestException([
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = json.mock.calls[0][0] as JsonBody;
    expect(body.statusCode).toBe(400);
    expect(typeof body.message).toBe('string');
    expect(body.message).toContain('Validation failed');
    expect(body.details).toEqual([
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ]);
  });

  it('keeps a single-element array message as the plain string without details noise', () => {
    const { host, json } = createHost();
    const exception = new BadRequestException(['only one problem']);

    filter.catch(exception, host);

    const body = json.mock.calls[0][0] as JsonBody;
    expect(body.message).toBe('only one problem');
    expect(body.details).toEqual(['only one problem']);
  });

  it('passes a string HttpException message through unchanged', () => {
    const { host, json } = createHost();
    const exception = new HttpException('No such scan.', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    const body = json.mock.calls[0][0] as JsonBody;
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('No such scan.');
    expect(body.details).toBeUndefined();
  });

  it('maps non-HttpException 5xx failures to a generic message', () => {
    const { host, json } = createHost();
    filter.catch(new Error('sensitive internal detail'), host);

    const body = json.mock.calls[0][0] as JsonBody;
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error.');
    expect(body.details).toBeUndefined();
  });

  it('coerces a non-string message value to a string', () => {
    const { host, json } = createHost();
    const exception = new HttpException(
      { message: 42, statusCode: 418 } as never,
      HttpStatus.I_AM_A_TEAPOT,
    );

    filter.catch(exception, host);

    const body = json.mock.calls[0][0] as JsonBody;
    expect(typeof body.message).toBe('string');
    expect(body.message).toBe('42');
  });

  it('sets Retry-After on 402 quota responses', () => {
    const setHeader = jest.fn();
    const { host, json } = createHost({ setHeader });
    const exception = new HttpException(
      'Monthly scan quota reached.',
      HttpStatus.PAYMENT_REQUIRED,
    ) as HttpException & { retryAfterSeconds?: number };
    exception.retryAfterSeconds = 3600;

    filter.catch(exception, host);

    expect(setHeader).toHaveBeenCalledWith('Retry-After', '3600');
    const body = json.mock.calls[0][0] as JsonBody;
    expect(body.statusCode).toBe(402);
    expect(body.message).toBe('Monthly scan quota reached.');
  });

  it('echoes path and requestId in every envelope', () => {
    const { host, json } = createHost({
      url: '/v1/scans',
      requestId: 'req-abc-123',
    });
    filter.catch(new BadRequestException('nope'), host);

    const body = json.mock.calls[0][0] as JsonBody;
    expect(body.path).toBe('/v1/scans');
    expect(body.requestId).toBe('req-abc-123');
    expect(typeof body.timestamp).toBe('string');
  });
});
