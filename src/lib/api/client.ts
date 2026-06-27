import axios, { isAxiosError, type AxiosRequestConfig } from "axios";
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

const apiClient = axios.create({
  headers: {
    Accept: "application/json",
  },
  withCredentials: true,
});

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function toAxiosConfig(path: string, init: RequestInit = {}): AxiosRequestConfig {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = normalizeHeaders(init.headers);

  return {
    url: resolveApiUrl(path),
    method,
    headers,
    data: init.body ?? undefined,
    withCredentials: true,
    validateStatus: () => true,
  };
}

function mapAxiosError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }

  if (isAxiosError(error) && !error.response) {
    throw new ApiError(0, {
      message: "Unable to reach the API. Check your connection and API configuration.",
    });
  }

  throw error;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  try {
    const response = await apiClient.request<T>(toAxiosConfig(path, init));

    if (response.status < 200 || response.status >= 300) {
      throw new ApiError(response.status, response.data);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.data;
  } catch (error) {
    mapAxiosError(error);
  }
}

export async function apiFetchBlob(
  path: string,
  init: RequestInit = {},
): Promise<Blob> {
  try {
    const response = await apiClient.request<Blob>({
      ...toAxiosConfig(path, init),
      responseType: "blob",
    });

    if (response.status < 200 || response.status >= 300) {
      let body: unknown = null;

      if (response.data instanceof Blob) {
        try {
          body = JSON.parse(await response.data.text());
        } catch {
          body = null;
        }
      }

      throw new ApiError(response.status, body);
    }

    return response.data;
  } catch (error) {
    mapAxiosError(error);
  }
}
