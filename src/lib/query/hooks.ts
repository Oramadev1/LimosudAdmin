"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { getLookups } from "@/lib/api/admin";
import { useAuthReady } from "@/lib/auth/use-auth-ready";
import { queryKeys } from "@/lib/query/keys";

/** Waits for auth bootstrap before firing protected admin API queries. */
export function useAdminQuery<TData>(
  options: UseQueryOptions<TData>,
): UseQueryResult<TData> {
  const authReady = useAuthReady();
  const enabled = Boolean(options.enabled ?? true) && authReady;

  return useQuery({
    ...options,
    enabled,
  });
}

export function useLookupsQuery() {
  const authReady = useAuthReady();

  return useQuery({
    queryKey: queryKeys.lookups,
    queryFn: getLookups,
    staleTime: 10 * 60_000,
    enabled: authReady,
  });
}

export function usePaginatedQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<{ data: T[]; meta: { current_page: number; last_page: number } }>,
) {
  const authReady = useAuthReady();

  return useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
    enabled: authReady,
  });
}
