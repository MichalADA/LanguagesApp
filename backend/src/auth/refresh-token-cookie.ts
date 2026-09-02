import type { CookieOptions, Request, Response } from 'express';

export interface RefreshCookieConfig {
  name: string;
  secure: boolean;
  maxAge: number;
}

export function readRefreshTokenCookie(
  request: Request,
  config: RefreshCookieConfig,
): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== config.name) continue;
    const encoded = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(encoded);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function writeRefreshTokenCookie(
  response: Response,
  token: string,
  config: RefreshCookieConfig,
): void {
  response.cookie(config.name, token, { ...cookieOptions(config), maxAge: config.maxAge });
}

export function clearRefreshTokenCookie(response: Response, config: RefreshCookieConfig): void {
  response.clearCookie(config.name, cookieOptions(config));
}

function cookieOptions(config: RefreshCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: 'lax',
    path: '/',
  };
}
