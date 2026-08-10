import {
  buildCookieSessionOptions,
  clearAllRefreshCookies,
  clearRefreshCookie,
  HOST_PREFIXED_REFRESH_COOKIE_NAME,
  readRefreshCookie,
  REFRESH_COOKIE_NAME,
  serializeClearRefreshCookie,
  serializeRefreshCookie,
  setRefreshCookie,
} from './cookie-session.util';

function createResponse() {
  const headers: Record<string, string> = {};

  return {
    headers,
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  };
}

describe('cookie-session.util', () => {
  describe('buildCookieSessionOptions', () => {
    it('defaults to lax / non-secure / 30 days with cookies enabled', () => {
      const options = buildCookieSessionOptions();

      expect(options).toEqual({
        enabled: true,
        sameSite: 'lax',
        secure: false,
        maxAgeMs: 30 * 24 * 60 * 60 * 1000,
        cookieName: REFRESH_COOKIE_NAME,
      });
    });

    it('forces Secure when SameSite=None is requested', () => {
      const options = buildCookieSessionOptions({ sameSite: 'none' });

      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('none');
    });

    it('uses the __Host- prefixed name on secure deployments', () => {
      const options = buildCookieSessionOptions({ secure: true });

      expect(options.cookieName).toBe(HOST_PREFIXED_REFRESH_COOKIE_NAME);
      expect(options.secure).toBe(true);
    });

    it('accepts explicit flags from config', () => {
      const options = buildCookieSessionOptions({
        enabled: false,
        sameSite: 'strict',
        secure: true,
        maxAgeDays: 7,
      });

      expect(options.enabled).toBe(false);
      expect(options.sameSite).toBe('strict');
      expect(options.secure).toBe(true);
      expect(options.maxAgeMs).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('normalizes unknown same-site values to lax', () => {
      expect(buildCookieSessionOptions({ sameSite: 'bogus' }).sameSite).toBe(
        'lax',
      );
    });
  });

  describe('readRefreshCookie', () => {
    it('extracts the refresh cookie from a multi-cookie header', () => {
      const request = {
        headers: {
          cookie: `theme=dark; ${REFRESH_COOKIE_NAME}=abc%20def; other=1`,
        },
      } as any;

      expect(readRefreshCookie(request)).toBe('abc def');
    });

    it('reads the __Host- prefixed name when configured', () => {
      const request = {
        headers: {
          cookie: `${HOST_PREFIXED_REFRESH_COOKIE_NAME}=host-token`,
        },
      } as any;

      expect(
        readRefreshCookie(request, HOST_PREFIXED_REFRESH_COOKIE_NAME),
      ).toBe('host-token');
    });

    it('returns null when the cookie is absent', () => {
      const request = { headers: { cookie: 'theme=dark' } } as any;

      expect(readRefreshCookie(request)).toBeNull();
    });

    it('returns null when no cookie header exists at all', () => {
      const request = { headers: {} } as any;

      expect(readRefreshCookie(request)).toBeNull();
    });
  });

  describe('serializeRefreshCookie', () => {
    it('marks the cookie httpOnly with a sane max age', () => {
      const cookie = serializeRefreshCookie('token-123', {
        enabled: true,
        sameSite: 'lax',
        secure: false,
        maxAgeMs: 30 * 24 * 60 * 60 * 1000,
        cookieName: REFRESH_COOKIE_NAME,
      });

      expect(cookie).toContain(`${REFRESH_COOKIE_NAME}=token-123`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Max-Age=2592000');
      expect(cookie).not.toContain('Secure');
    });

    it('adds Secure when configured', () => {
      const cookie = serializeRefreshCookie('token-123', {
        enabled: true,
        sameSite: 'none',
        secure: true,
        maxAgeMs: 1000,
        cookieName: HOST_PREFIXED_REFRESH_COOKIE_NAME,
      });

      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=None');
      expect(cookie).toContain(HOST_PREFIXED_REFRESH_COOKIE_NAME);
    });

    it('URL-encodes the token value', () => {
      const cookie = serializeRefreshCookie('a/b c', {
        enabled: true,
        sameSite: 'lax',
        secure: false,
        maxAgeMs: 1000,
        cookieName: REFRESH_COOKIE_NAME,
      });

      expect(cookie).toContain('a%2Fb%20c');
    });
  });

  describe('setRefreshCookie / clearRefreshCookie', () => {
    it('writes the Set-Cookie header through the response', () => {
      const response = createResponse() as any;
      const options = {
        enabled: true,
        sameSite: 'lax' as const,
        secure: false,
        maxAgeMs: 1000,
        cookieName: REFRESH_COOKIE_NAME,
      };

      setRefreshCookie(response, 'token-456', options);

      expect(response.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('token-456'),
      );
    });

    it('expires the cookie on clear', () => {
      const response = createResponse() as any;
      const options = {
        enabled: true,
        sameSite: 'lax' as const,
        secure: false,
        maxAgeMs: 1000,
        cookieName: REFRESH_COOKIE_NAME,
      };

      clearRefreshCookie(response, options);

      const clearHeader = serializeClearRefreshCookie(options);
      expect(clearHeader).toContain('Max-Age=0');
      expect(clearHeader).toContain('Expires=Thu, 01 Jan 1970');
      expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', clearHeader);
    });

    it('clears both the plain and __Host- cookie names on sign-out', () => {
      const response = createResponse() as any;
      const options = {
        enabled: true,
        sameSite: 'lax' as const,
        secure: false,
        maxAgeMs: 1000,
        cookieName: REFRESH_COOKIE_NAME,
      };

      clearAllRefreshCookies(response, options);

      expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        expect.stringContaining(`${REFRESH_COOKIE_NAME}=`),
        expect.stringContaining(`${HOST_PREFIXED_REFRESH_COOKIE_NAME}=`),
      ]);
    });
  });
});
