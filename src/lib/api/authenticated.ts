import { apiFetch, ApiError } from "@/lib/api/client";
import { resolveApiUrl } from "@/lib/api/base-url";

export function withAuth<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, init);
}

export function withAuthForm<T>(path: string, formData: FormData, init: RequestInit = {}) {
  return apiFetch<T>(path, {
    ...init,
    method: init.method ?? "POST",
    body: formData,
  });
}

export async function withAuthBlob(path: string, init: RequestInit = {}) {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
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
