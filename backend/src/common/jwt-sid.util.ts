/**
 * jwt-sid.util.ts — reads the session id claim from a Supabase access-token
 * JWT payload. Callers rely on Supabase having already verified the token
 * (the auth guard's getUser(), or a fresh sign-in/refresh response), so the
 * signature is not re-checked here.
 *
 * Claim contract (verified live against GoTrue):
 * - Real Supabase access tokens carry `session_id` (confirmed on a live
 *   project 2026-08-10) — this is the authoritative claim.
 * - `sid` is accepted as a fallback for the e2e fakes and any older issuer
 *   that still emits it.
 */
export function decodeJwtPayloadSid(token: string): string | undefined {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return undefined;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      sid?: unknown;
      session_id?: unknown;
    };

    if (typeof payload.session_id === 'string' && payload.session_id) {
      return payload.session_id;
    }

    return typeof payload.sid === 'string' && payload.sid ? payload.sid : undefined;
  } catch {
    return undefined;
  }
}
