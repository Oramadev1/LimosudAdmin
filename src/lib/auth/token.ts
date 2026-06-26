const TOKEN_KEY = "limosud_admin_token";
const LEGACY_USER_KEY = "limosud_admin_user";
const TOKEN_COOKIE = "limosud_admin_token";
const TOKEN_MAX_AGE_DAYS = 7;

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

/** Remove old cached-user key from earlier admin versions. */
export function purgeLegacyAuthStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(LEGACY_USER_KEY);
  sessionStorage.removeItem("limosud_admin_me_at");
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

export function clearSession(): void {
  clearToken();
  purgeLegacyAuthStorage();
}
