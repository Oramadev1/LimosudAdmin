import { resolveApiUrl } from "@/lib/api/base-url";
import type { ApiValidationError } from "@/types/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(
      typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof (body as ApiValidationError).message === "string"
        ? (body as ApiValidationError).message
        : status === 429
          ? "Too many requests. Please wait a moment and refresh."
          : `API request failed with status ${status}`,
    );
    this.status = status;
    this.body = body;
  }
}

export function isValidationError(
  error: unknown,
): error is ApiValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    typeof (error as ApiValidationError).errors === "object"
  );
}

type ApiFetchOptions = RequestInit & {
  token?: string | null;
};

export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const { token, ...requestInit } = init;
  const url = resolveApiUrl(path);

  const isDynamic =
    requestInit.cache === "no-store" ||
    requestInit.method === "POST" ||
    requestInit.method === "PUT" ||
    requestInit.method === "PATCH" ||
    requestInit.method === "DELETE";

  const response = await fetch(url, {
    ...requestInit,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...requestInit.headers,
    },
    ...(isDynamic ? { cache: "no-store" as const } : { next: { revalidate: 0 } }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
