"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { getMe, logout as logoutRequest, parseAdminUser } from "@/lib/api/auth";
import { restoreAdminSession } from "@/lib/auth/bootstrap";
import { ApiError } from "@/lib/api/client";
import { clearSession, getToken, purgeLegacyAuthStorage, setToken } from "@/lib/auth/token";
import type { AdminUser } from "@/types/api";

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  setSession: (token: string, user: AdminUser) => void;
  updateUser: (user: AdminUser) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (slug: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purgeLegacyAuthStorage();
  }, []);

  const bootstrap = useCallback(async () => {
    const nextUser = await restoreAdminSession();
    setUser(nextUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const setSession = useCallback((token: string, nextUser: AdminUser) => {
    setToken(token);
    setUser(nextUser);
  }, []);

  const updateUser = useCallback((nextUser: AdminUser) => {
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      clearSession();
      setUser(null);
      return;
    }

    try {
      const response = await getMe(token);
      const nextUser = parseAdminUser(response);

      if (!nextUser) {
        clearSession();
        setUser(null);
        return;
      }

      setUser(nextUser);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
      }
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();

    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // Ignore logout API errors and clear local session anyway.
      }
    }

    clearSession();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const hasPermission = useCallback(
    (slug: string) => {
      if (!user) return false;
      return user.permissions.some((permission) => permission.slug === slug);
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, setSession, updateUser, refreshUser, logout, hasPermission }),
    [user, loading, setSession, updateUser, refreshUser, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
