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

import { getMe, logout as logoutRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearToken, getToken, setToken } from "@/lib/auth/token";
import type { AdminUser } from "@/types/api";

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  setSession: (token: string, user: AdminUser) => void;
  logout: () => Promise<void>;
  hasPermission: (slug: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await getMe(token);
      setUser(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const setSession = useCallback((token: string, nextUser: AdminUser) => {
    setToken(token);
    setUser(nextUser);
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

    clearToken();
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
    () => ({ user, loading, setSession, logout, hasPermission }),
    [user, loading, setSession, logout, hasPermission],
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
