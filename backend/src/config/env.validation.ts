const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];

function isTruthy(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  key: string,
): number {
  if (value === undefined || value === '') return fallback;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}

function validateOriginList(value: string | undefined): string {
  const configuredOrigins = (value?.trim() || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = [...new Set([...DEFAULT_FRONTEND_ORIGINS, ...configuredOrigins])];

  if (origins.length === 0) {
    throw new Error('FRONTEND_ORIGIN must include at least one valid origin.');
  }

  for (const origin of origins) {
    try {
      const parsed = new URL(origin);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error(`FRONTEND_ORIGIN contains an invalid URL: ${origin}`);
    }
  }

  return origins.join(',');
}

export function validateEnv(config: Record<string, unknown>) {
  const env = config as Record<string, string | undefined>;
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const authRedirectUrl = env.SUPABASE_AUTH_REDIRECT_URL?.trim();

  if (
    (supabaseUrl && (!serviceRoleKey || !anonKey)) ||
    (!supabaseUrl && (serviceRoleKey || anonKey))
  ) {
    throw new Error(
      'SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be provided together.',
    );
  }

  if (supabaseUrl) {
    try {
      new URL(supabaseUrl);
    } catch {
      throw new Error('SUPABASE_URL must be a valid URL.');
    }
  }

  if (authRedirectUrl) {
    try {
      new URL(authRedirectUrl);
    } catch {
      throw new Error('SUPABASE_AUTH_REDIRECT_URL must be a valid URL.');
    }
  }

  return {
    ...config,
    PORT: parsePositiveInteger(env.PORT, 4000, 'PORT'),
    FRONTEND_ORIGIN: validateOriginList(env.FRONTEND_ORIGIN),
    THROTTLE_TTL_MS: parsePositiveInteger(
      env.THROTTLE_TTL_MS,
      60_000,
      'THROTTLE_TTL_MS',
    ),
    THROTTLE_LIMIT: parsePositiveInteger(
      env.THROTTLE_LIMIT,
      60,
      'THROTTLE_LIMIT',
    ),
    HELMET_ENABLED: isTruthy(env.HELMET_ENABLED, true),
    TRUST_PROXY: isTruthy(env.TRUST_PROXY, true),
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_AUTH_REDIRECT_URL: authRedirectUrl,
  };
}
