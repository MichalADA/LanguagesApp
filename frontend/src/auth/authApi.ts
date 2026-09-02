import { tokenStorage } from "./tokenStorage";
import type { ApiUser, AuthResponse, LoginInput, RegisterInput } from "./types";

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "NETWORK"
  | "SERVER";

export class AuthApiError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly status?: number,
  ) {
    super(code);
    this.name = "AuthApiError";
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || "/api").replace(/\/+$/, "");

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse> | null = null;
let restoreInFlight: Promise<ApiUser | null> | null = null;

function jsonBody(value: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  };
}

function errorFor(status: number, unauthorizedCode: AuthErrorCode): AuthApiError {
  if (status === 400 || status === 422) return new AuthApiError("VALIDATION", status);
  if (status === 401 || status === 403) return new AuthApiError(unauthorizedCode, status);
  if (status === 409) return new AuthApiError("EMAIL_TAKEN", status);
  if (status === 429) return new AuthApiError("RATE_LIMITED", status);
  return new AuthApiError("SERVER", status);
}

async function send<T>(
  path: string,
  init: RequestInit = {},
  bearer?: string | null,
  unauthorizedCode: AuthErrorCode = "SESSION_EXPIRED",
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new AuthApiError("NETWORK");
  }

  if (!response.ok) throw errorFor(response.status, unauthorizedCode);
  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new AuthApiError("SERVER", response.status);
  }
}

function rememberSession(response: AuthResponse): AuthResponse {
  accessToken = response.tokens.accessToken;
  tokenStorage.writeRefreshToken(response.tokens.refreshToken);
  return response;
}

async function refreshSession(): Promise<AuthResponse> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = tokenStorage.readRefreshToken();
  if (!refreshToken) throw new AuthApiError("SESSION_EXPIRED", 401);

  refreshInFlight = send<AuthResponse>(
    "/auth/refresh",
    { method: "POST", ...jsonBody({ refreshToken }) },
    null,
    "SESSION_EXPIRED",
  )
    .then(rememberSession)
    .catch((error: unknown) => {
      accessToken = null;
      if (error instanceof AuthApiError && error.code === "NETWORK") throw error;
      tokenStorage.clear();
      throw new AuthApiError("SESSION_EXPIRED", 401);
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export function clearSession(): void {
  accessToken = null;
  tokenStorage.clear();
}

export async function requestWithAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!accessToken) await refreshSession();

  try {
    return await send<T>(path, init, accessToken, "SESSION_EXPIRED");
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== "SESSION_EXPIRED") throw error;
    await refreshSession();
    return send<T>(path, init, accessToken, "SESSION_EXPIRED");
  }
}

export async function login(input: LoginInput): Promise<ApiUser> {
  const response = await send<AuthResponse>(
    "/auth/login",
    { method: "POST", ...jsonBody(input) },
    null,
    "INVALID_CREDENTIALS",
  );
  rememberSession(response);
  return getCurrentUser();
}

export async function register(input: RegisterInput): Promise<ApiUser> {
  const response = await send<AuthResponse>(
    "/auth/register",
    { method: "POST", ...jsonBody(input) },
  );
  rememberSession(response);
  return getCurrentUser();
}

export function getCurrentUser(): Promise<ApiUser> {
  return requestWithAuth<ApiUser>("/auth/me");
}

export async function restoreSession(): Promise<ApiUser | null> {
  if (restoreInFlight) return restoreInFlight;
  if (!tokenStorage.readRefreshToken()) return null;

  // Jedna obietnica chroni rotowany refresh token przed podwójnym użyciem w
  // React StrictMode podczas startu aplikacji.
  restoreInFlight = (async () => {
    try {
      await refreshSession();
      return await getCurrentUser();
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "NETWORK") throw error;
      clearSession();
      throw new AuthApiError("SESSION_EXPIRED", 401);
    }
  })();

  return restoreInFlight;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.readRefreshToken();
  try {
    if (!accessToken && refreshToken) await refreshSession();
    if (accessToken) {
      await send<void>(
        "/auth/logout",
        { method: "POST", ...jsonBody({ refreshToken: refreshToken ?? undefined }) },
        accessToken,
      );
    }
  } catch {
    // Wylogowanie lokalne musi zadziałać również przy niedostępnym backendzie.
  } finally {
    clearSession();
  }
}
