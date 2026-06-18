"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getLookups } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";

export function useLookupsQuery() {
  return useQuery({
    queryKey: queryKeys.lookups,
    queryFn: getLookups,
    staleTime: 10 * 60_000,
  });
}

export function usePaginatedQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<{ data: T[]; meta: { current_page: number; last_page: number } }>,
) {
  return useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  });
}
