const TOKEN_KEY = "limosud_admin_token";
const USER_KEY = "limosud_admin_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token;
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem("limosud_admin_me_at");
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
