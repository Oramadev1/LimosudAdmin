import { getToken } from "@/lib/auth/token";
import { apiFetch, ApiError } from "@/lib/api/client";
import { siteConfig } from "@/config/site";

export function withAuth<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
) {
  const token = init.token ?? getToken();

  if (!token) {
    throw new Error("Missing authentication token.");
  }

  return apiFetch<T>(path, { ...init, token });
}

export function withAuthForm<T>(
  path: string,
  formData: FormData,
  init: RequestInit & { token?: string | null } = {},
) {
  const token = init.token ?? getToken();

  if (!token) {
    throw new Error("Missing authentication token.");
  }

  return apiFetch<T>(path, {
    ...init,
    method: init.method ?? "POST",
    token,
    body: formData,
  });
}

export async function withAuthBlob(
  path: string,
  init: RequestInit & { token?: string | null } = {},
) {
  const token = init.token ?? getToken();

  if (!token) {
    throw new Error("Missing authentication token.");
  }

  const response = await fetch(`${siteConfig.apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }

  return response.blob();
}
