const REFRESH_TOKEN_KEY = "lexodromia.auth.refreshToken";

/**
 * Backend zwraca dziś refresh token w JSON, więc przechowujemy go w jednym,
 * odizolowanym miejscu. Gdy backend przejdzie na HttpOnly cookie, tylko ten
 * moduł i authApi będą wymagały zmiany.
 */
export const tokenStorage = {
  readRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  writeRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      /* Sesja będzie działała do odświeżenia strony. */
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
};
