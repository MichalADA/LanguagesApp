const DEVELOPMENT_ACCESS_SECRET = 'development-access-secret-change-before-production';
const DEVELOPMENT_REFRESH_SECRET = 'development-refresh-secret-change-before-production';

const ALLOWED_NODE_ENVS = new Set(['development', 'test', 'production']);

export function validateEnvironment(input: Record<string, unknown>): Record<string, unknown> {
  const config = { ...input };
  const nodeEnv = readString(config.NODE_ENV, 'development');
  if (!ALLOWED_NODE_ENVS.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test or production');
  }

  const accessSecret = readString(config.JWT_SECRET, DEVELOPMENT_ACCESS_SECRET);
  const refreshSecret = readString(config.JWT_REFRESH_SECRET, DEVELOPMENT_REFRESH_SECRET);
  validateSecret('JWT_SECRET', accessSecret, nodeEnv);
  validateSecret('JWT_REFRESH_SECRET', refreshSecret, nodeEnv);
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  const port = readInteger(config.PORT, 3000, 1, 65_535);
  const saltRounds = readInteger(config.BCRYPT_SALT_ROUNDS, 12, 10, 15);
  const cookieMaxAge = readInteger(
    config.AUTH_REFRESH_COOKIE_MAX_AGE_MS,
    30 * 24 * 60 * 60 * 1000,
    60_000,
    365 * 24 * 60 * 60 * 1000,
  );
  const cookieSecure = readBoolean(config.AUTH_COOKIE_SECURE, nodeEnv === 'production');
  if (nodeEnv === 'production' && !cookieSecure) {
    throw new Error('AUTH_COOKIE_SECURE must be true in production');
  }

  const databaseUrl = readString(config.DATABASE_URL);
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const cookieName = readString(config.AUTH_COOKIE_NAME, 'lexodromia_refresh');
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(cookieName)) {
    throw new Error('AUTH_COOKIE_NAME contains invalid characters');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    JWT_ACCESS_EXPIRATION: readString(config.JWT_ACCESS_EXPIRATION, '15m'),
    JWT_REFRESH_EXPIRATION: readString(config.JWT_REFRESH_EXPIRATION, '30d'),
    BCRYPT_SALT_ROUNDS: saltRounds,
    AUTH_COOKIE_NAME: cookieName,
    AUTH_COOKIE_SECURE: cookieSecure,
    AUTH_REFRESH_COOKIE_MAX_AGE_MS: cookieMaxAge,
    CORS_ORIGIN: readString(config.CORS_ORIGIN, 'http://localhost:5173'),
  };
}

function validateSecret(name: string, value: string, nodeEnv: string): void {
  if (value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  if (
    nodeEnv === 'production' &&
    (value === DEVELOPMENT_ACCESS_SECRET ||
      value === DEVELOPMENT_REFRESH_SECRET ||
      value.toLowerCase().includes('change-me'))
  ) {
    throw new Error(`${name} must be replaced before production`);
  }
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('AUTH_COOKIE_SECURE must be true or false');
}

function readInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Expected an integer between ${min} and ${max}`);
  }
  return parsed;
}
