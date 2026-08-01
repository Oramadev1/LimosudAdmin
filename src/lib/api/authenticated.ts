import { apiFetch, apiFetchBlob } from "@/lib/api/client";
import { authHeaders } from "@/lib/auth/session";

export function withAuth<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
}

export function withAuthForm<T>(path: string, formData: FormData, init: RequestInit = {}) {
  return apiFetch<T>(path, {
    ...init,
    method: init.method ?? "POST",
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
    body: formData,
  });
}

export function withAuthBlob(path: string, init: RequestInit = {}) {
  return apiFetchBlob(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
}
