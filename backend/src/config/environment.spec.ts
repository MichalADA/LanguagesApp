import { validateEnvironment } from './environment';

const base = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
};

describe('validateEnvironment', () => {
  it('normalises valid configuration', () => {
    const result = validateEnvironment({ ...base, PORT: '3100', AUTH_COOKIE_SECURE: 'false' });
    expect(result.PORT).toBe(3100);
    expect(result.AUTH_COOKIE_SECURE).toBe(false);
  });

  it('rejects missing database configuration', () => {
    expect(() => validateEnvironment({ ...base, DATABASE_URL: '' })).toThrow('DATABASE_URL');
  });

  it('rejects weak or shared secrets', () => {
    expect(() => validateEnvironment({ ...base, JWT_SECRET: 'short' })).toThrow('JWT_SECRET');
    expect(() => validateEnvironment({ ...base, JWT_REFRESH_SECRET: base.JWT_SECRET })).toThrow(
      'must be different',
    );
  });

  it('requires secure cookies in production', () => {
    expect(() =>
      validateEnvironment({ ...base, NODE_ENV: 'production', AUTH_COOKIE_SECURE: 'false' }),
    ).toThrow('AUTH_COOKIE_SECURE');
  });
});
