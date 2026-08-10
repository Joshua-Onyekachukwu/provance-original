/**
 * jwt-sid.util.ts — reads the `sid` claim from a Supabase access-token JWT
 * payload. Callers rely on Supabase having already verified the token (the
 * auth guard's getUser(), or a fresh sign-in/refresh response), so the
 * signature is not re-checked here.
 */
export function decodeJwtPayloadSid(token: string): string | undefined {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return undefined;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      sid?: unknown;
    };

    return typeof payload.sid === 'string' && payload.sid ? payload.sid : undefined;
  } catch {
    return undefined;
  }
}
