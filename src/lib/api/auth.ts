import { apiFetch } from "@/lib/api/client";
import { withAuth } from "@/lib/api/authenticated";
import type { AdminUser, LoginResponse, MeResponse, UpdateProfilePayload } from "@/types/api";

export function parseAdminUser(payload: unknown): AdminUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("data" in payload) {
    const wrapped = (payload as MeResponse).data;

    if (wrapped && typeof wrapped === "object" && "email" in wrapped) {
      return wrapped;
    }
  }

  if ("user" in payload) {
    const user = (payload as LoginResponse).user;
    if (user && typeof user === "object" && "email" in user) {
      return user;
    }
  }

  if ("email" in payload && "id" in payload) {
    return payload as AdminUser;
  }

  return null;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
}

export function getMe() {
  return withAuth<MeResponse>("/admin/auth/me", { cache: "no-store" });
}

export function logout() {
  return withAuth<null>("/admin/auth/logout", {
    method: "POST",
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
