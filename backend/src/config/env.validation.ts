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
  const input = value?.trim() || 'http://localhost:5173';
  const origins = input
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

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
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if ((supabaseUrl && !serviceRoleKey) || (!supabaseUrl && serviceRoleKey)) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided together.',
    );
  }

  if (supabaseUrl) {
    try {
      new URL(supabaseUrl);
    } catch {
      throw new Error('SUPABASE_URL must be a valid URL.');
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
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
}
