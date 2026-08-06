import type { Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'provance_refresh';

export type CookieSameSite = 'lax' | 'strict' | 'none';

export type CookieSessionOptions = {
  enabled: boolean;
  sameSite: CookieSameSite;
  secure: boolean;
  maxAgeMs: number;
};

export function buildCookieSessionOptions(
  config: {
    enabled?: boolean;
    sameSite?: string;
    secure?: boolean;
    maxAgeDays?: number;
  } = {},
): CookieSessionOptions {
  const sameSite = normalizeSameSite(config.sameSite);
  const secure = config.secure ?? false;

  // A SameSite=None cookie MUST be Secure or the browser will reject it.
  const effectiveSecure = sameSite === 'none' ? true : secure;

  return {
    enabled: config.enabled ?? true,
    sameSite,
    secure: effectiveSecure,
    maxAgeMs:
      (config.maxAgeDays ?? 30) * 24 * 60 * 60 * 1000,
  };
}

function normalizeSameSite(value: string | undefined): CookieSameSite {
  const normalized = (value ?? 'lax').toLowerCase();

  if (normalized === 'none' || normalized === 'strict') {
    return normalized;
  }

  return 'lax';
}

/**
 * Pull the refresh token out of the request Cookie header. Only the named
 * cookie is read, so a compromised unrelated cookie cannot be replayed as a
 * session credential.
 */
export function readRefreshCookie(request: Request): string | null {
  const header = request.headers.cookie;

  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (name === REFRESH_COOKIE_NAME && value) {
      try {
        return decodeURIComponent(value);
      } catch {
        // Malformed percent-encoding must not take down refresh/sign-out.
        return null;
      }
    }
  }

  return null;
}

/**
 * Serialize the httpOnly refresh cookie with the configured security flags.
 * The access token stays in JS memory; only the refresh token crosses the
 * cookie boundary.
 */
export function serializeRefreshCookie(
  token: string,
  options: CookieSessionOptions,
): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${Math.floor(options.maxAgeMs / 1000)}`,
    'HttpOnly',
    `SameSite=${capitalize(options.sameSite)}`,
  ];

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function serializeClearRefreshCookie(
  options: CookieSessionOptions,
): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    `SameSite=${capitalize(options.sameSite)}`,
  ];

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function setRefreshCookie(
  response: Response,
  token: string,
  options: CookieSessionOptions,
) {
  response.setHeader('Set-Cookie', serializeRefreshCookie(token, options));
}

export function clearRefreshCookie(
  response: Response,
  options: CookieSessionOptions,
) {
  response.setHeader('Set-Cookie', serializeClearRefreshCookie(options));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
