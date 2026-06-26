import { getMe, parseAdminUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearSession, getToken } from "@/lib/auth/token";
import type { AdminUser } from "@/types/api";

let bootstrapPromise: Promise<AdminUser | null> | null = null;

/** Single in-flight session restore — avoids duplicate /auth/me calls (e.g. React Strict Mode). */
export function restoreAdminSession(): Promise<AdminUser | null> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const token = getToken();

    if (!token) {
      clearSession();
      return null;
    }

    try {
      const response = await getMe(token);
      const nextUser = parseAdminUser(response);

      if (!nextUser) {
        clearSession();
        return null;
      }

      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return null;
      }

      return null;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
