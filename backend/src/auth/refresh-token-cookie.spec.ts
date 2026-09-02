import type { Request, Response } from 'express';

import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  writeRefreshTokenCookie,
} from './refresh-token-cookie';

const config = { name: 'lexodromia_refresh', secure: true, maxAge: 123_000 };

describe('refresh token cookie', () => {
  it('reads only the configured cookie', () => {
    const request = {
      headers: { cookie: 'other=value; lexodromia_refresh=token%2Evalue' },
    } as Request;
    expect(readRefreshTokenCookie(request, config)).toBe('token.value');
  });

  it('writes and clears an HttpOnly cookie with matching options', () => {
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    writeRefreshTokenCookie(response, 'token', config);
    expect(response.cookie).toHaveBeenCalledWith('lexodromia_refresh', 'token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 123_000,
    });

    clearRefreshTokenCookie(response, config);
    expect(response.clearCookie).toHaveBeenCalledWith('lexodromia_refresh', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });
});
