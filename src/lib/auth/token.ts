import type { AdminUser } from "@/types/api";

const TOKEN_KEY = "limosud_admin_token";
const USER_KEY = "limosud_admin_user";
const ME_VALIDATED_AT_KEY = "limosud_admin_me_at";
const TOKEN_COOKIE = "limosud_admin_token";
const TOKEN_MAX_AGE_DAYS = 7;
/** Skip /auth/me for this long after a successful validation (rapid reload protection). */
export const ME_VALIDATION_COOLDOWN_MS = 20_000;

function setCookie(name: string, value: string): void {
  const expires = new Date(
    Date.now() + TOKEN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toUTCString();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY) ?? getCookie(TOKEN_COOKIE);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(TOKEN_COOKIE, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  clearCookie(TOKEN_COOKIE);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user: AdminUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function clearMeValidatedAt(): void {
  sessionStorage.removeItem(ME_VALIDATED_AT_KEY);
}

export function markMeValidated(): void {
  sessionStorage.setItem(ME_VALIDATED_AT_KEY, String(Date.now()));
}

export function canUseCachedSessionWithoutMe(): boolean {
  if (!getToken() || !getStoredUser()) {
    return false;
  }

  const validatedAt = Number(sessionStorage.getItem(ME_VALIDATED_AT_KEY) || 0);
  return validatedAt > 0 && Date.now() - validatedAt < ME_VALIDATION_COOLDOWN_MS;
}

export function clearSession(): void {
  clearToken();
  clearStoredUser();
  clearMeValidatedAt();
}
