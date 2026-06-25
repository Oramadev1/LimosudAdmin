/**
 * Temporary login-flow debug logging. Remove after diagnosing auth issues.
 */

export const LOGIN_DEBUG_TOKEN_KEY = "limosud_admin_token";

export function authDebug(tag: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }

  if (payload !== undefined) {
    console.log(`[${tag}]`, payload);
  } else {
    console.log(`[${tag}]`);
  }
}

export function tokenPreview(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  return `${token.slice(0, 10)}... (length=${token.length})`;
}

export function localStorageTokenStatus(): {
  key: string;
  exists: boolean;
  preview: string | null;
} {
  if (typeof window === "undefined") {
    return { key: LOGIN_DEBUG_TOKEN_KEY, exists: false, preview: null };
  }

  const token = localStorage.getItem(LOGIN_DEBUG_TOKEN_KEY);

  return {
    key: LOGIN_DEBUG_TOKEN_KEY,
    exists: Boolean(token),
    preview: tokenPreview(token),
  };
}

export function logApiConfig(): void {
  authDebug("AUTH_CONFIG", {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "(not set — using default)",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "(not set)",
    resolvedApiUrl:
      process.env.NEXT_PUBLIC_API_URL ?? "https://api.limosudcars.com/api",
    loginEndpoint: "/admin/auth/login",
    meEndpoint: "/admin/auth/me",
    expectedLoginUrl: `${process.env.NEXT_PUBLIC_API_URL ?? "https://api.limosudcars.com/api"}/admin/auth/login`,
  });
}

export function logLoginError(err: unknown): void {
  if (err instanceof Error && err.name === "TypeError") {
    authDebug("LOGIN_ERROR", {
      type: "network",
      message: err.message,
      hint: "Browser could not reach the API (CORS, DNS, SSL, or server down).",
    });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "body" in err
  ) {
    const apiErr = err as { status: number; body: unknown; message?: string };
    authDebug("LOGIN_ERROR", {
      type: "api",
      status: apiErr.status,
      message: apiErr.message,
      body: apiErr.body,
      validationErrors:
        typeof apiErr.body === "object" &&
        apiErr.body !== null &&
        "errors" in apiErr.body
          ? (apiErr.body as { errors: unknown }).errors
          : undefined,
    });
    return;
  }

  authDebug("LOGIN_ERROR", { type: "unknown", error: err });
}
