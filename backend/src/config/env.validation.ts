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

function parseNonNegativeNumber(
  value: string | undefined,
  fallback: number,
  key: string,
): number {
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative number.`);
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

function validateEmailList(value: string | undefined): string {
  const emails = (value?.trim() || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  for (const email of emails) {
    if (!email.includes('@')) {
      throw new Error(`ADMIN_EMAILS contains an invalid email: ${email}`);
    }
  }

  return [...new Set(emails)].join(',');
}

function validateSameSite(value: string | undefined): string {
  const normalized = (value ?? 'lax').toLowerCase();

  if (!['lax', 'strict', 'none'].includes(normalized)) {
    throw new Error('AUTH_COOKIE_SAME_SITE must be lax, strict, or none.');
  }

  return normalized;
}

/**
 * Better Auth envs are optional — the backend must boot without them (the
 * auth provider runs stateless until DATABASE_URL is provided). When set,
 * they are validated strictly.
 */
function validateOptionalSecret(
  value: string | undefined,
  key: string,
): string | undefined {
  const secret = value?.trim();

  if (secret && secret.length < 32) {
    throw new Error(`${key} must be at least 32 characters.`);
  }

  return secret;
}

function validateOptionalHttpUrl(
  value: string | undefined,
  key: string,
): string | undefined {
  const url = value?.trim();

  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error(`${key} must be a valid http(s) URL.`);
  }

  return url;
}

function validateDatabaseUrl(value: string | undefined): string | undefined {
  const url = value?.trim();

  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('DATABASE_URL must be a valid postgres:// or postgresql:// URL.');
  }

  return url;
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
    SUPABASE_INCIDENTS_TABLE: env.SUPABASE_INCIDENTS_TABLE?.trim() || 'admin_incidents',
    SUPABASE_AUDIT_LOGS_TABLE: env.SUPABASE_AUDIT_LOGS_TABLE?.trim() || 'audit_logs',
    SUPABASE_ORGANIZATIONS_TABLE: env.SUPABASE_ORGANIZATIONS_TABLE?.trim() || 'organizations',
    SUPABASE_TEAMS_TABLE: env.SUPABASE_TEAMS_TABLE?.trim() || 'teams',
    SUPABASE_ORGANIZATION_MEMBERS_TABLE:
      env.SUPABASE_ORGANIZATION_MEMBERS_TABLE?.trim() || 'organization_members',
    SUPABASE_ORGANIZATION_INVITES_TABLE:
      env.SUPABASE_ORGANIZATION_INVITES_TABLE?.trim() || 'organization_invites',
    SUPABASE_USER_SESSIONS_TABLE:
      env.SUPABASE_USER_SESSIONS_TABLE?.trim() || 'user_sessions',
    SUPABASE_USER_SECURITY_SETTINGS_TABLE:
      env.SUPABASE_USER_SECURITY_SETTINGS_TABLE?.trim() || 'user_security_settings',
    SUPABASE_API_USAGE_TABLE: env.SUPABASE_API_USAGE_TABLE?.trim() || 'api_usage',
    // Path to the repo migrations dir for the migration-diff health check.
    // Defaults to <repo root>/supabase/migrations (resolved from __dirname).
    MIGRATIONS_DIR: env.MIGRATIONS_DIR?.trim() || undefined,
    PASSWORD_MIN_LENGTH: parsePositiveInteger(
      env.PASSWORD_MIN_LENGTH,
      8,
      'PASSWORD_MIN_LENGTH',
    ),
    PASSWORD_REQUIRE_UPPERCASE: isTruthy(env.PASSWORD_REQUIRE_UPPERCASE, true),
    PASSWORD_REQUIRE_NUMBER: isTruthy(env.PASSWORD_REQUIRE_NUMBER, true),
    PASSWORD_REQUIRE_SYMBOL: isTruthy(env.PASSWORD_REQUIRE_SYMBOL, true),
    STORAGE_CAPACITY_GB: parsePositiveInteger(env.STORAGE_CAPACITY_GB, 500, 'STORAGE_CAPACITY_GB'),
    DB_MAX_CONNECTIONS: parsePositiveInteger(
      env.DB_MAX_CONNECTIONS,
      100,
      'DB_MAX_CONNECTIONS',
    ),
    MAX_UPLOAD_BYTES: parsePositiveInteger(
      env.MAX_UPLOAD_BYTES,
      50 * 1024 * 1024,
      'MAX_UPLOAD_BYTES',
    ),
    ALLOWED_UPLOAD_MIME_TYPES: validateUploadMimeTypes(env.ALLOWED_UPLOAD_MIME_TYPES),
    REDIS_URL: validateRedisUrl(env.REDIS_URL),
    ADMIN_EMAILS: validateEmailList(env.ADMIN_EMAILS),
    AUTH_COOKIE_ENABLED: isTruthy(env.AUTH_COOKIE_ENABLED, true),
    AUTH_COOKIE_SAME_SITE: validateSameSite(env.AUTH_COOKIE_SAME_SITE),
    AUTH_COOKIE_SECURE: isTruthy(env.AUTH_COOKIE_SECURE, false),
    AUTH_COOKIE_MAX_AGE_DAYS: parsePositiveInteger(
      env.AUTH_COOKIE_MAX_AGE_DAYS,
      30,
      'AUTH_COOKIE_MAX_AGE_DAYS',
    ),
    // Better Auth — optional parallel auth provider (see better-auth.config.ts).
    // Flag-gated (default OFF): the provider only registers email/password +
    // session + plugin routes when USE_BETTER_AUTH is truthy AND DATABASE_URL
    // is set; the live GoTrue flow at /v1/auth/* is untouched either way.
    USE_BETTER_AUTH: isTruthy(env.USE_BETTER_AUTH, false),
    BETTER_AUTH_SECRET: validateOptionalSecret(
      env.BETTER_AUTH_SECRET,
      'BETTER_AUTH_SECRET',
    ),
    BETTER_AUTH_URL: validateOptionalHttpUrl(env.BETTER_AUTH_URL, 'BETTER_AUTH_URL'),
    DATABASE_URL: validateDatabaseUrl(env.DATABASE_URL),
    SCAN_PROCESSING_QUEUE_NAME:
      env.SCAN_PROCESSING_QUEUE_NAME?.trim() || 'scan-processing',
    WORKER_CONCURRENCY: parsePositiveInteger(
      env.WORKER_CONCURRENCY,
      4,
      'WORKER_CONCURRENCY',
    ),
    // Retention windows (days) for completed reports and audit events. These
    // are surfaced in admin settings and drive the retention policy documented
    // in docs/engineering/RETENTION_POLICY.md.
    REPORT_RETENTION_DAYS: parsePositiveInteger(
      env.REPORT_RETENTION_DAYS,
      365,
      'REPORT_RETENTION_DAYS',
    ),
    SCAN_OVERAGE_PRICE_USD: parseNonNegativeNumber(
      env.SCAN_OVERAGE_PRICE_USD,
      0.05,
      'SCAN_OVERAGE_PRICE_USD',
    ),
    AUDIT_RETENTION_DAYS: parsePositiveInteger(
      env.AUDIT_RETENTION_DAYS,
      730,
      'AUDIT_RETENTION_DAYS',
    ),
  };
}
