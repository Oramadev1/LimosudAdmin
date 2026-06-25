"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/auth/token";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasToken = Boolean(getToken());

  useEffect(() => {
    if (!loading && !user && !hasToken) {
      router.replace("/login");
    }
  }, [loading, user, hasToken, router]);

  if (loading || (hasToken && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9]">
        <div className="rounded-[10px] bg-white px-6 py-4 text-sm text-gray-500 shadow-sm">
          Loading admin session...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
