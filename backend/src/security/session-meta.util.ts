import type { Request } from 'express';

/**
 * session-meta.util.ts — derives device / IP / location metadata for the
 * session ledger from an Express request, so sign-in and refresh record where
 * the session was established without any client cooperation.
 */

export type SessionMeta = {
  device?: string;
  ipAddress?: string;
  location?: string;
};

/**
 * describeDevice — minimal user-agent classifier producing the same
 * "<Browser> on <OS>" labels the mock sessions use (e.g. "Chrome on Windows").
 */
export function describeDevice(userAgent: string): string {
  if (!userAgent) {
    return 'Unknown device';
  }

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\/|CriOS/.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser';

  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /iPhone/.test(userAgent)
      ? 'iPhone'
      : /iPad/.test(userAgent)
        ? 'iPad'
        : /Android/.test(userAgent)
          ? 'Android'
          : /Mac OS X|Macintosh/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'device';

  return `${browser} on ${os}`;
}

export function requestSessionMeta(request: Request): SessionMeta {
  const userAgent = request.headers['user-agent'] || '';
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const rawIp =
    forwardedValue || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  // A proxy chain is comma-joined; the left-most address is the client.
  const ipAddress = String(rawIp).split(',')[0]?.trim() || '';

  // Platform proxy country hints (Vercel / Cloudflare) — best effort.
  const country =
    request.headers['x-vercel-ip-country'] || request.headers['cf-ipcountry'] || '';

  return {
    device: describeDevice(String(userAgent)),
    ipAddress: String(ipAddress).slice(0, 64) || undefined,
    location: country ? String(country) : undefined,
  };
}
