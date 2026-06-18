import { apiFetch } from "@/lib/api/client";
import type { LoginResponse, MeResponse } from "@/types/api";

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
}

export function getMe(token: string) {
  return apiFetch<MeResponse>("/admin/auth/me", {
    token,
    cache: "no-store",
  });
}

export function logout(token: string) {
  return apiFetch<null>("/admin/auth/logout", {
    method: "POST",
    token,
    cache: "no-store",
  });
}
