import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface AppUser {
  id: string;
  displayName: string;
  email?: string;
  authenticated: boolean;
  /** Kiedy zaczął się uczyć — do profilu. */
  since: number;
}

interface UserApi {
  user: AppUser;
  /**
   * ⬇ BACKEND AUTH PODŁĄCZASZ TUTAJ.
   * Dziś funkcja tylko przełącza flagę w pamięci i nic nie wysyła.
   * Docelowo: POST /api/auth/login → token → setUser(profil z API).
   */
  signIn: (email: string) => void;
  signOut: () => void;
  rename: (displayName: string) => void;
}

const SESSION_KEY = "lexodromia.user";

const GUEST: AppUser = {
  id: "local-user",
  displayName: "Michał",
  authenticated: false,
  since: Date.now(),
};

const Ctx = createContext<UserApi | null>(null);

function read(): AppUser {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return GUEST;
    const parsed = JSON.parse(raw) as Partial<AppUser>;
    // Uwaga: świadomie NIE przechowujemy tu żadnych danych uwierzytelniających.
    return { ...GUEST, ...parsed, authenticated: Boolean(parsed.authenticated) };
  } catch {
    return GUEST;
  }
}

function persist(user: AppUser) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    /* noop */
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(read);

  const update = useCallback((next: AppUser) => {
    setUser(next);
    persist(next);
  }, []);

  const api = useMemo<UserApi>(
    () => ({
      user,
      signIn: (email: string) => {
        const name = email.split("@")[0] || user.displayName;
        update({
          ...user,
          email,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          authenticated: true,
        });
      },
      signOut: () => update({ ...GUEST, since: user.since }),
      rename: (displayName: string) => update({ ...user, displayName: displayName || GUEST.displayName }),
    }),
    [user, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useUser(): UserApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser musi być wewnątrz <UserProvider>");
  return ctx;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return [...parts[0]][0].toLocaleUpperCase();
  return ([...parts[0]][0] + [...parts[1]][0]).toLocaleUpperCase();
}
