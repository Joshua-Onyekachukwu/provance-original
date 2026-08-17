import { apiKey } from '@better-auth/api-key';
import { Pool } from 'pg';
import { betterAuth } from 'better-auth';
import { organization, twoFactor } from 'better-auth/plugins';
import { betterAuthEnabled, betterAuthStatus } from './better-auth-status';

/**
 * better-auth.config.ts — Better Auth instance behind the USE_BETTER_AUTH
 * flag (Option A: parallel provider, live GoTrue flow untouched).
 *
 * Mounted at /v1/better-auth via the BetterAuthController catch-all (the
 * controller delegates to toNodeHandler; see better-auth.controller.ts) — the
 * existing Supabase GoTrue flow (/v1/auth/*) stays live and untouched. The
 * frontend can point at either provider behind a flag.
 *
 * Database: connects to the Supabase Postgres via DATABASE_URL (the
 * connection string from the Supabase dashboard). The provider only
 * registers email/password + session + plugin routes when USE_BETTER_AUTH is
 * truthy AND DATABASE_URL is set; otherwise the instance runs stateless and
 * /v1/better-auth/ok reports exactly which gate is missing.
 *
 * Plugins (twoFactor, organization, apiKey) are enabled behind the same gate
 * as emailAndPassword — each adds schema tables (see
 * supabase/migrations/0018_better_auth.sql) and none should register routes
 * while the provider is stateless. Evaluation + what each replaces lives in
 * docs/engineering/BETTER_AUTH_PLUGINS.md.
 */

// The secret is the HMAC key for stateless cookie sessions — a committed
// fallback would mean forgeable sessions, so production fails hard when the
// env var is missing; only non-production boots fall back to the dev value.
// (Min 32 chars, validated in env.validation.ts.)
const SECRET = (() => {
  const configured = process.env.BETTER_AUTH_SECRET;

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is required in production.');
  }

  return 'dev-only-better-auth-secret-do-not-use-in-production-0000';
})();

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:4000';

const DEFAULT_TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

function resolveTrustedOrigins(): string[] {
  const configured = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_TRUSTED_ORIGINS, ...configured])];
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    })
  : undefined;

if (!betterAuthEnabled) {
  // eslint-disable-next-line no-console
  console.warn(
    betterAuthStatus.enabled
      ? '[better-auth] USE_BETTER_AUTH=true but DATABASE_URL is not set — running stateless. Sign-up/sign-in are disabled until the Supabase Postgres connection string is provided.'
      : '[better-auth] USE_BETTER_AUTH is off — provider disabled. Set USE_BETTER_AUTH=true (with DATABASE_URL) to enable the /v1/better-auth surface.',
  );
}

// With plugins enabled, the inferred type references pnpm's isolated zod path,
// which fails declaration emit (TS2742). The double assertion pins a nameable
// public type without changing runtime behavior.
export const auth = betterAuth({
  appName: 'Provance',
  secret: SECRET,
  baseURL: BASE_URL,
  basePath: '/v1/better-auth',
  database: pool,
  // Fail loud without a database: sign-up/sign-in routes are not registered
  // at all until DATABASE_URL is set (the live walk proved stateless sign-up
  // returns session tokens for users that are never persisted — misleading).
  emailAndPassword: betterAuthEnabled
    ? {
        enabled: true,
        minPasswordLength: 8,
      }
    : { enabled: false },
  plugins: betterAuthEnabled
    ? [
        // Security Settings 2FA surface — TOTP + backup codes (OTP delivery
        // needs a sendOTP hook, left for the email integration). Defaults:
        // verification required on enable, account lockout after repeated
        // failed verifications.
        twoFactor({ issuer: 'Provance' }),
        // Organization page + team scoping — default roles owner/admin/member
        // match the org module's role model exactly; teams ship in this
        // version (organization/team/teamMember tables).
        organization(),
        // API Keys page — user-scoped keys (scopes via `permissions`, limits
        // via refill/rate-limit fields). referenceId holds the owning userId.
        apiKey({ references: 'user' }),
      ]
    : [],
  session: {
    // 7-day expiry with a 1-day sliding update window (the cookie refresh).
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: resolveTrustedOrigins(),
  advanced: {
    // Local dev runs over http — mirror the GoTrue cookie flow's
    // AUTH_COOKIE_SECURE=false default. Set true behind TLS in production.
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
    },
  },
}) as unknown as ReturnType<typeof betterAuth>;

export type BetterAuthSession = typeof auth.$Infer.Session;
