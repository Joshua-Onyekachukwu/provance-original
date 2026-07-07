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

function validateUploadMimeTypes(value: string | undefined): string {
  const mimeTypes = (value?.trim() || '')
    .split(',')
    .map((mimeType) => mimeType.trim())
    .filter(Boolean);

  if (mimeTypes.length === 0) {
    return 'image/jpeg,image/png,image/webp,image/gif';
  }

  return [...new Set(mimeTypes)].join(',');
}

function validateRedisUrl(value: string | undefined): string | undefined {
  const redisUrl = value?.trim();

  if (!redisUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(redisUrl);

    if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }

  return redisUrl;
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
    SUPABASE_WAITLIST_TABLE: env.SUPABASE_WAITLIST_TABLE?.trim() || 'waitlist_applications',
    SUPABASE_SCANS_TABLE: env.SUPABASE_SCANS_TABLE?.trim() || 'scans',
    SUPABASE_UPLOADS_BUCKET: env.SUPABASE_UPLOADS_BUCKET?.trim() || 'provance-uploads',
    MAX_UPLOAD_BYTES: parsePositiveInteger(
      env.MAX_UPLOAD_BYTES,
      50 * 1024 * 1024,
      'MAX_UPLOAD_BYTES',
    ),
    ALLOWED_UPLOAD_MIME_TYPES: validateUploadMimeTypes(env.ALLOWED_UPLOAD_MIME_TYPES),
    REDIS_URL: validateRedisUrl(env.REDIS_URL),
    SCAN_PROCESSING_QUEUE_NAME:
      env.SCAN_PROCESSING_QUEUE_NAME?.trim() || 'scan-processing',
    WORKER_CONCURRENCY: parsePositiveInteger(
      env.WORKER_CONCURRENCY,
      4,
      'WORKER_CONCURRENCY',
    ),
  };
}
