export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "guest";

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AppUser {
  id: string;
  displayName: string;
  email?: string;
  authenticated: boolean;
  since: number;
  lastLoginAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: ApiUser;
  tokens: AuthTokens;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export function toAppUser(user: ApiUser): AppUser {
  const since = Date.parse(user.createdAt);
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    authenticated: true,
    since: Number.isNaN(since) ? Date.now() : since,
    lastLoginAt: user.lastLoginAt,
  };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return [...parts[0]][0].toLocaleUpperCase();
  return ([...parts[0]][0] + [...parts[1]][0]).toLocaleUpperCase();
}
