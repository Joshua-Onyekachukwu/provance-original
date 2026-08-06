import type { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE_NAME } from './cookie-session.util';

function createConfigService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    AUTH_COOKIE_ENABLED: true,
    AUTH_COOKIE_SAME_SITE: 'lax',
    AUTH_COOKIE_SECURE: false,
    AUTH_COOKIE_MAX_AGE_DAYS: 30,
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createResponse() {
  return {
    req: { headers: {} },
    setHeader: jest.fn(),
  } as any;
}

function createAuthenticatedResult() {
  return {
    status: 'authenticated',
    message: 'Sign-in successful.',
    user: { id: 'user-1', email: 'user@example.com' },
    permissions: { individual: true, team: false, admin: false },
    profile: { displayName: 'User' },
    session: {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: 123,
      tokenType: 'bearer',
    },
  };
}

describe('AuthController', () => {
  it('sets an httpOnly refresh cookie and strips the refresh token from the body on sign-in', async () => {
    const authService = {
      signIn: jest.fn().mockResolvedValue(createAuthenticatedResult()),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      createConfigService(),
    );
    const response = createResponse();

    const result = await controller.signIn(response, {
      email: 'user@example.com',
      password: 'password123',
    });

    const cookieHeader = response.setHeader.mock.calls.find(
      ([name]: [string]) => name === 'Set-Cookie',
    )?.[1] as string;

    expect(cookieHeader).toContain(`${REFRESH_COOKIE_NAME}=refresh-1`);
    expect(cookieHeader).toContain('HttpOnly');
    expect(result.session).toEqual({
      accessToken: 'access-1',
      expiresAt: 123,
      tokenType: 'bearer',
    });
    expect(result.session?.refreshToken).toBeUndefined();
  });

  it('does not set a cookie and keeps the body token when cookies are disabled', async () => {
    const authService = {
      signIn: jest.fn().mockResolvedValue(createAuthenticatedResult()),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      createConfigService({ AUTH_COOKIE_ENABLED: false }),
    );
    const response = createResponse();

    const result = await controller.signIn(response, {
      email: 'user@example.com',
      password: 'password123',
    });

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(result.session?.refreshToken).toBe('refresh-1');
  });

  it('rotates the refresh cookie from the cookie value on refresh', async () => {
    const authService = {
      refreshSession: jest.fn().mockResolvedValue({
        ...createAuthenticatedResult(),
        session: {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          expiresAt: 456,
          tokenType: 'bearer',
        },
      }),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      createConfigService(),
    );
    const response = createResponse();
    response.req.headers.cookie = `${REFRESH_COOKIE_NAME}=refresh-1`;

    await controller.refreshSession(response, {});

    expect(authService.refreshSession).toHaveBeenCalledWith({
      refreshToken: 'refresh-1',
    });

    const cookieHeader = response.setHeader.mock.calls.find(
      ([name]: [string]) => name === 'Set-Cookie',
    )?.[1] as string;
    expect(cookieHeader).toContain('refresh-2');
  });

  it('falls back to the body refresh token when no cookie is present', async () => {
    const authService = {
      refreshSession: jest.fn().mockResolvedValue(createAuthenticatedResult()),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      createConfigService(),
    );

    await controller.refreshSession(createResponse(), {
      refreshToken: 'body-refresh-token-1234567890',
    });

    expect(authService.refreshSession).toHaveBeenCalledWith({
      refreshToken: 'body-refresh-token-1234567890',
    });
  });

  it('clears the refresh cookie and burns the token on sign-out', async () => {
    const authService = {
      signOut: jest.fn().mockResolvedValue({
        status: 'signed_out',
        message: 'You have been signed out.',
      }),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      createConfigService(),
    );
    const response = createResponse();
    response.req.headers.cookie = `${REFRESH_COOKIE_NAME}=refresh-1`;

    const result = await controller.signOut(response);

    expect(authService.signOut).toHaveBeenCalledWith('refresh-1');
    const cookieHeader = response.setHeader.mock.calls.find(
      ([name]: [string]) => name === 'Set-Cookie',
    )?.[1] as string;
    expect(cookieHeader).toContain('Max-Age=0');
    expect(result.status).toBe('signed_out');
  });
});
