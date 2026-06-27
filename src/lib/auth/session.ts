/** Remove legacy bearer-token storage from older admin builds. */
export function purgeLegacyAuthStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("limosud_admin_token");
  localStorage.removeItem("limosud_admin_user");
  sessionStorage.removeItem("limosud_admin_me_at");
}

export function clearSession(): void {
  purgeLegacyAuthStorage();
}
