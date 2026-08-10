/**
 * better-auth-status.ts — the USE_BETTER_AUTH gate, kept free of any
 * better-auth import so it is unit-testable under the backend jest
 * (CJS/ts-jest) runner without pulling in the ESM package.
 *
 * `enabled` is the flag; `database` is the Postgres adapter state; the
 * provider only registers routes when both are present (betterAuthEnabled).
 */
export function resolveBetterAuthStatus(
  env: NodeJS.ProcessEnv = process.env,
): { enabled: boolean; database: 'connected' | 'missing' } {
  const enabled = ['1', 'true', 'yes', 'on'].includes(
    (env.USE_BETTER_AUTH || '').toLowerCase(),
  );
  const database = env.DATABASE_URL ? 'connected' : 'missing';

  return { enabled, database };
}

export const betterAuthStatus = resolveBetterAuthStatus();

export const betterAuthEnabled =
  betterAuthStatus.enabled && betterAuthStatus.database === 'connected';
