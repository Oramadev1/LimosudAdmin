import { apiFetch, apiFetchBlob } from "@/lib/api/client";

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

export function withAuthBlob(path: string, init: RequestInit = {}) {
  return apiFetchBlob(path, init);
}
