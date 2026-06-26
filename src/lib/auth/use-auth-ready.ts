"use client";

import { useAuth } from "@/contexts/AuthContext";

/** True when auth bootstrap finished and a user session is available. */
export function useAuthReady(): boolean {
  const { user, loading } = useAuth();
  return !loading && !!user;
}
