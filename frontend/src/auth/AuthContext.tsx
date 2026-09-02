import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as authApi from "./authApi";
import { AuthApiError } from "./authApi";
import type { ApiUser, AppUser, AuthStatus, LoginInput, RegisterInput } from "./types";
import { toAppUser } from "./types";

const GUEST_SESSION_KEY = "lexodromia.auth.guest";

export type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface AuthContextValue {
  status: AuthStatus;
  user: AppUser | null;
  sessionError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  apiRequest: AuthenticatedRequest;
  clearSessionError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function readGuest(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const since = Number(raw);
    return {
      id: "guest",
      displayName: "Gość",
      authenticated: false,
      since: Number.isFinite(since) ? since : Date.now(),
    };
  } catch {
    return null;
  }
}

function rememberGuest(user: AppUser): void {
  try {
    sessionStorage.setItem(GUEST_SESSION_KEY, String(user.since));
  } catch {
    /* noop */
  }
}

function clearGuest(): void {
  try {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void authApi.restoreSession()
      .then((restored) => {
        if (!active) return;
        if (restored) {
          clearGuest();
          setUser(toAppUser(restored));
          setStatus("authenticated");
          return;
        }
        const guest = readGuest();
        setUser(guest);
        setStatus(guest ? "guest" : "unauthenticated");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setUser(null);
        setStatus("unauthenticated");
        setSessionError(
          error instanceof AuthApiError && error.code === "NETWORK"
            ? "Nie można połączyć się z serwerem. Spróbuj ponownie za chwilę."
            : "Twoja sesja wygasła. Zaloguj się ponownie.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const next = await authApi.login(input);
    clearGuest();
    setSessionError(null);
    setUser(toAppUser(next));
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const next = await authApi.register(input);
    clearGuest();
    setSessionError(null);
    setUser(toAppUser(next));
    setStatus("authenticated");
  }, []);

  const continueAsGuest = useCallback(() => {
    authApi.clearSession();
    const guest: AppUser = {
      id: "guest",
      displayName: "Gość",
      authenticated: false,
      since: Date.now(),
    };
    rememberGuest(guest);
    setSessionError(null);
    setUser(guest);
    setStatus("guest");
  }, []);

  const logout = useCallback(async () => {
    clearGuest();
    setUser(null);
    setStatus("unauthenticated");
    setSessionError(null);
    await authApi.logout();
  }, []);

  const expireSession = useCallback(() => {
    authApi.clearSession();
    clearGuest();
    setUser(null);
    setStatus("unauthenticated");
    setSessionError("Twoja sesja wygasła. Zaloguj się ponownie.");
  }, []);

  const apiRequest = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    try {
      return await authApi.requestWithAuth<T>(path, init);
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "SESSION_EXPIRED") expireSession();
      throw error;
    }
  }, [expireSession]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    if (status === "authenticated") {
      const updated = await apiRequest<ApiUser>("/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      setUser(toAppUser(updated));
      return;
    }
    if (status === "guest") setUser((current) => current ? { ...current, displayName: trimmed } : current);
  }, [status, apiRequest]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    sessionError,
    login,
    register,
    continueAsGuest,
    logout,
    updateDisplayName,
    apiRequest,
    clearSessionError: () => setSessionError(null),
  }), [status, user, sessionError, login, register, continueAsGuest, logout, updateDisplayName, apiRequest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
