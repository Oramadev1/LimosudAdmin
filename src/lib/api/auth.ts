import { apiFetch } from "@/lib/api/client";
import { withAuth } from "@/lib/api/authenticated";
import type { LoginResponse, MeResponse, UpdateProfilePayload } from "@/types/api";

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

export function updateProfile(payload: UpdateProfilePayload) {
  return withAuth<MeResponse>("/admin/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}
